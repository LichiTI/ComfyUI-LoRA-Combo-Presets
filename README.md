# ComfyUI-LoRA-Combo-Presets

一个独立的 ComfyUI LoRA 组合预设插件。

## 核心理念

- **LoRA 组合**：保存到节点、从节点读取
- **画师串 / artist prompt**：加载组合时自动复制到剪贴板，用户粘贴到任意提示词节点即可

这样做的好处：
- 不需要猜测用户要把画师串写到哪个节点
- 兼容任意提示词节点，不限于已知插件
- 用户操作最简单：加载 → 自动复制 → 粘贴

## 当前已提供

- 独立 Combo JSON 存储
- 后端 CRUD API
- LoRA 语法解析/格式化工具
- 节点右键菜单入口
- 组合面板（搜索、编辑、删除、应用）
- 正式组合编辑弹窗
- 组合选择弹窗
- 删除确认弹窗
- 轻量 toast 提示
- 目标节点选择器（仅选 LoRA 目标节点）
- 画师串自动复制到剪贴板
- 对 LoRA Manager / 文本语法型节点的基础兼容骨架
- 已补充对 **rgthree / Mira / Efficiency / Comfyroll / Easy-Use / JPS / Yaser** 常见 LoRA 节点的第一版适配
- 已完成前端 **adapter registry** 拆分，便于继续扩展更多插件生态
- 已增加 **single loader 通用适配器**，用于兼容更多带 `lora_name + strength_model` 风格字段的单 LoRA Loader

## 使用流程

### 保存组合
1. 右键 LoRA 节点 → 保存当前节点为组合
2. 在弹窗中编辑标题、标签、画师串、正负面模板
3. 保存

### 加载组合
1. 右键 LoRA 节点 → 选择目标后加载
2. 选择一个组合
3. 选择 LoRA 目标节点
4. 点击“应用”：
   - LoRA 写入目标节点
   - 画师串自动复制到剪贴板
5. 到你的提示词节点 Ctrl+V 粘贴画师串

## 当前前端适配结构

- `web/js/adapters/base.js`
- `web/js/adapters/lora_manager.js`
- `web/js/adapters/rgthree.js`
- `web/js/adapters/mira.js`
- `web/js/adapters/efficiency.js`
- `web/js/adapters/comfyroll.js`
- `web/js/adapters/easy_use.js`
- `web/js/adapters/jps.js`
- `web/js/adapters/stack_loader.js`
- `web/js/adapters/single_loader.js`
- `web/js/adapters/text_syntax.js`
- `web/js/adapters/prompt.js`
- `web/js/adapters/index.js`

## 当前 UI 结构

- `web/js/combo_dialogs.js`：编辑、选择、确认、toast
- `web/js/combo_panel.js`：组合面板、搜索、编辑/删除/应用入口
- `web/js/combo_targets.js`：LoRA 目标节点选择器 + 剪贴板复制
- `web/js/combo_context_menu.js`：节点右键菜单入口

## 当前适配范围

### 已有基础适配
- `Lora Loader (LoraManager)`
- `Lora Stacker (LoraManager)`
- 普通 `<lora:...>` 文本类节点

### 已补充专用适配
- `Power Lora Loader (rgthree)`
- `Lora Loader Stack (rgthree)`
- `LoRA Loader With Name Stacker` (Mira)
- `LoRA Loader from Text` (Mira)
- `TSC LoRA Stacker` (Efficiency Nodes)
- `CR LoRA Stack` (Comfyroll)
- `CR Load LoRA` (Comfyroll)
- `easy loraStack` (Easy-Use)
- `easy loraSwitcher` (Easy-Use)
- `Lora Loader (JPS)`
- `Lora Loader Stack` (Yaser Nodes)

### 通用单 LoRA Loader 兼容
对具备以下字段组合的节点提供通用兼容：
- `lora_name`
- `strength_model` 或 `lora_model_strength`
- 可选 `strength_clip` 或 `lora_clip_strength`
- 可选 `switch` / `toggle`

## API

- `GET /lora-combo-presets/api/combos`
- `GET /lora-combo-presets/api/combos/{id}`
- `POST /lora-combo-presets/api/combos`
- `PUT /lora-combo-presets/api/combos/{id}`
- `DELETE /lora-combo-presets/api/combos/{id}`
- `GET /lora-combo-presets/api/combos/{id}/apply`

## 下一步建议

1. 增加导入导出与收藏筛选
2. 增加 LoRA 列表可视化编辑（排序、开关、单条删除）
3. 增加更多第三方 LoRA adapter
4. 增加 adapter 优先级与更细致的节点匹配策略
