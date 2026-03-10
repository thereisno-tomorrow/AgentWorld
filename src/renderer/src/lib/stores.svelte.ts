import type { VaultDisplay, MajorQuest } from './types'

export let vaults = $state<VaultDisplay[]>([])
export let majorQuests = $state<MajorQuest[]>([])
export let selectedVaultPath = $state<string | null>(null)
export let questOverlayOpen = $state(false)
