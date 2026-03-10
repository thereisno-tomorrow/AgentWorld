import { ipcMain, shell, clipboard } from 'electron'
import { exec } from 'child_process'
import { scanVaults } from './vaultScanner'
import { readVault } from './vaultReader'
import { loadQuests, saveQuests } from './questStore'
import { loadConvTitles, saveConvTitles } from './convTitleStore'
import { loadVaultNotes, saveVaultNotes, saveVaultNote } from './vaultNotesStore'
import { loadArchive, saveArchive, ArchiveData } from './archiveStore'
import { subscribeVault, unsubscribeVault } from './fileWatcher'
import { detectActiveVaultPaths } from './processDetector'
import {
  listConversations,
  tailConversation,
  readMessages,
  searchByTitle
} from './conversationReader'

export function registerIpcHandlers(): void {
  ipcMain.handle('vaults:scan', () => scanVaults())

  ipcMain.handle('vault:read', (_event, path: string) => readVault(path))

  ipcMain.handle('quests:load', () => loadQuests())

  ipcMain.handle('quests:save', (_event, quests: unknown) => saveQuests(quests))

  ipcMain.handle('convTitles:load', () => loadConvTitles())

  ipcMain.handle('convTitles:save', (_event, titles: Record<string, string>) =>
    saveConvTitles(titles)
  )

  ipcMain.handle('vaultNotes:load', () => loadVaultNotes())

  ipcMain.handle('vaultNotes:save', (_event, notes: Record<string, string>) =>
    saveVaultNotes(notes)
  )

  ipcMain.handle('vaultNotes:saveOne', (_event, path: string, note: string) =>
    saveVaultNote(path, note)
  )

  ipcMain.handle('archive:load', () => loadArchive())

  ipcMain.handle('archive:save', (_event, data: ArchiveData) => saveArchive(data))

  ipcMain.handle('shell:open-vscode', (_event, vaultPath: string) => {
    // Quote the path so & and spaces in vault names don't break cmd.exe parsing
    // -n opens a new VS Code window, leaving existing windows untouched
    const quoted = `"${vaultPath.replace(/"/g, '""')}"`
    exec(`code -n ${quoted}`)
  })

  ipcMain.handle('shell:open-conversation-vscode', (_event, vaultPath: string, convId: string) => {
    const quoted = `"${vaultPath.replace(/"/g, '""')}"`
    // -r reuses existing window for this folder (focuses it if already open)
    exec(`code -r ${quoted}`)
    // Copy resume command to clipboard so user can paste in VS Code terminal
    clipboard.writeText(`claude --resume ${convId}`)
  })

  ipcMain.handle('shell:open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.on('watch:subscribe', (_event, path: string) => {
    subscribeVault(path, _event.sender)
  })

  ipcMain.on('watch:unsubscribe', (_event, path: string) => {
    unsubscribeVault(path)
  })

  ipcMain.handle('processes:scan', () => detectActiveVaultPaths())

  ipcMain.handle('conversations:list', (_event, vaultPath: string) =>
    listConversations(vaultPath)
  )

  ipcMain.handle(
    'conversation:tail',
    (_event, { convId, vaultPath }: { convId: string; vaultPath: string }) =>
      tailConversation(vaultPath, convId)
  )

  ipcMain.handle(
    'conversation:messages',
    (_event, { vaultPath, convId, page = 1 }: { vaultPath: string; convId: string; page?: number }) =>
      readMessages(vaultPath, convId, page)
  )

  ipcMain.handle(
    'conversations:search',
    (_event, { query, vaultPath }: { query: string; vaultPath?: string }) =>
      searchByTitle(query, vaultPath)
  )
}
