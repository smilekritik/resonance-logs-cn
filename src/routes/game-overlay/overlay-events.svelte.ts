import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  onBuffCounterUpdate,
  onBuffUpdate,
  onFightResUpdate,
  onPanelAttrUpdate,
  onSkillCdUpdate,
  type BuffUpdateState,
  type CounterUpdateState,
} from "$lib/api";
import { commands, type BuffDefinition } from "$lib/bindings";
import {
  ensureBuffGroups,
  ensureCustomPanelStyle,
  ensureIndividualMonitorAllGroup,
  ensureOverlayPositions,
  ensureOverlaySizes,
  ensureOverlayVisibility,
} from "./overlay-utils";
import {
  activeProfile,
  updateActiveProfile,
  monitoredBuffIds,
} from "./overlay-profile.svelte.js";
import { overlayRuntime } from "./overlay-runtime.svelte.js";
import {
  onGlobalPointerMove,
  onGlobalPointerUp,
  setEditMode,
  setOverlayWindow,
} from "./overlay-layout.svelte.js";
import { updateDisplay } from "./overlay-display.svelte.js";

export function initOverlay() {
  if (overlayRuntime.cleanup) return overlayRuntime.cleanup;
  if (typeof window === "undefined") {
    return () => {};
  }

  overlayRuntime.isMounted = true;
  overlayRuntime.isInitialized = true;
  setOverlayWindow(getCurrentWindow());

  document.documentElement.style.setProperty(
    "background",
    "transparent",
    "important",
  );
  document.body.style.setProperty("background", "transparent", "important");

  ensureActiveProfileDefaults();
  void setEditMode(false);
  void loadAvailableBuffs();
  syncMonitoredBuffNames();

  const unlistenEditToggle = listen("overlay-edit-toggle", () => {
    void setEditMode(!overlayRuntime.isEditing);
  });
  const unlistenBuff = onBuffUpdate((event) => {
    const next = new Map<number, BuffUpdateState>();
    for (const buff of event.payload.buffs) {
      const existing = next.get(buff.baseId);
      if (!existing || buff.createTimeMs >= existing.createTimeMs) {
        next.set(buff.baseId, buff);
      }
    }
    overlayRuntime.buffMap = next;
    void preloadBuffNames(Array.from(next.keys()));
  });
  const unlistenCounter = onBuffCounterUpdate((event) => {
    const next = new Map<number, CounterUpdateState>();
    for (const counter of event.payload.counters) {
      next.set(counter.ruleId, counter);
    }
    overlayRuntime.counterMap = next;
  });
  const unlistenCd = onSkillCdUpdate((event) => {
    const next = new Map(overlayRuntime.cdMap);
    for (const cd of event.payload.skillCds) {
      const baseId = Math.floor(cd.skillLevelId / 100);
      next.set(baseId, cd);
    }
    overlayRuntime.cdMap = next;
  });
  const unlistenRes = onFightResUpdate((event) => {
    overlayRuntime.fightResValues = event.payload.fightRes.values;
  });
  const unlistenPanelAttr = onPanelAttrUpdate((event) => {
    const next = new Map(overlayRuntime.panelAttrMap);
    for (const attr of event.payload.attrs) {
      next.set(attr.attrId, attr.value);
    }
    overlayRuntime.panelAttrMap = next;
  });

  window.addEventListener("pointermove", onGlobalPointerMove);
  window.addEventListener("pointerup", onGlobalPointerUp);
  overlayRuntime.rafId = requestAnimationFrame(updateDisplay);

  overlayRuntime.cleanup = () => {
    overlayRuntime.isMounted = false;
    overlayRuntime.isInitialized = false;
    overlayRuntime.dragState = null;
    overlayRuntime.resizeState = null;
    unlistenEditToggle.then((fn) => fn());
    unlistenBuff.then((fn) => fn());
    unlistenCounter.then((fn) => fn());
    unlistenCd.then((fn) => fn());
    unlistenRes.then((fn) => fn());
    unlistenPanelAttr.then((fn) => fn());
    window.removeEventListener("pointermove", onGlobalPointerMove);
    window.removeEventListener("pointerup", onGlobalPointerUp);
    if (overlayRuntime.rafId) {
      cancelAnimationFrame(overlayRuntime.rafId);
      overlayRuntime.rafId = null;
    }
    setOverlayWindow(null);
    overlayRuntime.cleanup = null;
  };

  return overlayRuntime.cleanup;
}

export async function loadBuffNames(baseIds: number[]) {
  if (!overlayRuntime.isInitialized || baseIds.length === 0) return;
  const uniq = Array.from(new Set(baseIds)).filter(
    (id) => !overlayRuntime.buffNameMap.has(id),
  );
  if (uniq.length === 0) return;
  const res = await commands.getBuffNames(uniq);
  if (res.status !== "ok") return;
  const next = new Map(overlayRuntime.buffNameMap);
  for (const item of res.data) {
    next.set(item.baseId, item.name);
  }
  overlayRuntime.buffNameMap = next;
}

export function syncMonitoredBuffNames() {
  const ids = monitoredBuffIds();
  if (ids.length === 0) return;
  void preloadBuffNames(ids);
}

function preloadBuffNames(baseIds: number[]) {
  return loadBuffNames(baseIds);
}

async function loadAvailableBuffs() {
  const res = await commands.getAvailableBuffs();
  if (res.status !== "ok") return;
  const next = new Map<number, BuffDefinition>();
  for (const buff of res.data) {
    next.set(buff.baseId, buff);
  }
  overlayRuntime.buffDefinitions = next;
}

function ensureActiveProfileDefaults() {
  const profile = activeProfile();
  if (
    profile &&
    (!profile.overlayPositions ||
      !profile.overlaySizes ||
      !profile.overlayVisibility ||
      !profile.buffDisplayMode ||
      !profile.buffGroups ||
      !profile.customPanelStyle ||
      !profile.textBuffMaxVisible)
  ) {
    updateActiveProfile((profile) => ({
      ...profile,
      overlayPositions: ensureOverlayPositions(profile),
      overlaySizes: ensureOverlaySizes(profile),
      overlayVisibility: ensureOverlayVisibility(profile),
      buffDisplayMode: profile.buffDisplayMode ?? "individual",
      buffGroups: ensureBuffGroups(profile),
      individualMonitorAllGroup: ensureIndividualMonitorAllGroup(profile),
      customPanelStyle: ensureCustomPanelStyle(profile),
      textBuffMaxVisible: Math.max(
        1,
        Math.min(20, profile.textBuffMaxVisible ?? 10),
      ),
    }));
  }
}
