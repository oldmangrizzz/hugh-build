#!/usr/bin/env python3
"""
DUM-E iCloud Mass Extraction → CT104 Knowledge DB

Surgical extraction of AI/research text documents from iCloud Drive.
Uses pre-built file lists (shell ls + grep is 100x faster than Python
iterdir on iCloud FUSE) to avoid slow directory enumeration.

Usage:
  /opt/homebrew/bin/python3.12 scripts/dume/extract_icloud.py
  /opt/homebrew/bin/python3.12 scripts/dume/extract_icloud.py --dry-run
"""

import json
import os
import re
import subprocess
import sys
import time
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Optional, Tuple

# ── Project imports ──────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.dume.config import DumeConfig
from scripts.dume.ingester import KnowledgeDBClient
from scripts.dume.chunker import chunk_text, chunk_markdown

# ── Constants ────────────────────────────────────────────────

ICLOUD_ROOT = Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
VAULT_FOLDER = ICLOUD_ROOT / "TonyAI_SystemVault"

TEXT_EXTENSIONS = {
    ".md", ".txt", ".json", ".jsonl", ".pdf", ".csv",
    ".html", ".rtf", ".docx", ".doc",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

EXT_PATTERN = r'\.(md|txt|json|jsonl|pdf|csv|html|rtf|docx|doc)$'
KEYWORD_PATTERN = (
    r'AI|Tony|Anthropic|OpenAI|LLM|VLM|STT|TTS|Knowledge|Database|GPT|Claude|'
    r'neural|transform|embed|vector|RAG|fine.?tune|inferenc|token|prompt|'
    r'machine.learn|deep.learn|NLP|speech|whisper|piper|lfm|chromadb|convex|'
    r'chat.?export|notebook|hugging|sovereign|model|agent|swarm|IONOS|uatu|'
    r'prism|protocol|digital.person|hypothesis|stark|iron.sovereign|helicarrier|'
    r'natasha|zero.shot|ethical|metacognit|unified|architecture|briefing|'
    r'systems|AGENTS|CASE.STUDY|infrastructure|persistence|super.API|love.note'
)

BANNER = """
╔═══════════════════════════════════════════════════╗
║  DUM-E iCloud Extraction v1.0                     ║
║  "Surgical keyword extraction → CT104"            ║
╚═══════════════════════════════════════════════════╝
"""

# ── Text Extraction ──────────────────────────────────────────

def extract_pdf_text(filepath: Path) -> Optional[str]:
    """Extract text from PDF. Tries pdftotext → textutil → strings."""
    pdftotext = "/opt/homebrew/bin/pdftotext"
    if os.path.exists(pdftotext):
        try:
            result = subprocess.run(
                [pdftotext, "-layout", str(filepath), "-"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except (subprocess.TimeoutExpired, OSError):
            pass

    try:
        result = subprocess.run(
            ["/usr/bin/textutil", "-convert", "txt", "-stdout", str(filepath)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, OSError):
        pass

    try:
        result = subprocess.run(
            ["strings", str(filepath)],
            capture_output=True, text=True, timeout=30
        )
        text = result.stdout.strip()
        if len(text) > 100:
            return text
    except (subprocess.TimeoutExpired, OSError):
        pass

    return None


def extract_docx_text(filepath: Path) -> Optional[str]:
    """Extract text from .docx using zipfile + xml.etree."""
    try:
        with zipfile.ZipFile(filepath, "r") as zf:
            if "word/document.xml" not in zf.namelist():
                return None
            with zf.open("word/document.xml") as doc:
                tree = ET.parse(doc)
                root = tree.getroot()

                ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                paragraphs = []
                for p in root.iter("{%s}p" % ns):
                    texts = []
                    for t in p.iter("{%s}t" % ns):
                        if t.text:
                            texts.append(t.text)
                    if texts:
                        paragraphs.append("".join(texts))

                return "\n\n".join(paragraphs) if paragraphs else None
    except (zipfile.BadZipFile, ET.ParseError, KeyError, OSError):
        return None


def extract_text(filepath: Path) -> Optional[str]:
    """Extract readable text from a file based on extension."""
    ext = filepath.suffix.lower()
    try:
        size = filepath.stat().st_size
    except OSError:
        return None

    if size == 0 or size > MAX_FILE_SIZE:
        return None

    try:
        if ext == ".pdf":
            return extract_pdf_text(filepath)

        elif ext in (".docx", ".doc"):
            if ext == ".doc":
                try:
                    result = subprocess.run(
                        ["/usr/bin/textutil", "-convert", "txt", "-stdout", str(filepath)],
                        capture_output=True, text=True, timeout=30
                    )
                    if result.returncode == 0 and result.stdout.strip():
                        return result.stdout.strip()
                except (subprocess.TimeoutExpired, OSError):
                    pass
                return None
            return extract_docx_text(filepath)

        elif ext in (".json", ".jsonl"):
            raw = filepath.read_text(encoding="utf-8", errors="replace")
            if ext == ".json":
                try:
                    data = json.loads(raw)
                    return json.dumps(data, indent=2, ensure_ascii=False)
                except json.JSONDecodeError:
                    return raw if raw.strip() else None
            return raw if raw.strip() else None

        elif ext == ".rtf":
            try:
                result = subprocess.run(
                    ["/usr/bin/textutil", "-convert", "txt", "-stdout", str(filepath)],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0 and result.stdout.strip():
                    return result.stdout.strip()
            except (subprocess.TimeoutExpired, OSError):
                pass
            return None

        else:
            # .md, .txt, .html, .csv
            return filepath.read_text(encoding="utf-8", errors="replace").strip() or None

    except (OSError, UnicodeDecodeError):
        return None


# ── iCloud Eviction Handling ─────────────────────────────────

def is_evicted(filepath: Path) -> bool:
    """Check if file is an iCloud placeholder."""
    placeholder = filepath.parent / (".%s.icloud" % filepath.name)
    if placeholder.exists():
        return True
    try:
        if filepath.stat().st_size < 500:
            with open(filepath, "rb") as f:
                header = f.read(20)
                if b"bplist" in header:
                    return True
    except OSError:
        pass
    return False


def trigger_download(filepath: Path, timeout: int = 30) -> bool:
    """Trigger iCloud download via brctl and wait."""
    try:
        subprocess.run(
            ["brctl", "download", str(filepath)],
            capture_output=True, timeout=10
        )
    except (subprocess.TimeoutExpired, OSError):
        pass

    start = time.time()
    while time.time() - start < timeout:
        placeholder = filepath.parent / (".%s.icloud" % filepath.name)
        if not placeholder.exists() and filepath.exists():
            try:
                if filepath.stat().st_size > 500:
                    return True
            except OSError:
                pass
        time.sleep(1)
    return False


# ── File Discovery (shell-accelerated) ───────────────────────

def discover_files_shell() -> Tuple[List[Path], List[Path]]:
    """Use shell ls + grep to build file lists (100x faster than Python iterdir on iCloud FUSE)."""
    root_files = []
    vault_files = []

    # Root files: ls | grep extensions | grep keywords
    try:
        ls_result = subprocess.run(
            ["ls", "-1", str(ICLOUD_ROOT)],
            capture_output=True, text=True, timeout=30
        )
        if ls_result.returncode == 0:
            for name in ls_result.stdout.splitlines():
                name = name.strip()
                if not name:
                    continue
                if not re.search(EXT_PATTERN, name, re.IGNORECASE):
                    continue
                if not re.search(KEYWORD_PATTERN, name, re.IGNORECASE):
                    continue
                root_files.append(ICLOUD_ROOT / name)
    except (subprocess.TimeoutExpired, OSError) as e:
        print("  ⚠️  Root scan failed: %s" % e)

    # Vault files: all text-extension files (no keyword filter)
    try:
        ls_result = subprocess.run(
            ["ls", "-1", str(VAULT_FOLDER)],
            capture_output=True, text=True, timeout=15
        )
        if ls_result.returncode == 0:
            for name in ls_result.stdout.splitlines():
                name = name.strip()
                if not name or name.startswith("."):
                    continue
                ext = Path(name).suffix.lower()
                if ext in TEXT_EXTENSIONS:
                    vault_files.append(VAULT_FOLDER / name)
    except (subprocess.TimeoutExpired, OSError):
        pass

    return root_files, vault_files


# ── Main Extraction Pipeline ─────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv

    print(BANNER)

    # Health check
    config = DumeConfig()
    client = KnowledgeDBClient(config)

    print("  Checking CT104 health...", end=" ")
    try:
        health = client.health_check()
        print(f"✅ {health.get('status', 'ok')} — {health.get('documents', '?')} docs")
    except Exception as e:
        print(f"❌ CT104 unreachable: {e}")
        print("  Cannot proceed without CT104. Aborting.")
        sys.exit(1)

    # Discover files (shell-accelerated — avoids slow iCloud FUSE iterdir)
    print("\n  Scanning iCloud Drive for keyword-matched documents...")
    start_scan = time.time()
    root_files, vault_files = discover_files_shell()
    scan_time = time.time() - start_scan
    total_files = len(root_files) + len(vault_files)

    print("  Found %d root files + %d vault files = %d total (%.1fs)" % (
        len(root_files), len(vault_files), total_files, scan_time))

    if total_files == 0:
        print("  No files matched. Nothing to do.")
        return

    if dry_run:
        print("\n  ── DRY RUN — Files that would be processed ──")
        for i, f in enumerate(root_files + vault_files, 1):
            exists = "✅" if f.exists() else "☁️ evicted"
            print(f"  [{i}] {f.name} — {exists}")
        print(f"\n  Total: {total_files} files")
        return

    # Process all files
    all_files = []
    for f in root_files:
        all_files.append((f, "source:icloud,type:" + f.suffix.lstrip(".")))
    for f in vault_files:
        all_files.append((f, "source:icloud,collection:TonyAI_SystemVault,type:" + f.suffix.lstrip(".")))

    start_time = time.time()
    ingested = 0
    skipped_notext = 0
    skipped_evicted = 0
    failed = 0
    total_chunks = 0

    print(f"\n  Starting extraction of {total_files} files...\n")

    for idx, (filepath, tags) in enumerate(all_files, 1):
        name = filepath.name
        prefix = f"[{idx}/{total_files}]"

        # Check if file exists locally
        if not filepath.exists():
            placeholder = filepath.parent / (".%s.icloud" % filepath.name)
            if placeholder.exists():
                print("%s ☁️  %s — downloading from iCloud..." % (prefix, name), end=" ", flush=True)
                if trigger_download(filepath, timeout=30):
                    print("✅ downloaded")
                else:
                    print("⏱️  timeout — skipped")
                    skipped_evicted += 1
                    continue
            else:
                print("%s ❌ %s — file not found, skipped" % (prefix, name))
                failed += 1
                continue

        # Check if evicted (exists but is a placeholder)
        if is_evicted(filepath):
            print("%s ☁️  %s — downloading from iCloud..." % (prefix, name), end=" ", flush=True)
            if trigger_download(filepath, timeout=30):
                print("✅ downloaded")
            else:
                print("⏱️  timeout — skipped")
                skipped_evicted += 1
                continue

        # Extract text
        text = extract_text(filepath)
        if not text or len(text.strip()) < 50:
            print("%s ⏭️  %s — no extractable text, skipped" % (prefix, name))
            skipped_notext += 1
            continue

        # Chunk
        ext = filepath.suffix.lower()
        is_vault = "TonyAI_SystemVault" in str(filepath)
        source_label = f"icloud:{'TonyAI_SystemVault/' if is_vault else ''}{name}"

        metadata = {"type": tags, "source": source_label}

        if ext == ".md":
            chunks = chunk_markdown(text, config, metadata)
        else:
            chunks = chunk_text(text, config, metadata)

        if not chunks:
            print(f"{prefix} ⏭️  {name} — chunked to 0 segments, skipped")
            skipped_notext += 1
            continue

        # Ingest chunks directly (bypass ingest_chunks to avoid noisy per-chunk progress)
        chunk_ok = 0
        chunk_fail = 0
        for ci, chunk in enumerate(chunks):
            try:
                client.ingest_text(
                    text=chunk["text"],
                    source=source_label,
                    tags=tags,
                )
                chunk_ok += 1
            except Exception as e:
                chunk_fail += 1

            # Rate limit every batch
            if (ci + 1) % config.batch_size == 0:
                time.sleep(config.batch_delay)

        total_chunks += chunk_ok

        if chunk_fail > 0:
            print("%s ⚠️  %s — %d/%d chunks (%d failed)" % (prefix, name, chunk_ok, len(chunks), chunk_fail))
        else:
            print("%s ✅ %s — %d chunks" % (prefix, name, chunk_ok))

        ingested += 1

    # Summary
    elapsed = time.time() - start_time
    print(f"""
═══════════════════════════════════════
  DUM-E EXTRACTION REPORT
═══════════════════════════════════════
  Files processed:        {total_files}
  Successfully ingested:  {ingested}
  Skipped (no text):      {skipped_notext}
  Skipped (evicted/timeout): {skipped_evicted}
  Failed:                 {failed}
  Total chunks:           {total_chunks}
  Elapsed:                {elapsed:.1f}s
═══════════════════════════════════════""")

    # Post-run stats
    try:
        stats = client.get_stats()
        print(f"\n  CT104 now holds: {stats.get('total_chunks', '?')} chunks, "
              f"{stats.get('graph_nodes', '?')} graph nodes")
    except Exception:
        pass


if __name__ == "__main__":
    main()
