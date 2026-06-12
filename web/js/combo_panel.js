import { app } from "../../../scripts/app.js";
import {deleteCombo, listCombos, setComboFavorite } from "./combo_api.js";
import { extractComboFromNode } from "./combo_apply.js";
import { getCurrentSelectedNode, openComboTargetSelector } from "./combo_targets.js";
import { openComboEditor, openConfirmDialog, showToast } from "./combo_dialogs.js";
import { getPromptSelectorNodes, getBoundSelectorId, setBoundSelectorId } from "./combo_link.js";

const PANEL_ID = "lcp-combo-panel";

const SORT_OPTIONS = [
  { value: "updated_desc", label: "最近更新" },
  { value: "created_desc", label: "最新创建" },
  { value: "created_asc", label: "最早创建" },
  { value: "title_asc", label: "名称 A→Z" },
  { value: "title_desc", label: "名称 Z→A" },
  { value: "favorite", label: "收藏优先" },
];

const SORTERS = {
  updated_desc: (a, b) => (b.updated_at || 0) - (a.updated_at || 0),
  created_desc: (a, b) => (b.created_at || 0) - (a.created_at || 0),
  created_asc: (a, b) => (a.created_at || 0) - (b.created_at || 0),
  title_asc: (a, b) => String(a.title || "").localeCompare(String(b.title || ""), "zh"),
  title_desc: (a, b) => String(b.title || "").localeCompare(String(a.title || ""), "zh"),
  favorite: (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (b.updated_at || 0) - (a.updated_at || 0),
};

const state = {
  search: "",
  sort: "updated_desc",
  favoriteOnly: false,
  items: [],
  loading: false,
};

function ensureStyles() {
  if (document.getElementById("lcp-combo-panel-style")) return;
  const style = document.createElement("style");
  style.id = "lcp-combo-panel-style";
  style.textContent = `
    #${PANEL_ID} { position: fixed; top: 64px; right: 24px; width: 420px; max-height: 78vh; display: flex; flex-direction: column; z-index: 99999; background: #1f1f1f; color: #fff; border: 1px solid #444; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.35); padding: 12px; box-sizing: border-box; user-select: text; }
    #${PANEL_ID} h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }
    #${PANEL_ID} .lcp-count-badge { background: #3a7afe; color: #fff; font-size: 11px; border-radius: 999px; padding: 1px 8px; font-weight: 600; }
    #${PANEL_ID} .lcp-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    #${PANEL_ID} input, #${PANEL_ID} button, #${PANEL_ID} select { font: inherit; }
    #${PANEL_ID} input, #${PANEL_ID} select { width: 100%; border-radius: 6px; border: 1px solid #555; background: #111; color: #fff; padding: 6px 8px; box-sizing: border-box; }
    #${PANEL_ID} select { cursor: pointer; }
    #${PANEL_ID} button { border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer; background: #3a7afe; color: #fff; white-space: nowrap; }
    #${PANEL_ID} button.secondary { background: #555; }
    #${PANEL_ID} button.toggle-on { background: #c79a2a; color: #1a1a1a; }
    #${PANEL_ID} .lcp-scroll { overflow: auto; flex: 1 1 auto; min-height: 60px; }
    #${PANEL_ID} ul { list-style: none; margin: 8px 0 0; padding: 0; }
    #${PANEL_ID} li { border-top: 1px solid #333; padding: 10px 0; }
    #${PANEL_ID} .lcp-item-head { display: flex; align-items: flex-start; gap: 6px; }
    #${PANEL_ID} .lcp-fav-btn { background: transparent; border: 0; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; color: #666; }
    #${PANEL_ID} .lcp-fav-btn.is-fav { color: #ffcf4d; }
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

function getVisibleItems() {
  const q = state.search.trim().toLowerCase();
  let list = state.items.slice();

  if (state.favoriteOnly) {
    list = list.filter((item) => item.favorite);
  }

  if (q) {
    list = list.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.join(",").toLowerCase() : "";
      const artist = String(item.prompt_bundle?.artist_prompt || "").toLowerCase();
      return title.includes(q) || tags.includes(q) || artist.includes(q);
    });
  }

  const sorter = SORTERS[state.sort] || SORTERS.updated_desc;
  list.sort(sorter);
  return list;
}

function renderListItem(item) {
  const artistPreview = item.prompt_bundle?.artist_prompt || "";
  const loraList = item.loras || [];
  const loraCount = loraList.length;
  const loraNames = loraList.slice(0, 3).map((l) => l.name).join(", ");
  const loraMore = loraCount > 3 ? ` +${loraCount - 3}` : "";
  const isFav = Boolean(item.favorite);
  return `
    <li data-combo-id="${item.id}">
      <div class="lcp-item-head">
        <button class="lcp-fav-btn ${isFav ? "is-fav" : ""}" data-action="toggle-fav" data-combo-id="${item.id}" title="${isFav ? "取消收藏" : "收藏"}">${isFav ? "★" : "☆"}</button>
        <div style="flex:1;min-width:0;">
          <div><strong>${escapeHtml(item.title || "未命名组合")}</strong></div>
          <div class="lcp-muted">${escapeHtml((item.tags || []).join(", "))}${(item.tags || []).length ? " | " : ""}LoRA: ${escapeHtml(loraNames)}${loraMore} (${loraCount})</div>
          ${artistPreview ? `<div class="lcp-artist-tag" title="${escapeHtml(artistPreview)}">🎨 ${escapeHtml(artistPreview)}</div>` : ""}
        </div>
      </div>
      <div class="lcp-actions">
        <button data-action="apply-select" data-combo-id="${item.id}">应用</button>
        <button class="secondary" data-action="edit" data-combo-id="${item.id}">编辑</button>
        <button class="secondary" data-action="delete" data-combo-id="${item.id}">删除</button>
      </div>
    </li>
  `;
}

function refreshList() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;

  const visible = getVisibleItems();

  const countBadge = panel.querySelector("[data-role='count-badge']");
  if (countBadge) {
    const total = state.items.length;
    countBadge.textContent = visible.length === total ? `${total}` : `${visible.length}/${total}`;
  }

  const currentNodeEl = panel.querySelector("[data-role='current-node']");
  if (currentNodeEl) {
    const currentNode = getCurrentSelectedNode();
    currentNodeEl.textContent = `当前节点：${currentNode?.title || currentNode?.comfyClass || "未选择"}`;
  }

  const listEl = panel.querySelector("[data-role='list']");
  if (!listEl) return;

  if (state.loading) {
    listEl.innerHTML = `<div class="lcp-empty">加载中…</div>`;
    return;
  }

  listEl.innerHTML = visible.length
    ? `<ul>${visible.map(renderListItem).join("")}</ul>`
    : `<div class="lcp-empty">${state.favoriteOnly ? "暂无收藏组合" : "暂无组合预设"}</div>`;
}

function refreshBinding() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  const selectEl = panel.querySelector("[data-role='bind-select']");
  if (!selectEl) return;

  const nodes = getPromptSelectorNodes();
  if (!nodes.length) {
    selectEl.innerHTML = `<option value="">未检测到提示词选择器节点</option>`;
    selectEl.value = "";
    return;
  }

  const boundId = getBoundSelectorId();
  selectEl.innerHTML = `<option value="">未绑定（应用时复制画师串到剪贴板）</option>`
    + nodes
        .map((node) => `<option value="${node.id}" ${boundId === node.id ? "selected" : ""}>${escapeHtml(node.title || node.comfyClass || "PromptSelector")} (#${node.id})</option>`)
        .join("");
}

async function reload() {
  state.loading = true;
  refreshList();
  try {
    const response = await listCombos();
    state.items = Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    console.warn("LoRA Combo Presets: load combos failed", error);
    state.items = [];
  } finally {
    state.loading = false;
    refreshList();
    refreshBinding();
  }
}

function buildPanel() {
  ensureStyles();
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.addEventListener("mousedown", stopPropagation);
  panel.addEventListener("pointerdown", stopPropagation);

  panel.innerHTML = `
    <div class="lcp-row" style="justify-content:space-between;align-items:center;">
      <h3>LoRA 组合预设 <span class="lcp-count-badge" data-role="count-badge">0</span></h3>
      <button class="secondary" data-role="close">关闭</button>
    </div>
    <div class="lcp-muted" data-role="current-node" style="margin-bottom:8px;">当前节点：未选择</div>
    <div class="lcp-row" style="align-items:center;">
      <span class="lcp-muted" style="white-space:nowrap;">🔗 画师串目标</span>
      <select data-role="bind-select" title="绑定一个提示词选择器节点；应用组合时画师串会自动填入其最终提示词组合末尾"></select>
    </div>
    <div class="lcp-row">
      <input data-role="search" placeholder="搜索标题、标签或画师串" value="${escapeHtml(state.search)}">
    </div>
    <div class="lcp-row">
      <select data-role="sort">
        ${SORT_OPTIONS.map((opt) => `<option value="${opt.value}" ${state.sort === opt.value ? "selected" : ""}>${opt.label}</option>`).join("")}
      </select>
      <button class="secondary ${state.favoriteOnly ? "toggle-on" : ""}" data-role="fav-filter" title="只看收藏">${state.favoriteOnly ? "★ 收藏" : "☆ 收藏"}</button>
    </div>
    <div class="lcp-row">
      <button data-role="new-from-node">从当前节点新建</button>
      <button class="secondary" data-role="new-empty">手动新建</button>
    </div>
    <div class="lcp-scroll" data-role="list"></div>
  `;

  document.body.appendChild(panel);

  // 关闭按钮：独立绑定，始终可用，不受列表刷新影响
  panel.querySelector("[data-role='close']").addEventListener("click", () => {
    panel.remove();
  });

  const searchEl = panel.querySelector("[data-role='search']");
  searchEl.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    refreshList();
  });

  const sortEl = panel.querySelector("[data-role='sort']");
  sortEl.addEventListener("change", (event) => {
    state.sort = event.target.value || "updated_desc";
    refreshList();
  });

  const favFilterEl = panel.querySelector("[data-role='fav-filter']");
  favFilterEl.addEventListener("click", () => {
    state.favoriteOnly = !state.favoriteOnly;
    favFilterEl.classList.toggle("toggle-on", state.favoriteOnly);
    favFilterEl.textContent = state.favoriteOnly ? "★ 收藏" : "☆ 收藏";
    refreshList();
  });

  const bindSelectEl = panel.querySelector("[data-role='bind-select']");
  bindSelectEl.addEventListener("change", (event) => {
    const value = event.target.value;
    setBoundSelectorId(value ? Number(value) : null);
  });
  refreshBinding();

  panel.querySelector("[data-role='new-from-node']").addEventListener("click", () => {
    const node = getCurrentSelectedNode();
    if (!node) {
      showToast("请先选中一个节点");
      return;
    }
    const combo = extractComboFromNode(node);
    openComboEditor({ combo, sourceNode: node, onSaved: async () => reload() });
  });

  panel.querySelector("[data-role='new-empty']").addEventListener("click", () => {
    openComboEditor({ combo: null, sourceNode: null, onSaved: async () => reload() });
  });

  const listEl = panel.querySelector("[data-role='list']");
  listEl.addEventListener("click", async (event) => {
    const action = event.target?.dataset?.action;
    const comboId = event.target?.dataset?.comboId;
    if (!action || !comboId) return;

    const combo = state.items.find((entry) => entry.id === comboId);
    if (!combo) return;

    if (action === "toggle-fav") {
      const nextFavorite = !combo.favorite;
      combo.favorite = nextFavorite; // 乐观更新
      refreshList();
      const result = await setComboFavorite(comboId, nextFavorite);
      if (result?.success && result.item) {
        const idx = state.items.findIndex((entry) => entry.id === comboId);
        if (idx >= 0) state.items[idx] = result.item;
      } else {
        combo.favorite = !nextFavorite; // 回滚
        showToast("收藏更新失败");
      }
      refreshList();
      return;
    }

    if (action === "apply-select") {
      openComboTargetSelector(combo, getCurrentSelectedNode());
      return;
    }

    if (action === "edit") {
      openComboEditor({ combo, sourceNode: getCurrentSelectedNode(), onSaved: async () => reload() });
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
          await reload();
        },
      });
    }
  });

  return panel;
}

async function openPanel() {
  buildPanel();
  await reload();
}

window.LoraComboPresetsPanel = {
  open: () => openPanel(),
};

app.registerExtension({
  name: "LoraComboPresets.Panel",
  async setup() {
    console.log("[LoRA Combo Presets] panel registered");
  },
});
