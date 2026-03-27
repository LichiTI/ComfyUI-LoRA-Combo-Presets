import { app } from "../../../scripts/app.js";
import { applyComboToNode, canApplyLoraToNode } from "./combo_apply.js";
import { showToast } from "./combo_dialogs.js";

const TARGET_MODAL_ID = "lcp-target-modal";

function ensureTargetStyles() {
  if (document.getElementById("lcp-target-style")) return;
  const style = document.createElement("style");
  style.id = "lcp-target-style";
  style.textContent = `
    #${TARGET_MODAL_ID} { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; }
    #${TARGET_MODAL_ID} .lcp-target-card { width: 480px; max-width: calc(100vw - 32px); background: #1f1f1f; color: #fff; border: 1px solid #444; border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,.4); padding: 16px; }
    #${TARGET_MODAL_ID} h3 { margin: 0 0 10px; font-size: 18px; }
    #${TARGET_MODAL_ID} .lcp-help { color: #aaa; font-size: 12px; margin-bottom: 10px; }
    #${TARGET_MODAL_ID} .lcp-artist-preview { background: #111; border: 1px solid #444; border-radius: 8px; padding: 8px 10px; color: #8dc; font-size: 12px; margin-bottom: 12px; white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow: auto; }
    #${TARGET_MODAL_ID} .lcp-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    #${TARGET_MODAL_ID} select, #${TARGET_MODAL_ID} button, #${TARGET_MODAL_ID} label { font: inherit; }
    #${TARGET_MODAL_ID} select { width: 100%; border-radius: 8px; border: 1px solid #555; background: #111; color: #fff; padding: 8px; }
    #${TARGET_MODAL_ID} .lcp-actions { display: flex; justify-content: flex-end; gap: 8px; }
    #${TARGET_MODAL_ID} button { border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; background: #3a7afe; color: #fff; }
    #${TARGET_MODAL_ID} button.secondary { background: #555; }
  `;
  document.head.appendChild(style);
}

export function getAllGraphNodes() {
  return Array.isArray(app?.graph?._nodes) ? app.graph._nodes.filter(Boolean) : [];
}

export function getCurrentSelectedNode() {
  const selected = app?.canvas?.selected_nodes;
  if (selected) {
    const first = Object.values(selected)[0];
    if (first) return first;
  }
  return getAllGraphNodes().find((node) => node.is_selected) || null;
}

function buildNodeLabel(node) {
  return `${node?.title || node?.comfyClass || "\u672a\u77e5\u8282\u70b9"} (#${node?.id ?? "?"})`;
}

export function getLoraTargetCandidates() {
  return getAllGraphNodes().filter((node) => canApplyLoraToNode(node));
}

function closeModal() {
  document.getElementById(TARGET_MODAL_ID)?.remove();
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-99999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    console.warn("LoRA Combo Presets: clipboard copy failed", err);
    return false;
  }
}

export function openComboTargetSelector(combo, preferredNode = null) {
  ensureTargetStyles();
  closeModal();

  const loraNodes = getLoraTargetCandidates();
  const modal = document.createElement("div");
  modal.id = TARGET_MODAL_ID;

  const defaultLoraNode = preferredNode && canApplyLoraToNode(preferredNode)
    ? preferredNode
    : loraNodes[0] || null;

  const artistPrompt = combo?.prompt_bundle?.artist_prompt || "";
  const hasArtist = Boolean(artistPrompt.trim());

  modal.innerHTML = `
    <div class="lcp-target-card">
      <h3>\u5e94\u7528\u7ec4\u5408\u9884\u8bbe</h3>
      <div class="lcp-help">\u7ec4\u5408\uff1a${combo?.title || "\u672a\u547d\u540d\u7ec4\u5408"} | LoRA ${(combo?.loras || []).length} \u4e2a</div>
      ${hasArtist ? `
        <div class="lcp-help">\u753b\u5e08\u4e32\u5c06\u81ea\u52a8\u590d\u5236\u5230\u526a\u8d34\u677f\uff0c\u7c98\u8d34\u5230\u4f60\u9700\u8981\u7684\u63d0\u793a\u8bcd\u8282\u70b9\u5373\u53ef</div>
        <div class="lcp-artist-preview">${artistPrompt}</div>
      ` : ""}
      <div class="lcp-row">
        <label for="lcp-lora-target">LoRA \u76ee\u6807\u8282\u70b9</label>
        <select id="lcp-lora-target">
          ${loraNodes.length === 0 ? `<option value="">\u672a\u68c0\u6d4b\u5230 LoRA \u8282\u70b9</option>` : ""}
          ${loraNodes.map((node) => `<option value="${node.id}" ${defaultLoraNode?.id === node.id ? "selected" : ""}>${buildNodeLabel(node)}</option>`).join("")}
        </select>
      </div>
      <div class="lcp-actions">
        <button class="secondary" data-action="cancel">\u53d6\u6d88</button>
        ${hasArtist ? `<button class="secondary" data-action="copy-only">\u4ec5\u590d\u5236\u753b\u5e08\u4e32</button>` : ""}
        <button data-action="apply">\u5e94\u7528 LoRA${hasArtist ? " + \u590d\u5236\u753b\u5e08\u4e32" : ""}</button>
      </div>
    </div>
  `;

  modal.addEventListener("click", async (event) => {
    if (event.target === modal || event.target?.dataset?.action === "cancel") {
      closeModal();
      return;
    }

    if (event.target?.dataset?.action === "copy-only") {
      const ok = await copyToClipboard(artistPrompt);
      showToast(ok ? "\u753b\u5e08\u4e32\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f" : "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236");
      closeModal();
      return;
    }

    if (event.target?.dataset?.action === "apply") {
      const loraTargetId = Number(modal.querySelector("#lcp-lora-target")?.value || 0);
      const loraTarget = loraNodes.find((node) => node.id === loraTargetId) || null;

      if (loraTarget) {
        applyComboToNode(loraTarget, combo, { applyLora: true });
        if (hasArtist) {
          const ok = await copyToClipboard(artistPrompt);
          showToast(ok ? "LoRA \u5df2\u5e94\u7528\uff0c\u753b\u5e08\u4e32\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f" : "LoRA \u5df2\u5e94\u7528\uff0c\u4f46\u753b\u5e08\u4e32\u590d\u5236\u5931\u8d25");
        } else {
          showToast("LoRA \u5df2\u5e94\u7528");
        }
      } else {
        if (hasArtist) {
          const ok = await copyToClipboard(artistPrompt);
          showToast(ok ? "\u753b\u5e08\u4e32\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f" : "\u590d\u5236\u5931\u8d25");
        } else {
          showToast("\u672a\u9009\u62e9\u76ee\u6807\u8282\u70b9");
        }
      }
      closeModal();
    }
  });

  document.body.appendChild(modal);
}
