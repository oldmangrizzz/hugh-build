"""CT104 Knowledge DB API client with retry logic and progress tracking."""

import json
import time
import sys
import uuid
from pathlib import Path
from typing import List, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urlencode

from .config import DumeConfig


class IngestResult:
    """Tracks ingestion results for a single operation."""
    def __init__(self, source):
        self.source = source
        self.chunks_sent = 0
        self.chunks_ok = 0
        self.chunks_failed = 0
        self.errors = []
        self.start_time = time.time()

    @property
    def elapsed(self):
        return time.time() - self.start_time

    @property
    def success_rate(self):
        if self.chunks_sent == 0:
            return 0.0
        return self.chunks_ok / self.chunks_sent

    def summary(self):
        status = "✅" if self.chunks_failed == 0 else "⚠️"
        return (
            f"{status} {self.source}: {self.chunks_ok}/{self.chunks_sent} chunks "
            f"({self.elapsed:.1f}s)"
        )


class BatchResult:
    """Aggregates results across multiple ingestion operations."""
    def __init__(self):
        self.results = []
        self.start_time = time.time()

    def add(self, result):
        self.results.append(result)

    @property
    def total_chunks(self):
        return sum(r.chunks_sent for r in self.results)

    @property
    def total_ok(self):
        return sum(r.chunks_ok for r in self.results)

    @property
    def total_failed(self):
        return sum(r.chunks_failed for r in self.results)

    @property
    def elapsed(self):
        return time.time() - self.start_time

    def summary(self):
        lines = [
            "═" * 50,
            "  Dum-E Ingestion Report",
            "═" * 50,
            f"  Sources processed: {len(self.results)}",
            f"  Total chunks:      {self.total_chunks}",
            f"  Succeeded:         {self.total_ok}",
            f"  Failed:            {self.total_failed}",
            f"  Elapsed:           {self.elapsed:.1f}s",
            "═" * 50,
        ]
        return "\n".join(lines)


class KnowledgeDBClient:
    """HTTP client for CT104 Knowledge DB API.
    
    CT104 uses form-urlencoded for text/url ingestion,
    multipart/form-data for file/chat-export ingestion.
    """

    def __init__(self, config):
        self.config = config

    def health_check(self):
        """Check CT104 health."""
        return self._get(self.config.health_url())

    def get_stats(self):
        """Get current DB statistics."""
        return self._get(self.config.stats_url())

    def ingest_text(self, text, source="manual", tags=""):
        """Ingest a text chunk via form-urlencoded POST."""
        form_data = urlencode({
            "text": text,
            "source": source,
            "tags": tags,
        }).encode("utf-8")
        return self._post_form(self.config.ingest_text_url(), form_data)

    def ingest_url(self, url, tags=""):
        """Ingest content from a URL."""
        form_data = urlencode({
            "url": url,
            "tags": tags,
        }).encode("utf-8")
        return self._post_form(self.config.ingest_url_url(), form_data)

    def ingest_file(self, filepath, tags=""):
        """Ingest a file via multipart upload."""
        return self._post_multipart(
            self.config.ingest_file_url(), filepath, tags
        )

    def ingest_chat_export_file(self, filepath, tags=""):
        """Ingest a chat export file via multipart upload."""
        return self._post_multipart(
            self.config.ingest_chat_url(), filepath, tags
        )

    def search(self, query, limit=5):
        """Search the knowledge base."""
        params = urlencode({"q": query, "n": limit})
        return self._get(f"{self.config.search_url()}?{params}")

    def ingest_chunks(self, chunks, source):
        """Ingest a list of text chunks with progress tracking."""
        result = IngestResult(source)
        total = len(chunks)

        for i, chunk in enumerate(chunks):
            result.chunks_sent += 1

            meta = chunk.get("metadata", {})
            chunk_source = meta.get("source", source)
            section = meta.get("section", "")
            if section:
                chunk_source = f"{chunk_source}#{section}"
            tags = meta.get("type", "")

            try:
                self.ingest_text(
                    text=chunk["text"],
                    source=chunk_source,
                    tags=tags,
                )
                result.chunks_ok += 1
            except Exception as e:
                result.chunks_failed += 1
                result.errors.append(f"Chunk {i}: {e}")

            pct = (i + 1) / total * 100
            sys.stdout.write(f"\r  [{source}] {i+1}/{total} ({pct:.0f}%)")
            sys.stdout.flush()

            if (i + 1) % self.config.batch_size == 0:
                time.sleep(self.config.batch_delay)

        sys.stdout.write("\n")
        return result

    def _get(self, url):
        """GET with retry."""
        return self._request("GET", url)

    def _post_form(self, url, form_data):
        """POST form-urlencoded with retry."""
        last_error = None
        for attempt in range(self.config.max_retries):
            try:
                req = Request(
                    url, data=form_data, method="POST",
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                with urlopen(req, timeout=self.config.request_timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except (URLError, HTTPError, TimeoutError, json.JSONDecodeError) as e:
                last_error = e
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
        raise ConnectionError(
            f"Failed after {self.config.max_retries} attempts: {last_error}"
        )

    def _post_multipart(self, url, filepath, tags=""):
        """POST multipart/form-data file upload with retry."""
        boundary = uuid.uuid4().hex
        filepath = Path(filepath)
        file_data = filepath.read_bytes()
        filename = filepath.name

        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode("utf-8") + file_data + (
            f"\r\n--{boundary}\r\n"
            f'Content-Disposition: form-data; name="tags"\r\n\r\n'
            f"{tags}\r\n"
            f"--{boundary}--\r\n"
        ).encode("utf-8")

        last_error = None
        for attempt in range(self.config.max_retries):
            try:
                req = Request(
                    url, data=body, method="POST",
                    headers={
                        "Content-Type": f"multipart/form-data; boundary={boundary}"
                    }
                )
                with urlopen(req, timeout=self.config.request_timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except (URLError, HTTPError, TimeoutError, json.JSONDecodeError) as e:
                last_error = e
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
        raise ConnectionError(
            f"Failed after {self.config.max_retries} attempts: {last_error}"
        )

    def _request(self, method, url, data=None):
        """HTTP request with retry logic. Uses stdlib only."""
        last_error = None
        for attempt in range(self.config.max_retries):
            try:
                if data is not None:
                    body = json.dumps(data).encode("utf-8")
                    req = Request(
                        url, data=body, method=method,
                        headers={"Content-Type": "application/json"}
                    )
                else:
                    req = Request(url, method=method)
                with urlopen(req, timeout=self.config.request_timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except (URLError, HTTPError, TimeoutError, json.JSONDecodeError) as e:
                last_error = e
                if attempt < self.config.max_retries - 1:
                    time.sleep(self.config.retry_delay * (attempt + 1))
        raise ConnectionError(
            f"Failed after {self.config.max_retries} attempts: {last_error}"
        )
