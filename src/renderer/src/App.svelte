<script lang="ts">
  import type { VaultDisplay, MajorQuest } from './lib/types'
  import StatusBar from './components/StatusBar.svelte'
  import KanbanBoard from './components/KanbanBoard.svelte'
  import VaultNavPane from './components/VaultNavPane.svelte'
  import VaultSlotsPanel from './components/VaultSlotsPanel.svelte'
  import QuestOverlay from './components/QuestOverlay.svelte'
  import ConversationThread from './components/ConversationThread.svelte'
  import SearchModal from './components/SearchModal.svelte'
  import { api } from './lib/api'

  // All top-level state lives here
  let vaults = $state<VaultDisplay[]>([])
  let majorQuests = $state<MajorQuest[]>([])
  let selectedVaultPath = $state<string | null>(null)
  let questOverlayOpen = $state(false)
  let focusQuestId = $state<string | null>(null)
  let searchOpen = $state(false)
  let activeConversationId = $state<string | null>(null)
  let activeConversationVaultPath = $state<string | null>(null)

  let layoutMode = $state<'board' | 'focus'>(
    (localStorage.getItem('agentworld:layout') as 'board' | 'focus') ?? 'focus'
  )
  let pinnedSlots = $state<(string | null)[]>(
    JSON.parse(localStorage.getItem('agentworld:pinned-slots') ?? '[]') as (string | null)[]
  )

  // Derived state
  let focusQuest = $derived(majorQuests.find((q) => q.id === focusQuestId) ?? null)
  let focusSubQuest = $derived(focusQuest?.subQuests.find((s) => s.status === 'active') ?? null)

  // Bootstrap on mount
  $effect(() => {
    loadInitialData()

    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'v' || e.key === 'V') {
        layoutMode = layoutMode === 'board' ? 'focus' : 'board'
        localStorage.setItem('agentworld:layout', layoutMode)
      }
      if (e.key === 'q' || e.key === 'Q') {
        questOverlayOpen = !questOverlayOpen
      }
      if (e.key === '/' && !searchOpen) {
        e.preventDefault()
        searchOpen = true
      }
      if (e.key === 'Escape') {
        if (searchOpen) searchOpen = false
        else if (activeConversationId) activeConversationId = null
        else if (questOverlayOpen) questOverlayOpen = false
        else if (selectedVaultPath) selectedVaultPath = null
      }
    }
    window.addEventListener('keydown', onKey)

    const off = api.on('vault:changed', (payload: unknown) => {
      const { path } = payload as { path: string }
      refreshVault(path)
    })

    return () => {
      window.removeEventListener('keydown', onKey)
      off()
      vaults.forEach((v) => api.watch.unsubscribe(v.path))
    }
  })

  async function loadInitialData(): Promise<void> {
    const [entries, loadedQuests] = await Promise.all([api.vaults.scan(), api.quests.load()])

    vaults = await Promise.all(
      entries.map(async (entry) => {
        const data = await api.vault.read(entry.path)
        return {
          ...entry,
          compass: data.compass,
          manifest: data.manifest,
          agent: { lastActiveAt: null, processRunning: false, crossVaultReads: [] }
        }
      })
    )

    majorQuests = loadedQuests as unknown as MajorQuest[]

    // Start watching each vault's compass.md for live updates
    vaults.forEach((v) => api.watch.subscribe(v.path))
  }

  // Mutate in-place so VaultColumn $effects don't reload conversations on compass refresh
  async function refreshVault(path: string): Promise<void> {
    const idx = vaults.findIndex((v) => v.path === path)
    if (idx === -1) return
    const data = await api.vault.read(path)
    vaults[idx].compass = data.compass
    vaults[idx].manifest = data.manifest
  }

  function handleSelectVault(path: string): void {
    selectedVaultPath = selectedVaultPath === path ? null : path
    activeConversationId = null
  }

  function handleFocusChange(questId: string): void {
    focusQuestId = questId
  }

  function updateSlots(newSlots: (string | null)[]): void {
    pinnedSlots = newSlots
    localStorage.setItem('agentworld:pinned-slots', JSON.stringify(newSlots))
  }
</script>

<div class="app">
  <StatusBar {focusQuest} {focusSubQuest} onOpenSearch={() => (searchOpen = true)} />

  <main class="content">
    {#if layoutMode === 'focus'}
      <div class="focus-layout">
        <VaultNavPane {vaults} pinnedPaths={pinnedSlots} />
        <VaultSlotsPanel
          slots={pinnedSlots}
          {vaults}
          {majorQuests}
          {activeConversationId}
          onSlotsChange={updateSlots}
          onOpenConversation={(id, vaultPath) => {
            activeConversationId = id
            activeConversationVaultPath = vaultPath
          }}
        />
      </div>
    {:else}
      <KanbanBoard
        {vaults}
        {majorQuests}
        {selectedVaultPath}
        {activeConversationId}
        onSelectVault={handleSelectVault}
        onOpenConversation={(id, vaultPath) => {
          activeConversationId = id
          activeConversationVaultPath = vaultPath
        }}
      />
    {/if}

    {#if activeConversationId && activeConversationVaultPath}
      <ConversationThread
        conversationId={activeConversationId}
        vaultPath={activeConversationVaultPath}
        onClose={() => (activeConversationId = null)}
      />
    {/if}
  </main>

  {#if questOverlayOpen}
    <QuestOverlay
      {majorQuests}
      {focusQuestId}
      onClose={() => (questOverlayOpen = false)}
      onFocusChange={handleFocusChange}
    />
  {/if}

  {#if searchOpen}
    <SearchModal
      onClose={() => (searchOpen = false)}
      onOpenConversation={(id, vaultPath) => {
        activeConversationId = id
        activeConversationVaultPath = vaultPath
        searchOpen = false
      }}
    />
  {/if}
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --bg: #0a0a0e;
    --panel: #111114;
    --panel-header: #0d0d10;
    --panel-detail: #0a0a0d;
    --panel-border: #1e1e22;
    --text-primary: #e0e0d8;
    --text-secondary: #9a9a92;
    --text-dim: #686864;
    --accent: #c9a227;
    --accent-bright: #f0c040;
    --accent-dim: rgba(201, 162, 39, 0.15);
    --font-sans: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace;
  }

  :global(body) {
    background: var(--bg);
    color: var(--panel);
    font-family: var(--font-sans);
    overflow: hidden;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .focus-layout {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
