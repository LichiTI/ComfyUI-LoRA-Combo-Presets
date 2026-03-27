from __future__ import annotations

from pathlib import Path
from typing import Any

from .schema import normalize_combo_payload
from .store import ComboStore
from .utils import apply_prompt_template, format_lora_syntax


class ComboService:
    def __init__(self, root_dir: Path) -> None:
        self.root_dir = Path(root_dir)
        self.store = ComboStore(self.root_dir / "data" / "combos")

    def list_combos(self) -> list[dict[str, Any]]:
        return self.store.list_combos()

    def get_combo(self, combo_id: str) -> dict[str, Any] | None:
        return self.store.get_combo(combo_id)

    def create_combo(self, payload: dict[str, Any]) -> dict[str, Any]:
        combo = normalize_combo_payload(payload)
        self.store.save_combo(combo)
        return combo

    def update_combo(self, combo_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        existing = self.store.get_combo(combo_id)
        if existing is None:
            return None
        merged = {**existing, **payload, "id": combo_id, "created_at": existing.get("created_at")}
        combo = normalize_combo_payload(merged)
        combo["created_at"] = existing.get("created_at", combo["created_at"])
        self.store.save_combo(combo)
        return combo

    def delete_combo(self, combo_id: str) -> bool:
        return self.store.delete_combo(combo_id)

    def build_apply_payload(self, combo_id: str) -> dict[str, Any] | None:
        combo = self.get_combo(combo_id)
        if combo is None:
            return None
        lora_names = [item.get("name", "") for item in combo.get("loras", [])]
        prompt_bundle = combo.get("prompt_bundle", {})
        positive_template = prompt_bundle.get("positive_template", "")
        negative_template = prompt_bundle.get("negative_template", "")
        artist_prompt = prompt_bundle.get("artist_prompt", "")
        return {
            "combo": combo,
            "lora_syntax": format_lora_syntax(combo.get("loras", [])),
            "artist_prompt": artist_prompt,
            "positive_prompt": apply_prompt_template(positive_template, artist_prompt, lora_names) if positive_template or artist_prompt else "",
            "negative_prompt": apply_prompt_template(negative_template, artist_prompt, lora_names) if negative_template else "",
        }
