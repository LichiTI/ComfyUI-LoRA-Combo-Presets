import { BaseComboAdapter } from "./base.js";

const POWER_CLASSES = new Set(["Power Lora Loader (rgthree)"]);
const STACK_CLASSES = new Set(["Lora Loader Stack (rgthree)"]);

export class RgthreeAdapter extends BaseComboAdapter {
  name = "rgthree";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return POWER_CLASSES.has(node?.comfyClass || "") || STACK_CLASSES.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    if (POWER_CLASSES.has(node?.comfyClass || "")) {
      return this.helpers.getAllWidgets(node)
        .filter((widget) => String(widget?.name || "").startsWith("lora_") && widget?.value && typeof widget.value === "object")
        .map((widget) => {
          const value = widget.value || {};
          return {
            name: String(value.lora || "").trim(),
            strength: Number(value.strength ?? 1),
            clip_strength: Number(value.strengthTwo ?? value.strength ?? 1),
            enabled: value.on !== false,
          };
        })
        .filter((item) => item.name);
    }

    const loras = [];
    for (let index = 1; index <= 4; index += 1) {
      const suffix = String(index).padStart(2, "0");
      const loraWidget = this.helpers.getWidgetByName(node, `lora_${suffix}`);
      const strengthWidget = this.helpers.getWidgetByName(node, `strength_${suffix}`);
      const name = String(loraWidget?.value || "").trim();
      if (!name || name === "None") continue;
      const strength = Number(strengthWidget?.value ?? 1);
      if (strength === 0) continue;
      loras.push({ name, strength, clip_strength: strength, enabled: true });
    }
    return loras;
  }

  applyLora(node, combo) {
    if (POWER_CLASSES.has(node?.comfyClass || "")) {
      const loras = (combo?.loras || []).filter((item) => item?.enabled !== false);
      const loraWidgets = this.helpers.getWidgetsByPrefix(node, "lora_").filter((widget) => widget?.value && typeof widget.value === "object");
      for (let index = 0; index < loraWidgets.length; index += 1) {
        const widget = loraWidgets[index];
        const item = loras[index];
        const nextValue = item
          ? {
              ...(widget.value || {}),
              on: true,
              lora: item.name,
              strength: Number(item.strength ?? 1),
              strengthTwo: Number(item.clip_strength ?? item.strength ?? 1),
            }
          : {
              ...(widget.value || {}),
              on: false,
            };
        this.helpers.updateWidgetValue(node, widget, nextValue);
      }
      return true;
    }

    return this.helpers.applyIndexedStack(node, combo, 4, "lora_", "strength_");
  }
}
