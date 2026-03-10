<script lang="ts">
  import type { MajorQuest, SubQuest } from '../lib/types'

  let {
    focusQuest,
    focusSubQuest,
    onOpenSearch
  }: {
    focusQuest: MajorQuest | null
    focusSubQuest: SubQuest | null
    onOpenSearch: () => void
  } = $props()
</script>

<header class="status-bar">
  <div class="left">
    {#if focusQuest && focusSubQuest}
      <span class="arrow">▶</span>
      <span class="quest-title">{focusQuest.title}</span>
      <span class="divider">→</span>
      <span class="sub-title">{focusSubQuest.title}</span>
    {:else if focusQuest}
      <span class="arrow">▶</span>
      <span class="quest-title">{focusQuest.title}</span>
      <span class="divider">→</span>
      <span class="no-sub">(no active sub-quest)</span>
    {:else}
      <span class="no-quest">No focus quest — press Q to set one</span>
    {/if}
  </div>

  <button class="search-btn" onclick={onOpenSearch} type="button" title="Search conversations (/)">
    ⌕
  </button>
</header>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #0c0b10;
    border-bottom: 1px solid #1e1e18;
    height: 40px;
    flex-shrink: 0;
    font-family: var(--font-sans, system-ui, sans-serif);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
  }

  .arrow {
    color: var(--accent, #c9a227);
    font-size: 12px;
    flex-shrink: 0;
  }

  .quest-title {
    font-size: 13px;
    color: var(--accent, #c9a227);
    font-weight: 600;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .divider {
    color: #5a5248;
    font-size: 13px;
    flex-shrink: 0;
  }

  .sub-title {
    font-size: 13px;
    color: #9898c0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-sub {
    font-size: 12px;
    color: #7878a0;
    font-style: italic;
  }

  .no-quest {
    font-size: 13px;
    color: #8888a0;
    font-style: italic;
    font-family: var(--font-mono, monospace);
    letter-spacing: 0.02em;
  }

  .search-btn {
    background: none;
    border: 1px solid #3e3e38;
    color: #686860;
    font-size: 16px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 0;
    flex-shrink: 0;
    transition: border-color 0.1s, color 0.1s;
    line-height: 1;
    padding: 0;
  }

  .search-btn:hover {
    border-color: var(--accent, #c9a227);
    color: var(--accent, #c9a227);
  }
</style>
