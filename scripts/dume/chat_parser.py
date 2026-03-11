"""OpenAI chat export parser.

Handles the JSON format from ChatGPT data exports:
- conversations.json (full export)
- Individual chat JSON files

Extracts meaningful conversation content, filters noise,
preserves provenance (conversation ID, timestamp, model).
"""

import json
from pathlib import Path
from typing import Optional, Generator


def parse_openai_export(filepath: Path) -> Generator[dict, None, None]:
    """Parse an OpenAI data export file.
    
    Yields conversation dicts with:
      - id: conversation ID
      - title: conversation title
      - create_time: Unix timestamp
      - messages: list of {role, content} dicts
    """
    data = json.loads(filepath.read_text(encoding="utf-8"))

    # Full export: list of conversations
    if isinstance(data, list):
        for convo in data:
            parsed = _parse_conversation(convo)
            if parsed and parsed["messages"]:
                yield parsed
    # Single conversation
    elif isinstance(data, dict):
        if "mapping" in data:
            parsed = _parse_conversation(data)
            if parsed and parsed["messages"]:
                yield parsed
        elif "messages" in data:
            yield {
                "id": data.get("id", filepath.stem),
                "title": data.get("title", filepath.stem),
                "create_time": data.get("create_time", 0),
                "messages": _extract_simple_messages(data["messages"]),
            }


def parse_jsonl_chat(filepath: Path) -> Generator[dict, None, None]:
    """Parse a JSONL file where each line is a conversation or message."""
    with open(filepath, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if "messages" in data:
                    yield {
                        "id": data.get("id", f"{filepath.stem}_{i}"),
                        "title": data.get("title", f"Chat {i}"),
                        "create_time": data.get("create_time", 0),
                        "messages": _extract_simple_messages(data["messages"]),
                    }
            except json.JSONDecodeError:
                continue


def _parse_conversation(convo: dict) -> Optional[dict]:
    """Parse a single OpenAI conversation export (mapping format)."""
    if not isinstance(convo, dict):
        return None

    convo_id = convo.get("id", convo.get("conversation_id", "unknown"))
    title = convo.get("title", "Untitled")
    create_time = convo.get("create_time", 0)

    messages = []
    mapping = convo.get("mapping", {})

    if mapping:
        # OpenAI export uses a tree structure — flatten to linear
        ordered = _linearize_mapping(mapping)
        for node in ordered:
            msg = node.get("message")
            if not msg:
                continue
            role = msg.get("author", {}).get("role", "unknown")
            content = _extract_content(msg)
            if content and role in ("user", "assistant", "system"):
                messages.append({"role": role, "content": content})
    else:
        messages = _extract_simple_messages(convo.get("messages", []))

    return {
        "id": convo_id,
        "title": title,
        "create_time": create_time,
        "messages": messages,
    }


def _linearize_mapping(mapping: dict) -> list:
    """Convert OpenAI's tree-structured mapping to a linear message list."""
    nodes = {}
    roots = []

    for node_id, node in mapping.items():
        nodes[node_id] = node
        if node.get("parent") is None:
            roots.append(node_id)

    result = []
    visited = set()

    def walk(node_id):
        if node_id in visited:
            return
        visited.add(node_id)
        node = nodes.get(node_id, {})
        if node.get("message"):
            result.append(node)
        for child_id in node.get("children", []):
            walk(child_id)

    for root_id in roots:
        walk(root_id)

    return result


def _extract_content(message: dict) -> str:
    """Extract text content from an OpenAI message object."""
    content = message.get("content", {})

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, dict):
        parts = content.get("parts", [])
        text_parts = []
        for part in parts:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                text_parts.append(part["text"])
        return "\n".join(text_parts).strip()

    return ""


def _extract_simple_messages(messages: list) -> list:
    """Extract messages from simple {role, content} format."""
    result = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if isinstance(content, str) and content.strip() and role in ("user", "assistant", "system"):
            result.append({"role": role, "content": content.strip()})
    return result
