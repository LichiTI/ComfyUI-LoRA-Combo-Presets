from .base import BaseAdapter


class LoraManagerAdapter(BaseAdapter):
    adapter_name = "lora_manager"

    def can_read(self, node_info: dict) -> bool:
        return node_info.get("comfy_class") in {
            "Lora Loader (LoraManager)",
            "Lora Stacker (LoraManager)",
            "Prompt (LoraManager)",
        }
