<script lang="ts">
  import type { MajorQuest, SubQuest } from '../lib/types'

  let {
    majorQuests,
    focusQuestId,
    onClose,
    onFocusChange
  }: {
    majorQuests: MajorQuest[]
    focusQuestId: string | null
    onClose: () => void
    onFocusChange: (questId: string) => void
  } = $props()

  let archivedExpanded = $state(false)

  let activeQuests = $derived(majorQuests.filter((q) => q.status === 'active'))
  let archivedQuests = $derived(majorQuests.filter((q) => q.status === 'done'))

  function sortedSubQuests(subQuests: SubQuest[]): SubQuest[] {
    const order: Record<string, number> = { active: 0, blocked: 1, parked: 2, done: 3 }
    return [...subQuests].sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4))
  }

  function subQuestCounter(subQuests: SubQuest[]): string {
    const done = subQuests.filter((s) => s.status === 'done').length
    return `${done}/${subQuests.length}`
  }

  function moodLabel(subQuests: SubQuest[]): string {
    const active = subQuests.filter((s) => s.status === 'active')
    const blocked = subQuests.filter((s) => s.status === 'blocked')
    if (blocked.length > 0) return 'blocked'
    if (active.length === 0) return 'stalled'
    const oldest = active.reduce((max, s) => Math.max(max, s.daysSinceActive ?? 0), 0)
    if (oldest > 14) return 'stalled'
    if (oldest > 7) return 'moving'
    return 'moving fast'
  }

  const STATUS_ICON: Record<string, string> = {
    active: '→',
    done: '✓',
    blocked: '✗',
    parked: '○'
  }

  function handleOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onClose()
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose()
  }
</script>

<div
  class="overlay"
  onclick={handleOverlayClick}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Quest Overlay"
  tabindex="-1"
>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">QUESTS</span>
      <button class="close-btn" onclick={onClose} type="button" aria-label="Close">✕</button>
    </div>

    <div class="quest-list">
      {#if activeQuests.length === 0}
        <p class="empty-state">No active quests. Edit the quest vault .md files to add quests.</p>
      {/if}

      {#each activeQuests as quest (quest.id)}
        {@const isFocus = quest.id === focusQuestId}
        <div class="major-quest" class:focus={isFocus}>
          <button
            class="quest-header"
            onclick={() => onFocusChange(quest.id)}
            type="button"
            title="Set as focus quest (F)"
          >
            <span class="focus-indicator">{isFocus ? '●' : '○'}</span>
            <span class="quest-title">{quest.title}</span>
            <span class="quest-meta">
              <span class="counter">{subQuestCounter(quest.subQuests)}</span>
              <span class="mood mood--{moodLabel(quest.subQuests).replace(' ', '-')}">
                [{moodLabel(quest.subQuests)}]
              </span>
            </span>
          </button>

          <div class="sub-quests">
            {#each sortedSubQuests(quest.subQuests) as sq (sq.id)}
              <div class="sub-quest sub-quest--{sq.status}">
                <span class="sq-icon">{STATUS_ICON[sq.status] ?? '·'}</span>
                <div class="sq-body">
                  <div class="sq-header">
                    <span class="sq-title">{sq.title}</span>
                    {#if sq.daysSinceActive !== null && sq.status !== 'done'}
                      <span class="sq-age">· {sq.daysSinceActive}d</span>
                    {/if}
                    {#if sq.vault}
                      <span class="sq-vault">{sq.vault}</span>
                    {/if}
                  </div>
                  {#if sq.notes && sq.status !== 'done'}
                    <p class="sq-notes">{sq.notes}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}

      {#if archivedQuests.length > 0}
        <div class="archived-section">
          <button
            class="archived-toggle"
            onclick={() => (archivedExpanded = !archivedExpanded)}
            type="button"
          >
            {archivedExpanded ? '▴' : '▾'} Archived ({archivedQuests.length})
          </button>
          {#if archivedExpanded}
            {#each archivedQuests as quest (quest.id)}
              <div class="major-quest archived">
                <div class="quest-header archived-header">
                  <span class="quest-title">{quest.title}</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 100;
    padding-top: 60px;
  }

  .panel {
    background: #0e0d14;
    border: 2px solid #2a2016;
    border-radius: 0;
    width: 640px;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #2a2016;
    background: #120f08;
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 10px;
    letter-spacing: 0.15em;
    color: #c8a84a;
  }

  .close-btn {
    background: none;
    border: none;
    color: #3a2a10;
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    transition: color 0.1s;
  }

  .close-btn:hover {
    color: #c8a84a;
  }

  .quest-list {
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .empty-state {
    font-size: 11px;
    color: #3a3020;
    font-style: italic;
    padding: 8px 0;
  }

  .major-quest {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .major-quest.focus .quest-header {
    border-left: 2px solid #e8b44b;
    padding-left: 10px;
  }

  .quest-header {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    border-left: 2px solid transparent;
    padding: 2px 0 2px 10px;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font-family: inherit;
    transition: border-color 0.1s;
    width: 100%;
  }

  .quest-header:hover {
    border-left-color: #5a4826;
  }

  .focus-indicator {
    font-size: 10px;
    color: #e8b44b;
    flex-shrink: 0;
  }

  .major-quest:not(.focus) .focus-indicator {
    color: #3a2a10;
  }

  .quest-title {
    font-size: 13px;
    font-weight: bold;
    color: #c8a84a;
    flex: 1;
  }

  .major-quest.archived .quest-title {
    color: #3a3020;
    font-size: 11px;
  }

  .quest-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  .counter {
    font-size: 10px;
    color: #5a5040;
  }

  .mood {
    font-size: 9px;
    color: #5a5040;
  }

  .mood--moving-fast {
    color: #39e03a;
  }

  .mood--blocked {
    color: #c84a4a;
  }

  .sub-quests {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sub-quest {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .sq-icon {
    font-size: 10px;
    color: #5a7a5a;
    flex-shrink: 0;
    width: 12px;
    padding-top: 1px;
  }

  .sub-quest--done .sq-icon {
    color: #3a4a3a;
  }

  .sub-quest--blocked .sq-icon {
    color: #8a4a4a;
  }

  .sub-quest--parked .sq-icon {
    color: #2a2a38;
  }

  .sq-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .sq-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sq-title {
    font-size: 11px;
    color: #9090b0;
  }

  .sub-quest--active .sq-title {
    color: #c8c8d4;
  }

  .sub-quest--done .sq-title {
    color: #3a3a4a;
    text-decoration: line-through;
  }

  .sub-quest--blocked .sq-title {
    color: #8a6060;
  }

  .sub-quest--parked .sq-title {
    color: #4a4a5a;
  }

  .sq-age {
    font-size: 9px;
    color: #3a3020;
  }

  .sq-vault {
    font-size: 9px;
    color: #3a4a3a;
    margin-left: auto;
  }

  .sq-notes {
    font-size: 10px;
    color: #5a6a7a;
    font-style: italic;
    line-height: 1.4;
  }

  .archived-section {
    border-top: 1px solid #1e1810;
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .archived-toggle {
    background: none;
    border: none;
    color: #3a3020;
    font-size: 10px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    padding: 0;
    transition: color 0.1s;
  }

  .archived-toggle:hover {
    color: #5a4826;
  }

  .archived-header {
    cursor: default;
  }
</style>
