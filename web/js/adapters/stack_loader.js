import { BaseComboAdapter } from "./base.js";

const YASER_CLASSES = new Set(["Lora Loader Stack"]);

export class StackLoaderAdapter extends BaseComboAdapter {
  name = "stack_loader";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return YASER_CLASSES.has(node?.comfyClass || "") || false;
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    return this.helpers.extractIndexedStackLoras(node, 5, "lora_", "strength_");
  }

  applyLora(node, combo) {
    return this.helpers.applyIndexedStack(node, combo, 5, "lora_", "strength_");
  }
}
