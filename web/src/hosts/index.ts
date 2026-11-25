import { registerApiReference } from "../data/apiReference";
import { registerLanguageSnippets } from "../data/hostSnippets";
import { registerPlaygroundSlots } from "../slots";
import type { HostLanguageModule } from "./types";

interface GlobModule {
  default?: HostLanguageModule;
}

const discovered = import.meta.glob<GlobModule>("./languages/*.ts", { eager: true });

export const HOST_LANGUAGE_MODULES: ReadonlyArray<HostLanguageModule> = Object.entries(discovered)
  .filter(([filePath]) => !filePath.endsWith("/_template.ts"))
  .map(([, mod]) => mod.default)
  .filter((mod): mod is HostLanguageModule => Boolean(mod && mod.id));

let initialized = false;

/**
 * 注册所有在 `web/src/hosts/languages/*.ts` 声明的宿主语言模块。
 * 在应用入口调用一次即可，重复调用幂等。
 */
export function initHostLanguageModules(): ReadonlyArray<HostLanguageModule> {
  if (initialized) return HOST_LANGUAGE_MODULES;
  initialized = true;

  for (const mod of HOST_LANGUAGE_MODULES) {
    if (mod.snippets) {
      for (const [kind, code] of Object.entries(mod.snippets)) {
        if (code) {
          registerLanguageSnippets(kind, { [mod.language]: code });
        }
      }
    }
    if (mod.apiReference) {
      registerApiReference(mod.language, mod.apiReference);
    }
    if (mod.slots) {
      registerPlaygroundSlots(mod.slots);
    }
  }
  return HOST_LANGUAGE_MODULES;
}
