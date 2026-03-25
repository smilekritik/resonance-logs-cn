use log::warn;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::sync::LazyLock;

use crate::data_i18n;

#[derive(Debug, Clone, Deserialize)]
struct RawSkillFightLevelEntry {
    #[serde(rename = "SkillEffectId")]
    skill_effect_id: i32,
}

#[derive(Default)]
struct SkillLevelEffectCache {
    language: String,
    map: HashMap<i32, i32>,
}

static SKILL_LEVEL_TO_EFFECT: LazyLock<parking_lot::RwLock<SkillLevelEffectCache>> =
    LazyLock::new(|| {
        parking_lot::RwLock::new(load_skill_level_to_effect_cache().unwrap_or_else(|err| {
            warn!(
                "[damage-id] failed to load SkillFightLevelTable.json: {}",
                err
            );
            SkillLevelEffectCache::default()
        }))
    });

fn ensure_skill_level_to_effect_current() {
    let current_language = data_i18n::current_language();
    if SKILL_LEVEL_TO_EFFECT.read().language == current_language {
        return;
    }

    let next = load_skill_level_to_effect_cache().unwrap_or_else(|err| {
        warn!(
            "[damage-id] failed to reload SkillFightLevelTable.json: {}",
            err
        );
        SkillLevelEffectCache::default()
    });
    *SKILL_LEVEL_TO_EFFECT.write() = next;
}

fn load_skill_level_to_effect_cache() -> Result<SkillLevelEffectCache, Box<dyn std::error::Error>> {
    let language = data_i18n::current_language();
    let path = data_i18n::locate_localized_json("meter-data", "SkillFightLevelTable.json")
        .ok_or_else(|| "meter-data/SkillFightLevelTable.json not found in known locations".to_string())?;
    let contents = fs::read_to_string(path)?;
    let raw_map: HashMap<String, RawSkillFightLevelEntry> = serde_json::from_str(&contents)?;

    let mut result = HashMap::new();
    for (key, value) in raw_map {
        if let Ok(skill_level_id) = key.parse::<i32>() {
            result.insert(skill_level_id, value.skill_effect_id);
        }
    }
    Ok(SkillLevelEffectCache {
        language,
        map: result,
    })
}

fn decimal_digits(value: i32) -> u32 {
    if value < 10 { 1 } else { value.ilog10() + 1 }
}

fn append_decimal_i64(prefix: i64, suffix: i32, min_width: u32) -> Option<i64> {
    let width = decimal_digits(suffix).max(min_width);
    let factor = 10_i64.checked_pow(width)?;
    prefix.checked_mul(factor)?.checked_add(i64::from(suffix))
}

pub fn compute_damage_id(
    damage_source: Option<i32>,
    owner_id: i32,
    owner_level: Option<i32>,
    hit_event_id: Option<i32>,
) -> i64 {
    ensure_skill_level_to_effect_current();
    let skill_level_to_effect = SKILL_LEVEL_TO_EFFECT.read();
    let owner_level = owner_level.unwrap_or_default().max(0);
    let hit_event_id = hit_event_id.unwrap_or_default().max(0);
    let mut skill_effect_id = owner_id.max(0);
    let damage_type = if let Some(source) = damage_source.filter(|v| *v > 0) {
        if source == 2 { 2 } else { 3 }
    } else {
        let skill_level_id = owner_id
            .checked_mul(100)
            .and_then(|v| v.checked_add(owner_level))
            .unwrap_or(owner_id);
        if let Some(effect_id) = skill_level_to_effect.map.get(&skill_level_id) {
            skill_effect_id = *effect_id;
        } else {
            let level_one_skill_id = owner_id
                .checked_mul(100)
                .and_then(|v| v.checked_add(1))
                .unwrap_or(owner_id);
            if let Some(effect_id) = skill_level_to_effect.map.get(&level_one_skill_id) {
                skill_effect_id = *effect_id;
            }
        }
        1
    };

    append_decimal_i64(i64::from(damage_type), skill_effect_id, 0)
        .and_then(|prefix| append_decimal_i64(prefix, hit_event_id, 2))
        .unwrap_or_default()
}
