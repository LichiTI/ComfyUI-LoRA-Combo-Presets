import { app } from "../../../scripts/app.js";

// 与 ComfyUI-Danbooru-Gallery 的「提示词选择器」节点联动
// 节点 class 名见 ComfyUI-Danbooru-Gallery/py/prompt_selector/__init__.py
export const PROMPT_SELECTOR_CLASS = "PromptSelector";

const STORAGE_KEY = "lcp_bound_prompt_selector_node_id";

function getAllGraphNodes() {
  return Array.isArray(app?.graph?._nodes) ? app.graph._nodes.filter(Boolean) : [];
}

// 列出当前工作流中所有「提示词选择器」节点
export function getPromptSelectorNodes() {
  return getAllGraphNodes().filter(
    (node) => node?.comfyClass === PROMPT_SELECTOR_CLASS || node?.type === PROMPT_SELECTOR_CLASS
  );
}

export function isPromptSelectorPresent() {
  return getPromptSelectorNodes().length > 0;
}

// 读取已绑定的提示词选择器节点 id（localStorage 持久化）
export function getBoundSelectorId() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === null || value === "") return null;
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  } catch (error) {
    console.warn("LoRA Combo Presets: read bound selector failed", error);
    return null;
  }
}

export function setBoundSelectorId(id) {
  try {
    if (id === null || id === undefined || id === "") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  } catch (error) {
    console.warn("LoRA Combo Presets: save bound selector failed", error);
  }
}

// 获取绑定的节点对象；若工作流中已不存在则返回 null
export function getBoundSelectorNode() {
  const id = getBoundSelectorId();
  if (id === null) return null;
  return getPromptSelectorNodes().find((node) => node.id === id) || null;
}

// 把画师串注入到提示词选择器节点的最终提示词组合末尾
// 优先使用节点暴露的 setExternalArtistPrompt 接口（持久化、不被覆盖），
// 否则回退到直接写隐藏 widget。
export function applyArtistPromptToSelector(node, artistPrompt) {
  if (!node) return false;
  const text = artistPrompt == null ? "" : String(artistPrompt);

  if (typeof node.setExternalArtistPrompt === "function") {
    try {
      node.setExternalArtistPrompt(text);
      return true;
    } catch (error) {
      console.warn("LoRA Combo Presets:setExternalArtistPrompt failed", error);
    }
  }

  // 回退：直接写入隐藏的 selected_prompts widget（可能被节点后续操作覆盖）
  const widget = Array.isArray(node.widgets)
    ? node.widgets.find((w) => w?.name === "selected_prompts")
    : null;
  if (widget) {
    widget.value = text;
    if (typeof node.setDirtyCanvas === "function") {
      node.setDirtyCanvas(true, true);
    }
    return true;
  }

  return false;
}
