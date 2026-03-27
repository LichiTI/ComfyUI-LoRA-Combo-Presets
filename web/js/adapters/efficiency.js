import { BaseComboAdapter } from "./base.js";

const STACKER_CLASSES = new Set(["TSC LoRA Stacker"]);

export class EfficiencyAdapter extends BaseComboAdapter {
  name = "efficiency";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return STACKER_CLASSES.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    const loraCount = Number(this.helpers.getWidgetByName(node, "lora_count")?.value ?? 0);
    const inputMode = String(this.helpers.getWidgetByName(node, "input_mode")?.value || "simple");
    const loras = [];
    for (let index = 1; index <= Math.max(0, loraCount); index += 1) {
      const name = String(this.helpers.getWidgetByName(node, `lora_name_${index}`)?.value || "").trim();
      if (!name || name === "None") continue;
      if (inputMode === "advanced") {
        loras.push({
          name,
          strength: Number(this.helpers.getWidgetByName(node, `model_str_${index}`)?.value ?? 1),
          clip_strength: Number(this.helpers.getWidgetByName(node, `clip_str_${index}`)?.value ?? 1),
          enabled: true,
        });
      } else {
        const strength = Number(this.helpers.getWidgetByName(node, `lora_wt_${index}`)?.value ?? 1);
        loras.push({ name, strength, clip_strength: strength, enabled: true });
      }
    }
    return loras;
  }

  applyLora(node, combo) {
    const loras = (combo?.loras || []).filter((item) => item?.enabled !== false);
    const count = Math.min(50, loras.length);
    const modeWidget = this.helpers.getWidgetByName(node, "input_mode");
    const nextMode = loras.some((item) => Math.abs(Number(item.strength) - Number(item.clip_strength)) > 0.0001) ? "advanced" : "simple";
    if (modeWidget) {
      this.helpers.updateWidgetValue(node, modeWidget, nextMode);
    }
    const countWidget = this.helpers.getWidgetByName(node, "lora_count");
    if (countWidget) {
      this.helpers.updateWidgetValue(node, countWidget, count);
    }
    for (let index = 1; index <= 50; index += 1) {
      const item = loras[index - 1];
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `lora_name_${index}`), item?.name || "None");
      if (nextMode === "advanced") {
        this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `model_str_${index}`), Number(item?.strength ?? 1));
        this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `clip_str_${index}`), Number(item?.clip_strength ?? item?.strength ?? 1));
      } else {
        this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `lora_wt_${index}`), Number(item?.strength ?? 1));
      }
    }
    return true;
  }
}
