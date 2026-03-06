import type {
  OverlayPositions,
  OverlaySizes,
  PanelAttrConfig,
} from "$lib/settings-store";

export type SkillDisplay = {
  isActive: boolean;
  percent: number;
  text: string;
  chargesText?: string;
};

export type IconBuffDisplay = {
  baseId: number;
  name: string;
  spriteFile: string;
  text: string;
  layer: number;
  isPlaceholder?: boolean;
  specialImages?: string[];
};

export type TextBuffDisplay = {
  baseId: number;
  name: string;
  text: string;
  remainPercent: number;
  layer: number;
  isPlaceholder?: boolean;
};

export type PanelAreaDisplayRow = {
  key: string;
  attr: PanelAttrConfig;
};

export type DragTarget =
  | { kind: "group"; key: keyof Omit<OverlayPositions, "iconBuffPositions"> }
  | { kind: "iconBuff"; baseId: number }
  | { kind: "buffGroup"; groupId: string }
  | { kind: "individualAllGroup" };

export type DragState = {
  target: DragTarget;
  startX: number;
  startY: number;
  startPos: { x: number; y: number };
};

export type ResizeTarget =
  | { kind: "group"; key: keyof Omit<OverlaySizes, "iconBuffSizes"> }
  | { kind: "iconBuff"; baseId: number }
  | { kind: "buffGroup"; groupId: string }
  | { kind: "individualAllGroup" };

export type ResizeState = {
  target: ResizeTarget;
  startX: number;
  startY: number;
  startValue: number;
};

export type CustomPanelDisplayRow = {
  key: string;
  label: string;
  valueText: string;
  progressPercent: number;
  showProgress: boolean;
};
