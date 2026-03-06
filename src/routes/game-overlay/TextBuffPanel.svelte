<script lang="ts">
  import {
    getGroupPosition,
    getGroupScale,
    isEditing,
    limitedTextBuffs,
    startDrag,
    startResize,
  } from "./overlay-state.svelte.js";

  const editing = $derived(isEditing());
  const buffs = $derived(limitedTextBuffs());
  const groupPos = $derived(getGroupPosition("textBuffPanel"));
  const groupScale = $derived(getGroupScale("textBuffPanelScale"));
</script>

{#if buffs.length > 0}
  <div
    class="overlay-group text-buff-panel"
    class:editable={editing}
    style:left={`${groupPos.x}px`}
    style:top={`${groupPos.y}px`}
    style:transform={`scale(${groupScale})`}
    style:transform-origin="top left"
    onpointerdown={(e) => startDrag(e, { kind: "group", key: "textBuffPanel" }, groupPos)}
  >
    {#if editing}
      <div class="group-tag">无图标Buff区</div>
    {/if}

    {#each buffs as buff (buff.baseId)}
      <div class="text-buff-row" class:placeholder={buff.isPlaceholder}>
        <div class="text-buff-name">{buff.name}</div>
        <div class="text-buff-time">{buff.text}</div>
        <div class="text-buff-decay">
          <div class="text-buff-decay-fill" style:width={`${buff.remainPercent}%`}></div>
        </div>
        {#if buff.layer > 1}
          <div class="text-buff-layer">x{buff.layer}</div>
        {/if}
      </div>
    {/each}

    {#if editing}
      <div
        class="resize-handle"
        onpointerdown={(e) =>
          startResize(
            e,
            { kind: "group", key: "textBuffPanelScale" },
            groupScale,
          )}
      ></div>
    {/if}
  </div>
{/if}

<style>
  .text-buff-panel {
    min-width: 220px;
    max-width: 320px;
    padding: 0;
    border-radius: 0;
    background: transparent;
    border: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .text-buff-panel.editable {
    border: 2px solid rgba(102, 204, 255, 0.9);
    border-radius: 10px;
    background: rgba(20, 36, 56, 0.45);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
    padding: 8px;
  }

  .text-buff-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 8px;
  }

  .text-buff-row.placeholder {
    opacity: 0.6;
  }

  .text-buff-name {
    font-size: 12px;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .text-buff-time {
    font-size: 12px;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
  }

  .text-buff-decay {
    grid-column: 1 / -1;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
    overflow: hidden;
  }

  .text-buff-decay-fill {
    height: 100%;
    background: #ffffff;
    transition: width 100ms linear;
  }

  .text-buff-layer {
    grid-column: 1 / -1;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
  }
</style>
