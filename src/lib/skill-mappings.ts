import classSpecialBuffDisplaysRaw from "$lib/config/class_special_buff_displays.json";
import type { CounterAction, CounterTrigger } from "$lib/bindings";
import { resolvedLanguage } from "$lib/i18n/index.svelte";
import { getLocalizedConfigJson } from "$lib/config/localized-json";

export type SkillDisplayInfo = {
  skillId: number;
  name: string;
  imagePath: string;
  maxCharges?: number;
  maxValidCdTime?: number;
  effectDurationMs?: number;
  resourceRequirement?: ResourceRequirement;
};

export type SkillDefinition = SkillDisplayInfo;

export type ClassSkillConfig = {
  classKey: string;
  className: string;
  classId: number;
  skills: SkillDefinition[];
  derivations?: SkillDerivation[];
  defaultMonitoredBuffIds?: number[];
};

export type ResourceDefinition = {
  type: "bar" | "charges";
  label: string;
  currentIndex: number;
  maxIndex: number;
  imageOn: string;
  imageOff: string;
  buffBaseId?: number;
  buffBaseIds?: number[];
};

export type SpecialBuffDisplay = {
  buffBaseId: number;
  layerImages: string[][];
};

export type ResourceRequirement = {
  resourceIndex: number;
  amount: number;
};

type ResonanceSkillIconRaw = {
  id: number;
  NameDesign: string;
  Icon: string;
  maxCharges?: number;
  maxValidCdTime?: number;
};

export type ResonanceSkillDefinition = SkillDisplayInfo;

export type CounterRulePreset = {
  ruleId: number;
  name: string;
  trigger: CounterTrigger;
  linkedBuffId: number;
  threshold: number | null;
  onBuffAdd: CounterAction;
  onBuffRemove: CounterAction;
};

export const CLASS_SPECIAL_BUFF_DISPLAYS: Record<string, SpecialBuffDisplay[]> =
  classSpecialBuffDisplaysRaw as Record<string, SpecialBuffDisplay[]>;

export type SkillDerivation = {
  sourceSkillId: number;
  derivedSkillId: number;
  triggerBuffBaseId: number;
  derivedName: string;
  derivedImagePath: string;
  keepCdWhenDerived?: boolean;
};

type SkillMappingCatalog = {
  classResources: Record<string, ResourceDefinition[]>;
  classSkillConfigs: Record<string, ClassSkillConfig>;
  resonanceSkills: ResonanceSkillDefinition[];
  counterRules: CounterRulePreset[];
};

const skillMappingCatalogCache = new Map<string, SkillMappingCatalog>();

function getSkillMappingCatalog(): SkillMappingCatalog {
  const language = resolvedLanguage();
  const cached = skillMappingCatalogCache.get(language);
  if (cached) {
    return cached;
  }

  const classResources = getLocalizedConfigJson<Record<string, ResourceDefinition[]>>(
    "class_resources.json",
    language,
  );
  const classSkillConfigs = getLocalizedConfigJson<Record<string, ClassSkillConfig>>(
    "class_skill_configs.json",
    language,
  );
  const resonanceSkillIcons = getLocalizedConfigJson<ResonanceSkillIconRaw[]>(
    "skill_aoyi_icons.json",
    language,
  );
  const counterRules = getLocalizedConfigJson<CounterRulePreset[]>(
    "counter_rules.json",
    language,
  );
  const resonanceSkills = resonanceSkillIcons.map((skill) => ({
    skillId: skill.id,
    name: skill.NameDesign,
    imagePath: `/images/resonance_skill/${skill.Icon}`,
    ...(skill.maxCharges !== undefined ? { maxCharges: skill.maxCharges } : {}),
    ...(skill.maxValidCdTime !== undefined
      ? { maxValidCdTime: skill.maxValidCdTime }
      : {}),
  }));

  const next = {
    classResources,
    classSkillConfigs,
    resonanceSkills,
    counterRules,
  };
  skillMappingCatalogCache.set(language, next);
  return next;
}

export function getClassConfigs(): ClassSkillConfig[] {
  return Object.values(getSkillMappingCatalog().classSkillConfigs);
}

export function getCounterRules(): CounterRulePreset[] {
  return getSkillMappingCatalog().counterRules;
}

export function getSkillsByClass(classKey: string): SkillDefinition[] {
  return getSkillMappingCatalog().classSkillConfigs[classKey]?.skills ?? [];
}

export function getDurationSkillsByClass(classKey: string): SkillDefinition[] {
  return getSkillsByClass(classKey).filter((skill) => skill.effectDurationMs !== undefined);
}

export function findSkillById(
  classKey: string,
  skillId: number,
): SkillDefinition | undefined {
  return getSkillMappingCatalog().classSkillConfigs[classKey]?.skills.find(
    (skill) => skill.skillId === skillId,
  );
}

export function findResourcesByClass(classKey: string): ResourceDefinition[] {
  return getSkillMappingCatalog().classResources[classKey] || [];
}

export function findSpecialBuffDisplays(classKey: string): SpecialBuffDisplay[] {
  return CLASS_SPECIAL_BUFF_DISPLAYS[classKey] ?? [];
}

export function getDefaultMonitoredBuffIds(classKey: string): number[] {
  return getSkillMappingCatalog().classSkillConfigs[classKey]?.defaultMonitoredBuffIds ?? [];
}

export function findSkillDerivationBySource(
  classKey: string,
  sourceSkillId: number,
): SkillDerivation | undefined {
  return getSkillMappingCatalog().classSkillConfigs[classKey]?.derivations?.find(
    (derivation) => derivation.sourceSkillId === sourceSkillId,
  );
}

export function findResonanceSkill(
  skillId: number,
): ResonanceSkillDefinition | undefined {
  return getSkillMappingCatalog().resonanceSkills.find(
    (skill) => skill.skillId === skillId,
  );
}

export function searchResonanceSkills(
  keyword: string,
): ResonanceSkillDefinition[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];
  return getSkillMappingCatalog().resonanceSkills.filter((skill) =>
    skill.name.toLowerCase().includes(normalized),
  );
}

export function findAnySkillByBaseId(
  classKey: string,
  skillId: number,
): SkillDisplayInfo | undefined {
  return findSkillById(classKey, skillId) ?? findResonanceSkill(skillId);
}
