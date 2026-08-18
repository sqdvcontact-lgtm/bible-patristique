// Phase D — découpe d'un CROP (région d'une page) en base64, pour l'IA de vision. Utilise ImageMagick
// dans WSL (déjà installé), via runBash (chemin Windows traduit par WSLENV). N'envoie JAMAIS l'image
// entière : seulement la région + une marge. Résout toujours (null en cas d'échec ; ne bloque rien).

import { join } from 'node:path'
import { runBash } from '../wsl.mjs'

/** Chemin Windows du PNG à partir d'un pngUrl « /api/fichier?path=<abs> » (ou d'un chemin direct). */
export function cheminPngDepuisUrl(pngUrl) {
  if (!pngUrl) return null
  const m = String(pngUrl).match(/[?&]path=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : String(pngUrl)
}

/**
 * Découpe la région `bbox` [x,y,w,h] du PNG (chemin Windows), avec une marge relative, et renvoie
 * l'image PNG encodée en base64 (une ligne). `marge` = fraction de la taille de la boîte ajoutée
 * autour. Renvoie null si bbox absente ou échec ImageMagick.
 */
export async function cropBase64(pngWin, bbox, { marge = 0.25 } = {}) {
  if (!pngWin || !Array.isArray(bbox) || bbox.length < 4) return null
  let [x, y, w, h] = bbox.map((n) => Math.round(Number(n) || 0))
  const mx = Math.round(w * marge), my = Math.round(h * marge)
  x = Math.max(0, x - mx); y = Math.max(0, y - my); w = Math.max(1, w + 2 * mx); h = Math.max(1, h + 2 * my)
  const geo = `${w}x${h}+${x}+${y}` // valeurs entières bornées → pas d'injection
  const r = await runBash('convert "$IMG" -crop ' + geo + ' +repage png:- | base64 -w0', { IMG: pngWin }, { timeoutMs: 30000 })
  if (!r.ok || !r.stdout) return null
  return r.stdout.replace(/\s+/g, '')
}

/**
 * Même découpe, mais ÉCRITE dans un fichier PNG dont on renvoie le chemin Windows. Nécessaire pour le
 * fournisseur LOCAL : le CLI Claude lit une image par son CHEMIN (outil Read), il ne sait rien faire
 * d'un base64. Le nom est DÉTERMINISTE (page, ligne, boîte) : deux passes sur le même cas réutilisent
 * le même fichier au lieu d'en semer un par appel. Renvoie null en cas d'échec (ne bloque rien).
 */
export async function cropFichier(pngWin, bbox, { marge = 0.25, dossier, nom } = {}) {
  if (!pngWin || !dossier || !Array.isArray(bbox) || bbox.length < 4) return null
  let [x, y, w, h] = bbox.map((n) => Math.round(Number(n) || 0))
  const mx = Math.round(w * marge), my = Math.round(h * marge)
  x = Math.max(0, x - mx); y = Math.max(0, y - my); w = Math.max(1, w + 2 * mx); h = Math.max(1, h + 2 * my)
  const geo = `${w}x${h}+${x}+${y}`
  // Nom assaini : ce chemin est interpolé côté Windows, jamais dans le script bash (variable OUT).
  const base = String(nom || `${x}-${y}-${w}-${h}`).replace(/[^a-zA-Z0-9_.-]/g, '_')
  const sortie = join(dossier, base + '.png')
  const r = await runBash('mkdir -p "$(dirname "$OUT")" && convert "$IMG" -crop ' + geo + ' +repage "$OUT"',
    { IMG: pngWin, OUT: sortie }, { timeoutMs: 30000 })
  return r.ok ? sortie : null
}

/**
 * Rend UNE page d'un PDF en PNG et renvoie son base64, réduite à `largeurMax` (pour borner le coût en
 * jetons). Sert à envoyer la PAGE DE TITRE ENTIÈRE à l'IA de diagnostic (métadonnées), à la différence
 * du crop d'une ligne. Valeurs entières bornées (pas d'injection) ; dossier temporaire nettoyé ; null
 * en cas d'échec (ne bloque rien).
 */
export async function pdfPageBase64(pdfWin, page, { dpi = 200, largeurMax = 1600 } = {}) {
  if (!pdfWin) return null
  const pg = Math.max(1, Math.round(Number(page) || 1))
  const d = Math.max(72, Math.min(400, Math.round(Number(dpi) || 200)))
  const w = Math.max(400, Math.min(3000, Math.round(Number(largeurMax) || 1600)))
  const script =
    'T=$(mktemp -d) && ' +
    `pdftoppm -f ${pg} -l ${pg} -r ${d} -png -singlefile "$PDF" "$T/p" && ` +
    `convert "$T/p.png" -resize '${w}x>' png:- | base64 -w0; ` +
    'rm -rf "$T"'
  const r = await runBash(script, { PDF: pdfWin }, { timeoutMs: 60000 })
  if (!r.ok || !r.stdout) return null
  return r.stdout.replace(/\s+/g, '')
}

/** Encode un FICHIER image entier (manuscrit déposé) en base64 PNG, réduit à `largeurMax`. */
export async function imageFichierBase64(imgWin, { largeurMax = 1600 } = {}) {
  if (!imgWin) return null
  const w = Math.max(400, Math.min(3000, Math.round(Number(largeurMax) || 1600)))
  const r = await runBash(`convert "$IMG" -resize '${w}x>' png:- | base64 -w0`, { IMG: imgWin }, { timeoutMs: 45000 })
  if (!r.ok || !r.stdout) return null
  return r.stdout.replace(/\s+/g, '')
}
