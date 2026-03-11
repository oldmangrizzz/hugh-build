#!/usr/bin/env python3
"""
Dum-E — H.U.G.H. Knowledge Ingestion Bot

Named after Tony Stark's loyal but clumsy lab robot.
Does the grunt work so the smart one can think.

Usage:
  python -m scripts.dume.cli status          # Check CT104 health + stats
  python -m scripts.dume.cli ingest FILE...  # Ingest files (md, txt, json)
  python -m scripts.dume.cli chat FILE...    # Ingest OpenAI chat exports
  python -m scripts.dume.cli url URL...      # Ingest from URLs
  python -m scripts.dume.cli search QUERY    # Search knowledge base
  python -m scripts.dume.cli scan DIR        # Discover and ingest all supported files

Run from project root:
  python -m scripts.dume.cli status
"""

import argparse
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.dume.config import DumeConfig
from scripts.dume.ingester import KnowledgeDBClient, BatchResult
from scripts.dume.chunker import chunk_text, chunk_markdown, chunk_chat_export
from scripts.dume.chat_parser import parse_openai_export, parse_jsonl_chat


BANNER = """
╔═══════════════════════════════════════════╗
║  Dum-E v1.0 — Knowledge Ingestion Bot     ║
║  "I do the grunt work so Hugh can think"  ║
╚═══════════════════════════════════════════╝
"""


def cmd_status(args, config: DumeConfig, client: KnowledgeDBClient):
    """Check CT104 health and stats."""
    print(f"  Target: {config.knowledge_db_url}")
    print()

    try:
        health = client.health_check()
        print(f"  ✅ CT104 is operational")
        for k, v in health.items():
            if k != "status":
                print(f"     {k}: {v}")
    except Exception as e:
        print(f"  ❌ CT104 unreachable: {e}")
        return 1

    try:
        stats = client.get_stats()
        print()
        print(f"  📊 Knowledge DB Stats:")
        for k, v in stats.items():
            print(f"     {k}: {v}")
    except Exception:
        pass

    return 0


def cmd_ingest(args, config: DumeConfig, client: KnowledgeDBClient):
    """Ingest files into CT104."""
    batch = BatchResult()

    for filepath in args.files:
        path = Path(filepath)
        if not path.exists():
            print(f"  ⚠️  File not found: {filepath}")
            continue

        print(f"\n  📄 Processing: {path.name}")

        text = path.read_text(encoding="utf-8", errors="replace")
        source = f"{config.source_prefix}{path.name}"
        metadata = {
            "source": source,
            "source_path": str(path),
            "ingested_at": datetime.utcnow().isoformat(),
            "file_type": path.suffix,
        }

        # Choose chunking strategy
        if path.suffix == ".md":
            chunks = chunk_markdown(text, config, metadata)
        else:
            chunks = chunk_text(text, config, metadata)

        if not chunks:
            print(f"  ⚠️  No chunks produced from {path.name}")
            continue

        print(f"     → {len(chunks)} chunks ({sum(c['char_count'] for c in chunks)} chars)")
        result = client.ingest_chunks(chunks, path.name)
        batch.add(result)
        print(f"  {result.summary()}")

    print()
    print(batch.summary())
    return 0 if batch.total_failed == 0 else 1


def cmd_chat(args, config: DumeConfig, client: KnowledgeDBClient):
    """Ingest OpenAI chat exports."""
    batch = BatchResult()

    for filepath in args.files:
        path = Path(filepath)
        if not path.exists():
            print(f"  ⚠️  File not found: {filepath}")
            continue

        print(f"\n  💬 Processing chat export: {path.name}")

        # Parse based on format
        if path.suffix == ".jsonl":
            conversations = list(parse_jsonl_chat(path))
        else:
            conversations = list(parse_openai_export(path))

        print(f"     → {len(conversations)} conversations found")

        for convo in conversations:
            title = convo.get("title", "Untitled")
            messages = convo.get("messages", [])

            if not messages:
                continue

            metadata = {
                "source": f"chat_export:{path.name}",
                "conversation_id": convo.get("id", "unknown"),
                "conversation_title": title,
                "ingested_at": datetime.utcnow().isoformat(),
                "type": "chat_export",
            }

            chunks = chunk_chat_export(messages, config, metadata)
            if not chunks:
                continue

            print(f"     📝 [{title[:40]}] → {len(chunks)} chunks")
            result = client.ingest_chunks(chunks, f"{path.name}:{title[:30]}")
            batch.add(result)

    print()
    print(batch.summary())
    return 0 if batch.total_failed == 0 else 1


def cmd_url(args, config: DumeConfig, client: KnowledgeDBClient):
    """Ingest content from URLs."""
    batch = BatchResult()

    for url in args.urls:
        print(f"\n  🌐 Ingesting URL: {url}")
        from scripts.dume.ingester import IngestResult
        result = IngestResult(url)
        result.chunks_sent = 1
        try:
            client.ingest_url(url)
            result.chunks_ok = 1
            print(f"  ✅ {url}")
        except Exception as e:
            result.chunks_failed = 1
            result.errors.append(str(e))
            print(f"  ❌ {url}: {e}")
        batch.add(result)

    print()
    print(batch.summary())
    return 0 if batch.total_failed == 0 else 1


def cmd_search(args, config: DumeConfig, client: KnowledgeDBClient):
    """Search the knowledge base."""
    query = " ".join(args.query)
    limit = args.limit

    print(f"  🔍 Searching: \"{query}\" (limit {limit})")
    print()

    try:
        results = client.search(query, limit)
        if isinstance(results, dict) and "results" in results:
            items = results["results"]
        elif isinstance(results, list):
            items = results
        else:
            items = [results]

        if not items:
            print("  No results found.")
            return 0

        for i, item in enumerate(items):
            score = item.get("score", item.get("distance", "?"))
            text = item.get("text", item.get("document", ""))[:200]
            source = item.get("metadata", {}).get("source", "unknown")
            print(f"  [{i+1}] (score: {score})")
            print(f"      Source: {source}")
            print(f"      {text}...")
            print()

    except Exception as e:
        print(f"  ❌ Search failed: {e}")
        return 1

    return 0


def cmd_scan(args, config: DumeConfig, client: KnowledgeDBClient):
    """Scan a directory and ingest all supported files."""
    scan_dir = Path(args.directory)
    if not scan_dir.is_dir():
        print(f"  ❌ Not a directory: {args.directory}")
        return 1

    # Discover files
    files = []
    for ext in config.supported_extensions:
        files.extend(scan_dir.rglob(f"*{ext}"))

    # Filter out node_modules, dist, .git, etc.
    skip_dirs = {"node_modules", "dist", ".git", "__pycache__", ".next", "build"}
    files = [
        f for f in files
        if not any(skip in f.parts for skip in skip_dirs)
    ]

    files.sort()

    print(f"  📁 Scanning: {scan_dir}")
    print(f"     Found {len(files)} supported files")

    if args.dry_run:
        print("\n  [DRY RUN] Files that would be ingested:")
        for f in files:
            print(f"     • {f.relative_to(scan_dir)}")
        return 0

    if not files:
        print("  Nothing to ingest.")
        return 0

    # Confirm
    if not args.yes:
        response = input(f"\n  Ingest {len(files)} files? [y/N] ")
        if response.lower() != "y":
            print("  Aborted.")
            return 0

    # Reuse ingest logic
    args.files = [str(f) for f in files]
    return cmd_ingest(args, config, client)


def main():
    print(BANNER)

    parser = argparse.ArgumentParser(
        prog="dume",
        description="Dum-E — H.U.G.H. Knowledge Ingestion Bot"
    )
    parser.add_argument(
        "--url", default=None,
        help="CT104 Knowledge DB URL (default: http://192.168.7.190:8084)"
    )
    parser.add_argument(
        "--chunk-size", type=int, default=None,
        help="Chunk size in characters (default: 1000)"
    )
    parser.add_argument(
        "--source-prefix", default="",
        help="Prefix for source labels"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # status
    subparsers.add_parser("status", help="Check CT104 health and stats")

    # ingest
    p_ingest = subparsers.add_parser("ingest", help="Ingest files")
    p_ingest.add_argument("files", nargs="+", help="Files to ingest")

    # chat
    p_chat = subparsers.add_parser("chat", help="Ingest OpenAI chat exports")
    p_chat.add_argument("files", nargs="+", help="Chat export JSON/JSONL files")

    # url
    p_url = subparsers.add_parser("url", help="Ingest from URLs")
    p_url.add_argument("urls", nargs="+", help="URLs to ingest")

    # search
    p_search = subparsers.add_parser("search", help="Search knowledge base")
    p_search.add_argument("query", nargs="+", help="Search query")
    p_search.add_argument("--limit", type=int, default=5, help="Max results")

    # scan
    p_scan = subparsers.add_parser("scan", help="Scan directory and ingest all files")
    p_scan.add_argument("directory", help="Directory to scan")
    p_scan.add_argument("--dry-run", action="store_true", help="List files without ingesting")
    p_scan.add_argument("-y", "--yes", action="store_true", help="Skip confirmation prompt")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Build config
    config = DumeConfig()
    if args.url:
        config.knowledge_db_url = args.url
    if args.chunk_size:
        config.chunk_size = args.chunk_size
    if args.source_prefix:
        config.source_prefix = args.source_prefix

    client = KnowledgeDBClient(config)

    # Dispatch
    commands = {
        "status": cmd_status,
        "ingest": cmd_ingest,
        "chat": cmd_chat,
        "url": cmd_url,
        "search": cmd_search,
        "scan": cmd_scan,
    }

    handler = commands.get(args.command)
    if handler:
        return handler(args, config, client)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main() or 0)
