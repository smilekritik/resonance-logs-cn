use crate::data_i18n;
use log::warn;
use parking_lot::RwLock;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::sync::LazyLock;

/// Stores cached scene names to minimize JSON reloads.
#[derive(Default)]
struct SceneNameCache {
    language: String,
    names: HashMap<i32, String>,
}

static SCENE_NAME_CACHE: LazyLock<RwLock<SceneNameCache>> = LazyLock::new(|| {
    let cache = load_scene_names();
    RwLock::new(cache)
});

/// Returns the name for the given scene id, or a default string if not found.
pub fn lookup(scene_id: i32) -> String {
    ensure_scene_names_current();
    let cache = SCENE_NAME_CACHE.read();
    cache
        .names
        .get(&scene_id)
        .cloned()
        .unwrap_or_else(|| format!("Unknown Scene {}", scene_id))
}

/// Returns the scene name with optional dungeon difficulty suffix.
pub fn lookup_with_difficulty(scene_id: i32, difficulty: Option<i32>) -> String {
    let base_name = lookup(scene_id);
    match difficulty {
        Some(v) => format!("{}-{}", base_name, v),
        None => base_name,
    }
}

/// Returns true if a scene id exists in the loaded scene map.
pub fn contains(scene_id: i32) -> bool {
    ensure_scene_names_current();
    let cache = SCENE_NAME_CACHE.read();
    cache.names.contains_key(&scene_id)
}

fn ensure_scene_names_current() {
    let current_language = data_i18n::current_language();
    if SCENE_NAME_CACHE.read().language == current_language {
        return;
    }

    *SCENE_NAME_CACHE.write() = load_scene_names();
}

/// Loads the scene names JSON file and builds a lookup map from id to display name.
fn load_scene_names() -> SceneNameCache {
    let language = data_i18n::current_language();
    let Some(path) = data_i18n::locate_localized_json("meter-data", "SceneName.json") else {
        warn!("Failed to locate localized SceneName.json");
        return SceneNameCache {
            language,
            names: HashMap::new(),
        };
    };
    let mut names = HashMap::new();

    match fs::read_to_string(&path) {
        Ok(data) => match serde_json::from_str::<Value>(&data) {
            Ok(Value::Object(root)) => {
                for (id_str, name_value) in root {
                    if let Ok(scene_id) = id_str.parse::<i32>() {
                        if let Some(name) = name_value.as_str() {
                            names.insert(scene_id, name.to_string());
                        }
                    }
                }
            }
            Ok(_) => {
                warn!("Scene names JSON is not an object at {}", path.display());
            }
            Err(err) => {
                warn!(
                    "Failed to parse scene names JSON at {}: {}",
                    path.display(),
                    err
                );
            }
        },
        Err(err) => {
            warn!(
                "Failed to read scene names JSON at {}: {}",
                path.display(),
                err
            );
        }
    }

    SceneNameCache { language, names }
}
