import { exec } from 'child_process'

/**
 * Returns working directories of processes with 'claude' in their command line.
 * Uses PowerShell + WMI. Windows-only.
 */
export function detectActiveVaultPaths(): Promise<string[]> {
  return new Promise((resolve) => {
    // Base64-encode the PS command to avoid all cmd.exe escaping issues
    const ps = `Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*claude*' } | ForEach-Object { $_.WorkingDirectory }`
    const encoded = Buffer.from(ps, 'utf16le').toString('base64')
    const cmd = `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`

    exec(cmd, { timeout: 8000 }, (err, stdout) => {
      if (err) { resolve([]); return }
      const paths = stdout
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 3 && (l.includes('\\') || l.includes('/')))
      resolve(paths)
    })
  })
}
