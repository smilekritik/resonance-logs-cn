use crate::database::now_ms;
use crate::data_i18n;
use crate::live::commands_models::SkillCdState;
use crate::live::entity_attr_store::EntityAttrStore;
use crate::live::opcodes_process::ParsedSkillCd;
use log::{info, warn};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::sync::LazyLock;
const TAG_NO_CD_REDUCE: i32 = 103;

#[derive(Debug, Clone, Deserialize)]
struct RawTempAttrDef {
    #[serde(rename = "Id")]
    id: i32,
    #[serde(rename = "AttrType")]
    attr_type: i32,
    #[serde(rename = "LogicType")]
    logic_type: i32,
    #[serde(rename = "AttrParams", default)]
    attr_params: Vec<i32>,
}

#[derive(Debug, Clone)]
struct CdTempAttrDef {
    attr_type: i32,
    logic_type: i32,
    attr_params: Vec<i32>,
}

#[derive(Debug, Clone, Deserialize)]
struct RawSkillEffectEntry {
    #[serde(rename = "Tags", default)]
    tags: Vec<i32>,
}

#[derive(Default)]
struct CdTempAttrCache {
    language: String,
    defs: HashMap<i32, CdTempAttrDef>,
}

#[derive(Default)]
struct SkillEffectTagCache {
    language: String,
    tags: HashMap<i32, Vec<i32>>,
}

static CD_TEMP_ATTR_DEFS: LazyLock<parking_lot::RwLock<CdTempAttrCache>> = LazyLock::new(|| {
    parking_lot::RwLock::new(load_cd_temp_attr_defs().unwrap_or_else(|err| {
        warn!("[skill-cd] failed to load TempAttrTable.json: {}", err);
        CdTempAttrCache::default()
    }))
});

static SKILL_EFFECT_TAGS: LazyLock<parking_lot::RwLock<SkillEffectTagCache>> =
    LazyLock::new(|| {
        parking_lot::RwLock::new(load_skill_effect_tags().unwrap_or_else(|err| {
            warn!("[skill-cd] failed to load SkillEffectTable.json: {}", err);
            SkillEffectTagCache::default()
        }))
    });

#[derive(Debug, Default)]
pub struct SkillCdMonitor {
    /// Skill cooldown map keyed by skill level ID.
    pub skill_cd_map: HashMap<i32, SkillCdState>,
    /// Ordered list of monitored skill IDs.
    pub monitored_skill_ids: Vec<i32>,
}

impl SkillCdMonitor {
    pub(crate) fn new() -> Self {
        Self {
            skill_cd_map: HashMap::new(),
            monitored_skill_ids: Vec::new(),
        }
    }

    pub(crate) fn recalculate_cached_skill_cds(&mut self, attr_store: &EntityAttrStore) {
        let (attr_skill_cd, attr_skill_cd_pct, attr_cd_accelerate_pct) = attr_store.cd_inputs();
        for cd in self.skill_cd_map.values_mut() {
            if cd.duration > 0 {
                let (calculated_duration, cd_accelerate_rate) = calculate_skill_cd(
                    cd.duration as f32,
                    cd.skill_level_id,
                    attr_store.temp_attrs(),
                    attr_skill_cd,
                    attr_skill_cd_pct,
                    attr_cd_accelerate_pct,
                );
                cd.calculated_duration = calculated_duration.round() as i32;
                cd.cd_accelerate_rate = cd_accelerate_rate;
            } else {
                cd.calculated_duration = cd.duration;
                cd.cd_accelerate_rate = 0.0;
            }
        }
    }

    pub(crate) fn build_filtered_skill_cds(&self) -> Vec<SkillCdState> {
        if self.monitored_skill_ids.is_empty() {
            return Vec::new();
        }
        let mut filtered = Vec::with_capacity(self.monitored_skill_ids.len());
        for monitored_skill_id in &self.monitored_skill_ids {
            if let Some(cd) = self
                .skill_cd_map
                .values()
                .filter(|cd| cd.skill_level_id / 100 == *monitored_skill_id)
                .max_by_key(|cd| cd.received_at)
                .cloned()
            {
                filtered.push(cd);
            }
        }
        filtered
    }

    pub(crate) fn apply_skill_cd_updates(
        &mut self,
        skill_cds: &[ParsedSkillCd],
        attr_store: &EntityAttrStore,
    ) {
        let now = now_ms();
        for cd in skill_cds {
            let Some(id) = cd.skill_level_id else {
                continue;
            };
            if !self.monitored_skill_ids.contains(&(id / 100)) {
                continue;
            }

            let duration = cd.duration.unwrap_or(0);
            let (attr_skill_cd, attr_skill_cd_pct, attr_cd_accelerate_pct) = attr_store.cd_inputs();
            let (calculated_duration, cd_accelerate_rate) = if duration > 0 {
                calculate_skill_cd(
                    duration as f32,
                    id,
                    attr_store.temp_attrs(),
                    attr_skill_cd,
                    attr_skill_cd_pct,
                    attr_cd_accelerate_pct,
                )
            } else {
                (duration as f32, 0.0)
            };

            self.skill_cd_map.insert(
                id,
                SkillCdState {
                    skill_level_id: id,
                    begin_time: cd.begin_time.unwrap_or(0),
                    duration,
                    skill_cd_type: cd.skill_cd_type.unwrap_or(0),
                    valid_cd_time: cd.valid_cd_time.unwrap_or(0),
                    received_at: now,
                    calculated_duration: calculated_duration.round() as i32,
                    cd_accelerate_rate,
                },
            );
        }
    }
}

fn ensure_cd_temp_attr_defs_current() {
    let current_language = data_i18n::current_language();
    if CD_TEMP_ATTR_DEFS.read().language == current_language {
        return;
    }

    let next = load_cd_temp_attr_defs().unwrap_or_else(|err| {
        warn!("[skill-cd] failed to reload TempAttrTable.json: {}", err);
        CdTempAttrCache::default()
    });
    *CD_TEMP_ATTR_DEFS.write() = next;
}

fn ensure_skill_effect_tags_current() {
    let current_language = data_i18n::current_language();
    if SKILL_EFFECT_TAGS.read().language == current_language {
        return;
    }

    let next = load_skill_effect_tags().unwrap_or_else(|err| {
        warn!("[skill-cd] failed to reload SkillEffectTable.json: {}", err);
        SkillEffectTagCache::default()
    });
    *SKILL_EFFECT_TAGS.write() = next;
}

fn load_cd_temp_attr_defs() -> Result<CdTempAttrCache, Box<dyn std::error::Error>> {
    let language = data_i18n::current_language();
    let path = data_i18n::locate_localized_json("meter-data", "TempAttrTable.json")
        .ok_or_else(|| "meter-data/TempAttrTable.json not found in known locations".to_string())?;
    let contents = fs::read_to_string(path)?;
    let raw_map: HashMap<String, RawTempAttrDef> = serde_json::from_str(&contents)?;

    let mut result = HashMap::new();
    for raw in raw_map.into_values() {
        // 100 = pct reduce, 101 = flat reduce, 103 = accelerate pct
        if raw.attr_type != 100 && raw.attr_type != 101 && raw.attr_type != 103 {
            continue;
        }
        result.insert(
            raw.id,
            CdTempAttrDef {
                attr_type: raw.attr_type,
                logic_type: raw.logic_type,
                attr_params: raw.attr_params,
            },
        );
    }
    Ok(CdTempAttrCache {
        language,
        defs: result,
    })
}

fn load_skill_effect_tags() -> Result<SkillEffectTagCache, Box<dyn std::error::Error>> {
    let language = data_i18n::current_language();
    let path = data_i18n::locate_localized_json("meter-data", "SkillEffectTable.json")
        .ok_or_else(|| "meter-data/SkillEffectTable.json not found in known locations".to_string())?;
    let contents = fs::read_to_string(path)?;
    let raw_map: HashMap<String, RawSkillEffectEntry> = serde_json::from_str(&contents)?;

    let mut result = HashMap::new();
    for (key, value) in raw_map {
        if let Ok(skill_level_id) = key.parse::<i32>() {
            result.insert(skill_level_id, value.tags);
        }
    }
    Ok(SkillEffectTagCache {
        language,
        tags: result,
    })
}

fn temp_attr_matches(def: &CdTempAttrDef, skill_id: i32, skill_tags: &HashSet<i32>) -> bool {
    match def.logic_type {
        0 => true,
        1 => def.attr_params.contains(&skill_id),
        3 => def.attr_params.iter().any(|tag| skill_tags.contains(tag)),
        _ => false,
    }
}

fn calculate_skill_cd(
    base_cd: f32,
    skill_level_id: i32,
    temp_attr_values: &HashMap<i32, i32>,
    attr_skill_cd: f32,
    attr_skill_cd_pct: f32,
    attr_cd_accelerate_pct: f32,
) -> (f32, f32) {
    ensure_cd_temp_attr_defs_current();
    ensure_skill_effect_tags_current();
    let cd_temp_attr_defs = CD_TEMP_ATTR_DEFS.read();
    let skill_effect_tags = SKILL_EFFECT_TAGS.read();
    let temp_attrs_nonzero: Vec<(i32, i32)> = temp_attr_values
        .iter()
        .filter(|(_, v)| **v != 0)
        .map(|(k, v)| (*k, *v))
        .collect();
    info!(
        "[skill-cd] calc skill_level_id={} base_cd={} attr_skill_cd={} attr_skill_cd_pct={} attr_cd_accelerate_pct={} temp_attrs={:?}",
        skill_level_id,
        base_cd,
        attr_skill_cd,
        attr_skill_cd_pct,
        attr_cd_accelerate_pct,
        temp_attrs_nonzero
    );

    if base_cd <= 0.0 {
        info!("[skill-cd]   base_cd<=0, return (0.0, 0.0)");
        return (0.0, 0.0);
    }

    let skill_id = skill_level_id / 100;
    let tag_lookup_skill_level_id = skill_id * 100 + 1;
    let skill_tags_vec = skill_effect_tags
        .tags
        .get(&tag_lookup_skill_level_id)
        .cloned()
        .unwrap_or_default();
    let skill_tags: HashSet<i32> = skill_tags_vec.iter().copied().collect();
    info!(
        "[skill-cd]   skill_id={} tag_lookup={} skill_tags={:?}",
        skill_id, tag_lookup_skill_level_id, skill_tags_vec
    );

    if skill_tags.contains(&TAG_NO_CD_REDUCE) {
        info!(
            "[skill-cd]   skill has TAG_NO_CD_REDUCE(103), no reduction applied, return (base_cd={}, accelerate=0.0)",
            base_cd
        );
        return (base_cd.max(0.0), 0.0);
    }

    let mut flat_reduce = attr_skill_cd;
    let mut pct_reduce = attr_skill_cd_pct / 10000.0;
    let mut accelerate = attr_cd_accelerate_pct / 10000.0;
    info!(
        "[skill-cd]   init flat_reduce={} pct_reduce={} accelerate={}",
        flat_reduce, pct_reduce, accelerate
    );

    for (temp_attr_id, value) in temp_attr_values {
        if *value == 0 {
            continue;
        }
        let Some(def) = cd_temp_attr_defs.defs.get(temp_attr_id) else {
            info!(
                "[skill-cd]   temp_attr {} value={} def_found=false (not in CD_TEMP_ATTR_DEFS), skip",
                temp_attr_id, value
            );
            continue;
        };
        let matches = temp_attr_matches(def, skill_id, &skill_tags);
        if !matches {
            info!(
                "[skill-cd]   temp_attr {} value={} def_found=true matches=false (attr_type={} logic_type={} params={:?}), skip",
                temp_attr_id, value, def.attr_type, def.logic_type, def.attr_params
            );
            continue;
        }

        match def.attr_type {
            101 => {
                let contrib = *value as f32 / 1000.0;
                flat_reduce += contrib;
                info!(
                    "[skill-cd]   temp_attr {} value={} attr_type=101(flat) contrib={} -> flat_reduce={}",
                    temp_attr_id, value, contrib, flat_reduce
                );
            }
            100 => {
                let contrib = *value as f32 / 10000.0;
                pct_reduce += contrib;
                info!(
                    "[skill-cd]   temp_attr {} value={} attr_type=100(pct) contrib={} -> pct_reduce={}",
                    temp_attr_id, value, contrib, pct_reduce
                );
            }
            103 => {
                let contrib = *value as f32 / 10000.0;
                accelerate += contrib;
                info!(
                    "[skill-cd]   temp_attr {} value={} attr_type=103(accelerate) contrib={} -> accelerate={}",
                    temp_attr_id, value, contrib, accelerate
                );
            }
            _ => {}
        }
    }

    info!(
        "[skill-cd]   final flat_reduce={} pct_reduce={} accelerate={}",
        flat_reduce, pct_reduce, accelerate
    );

    let reduced_cd = ((1.0 - pct_reduce) * (base_cd - flat_reduce)).max(0.0);
    info!(
        "[skill-cd]   reduced_cd=(1-{})*({}-{})={}",
        pct_reduce, base_cd, flat_reduce, reduced_cd
    );

    info!(
        "[skill-cd]   final_result actual_cd={} accelerate_rate={}",
        reduced_cd, accelerate
    );
    (reduced_cd, accelerate)
}
