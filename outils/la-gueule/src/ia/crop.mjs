// Phase D — découpe d'un CROP (région d'une page) en base64, pour l'IA de vision. Utilise ImageMagick
// dans WSL (déjà installé), via runBash (chemin Windows traduit par WSLENV). N'envoie JAMAIS l'image
// entière : seulement la région + une marge. Résout toujours (null en cas d'échec ; ne bloque rien).

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
