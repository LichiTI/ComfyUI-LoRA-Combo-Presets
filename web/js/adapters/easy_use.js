import { BaseComboAdapter } from "./base.js";

const STACK_CLASSES = new Set(["easy loraStack"]);
const SWITCHER_CLASSES = new Set(["easy loraSwitcher"]);

export class EasyUseAdapter extends BaseComboAdapter {
  name = "easy_use";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return STACK_CLASSES.has(node?.comfyClass || "") || SWITCHER_CLASSES.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    if (SWITCHER_CLASSES.has(node?.comfyClass || "")) {
      const toggle = this.helpers.getWidgetByName(node, "toggle")?.value;
      if (toggle in [false, null, "False"]) return [];
      const select = Number(this.helpers.getWidgetByName(node, "select")?.value ?? 1);
      const strength = Number(this.helpers.getWidgetByName(node, "lora_strength")?.value ?? 1);
      const name = String(this.helpers.getWidgetByName(node, `lora_${select}_name`)?.value || "").trim();
      if (!name || name === "None") return [];
      return [{ name, strength, clip_strength: strength, enabled: true }];
    }

    const toggle = this.helpers.getWidgetByName(node, "toggle")?.value;
    if (toggle in [false, null, "False"]) return [];
    const mode = String(this.helpers.getWidgetByName(node, "mode")?.value || "simple");
    const count = Number(this.helpers.getWidgetByName(node, "num_loras")?.value ?? 0);
    const loras = [];
    for (let index = 1; index <= count; index += 1) {
      const name = String(this.helpers.getWidgetByName(node, `lora_${index}_name`)?.value || "").trim();
      if (!name || name === "None") continue;
      if (mode === "advanced") {
        loras.push({
          name,
          strength: Number(this.helpers.getWidgetByName(node, `lora_${index}_model_strength`)?.value ?? 1),
          clip_strength: Number(this.helpers.getWidgetByName(node, `lora_${index}_clip_strength`)?.value ?? 1),
          enabled: true,
        });
      } else {
        const strength = Number(this.helpers.getWidgetByName(node, `lora_${index}_strength`)?.value ?? 1);
        loras.push({ name, strength, clip_strength: strength, enabled: true });
      }
    }
    return loras;
  }

  applyLora(node, combo) {
    const loras = (combo?.loras || []).filter((item) => item?.enabled !== false);

    if (SWITCHER_CLASSES.has(node?.comfyClass || "")) {
      const first = loras[0];
      if (!first) return false;
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "toggle"), true);
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "select"), 1);
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "num_loras"), Math.max(1, loras.length));
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "lora_strength"), Number(first.strength ?? 1));
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "lora_1_name"), first.name);
      return true;
    }

    const count = Math.min(10, loras.length);
    const nextMode = loras.some((item) => Math.abs(Number(item.strength) - Number(item.clip_strength)) > 0.0001) ? "advanced" : "simple";
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "toggle"), true);
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "mode"), nextMode);
    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "num_loras"), Math.max(1, count));

    for (let index = 1; index <= 10; index += 1) {
      const item = loras[index - 1];
      this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `lora_${index}_name`), item?.name || "None");
      if (nextMode === "advanced") {
        this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `lora_${index}_model_strength`), Number(item?.strength ?? 1));
        this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `lora_${index}_clip_strength`), Number(item?.clip_strength ?? item?.strength ?? 1));
      } else {
        this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, `lora_${index}_strength`), Number(item?.strength ?? 1));
      }
    }
    return true;
  }
}
