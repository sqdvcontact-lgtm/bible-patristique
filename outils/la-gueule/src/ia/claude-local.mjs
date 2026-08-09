// Fournisseur IA LOCAL — pilote le CLI Claude Code installé sur la machine (`claude -p`), authentifié
// par ABONNEMENT (`claude setup-token`). Donc AUCUNE clé API, AUCUN crédit console : l'usage passe par
// le forfait, dans ses limites. Les données (l'image de la page de titre) partent quand même chez
// Anthropic — c'est un appel « cloud » au sens du consentement (§14.6), simplement facturé autrement.
//
// Le CLI lit l'image par son CHEMIN (outil Read), pas en base64. La sortie du CLI est une enveloppe
// JSON (`--output-format json`) dont le champ `result` porte la réponse du modèle ; on en extrait le
// JSON de métadonnées. Ne lève JAMAIS d'exception (panne / absence du CLI / non-connecté → abstention
// traçable). Sortie = CANDIDAT, jamais une validation.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SYSTEME_META, consigneMetadonnees } from './prompt.mjs'

/**
 * Résout le binaire du CLI. `LG_AI_CLI` gagne toujours ; sinon, sur Windows, on tente l'emplacement
 * npm global (%APPDATA%\npm\claude.cmd) car il n'est pas toujours dans le PATH du processus serveur ;
 * à défaut on laisse le nom nu (résolu par le PATH). Pur au sens : ne dépend que de env + du FS.
 */
export function resoudreBin(env = {}) {
  if (env.LG_AI_CLI && existsSync(env.LG_AI_CLI)) return env.LG_AI_CLI
  if (env.LG_AI_CLI) return env.LG_AI_CLI
  if (process.platform === 'win32') {
    const appdata = env.APPDATA || process.env.APPDATA
    if (appdata) { const p = join(appdata, 'npm', 'claude.cmd'); if (existsSync(p)) return p }
    return 'claude.cmd'
  }
  return 'claude'
}

/** Invite complète (système + consigne + chemin image) pour un appel headless. Pur / testable. */
export function inviteMetadonnees({ image_path, texte_ocr = '' }) {
  return SYSTEME_META + '\n\n' + consigneMetadonnees(texte_ocr) +
    '\n\nL’image de la page de titre est le fichier :\n' + String(image_path) +
    '\nUtilise l’outil Read sur ce fichier pour l’examiner, puis réponds UNIQUEMENT par l’objet JSON demandé, sans aucun texte autour.'
}

/** Argv du CLI : headless, sortie JSON, lecture de fichiers seulement (pas d'écriture). Pur / testable. */
export function argvClaude({ modele = null, addDir = null } = {}) {
  const a = ['-p', '--output-format', 'json', '--allowedTools', 'Read']
  if (addDir) a.push('--add-dir', String(addDir))
  if (modele) a.push('--model', String(modele))
  return a
}

/**
 * Copie de l'environnement SANS les clés d'API Anthropic. Indispensable : si `ANTHROPIC_API_KEY` (ou
 * `ANTHROPIC_AUTH_TOKEN`) est présent, le CLI l'utilise EN PRIORITÉ sur la connexion d'abonnement — et
 * bascule sur la facturation API (crédits console). On les retire pour forcer l'usage de l'ABONNEMENT.
 */
export function envSansCleApi(env = process.env) {
  const c = { ...env }
  delete c.ANTHROPIC_API_KEY
  delete c.ANTHROPIC_AUTH_TOKEN
  return c
}

/** Extrait le premier objet JSON équilibré d'un texte (tolère un préambule / des ```json). */
export function extraireJson(txt) {
  const s = String(txt || '')
  const i = s.indexOf('{'), j = s.lastIndexOf('}')
  if (i < 0 || j <= i) return null
  try { return JSON.parse(s.slice(i, j + 1)) } catch { return null }
}

function lancer(bin, argv, invite, { cwd = undefined, timeoutMs = 180000 } = {}) {
  return new Promise((resolve) => {
    let out = '', err = '', fini = false, child
    const finir = (v) => { if (!fini) { fini = true; try { clearTimeout(t) } catch {} resolve(v) } }
    let t
    // Windows : un .cmd/.bat ne peut plus être lancé directement par spawn (EINVAL depuis le durcissement
    // Node). On passe par `cmd.exe /c` ; shell:false → Node cite proprement les arguments (espaces de
    // « Corpus Scriptura » compris).
    const estWin = process.platform === 'win32'
    const exe = estWin ? (process.env.ComSpec || 'cmd.exe') : bin
    const args = estWin ? ['/c', bin, ...argv] : argv
    try { child = spawn(exe, args, { cwd, windowsHide: true, env: envSansCleApi() }) }
    catch (e) { finir({ ok: false, erreur: 'CLI illançable : ' + (e?.message || e) }); return }
    t = setTimeout(() => { try { child.kill() } catch {} finir({ ok: false, erreur: 'délai dépassé' }) }, timeoutMs)
    child.on('error', (e) => finir({ ok: false, erreur: 'CLI introuvable : ' + (e?.message || e) }))
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => finir({ ok: code === 0, code, out, err }))
    try { child.stdin.write(invite); child.stdin.end() } catch { /* stdin fermé : le close suivra */ }
  })
}

export function fournisseurClaudeLocal(env = {}) {
  const bin = resoudreBin(env)
  const modele = { diagnostic: env.LG_AI_MODEL_DIAGNOSTIC || null, vision: env.LG_AI_MODEL_VISION || null, controle: env.LG_AI_MODEL_CONTROLE || null }

  async function metadonnees(charge = {}, { timeoutMs } = {}) {
    const { image_path, texte_ocr = '', cwd = undefined } = charge
    const ab = (erreur) => ({ type: 'metadonnees_titre', statut: 'candidat', abstention: true, erreur, fournisseur: 'claude-local' })
    if (!image_path) return ab('image absente')
    const invite = inviteMetadonnees({ image_path, texte_ocr })
    // Lire une page de titre est une tâche de VISION exigeante : modèle vision (Opus) si configuré,
    // sinon contrôle (Sonnet) ; JAMAIS le modèle « diagnostic » léger (Haiku) — il casse la casse, rate
    // les chiffres romains et n'ajoute pas les accents (→ échec du rapprochement catalogue). À défaut de
    // tout réglage, on omet --model et le CLI prend le modèle par défaut de l'abonnement.
    const modeleLecture = modele.vision || modele.controle || null
    const argv = argvClaude({ modele: modeleLecture, addDir: cwd })
    const r = await lancer(bin, argv, invite, { cwd, timeoutMs })
    // L'enveloppe JSON existe même quand le CLI sort en erreur (ex. « Not logged in ») : on la lit
    // d'abord pour remonter un message CLAIR à l'utilisateur (connexion requise, etc.).
    const enveloppe = extraireJson(r.out)
    if (enveloppe && enveloppe.is_error) return ab(String(enveloppe.result || 'erreur CLI'))
    if (!enveloppe) return ab(r.ok ? 'sortie CLI illisible' : (r.erreur || ('CLI code ' + r.code + (r.err ? ' — ' + String(r.err).slice(0, 200) : ''))))
    const meta = extraireJson(enveloppe.result)
    if (!meta || typeof meta !== 'object') return ab('JSON métadonnées absent de la réponse')
    return { ...meta, type: 'metadonnees_titre', statut: 'candidat', abstention: !!meta.abstention, fournisseur: 'claude-local', modele: modeleLecture || 'défaut (abonnement)' }
  }

  // TRI DE STRUCTURE : classe les pages d'une PLANCHE de vignettes (image_path). La consigne (numéros
  // de la planche) est fournie par l'appelant. Renvoie { pages:[{n,type,a_ocriser}] }. Ne lève jamais.
  async function triage(charge = {}, { timeoutMs } = {}) {
    const { image_path, consigne = '', cwd = undefined } = charge
    const ab = (erreur) => ({ type: 'triage_pages', statut: 'candidat', abstention: true, erreur, fournisseur: 'claude-local' })
    if (!image_path) return ab('planche absente')
    const modeleLecture = modele.vision || modele.controle || null
    const invite = SYSTEME_META + '\n\n' + consigne + '\n\nL’image de la planche est le fichier :\n' + String(image_path) +
      '\nUtilise l’outil Read sur ce fichier pour l’examiner, puis réponds UNIQUEMENT par l’objet JSON demandé, sans aucun texte autour.'
    const r = await lancer(bin, argvClaude({ modele: modeleLecture, addDir: cwd }), invite, { cwd, timeoutMs })
    const env0 = extraireJson(r.out)
    if (env0 && env0.is_error) return ab(String(env0.result || 'erreur CLI'))
    if (!env0) return ab(r.ok ? 'sortie CLI illisible' : (r.erreur || ('CLI code ' + r.code)))
    const data = extraireJson(env0.result)
    if (!data || !Array.isArray(data.pages)) return ab('JSON de triage absent de la réponse')
    return { ...data, type: 'triage_pages', statut: 'candidat', abstention: !!data.abstention, fournisseur: 'claude-local', modele: modeleLecture || 'défaut (abonnement)' }
  }

  // Passes non encore câblées en local (lettrines, lignes…) : abstention prudente, jamais d'invention.
  const abstenir = (type) => async () => ({ type, statut: 'candidat', abstention: true, erreur: 'non câblé en local', fournisseur: 'claude-local' })
  return {
    nom: 'claude-local', cloud: true, local: true, dispo: true, modele,
    diagnostiquer: metadonnees, triage,
    lettrine: abstenir('lettrine'), titre: abstenir('niveau_titre'), ligne: abstenir('correction_ocr'),
    page: abstenir('controle_page'), section: abstenir('controle_section'), lot: abstenir('controle_lot'),
  }
}
