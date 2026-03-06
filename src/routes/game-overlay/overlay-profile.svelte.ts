import {
  AVAILABLE_PANEL_ATTRS,
  SETTINGS,
  type CustomPanelStyle,
  type InlineBuffEntry,
  type PanelAttrConfig,
} from "$lib/settings-store";
import { DEFAULT_OVERLAY_VISIBILITY } from "./overlay-constants";
import {
  ensureCustomPanelStyle,
  ensureInlineBuffEntries,
} from "./overlay-utils";

const _activeProfileIndex = $derived.by(() => {
  const profiles = SETTINGS.skillMonitor.state.profiles;
  if (profiles.length === 0) return 0;
  return Math.min(
    Math.max(SETTINGS.skillMonitor.state.activeProfileIndex, 0),
    profiles.length - 1,
  );
});

const _activeProfile = $derived.by(() => {
  const profiles = SETTINGS.skillMonitor.state.profiles;
  return profiles[_activeProfileIndex] ?? null;
});

const _selectedClassKey = $derived.by(
  () => _activeProfile?.selectedClass ?? "wind_knight",
);
const _monitoredSkillIds = $derived.by(
  () => _activeProfile?.monitoredSkillIds ?? [],
);
const _monitoredBuffIds = $derived.by(
  () => _activeProfile?.monitoredBuffIds ?? [],
);
const _buffDisplayMode = $derived.by(
  () => _activeProfile?.buffDisplayMode ?? "individual",
);
const _textBuffMaxVisible = $derived.by(() =>
  Math.max(1, Math.min(20, _activeProfile?.textBuffMaxVisible ?? 10)),
);
const _overlayVisibility = $derived.by(
  () => _activeProfile?.overlayVisibility ?? DEFAULT_OVERLAY_VISIBILITY,
);
const _customPanelStyle = $derived.by<CustomPanelStyle>(() =>
  ensureCustomPanelStyle(_activeProfile),
);
const _monitoredPanelAttrs = $derived.by(() => {
  const current = _activeProfile?.monitoredPanelAttrs ?? [];
  const currentMap = new Map(current.map((item) => [item.attrId, item]));
  return AVAILABLE_PANEL_ATTRS.map((item) => {
    const existing = currentMap.get(item.attrId);
    return {
      attrId: item.attrId,
      label: existing?.label ?? item.label,
      color: existing?.color ?? item.color,
      enabled: existing?.enabled ?? item.enabled,
      format: existing?.format ?? item.format,
    } satisfies PanelAttrConfig;
  });
});
const _enabledPanelAttrs = $derived.by(() =>
  _monitoredPanelAttrs.filter((item) => item.enabled),
);
const _inlineBuffEntries = $derived.by<InlineBuffEntry[]>(() => {
  if (!_activeProfile) return [];
  return ensureInlineBuffEntries(_activeProfile);
});
const _inlineBuffIds = $derived.by(
  () =>
    new Set(
      _inlineBuffEntries
        .filter((entry) => entry.sourceType === "buff")
        .map((entry) => entry.sourceId),
    ),
);

export function activeProfileIndex() {
  return _activeProfileIndex;
}

export function activeProfile() {
  return _activeProfile;
}

export function selectedClassKey() {
  return _selectedClassKey;
}

export function monitoredSkillIds() {
  return _monitoredSkillIds;
}

export function monitoredBuffIds() {
  return _monitoredBuffIds;
}

export function buffDisplayMode() {
  return _buffDisplayMode;
}

export function textBuffMaxVisible() {
  return _textBuffMaxVisible;
}

export function overlayVisibility() {
  return _overlayVisibility;
}

export function customPanelStyle() {
  return _customPanelStyle;
}

export function monitoredPanelAttrs() {
  return _monitoredPanelAttrs;
}

export function enabledPanelAttrs() {
  return _enabledPanelAttrs;
}

export function inlineBuffEntries() {
  return _inlineBuffEntries;
}

export function inlineBuffIds() {
  return _inlineBuffIds;
}

export function updateActiveProfile(
  updater: (
    profile: (typeof SETTINGS.skillMonitor.state.profiles)[number],
  ) => (typeof SETTINGS.skillMonitor.state.profiles)[number],
) {
  const state = SETTINGS.skillMonitor.state;
  const profiles = state.profiles;
  if (profiles.length === 0) return;
  const index = Math.min(
    Math.max(state.activeProfileIndex, 0),
    profiles.length - 1,
  );
  state.profiles = profiles.map((profile, i) =>
    i === index ? updater(profile) : profile,
  );
}
