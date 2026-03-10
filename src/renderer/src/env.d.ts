/// <reference types="svelte" />
/// <reference types="vite/client" />

import type { AgentWorldAPI } from '../../preload/index'

declare global {
  interface Window {
    agentWorld: AgentWorldAPI
  }
}
