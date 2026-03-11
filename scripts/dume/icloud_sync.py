#!/usr/bin/env python3
"""
iCloud Sync — Dum-E Data Pipeline Extension

Bridges iCloud Drive ↔ Mac ↔ CT104 Knowledge DB.
Scans iCloud for ingestible documents, differential-syncs
new/modified files into Hugh's brain, and exports search
results back to iCloud for cross-device access.

Usage:
  python3 -m scripts.dume.icloud_sync scan                  # List ingestible files
  python3 -m scripts.dume.icloud_sync scan --folder Hugh    # Scan specific subfolder
  python3 -m scripts.dume.icloud_sync sync                  # Sync new/modified → CT104
  python3 -m scripts.dume.icloud_sync sync --folder Hugh    # Sync specific subfolder
  python3 -m scripts.dume.icloud_sync status                # Show manifest stats
  python3 -m scripts.dume.icloud_sync reset                 # Clear manifest, re-ingest all
  python3 -m scripts.dume.icloud_sync export --query "soul anchor"  # CT104 → iCloud

Run from project root:
  python3 -m scripts.dume.icloud_sync scan
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.dume.config import DumeConfig
from scripts.dume.ingester import KnowledgeDBClient, BatchResult
from scripts.dume.chunker import chunk_text, chunk_markdown


# ── Constants ───────────────────────────────────────────────

ICLOUD_ROOT = Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
HUGH_FOLDER = ICLOUD_ROOT / "Hugh"
EXPORTS_FOLDER = HUGH_FOLDER / "exports"
MANIFEST_PATH = Path(__file__).resolve().parent / ".sync_manifest.json"

INGESTIBLE_EXTENSIONS = {".md", ".txt", ".json", ".jsonl", ".pdf", ".csv", ".html"}

# Directories to skip during scanning
SKIP_DIRS = {
    "node_modules", "dist", ".git", "__pycache__", ".next",
    "build", ".Trash", ".DS_Store", "venv", ".venv",
}

# Max file size to read into memory (50 MB)
MAX_FILE_SIZE = 50 * 1024 * 1024

BANNER = """
╔═══════════════════════════════════════════════╗
║  iCloud Sync v1.0 — Dum-E Pipeline Extension  ║
║  "iCloud ↔ Mac ↔ CT104 data bridge"           ║
╚═══════════════════════════════════════════════╝
"""


# ── Manifest Management ─────────────────────────────────────

class SyncManifest:
    """Tracks what's been ingested to avoid redundant work.

    Format: {filepath: {hash: sha256, ingested_at: iso_ts, chunks: int}}
    """

    def __init__(self, path: Optional[Path] = None):
        self.path = path or MANIFEST_PATH
        self.entries = {}  # type: Dict[str, dict]
        self._load()

    def _load(self):
        if self.path.exists():
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    self.entries = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.entries = {}

    def save(self):
        tmp = self.path.with_suffix(".tmp")
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.entries, f, indent=2, sort_keys=True)
            tmp.replace(self.path)
        except IOError as e:
            print(f"  ⚠️  Failed to save manifest: {e}")
            if tmp.exists():
                tmp.unlink()

    def needs_ingestion(self, filepath: str, file_hash: str) -> bool:
        """Returns True if the file is new or its hash has changed."""
        entry = self.entries.get(filepath)
        if entry is None:
            return True
        return entry.get("hash") != file_hash

    def record(self, filepath: str, file_hash: str, chunks: int):
        """Record a successful ingestion."""
        self.entries[filepath] = {
            "hash": file_hash,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
            "chunks": chunks,
        }

    def clear(self):
        self.entries = {}
        if self.path.exists():
            self.path.unlink()

    @property
    def total_files(self) -> int:
        return len(self.entries)

    @property
    def total_chunks(self) -> int:
        return sum(e.get("chunks", 0) for e in self.entries.values())

    def oldest_sync(self) -> Optional[str]:
        if not self.entries:
            return None
        oldest = min(self.entries.values(), key=lambda e: e.get("ingested_at", ""))
        return oldest.get("ingested_at", "unknown")

    def newest_sync(self) -> Optional[str]:
        if not self.entries:
            return None
        newest = max(self.entries.values(), key=lambda e: e.get("ingested_at", ""))
        return newest.get("ingested_at", "unknown")


# ── iCloud Utilities ─────────────────────────────────────────

def is_icloud_evicted(filepath: Path) -> bool:
    """Check if a file is an iCloud placeholder (.icloud file)."""
    return filepath.name.startswith(".") and filepath.name.endswith(".icloud")


def get_real_name_from_evicted(filepath: Path) -> str:
    """Extract the real filename from an evicted .icloud placeholder.

    macOS stores evicted files as '.filename.icloud' in the same directory.
    """
    name = filepath.name
    if name.startswith(".") and name.endswith(".icloud"):
        return name[1:-7]  # strip leading '.' and trailing '.icloud'
    return name


def trigger_icloud_download(filepath: Path) -> bool:
    """Trigger iCloud to download an evicted file using brctl.

    Returns True if the download command was issued successfully.
    The actual download happens asynchronously.
    """
    try:
        subprocess.run(
            ["brctl", "download", str(filepath)],
            capture_output=True, timeout=10,
        )
        return True
    except (subprocess.SubprocessError, OSError):
        return False


def wait_for_icloud_download(filepath: Path, real_path: Path,
                              timeout: int = 60) -> bool:
    """Wait for an evicted file to materialize after brctl download.

    Args:
        filepath: The .icloud placeholder path
        real_path: The expected real file path once downloaded
        timeout: Max seconds to wait

    Returns True if the file appeared within the timeout.
    """
    start = time.time()
    while time.time() - start < timeout:
        if real_path.exists() and not is_icloud_evicted(real_path):
            return True
        # Also check if the placeholder disappeared
        if not filepath.exists() and real_path.exists():
            return True
        time.sleep(2)
    return False


def hash_file(filepath: Path) -> str:
    """SHA-256 hash of file contents. Handles large files in chunks."""
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while True:
                block = f.read(65536)
                if not block:
                    break
                h.update(block)
    except (IOError, OSError):
        return ""
    return h.hexdigest()


def human_size(nbytes: int) -> str:
    """Format byte count as human-readable string."""
    for unit in ("B", "KB", "MB", "GB"):
        if abs(nbytes) < 1024.0:
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024.0
    return f"{nbytes:.1f} TB"


# ── Scanner ──────────────────────────────────────────────────

def scan_icloud(
    folder: Optional[str] = None,
    max_depth: int = 5,
) -> Tuple[List[Path], List[Path], int]:
    """Scan iCloud Drive for ingestible files.

    Args:
        folder: Optional subfolder to scan (e.g. 'Hugh')
        max_depth: Maximum directory depth to traverse

    Returns:
        (available_files, evicted_files, total_bytes)
    """
    root = ICLOUD_ROOT
    if folder:
        root = ICLOUD_ROOT / folder
        if not root.exists():
            print(f"  ⚠️  Folder not found: {root}")
            return [], [], 0

    available = []
    evicted = []
    state = {"total_bytes": 0}
    seen_dirs = set()  # type: set

    def _scan_dir(directory: Path, depth: int):
        if depth > max_depth:
            return
        try:
            entries = sorted(directory.iterdir())
        except (PermissionError, OSError):
            return

        for entry in entries:
            if entry.name in SKIP_DIRS or entry.name == ".DS_Store":
                continue

            if entry.is_dir() and not entry.is_symlink():
                dir_key = str(entry)
                if dir_key not in seen_dirs:
                    seen_dirs.add(dir_key)
                    _scan_dir(entry, depth + 1)
                continue

            # Handle evicted .icloud placeholders
            if is_icloud_evicted(entry):
                real_name = get_real_name_from_evicted(entry)
                ext = Path(real_name).suffix.lower()
                if ext in INGESTIBLE_EXTENSIONS:
                    evicted.append(entry)
                continue

            # Regular file
            if entry.suffix.lower() in INGESTIBLE_EXTENSIONS:
                try:
                    size = entry.stat().st_size
                    if size <= MAX_FILE_SIZE:
                        available.append(entry)
                        state["total_bytes"] += size
                except OSError:
                    pass

    _scan_dir(root, 0)
    return available, evicted, state["total_bytes"]


# ── Commands ─────────────────────────────────────────────────

def cmd_scan(args, config: DumeConfig, manifest: SyncManifest):
    """List what's in iCloud and what needs ingesting."""
    folder = getattr(args, "folder", None)
    print(f"  📡 Scanning iCloud Drive{' / ' + folder if folder else ''}...")
    print(f"     Root: {ICLOUD_ROOT}")
    print()

    available, evicted, total_bytes = scan_icloud(folder)

    # Categorize: new, modified, unchanged
    new_files = []
    modified_files = []
    unchanged_files = []

    for fp in available:
        key = str(fp)
        fhash = hash_file(fp)
        if manifest.needs_ingestion(key, fhash):
            entry = manifest.entries.get(key)
            if entry is None:
                new_files.append(fp)
            else:
                modified_files.append(fp)
        else:
            unchanged_files.append(fp)

    # Report
    print(f"  📊 Scan Results:")
    print(f"     Available files:   {len(available)} ({human_size(total_bytes)})")
    print(f"     Evicted (in cloud): {len(evicted)}")
    print(f"     ─────────────────────────")
    print(f"     New (not ingested): {len(new_files)}")
    print(f"     Modified:           {len(modified_files)}")
    print(f"     Up to date:         {len(unchanged_files)}")
    print()

    if new_files:
        print(f"  🆕 New files ({len(new_files)}):")
        for fp in new_files[:25]:
            try:
                rel = fp.relative_to(ICLOUD_ROOT)
            except ValueError:
                rel = fp.name
            size = human_size(fp.stat().st_size) if fp.exists() else "?"
            print(f"     + {rel}  ({size})")
        if len(new_files) > 25:
            print(f"     ... and {len(new_files) - 25} more")
        print()

    if modified_files:
        print(f"  ✏️  Modified files ({len(modified_files)}):")
        for fp in modified_files[:10]:
            try:
                rel = fp.relative_to(ICLOUD_ROOT)
            except ValueError:
                rel = fp.name
            print(f"     ~ {rel}")
        if len(modified_files) > 10:
            print(f"     ... and {len(modified_files) - 10} more")
        print()

    if evicted:
        print(f"  ☁️  Evicted files ({len(evicted)}) — run 'sync --download-evicted' to fetch:")
        for fp in evicted[:10]:
            real_name = get_real_name_from_evicted(fp)
            try:
                rel = fp.parent.relative_to(ICLOUD_ROOT) / real_name
            except ValueError:
                rel = Path(real_name)
            print(f"     ☁ {rel}")
        if len(evicted) > 10:
            print(f"     ... and {len(evicted) - 10} more")
        print()

    pending = len(new_files) + len(modified_files)
    if pending > 0:
        print(f"  → {pending} file(s) ready for ingestion. Run 'sync' to push to CT104.")
    else:
        print(f"  ✅ All files up to date.")

    return 0


def cmd_sync(args, config: DumeConfig, manifest: SyncManifest):
    """Sync new/modified iCloud files to CT104."""
    folder = getattr(args, "folder", None)
    download_evicted = getattr(args, "download_evicted", False)
    dry_run = getattr(args, "dry_run", False)

    print(f"  🔄 Syncing iCloud{' / ' + folder if folder else ''} → CT104")
    print(f"     Target: {config.knowledge_db_url}")
    print()

    # Health check first
    client = KnowledgeDBClient(config)
    if not dry_run:
        try:
            client.health_check()
            print(f"  ✅ CT104 is operational")
        except Exception as e:
            print(f"  ❌ CT104 unreachable: {e}")
            print(f"     Cannot sync without a live target. Aborting.")
            return 1
    print()

    # Scan
    available, evicted, total_bytes = scan_icloud(folder)

    # Handle evicted files if requested
    downloaded = []
    if download_evicted and evicted:
        print(f"  ☁️  Triggering download for {len(evicted)} evicted files...")
        for fp in evicted:
            real_name = get_real_name_from_evicted(fp)
            real_path = fp.parent / real_name
            if trigger_icloud_download(fp):
                print(f"     ↓ {real_name}")
                downloaded.append((fp, real_path))
            else:
                print(f"     ⚠️  Failed to trigger: {real_name}")

        if downloaded:
            print(f"\n  ⏳ Waiting for downloads (up to 60s)...")
            for fp, real_path in downloaded:
                if wait_for_icloud_download(fp, real_path, timeout=60):
                    available.append(real_path)
                    print(f"     ✅ {real_path.name}")
                else:
                    print(f"     ⏳ {real_path.name} still downloading (will catch on next sync)")
            print()

    # Determine what needs ingestion
    to_ingest = []
    for fp in available:
        key = str(fp)
        fhash = hash_file(fp)
        if manifest.needs_ingestion(key, fhash):
            to_ingest.append((fp, fhash))

    if not to_ingest:
        print(f"  ✅ Nothing new to ingest. All {len(available)} files are current.")
        return 0

    print(f"  📦 {len(to_ingest)} file(s) to ingest")

    if dry_run:
        print(f"\n  [DRY RUN] Would ingest:")
        for fp, _ in to_ingest:
            try:
                rel = fp.relative_to(ICLOUD_ROOT)
            except ValueError:
                rel = fp.name
            print(f"     • {rel}")
        return 0

    # Ingest
    batch = BatchResult()
    success_count = 0
    fail_count = 0

    for idx, (fp, fhash) in enumerate(to_ingest):
        try:
            rel = fp.relative_to(ICLOUD_ROOT)
        except ValueError:
            rel = Path(fp.name)

        print(f"\n  [{idx + 1}/{len(to_ingest)}] 📄 {rel}")

        try:
            # Read file
            if fp.suffix.lower() in (".pdf",):
                # PDF: use multipart file upload
                print(f"     → Uploading via multipart (binary file)")
                try:
                    result_data = client.ingest_file(
                        fp, tags=f"icloud,{fp.suffix.lstrip('.')}"
                    )
                    from scripts.dume.ingester import IngestResult
                    result = IngestResult(str(rel))
                    result.chunks_sent = 1
                    result.chunks_ok = 1
                    manifest.record(str(fp), fhash, 1)
                    batch.add(result)
                    success_count += 1
                    print(f"     ✅ Uploaded")
                except Exception as e:
                    from scripts.dume.ingester import IngestResult
                    result = IngestResult(str(rel))
                    result.chunks_sent = 1
                    result.chunks_failed = 1
                    result.errors.append(str(e))
                    batch.add(result)
                    fail_count += 1
                    print(f"     ❌ Upload failed: {e}")
                continue

            # Text-based files: read, chunk, ingest
            text = fp.read_text(encoding="utf-8", errors="replace")
            if not text.strip():
                print(f"     ⚠️  Empty file, skipping")
                continue

            source = f"icloud:{rel}"
            metadata = {
                "source": source,
                "source_path": str(fp),
                "icloud_folder": str(rel.parent) if str(rel.parent) != "." else "root",
                "ingested_at": datetime.now(timezone.utc).isoformat(),
                "file_type": fp.suffix,
                "pipeline": "icloud_sync",
            }

            # Choose chunking strategy
            if fp.suffix.lower() == ".md":
                chunks = chunk_markdown(text, config, metadata)
            elif fp.suffix.lower() in (".json", ".jsonl"):
                # JSON files: try to chunk meaningfully
                chunks = chunk_text(text, config, metadata)
            else:
                chunks = chunk_text(text, config, metadata)

            if not chunks:
                print(f"     ⚠️  No chunks produced, skipping")
                continue

            total_chars = sum(c["char_count"] for c in chunks)
            print(f"     → {len(chunks)} chunks ({human_size(total_chars)})")

            result = client.ingest_chunks(chunks, str(rel))
            batch.add(result)

            if result.chunks_failed == 0:
                manifest.record(str(fp), fhash, len(chunks))
                success_count += 1
            else:
                fail_count += 1

            print(f"  {result.summary()}")

        except Exception as e:
            fail_count += 1
            print(f"     ❌ Error: {e}")

    # Save manifest after all ingestion
    manifest.save()

    print()
    print(batch.summary())
    print(f"  Manifest: {success_count} file(s) recorded, {fail_count} failed")

    return 0 if fail_count == 0 else 1


def cmd_status(args, config: DumeConfig, manifest: SyncManifest):
    """Show manifest stats and pipeline health."""
    print(f"  📋 iCloud Sync Manifest")
    print(f"     Path: {MANIFEST_PATH}")
    print()

    if manifest.total_files == 0:
        print(f"  📭 Manifest is empty — no files have been synced yet.")
        print(f"     Run 'scan' to discover files, then 'sync' to ingest.")
    else:
        print(f"  📊 Sync Statistics:")
        print(f"     Files tracked:    {manifest.total_files}")
        print(f"     Total chunks:     {manifest.total_chunks}")
        print(f"     Oldest sync:      {manifest.oldest_sync()}")
        print(f"     Newest sync:      {manifest.newest_sync()}")

        # Extension breakdown
        ext_counts = {}  # type: Dict[str, int]
        for filepath in manifest.entries:
            ext = Path(filepath).suffix.lower()
            ext_counts[ext] = ext_counts.get(ext, 0) + 1

        if ext_counts:
            print(f"\n     By type:")
            for ext, count in sorted(ext_counts.items(), key=lambda x: -x[1]):
                print(f"       {ext:8s} → {count} file(s)")

    print()

    # iCloud Drive check
    if ICLOUD_ROOT.exists():
        print(f"  ☁️  iCloud Drive: ✅ Mounted at {ICLOUD_ROOT}")
    else:
        print(f"  ☁️  iCloud Drive: ❌ Not found at {ICLOUD_ROOT}")

    # Hugh folder check
    if HUGH_FOLDER.exists():
        print(f"  📁 Hugh folder:   ✅ {HUGH_FOLDER}")
        subfolders = [d.name for d in HUGH_FOLDER.iterdir() if d.is_dir()]
        if subfolders:
            print(f"     Subfolders:    {', '.join(sorted(subfolders))}")
    else:
        print(f"  📁 Hugh folder:   ❌ Not created (run setup)")

    # CT104 check
    print()
    print(f"  🖥️  CT104 Target: {config.knowledge_db_url}")
    client = KnowledgeDBClient(config)
    try:
        health = client.health_check()
        print(f"     Status: ✅ Operational")
        for k, v in health.items():
            if k != "status":
                print(f"     {k}: {v}")
    except Exception as e:
        print(f"     Status: ❌ Unreachable ({e})")

    return 0


def cmd_reset(args, config: DumeConfig, manifest: SyncManifest):
    """Clear manifest — next sync will re-ingest everything."""
    if manifest.total_files == 0:
        print(f"  📭 Manifest is already empty.")
        return 0

    count = manifest.total_files
    manifest.clear()
    print(f"  🗑️  Manifest cleared. {count} file record(s) removed.")
    print(f"     Next 'sync' will re-ingest all files from scratch.")
    return 0


def cmd_export(args, config: DumeConfig, manifest: SyncManifest):
    """Export search results from CT104 to iCloud for cross-device access."""
    query = " ".join(args.query)
    limit = getattr(args, "limit", 10)
    fmt = getattr(args, "format", "md")

    print(f"  📤 Exporting from CT104 → iCloud")
    print(f"     Query: \"{query}\"")
    print(f"     Limit: {limit}")
    print()

    client = KnowledgeDBClient(config)

    try:
        results = client.search(query, limit)
    except Exception as e:
        print(f"  ❌ Search failed: {e}")
        return 1

    # Normalize results
    if isinstance(results, dict) and "results" in results:
        items = results["results"]
    elif isinstance(results, list):
        items = results
    else:
        items = [results] if results else []

    if not items:
        print(f"  📭 No results found for \"{query}\"")
        return 0

    print(f"  Found {len(items)} result(s)")

    # Ensure export directory exists
    EXPORTS_FOLDER.mkdir(parents=True, exist_ok=True)

    # Generate export filename
    safe_query = "".join(c if c.isalnum() or c in " -_" else "_" for c in query)
    safe_query = safe_query[:50].strip()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"export_{safe_query}_{timestamp}"

    if fmt == "json":
        export_path = EXPORTS_FOLDER / f"{filename}.json"
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump({
                "query": query,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "source": config.knowledge_db_url,
                "results": items,
            }, f, indent=2, ensure_ascii=False)
    else:
        # Markdown format (default)
        export_path = EXPORTS_FOLDER / f"{filename}.md"
        lines = [
            f"# Hugh Knowledge Export",
            f"",
            f"**Query:** {query}  ",
            f"**Exported:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
            f"**Source:** CT104 Knowledge DB ({config.knowledge_db_url})  ",
            f"**Results:** {len(items)}",
            f"",
            f"---",
            f"",
        ]
        for i, item in enumerate(items):
            score = item.get("score", item.get("distance", "?"))
            text = item.get("text", item.get("document", ""))
            source = item.get("metadata", {}).get("source", "unknown")
            lines.append(f"## Result {i + 1} (score: {score})")
            lines.append(f"**Source:** {source}")
            lines.append(f"")
            lines.append(text)
            lines.append(f"")
            lines.append(f"---")
            lines.append(f"")

        with open(export_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

    print(f"  ✅ Exported to: {export_path}")
    print(f"     This file will sync to all your Apple devices via iCloud.")

    return 0


# ── CLI ──────────────────────────────────────────────────────

def main():
    print(BANNER)

    parser = argparse.ArgumentParser(
        prog="icloud_sync",
        description="iCloud Sync — Dum-E Data Pipeline Extension",
    )
    parser.add_argument(
        "--url", default=None,
        help="CT104 Knowledge DB URL (default: http://192.168.7.190:8084)",
    )
    parser.add_argument(
        "--manifest", default=None,
        help="Path to sync manifest JSON",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # scan
    p_scan = subparsers.add_parser("scan", help="List ingestible files in iCloud")
    p_scan.add_argument("--folder", default=None, help="Subfolder to scan (e.g. Hugh)")

    # sync
    p_sync = subparsers.add_parser("sync", help="Sync new/modified files to CT104")
    p_sync.add_argument("--folder", default=None, help="Subfolder to sync (e.g. Hugh)")
    p_sync.add_argument(
        "--download-evicted", action="store_true",
        help="Trigger iCloud download for evicted files",
    )
    p_sync.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be synced without actually ingesting",
    )

    # status
    subparsers.add_parser("status", help="Show manifest stats and pipeline health")

    # reset
    subparsers.add_parser("reset", help="Clear manifest (re-ingest everything next sync)")

    # export
    p_export = subparsers.add_parser(
        "export", help="Export CT104 search results to iCloud"
    )
    p_export.add_argument("--query", nargs="+", required=True, help="Search query")
    p_export.add_argument("--limit", type=int, default=10, help="Max results")
    p_export.add_argument(
        "--format", choices=["md", "json"], default="md",
        help="Export format (default: md)",
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    # Build config
    config = DumeConfig()
    if args.url:
        config.knowledge_db_url = args.url

    # Load manifest
    manifest_path = Path(args.manifest) if args.manifest else None
    manifest = SyncManifest(manifest_path)

    # Dispatch
    commands = {
        "scan": cmd_scan,
        "sync": cmd_sync,
        "status": cmd_status,
        "reset": cmd_reset,
        "export": cmd_export,
    }

    handler = commands.get(args.command)
    if handler:
        return handler(args, config, manifest)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main() or 0)
