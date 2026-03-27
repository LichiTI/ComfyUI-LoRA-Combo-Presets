from __future__ import annotations

from pathlib import Path

from aiohttp import web
from server import PromptServer

from .service import ComboService

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
API_PREFIX = "/lora-combo-presets/api"
service = ComboService(PLUGIN_ROOT)


@PromptServer.instance.routes.get(f"{API_PREFIX}/combos")
async def list_combos(request):
    return web.json_response({"success": True, "items": service.list_combos()})


@PromptServer.instance.routes.get(f"{API_PREFIX}/combos/{{combo_id}}")
async def get_combo(request):
    combo_id = request.match_info["combo_id"]
    combo = service.get_combo(combo_id)
    if combo is None:
        return web.json_response({"success": False, "error": "Combo not found"}, status=404)
    return web.json_response({"success": True, "item": combo})


@PromptServer.instance.routes.post(f"{API_PREFIX}/combos")
async def create_combo(request):
    payload = await request.json()
    combo = service.create_combo(payload)
    return web.json_response({"success": True, "item": combo})


@PromptServer.instance.routes.put(f"{API_PREFIX}/combos/{{combo_id}}")
async def update_combo(request):
    combo_id = request.match_info["combo_id"]
    payload = await request.json()
    combo = service.update_combo(combo_id, payload)
    if combo is None:
        return web.json_response({"success": False, "error": "Combo not found"}, status=404)
    return web.json_response({"success": True, "item": combo})


@PromptServer.instance.routes.delete(f"{API_PREFIX}/combos/{{combo_id}}")
async def delete_combo(request):
    combo_id = request.match_info["combo_id"]
    deleted = service.delete_combo(combo_id)
    if not deleted:
        return web.json_response({"success": False, "error": "Combo not found"}, status=404)
    return web.json_response({"success": True})


@PromptServer.instance.routes.get(f"{API_PREFIX}/combos/{{combo_id}}/apply")
async def get_combo_apply_payload(request):
    combo_id = request.match_info["combo_id"]
    payload = service.build_apply_payload(combo_id)
    if payload is None:
        return web.json_response({"success": False, "error": "Combo not found"}, status=404)
    return web.json_response({"success": True, **payload})
