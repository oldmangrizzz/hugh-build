"""Document chunking strategies for knowledge ingestion.

Chunks text into overlapping segments suitable for embedding.
Respects sentence and paragraph boundaries where possible.
"""

import re
from typing import List, Optional, Tuple
from .config import DumeConfig


def chunk_text(
    text: str,
    config: DumeConfig,
    metadata: Optional[dict] = None,
) -> List[dict]:
    """Split text into overlapping chunks with metadata."""
    if not text or not text.strip():
        return []

    paragraphs = _split_paragraphs(text)
    chunks = []
    current_chunk = ""
    chunk_index = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If adding this paragraph exceeds chunk_size, finalize current chunk
        if current_chunk and len(current_chunk) + len(para) + 2 > config.chunk_size:
            if len(current_chunk) >= config.min_chunk_size:
                chunks.append(_make_chunk(
                    current_chunk, chunk_index, metadata, config
                ))
                chunk_index += 1

            # Start new chunk with overlap from the end of the previous
            overlap = current_chunk[-config.chunk_overlap:] if config.chunk_overlap else ""
            current_chunk = overlap + "\n\n" + para if overlap else para
        else:
            current_chunk = current_chunk + "\n\n" + para if current_chunk else para

    # Finalize last chunk
    if current_chunk.strip() and len(current_chunk.strip()) >= config.min_chunk_size:
        chunks.append(_make_chunk(current_chunk, chunk_index, metadata, config))

    return chunks


def chunk_markdown(
    text: str,
    config: DumeConfig,
    metadata: Optional[dict] = None,
) -> List[dict]:
    """Split markdown by headers, then chunk within sections."""
    sections = _split_by_headers(text)
    all_chunks = []

    for section_title, section_body in sections:
        section_meta = {**(metadata or {})}
        if section_title:
            section_meta["section"] = section_title

        section_chunks = chunk_text(section_body, config, section_meta)
        all_chunks.extend(section_chunks)

    return all_chunks


def chunk_chat_export(
    messages: list,
    config: DumeConfig,
    metadata: Optional[dict] = None,
) -> List[dict]:
    """Process OpenAI-style chat export into knowledge chunks.
    
    Groups conversation turns into coherent topic blocks.
    Filters out trivial messages.
    """
    chunks = []
    current_block = []
    current_tokens = 0
    block_index = 0

    for msg in messages:
        role = msg.get("role", msg.get("author", {}).get("role", "unknown"))
        content = msg.get("content", "")

        if not content or not isinstance(content, str):
            continue

        # Filter trivial messages
        content = content.strip()
        if len(content) < config.min_message_length:
            continue

        turn = f"[{role}]: {content}"
        turn_len = len(turn)

        if current_tokens + turn_len > config.chunk_size and current_block:
            block_text = "\n\n".join(current_block)
            chunks.append(_make_chunk(
                block_text, block_index,
                {**(metadata or {}), "type": "chat_export"},
                config
            ))
            block_index += 1

            # Keep last message as overlap for continuity
            current_block = [current_block[-1], turn] if config.combine_assistant_turns else [turn]
            current_tokens = sum(len(t) for t in current_block)
        else:
            current_block.append(turn)
            current_tokens += turn_len

    # Finalize
    if current_block:
        block_text = "\n\n".join(current_block)
        if len(block_text) >= config.min_chunk_size:
            chunks.append(_make_chunk(
                block_text, block_index,
                {**(metadata or {}), "type": "chat_export"},
                config
            ))

    return chunks


def _split_paragraphs(text: str) -> List[str]:
    """Split text on double newlines or single newlines before bullets/numbers."""
    parts = re.split(r'\n\s*\n', text)
    result = []
    for part in parts:
        # Further split very long paragraphs at sentence boundaries
        if len(part) > 2000:
            sentences = re.split(r'(?<=[.!?])\s+', part)
            result.extend(sentences)
        else:
            result.append(part)
    return result


def _split_by_headers(text: str) -> List[Tuple[str, str]]:
    """Split markdown into (header, body) sections."""
    lines = text.split('\n')
    sections = []
    current_header = ""
    current_body = []

    for line in lines:
        header_match = re.match(r'^(#{1,4})\s+(.+)$', line)
        if header_match:
            if current_body:
                sections.append((current_header, '\n'.join(current_body)))
            current_header = header_match.group(2).strip()
            current_body = []
        else:
            current_body.append(line)

    if current_body:
        sections.append((current_header, '\n'.join(current_body)))

    return sections if sections else [("", text)]


def _make_chunk(text: str, index: int, metadata: Optional[dict], config: DumeConfig) -> dict:
    """Create a chunk record with metadata."""
    return {
        "text": text.strip(),
        "chunk_index": index,
        "char_count": len(text.strip()),
        "metadata": {
            **(metadata or {}),
            "chunk_index": index,
            "confidence": config.default_confidence,
        }
    }
