import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { QUEST_VAULT_DIR } from './questStore'

const BASE_DIR = 'C:\\Users\\Nic\\Projects'

export interface VaultEntry {
  path: string
  name: string
  isConforming: boolean
}

export function scanVaults(): VaultEntry[] {
  const entries = readdirSync(BASE_DIR, { withFileTypes: true })

  const vaults: VaultEntry[] = entries
    .filter((entry) => {
      if (!entry.isDirectory() || entry.name.startsWith('.')) return false
      // Exclude the quest vault — it's a data source, not a room
      return join(BASE_DIR, entry.name).toLowerCase() !== QUEST_VAULT_DIR.toLowerCase()
    })
    .map((entry) => {
      const vaultPath = join(BASE_DIR, entry.name)
      const manifestPath = join(vaultPath, 'ops', 'vault-manifest.md')
      const hasCompass =
        existsSync(join(vaultPath, 'compass.md')) ||
        existsSync(join(vaultPath, 'ops', 'compass.md'))
      const isConforming = existsSync(manifestPath) && hasCompass
      return { path: vaultPath, name: entry.name, isConforming }
    })

  vaults.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))

  return vaults
}
