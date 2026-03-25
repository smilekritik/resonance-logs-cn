import { resolvedLanguage } from "$lib/i18n/index.svelte";
import zhBuffData from "$lib/i18n/locales/zh-CN/buff-data";
import enBuffData from "$lib/i18n/locales/en/buff-data";
import { getLocalizedConfigJson } from "./localized-json";

export type BuffAliasMap = Record<string, string>;
export type BuffCategoryKey = "food" | "alchemy";

export type BuffDefinition = {
  baseId: number;
  name: string;
  spriteFile: string;
  searchKeywords: string[];
};

export type BuffNameInfo = {
  baseId: number;
  name: string;
  hasSpriteFile: boolean;
};

export type BuffMeta = {
  baseId: number;
  defaultName: string;
  hasSpriteFile: boolean;
  spriteFile: string | null;
  iconKey: string | null;
  categories: BuffCategoryKey[];
  searchKeywords: string[];
};

export type BuffCategoryDefinition = {
  key: BuffCategoryKey;
  label: string;
  count: number;
};

type RawBuffEntry = {
  Id: number;
  Icon?: string | null;
  NameDesign?: string | null;
  SpriteFile?: string | null;
};

type BuffCategoryCatalog = Record<
  BuffCategoryKey,
  { label: string; buffIds: number[] }
>;

type BuffCatalog = {
  metaMap: Map<number, BuffMeta>;
  availableDefinitions: BuffDefinition[];
  categoryCatalog: BuffCategoryCatalog;
};

const buffDataByLanguage = {
  "zh-CN": zhBuffData,
  en: enBuffData,
} as const;

const buffCatalogCache = new Map<string, BuffCatalog>();

function getCurrentBuffData(language: string) {
  return buffDataByLanguage[language as keyof typeof buffDataByLanguage] ?? zhBuffData;
}

function resolveBuffCategories(
  defaultName: string,
  iconKey: string | null,
  language: string,
): BuffCategoryKey[] {
  const categories: BuffCategoryKey[] = [];
  const buffData = getCurrentBuffData(language);
  if (iconKey?.startsWith("buff_food_up")) {
    const hasKeywordMatch = buffData.categories.food.keywords.some((keyword) =>
      defaultName.includes(keyword),
    );
    if (hasKeywordMatch || language !== "zh-CN") {
      categories.push("food");
    }
  }
  if (iconKey?.startsWith("buff_agentia_up")) {
    const hasKeywordMatch = buffData.categories.alchemy.keywords.some((keyword) =>
      defaultName.includes(keyword),
    );
    if (hasKeywordMatch || language !== "zh-CN") {
      categories.push("alchemy");
    }
  }
  return categories;
}

function buildBuffCatalog(language: string): BuffCatalog {
  const rawBuffEntries = getLocalizedConfigJson<RawBuffEntry[]>("BuffName.json", language);
  const buffData = getCurrentBuffData(language);
  const metaMap = new Map<number, BuffMeta>();
  const availableDefinitions: BuffDefinition[] = [];
  const categoryCatalog: BuffCategoryCatalog = {
    food: { label: buffData.categories.food.label, buffIds: [] },
    alchemy: { label: buffData.categories.alchemy.label, buffIds: [] },
  };

  for (const entry of rawBuffEntries) {
    const defaultName = entry.NameDesign?.trim() ?? "";
    if (!defaultName) continue;

    const iconKey = entry.Icon?.trim() || null;
    const spriteFile = entry.SpriteFile?.trim() || null;
    const categories = resolveBuffCategories(defaultName, iconKey, language);
    const searchKeywords = [defaultName];
    const meta: BuffMeta = {
      baseId: entry.Id,
      defaultName,
      hasSpriteFile: Boolean(spriteFile),
      spriteFile,
      iconKey,
      categories,
      searchKeywords,
    };
    metaMap.set(entry.Id, meta);
    for (const category of categories) {
      categoryCatalog[category].buffIds.push(entry.Id);
    }

    if (spriteFile) {
      availableDefinitions.push({
        baseId: entry.Id,
        name: defaultName,
        spriteFile,
        searchKeywords,
      });
    }
  }

  availableDefinitions.sort((a, b) => a.baseId - b.baseId);
  for (const category of Object.values(categoryCatalog)) {
    category.buffIds.sort((a, b) => a - b);
  }

  return {
    metaMap,
    availableDefinitions,
    categoryCatalog,
  };
}

function getBuffCatalog(): BuffCatalog {
  const language = resolvedLanguage();
  const cached = buffCatalogCache.get(language);
  if (cached) {
    return cached;
  }

  const next = buildBuffCatalog(language);
  buffCatalogCache.set(language, next);
  return next;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeBuffCategoryKeys(
  categories?: BuffCategoryKey[] | null,
): BuffCategoryKey[] {
  const normalized = new Set<BuffCategoryKey>();
  for (const category of categories ?? []) {
    if (category === "food" || category === "alchemy") {
      normalized.add(category);
    }
  }
  return Array.from(normalized);
}

function normalizeAliasMap(aliases?: BuffAliasMap): BuffAliasMap {
  if (!aliases) return {};
  const next: BuffAliasMap = {};
  for (const [baseId, alias] of Object.entries(aliases)) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    next[baseId] = trimmed;
  }
  return next;
}

function getAlias(baseId: number, aliases?: BuffAliasMap): string | null {
  const normalizedAliases = normalizeAliasMap(aliases);
  const alias = normalizedAliases[String(baseId)]?.trim();
  return alias ? alias : null;
}

function getMatchRank(
  text: string | null | undefined,
  normalizedKeyword: string,
  exactRank: number,
  containsRank: number,
): number | null {
  if (!text) return null;
  const normalizedText = normalizeText(text);
  if (!normalizedText) return null;
  if (normalizedText === normalizedKeyword) return exactRank;
  if (normalizedText.includes(normalizedKeyword)) return containsRank;
  return null;
}

export function lookupBuffMeta(baseId: number): BuffMeta | undefined {
  return getBuffCatalog().metaMap.get(baseId);
}

export function lookupDefaultBuffName(baseId: number): string | undefined {
  return lookupBuffMeta(baseId)?.defaultName;
}

export function getAvailableBuffDefinitions(): BuffDefinition[] {
  return getBuffCatalog().availableDefinitions;
}

export function getBuffCategoryDefinitions(): BuffCategoryDefinition[] {
  return (Object.entries(getBuffCatalog().categoryCatalog) as Array<
    [BuffCategoryKey, { label: string; buffIds: number[] }]
  >).map(([key, category]) => ({
    key,
    label: category.label,
    count: category.buffIds.length,
  }));
}

export function getBuffIdsByCategory(category: BuffCategoryKey): number[] {
  return [...(getBuffCatalog().categoryCatalog[category]?.buffIds ?? [])];
}

export function getBuffCategoryLabel(category: BuffCategoryKey): string {
  return getBuffCatalog().categoryCatalog[category]?.label ?? category;
}

export function resolveBuffCategoryKey(
  baseId: number,
): BuffCategoryKey | undefined {
  return lookupBuffMeta(baseId)?.categories[0];
}

export function expandBuffSelection(
  buffIds: number[],
  categories?: BuffCategoryKey[] | null,
): number[] {
  return Array.from(
    new Set([
      ...buffIds,
      ...normalizeBuffCategoryKeys(categories).flatMap((category) =>
        getBuffIdsByCategory(category),
      ),
    ]),
  );
}

export function resolveBuffDisplayName(
  baseId: number,
  aliases?: BuffAliasMap,
): string {
  const alias = getAlias(baseId, aliases);
  if (alias) return alias;
  return lookupDefaultBuffName(baseId) ?? `#${baseId}`;
}

export function resolveBuffNameInfo(
  baseId: number,
  aliases?: BuffAliasMap,
): BuffNameInfo {
  const meta = lookupBuffMeta(baseId);
  return {
    baseId,
    name: resolveBuffDisplayName(baseId, aliases),
    hasSpriteFile: meta?.hasSpriteFile ?? false,
  };
}

export function searchBuffsByName(
  keyword: string,
  aliases?: BuffAliasMap,
  limit?: number | null,
): BuffNameInfo[] {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return [];

  const normalizedAliases = normalizeAliasMap(aliases);
  const matches: Array<{ baseId: number; rank: number }> = [];

  for (const meta of getBuffCatalog().metaMap.values()) {
    const alias = normalizedAliases[String(meta.baseId)] ?? null;
    const aliasRank = getMatchRank(alias, normalizedKeyword, 1, 2);
    const defaultRank = getMatchRank(meta.defaultName, normalizedKeyword, 3, 4);
    const rank = Math.min(aliasRank ?? Number.POSITIVE_INFINITY, defaultRank ?? Number.POSITIVE_INFINITY);
    if (!Number.isFinite(rank)) continue;
    matches.push({ baseId: meta.baseId, rank });
  }

  matches.sort((a, b) => a.rank - b.rank || a.baseId - b.baseId);

  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit ?? 0)) : null;
  const visibleMatches = normalizedLimit === null ? matches : matches.slice(0, normalizedLimit);

  return visibleMatches.map((match) => resolveBuffNameInfo(match.baseId, normalizedAliases));
}
