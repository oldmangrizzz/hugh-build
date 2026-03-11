"""
Dum-E Records — FastAPI backend for the Knowledge Ingestion Dashboard.
Serves at records.grizzlymedicine.icu, wraps existing Dum-E tools.
"""

import asyncio
import json
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.dume.config import DumeConfig
from scripts.dume.ingester import KnowledgeDBClient, BatchResult, IngestResult
from scripts.dume.chunker import chunk_text, chunk_markdown
from scripts.dume.icloud_sync import (
    SyncManifest,
    scan_icloud,
    ICLOUD_ROOT,
    HUGH_FOLDER,
    EXPORTS_FOLDER,
    MANIFEST_PATH,
    INGESTIBLE_EXTENSIONS,
    hash_file,
    human_size,
    is_icloud_evicted,
    get_real_name_from_evicted,
    trigger_icloud_download,
)

# ---------------------------------------------------------------------------
# App & shared state
# ---------------------------------------------------------------------------

app = FastAPI(title="Dum-E Records", version="1.0.0")

STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

config = DumeConfig()
client = KnowledgeDBClient(config)
manifest = SyncManifest()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SyncRequest(BaseModel):
    paths: list[str]
    force: bool = False


class ExportRequest(BaseModel):
    query: str
    n: int = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _browse_dir(base: Path, rel: str = "/") -> dict:
    """Return folder listing for a single directory level."""
    target = base / rel.lstrip("/") if rel and rel != "/" else base
    target = target.resolve()

    if not target.exists() or not target.is_dir():
        return {"path": rel, "folders": [], "files": [], "error": "Directory not found"}

    folders = []
    files = []
    try:
        for entry in sorted(target.iterdir()):
            name = entry.name
            if name.startswith(".") and not name.endswith(".icloud"):
                continue
            if name in {
                "node_modules", "dist", ".git", "__pycache__",
                ".next", "build", ".Trash", "venv", ".venv",
            }:
                continue

            if entry.is_dir():
                try:
                    item_count = sum(1 for _ in entry.iterdir())
                except PermissionError:
                    item_count = 0
                folders.append({"name": name, "item_count": item_count})
            elif entry.is_file() or name.endswith(".icloud"):
                evicted = is_icloud_evicted(entry)
                real_name = get_real_name_from_evicted(entry) if evicted else name
                ext = Path(real_name).suffix.lower()

                try:
                    size = entry.stat().st_size if not evicted else 0
                except OSError:
                    size = 0

                file_path = str(entry)
                file_hash = hash_file(entry) if not evicted else ""
                ingested = not manifest.needs_ingestion(file_path, file_hash) if file_hash else False

                files.append({
                    "name": real_name,
                    "raw_name": name,
                    "size": size,
                    "size_human": human_size(size),
                    "ext": ext,
                    "evicted": evicted,
                    "ingested": ingested,
                    "hash": file_hash,
                    "path": str(entry.relative_to(ICLOUD_ROOT)) if str(entry).startswith(str(ICLOUD_ROOT)) else str(entry),
                })
    except PermissionError:
        return {"path": rel, "folders": [], "files": [], "error": "Permission denied"}

    return {"path": rel, "folders": folders, "files": files}


async def _ingest_file(filepath: Path, force: bool = False):
    """Ingest a single file, yielding SSE events. Returns IngestResult."""
    fname = filepath.name
    fpath_str = str(filepath)

    yield _sse("progress", {"file": fname, "status": "hashing", "chunks": 0})

    if is_icloud_evicted(filepath):
        real_name = get_real_name_from_evicted(filepath)
        real_path = filepath.parent / real_name
        yield _sse("progress", {"file": fname, "status": "downloading", "chunks": 0})
        trigger_icloud_download(filepath)
        # Poll for download (up to 60s)
        for _ in range(30):
            await asyncio.sleep(2)
            if real_path.exists():
                filepath = real_path
                fpath_str = str(filepath)
                fname = real_name
                break
        else:
            yield _sse("progress", {"file": fname, "status": "error", "error": "iCloud download timeout"})
            return

    file_hash = hash_file(filepath)
    if not force and not manifest.needs_ingestion(fpath_str, file_hash):
        yield _sse("progress", {"file": fname, "status": "skipped", "chunks": 0})
        return

    yield _sse("progress", {"file": fname, "status": "reading", "chunks": 0})

    ext = filepath.suffix.lower()
    result = IngestResult(source=fpath_str)

    try:
        if ext == ".pdf":
            yield _sse("progress", {"file": fname, "status": "uploading", "chunks": 1})
            resp = client.ingest_file(filepath)
            result.chunks_sent = 1
            if resp:
                result.chunks_ok = 1
            else:
                result.chunks_failed = 1
        else:
            content = filepath.read_text(encoding="utf-8", errors="replace")
            yield _sse("progress", {"file": fname, "status": "chunking", "chunks": 0})

            meta = {"source_file": fname, "source_path": fpath_str}
            if ext == ".md":
                chunks = chunk_markdown(content, config, metadata=meta)
            else:
                chunks = chunk_text(content, config, metadata=meta)

            total = len(chunks)
            result.chunks_sent = total
            yield _sse("progress", {"file": fname, "status": "ingesting", "chunks": total, "done": 0})

            for i, chunk in enumerate(chunks):
                tags = chunk.get("metadata", {}).get("section", "")
                resp = client.ingest_text(
                    text=chunk["text"],
                    source=fpath_str,
                    tags=tags,
                )
                if resp:
                    result.chunks_ok += 1
                else:
                    result.chunks_failed += 1
                    result.errors.append(f"Chunk {i} failed")

                if (i + 1) % 5 == 0 or i + 1 == total:
                    yield _sse("progress", {
                        "file": fname,
                        "status": "ingesting",
                        "chunks": total,
                        "done": i + 1,
                        "failed": result.chunks_failed,
                    })

        if result.chunks_ok > 0:
            manifest.record(fpath_str, file_hash, result.chunks_ok)
            manifest.save()

        yield _sse("progress", {
            "file": fname,
            "status": "done",
            "chunks": result.chunks_sent,
            "ok": result.chunks_ok,
            "failed": result.chunks_failed,
        })

    except Exception as exc:
        yield _sse("progress", {
            "file": fname,
            "status": "error",
            "error": str(exc),
        })


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def serve_root():
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=(STATIC_DIR / "index.html").read_text())


@app.get("/api/health")
async def health():
    ct104_ok = False
    ct104_msg = ""
    try:
        resp = client.health_check()
        ct104_ok = bool(resp)
        ct104_msg = str(resp) if resp else "unreachable"
    except Exception as exc:
        ct104_msg = str(exc)

    icloud_ok = ICLOUD_ROOT.exists()
    hugh_ok = HUGH_FOLDER.exists()

    return {
        "status": "ok",
        "ct104": {"online": ct104_ok, "message": ct104_msg},
        "icloud": {"mounted": icloud_ok, "hugh_folder": hugh_ok},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/stats")
async def stats():
    ct104_stats = {}
    try:
        ct104_stats = client.get_stats() or {}
    except Exception:
        ct104_stats = {"error": "CT104 unreachable"}

    return {
        "ct104": ct104_stats,
        "manifest": {
            "total_files": manifest.total_files,
            "total_chunks": manifest.total_chunks,
            "oldest_sync": manifest.oldest_sync(),
            "newest_sync": manifest.newest_sync(),
        },
    }


@app.get("/api/icloud/browse")
async def icloud_browse(path: str = Query(default="/")):
    return _browse_dir(ICLOUD_ROOT, path)


@app.post("/api/icloud/sync")
async def icloud_sync(req: SyncRequest):
    async def generate():
        total_files = 0
        total_chunks = 0
        total_failed = 0

        for rel_path in req.paths:
            target = ICLOUD_ROOT / rel_path.lstrip("/")

            if target.is_dir():
                # Collect all ingestible files in directory
                file_list = []
                for ext in INGESTIBLE_EXTENSIONS:
                    file_list.extend(target.rglob(f"*{ext}"))
                # Also check for evicted versions
                file_list.extend(target.rglob("*.icloud"))
            elif target.exists() or (target.parent / f".{target.name}.icloud").exists():
                file_list = [target]
                # Check for evicted version
                evicted = target.parent / f".{target.name}.icloud"
                if not target.exists() and evicted.exists():
                    file_list = [evicted]
            else:
                yield _sse("progress", {
                    "file": rel_path,
                    "status": "error",
                    "error": "File not found",
                })
                continue

            for fpath in sorted(set(file_list)):
                total_files += 1
                async for event in _ingest_file(fpath, force=req.force):
                    yield event
                    # Parse out chunk counts from done events
                    try:
                        line = event.split("data: ", 1)[1].split("\n")[0]
                        d = json.loads(line)
                        if d.get("status") == "done":
                            total_chunks += d.get("ok", 0)
                            total_failed += d.get("failed", 0)
                    except (IndexError, json.JSONDecodeError):
                        pass

        yield _sse("complete", {
            "total_files": total_files,
            "total_chunks": total_chunks,
            "failed": total_failed,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/search")
async def search(q: str = Query(...), n: int = Query(default=10)):
    try:
        results = client.search(q, limit=n)
        return {"query": q, "results": results or [], "count": len(results) if results else 0}
    except Exception as exc:
        return JSONResponse(
            status_code=502,
            content={"error": f"CT104 search failed: {exc}"},
        )


@app.post("/api/export")
async def export_results(req: ExportRequest):
    try:
        results = client.search(req.query, limit=req.n)
    except Exception as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})

    EXPORTS_FOLDER.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_q = "".join(c if c.isalnum() or c in " _-" else "" for c in req.query)[:40].strip().replace(" ", "_")
    filename = f"export_{safe_q}_{ts}.md"
    out_path = EXPORTS_FOLDER / filename

    lines = [
        f"# Dum-E Export: {req.query}",
        f"*Exported {datetime.now(timezone.utc).isoformat()} — {len(results or [])} results*\n",
    ]
    for i, r in enumerate(results or [], 1):
        source = r.get("source", r.get("metadata", {}).get("source", "unknown"))
        score = r.get("score", r.get("similarity", "?"))
        text = r.get("text", r.get("content", ""))
        lines.append(f"## Result {i} (score: {score})")
        lines.append(f"**Source:** {source}\n")
        lines.append(text)
        lines.append("\n---\n")

    out_path.write_text("\n".join(lines), encoding="utf-8")

    return {
        "exported": True,
        "path": str(out_path),
        "filename": filename,
        "result_count": len(results or []),
    }


@app.get("/api/manifest")
async def get_manifest():
    return {
        "entries": manifest.entries,
        "total_files": manifest.total_files,
        "total_chunks": manifest.total_chunks,
        "oldest_sync": manifest.oldest_sync(),
        "newest_sync": manifest.newest_sync(),
    }


@app.post("/api/manifest/reset")
async def reset_manifest():
    manifest.clear()
    manifest.save()
    return {"reset": True, "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8085)
