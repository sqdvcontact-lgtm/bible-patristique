// Triage des divergences OCR ↔ référence humaine, page par page (aide à la RELECTURE, pas une
// correction). Pour chaque page validée : réOCR du socle Kraken, diff par mots contre la
// transcription validée (dip des lignes valide_humain), et catégorisation de chaque écart :
//   - « espace/ponct »          : disparaît après normalisation typographique (non pénalisant) ;
//   - « ſ/casse/ponct dipl. »    : identique une fois ſ→s + minuscules + ponctuation ôtée ;
//   - « À VÉRIFIER (image) »     : vrai écart — à trancher sur le fac-similé (raté OCR, différence
//                                  diplomatique légitime, ou coquille de la référence).
// N'écrit RIEN, ne modifie NI le projet NI la référence. Usage :
//   node bancs/diff-banc.mjs <nom-du-projet-banc> [--socle kraken-print|tesseract]

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chargerProjet } from '../src/projet.mjs'
import { ocrPage } from '../src/wsl.mjs'
import { parseAlto } from '../src/alto.mjs'
import { normaliserTypographie } from '../src/modeles.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const nom = args.find((a) => !a.startsWith('--'))
const iSocle = args.indexOf('--socle')
const socle = iSocle >= 0 ? args[iSocle + 1] : 'kraken-print'
if (!nom) { console.error('Usage : node bancs/diff-banc.mjs <nom-du-projet-banc> [--socle kraken-print|tesseract]'); process.exit(2) }

const projet = await chargerProjet(nom)
const PDF = projet.chemin
const SERVED = join(RACINE, 'sorties', 'atelier')
const moteur = socle === 'tesseract' ? undefined : 'kraken-print'
const lang = socle === 'tesseract' ? 'fra' : undefined

const joindre = (alto) => parseAlto(alto).lignes.filter((l) => l.bbox).sort((a, b) => a.bbox[1] - b.bbox[1]).map((l) => l.texte).filter(Boolean).join('\n')

// ſ→s, minuscules, ponctuation périphérique ôtée : pour reconnaître une différence diplomatique.
const dipl = (s) => String(s).toLowerCase().replace(/ſ/g, 's').replace(/[.,;:!?«»"'()\[\]—–\-]/g, '').replace(/\s+/g, ' ').trim()

// Diff par mots (LCS) : =, - (dans la référence seulement), + (dans l'hypothèse seulement).
function diffMots(a, b) {
  const n = a.length, m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out = []; let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: '=', w: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', w: a[i++] }) }
    else { out.push({ t: '+', w: b[j++] }) }
  }
  while (i < n) out.push({ t: '-', w: a[i++] })
  while (j < m) out.push({ t: '+', w: b[j++] })
  return out
}

function categorie(ref, hyp) {
  if (normaliserTypographie(ref) === normaliserTypographie(hyp)) return 'espace/ponct'
  if (dipl(ref) === dipl(hyp)) return 'ſ/casse/ponct dipl.'
  return 'À VÉRIFIER (image)'
}

const compte = { 'espace/ponct': 0, 'ſ/casse/ponct dipl.': 0, 'À VÉRIFIER (image)': 0 }
console.log(`Diff banc « ${nom} » — socle ${socle}. Référence = lignes valide_humain (dip). Aucune écriture.\n`)

for (const [n, pg] of Object.entries(projet.pages)) {
  if (!pg || pg.etat !== 'termine' || !Array.isArray(pg.lignes)) continue
  const refLignes = pg.lignes.filter((l) => l.valide_humain && String(l.dip ?? '').trim()).map((l) => l.dip.trim())
  if (!refLignes.length) continue
  let hyp = ''
  try {
    const r = await ocrPage({ kind: 'imprime', pdfWin: PDF, page: Number(n), dpi: 300, moteur, lang, servedDirWin: SERVED })
    hyp = joindre(r.alto)
  } catch (e) { console.log(`page ${n} : ERREUR OCR ${e?.message || e}`); continue }

  const refW = refLignes.join(' ').split(/\s+/).filter(Boolean)
  const hypW = hyp.replace(/\n/g, ' ').split(/\s+/).filter(Boolean)
  const d = diffMots(refW, hypW)

  // Regroupe les écarts consécutifs ; garde 2 mots de contexte de part et d'autre.
  const spans = []
  for (let k = 0; k < d.length; k++) {
    if (d[k].t === '=') continue
    let j = k, ref = [], hypo = []
    while (j < d.length && d[j].t !== '=') { if (d[j].t === '-') ref.push(d[j].w); else hypo.push(d[j].w); j++ }
    const avant = d.slice(Math.max(0, k - 3), k).filter((x) => x.t === '=').map((x) => x.w).slice(-2)
    const apres = d.slice(j, j + 2).filter((x) => x.t === '=').map((x) => x.w)
    spans.push({ ref: ref.join(' '), hyp: hypo.join(' '), avant: avant.join(' '), apres: apres.join(' ') })
    k = j - 1
  }
  if (!spans.length) { console.log(`── page ${n} : identique (0 écart) ──`); continue }
  console.log(`── page ${n} : ${spans.length} écart(s) ──`)
  for (const s of spans) {
    const cat = categorie(s.ref, s.hyp)
    compte[cat]++
    console.log(`  [${cat}]  réf: « ${s.ref || '∅'} »  ≠  ocr: « ${s.hyp || '∅'} »   (contexte : ${s.avant} __ ${s.apres})`)
  }
  console.log('')
}

console.log('===== SYNTHÈSE =====')
for (const [k, v] of Object.entries(compte)) console.log(`  ${k} : ${v}`)
console.log('\n« À VÉRIFIER » = à trancher sur le fac-similé (raté OCR / différence diplomatique légitime /')
console.log('coquille de la référence). Je ne modifie pas ta référence : ces cas sont pour ta relecture.')
