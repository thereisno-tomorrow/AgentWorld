import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

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

export function readVault(vaultPath: string): VaultData {
  return {
    compass: readCompass(vaultPath),
    manifest: readManifest(vaultPath)
  }
}

function readCompass(vaultPath: string): VaultData['compass'] {
  const candidates = [
    join(vaultPath, 'compass.md'),
    join(vaultPath, 'ops', 'compass.md'),
    join(vaultPath, 'notes', 'compass.md')
  ]
  const compassPath = candidates.find(existsSync)
  if (!compassPath) return null

  try {
    const content = readFileSync(compassPath, 'utf-8')
    return parseCompass(content)
  } catch {
    return null
  }
}

function parseCompass(content: string): VaultData['compass'] {
  const extract = (heading: string): string => {
    // Match ## Heading\n\nContent (up to next ## or end)
    const pattern = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i')
    const match = content.match(pattern)
    return match ? match[1].trim() : ''
  }

  // Extract *Updated: ...* date
  const dateMatch = content.match(/\*Updated:\s*([^\*]+)\*/)
  const lastUpdated = dateMatch ? dateMatch[1].trim() : ''

  return {
    currentFocus: extract('Current Focus'),
    inProgress: extract('In Progress') || extract('What.s In Progress'),
    broken: extract('What.s Broken') || extract('Broken'),
    lastUpdated
  }
}

function readManifest(vaultPath: string): VaultData['manifest'] {
  const manifestPath = join(vaultPath, 'ops', 'vault-manifest.md')
  if (!existsSync(manifestPath)) return null

  try {
    const content = readFileSync(manifestPath, 'utf-8')
    return parseManifest(content)
  } catch {
    return null
  }
}

function parseManifest(content: string): VaultData['manifest'] {
  // Extract vault name from first # heading
  const nameMatch = content.match(/^#\s+(.+)$/m)
  const vaultName = nameMatch ? nameMatch[1].trim() : ''

  // Extract load-instruction block
  const instrMatch = content.match(/load-instruction[:\s]*\n([\s\S]*?)(?=\n##|$)/i)
  const loadInstruction = instrMatch ? instrMatch[1].trim() : ''

  return { vaultName, loadInstruction }
}
