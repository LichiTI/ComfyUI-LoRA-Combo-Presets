import { BaseComboAdapter } from "./base.js";

function resolveStrengthWidgets(helpers, node) {
  const modelWidget =
    helpers.getWidgetByName(node, "strength_model") ||
    helpers.getWidgetByName(node, "lora_model_strength");
  const clipWidget =
    helpers.getWidgetByName(node, "strength_clip") ||
    helpers.getWidgetByName(node, "lora_clip_strength");
  return { modelWidget, clipWidget };
}

function getToggleWidget(helpers, node) {
  return (
    helpers.getWidgetByName(node, "switch") ||
    helpers.getWidgetByName(node, "toggle") ||
    null
  );
}

export class SingleLoaderAdapter extends BaseComboAdapter {
  name = "single_loader";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    const loraNameWidget = this.helpers.getWidgetByName(node, "lora_name");
    const { modelWidget } = resolveStrengthWidgets(this.helpers, node);
    if (!loraNameWidget || !modelWidget) {
      return false;
    }

    const blockedClasses = new Set([
      "CR Load LoRA",
      "Lora Loader (JPS)",
      "LoRA Loader With Name Stacker",
      "Intrinsic Lora Sampling",
    ]);
    return !blockedClasses.has(node?.comfyClass || "");
  }

  canApplyLora(node) {
    return this.canRead(node);
  }

  extractCombo(node) {
    const toggleWidget = getToggleWidget(this.helpers, node);
    const toggleValue = toggleWidget?.value;
    if (toggleValue === "Off" || toggleValue === false || toggleValue === "False") {
      return [];
    }

    const loraName = String(this.helpers.getWidgetByName(node, "lora_name")?.value || "").trim();
    if (!loraName || loraName === "None") {
      return [];
    }

    const { modelWidget, clipWidget } = resolveStrengthWidgets(this.helpers, node);
    const strength = Number(modelWidget?.value ?? 1);
    const clipStrength = Number(clipWidget?.value ?? strength);
    return [{
      name: loraName,
      strength,
      clip_strength: clipStrength,
      enabled: true,
    }];
  }

  applyLora(node, combo) {
    const first = (combo?.loras || []).find((item) => item?.enabled !== false);
    if (!first) {
      return false;
    }

    const toggleWidget = getToggleWidget(this.helpers, node);
    if (toggleWidget) {
      const nextToggle = typeof toggleWidget.value === "string" ? "On" : true;
      this.helpers.updateWidgetValue(node, toggleWidget, nextToggle);
    }

    this.helpers.updateWidgetValue(node, this.helpers.getWidgetByName(node, "lora_name"), first.name);

    const { modelWidget, clipWidget } = resolveStrengthWidgets(this.helpers, node);
    if (modelWidget) {
      this.helpers.updateWidgetValue(node, modelWidget, Number(first.strength ?? 1));
    }
    if (clipWidget) {
      this.helpers.updateWidgetValue(node, clipWidget, Number(first.clip_strength ?? first.strength ?? 1));
    }
    return true;
  }
}
