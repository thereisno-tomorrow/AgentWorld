<script lang="ts">
  import type { NativeMessage } from '../lib/types'

  let {
    conversationId,
    vaultPath,
    onClose
  }: {
    conversationId: string
    vaultPath: string
    onClose: () => void
  } = $props()

  import { api } from '../lib/api'

  let messages = $state<NativeMessage[]>([])
  let loading = $state(true)
  let loadError = $state(false)
  let page = $state(1)
  let hasMore = $state(false)
  let messagesEl: HTMLDivElement

  $effect(() => {
    // Reset and load when conversationId changes
    messages = []
    page = 1
    hasMore = false
    loadError = false
    loadPage(conversationId, 1)
  })

  async function loadPage(id: string, p: number): Promise<void> {
    loading = true
    try {
      const result = await api.conversation.messages(vaultPath, id, p)
      if (p === 1) {
        messages = result.messages ?? []
      } else {
        messages = [...messages, ...(result.messages ?? [])]
      }
      hasMore = result.hasMore ?? false
    } catch {
      loadError = true
    } finally {
      loading = false
    }
  }

  async function loadMore(): Promise<void> {
    page += 1
    await loadPage(conversationId, page)
  }

  function extractText(content: string | unknown[]): string {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''

    const parts: string[] = []
    for (const block of content as Array<{ type?: string; text?: string; name?: string }>) {
      if (block.type === 'text' && block.text) {
        parts.push(block.text)
      } else if (block.type === 'tool_use') {
        parts.push(`[tool: ${block.name ?? 'unknown'}]`)
      } else if (block.type === 'tool_result') {
        // skip — redundant with tool_use
      }
    }
    return parts.join('\n')
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return ''
    }
  }
</script>

<aside class="thread-panel">
  <div class="panel-header">
    <span class="panel-title">Conversation</span>
    <button class="close-btn" onclick={onClose} type="button" aria-label="Close">✕</button>
  </div>

  <div class="messages" bind:this={messagesEl}>
    {#if loading && messages.length === 0}
      <p class="status-text">Loading…</p>
    {:else if loadError}
      <p class="status-text error">Could not load messages.</p>
    {:else if messages.length === 0}
      <p class="status-text">No messages found.</p>
    {:else}
      {#each messages as msg, i (i)}
        <div class="msg" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
          <div class="msg-meta">
            <span class="msg-role">{msg.role === 'user' ? 'You' : 'Claude'}</span>
            {#if msg.timestamp}
              <span class="msg-time">{formatTime(msg.timestamp)}</span>
            {/if}
          </div>
          <div class="msg-body">{extractText(msg.content)}</div>
        </div>
      {/each}

      {#if hasMore}
        <button class="load-more" onclick={loadMore} disabled={loading} type="button">
          {loading ? 'Loading…' : 'Load more'}
        </button>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .thread-panel {
    width: 360px;
    flex-shrink: 0;
    background: #0e0e18;
    border-left: 1px solid #2a2a3a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #1e1e2e;
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #4a4a6a;
  }

  .close-btn {
    background: none;
    border: none;
    color: #4a4a6a;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: #c8c8d4;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .status-text {
    font-size: 10px;
    color: #6a6a7a;
    font-style: italic;
    text-align: center;
    margin-top: 20px;
  }

  .status-text.error {
    color: #8a5a4a;
  }

  .msg {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .msg-meta {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  .msg-role {
    font-size: 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .msg.user .msg-role {
    color: #5a7a9a;
  }

  .msg.assistant .msg-role {
    color: #5a9a7a;
  }

  .msg-time {
    font-size: 8px;
    color: #3a3a5a;
  }

  .msg-body {
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .msg.user .msg-body {
    color: #8ab0cc;
  }

  .msg.assistant .msg-body {
    color: #9abba8;
  }

  .load-more {
    background: #1a1a2e;
    border: 1px solid #2a2a4a;
    color: #6a6a9a;
    font-family: inherit;
    font-size: 10px;
    padding: 6px;
    cursor: pointer;
    border-radius: 2px;
    width: 100%;
    transition: background 0.1s;
  }

  .load-more:hover:not(:disabled) {
    background: #2a2a4e;
    color: #9090c0;
  }

  .load-more:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
