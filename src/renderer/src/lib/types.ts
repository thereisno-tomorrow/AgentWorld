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

export type SubQuestStatus = 'active' | 'done' | 'blocked' | 'parked'
export type MajorQuestStatus = 'active' | 'done'

export interface SubQuest {
  id: string
  title: string
  status: SubQuestStatus
  vault: string | null
  notes: string
  createdAt: string
  lastActiveAt: string | null
  daysSinceActive: number | null
}

export interface MajorQuest {
  id: string
  title: string
  status: MajorQuestStatus
  subQuests: SubQuest[]
  createdAt: string
  completedAt: string | null
  sourceFile: string
}

export interface AgentInfo {
  lastActiveAt: string | null
  processRunning: boolean
  crossVaultReads: string[]
}

export interface Conversation {
  id: string
  mtime: string
  birthtime: string
  title?: string
  lastHumanMessage?: string
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

export interface NativeSearchResult {
  id: string
  vaultPath: string
  title: string
  mtime: string
}

export interface VaultDisplay extends VaultEntry {
  compass: VaultData['compass']
  manifest: VaultData['manifest']
  agent: AgentInfo
}
