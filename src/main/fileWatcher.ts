import chokidar, { FSWatcher } from 'chokidar'
import { join } from 'path'
import { existsSync } from 'fs'
import type { WebContents } from 'electron'

const watchers = new Map<string, FSWatcher>()

function findCompassPath(vaultPath: string): string {
  const candidates = [
    join(vaultPath, 'compass.md'),
    join(vaultPath, 'ops', 'compass.md')
  ]
  return candidates.find(existsSync) || candidates[0]
}

export function subscribeVault(vaultPath: string, sender: WebContents): void {
  if (watchers.has(vaultPath)) return

  const compassPath = findCompassPath(vaultPath)

  const watcher = chokidar.watch(compassPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
  })

  watcher.on('change', () => {
    if (!sender.isDestroyed()) {
      sender.send('vault:changed', { path: vaultPath })
    }
  })

  watchers.set(vaultPath, watcher)
}

export function unsubscribeVault(vaultPath: string): void {
  const watcher = watchers.get(vaultPath)
  if (watcher) {
    watcher.close()
    watchers.delete(vaultPath)
  }
}
