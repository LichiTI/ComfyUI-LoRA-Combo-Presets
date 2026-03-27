import { LoraManagerAdapter } from "./lora_manager.js";
import { RgthreeAdapter } from "./rgthree.js";
import { MiraAdapter } from "./mira.js";
import { EfficiencyAdapter } from "./efficiency.js";
import { ComfyrollAdapter } from "./comfyroll.js";
import { EasyUseAdapter } from "./easy_use.js";
import { JpsAdapter } from "./jps.js";
import { StackLoaderAdapter } from "./stack_loader.js";
import { SingleLoaderAdapter } from "./single_loader.js";
import { TextSyntaxAdapter } from "./text_syntax.js";
import { PromptAdapter } from "./prompt.js";

export function createAdapters(helpers) {
  return [
    new LoraManagerAdapter(helpers),
    new RgthreeAdapter(helpers),
    new MiraAdapter(helpers),
    new EfficiencyAdapter(helpers),
    new ComfyrollAdapter(helpers),
    new EasyUseAdapter(helpers),
    new JpsAdapter(helpers),
    new StackLoaderAdapter(helpers),
    new SingleLoaderAdapter(helpers),
    new TextSyntaxAdapter(helpers),
    new PromptAdapter(helpers),
  ];
}
