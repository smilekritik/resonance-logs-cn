use anyhow::{Context, Result};
use crate::data_i18n;
use log::warn;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::sync::LazyLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum MonsterType {
    Normal = 0,
    Elite = 1,
    Boss = 2,
}

#[derive(Debug, Clone)]
pub struct MonsterInfo {
    pub name: String,
    pub monster_type: MonsterType,
}

const EXTRA_BUFF_MONITORED_MONSTERS_RELATIVE: &str = "meter-data/ExtraBuffMonitoredMonsters.json";

#[derive(Default)]
struct MonsterRegistryCache {
    language: String,
    registry: HashMap<i32, MonsterInfo>,
}

static MONSTER_REGISTRY: LazyLock<parking_lot::RwLock<MonsterRegistryCache>> = LazyLock::new(|| {
    parking_lot::RwLock::new(load_monster_registry().unwrap_or_else(|err| {
        warn!(
            "[monster-registry] failed to load MonsterIdNameType.json: {}",
            err
        );
        MonsterRegistryCache::default()
    }))
});

fn load_monster_registry() -> Result<MonsterRegistryCache> {
    #[derive(Deserialize)]
    struct RawMonsterInfo {
        #[serde(rename = "Name")]
        name: String,
        #[serde(rename = "MonsterType")]
        monster_type: u8,
    }

    let language = data_i18n::current_language();
    let path = data_i18n::locate_localized_json("meter-data", "MonsterIdNameType.json")
        .context("MonsterIdNameType.json not found in known locations")?;
    let data =
        fs::read_to_string(&path).with_context(|| format!("failed to read {}", path.display()))?;
    let raw: HashMap<String, RawMonsterInfo> =
        serde_json::from_str(&data).context("invalid MonsterIdNameType.json")?;

    let mut registry = HashMap::with_capacity(raw.len());
    for (key, info) in raw {
        if let Ok(id) = key.parse::<i32>() {
            let monster_type = match info.monster_type {
                1 => MonsterType::Elite,
                2 => MonsterType::Boss,
                _ => MonsterType::Normal,
            };

            registry.insert(
                id,
                MonsterInfo {
                    name: info.name,
                    monster_type,
                },
            );
        }
    }

    Ok(MonsterRegistryCache { language, registry })
}

static EXTRA_BUFF_MONITORED_MONSTER_IDS: LazyLock<HashSet<i32>> = LazyLock::new(|| {
    load_extra_buff_monitored_monster_ids().unwrap_or_else(|err| {
        warn!(
            "[monster-registry] failed to load {}: {}",
            EXTRA_BUFF_MONITORED_MONSTERS_RELATIVE, err
        );
        HashSet::new()
    })
});

#[derive(Debug, Deserialize)]
struct RawExtraBuffMonitoredMonsters {
    #[serde(rename = "monsterIds")]
    monster_ids: Vec<i32>,
}

fn parse_extra_buff_monitored_monster_ids(
    contents: &str,
) -> Result<HashSet<i32>, serde_json::Error> {
    let raw: RawExtraBuffMonitoredMonsters = serde_json::from_str(contents)?;
    Ok(raw.monster_ids.into_iter().filter(|id| *id > 0).collect())
}

fn load_extra_buff_monitored_monster_ids() -> Result<HashSet<i32>> {
    let path =
        data_i18n::locate_relative_file(EXTRA_BUFF_MONITORED_MONSTERS_RELATIVE).with_context(|| {
            format!(
                "{} not found in known locations",
                EXTRA_BUFF_MONITORED_MONSTERS_RELATIVE
            )
        })?;
    let contents =
        fs::read_to_string(&path).with_context(|| format!("failed to read {}", path.display()))?;
    parse_extra_buff_monitored_monster_ids(&contents)
        .with_context(|| format!("failed to parse {}", path.display()))
}

fn ensure_monster_registry_current() {
    let current_language = data_i18n::current_language();
    if MONSTER_REGISTRY.read().language == current_language {
        return;
    }

    let next = load_monster_registry().unwrap_or_else(|err| {
        warn!(
            "[monster-registry] failed to reload MonsterIdNameType.json: {}",
            err
        );
        MonsterRegistryCache::default()
    });
    *MONSTER_REGISTRY.write() = next;
}

pub fn monster_name(id: i32) -> Option<String> {
    ensure_monster_registry_current();
    MONSTER_REGISTRY.read().registry.get(&id).map(|info| info.name.clone())
}

pub fn monster_type(id: i32) -> Option<MonsterType> {
    ensure_monster_registry_current();
    MONSTER_REGISTRY
        .read()
        .registry
        .get(&id)
        .map(|info| info.monster_type)
}

pub fn is_extra_buff_monitored_monster(id: i32) -> bool {
    EXTRA_BUFF_MONITORED_MONSTER_IDS.contains(&id)
}
