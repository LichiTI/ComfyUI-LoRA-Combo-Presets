from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ComboStore:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _combo_path(self, combo_id: str) -> Path:
        return self.base_dir / f"{combo_id}.combo.json"

    def list_combos(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for path in sorted(self.base_dir.glob("*.combo.json"), key=lambda item: item.stat().st_mtime, reverse=True):
            try:
                items.append(json.loads(path.read_text(encoding="utf-8")))
            except Exception:
                continue
        return items

    def get_combo(self, combo_id: str) -> dict[str, Any] | None:
        path = self._combo_path(combo_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def save_combo(self, combo: dict[str, Any]) -> dict[str, Any]:
        path = self._combo_path(str(combo["id"]))
        path.write_text(json.dumps(combo, ensure_ascii=False, indent=2), encoding="utf-8")
        return combo

    def delete_combo(self, combo_id: str) -> bool:
        path = self._combo_path(combo_id)
        if not path.exists():
            return False
        path.unlink()
        return True
