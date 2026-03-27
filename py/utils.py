from __future__ import annotations

import re
from typing import Iterable

LORA_PATTERN = re.compile(r"<lora:([^:>]+):([^:>]+)(?::([^:>]+))?>", re.IGNORECASE)


def parse_lora_syntax(text: str) -> list[dict]:
    if not text:
        return []

    results: list[dict] = []
    for name, strength, clip_strength in LORA_PATTERN.findall(text):
        try:
            model_strength = float(strength)
        except Exception:
            model_strength = 1.0

        try:
            clip_value = float(clip_strength) if clip_strength else model_strength
        except Exception:
            clip_value = model_strength

        results.append(
            {
                "name": name.strip(),
                "strength": model_strength,
                "clip_strength": clip_value,
                "enabled": True,
            }
        )
    return results


def format_lora_syntax(loras: Iterable[dict]) -> str:
    parts: list[str] = []
    for lora in loras:
        if not lora or not lora.get("enabled", True):
            continue
        name = str(lora.get("name") or "").strip()
        if not name:
            continue
        model_strength = float(lora.get("strength", 1.0))
        clip_strength = float(lora.get("clip_strength", model_strength))
        if abs(model_strength - clip_strength) > 0.0001:
            parts.append(f"<lora:{name}:{model_strength:g}:{clip_strength:g}>")
        else:
            parts.append(f"<lora:{name}:{model_strength:g}>")
    return " ".join(parts)


def apply_prompt_template(template: str, artist_prompt: str, lora_names: Iterable[str]) -> str:
    template = template or "{artist_prompt}"
    joined_lora_names = ", ".join([name for name in lora_names if name])
    return (
        template.replace("{artist_prompt}", artist_prompt or "")
        .replace("{lora_names}", joined_lora_names)
        .strip(" ,")
    )
