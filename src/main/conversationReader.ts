import { homedir } from 'os'
import { join } from 'path'
import { readdirSync, statSync, readFileSync, openSync, readSync, closeSync } from 'fs'

export interface ConvMeta {
  id: string
  mtime: string
  birthtime: string
  title?: string
  lastHumanMessage?: string
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | string
  text?: string
  name?: string
  input?: unknown
  content?: unknown
}

export interface NativeMessage {
  role: 'user' | 'assistant'
  timestamp: string
  content: string | ContentBlock[]
}

export interface NativeMessagesResult {
  messages: NativeMessage[]
  hasMore: boolean
  page: number
}

export interface NativeSearchResult {
  id: string
  vaultPath: string
  title: string
  mtime: string
}

/** C:\Users\You\Projects\Foo → c--Users-You-Projects-Foo */
export function encodeVaultPath(vaultPath: string): string {
  return vaultPath
    .replace(/^([A-Za-z]):/, (_, d: string) => d.toLowerCase() + '-')
    .replace(/[/\\]/g, '-')
}

export function getProjectDir(vaultPath: string): string {
  return join(homedir(), '.claude', 'projects', encodeVaultPath(vaultPath))
}

function cleanTitle(raw: string): string {
  const line = raw.split('\n')[0].trim()
  const sentEnd = line.search(/[.?!]\s/)
  const sentence = sentEnd > 10 && sentEnd < 60 ? line.slice(0, sentEnd) : line
  if (sentence.length <= 50) return sentence
  const cut = sentence.slice(0, 50)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > 20 ? cut.slice(0, lastSpace) : cut
}

export function extractJsonlTitle(filePath: string, fileSize: number): string | undefined {
  try {
    // 512KB covers system-reminder injections + moderate screenshot usage
    const bufSize = Math.min(524288, fileSize)
    if (bufSize === 0) return undefined
    const buf = Buffer.alloc(bufSize)
    const fd = openSync(filePath, 'r')
    readSync(fd, buf, 0, bufSize, 0)
    closeSync(fd)
    const text = buf.toString('utf8')
    const lines = text.split('\n')
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.type !== 'user') continue
        const content = entry.message?.content
        if (!content) continue
        const texts: string[] = Array.isArray(content)
          ? content
              .filter((b: { type?: string }) => b.type === 'text')
              .map((b: { text?: string }) => b.text ?? '')
          : [String(content)]
        const t = texts.find((s) => s.trim() && !s.trimStart().startsWith('<'))
        if (t) return cleanTitle(t.trim())
      } catch {
        // partial line — fall through to regex fallback below
      }
    }

    // Regex fallback: handles lines truncated mid-JSON due to large injected content.
    // Scans for text blocks after the first "type":"user" marker.
    const userIdx = text.indexOf('"type":"user"')
    if (userIdx === -1) return undefined
    const afterUser = text.slice(userIdx)
    const re = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(afterUser)) !== null) {
      try {
        const decoded = JSON.parse('"' + m[1] + '"') as string
        if (decoded.trim() && !decoded.trimStart().startsWith('<')) {
          return cleanTitle(decoded.trim())
        }
      } catch {
        // skip malformed match
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

export function extractLastHumanMessage(filePath: string, fileSize: number): string | undefined {
  try {
    if (fileSize === 0) return undefined
    const bufSize = Math.min(4096, fileSize)
    const buf = Buffer.alloc(bufSize)
    const fd = openSync(filePath, 'r')
    readSync(fd, buf, 0, bufSize, fileSize - bufSize)
    closeSync(fd)
    const lines = buf.toString('utf8').split('\n').filter((l) => l.trim())
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i])
        if (entry.type !== 'user' && entry.type !== 'human') continue
        const content = entry.message?.content
        if (!content) continue
        const texts: string[] = Array.isArray(content)
          ? content
              .filter((b: { type?: string }) => b.type === 'text')
              .map((b: { text?: string }) => b.text ?? '')
          : [String(content)]
        const t = texts.find((s) => s.trim() && !s.trimStart().startsWith('<'))
        if (t) return t.trim().slice(0, 120)
      } catch {
        // partial line at buffer boundary — skip
      }
    }
    return undefined
  } catch {
    return undefined
  }
}

function hasConversationEntries(filePath: string, fileSize: number): boolean {
  try {
    const bufSize = Math.min(4096, fileSize)
    if (bufSize === 0) return false
    const buf = Buffer.alloc(bufSize)
    const fd = openSync(filePath, 'r')
    readSync(fd, buf, 0, bufSize, 0)
    closeSync(fd)
    const text = buf.toString('utf8')
    return text.includes('"type":"user"') || text.includes('"type":"assistant"')
  } catch {
    return false
  }
}

export function listConversations(vaultPath: string): ConvMeta[] {
  try {
    const dir = getProjectDir(vaultPath)
    return readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .filter((f) => {
        const filePath = join(dir, f)
        const stat = statSync(filePath)
        return hasConversationEntries(filePath, stat.size)
      })
      .map((f) => {
        const id = f.replace('.jsonl', '')
        const filePath = join(dir, f)
        const stat = statSync(filePath)
        const title = extractJsonlTitle(filePath, stat.size)
        const lastHumanMessage = extractLastHumanMessage(filePath, stat.size)
        return {
          id,
          mtime: stat.mtime.toISOString(),
          birthtime: stat.birthtime.toISOString(),
          title,
          lastHumanMessage
        }
      })
  } catch {
    return []
  }
}

export function tailConversation(
  vaultPath: string,
  convId: string
): 'human' | 'assistant' | 'unknown' {
  try {
    const filePath = join(getProjectDir(vaultPath), `${convId}.jsonl`)
    const stat = statSync(filePath)
    if (stat.size === 0) return 'unknown'

    const bufSize = Math.min(8192, stat.size)
    const buf = Buffer.alloc(bufSize)
    const fd = openSync(filePath, 'r')
    readSync(fd, buf, 0, bufSize, stat.size - bufSize)
    closeSync(fd)

    const mtimeAgeSecs = (Date.now() - stat.mtimeMs) / 1000
    const lines = buf
      .toString('utf8')
      .split('\n')
      .filter((l) => l.trim())

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i])
        if (entry.type === 'human' || entry.type === 'user') {
          // User sent message — Claude should be thinking/starting
          // 5-minute timeout covers extended thinking
          if (mtimeAgeSecs > 300) return 'unknown'
          return 'human'
        }
        if (entry.type === 'assistant') {
          // Check stop_reason: "tool_use" = mid-work, "end_turn" = done
          if (entry.stop_reason && entry.stop_reason !== 'end_turn') {
            if (mtimeAgeSecs > 300) return 'unknown'
            return 'human'
          }
          if (mtimeAgeSecs < 10) return 'human'
          if (mtimeAgeSecs < 2 * 3600) return 'assistant'
          return 'unknown'
        }
      } catch {
        // partial line at buffer boundary — skip
      }
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

const PAGE_SIZE = 50

export function readMessages(
  vaultPath: string,
  convId: string,
  page: number
): NativeMessagesResult {
  try {
    const filePath = join(getProjectDir(vaultPath), `${convId}.jsonl`)
    const raw = readFileSync(filePath, 'utf8')
    const lines = raw.split('\n').filter((l) => l.trim())

    const messages: NativeMessage[] = []
    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.type !== 'user' && entry.type !== 'assistant') continue
        messages.push({
          role: entry.type === 'user' ? 'user' : 'assistant',
          timestamp: entry.timestamp ?? '',
          content: entry.message?.content ?? ''
        })
      } catch {
        // skip malformed lines
      }
    }

    const reversed = messages.slice().reverse()
    const start = (page - 1) * PAGE_SIZE
    const slice = reversed.slice(start, start + PAGE_SIZE)
    return { messages: slice, hasMore: start + PAGE_SIZE < reversed.length, page }
  } catch {
    return { messages: [], hasMore: false, page }
  }
}

export function searchByTitle(query: string, vaultPath?: string): NativeSearchResult[] {
  const q = query.toLowerCase()
  const results: NativeSearchResult[] = []

  function scanDir(dir: string, resolvedVaultPath: string): void {
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
      for (const f of files) {
        const filePath = join(dir, f)
        try {
          const stat = statSync(filePath)
          const title = extractJsonlTitle(filePath, stat.size)
          if (!title) continue
          if (!title.toLowerCase().includes(q)) continue
          results.push({
            id: f.replace('.jsonl', ''),
            vaultPath: resolvedVaultPath,
            title,
            mtime: stat.mtime.toISOString()
          })
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  if (vaultPath) {
    scanDir(getProjectDir(vaultPath), vaultPath)
  } else {
    // Scan all project dirs under ~/.claude/projects/
    const base = join(homedir(), '.claude', 'projects')
    try {
      const projectDirs = readdirSync(base)
      for (const dir of projectDirs) {
        const full = join(base, dir)
        try {
          if (!statSync(full).isDirectory()) continue
        } catch {
          continue
        }
        // We don't know the original vault path from the encoded dir name,
        // store the encoded dir name as a stand-in — SearchModal uses it for display only
        scanDir(full, dir)
      }
    } catch {
      // ~/.claude/projects not readable
    }
  }

  return results.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
}
