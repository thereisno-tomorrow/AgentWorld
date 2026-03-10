<script lang="ts">
  import type { NativeSearchResult } from '../lib/types'

  let {
    onClose,
    onOpenConversation
  }: {
    onClose: () => void
    onOpenConversation: (id: string, vaultPath: string) => void
  } = $props()

  import { api } from '../lib/api'

  let query = $state('')
  let results = $state<NativeSearchResult[]>([])
  let searching = $state(false)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    // Reactive to query changes — debounced search
    const q = query
    if (debounceTimer) clearTimeout(debounceTimer)
    if (!q.trim()) {
      results = []
      return
    }
    debounceTimer = setTimeout(() => search(q), 300)
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  })

  async function search(q: string): Promise<void> {
    searching = true
    results = await api.conversation.search(q)
    searching = false
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    } catch {
      return ''
    }
  }

  function vaultShort(vaultPath: string): string {
    return vaultPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? vaultPath
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose()
  }

  function handleSelect(result: NativeSearchResult): void {
    onOpenConversation(result.id, result.vaultPath)
    onClose()
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="backdrop" role="presentation" onclick={onClose} onkeydown={() => {}}></div>

  <div class="modal">
    <div class="search-row">
      <span class="search-icon">⌕</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="search-input"
        type="text"
        placeholder="Search conversations…"
        bind:value={query}
        onkeydown={handleKeydown}
        autofocus
      />
      {#if searching}
        <span class="spinner">…</span>
      {/if}
    </div>

    {#if results.length > 0}
      <ul class="results">
        {#each results as result (result.id)}
          <li>
            <button class="result-item" onclick={() => handleSelect(result)} type="button">
              <span class="result-title">{result.title}</span>
              <span class="result-vault">{vaultShort(result.vaultPath)}</span>
              <span class="result-date">{formatDate(result.mtime)}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else if query.trim() && !searching}
      <p class="no-results">No results</p>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
  }

  .modal {
    position: relative;
    width: 560px;
    background: #12121e;
    border: 1px solid #3a3a5a;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid #1e1e2e;
  }

  .search-icon {
    color: #4a4a6a;
    font-size: 16px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 14px;
    color: #c8c8d4;
  }

  .search-input::placeholder {
    color: #3a3a5a;
  }

  .spinner {
    color: #4a4a6a;
    font-size: 14px;
  }

  .results {
    list-style: none;
    max-height: 320px;
    overflow-y: auto;
  }

  .result-item {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px 16px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.1s;
  }

  .result-item:hover {
    background: #1a1a2e;
  }

  .result-title {
    flex: 1;
    font-size: 12px;
    color: #9090c0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-vault {
    font-size: 10px;
    color: #3a3a5a;
    flex-shrink: 0;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-date {
    font-size: 10px;
    color: #4a4a6a;
    flex-shrink: 0;
  }

  .no-results {
    padding: 16px;
    font-size: 12px;
    color: #3a3a5a;
    font-style: italic;
    text-align: center;
  }
</style>
