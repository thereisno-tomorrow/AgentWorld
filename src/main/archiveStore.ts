import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const STORE_PATH = join('C:\\Users\\Nic\\Projects\\AgentWorld\\ops', 'conv-archive.json')

export interface ArchiveData {
  archived: Record<string, string[]>
  activeOverrides: Record<string, string[]>
}

export function loadArchive(): ArchiveData {
  if (!existsSync(STORE_PATH)) return { archived: {}, activeOverrides: {} }
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8'))
  } catch {
    return { archived: {}, activeOverrides: {} }
  }
}

export function saveArchive(data: ArchiveData): void {
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}
