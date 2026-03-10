import { contextBridge, ipcRenderer } from 'electron'

export interface VaultEntry {
  path: string
  name: string
  isConforming: boolean
}

export interface VaultData {
  compass: {
    currentFocus: string
    inProgress: string
    broken: string
    lastUpdated: string
  } | null
  manifest: {
    vaultName: string
    loadInstruction: string
  } | null
}

export interface Quest {
  id: string
  name: string
  tier: 'main' | 'side'
  status: 'active' | 'archived'
  vaultPaths: string[]
  createdAt: string
  archivedAt: string | null
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | string
  text?: string
  name?: string
  input?: unknown
  content?: unknown
}

export interface NativeMessage {
  role: 'user' | 'assistant'
  timestamp: string
  content: string | ContentBlock[]
}

export interface NativeMessagesResult {
  messages: NativeMessage[]
  hasMore: boolean
  page: number
}


export interface NativeSearchResult {
  id: string
  vaultPath: string
  title: string
  mtime: string
}

export interface AgentWorldAPI {
  vaults: {
    scan(): Promise<VaultEntry[]>
  }
  vault: {
    read(path: string): Promise<VaultData>
  }
  quests: {
    load(): Promise<Quest[]>
    save(quests: Quest[]): Promise<void>
  }
  shell: {
    openVSCode(path: string): Promise<void>
    openConversationInVSCode(vaultPath: string, convId: string): Promise<void>
    openExternal(url: string): Promise<void>
  }
  watch: {
    subscribe(path: string): void
    unsubscribe(path: string): void
  }
  processes: {
    scan(): Promise<string[]>
  }
  conversation: {
    tail(convId: string, vaultPath: string): Promise<'human' | 'assistant' | 'unknown'>
    list(vaultPath: string): Promise<Array<{ id: string; mtime: string; birthtime: string; title?: string; lastHumanMessage?: string }>>
    messages(vaultPath: string, convId: string, page?: number): Promise<NativeMessagesResult>
    search(query: string, vaultPath?: string): Promise<NativeSearchResult[]>
  }
  convTitles: {
    load(): Promise<Record<string, string>>
    save(titles: Record<string, string>): Promise<void>
  }
  vaultNotes: {
    load(): Promise<Record<string, string>>
    save(notes: Record<string, string>): Promise<void>
    saveOne(path: string, note: string): Promise<void>
  }
  archive: {
    load(): Promise<{ archived: Record<string, string[]>; activeOverrides: Record<string, string[]> }>
    save(data: { archived: Record<string, string[]>; activeOverrides: Record<string, string[]> }): Promise<void>
  }
  on(event: string, handler: (...args: unknown[]) => void): () => void
}

const api: AgentWorldAPI = {
  vaults: {
    scan: () => ipcRenderer.invoke('vaults:scan')
  },
  vault: {
    read: (path: string) => ipcRenderer.invoke('vault:read', path)
  },
  quests: {
    load: () => ipcRenderer.invoke('quests:load'),
    save: (quests: Quest[]) => ipcRenderer.invoke('quests:save', quests)
  },
  shell: {
    openVSCode: (path: string) => ipcRenderer.invoke('shell:open-vscode', path),
    openConversationInVSCode: (vaultPath: string, convId: string) =>
      ipcRenderer.invoke('shell:open-conversation-vscode', vaultPath, convId),
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url)
  },
  watch: {
    subscribe: (path: string) => ipcRenderer.send('watch:subscribe', path),
    unsubscribe: (path: string) => ipcRenderer.send('watch:unsubscribe', path)
  },
  processes: {
    scan: () => ipcRenderer.invoke('processes:scan')
  },
  conversation: {
    tail: (convId, vaultPath) => ipcRenderer.invoke('conversation:tail', { convId, vaultPath }),
    list: (vaultPath) => ipcRenderer.invoke('conversations:list', vaultPath),
    messages: (vaultPath, convId, page) =>
      ipcRenderer.invoke('conversation:messages', { vaultPath, convId, page }),
    search: (query, vaultPath) =>
      ipcRenderer.invoke('conversations:search', { query, vaultPath })
  },
  convTitles: {
    load: () => ipcRenderer.invoke('convTitles:load'),
    save: (titles: Record<string, string>) => ipcRenderer.invoke('convTitles:save', titles)
  },
  vaultNotes: {
    load: () => ipcRenderer.invoke('vaultNotes:load'),
    save: (notes: Record<string, string>) => ipcRenderer.invoke('vaultNotes:save', notes),
    saveOne: (path: string, note: string) => ipcRenderer.invoke('vaultNotes:saveOne', path, note)
  },
  archive: {
    load: () => ipcRenderer.invoke('archive:load'),
    save: (data: { archived: Record<string, string[]>; activeOverrides: Record<string, string[]> }) =>
      ipcRenderer.invoke('archive:save', data)
  },
  on: (event: string, handler: (...args: unknown[]) => void) => {
    const listener = (_: unknown, ...args: unknown[]): void => handler(...args)
    ipcRenderer.on(event, listener)
    return () => ipcRenderer.removeListener(event, listener)
  }
}

contextBridge.exposeInMainWorld('agentWorld', api)
