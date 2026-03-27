import { app } from "../../../scripts/app.js";
import { extractComboFromNode, findLikelyLoraWidget } from "./combo_apply.js";
import { openComboTargetSelector } from "./combo_targets.js";
import { openComboEditor, openComboPicker, showToast } from "./combo_dialogs.js";

function showComboQuickPicker(node) {
  openComboPicker({
    title: "选择组合并应用到目标节点",
    onSelect: (combo) => openComboTargetSelector(combo, node),
  });
}

function saveComboFromNode(node) {
  const combo = extractComboFromNode(node);
  openComboEditor({ combo, sourceNode: node });
}

function shouldShowComboMenu(node) {
  return Boolean(findLikelyLoraWidget(node));
}

app.registerExtension({
  name: "LoraComboPresets.ContextMenu",
  async beforeRegisterNodeDef(nodeType) {
    const original = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function (_, options) {
      const result = original?.apply?.(this, arguments);
      if (!shouldShowComboMenu(this)) {
        return result;
      }

      options.unshift(
        {
          content: "LoRA 组合预设：保存当前节点",
          callback: () => saveComboFromNode(this),
        },
        {
          content: "LoRA 组合预设：选择目标后加载",
          callback: () => showComboQuickPicker(this),
        },
        {
          content: "LoRA 组合预设：打开面板",
          callback: () => window.LoraComboPresetsPanel?.open?.() || showToast("面板未加载"),
        },
        null,
      );
      return result;
    };
  },
});
