import { resolvedLanguage } from "$lib/i18n/index.svelte";

type JsonModule = unknown;

const rootConfigModules = import.meta.glob("./*.json", {
  eager: true,
  import: "default",
}) as Record<string, JsonModule>;

const localizedConfigModules = import.meta.glob("./*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, JsonModule>;

function buildLanguageCandidates(language: string): string[] {
  const normalized = language.trim() || "zh-CN";
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  push(normalized);
  const baseLanguage = normalized.split("-")[0];
  if (baseLanguage && baseLanguage !== normalized) {
    push(baseLanguage);
  }
  push("zh-CN");

  return candidates;
}

export function getLocalizedConfigJson<T>(
  fileName: string,
  language: string = resolvedLanguage(),
): T {
  for (const candidate of buildLanguageCandidates(language)) {
    if (candidate === "zh-CN") {
      const rootModule = rootConfigModules[`./${fileName}`];
      if (rootModule !== undefined) {
        return rootModule as T;
      }
      continue;
    }

    const localizedModule = localizedConfigModules[`./${candidate}/${fileName}`];
    if (localizedModule !== undefined) {
      return localizedModule as T;
    }
  }

  const fallbackModule = rootConfigModules[`./${fileName}`];
  if (fallbackModule !== undefined) {
    return fallbackModule as T;
  }

  throw new Error(`Localized config JSON not found for ${fileName}`);
}
