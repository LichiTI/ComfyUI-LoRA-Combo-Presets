import { TextSyntaxAdapter } from "./text_syntax.js";

const LM_CLASSES = new Set([
  "Lora Loader (LoraManager)",
  "Lora Stacker (LoraManager)",
  "WanVideo Lora Select (LoraManager)",
]);

export class LoraManagerAdapter extends TextSyntaxAdapter {
  name = "lora_manager";

  canRead(node) {
    return LM_CLASSES.has(node?.comfyClass || "") && super.canRead(node);
  }

  canApplyLora(node) {
    return LM_CLASSES.has(node?.comfyClass || "") && super.canApplyLora(node);
  }
}
