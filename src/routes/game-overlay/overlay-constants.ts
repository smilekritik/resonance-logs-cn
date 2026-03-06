import type {
  OverlayPositions,
  OverlaySizes,
  OverlayVisibility,
} from "$lib/settings-store";

export const RESOURCE_SCALES: Record<number, number> = {
  4: 100,
  5: 100,
};

export const DEFAULT_RESOURCE_VALUES_BY_CLASS: Record<
  string,
  Record<number, number>
> = {
  wind_knight: { 4: 130, 5: 130, 6: 6, 7: 6 },
  frost_mage: { 4: 0, 5: 125, 6: 0, 7: 4 },
};

export const DEFAULT_OVERLAY_POSITIONS: OverlayPositions = {
  skillCdGroup: { x: 40, y: 40 },
  resourceGroup: { x: 40, y: 170 },
  textBuffPanel: { x: 360, y: 40 },
  specialBuffGroup: { x: 360, y: 220 },
  panelAttrGroup: { x: 700, y: 40 },
  customPanelGroup: { x: 700, y: 280 },
  iconBuffPositions: {},
};

export const DEFAULT_OVERLAY_SIZES: OverlaySizes = {
  skillCdGroupScale: 1,
  resourceGroupScale: 1,
  textBuffPanelScale: 1,
  panelAttrGroupScale: 1,
  customPanelGroupScale: 1,
  panelAttrGap: 4,
  panelAttrFontSize: 14,
  panelAttrColumnGap: 12,
  iconBuffSizes: {},
};

export const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = {
  showSkillCdGroup: true,
  showResourceGroup: true,
  showPanelAttrGroup: true,
  showCustomPanelGroup: true,
};
