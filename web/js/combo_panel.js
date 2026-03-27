import { app } from "../../../scripts/app.js";
import { deleteCombo, listCombos } from "./combo_api.js";
import { extractComboFromNode } from "./combo_apply.js";
import { getCurrentSelectedNode, openComboTargetSelector } from "./combo_targets.js";
import { openComboEditor, openComboPicker, openConfirmDialog, showToast } from "./combo_dialogs.js";

const PANEL_ID = "lcp-combo-panel";

function ensureStyles() {
  if (document.getElementById("lcp-combo-panel-style")) return;
  const style = document.createElement("style");
  style.id = "lcp-combo-panel-style";
  style.textContent = `
    #${PANEL_ID} { position: fixed; top: 64px; right: 24px; width: 400px; max-height: 76vh; overflow: auto; z-index: 99999; background: #1f1f1f; color: #fff; border: 1px solid #444; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 12px; user-select: text; }
    #${PANEL_ID} h3 { margin: 0; font-size: 16px; }
    #${PANEL_ID} .lcp-row { display: flex; gap: 8px; margin-bottom: 8px; }
    #${PANEL_ID} input, #${PANEL_ID} button { font: inherit; }
    #${PANEL_ID} input { width: 100%; border-radius: 6px; border: 1px solid #555; background: #111; color: #fff; padding: 6px 8px; box-sizing: border-box; }
    #${PANEL_ID} button { border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer; background: #3a7afe; color: #fff; white-space: nowrap; }
    #${PANEL_ID} button.secondary { background: #555; }
    #${PANEL_ID} ul { list-style: none; margin: 8px 0 0; padding: 0; }
    #${PANEL_ID} li { border-top: 1px solid #333; padding: 10px 0; }
    #${PANEL_ID} .lcp-actions { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
    #${PANEL_ID} .lcp-muted { color: #aaa; font-size: 12px; }
    #${PANEL_ID} .lcp-artist-tag { display: inline-block; background: #2a3a2a; color: #8dc; border-radius: 4px; padding: 2px 6px; font-size: 11px; margin-top: 4px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #${PANEL_ID} .lcp-empty { color: #aaa; text-align: center; padding: 18px 0; }
  `;
  document.head.appendChild(style);
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stopPropagation(event) {
  event.stopPropagation();
}

async function renderPanel(search = "") {
  ensureStyles();
  let panel = document.getElementById(PANEL_ID);
  const isNew = !panel;
  if (isNew) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.addEventListener("mousedown", stopPropagation);
    panel.addEventListener("pointerdown", stopPropagation);
    document.body.appendChild(panel);
  }

  const currentNode = getCurrentSelectedNode();
  const response = await listCombos();
  const items = Array.isArray(response?.items) ? response.items : [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = !normalizedSearch
    ? items
    : items.filter((item) => {
        const title = String(item.title || "").toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(",").toLowerCase() : "";
        const artist = String(item.prompt_bundle?.artist_prompt || "").toLowerCase();
        return title.includes(normalizedSearch) || tags.includes(normalizedSearch) || artist.includes(normalizedSearch);
      });

  panel.innerHTML = `
    <div class="lcp-row" style="justify-content:space-between;align-items:center;">
      <h3>LoRA 组合预设</h3>
      <button class="secondary" data-action="close">关闭</button>
    </div>
    <div class="lcp-muted">当前节点：${escapeHtml(currentNode?.title || currentNode?.comfyClass || "未选择")}</div>
    <div class="lcp-row">
      <input id="lcp-search" placeholder="搜索标题、标签或画师串" value="${escapeHtml(search)}">
    </div>
    <div class="lcp-row">
      <button data-action="new-from-node">从当前节点新建</button>
      <button class="secondary" data-action="new-empty">手动新建</button>
    </div>
    <ul>
      ${filteredItems.length ? filteredItems.map((item) => {
        const artistPreview = item.prompt_bundle?.artist_prompt || "";
        const loraCount = (item.loras || []).length;
        const loraNames = (item.loras || []).slice(0, 3).map((l) => l.name).join(", ");
        const loraMore = loraCount > 3 ? ` +${loraCount - 3}` : "";
        return `
          <li data-combo-id="${item.id}">
            <div><strong>${escapeHtml(item.title || "未命名组合")}</strong></div>
            <div class="lcp-muted">${escapeHtml((item.tags || []).join(", "))} | LoRA: ${escapeHtml(loraNames)}${loraMore}</div>
            ${artistPreview ? `<div class="lcp-artist-tag" title="${escapeHtml(artistPreview)}">🎨 ${escapeHtml(artistPreview)}</div>` : ""}
            <div class="lcp-actions">
              <button data-action="apply-select" data-combo-id="${item.id}">应用</button>
              <button class="secondary" data-action="edit" data-combo-id="${item.id}">编辑</button>
              <button class="secondary" data-action="delete" data-combo-id="${item.id}">删除</button>
            </div>
          </li>
        `;
      }).join("") : `<div class="lcp-empty">暂无组合预设</div>`}
    </ul>
  `;

  panel.querySelector("#lcp-search")?.addEventListener("input", (event) => {
    renderPanel(event.target.value || "");
  });

  panel.onclick = async (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;

    if (action === "close") {
      panel.remove();
      return;
    }

    if (action === "new-from-node") {
      const node = getCurrentSelectedNode();
      if (!node) {
        showToast("请先选中一个节点");
        return;
      }
      const combo = extractComboFromNode(node);
      openComboEditor({ combo, sourceNode: node, onSaved: async () => renderPanel(search) });
      return;
    }

    if (action === "new-empty") {
      openComboEditor({ combo: null, sourceNode: null, onSaved: async () => renderPanel(search) });
      return;
    }

    const comboId = event.target?.dataset?.comboId;
    const combo = items.find((entry) => entry.id === comboId);
    if (!combo) return;

    if (action === "apply-select") {
      openComboTargetSelector(combo, getCurrentSelectedNode());
      return;
    }

    if (action === "edit") {
      openComboEditor({ combo, sourceNode: currentNode, onSaved: async () => renderPanel(search) });
      return;
    }

    if (action === "delete") {
      openConfirmDialog({
        title: "删除组合预设",
        message: `确定删除「${escapeHtml(combo.title || "未命名组合")}」吗？`,
        confirmText: "删除",
        onConfirm: async () => {
          await deleteCombo(comboId);
          showToast("组合已删除");
          await renderPanel(search);
        },
      });
    }
  };
}

window.LoraComboPresetsPanel = {
  open: () => renderPanel(""),
};

app.registerExtension({
  name: "LoraComboPresets.Panel",
  async setup() {
    console.log("[LoRA Combo Presets] panel registered");
  },
});
