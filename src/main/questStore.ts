import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

import { homedir } from 'os'

export const QUEST_VAULT_DIR = join(homedir(), 'Projects', 'meta-vault', 'quests')

type SubQuestStatus = 'active' | 'done' | 'blocked' | 'parked'
type MajorQuestStatus = 'active' | 'done'

interface SubQuestData {
  id: string
  title: string
  status: SubQuestStatus
  vault: string | null
  notes: string
  createdAt: string
  lastActiveAt: null
  daysSinceActive: null
}

interface MajorQuestData {
  id: string
  title: string
  status: MajorQuestStatus
  subQuests: SubQuestData[]
  createdAt: string
  completedAt: string | null
  sourceFile: string
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseFrontMatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }
  const meta: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) meta[kv[1]] = kv[2].trim()
  }
  return { meta, body: match[2] }
}

function parseSubQuests(body: string, questCreatedAt: string): SubQuestData[] {
  // Split on ### headings — each section is one sub-quest
  const sections = body.split(/^### /m).filter((s) => s.trim())
  return sections.map((section) => {
    const lines = section.split(/\r?\n/)
    const title = lines[0].trim()
    const fields: Record<string, string> = {}
    for (let i = 1; i < lines.length; i++) {
      const kv = lines[i].match(/^(\w+):\s*(.+)$/)
      if (kv) fields[kv[1].toLowerCase()] = kv[2].trim()
    }
    return {
      id: slugify(title),
      title,
      status: (fields['status'] ?? 'parked') as SubQuestStatus,
      vault: fields['vault'] ?? null,
      notes: fields['notes'] ?? '',
      createdAt: questCreatedAt,
      lastActiveAt: null,
      daysSinceActive: null
    }
  }).filter((sq) => sq.title.length > 0)
}

export function loadQuests(): unknown[] {
  if (!existsSync(QUEST_VAULT_DIR)) return []

  let files: string[]
  try {
    files = readdirSync(QUEST_VAULT_DIR)
      .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
      .sort()
  } catch {
    return []
  }

  const quests: MajorQuestData[] = []
  for (const file of files) {
    try {
      const filePath = join(QUEST_VAULT_DIR, file)
      const content = readFileSync(filePath, 'utf-8')
      const { meta, body } = parseFrontMatter(content)
      if (!meta['title']) continue

      const createdAt = meta['created'] ?? new Date().toISOString().split('T')[0]
      quests.push({
        id: slugify(meta['title']),
        title: meta['title'],
        status: (meta['status'] ?? 'active') as MajorQuestStatus,
        subQuests: parseSubQuests(body, createdAt),
        createdAt,
        completedAt: meta['completed'] ?? null,
        sourceFile: filePath
      })
    } catch {
      // skip malformed files silently
    }
  }

  // Active quests first, then done
  return quests.sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'active' ? -1 : 1
  })
}

export function saveQuests(_quests: unknown): void {
  // Phase 2: inline editing will write back to .md files
  // MVP: edit the .md files in ~/Projects/quests/ directly
}
