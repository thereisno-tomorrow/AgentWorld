<script lang="ts">
  import type { VaultDisplay, MajorQuest } from '../lib/types'
  import VaultColumn from './VaultColumn.svelte'

  let {
    vaults,
    majorQuests,
    selectedVaultPath,
    onSelectVault,
    onOpenConversation,
    activeConversationId = null
  }: {
    vaults: VaultDisplay[]
    majorQuests: MajorQuest[]
    selectedVaultPath: string | null
    onSelectVault: (path: string) => void
    onOpenConversation: (id: string, vaultPath: string) => void
    activeConversationId?: string | null
  } = $props()

  // Persist column order across sessions
  let vaultOrder = $state<string[]>((() => {
    try {
      const saved = localStorage.getItem('agentworld:vault-order')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })())

  let draggedPath = $state<string | null>(null)
  let dragOverPath = $state<string | null>(null)

  // Merge saved order with current vaults — new vaults append to end, removed vaults drop out
  let orderedVaults = $derived.by(() => {
    const known = new Set(vaultOrder)
    const newPaths = vaults.filter((v) => !known.has(v.path)).map((v) => v.path)
    const fullOrder = [...vaultOrder, ...newPaths].filter((p) => vaults.some((v) => v.path === p))
    return fullOrder.map((p) => vaults.find((v) => v.path === p)!).filter(Boolean)
  })

  function saveOrder(order: string[]): void {
    try {
      localStorage.setItem('agentworld:vault-order', JSON.stringify(order))
    } catch {}
  }

  function handleDragStart(e: DragEvent, path: string): void {
    draggedPath = path
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('text/plain', path)
  }

  function handleDragOver(e: DragEvent, path: string): void {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'move'
    if (path !== draggedPath) dragOverPath = path
  }

  function handleDrop(e: DragEvent, targetPath: string): void {
    e.preventDefault()
    if (!draggedPath || draggedPath === targetPath) return
    const order = orderedVaults.map((v) => v.path)
    const fromIdx = order.indexOf(draggedPath)
    const toIdx = order.indexOf(targetPath)
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, draggedPath)
    vaultOrder = order
    saveOrder(order)
    draggedPath = null
    dragOverPath = null
  }

  function handleDragEnd(): void {
    draggedPath = null
    dragOverPath = null
  }
</script>

<div class="board" ondragover={(e) => e.preventDefault()}>
  {#each orderedVaults as vault (vault.path)}
    <div
      class="col-wrapper"
      class:dragging={draggedPath === vault.path}
      class:drag-over={dragOverPath === vault.path}
      draggable="true"
      ondragstart={(e) => handleDragStart(e, vault.path)}
      ondragover={(e) => handleDragOver(e, vault.path)}
      ondrop={(e) => handleDrop(e, vault.path)}
      ondragend={handleDragEnd}
    >
      <VaultColumn
        {vault}
        {majorQuests}
        isSelected={selectedVaultPath === vault.path}
        {onSelectVault}
        {onOpenConversation}
        {activeConversationId}
      />
    </div>
  {/each}
</div>

<style>
  .board {
    display: flex;
    flex-direction: row;
    gap: 10px;
    padding: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    height: 100%;
    align-items: stretch;
    scrollbar-width: thin;
    scrollbar-color: #3a3a3e transparent;
  }

  .board::-webkit-scrollbar {
    height: 6px;
  }

  .board::-webkit-scrollbar-track {
    background: transparent;
  }

  .board::-webkit-scrollbar-thumb {
    background: #c8c8c0;
  }

  .col-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: grab;
    transition: opacity 0.15s;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.12));
  }

  .col-wrapper:active {
    cursor: grabbing;
  }

  .col-wrapper.dragging {
    opacity: 0.35;
  }

  .col-wrapper.drag-over::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--accent, #c9a227);
    pointer-events: none;
  }
</style>
