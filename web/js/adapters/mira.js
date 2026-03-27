import { BaseComboAdapter } from "./base.js";

const STACKER_CLASSES = new Set(["LoRA Loader With Name Stacker"]);
const TEXT_CLASSES = new Set(["LoRA Loader from Text"]);

export class MiraAdapter extends BaseComboAdapter {
  name = "mira";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return STACKER_CLASSES.has(node?.comfyClass || "") || TEXT_CLASSES.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    if (TEXT_CLASSES.has(node?.comfyClass || "")) {
      const widget = this.helpers.getWidgetByName(node, "text");
      return this.helpers.parseLoraSyntax(String(widget?.value || ""));
    }

    const stackWidget = this.helpers.getWidgetByName(node, "lora_stack");
    if (typeof stackWidget?.value === "string" && stackWidget.value.includes("<lora:")) {
      return this.helpers.parseLoraSyntax(stackWidget.value);
    }

    const name = String(this.helpers.getWidgetByName(node, "lora_name")?.value || "").trim();
    if (!name || name === "None") return [];
    return [{
      name,
      strength: Number(this.helpers.getWidgetByName(node, "strength_model")?.value ?? 1),
      clip_strength: Number(this.helpers.getWidgetByName(node, "strength_clip")?.value ?? 1),
      enabled: this.helpers.getWidgetByName(node, "bypass")?.value !== true,
    }];
  }

  applyLora(node, combo) {
    if (TEXT_CLASSES.has(node?.comfyClass || "")) {
      const widget = this.helpers.getWidgetByName(node, "text");
      if (!widget) return false;
      return this.helpers.updateWidgetValue(node, widget, this.helpers.formatLoraSyntax(combo.loras || []));
    }

    const first = (combo?.loras || []).find((item) => item?.enabled !== false);
    if (!first) return false;
    const stackWidget = this.helpers.getWidgetByName(node, "lora_stack");
    if (stackWidget) {
      return this.helpers.updateWidgetValue(node, stackWidget, this.helpers.formatLoraSyntax(combo.loras || []));
    }
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "lora_name"), first.name);
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "strength_model"), Number(first.strength ?? 1));
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "strength_clip"), Number(first.clip_strength ?? first.strength ?? 1));
    const bypassWidget = this.helpers.getWidgetByName(node, "bypass");
    if (bypassWidget) {
      this.helpers.updateWidgetValue(node, bypassWidget, false);
    }
    return true;
  }
}
