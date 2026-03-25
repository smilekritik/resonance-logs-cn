use parking_lot::RwLock;
use std::path::PathBuf;
use std::sync::LazyLock;

static DATA_LANGUAGE: LazyLock<RwLock<String>> = LazyLock::new(|| RwLock::new("zh-CN".to_string()));

fn normalize_language(language: &str) -> String {
    let normalized = language.trim();
    if normalized.is_empty() || normalized.eq_ignore_ascii_case("system") {
        "zh-CN".to_string()
    } else {
        normalized.to_string()
    }
}

pub fn set_language(language: &str) {
    *DATA_LANGUAGE.write() = normalize_language(language);
}

pub fn current_language() -> String {
    DATA_LANGUAGE.read().clone()
}

fn language_candidates(language: &str) -> Vec<String> {
    let normalized = normalize_language(language);
    let mut candidates = Vec::new();

    let push = |items: &mut Vec<String>, value: String| {
        if !items.contains(&value) {
            items.push(value);
        }
    };

    push(&mut candidates, normalized.clone());
    if let Some((base, _)) = normalized.split_once('-') {
        push(&mut candidates, base.to_string());
    }
    push(&mut candidates, "zh-CN".to_string());

    candidates
}

pub fn locate_relative_file(relative_path: &str) -> Option<PathBuf> {
    let mut path = PathBuf::from(relative_path);
    if path.exists() {
        return Some(path);
    }

    path = PathBuf::from(format!("src-tauri/{}", relative_path));
    if path.exists() {
        return Some(path);
    }

    if let Ok(mut exe_dir) = std::env::current_exe() {
        exe_dir.pop();
        let candidate = exe_dir.join(relative_path);
        if candidate.exists() {
            return Some(candidate);
        }
    }

    None
}

pub fn locate_localized_json(base_dir: &str, file_name: &str) -> Option<PathBuf> {
    let language = current_language();
    for candidate in language_candidates(&language) {
        if candidate == "zh-CN" {
            let fallback_relative = format!("{}/{}", base_dir, file_name);
            if let Some(path) = locate_relative_file(&fallback_relative) {
                return Some(path);
            }
            continue;
        }

        let localized_relative = format!("{}/{}/{}", base_dir, candidate, file_name);
        if let Some(path) = locate_relative_file(&localized_relative) {
            return Some(path);
        }
    }

    locate_relative_file(&format!("{}/{}", base_dir, file_name))
}
