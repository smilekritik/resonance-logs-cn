<script lang="ts">
  import {
    customPanelRows,
    customPanelStyle,
    getGroupPosition,
    getGroupScale,
    isEditing,
    startDrag,
    startResize,
  } from "./overlay-state.svelte.js";

  const editing = $derived(isEditing());
  const rows = $derived(customPanelRows());
  const styleConfig = $derived(customPanelStyle());
  const groupPos = $derived(getGroupPosition("customPanelGroup"));
  const groupScale = $derived(getGroupScale("customPanelGroupScale"));
</script>

{#if rows.length > 0 || editing}
  <div
    class="overlay-group custom-panel-group"
    class:editable={editing}
    style:left={`${groupPos.x}px`}
    style:top={`${groupPos.y}px`}
    style:transform={`scale(${groupScale})`}
    style:transform-origin="top left"
    onpointerdown={(e) =>
      startDrag(e, { kind: "group", key: "customPanelGroup" }, groupPos)}
  >
    {#if editing}
      <div class="group-tag">自定义面板区</div>
    {/if}

    <div class="custom-panel-list" style:gap={`${styleConfig.gap}px`}>
      {#each rows as row (row.key)}
        <div class="custom-panel-row">
          <div class="custom-panel-main" style:gap={`${styleConfig.columnGap}px`}>
            <span
              class="custom-panel-label"
              style:font-size={`${styleConfig.fontSize}px`}
              style:color={styleConfig.nameColor}
            >
              {row.label}
            </span>
            <span
              class="custom-panel-value"
              style:font-size={`${Math.max(10, styleConfig.fontSize + 2)}px`}
              style:color={styleConfig.valueColor}
            >
              {row.valueText}
            </span>
          </div>
          {#if row.showProgress}
            <div class="custom-panel-progress">
              <div
                class="custom-panel-progress-fill"
                style:width={`${row.progressPercent}%`}
                style:background={styleConfig.progressColor}
              ></div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if editing}
      <div
        class="resize-handle"
        onpointerdown={(e) =>
          startResize(
            e,
            { kind: "group", key: "customPanelGroupScale" },
            groupScale,
          )}
      ></div>
    {/if}
  </div>
{/if}

<style>
  .custom-panel-group {
    min-width: 220px;
  }

  .custom-panel-group.editable {
    border: 2px solid rgba(102, 204, 255, 0.9);
    border-radius: 10px;
    background: rgba(20, 36, 56, 0.45);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
    padding: 8px;
  }

  .custom-panel-list {
    display: flex;
    flex-direction: column;
    min-width: 220px;
  }

  .custom-panel-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .custom-panel-main {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .custom-panel-label {
    font-weight: 600;
    line-height: 1;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .custom-panel-value {
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .custom-panel-progress {
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    overflow: hidden;
  }

  .custom-panel-progress-fill {
    height: 100%;
    transition: width 100ms linear;
  }
</style>
