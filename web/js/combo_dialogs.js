import { createCombo, listCombos, updateCombo } from "./combo_api.js";

const BASE_STYLE_ID = "lcp-dialog-style";
const TOAST_ID = "lcp-toast";
const DIALOG_ID = "lcp-dialog-root";

function ensureDialogStyles() {
  if (document.getElementById(BASE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BASE_STYLE_ID;
  style.textContent = `
    #${TOAST_ID} { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: rgba(25,25,25,.96); color: #fff; border: 1px solid #4d4d4d; border-radius: 10px; padding: 10px 14px; z-index: 100002; box-shadow: 0 12px 32px rgba(0,0,0,.35); font-size: 13px; pointer-events: none; }
    #${DIALOG_ID} { position: fixed; inset: 0; z-index: 100001; background: rgba(0,0,0,.52); display: flex; align-items: center; justify-content: center; }
    #${DIALOG_ID} .lcp-dialog { width: 520px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow: auto; background: #1f1f1f; color: #fff; border: 1px solid #444; border-radius: 14px; box-shadow: 0 16px 48px rgba(0,0,0,.45); padding: 16px; }
    #${DIALOG_ID} .lcp-dialog h3 { margin: 0; font-size: 18px; }
    #${DIALOG_ID} .lcp-dialog-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
    #${DIALOG_ID} .lcp-help { color: #aaa; font-size: 12px; margin-bottom: 12px; }
    #${DIALOG_ID} .lcp-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    #${DIALOG_ID} .lcp-field label { color: #ddd; font-size: 13px; }
    #${DIALOG_ID} input, #${DIALOG_ID} textarea, #${DIALOG_ID} select, #${DIALOG_ID} button { font: inherit; }
    #${DIALOG_ID} input, #${DIALOG_ID} textarea, #${DIALOG_ID} select { width: 100%; background: #111; color: #fff; border: 1px solid #555; border-radius: 8px; padding: 8px 10px; box-sizing: border-box; }
    #${DIALOG_ID} textarea { min-height: 88px; resize: vertical; }
    #${DIALOG_ID} .lcp-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    #${DIALOG_ID} button { border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; background: #3a7afe; color: #fff; }
    #${DIALOG_ID} button.secondary { background: #5a5a5a; }
    #${DIALOG_ID} button.danger { background: #c54848; }
    #${DIALOG_ID} .lcp-list { display: flex; flex-direction: column; gap: 8px; }
    #${DIALOG_ID} .lcp-item { border: 1px solid #3a3a3a; border-radius: 10px; padding: 10px; background: #171717; }
    #${DIALOG_ID} .lcp-item-title { font-weight: 700; }
    #${DIALOG_ID} .lcp-item-subtitle { color: #aaa; font-size: 12px; margin-top: 4px; }
    #${DIALOG_ID} .lcp-item-artist { color: #8dc; font-size: 11px; margin-top: 4px; }
    #${DIALOG_ID} .lcp-item-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    #${DIALOG_ID} .lcp-empty { color: #aaa; text-align: center; padding: 20px 0; }
    #${DIALOG_ID} .lcp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 640px) { #${DIALOG_ID} .lcp-grid-2 { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

export function showToast(message, timeout = 2200) {
  ensureDialogStyles();
  document.getElementById(TOAST_ID)?.remove();
  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), timeout);
}

function closeDialog() {
  document.getElementById(DIALOG_ID)?.remove();
}

function openDialog(content, onReady) {
  ensureDialogStyles();
  closeDialog();
  const overlay = document.createElement("div");
  overlay.id = DIALOG_ID;
  overlay.innerHTML = `<div class="lcp-dialog">${content}</div>`;
  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) {
      closeDialog();
    }
  });
  overlay.addEventListener("click", (event) => {
    if (event.target?.dataset?.action === "close") {
      closeDialog();
    }
  });
  document.body.appendChild(overlay);
  onReady?.(overlay);
  return overlay;
}

export function openConfirmDialog({ title = "确认", message = "确定执行该操作吗？", confirmText = "确定", confirmClass = "danger", onConfirm }) {
  return openDialog(`
    <div class="lcp-dialog-header">
      <h3>${title}</h3>
      <button class="secondary" data-action="close">关闭</button>
    </div>
    <div class="lcp-help">${message}</div>
    <div class="lcp-dialog-actions">
      <button class="secondary" data-action="close">取消</button>
      <button class="${confirmClass}" id="lcp-confirm-ok">${confirmText}</button>
    </div>
  `, (overlay) => {
    overlay.querySelector("#lcp-confirm-ok")?.addEventListener("click", async () => {
      await onConfirm?.();
      closeDialog();
    });
  });
}

function escapeAttr(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function openComboEditor({ combo = null, sourceNode = null, onSaved = null }) {
  const isEdit = Boolean(combo?.id);
  const initialTitle = combo?.title || sourceNode?.title || sourceNode?.comfyClass || "未命名组合";
  const initialTags = Array.isArray(combo?.tags) ? combo.tags.join(", ") : "";
  const initialArtist = combo?.prompt_bundle?.artist_prompt || "";
  const initialDescription = combo?.description || "";
  const loraPreview = Array.isArray(combo?.loras)
    ? combo.loras.map((item) => `${item.name} (${item.strength}${Math.abs((item.clip_strength ?? item.strength) - item.strength) > 0.0001 ? ` / ${item.clip_strength}` : ""})`).join("\n")
    : "";

  return openDialog(`
    <div class="lcp-dialog-header">
      <h3>${isEdit ? "编辑组合预设" : "保存组合预设"}</h3>
      <button class="secondary" data-action="close">关闭</button>
    </div>
    <div class="lcp-help">来源：${escapeAttr(sourceNode?.title || sourceNode?.comfyClass || combo?.source?.node_class || "手动")}</div>
    <div class="lcp-grid-2">
      <div class="lcp-field">
        <label for="lcp-editor-title">标题</label>
        <input id="lcp-editor-title" value="${escapeAttr(initialTitle)}">
      </div>
      <div class="lcp-field">
        <label for="lcp-editor-tags">标签（逗号分隔）</label>
        <input id="lcp-editor-tags" value="${escapeAttr(initialTags)}" placeholder="artist, portrait">
      </div>
    </div>
    <div class="lcp-field">
      <label for="lcp-editor-description">描述</label>
      <input id="lcp-editor-description" placeholder="适合什么风格或用途" value="${escapeAttr(initialDescription)}">
    </div>
    <div class="lcp-field">
      <label for="lcp-editor-artist">画师串 / Artist Prompt（加载组合时自动复制到剪贴板）</label>
      <textarea id="lcp-editor-artist" placeholder="artist_a, painterly, textured brush strokes">${initialArtist}</textarea>
    </div>
    ${loraPreview ? `
    <div class="lcp-field">
      <label>LoRA 预览（只读）</label>
      <textarea readonly style="min-height:56px;opacity:.7;">${loraPreview}</textarea>
    </div>
    ` : ""}
    <div class="lcp-dialog-actions">
      <button class="secondary" data-action="close">取消</button>
      <button id="lcp-editor-save">${isEdit ? "保存修改" : "保存组合"}</button>
    </div>
  `, (overlay) => {
    overlay.querySelector("#lcp-editor-save")?.addEventListener("click", async () => {
      const payload = {
        ...(combo || {}),
        title: overlay.querySelector("#lcp-editor-title")?.value?.trim() || initialTitle,
        description: overlay.querySelector("#lcp-editor-description")?.value?.trim() || "",
        tags: (overlay.querySelector("#lcp-editor-tags")?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
        loras: combo?.loras || [],
        prompt_bundle: {
          artist_prompt: overlay.querySelector("#lcp-editor-artist")?.value || "",
        },
      };

      const result = isEdit && combo?.id
        ? await updateCombo(combo.id, payload)
        : await createCombo(payload);

      if (result?.success) {
        showToast(isEdit ? "组合已更新" : "组合已保存");
        closeDialog();
        await onSaved?.(result.item);
      } else {
        showToast(result?.error || "保存失败", 2600);
      }
    });
  });
}

export function openComboPicker({ title = "选择组合预设", onSelect = null }) {
  return listCombos().then((response) => {
    const items = Array.isArray(response?.items) ? response.items : [];
    return openDialog(`
      <div class="lcp-dialog-header">
        <h3>${title}</h3>
        <button class="secondary" data-action="close">关闭</button>
      </div>
      <div class="lcp-field">
        <input id="lcp-picker-search" placeholder="搜索标题、标签或画师串">
      </div>
      <div class="lcp-list" id="lcp-picker-list"></div>
    `, (overlay) => {
      const listEl = overlay.querySelector("#lcp-picker-list");
      const searchEl = overlay.querySelector("#lcp-picker-search");

      const renderItems = (keyword = "") => {
        const q = keyword.trim().toLowerCase();
        const filtered = !q
          ? items
          : items.filter((item) => {
              const t = String(item.title || "").toLowerCase();
              const g = Array.isArray(item.tags) ? item.tags.join(",").toLowerCase() : "";
              const a = String(item.prompt_bundle?.artist_prompt || "").toLowerCase();
              return t.includes(q) || g.includes(q) || a.includes(q);
            });

        listEl.innerHTML = filtered.length
          ? filtered.map((item) => {
              const artist = item.prompt_bundle?.artist_prompt || "";
              return `
              <div class="lcp-item" data-combo-id="${item.id}">
                <div class="lcp-item-title">${escapeAttr(item.title || "未命名组合")}</div>
                <div class="lcp-item-subtitle">${escapeAttr((item.tags || []).join(", "))} | LoRA ${(item.loras || []).length} 个</div>
                ${artist ? `<div class="lcp-item-artist">🎨 ${escapeAttr(artist)}</div>` : ""}
                <div class="lcp-item-actions">
                  <button data-action="pick" data-combo-id="${item.id}">选择</button>
                </div>
              </div>`;
            }).join("")
          : `<div class="lcp-empty">没有找到匹配的组合</div>`;
      };

      renderItems();
      searchEl?.addEventListener("input", () => renderItems(searchEl.value || ""));
      listEl?.addEventListener("click", (event) => {
        const comboId = event.target?.dataset?.comboId;
        if (event.target?.dataset?.action === "pick") {
          const combo = items.find((item) => item.id === comboId);
          if (combo) {
            onSelect?.(combo);
            closeDialog();
          }
        }
      });
    });
  });
}
