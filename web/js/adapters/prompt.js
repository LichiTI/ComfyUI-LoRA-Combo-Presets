import { BaseComboAdapter } from "./base.js";

export class PromptAdapter extends BaseComboAdapter {
  name = "prompt";

  constructor(helpers) {
    super();
    this.helpers = helpers;
  }

  canApplyPrompt(node) {
    return Boolean(this.helpers.findLikelyPromptWidget(node));
  }
}
