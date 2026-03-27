import { BaseComboAdapter } from "./base.js";

export class TextSyntaxAdapter extends BaseComboAdapter {
  name = "text_syntax";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canRead(node) {
    return Boolean(this.helpers.findLikelyLoraWidget(node));
  }

  canApplyLora(node) {
    return Boolean(this.helpers.findLikelyLoraWidget(node));
  }

  extractCombo(node) {
    const widget = this.helpers.findLikelyLoraWidget(node);
    const syntax = typeof widget?.value === "string" ? widget.value : "";
    return this.helpers.parseLoraSyntax(syntax);
  }

  applyLora(node, combo) {
    const widget = this.helpers.findLikelyLoraWidget(node);
    if (!widget) return false;
    return this.helpers.updateWidgetValue(node, widget, this.helpers.formatLoraSyntax(combo.loras || []));
  }
}
