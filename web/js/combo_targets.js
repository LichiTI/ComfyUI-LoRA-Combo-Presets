import { app } from "../../../scripts/app.js";
import { applyComboToNode, canApplyLoraToNode } from "./combo_apply.js";
import { showToast } from "./combo_dialogs.js";
import { getBoundSelectorNode, applyArtistPromptToSelector } from "./combo_link.js";

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
    #${TARGET_MODAL_ID} .lcp-bound-tag { display: inline-block; background: #243a24; color: #8dc88d; border-radius: 6px; padding: 4px 8px; font-size: 12px; margin-bottom: 10px; }
    #${TARGET_MODAL_ID} .lcp-artist-preview { background: #111; border: 1px solid #444; border-radius: 8px; padding: 8px 10px; color: #8dc; font-size: 12px; margin-bottom: 12px; white-space: pre-wrap; word-break: break-all; max-height: 80px; overflow: auto; }
    #${TARGET_MODAL_ID} .lcp-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    #${TARGET_MODAL_ID} select, #${TARGET_MODAL_ID} button, #${TARGET_MODAL_ID} label { font: inherit; }
    #${TARGET_MODAL_ID} select { width: 100%; border-radius: 8px; border: 1px solid #555; background: #111; color: #fff; padding: 8px; }
    #${TARGET_MODAL_ID} .lcp-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
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

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildNodeLabel(node) {
  return `${node?.title || node?.comfyClass || "未知节点"} (#${node?.id ?? "?"})`;
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

  const boundSelector = getBoundSelectorNode();
  const hasBound = Boolean(boundSelector);

  const loraSelectHtml = `
    <div class="lcp-row">
      <label for="lcp-lora-target">LoRA 目标节点</label>
      <select id="lcp-lora-target">
        ${loraNodes.length === 0 ? `<option value="">未检测到 LoRA 节点</option>` : ""}
        ${loraNodes.map((node) => `<option value="${node.id}" ${defaultLoraNode?.id === node.id ? "selected" : ""}>${escapeHtml(buildNodeLabel(node))}</option>`).join("")}
      </select>
    </div>
  `;

  let bodyHtml = "";
  let actionsHtml = "";

  if (hasBound) {
    // 已绑定提示词选择器：单按钮「应用组合」，自动填充画师串
    bodyHtml = `
      <div class="lcp-help">组合：${escapeHtml(combo?.title || "未命名组合")} | LoRA ${(combo?.loras || []).length} 个</div>
      <div class="lcp-bound-tag">🔗 已绑定提示词选择器：${escapeHtml(buildNodeLabel(boundSelector))}</div>
      ${hasArtist
        ? `<div class="lcp-help">应用时画师串会自动填入该选择器最终提示词组合的末尾</div><div class="lcp-artist-preview">${escapeHtml(artistPrompt)}</div>`
        : `<div class="lcp-help">该组合没有画师串，将仅应用 LoRA</div>`}
      ${loraSelectHtml}
    `;
    actionsHtml = `
      <button class="secondary" data-action="cancel">取消</button>
      <button data-action="apply-combo">应用组合</button>
    `;
  } else {
    bodyHtml = `
      <div class="lcp-help">组合：${escapeHtml(combo?.title || "未命名组合")} | LoRA ${(combo?.loras || []).length} 个</div>
      ${hasArtist ? `
        <div class="lcp-help">画师串会复制到剪贴板，粘贴到提示词节点即可（也可在面板里绑定「提示词选择器」实现自动填充）</div>
        <div class="lcp-artist-preview">${escapeHtml(artistPrompt)}</div>
      ` : ""}
      ${loraSelectHtml}
    `;
    actionsHtml = `
      <button class="secondary" data-action="cancel">取消</button>
      ${hasArtist ? `<button class="secondary" data-action="copy-only">仅复制画师串</button>` : ""}
      ${hasArtist ? `<button class="secondary" data-action="apply-lora-only">仅应用 LoRA</button>` : ""}
      <button data-action="apply">应用 LoRA${hasArtist ? " + 复制画师串" : ""}</button>
    `;
  }

  modal.innerHTML = `
    <div class="lcp-target-card">
      <h3>应用组合预设</h3>
      ${bodyHtml}
      <div class="lcp-actions">
        ${actionsHtml}
      </div>
    </div>
  `;

  const getSelectedLoraTarget = () => {
    const loraTargetId = Number(modal.querySelector("#lcp-lora-target")?.value || 0);
    return loraNodes.find((node) => node.id === loraTargetId) || null;
  };

  modal.addEventListener("click", async (event) => {
    const action = event.target?.dataset?.action;

    if (event.target === modal || action === "cancel") {
      closeModal();
      return;
    }

    if (action === "copy-only") {
      const ok = await copyToClipboard(artistPrompt);
      showToast(ok ? "画师串已复制到剪贴板" : "复制失败，请手动复制");
      closeModal();
      return;
    }

    if (action === "apply-lora-only") {
      const loraTarget = getSelectedLoraTarget();
      if (loraTarget) {
        applyComboToNode(loraTarget, combo, { applyLora: true });
        showToast("LoRA 已应用");
      } else {
        showToast("未选择目标节点");
      }
      closeModal();
      return;
    }

    if (action === "apply") {
      const loraTarget = getSelectedLoraTarget();
      if (loraTarget) {
        applyComboToNode(loraTarget, combo, { applyLora: true });
        if (hasArtist) {
          const ok = await copyToClipboard(artistPrompt);
          showToast(ok ? "LoRA 已应用，画师串已复制到剪贴板" : "LoRA 已应用，但画师串复制失败");
        } else {
          showToast("LoRA 已应用");
        }
      } else if (hasArtist) {
        const ok = await copyToClipboard(artistPrompt);
        showToast(ok ? "画师串已复制到剪贴板" : "复制失败");
      } else {
        showToast("未选择目标节点");
      }
      closeModal();
      return;
    }

    if (action === "apply-combo") {
      // 已绑定提示词选择器：应用 LoRA + 自动填充画师串
      const loraTarget = getSelectedLoraTarget();
      let loraApplied = false;
      if (loraTarget) {
        applyComboToNode(loraTarget, combo, { applyLora: true });
        loraApplied = true;
      }

      let artistApplied = false;
      const selector = getBoundSelectorNode();
      if (selector && hasArtist) {
        artistApplied = applyArtistPromptToSelector(selector, artistPrompt);
      }

      if (loraApplied && artistApplied) {
        showToast("组合已应用：LoRA + 画师串已填入提示词选择器");
      } else if (loraApplied) {
        showToast(hasArtist ? "LoRA 已应用，但画师串填充失败" : "LoRA 已应用");
      } else if (artistApplied) {
        showToast("画师串已填入提示词选择器");
      } else {
        showToast("未选择目标节点");
      }
      closeModal();
      return;
    }
  });

  document.body.appendChild(modal);
}
