<script lang="ts">
  import BuffGroupGrid from "./BuffGroupGrid.svelte";
  import IconBuffCell from "./IconBuffCell.svelte";
  import {
    getIconBuffPosition,
    getIconBuffSize,
    individualAllGroupBuffs,
    individualModeIconBuffs,
    individualMonitorAllGroup,
    isEditing,
    startDrag,
    startResize,
  } from "./overlay-state.svelte.js";

  const editing = $derived(isEditing());
  const individualBuffs = $derived(individualModeIconBuffs());
  const allGroup = $derived(individualMonitorAllGroup());
  const allGroupBuffs = $derived(individualAllGroupBuffs());
</script>

{#each individualBuffs as buff (buff.baseId)}
  {@const iconPos = getIconBuffPosition(buff.baseId)}
  {@const iconSize = getIconBuffSize(buff.baseId)}
  <IconBuffCell
    {buff}
    {iconSize}
    standalone={true}
    editable={editing}
    left={iconPos.x}
    top={iconPos.y}
    onPointerDown={(e) => startDrag(e, { kind: "iconBuff", baseId: buff.baseId }, iconPos)}
    onResizePointerDown={(e) =>
      startResize(e, { kind: "iconBuff", baseId: buff.baseId }, iconSize)}
  />
{/each}

{#if allGroup && (allGroupBuffs.length > 0 || editing)}
  {@const group = allGroup}
  {@const maxVisible = Math.max(1, group.columns * group.rows)}
  <BuffGroupGrid
    {group}
    buffs={allGroupBuffs.slice(0, maxVisible)}
    editable={editing}
    tagText={`${group.name}（全部）`}
    onPointerDown={(e) => startDrag(e, { kind: "individualAllGroup" }, group.position)}
    onResizePointerDown={(e) =>
      startResize(e, { kind: "individualAllGroup" }, group.iconSize)}
  />
{/if}
