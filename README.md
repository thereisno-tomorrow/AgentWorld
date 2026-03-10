# AgentWorld

A Fallout Shelter-style cross-section UI for visualizing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions across multiple projects. Built on Electron + Svelte 5 + TypeScript.

Built for people who run 15 projects simultaneously and need to see all of them at a glance — without opening 15 terminals.

## The Problem

Claude Code is a terminal tool. Each session lives in its own shell, its own VS Code window, its own mental thread. When you're running agents across multiple projects, the cognitive cost isn't the work — it's tracking which agents are alive, which are waiting for input, and which finished an hour ago while you were focused elsewhere.

Tab-switching doesn't scale. You need a single surface that shows everything at once.

## What This Is

AgentWorld reads Claude Code's conversation files from disk and renders them as a spatial overview — one column per project, with live activity indicators showing which agents are running, which are waiting, and which are idle.

It's a cognitive prosthetic, not a project manager. The game metaphor isn't decoration — it exploits spatial memory to anchor complex state in a navigable place.

```
THE PROBLEM
  ├── N projects × M active Claude sessions = working memory overflow
  ├── Terminal tabs hide state behind switches
  └── ADHD brain reconstructs "where am I" from scratch every time
        │
        ▼
THE FIX
  ├── One screen, all projects visible
  ├── Activity indicators: running / waiting / idle — at a glance
  └── Spatial layout anchors state in memory
```

## How It Works

### Board Mode

Horizontal kanban — one column per project. Each column shows:
- **Activity dot** — gold spinning arc (agent running), white pulse (waiting for input), invisible (idle)
- **Conversation list** — every Claude session in that project, sorted by recency
- **Manual notes** — per-project textarea for context you want to remember
- **Archive section** — drag conversations to archive, collapsible

### Focus Mode

Press `V` to switch. Left nav pane with all projects, right panel with pinnable vault slots. Drag a project from the nav into a slot to focus on it. Slots are resizable, scrollable, unlimited.

### Conversation Thread

Click any conversation row to open a right-side panel showing the full message history, newest first. "Load more" pages into older messages.

### Activity Detection

AgentWorld reads Claude Code's JSONL conversation files and checks `stop_reason` on the last assistant entry:
- `stop_reason: "tool_use"` → agent is mid-work (gold spinner)
- `stop_reason: "end_turn"` → agent finished, waiting for you (white pulse)
- File older than 2 hours → idle (invisible)

Polls every 1 second. No process injection, no API calls — pure disk reads.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Toggle board / focus mode |
| `Q` | Quest overlay |
| `/` | Search conversations across all projects |
| `Escape` | Close panels in order |

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
        │   └── StatusBar.svelte     # Bottom bar
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

No database. No server. No cloud. All data comes from local disk — Claude Code's `~/.claude/projects/` directory and project folders in `~/Projects/`.

## Getting Started

```bash
# Clone
git clone https://github.com/thereisno-tomorrow/AgentWorld.git
cd AgentWorld

# Install
npm install

# Dev mode (hot reload)
npm run dev

# Build for Windows
npm run build:win
```

AgentWorld scans `~/Projects/` for project directories. Each directory becomes a column. Projects using [Vault OS](https://github.com/thereisno-tomorrow/vault-os) get richer metadata; plain directories still show conversations.

## Vault OS Integration

AgentWorld is a read-only consumer of the Vault OS protocol. If a project has `ops/vault-manifest.md` and `ops/compass.md`, AgentWorld reads them for project metadata. It never writes to other projects.

Projects without Vault OS files still work — they show as columns with conversations but without structured metadata.

## Design Decisions

- **Windows-first.** Process detection uses WMIC. Paths are Windows-native. No Unix assumptions in the main process.
- **Read-only.** AgentWorld observes. It never modifies conversation files or project state.
- **No CSS framework.** The dark game aesthetic is hand-rolled. Utility classes fight it.
- **Svelte 5 runes only.** No legacy `$:` syntax. `$state`, `$derived`, `$effect` throughout.
- **All state in App.svelte.** Single owner, props down. No context API, no global stores for component state.
- **File-backed persistence for critical data.** Archive state, conversation titles, and notes persist to JSON files via IPC — not localStorage (which breaks when the dev server port changes).

## License

MIT
