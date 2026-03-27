class BaseAdapter:
    adapter_name = "base"

    def can_read(self, node_info: dict) -> bool:
        return False

    def can_apply_lora(self, node_info: dict) -> bool:
        return False

    def can_apply_prompt(self, node_info: dict) -> bool:
        return False
