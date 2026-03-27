import { createAdapters } from "./adapters/index.js";

export const LORA_REGEX = /<lora:([^:>]+):([^:>]+)(?::([^:>]+))?>/gi;

export function parseLoraSyntax(text = "") {
  const loras = [];
  let match;
  while ((match = LORA_REGEX.exec(text)) !== null) {
    const [, name, strength, clipStrength] = match;
    loras.push({
      name: String(name || "").trim(),
      strength: Number(strength || 1),
      clip_strength: clipStrength != null ? Number(clipStrength) : Number(strength || 1),
      enabled: true,
    });
  }
  return loras;
}

export function formatLoraSyntax(loras = []) {
  return loras
    .filter((item) => item && item.enabled !== false && item.name)
    .map((item) => {
      const strength = Number(item.strength ?? 1);
      const clipStrength = Number(item.clip_strength ?? strength);
      if (Math.abs(strength - clipStrength) > 0.0001) {
        return `<lora:${item.name}:${strength}:${clipStrength}>`;
      }
      return `<lora:${item.name}:${strength}>`;
    })
    .join(" ");
}

export function getStringWidgets(node) {
  if (!node || !Array.isArray(node.widgets)) return [];
  return node.widgets.filter((widget) => typeof widget?.value === "string");
}

export function getAllWidgets(node) {
  if (!node || !Array.isArray(node.widgets)) return [];
  return node.widgets;
}

export function getWidgetByName(node, name) {
  return getAllWidgets(node).find((widget) => widget?.name === name) || null;
}

export function getWidgetsByPrefix(node, prefix) {
  return getAllWidgets(node).filter((widget) => String(widget?.name || "").startsWith(prefix));
}

export function findLikelyLoraWidget(node) {
  const miraText = node?.comfyClass === "LoRA Loader from Text" ? getWidgetByName(node, "text") : null;
  if (miraText) return miraText;

  const widgets = getStringWidgets(node);
  return (
    widgets.find((widget) => /lora|stack/i.test(widget?.name || "")) ||
    widgets.find((widget) => /<lora:/i.test(widget?.value || "")) ||
    widgets.find((widget) => /text/i.test(widget?.name || "")) ||
    null
  );
}

export function updateWidgetValue(node, widget, value) {
  if (!node || !widget) return false;
  widget.value = value;

  if (Array.isArray(node.widgets_values)) {
    const index = node.widgets.indexOf(widget);
    if (index >= 0 && index < node.widgets_values.length) {
      node.widgets_values[index] = value;
    }
  }

  if (typeof widget.callback === "function") {
    try {
      widget.callback(value);
    } catch (error) {
      console.warn("LoRA Combo Presets: widget callback failed", error);
    }
  }

  if (typeof node.setDirtyCanvas === "function") {
    node.setDirtyCanvas(true, true);
  }
  return true;
}

export function extractIndexedStackLoras(node, maxCount, namePrefix, strengthPrefix, clipStrengthPrefix = null, switchPrefix = null) {
  const loras = [];
  for (let index = 1; index <= maxCount; index += 1) {
    const nameWidget = getWidgetByName(node, `${namePrefix}${index}`);
    const strengthWidget = getWidgetByName(node, `${strengthPrefix}${index}`);
    const clipStrengthWidget = clipStrengthPrefix ? getWidgetByName(node, `${clipStrengthPrefix}${index}`) : null;
    const switchWidget = switchPrefix ? getWidgetByName(node, `${switchPrefix}${index}`) : null;

    const name = String(nameWidget?.value || "").trim();
    if (!name || name === "None") continue;
    if (switchWidget && String(switchWidget.value || "Off") === "Off") continue;

    const strength = Number(strengthWidget?.value ?? 1);
    const clipStrength = Number(clipStrengthWidget?.value ?? strength);
    if (strength === 0 && clipStrength === 0) continue;

    loras.push({ name, strength, clip_strength: clipStrength, enabled: true });
  }
  return loras;
}

export function applyIndexedStack(node, combo, maxCount, namePrefix, strengthPrefix, clipStrengthPrefix = null, switchPrefix = null, noneValue = "None") {
  const loras = (combo?.loras || []).filter((item) => item?.enabled !== false).slice(0, maxCount);
  for (let index = 1; index <= maxCount; index += 1) {
    const item = loras[index - 1];
    const nameWidget = getWidgetByName(node, `${namePrefix}${index}`);
    const strengthWidget = getWidgetByName(node, `${strengthPrefix}${index}`);
    const clipStrengthWidget = clipStrengthPrefix ? getWidgetByName(node, `${clipStrengthPrefix}${index}`) : null;
    const switchWidget = switchPrefix ? getWidgetByName(node, `${switchPrefix}${index}`) : null;

    if (nameWidget) updateWidgetValue(node, nameWidget, item?.name || noneValue);
    if (strengthWidget) updateWidgetValue(node, strengthWidget, Number(item?.strength ?? 1));
    if (clipStrengthWidget) updateWidgetValue(node, clipStrengthWidget, Number(item?.clip_strength ?? item?.strength ?? 1));
    if (switchWidget) updateWidgetValue(node, switchWidget, item ? "On" : "Off");
  }
  return true;
}

const helpers = {
  parseLoraSyntax,
  formatLoraSyntax,
  getStringWidgets,
  getAllWidgets,
  getWidgetByName,
  getWidgetsByPrefix,
  findLikelyLoraWidget,
  updateWidgetValue,
  extractIndexedStackLoras,
  applyIndexedStack,
};

const adapters = createAdapters(helpers);

function getLoraAdapter(node) {
  return adapters.find((adapter) => adapter.canApplyLora(node) || adapter.canRead(node)) || null;
}

export function canApplyLoraToNode(node) {
  return Boolean(getLoraAdapter(node));
}

export function extractComboFromNode(node) {
  const loraAdapter = getLoraAdapter(node);
  const loras = loraAdapter ? loraAdapter.extractCombo(node) : [];

  return {
    title: node?.title || node?.comfyClass || "\u672a\u547d\u540d\u8282\u70b9\u7ec4\u5408",
    description: "",
    tags: [],
    loras,
    prompt_bundle: {
      artist_prompt: "",
      positive_template: "",
      negative_template: "",
    },
    source: {
      adapter: loraAdapter?.name || "manual",
      node_class: node?.comfyClass || "",
    },
  };
}

export function applyComboToNode(node, combo, options = {}) {
  if (!node || !combo) return false;

  const { applyLora = true } = options;

  if (applyLora) {
    const loraAdapter = getLoraAdapter(node);
    if (loraAdapter) {
      loraAdapter.applyLora(node, combo, helpers);
    }
  }

  return true;
}
