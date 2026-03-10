<script lang="ts">
  import { tick } from 'svelte'
  import type { VaultDisplay, MajorQuest, SubQuest, Conversation } from '../lib/types'

  const LINE_HEIGHT = 18 // 1.5 × 12px font
  const PADDING_V = 12   // 6px top + 6px bottom
  const MAX_TEXTAREA_HEIGHT = LINE_HEIGHT * 10 + PADDING_V

  function autosize(node: HTMLTextAreaElement): { destroy: () => void } {
    function resize(): void {
      node.style.height = 'auto'
      const h = Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT)
      node.style.height = h + 'px'
      node.style.overflowY = node.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
    }
    node.addEventListener('input', resize)
    resize()
    return { destroy: () => node.removeEventListener('input', resize) }
  }

  let {
    vault,
    isSelected = false,
    majorQuests,
    onSelectVault = () => {},
    onOpenConversation,
    slotMode = false,
    activeConversationId = null
  }: {
    vault: VaultDisplay
    isSelected?: boolean
    majorQuests: MajorQuest[]
    onSelectVault?: (path: string) => void
    onOpenConversation: (id: string, vaultPath: string) => void
    slotMode?: boolean
    activeConversationId?: string | null
  } = $props()

  import { api } from '../lib/api'

  let conversations = $state<Conversation[]>([])
  let loading = $state(true)
  let contextMenu = $state<{ x: number; y: number; conv: Conversation } | null>(null)
  let customTitles = $state<Record<string, string>>({})
  let renamingConvId = $state<string | null>(null)
  let renameValue = $state('')

  let vaultNotes = $state<Record<string, string>>({})
  let noteValue = $state('')
  let notesEl: HTMLTextAreaElement | undefined

  let convOrder = $state<string[]>((() => {
    try {
      const saved = localStorage.getItem(`agentworld:conv-order:${vault.path}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })())

  let draggedConvId = $state<string | null>(null)
  let dragOverConvId = $state<string | null>(null)
  let dragOverArchive = $state(false)
  let dragOverActiveZone = $state(false)

  let archivedIds = $state<Set<string>>(new Set())
  let activeOverrideIds = $state<Set<string>>(new Set())

  let activeExpanded = $state(true)
  let toastMessage = $state('')
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(msg: string) {
    toastMessage = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastMessage = '' }, 2500)
  }
  let archiveExpanded = $state(false)

  // Load archive state from file on mount
  $effect(() => {
    const path = vault.path
    api.archive.load().then((data) => {
      archivedIds = new Set(data.archived[path] ?? [])
      activeOverrideIds = new Set(data.activeOverrides[path] ?? [])
    })
  })

  function saveArchiveState(): void {
    api.archive.load().then((data) => {
      data.archived[vault.path] = [...archivedIds]
      data.activeOverrides[vault.path] = [...activeOverrideIds]
      api.archive.save({ ...data })
    })
  }

  function isArchived(conv: Conversation): boolean {
    if (archivedIds.has(conv.id)) return true
    const ageHours = (Date.now() - new Date(conv.mtime).getTime()) / 3_600_000
    return ageHours > 3 && !activeOverrideIds.has(conv.id)
  }

  function archiveConv(id: string): void {
    archivedIds = new Set([...archivedIds, id])
    activeOverrideIds = new Set([...activeOverrideIds].filter((x) => x !== id))
    saveArchiveState()
  }

  function unarchiveConv(id: string): void {
    archivedIds = new Set([...archivedIds].filter((x) => x !== id))
    const conv = conversations.find((c) => c.id === id)
    if (conv) {
      const ageHours = (Date.now() - new Date(conv.mtime).getTime()) / 3_600_000
      if (ageHours > 3) activeOverrideIds = new Set([...activeOverrideIds, id])
    }
    saveArchiveState()
  }

  let orderedConversations = $derived.by(() => {
    const known = new Set(convOrder)
    const newIds = conversations.filter((c) => !known.has(c.id)).map((c) => c.id)
    const fullOrder = [...convOrder, ...newIds].filter((id) => conversations.some((c) => c.id === id))
    return fullOrder.map((id) => conversations.find((c) => c.id === id)!).filter(Boolean)
  })

  let activeConversations = $derived(orderedConversations.filter((c) => !isArchived(c)))
  let archivedConversations = $derived(
    orderedConversations
      .filter((c) => isArchived(c))
      .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
  )

  function saveConvOrder(order: string[]): void {
    try {
      localStorage.setItem(`agentworld:conv-order:${vault.path}`, JSON.stringify(order))
    } catch {}
  }

  function handleConvDragStart(e: DragEvent, id: string): void {
    draggedConvId = id
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('text/plain', id)
    e.stopPropagation()
  }

  function handleConvDragOver(e: DragEvent, id: string): void {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer!.dropEffect = 'move'
    if (id !== draggedConvId) dragOverConvId = id
  }

  function handleConvDrop(e: DragEvent, targetId: string): void {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedConvId || draggedConvId === targetId) return
    const draggedConv = conversations.find((c) => c.id === draggedConvId)
    if (draggedConv && isArchived(draggedConv)) {
      // Dragging from archive into active list — unarchive first
      unarchiveConv(draggedConvId)
    }
    const order = activeConversations.map((c) => c.id)
    if (!order.includes(draggedConvId!)) order.push(draggedConvId!)
    const fromIdx = order.indexOf(draggedConvId!)
    const toIdx = order.indexOf(targetId)
    if (toIdx === -1) { draggedConvId = null; dragOverConvId = null; return }
    order.splice(fromIdx, 1)
    order.splice(toIdx, 0, draggedConvId!)
    convOrder = order
    saveConvOrder(order)
    draggedConvId = null
    dragOverConvId = null
  }

  function handleActiveZoneDragOver(e: DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer!.dropEffect = 'move'
    dragOverActiveZone = true
  }

  function handleActiveZoneDrop(e: DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    dragOverActiveZone = false
    if (!draggedConvId) return
    const conv = conversations.find((c) => c.id === draggedConvId)
    if (conv && isArchived(conv)) unarchiveConv(draggedConvId)
    draggedConvId = null
    dragOverConvId = null
  }

  function handleArchiveDragOver(e: DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer!.dropEffect = 'move'
    dragOverArchive = true
  }

  function handleArchiveDragLeave(): void {
    dragOverArchive = false
  }

  function handleArchiveDrop(e: DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    dragOverArchive = false
    if (!draggedConvId) return
    archiveConv(draggedConvId)
    draggedConvId = null
    dragOverConvId = null
  }

  function handleConvDragEnd(): void {
    draggedConvId = null
    dragOverConvId = null
    dragOverArchive = false
  }

  type ConvActivity = 'running' | 'waiting' | 'idle'
  let convActivity = $state<Record<string, ConvActivity>>({})
  const runningUntil = new Map<string, number>()

  $effect(() => {
    if (conversations.length === 0) return

    let cancelled = false

    async function checkActivity(): Promise<void> {
      if (cancelled) return
      const next: Record<string, ConvActivity> = {}
      await Promise.all(
        conversations.map(async (c) => {
          const lastType = await api.conversation.tail(c.id, vault.path)
          if (cancelled) return
          if (lastType === 'human') {
            runningUntil.set(c.id, Date.now() + 3_000)
            next[c.id] = 'running'
          } else if (runningUntil.get(c.id) && runningUntil.get(c.id)! > Date.now()) {
            next[c.id] = 'running'
          } else if (lastType === 'assistant') {
            runningUntil.delete(c.id)
            next[c.id] = 'waiting'
          } else {
            runningUntil.delete(c.id)
            next[c.id] = 'idle'
          }
        })
      )
      if (!cancelled) {
        convActivity = next
      }
    }

    checkActivity()
    const timer = setInterval(checkActivity, 1_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  })

  let isActive = $derived(
    conversations.some((c) => Date.now() - new Date(c.mtime).getTime() < 2 * 60 * 60 * 1000)
  )
  let agentStatus = $derived(isActive ? 'active' : 'idle')

  let linkedSubQuests = $derived<SubQuest[]>(
    majorQuests.flatMap((q) => q.subQuests).filter((s) => s.vault === vault.name)
  )

  const STATUS_ICON: Record<string, string> = {
    active: '→',
    done: '✓',
    blocked: '✗',
    parked: '○'
  }

  $effect(() => {
    let cancelled = false
    load(vault.path, () => cancelled)
    const timer = setInterval(() => load(vault.path, () => cancelled), 3_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  })

  async function load(path: string, isCancelled: () => boolean): Promise<void> {
    loading = true
    const fileList = await api.conversation.list(path)
    if (isCancelled()) return
    conversations = fileList.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    loading = false
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function openContextMenu(e: MouseEvent, conv: Conversation): void {
    e.preventDefault()
    const menuW = 170
    const menuH = 130
    const x = Math.min(e.clientX, window.innerWidth - menuW - 4)
    const y = Math.min(e.clientY, window.innerHeight - menuH - 4)
    contextMenu = { x, y, conv }
  }

  function closeContextMenu(): void {
    contextMenu = null
  }

  $effect(() => {
    api.convTitles.load().then((t) => { customTitles = t })
  })

  $effect(() => {
    const path = vault.path  // reactive — re-runs when vault prop changes
    api.vaultNotes.load().then(async (n) => {
      vaultNotes = n
      noteValue = n[path] ?? ''
      await tick()
      // Autosize listens for 'input' events — trigger resize after async load
      notesEl?.dispatchEvent(new Event('input', { bubbles: true }))
    })
  })

  async function saveNote(): Promise<void> {
    await api.vaultNotes.saveOne(vault.path, noteValue)
  }

  function autoFocus(node: HTMLInputElement): void {
    node.focus()
    node.select()
  }

  function startRename(conv: Conversation): void {
    renamingConvId = conv.id
    renameValue = customTitles[conv.id] ?? conv.title ?? ''
    closeContextMenu()
  }

  async function commitRename(): Promise<void> {
    if (!renamingConvId) return
    const id = renamingConvId
    renamingConvId = null
    const trimmed = renameValue.trim()
    const autoTitle = conversations.find((c) => c.id === id)?.title ?? ''
    const isCustom = trimmed && trimmed !== autoTitle
    if (isCustom) {
      customTitles = { ...customTitles, [id]: trimmed }
    } else {
      const { [id]: _removed, ...rest } = customTitles
      customTitles = rest
    }
    await api.convTitles.save({ ...customTitles })
  }

  function cancelRename(): void {
    renamingConvId = null
  }

  function displayTitle(id: string, autoTitle: string | undefined): string {
    const custom = customTitles[id]
    if (!custom) return autoTitle ?? '(untitled)'
    if (!autoTitle) return custom
    const available = Math.min(25, 42 - custom.length - 3)
    if (available < 6) return custom
    return `${custom} (${autoTitle.slice(0, available)})`
  }


</script>

<svelte:window
  onclick={closeContextMenu}
  onkeydown={(e) => e.key === 'Escape' && closeContextMenu()}
/>

<div class="column" class:selected={isSelected} class:column--slot={slotMode}>
  <button class="col-header" class:col-header--slot={slotMode} onclick={() => onSelectVault(vault.path)} type="button">
    <span class="agent-dot status--{agentStatus}"></span>
    <span class="vault-name">{vault.name}</span>
  </button>

  {#if isSelected || slotMode}
    <div class="detail">
      <textarea
        class="notes-textarea"
        placeholder="Notes"
        bind:value={noteValue}
        bind:this={notesEl}
        use:autosize
        oninput={saveNote}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      ></textarea>

      <button class="resume-btn" onclick={() => api.shell.openVSCode(vault.path)} type="button">
        Resume in VS Code
      </button>
    </div>
  {/if}

  <div class="conv-body">
    {#if loading && conversations.length === 0}
      <p class="status-msg">Loading…</p>
    {:else if conversations.length === 0}
      <p class="status-msg">No conversations</p>
    {:else}
      {#if activeConversations.length === 0 && archivedConversations.length > 0}
        <div
          class="active-drop-zone"
          class:active-drop-zone--over={dragOverActiveZone}
          ondragover={handleActiveZoneDragOver}
          ondragleave={() => (dragOverActiveZone = false)}
          ondrop={handleActiveZoneDrop}
          role="region"
          aria-label="Active conversations"
        >All archived</div>
      {/if}
      {#if activeConversations.length > 0}
        <button
          class="active-header"
          onclick={() => (activeExpanded = !activeExpanded)}
          type="button"
        >
          <span class="archive-toggle">{activeExpanded ? '▾' : '▸'}</span>
          Active ({activeConversations.length})
        </button>
        {#if activeExpanded}
        <ul class="conv-list">
          {#each activeConversations as conv (conv.id)}
            <li
              class="conv-item"
              class:conv-dragging={draggedConvId === conv.id}
              class:conv-drag-over={dragOverConvId === conv.id}
              draggable="true"
              ondragstart={(e) => handleConvDragStart(e, conv.id)}
              ondragover={(e) => handleConvDragOver(e, conv.id)}
              ondrop={(e) => handleConvDrop(e, conv.id)}
              ondragend={handleConvDragEnd}
            >
              <button
                class="conv-row"
                class:conv-row--active={activeConversationId === conv.id}
                onclick={() => onOpenConversation(conv.id, vault.path)}
                oncontextmenu={(e) => openContextMenu(e, conv)}
                type="button"
              >
                <div class="conv-title-row">
                  <span
                    class="conv-indicator"
                    class:conv-indicator--running={convActivity[conv.id] === 'running'}
                    class:conv-indicator--waiting={convActivity[conv.id] === 'waiting'}
                  ></span>
                  {#if renamingConvId === conv.id}
                    <input
                      class="conv-rename-input"
                      type="text"
                      bind:value={renameValue}
                      use:autoFocus
                      onblur={commitRename}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') cancelRename()
                      }}
                      onclick={(e) => e.stopPropagation()}
                    />
                  {:else}
                    <span class="conv-title" class:conv-title--renamed={!!customTitles[conv.id]}>
                      {displayTitle(conv.id, conv.title)}
                    </span>
                  {/if}
                </div>
                {#if slotMode && conv.lastHumanMessage}
                  <span class="conv-preview">{conv.lastHumanMessage}</span>
                {/if}
                <span class="conv-meta">{formatDate(conv.mtime)}</span>
              </button>
            </li>
          {/each}
        </ul>
        {/if}
      {/if}

      {#if archivedConversations.length > 0}
        <button
          class="archive-header"
          class:archive-header--drag-over={dragOverArchive}
          onclick={() => (archiveExpanded = !archiveExpanded)}
          ondragover={handleArchiveDragOver}
          ondragleave={handleArchiveDragLeave}
          ondrop={handleArchiveDrop}
          type="button"
        >
          <span class="archive-toggle">{archiveExpanded ? '▾' : '▸'}</span>
          Archive ({archivedConversations.length})
        </button>
        {#if archiveExpanded}
          <ul
            class="conv-list archive-list"
            ondragover={handleArchiveDragOver}
            ondragleave={handleArchiveDragLeave}
            ondrop={handleArchiveDrop}
          >
            {#each archivedConversations as conv (conv.id)}
              <li
                class="conv-item"
                class:conv-dragging={draggedConvId === conv.id}
                draggable="true"
                ondragstart={(e) => handleConvDragStart(e, conv.id)}
                ondragend={handleConvDragEnd}
              >
                <button
                  class="conv-row conv-row--archived"
                  class:conv-row--active={activeConversationId === conv.id}
                  onclick={() => onOpenConversation(conv.id, vault.path)}
                  oncontextmenu={(e) => openContextMenu(e, conv)}
                  type="button"
                >
                  <div class="conv-title-row">
                    <span class="conv-indicator"></span>
                    {#if renamingConvId === conv.id}
                      <input
                        class="conv-rename-input"
                        type="text"
                        bind:value={renameValue}
                        use:autoFocus
                        onblur={commitRename}
                        onkeydown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') cancelRename()
                        }}
                        onclick={(e) => e.stopPropagation()}
                      />
                    {:else}
                      <span class="conv-title conv-title--archived" class:conv-title--renamed={!!customTitles[conv.id]}>
                        {displayTitle(conv.id, conv.title)}
                      </span>
                    {/if}
                  </div>
                  <span class="conv-meta">{formatDate(conv.mtime)}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    {/if}
  </div>
</div>

{#if contextMenu}
  <div
    class="context-menu"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px"
    role="menu"
  >
    <button
      class="menu-item"
      onclick={() => { onOpenConversation(contextMenu!.conv.id, vault.path); closeContextMenu() }}
      role="menuitem"
      type="button"
    >
      Open thread
    </button>
    <button
      class="menu-item"
      onclick={() => { api.shell.openConversationInVSCode(vault.path, contextMenu!.conv.id); showToast('Resume command copied'); closeContextMenu() }}
      role="menuitem"
      type="button"
    >
      Open in VS Code
    </button>
    <button
      class="menu-item"
      onclick={() => startRename(contextMenu!.conv)}
      role="menuitem"
      type="button"
    >
      Rename
    </button>
    {#if isArchived(contextMenu.conv)}
      <button
        class="menu-item"
        onclick={() => { unarchiveConv(contextMenu!.conv.id); closeContextMenu() }}
        role="menuitem"
        type="button"
      >
        Unarchive
      </button>
    {:else}
      <button
        class="menu-item"
        onclick={() => { archiveConv(contextMenu!.conv.id); closeContextMenu() }}
        role="menuitem"
        type="button"
      >
        Archive
      </button>
    {/if}
  </div>
{/if}

{#if toastMessage}
  <div class="toast">{toastMessage}</div>
{/if}

<style>
  .column {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--panel, #111114);
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
    border-left: 2px solid transparent;
    overflow: hidden;
  }

  .column.selected {
    border-left-color: var(--accent, #c9a227);
  }

  .col-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: var(--panel-header, #0d0d10);
    border: none;
    border-bottom: 1px solid var(--panel-border, #1e1e22);
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: var(--font-sans, system-ui, sans-serif);
    transition: background 0.1s;
  }

  .col-header:hover {
    background: #131318;
  }

  .agent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status--active {
    background: var(--accent, #c9a227);
    box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 0 rgba(201, 162, 39, 0.4);
    animation: pulse-ring 2s ease-in-out infinite;
  }

  .status--idle {
    background: #2a2a2e;
  }

  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 0   rgba(201, 162, 39, 0.4); }
    50%  { box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 5px rgba(201, 162, 39, 0);   }
    100% { box-shadow: 0 0 0 2px rgba(201, 162, 39, 0.15), 0 0 0 0   rgba(201, 162, 39, 0.4); }
  }

  .vault-name {
    font-size: 13px;
    color: var(--accent, #c9a227);
    font-weight: 600;
    font-family: var(--font-sans, system-ui, sans-serif);
    letter-spacing: 0.03em;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail {
    padding: 8px 12px;
    background: var(--panel-detail, #0a0a0d);
    border-bottom: 1px solid var(--panel-border, #1e1e22);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field {
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }

  .label {
    font-size: 10px;
    color: var(--text-dim, #383836);
    font-family: var(--font-mono, monospace);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    width: 64px;
    flex-shrink: 0;
  }

  .value {
    font-size: 11px;
    color: var(--text-secondary, #686860);
    word-break: break-word;
    cursor: pointer;
  }

  .value:hover {
    color: #a0a090;
  }

  .value.broken {
    color: #8a5a3a;
  }

  .empty {
    font-size: 10px;
    color: #555550;
    font-style: italic;
  }

  .sub-quests {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .sub-quest {
    display: flex;
    gap: 5px;
    align-items: baseline;
  }

  .sq-icon {
    font-size: 10px;
    color: #5a7a5a;
    flex-shrink: 0;
    width: 8px;
    font-family: var(--font-mono, monospace);
  }

  .sq-title {
    font-size: 10px;
    color: #8888a0;
    word-break: break-word;
  }

  .sq-title.sq-done {
    color: #333340;
    text-decoration: line-through;
  }

  .resume-btn {
    margin-top: 4px;
    padding: 5px 8px;
    background: transparent;
    border: 1px solid #2e2e22;
    color: var(--accent, #c9a227);
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    width: 100%;
  }

  .resume-btn:hover {
    background: rgba(201, 162, 39, 0.06);
    border-color: var(--accent, #c9a227);
  }

  .conv-body {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    scrollbar-width: thin;
    scrollbar-color: #2a2a2e transparent;
  }

  .conv-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .conv-item {
    position: relative;
    cursor: grab;
    transition: opacity 0.15s;
  }

  .conv-item:active {
    cursor: grabbing;
  }

  .conv-item.conv-dragging {
    opacity: 0.35;
  }

  .conv-item.conv-drag-over::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 8px;
    right: 8px;
    height: 2px;
    background: var(--accent, #c9a227);
    pointer-events: none;
  }

  .conv-row {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 8px 14px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.1s;
  }

  .conv-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .conv-row--active {
    background: rgba(255, 255, 255, 0.04);
    box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.06);
  }

  .conv-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    overflow: hidden;
  }

  .conv-indicator {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    opacity: 0;
  }

  .conv-indicator--running {
    opacity: 1;
    background: transparent;
    border: 2px solid #484840;
    border-top-color: var(--accent, #c9a227);
    width: 9px;
    height: 9px;
    animation: conv-spin 0.7s linear infinite;
  }

  .conv-indicator--waiting {
    opacity: 1;
    background: #d0d0c8;
    animation: conv-pulse 2s ease-in-out infinite;
  }

  @keyframes conv-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes conv-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .conv-title {
    font-size: 13px;
    color: #b0b0a8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-family: var(--font-sans, sans-serif);
  }

  .conv-title.conv-active {
    color: var(--accent, #c9a227);
  }

  .conv-title--renamed,
  .conv-title--archived.conv-title--renamed {
    color: #7ec897;
  }

  .conv-meta {
    font-size: 10px;
    color: var(--text-dim, #383836);
    font-family: var(--font-mono, monospace);
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.12s ease, opacity 0.12s ease;
    white-space: nowrap;
  }

  .conv-row:hover .conv-meta,
  .conv-row:focus-visible .conv-meta {
    max-height: 16px;
    opacity: 1;
  }

  .active-drop-zone {
    font-size: 12px;
    color: #666668;
    font-style: italic;
    padding: 8px 12px;
    border: 1px dashed transparent;
    transition: border-color 0.1s, color 0.1s;
  }

  .active-drop-zone--over {
    border-color: var(--accent, #c9a227);
    color: var(--accent, #c9a227);
  }

  .status-msg {
    font-size: 12px;
    color: #666668;
    font-style: italic;
    padding: 8px 12px;
  }

  .context-menu {
    position: fixed;
    background: #141416;
    border: 1px solid #2a2a2e;
    z-index: 1000;
    min-width: 160px;
    padding: 3px 0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 6px 12px;
    background: none;
    border: none;
    color: #686860;
    font-family: var(--font-sans, sans-serif);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }

  .menu-item:hover {
    background: #1e1e22;
    color: var(--text-primary, #e0e0d8);
  }

  .active-header {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    font-size: 10px;
    color: #444440;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
    background: none;
    border-bottom: 1px solid #1a1a1e;
    width: 100%;
    text-align: left;
    font-family: var(--font-mono, monospace);
    transition: color 0.1s;
  }

  .active-header:hover {
    color: #888880;
  }

  .archive-header {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    font-size: 10px;
    color: #444440;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
    background: none;
    border-top: 1px solid #1a1a1e;
    width: 100%;
    text-align: left;
    font-family: var(--font-mono, monospace);
    transition: color 0.1s;
    margin-top: 4px;
  }

  .archive-header:hover {
    color: #888880;
  }

  .archive-header--drag-over {
    color: var(--accent, #c9a227);
    border-top-color: var(--accent, #c9a227);
    background: rgba(201, 162, 39, 0.05);
  }

  .archive-toggle {
    font-size: 8px;
    flex-shrink: 0;
  }

  .archive-list {
    opacity: 0.6;
  }

  .conv-row--archived:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .conv-title--archived {
    font-size: 13px;
    color: #555550;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-family: var(--font-sans, sans-serif);
  }

  .notes-textarea {
    background: transparent;
    border: 1px solid #2a2a22;
    color: #e0e0d8;
    font-family: var(--font-sans, sans-serif);
    font-size: 12px;
    width: 100%;
    outline: none;
    padding: 6px;
    resize: none;
    overflow-y: hidden;
    box-sizing: border-box;
    line-height: 1.5;
  }

  .notes-textarea::placeholder {
    color: #3a3a32;
  }

  .notes-textarea:focus {
    border-color: #4a4a3a;
  }

  .conv-rename-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--accent, #c9a227);
    color: #e0e0d8;
    font-family: var(--font-sans, sans-serif);
    font-size: 13px;
    width: 100%;
    outline: none;
    padding: 0;
    flex: 1;
  }

  .column--slot {
    width: 100%;
    height: 100%;
    clip-path: none;
    border-left: none;
    flex-shrink: 1;
  }

  .col-header--slot {
    cursor: default;
  }

  .col-header--slot:hover {
    background: var(--panel-header, #0d0d10);
  }

  .conv-preview {
    font-size: 11px;
    color: #7a7a72;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    padding-left: 13px;
    margin-top: 1px;
  }

  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--panel-header, #0d0d10);
    color: var(--accent, #c9a227);
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 11px;
    z-index: 9999;
    pointer-events: none;
    animation: toast-fade 2.5s ease-out forwards;
  }

  @keyframes toast-fade {
    0%, 70% { opacity: 1; }
    100% { opacity: 0; }
  }
</style>
