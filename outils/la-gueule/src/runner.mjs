// Lance une commande externe et capture sa sortie. Utilisé par le diagnostic d'environnement
// (`/api/doctor` et `gueule doctor`) pour sonder wsl.exe / docker sur l'hôte Windows.
// (L'OCR, lui, passe par wsl.mjs::runBash.) Résout toujours ; ne rejette jamais.

import { spawn } from 'node:child_process'

export function executer(cmd, argv, { cwd } = {}) {
  return new Promise((resolve) => {
    let stdout = '', stderr = ''
    let proc
    try {
      proc = spawn(cmd, argv, { cwd, windowsHide: true })
    } catch (e) {
      resolve({ ok: false, code: -1, stdout, stderr: String(e?.message ?? e), lance: false })
      return
    }
    proc.stdout?.on('data', (d) => { stdout += d })
    proc.stderr?.on('data', (d) => { stderr += d })
    proc.on('error', (e) => resolve({ ok: false, code: -1, stdout, stderr: String(e?.message ?? e), lance: false }))
    proc.on('close', (code) => resolve({ ok: code === 0, code, stdout, stderr, lance: true }))
  })
}
