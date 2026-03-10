<script lang="ts">
  import type { VaultDisplay } from '../lib/types'

  let {
    vaults,
    pinnedPaths
  }: {
    vaults: VaultDisplay[]
    pinnedPaths: (string | null)[]
  } = $props()

  function isPinned(path: string): boolean {
    return pinnedPaths.some((p) => p === path)
  }

  function handleDragStart(e: DragEvent, path: string): void {
    e.dataTransfer!.setData('vault-path', path)
    e.dataTransfer!.setData('from-slot-index', '')
    e.dataTransfer!.effectAllowed = 'copy'
  }
</script>

<div class="nav-pane">
  {#each vaults as vault (vault.path)}
    <div
      class="nav-row"
      class:nav-row--pinned={isPinned(vault.path)}
      draggable="true"
      ondragstart={(e) => handleDragStart(e, vault.path)}
      role="listitem"
      title="Drag to a slot"
    >
      <span
        class="nav-dot"
        class:nav-dot--active={vault.agent.processRunning}
      ></span>
      <div class="nav-info">
        <span class="nav-name">{vault.name}</span>
        {#if vault.compass?.currentFocus}
          <span class="nav-focus">{vault.compass.currentFocus}</span>
        {:else}
          <span class="nav-focus nav-focus--empty">(no compass)</span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .nav-pane {
    width: 220px;
    flex-shrink: 0;
    height: 100%;
    overflow-y: auto;
    background: var(--panel);
    border-right: 1px solid var(--panel-border);
    padding: 4px 0;
    scrollbar-width: thin;
    scrollbar-color: #2a2a2e transparent;
  }

  .nav-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 12px;
    cursor: grab;
    border-left: 2px solid transparent;
    transition: background 0.1s;
    user-select: none;
  }

  .nav-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .nav-row:active {
    cursor: grabbing;
  }

  .nav-row--pinned {
    border-left-color: var(--accent);
  }

  .nav-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2a2a2e;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .nav-dot--active {
    background: var(--accent);
    box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 0 rgba(201, 162, 39, 0.4);
    animation: pulse-ring 2s ease-in-out infinite;
  }

  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 0   rgba(201, 162, 39, 0.4); }
    50%  { box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 5px rgba(201, 162, 39, 0);   }
    100% { box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 0   rgba(201, 162, 39, 0.4); }
  }

  .nav-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    flex: 1;
  }

  .nav-name {
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
    font-family: var(--font-sans);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-focus {
    font-size: 10px;
    color: var(--text-secondary);
    font-family: var(--font-sans);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-focus--empty {
    color: var(--text-dim);
    font-style: italic;
  }
</style>
