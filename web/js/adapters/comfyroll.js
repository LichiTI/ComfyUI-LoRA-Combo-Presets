import { BaseComboAdapter } from "./base.js";

const STACKER_CLASSES = new Set(["CR LoRA Stack"]);
const LOADER_CLASSES = new Set(["CR Load LoRA"]);

export class ComfyrollAdapter extends BaseComboAdapter {
  name = "comfyroll";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return STACKER_CLASSES.has(node?.comfyClass || "") || LOADER_CLASSES.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    if (STACKER_CLASSES.has(node?.comfyClass || "")) {
      return this.helpers.extractIndexedStackLoras(node, 3, "lora_name_", "model_weight_", "clip_weight_", "switch_");
    }
    const switchValue = String(this.helpers.getWidgetByName(node, "switch")?.value || "Off");
    const name = String(this.helpers.getWidgetByName(node, "lora_name")?.value || "").trim();
    if (switchValue === "Off" || !name || name === "None") return [];
    return [{
      name,
      strength: Number(this.helpers.getWidgetByName(node, "strength_model")?.value ?? 1),
      clip_strength: Number(this.helpers.getWidgetByName(node, "strength_clip")?.value ?? 1),
      enabled: true,
    }];
  }

  applyLora(node, combo) {
    if (STACKER_CLASSES.has(node?.comfyClass || "")) {
      return this.helpers.applyIndexedStack(node, combo, 3, "lora_name_", "model_weight_", "clip_weight_", "switch_");
    }
    const first = (combo?.loras || []).find((item) => item?.enabled !== false);
    if (!first) return false;
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "switch"), "On");
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "lora_name"), first.name);
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "strength_model"), Number(first.strength ?? 1));
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "strength_clip"), Number(first.clip_strength ?? first.strength ?? 1));
    return true;
  }
}
