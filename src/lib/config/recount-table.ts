import { resolvedLanguage } from "$lib/i18n/index.svelte";
import { getLocalizedConfigJson } from "./localized-json";

export type RawSkillStatsLike = {
  totalValue: number;
  hits: number;
  critHits: number;
  critTotalValue: number;
  luckyHits: number;
  luckyTotalValue: number;
};

export type SkillDisplayRow = {
  skillId: number;
  name: string;
  showSkillId?: boolean;
  totalDmg: number;
  dps: number;
  dmgPct: number;
  critRate: number;
  critDmgRate: number;
  luckyRate: number;
  luckyDmgRate: number;
  hits: number;
  hitsPerMinute: number;
  raw: RawSkillStatsLike;
};

export type RecountGroup = {
  recountId: number;
  recountName: string;
  totalDmg: number;
  dps: number;
  dmgPct: number;
  critRate: number;
  critDmgRate: number;
  luckyRate: number;
  luckyDmgRate: number;
  hits: number;
  hitsPerMinute: number;
  skills: SkillDisplayRow[];
};

type RecountEntry = {
  Id: number;
  RecountName: string;
  DamageId: number[];
};

type RecountLookup = {
  recountTable: Record<string, RecountEntry>;
  damageAttrIdNames: Record<string, string>;
  damageToRecount: Map<number, { recountId: number; recountName: string }>;
};

const recountLookupCache = new Map<string, RecountLookup>();

function getRecountLookup(): RecountLookup {
  const language = resolvedLanguage();
  const cached = recountLookupCache.get(language);
  if (cached) {
    return cached;
  }

  const recountTable = getLocalizedConfigJson<Record<string, RecountEntry>>(
    "RecountTable.json",
    language,
  );
  const damageAttrIdNames = getLocalizedConfigJson<Record<string, string>>(
    "DamageAttrIdName.json",
    language,
  );
  const damageToRecount = new Map<number, { recountId: number; recountName: string }>();

  for (const entry of Object.values(recountTable)) {
    for (const did of entry.DamageId) {
      damageToRecount.set(did, {
        recountId: entry.Id,
        recountName: entry.RecountName,
      });
    }
  }

  const next = {
    recountTable,
    damageAttrIdNames,
    damageToRecount,
  };
  recountLookupCache.set(language, next);
  return next;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function rate(hits: number, totalHits: number): number {
  if (totalHits <= 0) return 0;
  return (hits / totalHits) * 100;
}

function perMinute(value: number, elapsedSecs: number): number {
  if (elapsedSecs <= 0) return 0;
  return (value / elapsedSecs) * 60;
}

export function lookupDamageIdName(damageId: number): string {
  const { damageToRecount, damageAttrIdNames } = getRecountLookup();
  const recount = damageToRecount.get(damageId);
  if (recount) return recount.recountName;
  return damageAttrIdNames[String(damageId)] ?? `Unknown (${damageId})`;
}

export function lookupChildDamageIdName(damageId: number): string {
  const { damageAttrIdNames } = getRecountLookup();
  const individual = damageAttrIdNames[String(damageId)];
  if (individual) return individual;
  return lookupDamageIdName(damageId);
}

export function buildSkillDisplayRow(
  skillId: number,
  stats: RawSkillStatsLike,
  elapsedSecs: number,
  parentTotal: number,
): SkillDisplayRow {
  const totalDmg = Number(stats.totalValue || 0);
  const hits = Number(stats.hits || 0);
  return {
    skillId,
    name: lookupDamageIdName(skillId),
    totalDmg,
    dps: elapsedSecs > 0 ? totalDmg / elapsedSecs : 0,
    dmgPct: pct(totalDmg, parentTotal),
    critRate: rate(Number(stats.critHits || 0), hits),
    critDmgRate: pct(Number(stats.critTotalValue || 0), totalDmg),
    luckyRate: rate(Number(stats.luckyHits || 0), hits),
    luckyDmgRate: pct(Number(stats.luckyTotalValue || 0), totalDmg),
    hits,
    hitsPerMinute: perMinute(hits, elapsedSecs),
    raw: stats,
  };
}

export function groupSkillsByRecount(
  skills: Partial<Record<number, RawSkillStatsLike>>,
  elapsedSecs: number,
  parentTotal: number,
): { groups: RecountGroup[]; ungrouped: SkillDisplayRow[] } {
  const { damageToRecount } = getRecountLookup();
  const groupMap = new Map<number, RecountGroup>();
  const ungrouped: SkillDisplayRow[] = [];

  for (const [skillIdText, stats] of Object.entries(skills)) {
    if (!stats) continue;
    const skillId = Number(skillIdText);
    if (!Number.isFinite(skillId)) continue;

    const row = buildSkillDisplayRow(skillId, stats, elapsedSecs, parentTotal);
    const mapping = damageToRecount.get(skillId);
    if (!mapping) {
      ungrouped.push(row);
      continue;
    }

    let group = groupMap.get(mapping.recountId);
    if (!group) {
      group = {
        recountId: mapping.recountId,
        recountName: mapping.recountName,
        totalDmg: 0,
        dps: 0,
        dmgPct: 0,
        critRate: 0,
        critDmgRate: 0,
        luckyRate: 0,
        luckyDmgRate: 0,
        hits: 0,
        hitsPerMinute: 0,
        skills: [],
      };
      groupMap.set(mapping.recountId, group);
    }

    group.totalDmg += row.totalDmg;
    group.hits += row.hits;
    row.name = lookupChildDamageIdName(skillId);
    group.skills.push(row);
  }

  const groups = Array.from(groupMap.values()).map((group) => {
    const critHits = group.skills.reduce((sum, s) => sum + Number(s.raw.critHits || 0), 0);
    const critTotal = group.skills.reduce(
      (sum, s) => sum + Number(s.raw.critTotalValue || 0),
      0,
    );
    const luckyHits = group.skills.reduce((sum, s) => sum + Number(s.raw.luckyHits || 0), 0);
    const luckyTotal = group.skills.reduce(
      (sum, s) => sum + Number(s.raw.luckyTotalValue || 0),
      0,
    );
    group.dps = elapsedSecs > 0 ? group.totalDmg / elapsedSecs : 0;
    group.dmgPct = pct(group.totalDmg, parentTotal);
    group.critRate = rate(critHits, group.hits);
    group.critDmgRate = pct(critTotal, group.totalDmg);
    group.luckyRate = rate(luckyHits, group.hits);
    group.luckyDmgRate = pct(luckyTotal, group.totalDmg);
    group.hitsPerMinute = perMinute(group.hits, elapsedSecs);
    const nameCount = new Map<string, number>();
    for (const skill of group.skills) {
      nameCount.set(skill.name, (nameCount.get(skill.name) ?? 0) + 1);
    }
    for (const skill of group.skills) {
      skill.showSkillId = (nameCount.get(skill.name) ?? 0) > 1;
    }
    group.skills.sort((a, b) => b.totalDmg - a.totalDmg);
    return group;
  });

  groups.sort((a, b) => b.totalDmg - a.totalDmg);
  ungrouped.sort((a, b) => b.totalDmg - a.totalDmg);

  return { groups, ungrouped };
}
