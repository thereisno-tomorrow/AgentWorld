import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const STORE_PATH = join('C:\\Users\\Nic\\Projects\\AgentWorld\\ops', 'vault-notes.json')

export function loadVaultNotes(): Record<string, string> {
  if (!existsSync(STORE_PATH)) return {}
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export function saveVaultNotes(notes: Record<string, string>): void {
  writeFileSync(STORE_PATH, JSON.stringify(notes, null, 2), 'utf-8')
}

export function saveVaultNote(path: string, note: string): void {
  const current = loadVaultNotes()
  current[path] = note
  writeFileSync(STORE_PATH, JSON.stringify(current, null, 2), 'utf-8')
}
