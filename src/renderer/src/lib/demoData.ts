/**
 * Demo mode mock data — fake vaults and conversations for screenshots.
 * Activate: localStorage.setItem('agentworld:demo', '1') then reload.
 * Deactivate: localStorage.removeItem('agentworld:demo') then reload.
 */

import type { AgentWorldAPI } from '../../../preload/index'

const now = new Date().toISOString()
const ago = (mins: number): string => new Date(Date.now() - mins * 60_000).toISOString()

const fakeVaults = [
  { path: 'C:\\demo\\atlas-engine', name: 'atlas-engine', isConforming: true },
  { path: 'C:\\demo\\verdant-api', name: 'verdant-api', isConforming: true },
  { path: 'C:\\demo\\helix-ui', name: 'helix-ui', isConforming: true },
  { path: 'C:\\demo\\northstar-ml', name: 'northstar-ml', isConforming: true },
  { path: 'C:\\demo\\cipher-auth', name: 'cipher-auth', isConforming: true },
  { path: 'C:\\demo\\mosaic-docs', name: 'mosaic-docs', isConforming: true },
  { path: 'C:\\demo\\orbit-infra', name: 'orbit-infra', isConforming: true },
  { path: 'C:\\demo\\prism-analytics', name: 'prism-analytics', isConforming: false }
]

const fakeVaultData: Record<string, { compass: NonNullable<ReturnType<typeof makeCompass>>; manifest: { vaultName: string; loadInstruction: string } }> = {
  'C:\\demo\\atlas-engine': {
    compass: makeCompass('Migrating query layer to streaming architecture', 'Query streaming POC — benchmarks passing', 'Nothing', '2026-03-10'),
    manifest: { vaultName: 'Atlas Engine', loadInstruction: 'Read compass first' }
  },
  'C:\\demo\\verdant-api': {
    compass: makeCompass('Rate limiting and auth middleware', 'Rate limiter integration tests', 'Nothing', '2026-03-10'),
    manifest: { vaultName: 'Verdant API', loadInstruction: 'Read compass first' }
  },
  'C:\\demo\\helix-ui': {
    compass: makeCompass('Component library v2 — design tokens', 'Token migration across 14 components', 'Nothing', '2026-03-09'),
    manifest: { vaultName: 'Helix UI', loadInstruction: 'Read compass first' }
  },
  'C:\\demo\\northstar-ml': {
    compass: makeCompass('Fine-tuning pipeline for classification model', 'Dataset preprocessing pipeline', 'GPU quota exceeded on training cluster', '2026-03-10'),
    manifest: { vaultName: 'Northstar ML', loadInstruction: 'Read compass first' }
  },
  'C:\\demo\\cipher-auth': {
    compass: makeCompass('OAuth2 PKCE flow implementation', 'Token refresh logic', 'Nothing', '2026-03-08'),
    manifest: { vaultName: 'Cipher Auth', loadInstruction: 'Read compass first' }
  },
  'C:\\demo\\mosaic-docs': {
    compass: makeCompass('API reference auto-generation from OpenAPI spec', 'Nothing in progress', 'Nothing', '2026-03-07'),
    manifest: { vaultName: 'Mosaic Docs', loadInstruction: 'Read compass first' }
  },
  'C:\\demo\\orbit-infra': {
    compass: makeCompass('Terraform module for multi-region deploy', 'VPC peering configuration', 'Nothing', '2026-03-10'),
    manifest: { vaultName: 'Orbit Infra', loadInstruction: 'Read compass first' }
  }
}

function makeCompass(focus: string, inProgress: string, broken: string, lastUpdated: string) {
  return { currentFocus: focus, inProgress, broken, lastUpdated }
}

// Fake conversations per vault
const fakeConversations: Record<string, Array<{ id: string; mtime: string; birthtime: string; title?: string }>> = {
  'C:\\demo\\atlas-engine': [
    { id: 'conv-a1', mtime: ago(2), birthtime: ago(120), title: 'Implement streaming query cursor' },
    { id: 'conv-a2', mtime: ago(45), birthtime: ago(300), title: 'Benchmark connection pooling strategies' },
    { id: 'conv-a3', mtime: ago(180), birthtime: ago(500), title: 'Fix deadlock in transaction manager' },
    { id: 'conv-a4', mtime: ago(1440), birthtime: ago(2000), title: 'Schema migration v3 planning' }
  ],
  'C:\\demo\\verdant-api': [
    { id: 'conv-v1', mtime: ago(5), birthtime: ago(60), title: 'Add sliding window rate limiter' },
    { id: 'conv-v2', mtime: ago(30), birthtime: ago(200), title: 'Middleware chain refactor' },
    { id: 'conv-v3', mtime: ago(600), birthtime: ago(1200), title: 'OpenAPI spec generation' }
  ],
  'C:\\demo\\helix-ui': [
    { id: 'conv-h1', mtime: ago(15), birthtime: ago(90), title: 'Design token migration — color scale' },
    { id: 'conv-h2', mtime: ago(60), birthtime: ago(400), title: 'Button component accessibility audit' },
    { id: 'conv-h3', mtime: ago(200), birthtime: ago(800), title: 'Storybook integration for new tokens' },
    { id: 'conv-h4', mtime: ago(500), birthtime: ago(1000), title: 'Dialog component keyboard navigation' },
    { id: 'conv-h5', mtime: ago(2000), birthtime: ago(3000), title: 'Initial component library scaffold' }
  ],
  'C:\\demo\\northstar-ml': [
    { id: 'conv-n1', mtime: ago(1), birthtime: ago(30), title: 'Debug GPU OOM on batch size 64' },
    { id: 'conv-n2', mtime: ago(90), birthtime: ago(500), title: 'Preprocessing pipeline for labeled dataset' },
    { id: 'conv-n3', mtime: ago(300), birthtime: ago(700), title: 'Evaluation metrics dashboard' }
  ],
  'C:\\demo\\cipher-auth': [
    { id: 'conv-c1', mtime: ago(120), birthtime: ago(400), title: 'PKCE flow — authorization code exchange' },
    { id: 'conv-c2', mtime: ago(500), birthtime: ago(900), title: 'Token rotation strategy' }
  ],
  'C:\\demo\\mosaic-docs': [
    { id: 'conv-m1', mtime: ago(300), birthtime: ago(600), title: 'OpenAPI to Markdown generator' },
    { id: 'conv-m2', mtime: ago(1000), birthtime: ago(2000), title: 'Sidebar navigation restructure' }
  ],
  'C:\\demo\\orbit-infra': [
    { id: 'conv-o1', mtime: ago(8), birthtime: ago(100), title: 'Multi-region Terraform module' },
    { id: 'conv-o2', mtime: ago(50), birthtime: ago(350), title: 'VPC peering across 3 regions' },
    { id: 'conv-o3', mtime: ago(400), birthtime: ago(800), title: 'CI/CD pipeline for infra changes' }
  ],
  'C:\\demo\\prism-analytics': [
    { id: 'conv-p1', mtime: ago(600), birthtime: ago(1200), title: 'Event ingestion pipeline design' }
  ]
}

// Simulate activity: some conversations "running", some "waiting"
const activityOverrides: Record<string, 'human' | 'assistant'> = {
  'conv-a1': 'assistant', // running (recent mtime)
  'conv-v1': 'assistant', // running
  'conv-n1': 'assistant', // running
  'conv-o1': 'assistant', // running
  'conv-a2': 'human',     // waiting
  'conv-h1': 'human',     // waiting
}

const fakeNotes: Record<string, string> = {
  'C:\\demo\\atlas-engine': 'Core data layer. Streaming migration is the priority — blocks Verdant API work.',
  'C:\\demo\\northstar-ml': 'GPU quota issue — filed support ticket #4821. Try smaller batch size as workaround.',
  'C:\\demo\\helix-ui': 'Design tokens finalized in Figma. Migration is mechanical but touches every component.'
}

export const demoApi: AgentWorldAPI = {
  vaults: {
    scan: async () => fakeVaults
  },
  vault: {
    read: async (path: string) => fakeVaultData[path] ?? { compass: null, manifest: null }
  },
  quests: {
    load: async () => [],
    save: async () => {}
  },
  shell: {
    openVSCode: async () => {},
    openConversationInVSCode: async () => {},
    openExternal: async () => {}
  },
  watch: {
    subscribe: () => {},
    unsubscribe: () => {}
  },
  processes: {
    scan: async () => []
  },
  conversation: {
    tail: async (convId: string) => activityOverrides[convId] ?? 'unknown',
    list: async (vaultPath: string) => fakeConversations[vaultPath] ?? [],
    messages: async () => ({ messages: [], hasMore: false, page: 0 }),
    search: async () => []
  },
  convTitles: {
    load: async () => ({}),
    save: async () => {}
  },
  vaultNotes: {
    load: async () => fakeNotes,
    save: async () => {},
    saveOne: async () => {}
  },
  archive: {
    load: async () => ({ archived: {}, activeOverrides: {} }),
    save: async () => {}
  },
  on: () => () => {}
}
