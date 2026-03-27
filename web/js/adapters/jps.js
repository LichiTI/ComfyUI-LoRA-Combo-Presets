import { BaseComboAdapter } from "./base.js";

const JPS_LOADER_CLASSES = new Set(["Lora Loader (JPS)"]);

export class JpsAdapter extends BaseComboAdapter {
  name = "jps";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return JPS_LOADER_CLASSES.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
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
    const first = (combo?.loras || []).find((item) => item?.enabled !== false);
    if (!first) return false;
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "switch"), "On");
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "lora_name"), first.name);
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "strength_model"), Number(first.strength ?? 1));
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "strength_clip"), Number(first.clip_strength ?? first.strength ?? 1));
    return true;
  }
}
