# AgentWorld

A desktop dashboard for watching [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions across all your projects at once. Built on Electron + Svelte 5 + TypeScript.

Built for people who run 15 projects simultaneously and need to see all of them at a glance — without opening 15 terminals.

https://github.com/thereisno-tomorrow/AgentWorld/issues/1#issue-4051311180

## The Problem

Claude Code is a terminal tool. Each session lives in its own shell, its own VS Code window, its own mental thread. When you're running agents across multiple projects, the cognitive cost isn't the work — it's tracking which agents are alive, which are waiting for input, and which finished an hour ago while you were focused elsewhere.

Tab-switching doesn't scale. You need a single surface that shows everything at once.

## What This Is

AgentWorld reads Claude Code's conversation files from disk and renders them as a spatial overview — one column per project, with live activity indicators showing which agents are running, waiting, or idle.

No database. No server. No cloud. Pure local disk reads from Claude Code's `~/.claude/projects/` directory.

```
THE PROBLEM
  ├── N projects × M active Claude sessions = working memory overflow
  ├── Terminal tabs hide state behind switches
  └── Reconstructing "where am I" from scratch every time
        │
        ▼
THE FIX
  ├── One screen, all projects visible
  ├── Activity indicators: running / waiting / idle — at a glance
  └── Spatial layout anchors state in memory
```

## How It Works

### Focus Mode (default)

Three-pane layout:

- **Left nav** — all discovered projects listed as draggable rows, each with an activity dot and one-line focus summary
- **Center slots** — vertical stack of project workspaces. Drag a project from the nav into a slot. Slots are resizable, collapsible, unlimited. Add more with "+", close with "×"
- **Right thread panel** — click any conversation to read the full message history, newest first

### Board Mode

Press `V` to switch. Horizontal scrolling columns — one per project, draggable to reorder. Same conversation UI per column, just laid out side-by-side instead of stacked.

### Per-Project Column

Each project shows:
- **Activity dot** on the header — gold pulsing ring if any conversation is active
- **Notes textarea** — freeform per-project notes, always visible
- **Active conversations** — draggable rows, reorderable. Each row has its own activity indicator
- **Archive section** — collapsible. Drag conversations between active and archive

### Activity Detection

Reads Claude Code's JSONL conversation files and checks `stop_reason` on the last assistant entry:
- `stop_reason: "tool_use"` → agent is mid-work → gold spinning arc
- `stop_reason: "end_turn"` → agent finished, waiting for you → white pulsing dot
- File older than 2 hours → idle → invisible

Polls every 1 second. No process injection, no API calls.

### Interactions

| Input | Action |
|---|---|
| `V` | Toggle focus / board mode |
| `Q` | Quest overlay |
| `/` | Search conversations across all projects |
| `Escape` | Close panels in order |
| Click conversation | Open thread panel |
| Right-click conversation | Rename, archive, open in VS Code |
| Drag in nav | Reorder projects |
| Drag conversation | Reorder within column, or drag to archive |
| Drag slot divider | Resize slot height (persists) |

## Architecture

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── index.ts             # Entry point, IPC handlers, file watching
│   ├── conversationReader.ts # JSONL parsing, activity detection
│   ├── vaultScanner.ts      # Project discovery from ~/Projects/
│   ├── vaultReader.ts       # Reads project metadata from disk
│   ├── archiveStore.ts      # File-backed archive persistence
│   ├── convTitleStore.ts    # Conversation title overrides
│   └── vaultNotesStore.ts   # Per-project manual notes
├── preload/
│   └── index.ts             # Typed contextBridge API surface
└── renderer/
    └── src/
        ├── App.svelte              # Root — owns all state
        ├── components/
        │   ├── KanbanBoard.svelte   # Board mode layout
        │   ├── VaultColumn.svelte   # Per-project column
        │   ├── VaultSlotsPanel.svelte # Focus mode slots
        │   ├── VaultNavPane.svelte  # Focus mode nav
        │   ├── ConversationThread.svelte # Message viewer
        │   ├── QuestOverlay.svelte  # Quest system (WIP)
        │   ├── SearchModal.svelte   # Cross-project search
        │   └── StatusBar.svelte     # Status bar
        └── lib/
            ├── types.ts             # Shared TypeScript types
            ├── api.ts               # IPC wrapper
            └── stores.svelte.ts     # Shared reactive state
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Build tool | electron-vite + Vite |
| UI framework | Svelte 5 (runes) |
| Language | TypeScript (strict) |
| Styling | Plain CSS — hand-rolled dark theme |
| IPC | Electron contextBridge (typed) |

## Getting Started

```bash
git clone https://github.com/thereisno-tomorrow/AgentWorld.git
cd AgentWorld
npm install
npm run dev
```

AgentWorld scans `~/Projects/` for project directories. Each directory becomes a column. Projects using [Vault OS](https://github.com/thereisno-tomorrow/vault-os) get richer metadata (focus summary from compass.md); plain directories still show conversations.

## Vault OS Integration

AgentWorld is a read-only consumer of the [Vault OS](https://github.com/thereisno-tomorrow/vault-os) protocol. If a project has `ops/vault-manifest.md` and `ops/compass.md`, AgentWorld reads them for project metadata and current focus. It never writes to other projects.

Projects without Vault OS files still work — they appear with conversations but without structured metadata.

## Design Decisions

- **Windows-first.** Process detection uses WMIC. Paths are Windows-native.
- **Read-only.** AgentWorld observes. It never modifies conversation files or project state.
- **No CSS framework.** The dark aesthetic is hand-rolled. Utility classes fight it.
- **Svelte 5 runes only.** `$state`, `$derived`, `$effect` throughout. No legacy syntax.
- **All state in App.svelte.** Single owner, props down.
- **File-backed persistence for critical data.** Archive state, titles, and notes persist to JSON files via IPC — not localStorage (which breaks when the dev server port changes).

## License

MIT
