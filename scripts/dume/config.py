"""Dum-E configuration — endpoints, chunk sizes, retry policy."""

from dataclasses import dataclass, field
from typing import Optional
import os


@dataclass
class DumeConfig:
    # CT104 Knowledge DB
    knowledge_db_url: str = os.getenv(
        "DUME_KNOWLEDGE_DB_URL", "http://192.168.7.190:8084"
    )

    # Chunking
    chunk_size: int = 1000          # chars per chunk
    chunk_overlap: int = 200        # overlap between chunks
    min_chunk_size: int = 100       # discard chunks smaller than this

    # Chat export parsing
    min_message_length: int = 50    # skip trivial messages
    combine_assistant_turns: bool = True

    # Retry policy
    max_retries: int = 3
    retry_delay: float = 2.0       # seconds between retries
    request_timeout: float = 30.0  # seconds

    # Batch processing
    batch_size: int = 10            # items per batch
    batch_delay: float = 0.5       # seconds between batches

    # Provenance
    default_confidence: float = 0.8
    source_prefix: str = ""        # prepended to all source labels

    # File types
    supported_extensions: list = field(default_factory=lambda: [
        ".md", ".txt", ".json", ".jsonl", ".pdf", ".html", ".csv"
    ])

    def health_url(self) -> str:
        return f"{self.knowledge_db_url}/health"

    def ingest_text_url(self) -> str:
        return f"{self.knowledge_db_url}/ingest/text"

    def ingest_file_url(self) -> str:
        return f"{self.knowledge_db_url}/ingest/file"

    def ingest_url_url(self) -> str:
        return f"{self.knowledge_db_url}/ingest/url"

    def ingest_chat_url(self) -> str:
        return f"{self.knowledge_db_url}/ingest/chat-export"

    def search_url(self) -> str:
        return f"{self.knowledge_db_url}/search"

    def stats_url(self) -> str:
        return f"{self.knowledge_db_url}/stats"

    def graph_url(self) -> str:
        return f"{self.knowledge_db_url}/graph"
