import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const STORE_PATH = join('C:\\Users\\Nic\\Projects\\AgentWorld\\ops', 'conv-titles.json')

export function loadConvTitles(): Record<string, string> {
  if (!existsSync(STORE_PATH)) return {}
  try {
    return JSON.parse(readFileSync(STORE_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export function saveConvTitles(titles: Record<string, string>): void {
  writeFileSync(STORE_PATH, JSON.stringify(titles, null, 2), 'utf-8')
}
