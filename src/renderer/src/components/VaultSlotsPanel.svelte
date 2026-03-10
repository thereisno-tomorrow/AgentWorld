<script lang="ts">
  import type { VaultDisplay, MajorQuest } from '../lib/types'
  import VaultColumn from './VaultColumn.svelte'

  const DEFAULT_HEIGHT = 400
  const MIN_HEIGHT = 120

  let {
    slots,
    vaults,
    majorQuests,
    onSlotsChange,
    onOpenConversation,
    activeConversationId = null
  }: {
    slots: (string | null)[]
    vaults: VaultDisplay[]
    majorQuests: MajorQuest[]
    onSlotsChange: (newSlots: (string | null)[]) => void
    onOpenConversation: (id: string, vaultPath: string) => void
    activeConversationId?: string | null
  } = $props()

  let dragOverSlot = $state<number | null>(null)
  let slotHeights = $state<number[]>(
    JSON.parse(localStorage.getItem('agentworld:slot-heights') ?? '[]') as number[]
  )

  // Resize state
  let resizingIndex = $state<number | null>(null)
  let resizeStartY = 0
  let resizeStartHeight = 0

  function getHeight(i: number): number {
    return slotHeights[i] ?? DEFAULT_HEIGHT
  }

  function saveHeights(heights: number[]): void {
    slotHeights = heights
    localStorage.setItem('agentworld:slot-heights', JSON.stringify(heights))
  }

  function startResize(e: MouseEvent, i: number): void {
    e.preventDefault()
    resizingIndex = i
    resizeStartY = e.clientY
    resizeStartHeight = getHeight(i)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ns-resize'
  }

  $effect(() => {
    function onMouseMove(e: MouseEvent): void {
      if (resizingIndex === null) return
      const delta = e.clientY - resizeStartY
      const newHeight = Math.max(MIN_HEIGHT, resizeStartHeight + delta)
      const next = [...slotHeights]
      next[resizingIndex] = newHeight
      slotHeights = next
    }

    function onMouseUp(): void {
      if (resizingIndex === null) return
      saveHeights([...slotHeights])
      resizingIndex = null
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  })

  function getVault(path: string | null): VaultDisplay | null {
    if (!path) return null
    return vaults.find((v) => v.path === path) ?? null
  }

  function handleSlotDragOver(e: DragEvent, slotIndex: number): void {
    e.preventDefault()
    dragOverSlot = slotIndex
  }

  function handleSlotDragLeave(slotIndex: number): void {
    if (dragOverSlot === slotIndex) dragOverSlot = null
  }

  function handleSlotDrop(e: DragEvent, slotIndex: number): void {
    e.preventDefault()
    dragOverSlot = null
    const vaultPath = e.dataTransfer!.getData('vault-path')
    const fromSlotStr = e.dataTransfer!.getData('from-slot-index')
    if (!vaultPath) return

    const newSlots = [...slots]

    if (fromSlotStr !== '') {
      // Dragging from another slot — swap
      const fromSlot = parseInt(fromSlotStr)
      if (!isNaN(fromSlot) && fromSlot !== slotIndex) {
        const targetPath = newSlots[slotIndex]
        newSlots[fromSlot] = targetPath ?? null
      }
    } else {
      // Dragging from nav pane — move (remove from any existing slot first)
      const existingSlot = newSlots.findIndex((p) => p === vaultPath)
      if (existingSlot !== -1 && existingSlot !== slotIndex) {
        newSlots[existingSlot] = null
      }
    }

    newSlots[slotIndex] = vaultPath
    onSlotsChange(newSlots)
  }

  function removeSlot(i: number): void {
    const nextHeights = slotHeights.filter((_, idx) => idx !== i)
    saveHeights(nextHeights)
    onSlotsChange(slots.filter((_, idx) => idx !== i))
  }

  function addSlot(): void {
    onSlotsChange([...slots, null])
  }
</script>

<div class="slots-panel">
  {#each slots as slotPath, i (i)}
    {@const vault = getVault(slotPath)}
    <div
      class="slot"
      class:slot--drag-over={dragOverSlot === i}
      style={vault ? `height: ${getHeight(i)}px` : undefined}
      ondragover={(e) => handleSlotDragOver(e, i)}
      ondragleave={() => handleSlotDragLeave(i)}
      ondrop={(e) => handleSlotDrop(e, i)}
      role="region"
      aria-label="Vault slot {i + 1}"
    >
      {#if vault}
        <div class="slot-controls">
          <button
            class="slot-close"
            onclick={() => removeSlot(i)}
            title="Remove from slot"
            type="button"
            aria-label="Remove vault from slot"
          >×</button>
        </div>
        <div class="slot-content">
          <VaultColumn
            {vault}
            {majorQuests}
            {onOpenConversation}
            {activeConversationId}
            slotMode={true}
          />
        </div>
          <div
            class="slot-resize-handle"
            class:slot-resize-handle--active={resizingIndex === i}
            onmousedown={(e) => startResize(e, i)}
            role="separator"
            aria-label="Drag to resize slot"
          ></div>
      {:else}
        <div class="slot-empty">
          <span class="slot-empty-text">drop a vault here</span>
        </div>
      {/if}
    </div>
  {/each}
  <button class="add-slot" onclick={addSlot} type="button">+ add slot</button>
</div>

<style>
  .slots-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .slot {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--panel-border);
    position: relative;
    transition: background 0.1s;
  }

  .slot:last-of-type {
    border-bottom: none;
  }

  .slot--drag-over {
    background: rgba(201, 162, 39, 0.05);
    outline: 1px dashed rgba(201, 162, 39, 0.4);
    outline-offset: -2px;
  }


  .slot-controls {
    position: absolute;
    top: 6px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 2px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .slot:hover .slot-controls {
    opacity: 1;
  }

  .slot-close {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #666668;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    transition: color 0.1s;
    font-family: var(--font-sans);
  }

  .slot-close:hover {
    color: #e44;
  }

  .slot-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .slot-resize-handle {
    flex-shrink: 0;
    height: 8px;
    cursor: ns-resize;
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .slot-resize-handle::after {
    content: '';
    display: block;
    width: 100%;
    height: 1px;
    background: rgba(201, 162, 39, 0.35);
    transition: background 0.15s;
  }

  .slot-resize-handle:hover::after,
  .slot-resize-handle--active::after {
    background: rgba(201, 162, 39, 0.9);
  }

  .slot-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #252528;
    margin: 16px;
    border-radius: 2px;
    min-height: 80px;
  }

  .slot-empty-text {
    font-size: 11px;
    color: #383838;
    font-family: var(--font-mono);
    letter-spacing: 0.05em;
  }

  .add-slot {
    margin: 8px 16px 16px;
    padding: 4px 10px;
    background: none;
    border: 1px dashed #2a2a30;
    color: #444448;
    font-size: 11px;
    font-family: var(--font-mono);
    letter-spacing: 0.05em;
    cursor: pointer;
    text-align: left;
    transition: color 0.1s, border-color 0.1s;
    align-self: flex-start;
    flex-shrink: 0;
  }

  .add-slot:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
