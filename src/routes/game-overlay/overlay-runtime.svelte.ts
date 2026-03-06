import { getCurrentWindow } from "@tauri-apps/api/window";
import type {
  BuffUpdateState,
  CounterUpdateState,
  SkillCdState,
} from "$lib/api";
import type { BuffDefinition } from "$lib/bindings";
import type {
  DragState,
  IconBuffDisplay,
  ResizeState,
  SkillDisplay,
  TextBuffDisplay,
} from "./overlay-types";

export const overlayRuntime = $state({
  currentWindow: null as ReturnType<typeof getCurrentWindow> | null,
  cleanup: null as (() => void) | null,
  isInitialized: false,
  isMounted: false,
  rafId: null as number | null,
  cdMap: new Map<number, SkillCdState>(),
  displayMap: new Map<number, SkillDisplay>(),
  fightResValues: [] as number[],
  buffMap: new Map<number, BuffUpdateState>(),
  activeBuffIds: new Set<number>(),
  buffDurationPercents: new Map<number, number>(),
  counterMap: new Map<number, CounterUpdateState>(),
  panelAttrMap: new Map<number, number>(),
  buffDefinitions: new Map<number, BuffDefinition>(),
  buffNameMap: new Map<number, string>(),
  iconDisplayBuffs: [] as IconBuffDisplay[],
  textBuffs: [] as TextBuffDisplay[],
  isEditing: false,
  dragState: null as DragState | null,
  resizeState: null as ResizeState | null,
});

export function cdMap() {
  return overlayRuntime.cdMap;
}

export function displayMap() {
  return overlayRuntime.displayMap;
}

export function fightResValues() {
  return overlayRuntime.fightResValues;
}

export function buffMap() {
  return overlayRuntime.buffMap;
}

export function activeBuffIds() {
  return overlayRuntime.activeBuffIds;
}

export function buffDurationPercents() {
  return overlayRuntime.buffDurationPercents;
}

export function counterMap() {
  return overlayRuntime.counterMap;
}

export function panelAttrMap() {
  return overlayRuntime.panelAttrMap;
}

export function buffDefinitions() {
  return overlayRuntime.buffDefinitions;
}

export function buffNameMap() {
  return overlayRuntime.buffNameMap;
}

export function iconDisplayBuffs() {
  return overlayRuntime.iconDisplayBuffs;
}

export function textBuffs() {
  return overlayRuntime.textBuffs;
}

export function isEditing() {
  return overlayRuntime.isEditing;
}

export function dragState() {
  return overlayRuntime.dragState;
}

export function resizeState() {
  return overlayRuntime.resizeState;
}
