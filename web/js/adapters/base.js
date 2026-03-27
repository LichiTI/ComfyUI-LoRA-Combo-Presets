export class BaseComboAdapter {
  name = "base";

  canRead(_node) {
    return false;
  }

  canApplyLora(_node) {
    return false;
  }

  canApplyPrompt(_node) {
    return false;
  }

  extractCombo(_node) {
    return [];
  }

  applyLora(_node, _combo, _helpers) {
    return false;
  }
}
