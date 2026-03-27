from __future__ import annotations

import time
import uuid
from copy import deepcopy
from typing import Any

DEFAULT_COMBO = {
    "id": "",
    "title": "",
    "description": "",
    "tags": [],
    "favorite": False,
    "created_at": 0,
    "updated_at": 0,
    "loras": [],
    "prompt_bundle": {
        "artist_prompt": "",
    },
    "apply": {
        "lora_mode": "replace",
    },
    "source": {
        "adapter": "manual",
        "node_class": "",
    },
}


def build_empty_combo() -> dict[str, Any]:
    return deepcopy(DEFAULT_COMBO)


def _normalize_lora_item(item: dict[str, Any]) -> dict[str, Any]:
    name = str(item.get("name") or item.get("file_name") or "").strip()
    if not name:
        return {}

    strength = item.get("strength", item.get("weight", 1.0))
    clip_strength = item.get("clip_strength", item.get("clipStrength", strength))

    try:
        strength = float(strength)
    except Exception:
        strength = 1.0

    try:
        clip_strength = float(clip_strength)
    except Exception:
        clip_strength = strength

    return {
        "name": name,
        "strength": strength,
        "clip_strength": clip_strength,
        "enabled": bool(item.get("enabled", True)),
    }


def normalize_combo_payload(data: dict[str, Any]) -> dict[str, Any]:
    combo = build_empty_combo()
    now = int(time.time())

    combo["id"] = str(data.get("id") or uuid.uuid4())
    combo["title"] = str(data.get("title") or "未命名组合").strip() or "未命名组合"
    combo["description"] = str(data.get("description") or "").strip()
    combo["favorite"] = bool(data.get("favorite", False))

    tags = data.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    combo["tags"] = [str(tag).strip() for tag in tags if str(tag).strip()]

    loras = data.get("loras") or []
    if not isinstance(loras, list):
        loras = []
    combo["loras"] = [normalized for item in loras if isinstance(item, dict) for normalized in [_normalize_lora_item(item)] if normalized]

    prompt_bundle = data.get("prompt_bundle") or {}
    if not isinstance(prompt_bundle, dict):
        prompt_bundle = {}
    combo["prompt_bundle"] = {
        "artist_prompt": str(prompt_bundle.get("artist_prompt") or "").strip(),
    }

    apply_cfg = data.get("apply") or {}
    if not isinstance(apply_cfg, dict):
        apply_cfg = {}
    combo["apply"] = {
        "lora_mode": str(apply_cfg.get("lora_mode") or "replace"),
    }

    source = data.get("source") or {}
    if not isinstance(source, dict):
        source = {}
    combo["source"] = {
        "adapter": str(source.get("adapter") or "manual"),
        "node_class": str(source.get("node_class") or ""),
    }

    created_at = data.get("created_at")
    try:
        combo["created_at"] = int(created_at) if created_at else now
    except Exception:
        combo["created_at"] = now
    combo["updated_at"] = now

    return combo
