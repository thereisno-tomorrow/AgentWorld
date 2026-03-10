/**
 * API accessor — returns demo mock or real Electron IPC API.
 * Toggle demo: localStorage.setItem('agentworld:demo', '1') then reload.
 */
import type { AgentWorldAPI } from '../../../preload/index'
import { demoApi } from './demoData'

const DEMO = localStorage.getItem('agentworld:demo') === '1'

export const api: AgentWorldAPI = DEMO ? demoApi : window.agentWorld
