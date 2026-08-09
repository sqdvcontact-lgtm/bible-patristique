// P11 — Évaluation reproductible des SOCLES sur un banc VALIDÉ HUMAINEMENT.
// N'ENTRAÎNE RIEN. N'écrit PAS modeles/registre.json (l'inscription reste une décision
// explicite, séparée, une fois la procédure jugée fiable). Refuse un banc non validé.
//
// Usage : node bancs/evaluer-banc.mjs <nom-du-projet-banc>
//   Le projet doit porter _garde.valide_humain === true et, par ligne, valide_humain === true.
//   Référence = la transcription corrigée (dip) des SEULES lignes valide_humain.
//   Hypothèses = OCR live de chaque socle (tesseract fra, kraken-print) sur la même page.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chargerProjet } from '../src/projet.mjs'
import { ocrPage } from '../src/wsl.mjs'
import { parseAlto } from '../src/alto.mjs'
import { evaluerModele, normaliserTypographie } from '../src/modeles.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const APERCU = args.includes('--apercu') // aperçu : évalue les pages validées sans exiger _garde
const nom = args.find((a) => !a.startsWith('--'))
if (!nom) { console.error('Usage : node bancs/evaluer-banc.mjs <nom-du-projet-banc> [--apercu]'); process.exit(2) }

const projet = await chargerProjet(nom)

// ── GARDE : refuser tout banc non validé humainement ────────────────────────
// Le mode --apercu autorise une mesure PROVISOIRE sur les pages déjà validées à la main, sans
// exiger la déclaration « banc prêt » (_garde.valide_humain). Les lignes non validées restent
// exclues (le filtre valide_humain par ligne demeure) : on ne fabrique aucune vérité terrain.
if (!projet?._garde?.valide_humain && !APERCU) {
  console.error(`REFUS : le banc « ${nom} » n'est pas marqué valide_humain dans _garde.`)
  console.error('Corrige et VALIDE les pages à la main dans l\'atelier avant d\'évaluer.')
  console.error('Une correction automatique (Codex) N\'EST PAS une validation humaine.')
  console.error('(Pour une mesure provisoire sur les pages déjà validées : ajoute --apercu.)')
  process.exit(1)
}
if (APERCU && !projet?._garde?.valide_humain) {
  console.log('⚠ APERÇU — banc non déclaré prêt (_garde.valide_humain=false).')
  console.log('  Mesure sur les SEULES pages/lignes déjà validées à la main : chiffre indicatif,')
  console.log('  PAS le résultat officiel du banc. Ne pas inscrire au registre.\n')
}
const PDF = projet.chemin
const SERVED = join(RACINE, 'sorties', 'atelier')

const joindre = (alto) => parseAlto(alto).lignes.filter((l) => l.bbox).sort((a, b) => a.bbox[1] - b.bbox[1]).map((l) => l.texte).filter(Boolean).join('\n')

const socles = [
  { cle: 'tesseract-fra', moteur: undefined, lang: 'fra' },
  { cle: 'kraken-catmus-print', moteur: 'kraken-print' },
]

const global = {}
for (const s of socles) global[s.cle] = { distC: 0, longC: 0, distCn: 0, longCn: 0, distM: 0, longM: 0, secondes: 0, pages: [] }

for (const [n, pg] of Object.entries(projet.pages)) {
  if (!pg || pg.etat !== 'termine' || !Array.isArray(pg.lignes)) continue
  // Référence = SEULES les lignes validées humainement.
  const refLignes = pg.lignes.filter((l) => l.valide_humain && String(l.dip ?? '').trim()).map((l) => l.dip.trim())
  if (!refLignes.length) { console.log(`page ${n} : aucune ligne valide_humain — ignorée`); continue }
  const reference = refLignes.join('\n')
  for (const s of socles) {
    const t0 = process.hrtime.bigint()
    let hyp = ''
    try {
      const r = await ocrPage({ kind: 'imprime', pdfWin: PDF, page: Number(n), dpi: 300, moteur: s.moteur, lang: s.lang, servedDirWin: SERVED })
      hyp = joindre(r.alto)
    } catch (e) { console.log(`page ${n} [${s.cle}] : ERREUR ${e?.message || e}`); continue }
    const secs = Number(process.hrtime.bigint() - t0) / 1e9
    const ev = evaluerModele([{ reference, hypothese: hyp }]) // CER STRICT (¬ et espacement comptent)
    // CER SECONDAIRE : neutralise les seules conventions de RENDU — espacement de la ponctuation
    // haute (Q3) ET marque de césure ¬/- (Q2) — sur la référence ET l'hypothèse. Complémentaire,
    // ne remplace jamais le CER strict.
    const neutre = (s) => normaliserTypographie(String(s).replace(/¬/g, '').replace(/‐/g, '-'))
    const refN = neutre(reference), hypN = neutre(hyp)
    const evN = evaluerModele([{ reference: refN, hypothese: hypN }])
    const g = global[s.cle]
    g.distC += ev.cer * [...reference].length; g.longC += [...reference].length
    g.distCn += evN.cer * [...refN].length; g.longCn += [...refN].length
    g.distM += ev.wer * reference.split(/\s+/).filter(Boolean).length; g.longM += reference.split(/\s+/).filter(Boolean).length
    g.secondes += secs
    g.pages.push({ page: Number(n), cer: ev.cer, cerNorm: evN.cer, wer: ev.wer, secondes: Math.round(secs) })
  }
}

const pc = (x) => (x * 100).toFixed(2) + ' %'
console.log(`\n===== ÉVALUATION DU BANC « ${nom} » (valide_humain) =====`)
for (const s of socles) {
  const g = global[s.cle]
  const cer = g.longC ? g.distC / g.longC : null
  const cerN = g.longCn ? g.distCn / g.longCn : null
  const wer = g.longM ? g.distM / g.longM : null
  console.log(`\n${s.cle} :`)
  console.log(`  CER strict : ${cer == null ? 'n/a' : pc(cer)}  |  CER secondaire : ${cerN == null ? 'n/a' : pc(cerN)}  |  WER : ${wer == null ? 'n/a' : pc(wer)}`)
  console.log(`  ${g.pages.length} page(s), ${g.longC} caractères, ${Math.round(g.secondes)} s au total`)
  for (const p of g.pages) console.log(`    page ${p.page} : CER ${pc(p.cer)} (norm. ${pc(p.cerNorm)})  (${p.secondes}s)`)
}
console.log('\n« strict » = fidélité diplomatique, ¬ et espacement compris (mesure de référence).')
console.log('« secondaire » = reconnaissance seule : espacement de la ponctuation haute et césure ¬/-,')
console.log('conventions de rendu posées par code, neutralisés des deux côtés. Il NE REMPLACE JAMAIS le strict.')
console.log('\nRappel : ces mesures ne sont PAS inscrites au registre automatiquement.')
console.log('Catégoriser les erreurs (reconnaissance / segmentation / ſ / césure / ponctuation /')
console.log('ligatures / différence diplomatique légitime / erreur de la référence) AVANT toute')
console.log('inscription dans modeles/registre.json, et seulement si la procédure est reproductible.')
