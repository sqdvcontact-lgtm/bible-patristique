// P12 — Pilote de refonte de Boèce au BON moteur (Kraken CATMuS-Print), 10 pages (19–28).
// Projet SÉPARÉ boece-ceriziers-1646-kraken-v2 : n'écrase jamais l'ancien candidat contaminé,
// ne reprend AUCUNE transcription contaminée (OCR frais du fac-similé). Sauvegarde après chaque
// page (reprise possible : les pages 'termine' sont sautées), conserve les erreurs par page.
import { ocrPage } from '../src/wsl.mjs'
import { parseAlto } from '../src/alto.mjs'
import { estEntete } from '../src/projet.mjs'
import { sauvegarderProjet, chargerProjet } from '../src/projet.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const PDF = join(RACINE, 'incoming', 'boece-ceriziers-1646.pdf')
const SERVED = join(RACINE, 'sorties', 'atelier')
const NOM = 'boece-ceriziers-1646-kraken-v2'
const PAGES = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28]

// Reprise : recharge le projet s'il existe déjà.
let projet
try { projet = await chargerProjet(NOM) } catch { projet = null }
if (!projet) {
  projet = {
    kind: 'imprime', chemin: PDF, total: 160,
    meta: { auteur: 'Boèce', titre: 'La Consolation de la philosophie', trad_auteur: 'Ceriziers', date_publication: '1646', langue_originale: 'latin', langue_trad: 'Français' },
    _provenance: { moteur: 'kraken-catmus-print', modele: 'catmus-print-fondue-large', device: 'cuda:0 (repli CPU auto)', dpi: 300, logiciel: 'La Gueule', statut: 'CANDIDAT', pilote: true },
    pages: {},
  }
}

let faites = 0, erreurs = 0, tempsTotal = 0
for (const page of PAGES) {
  if (projet.pages[page]?.etat === 'termine') { console.log(`page ${page} : déjà faite (reprise, sautée)`); faites++; continue }
  const t0 = process.hrtime.bigint()
  try {
    const r = await ocrPage({ kind: 'imprime', pdfWin: PDF, page, dpi: 300, moteur: 'kraken-print', servedDirWin: SERVED })
    const pa = parseAlto(r.alto)
    const secs = Number(process.hrtime.bigint() - t0) / 1e9
    tempsTotal += secs
    projet.pages[page] = {
      pngUrl: '/api/fichier?path=' + encodeURIComponent(r.pngWin), largeur: pa.largeur, hauteur: pa.hauteur,
      etat: 'termine', ocr: { ...r.ocr, secondes: Math.round(secs) },
      lignes: pa.lignes.map((l) => ({ bbox: l.bbox, confiance: l.confiance, ocr0: l.texte, dip: l.texte, incertain: false })),
    }
    faites++
    console.log(`page ${page} : ${pa.lignes.length} lignes en ${secs.toFixed(0)}s`)
  } catch (e) {
    projet.pages[page] = { etat: 'erreur', erreur: String(e?.message || e).slice(0, 300) }
    erreurs++
    console.log(`page ${page} : ERREUR ${e?.message || e}`)
  }
  await sauvegarderProjet(NOM, projet) // sauvegarde APRÈS CHAQUE page (P1)
}

// ── BILAN réel ──────────────────────────────────────────────────────────────
console.log('\n===== BILAN PILOTE boece-ceriziers-1646-kraken-v2 =====')
console.log(`Pages : ${faites} faite(s), ${erreurs} erreur(s) ; temps OCR ${tempsTotal.toFixed(0)}s (${(tempsTotal / Math.max(1, PAGES.length)).toFixed(1)}s/page).`)

// Contrôles qualité automatiques (indices, pas un jugement définitif) :
let ordreOk = 0, entetesDetectees = 0, cesures = 0, totalLignes = 0, longS = 0
const echantillon = []
for (const page of PAGES) {
  const pg = projet.pages[page]; if (!pg || !pg.lignes) continue
  const ys = pg.lignes.filter((l) => l.bbox).map((l) => l.bbox[1])
  const trie = [...ys].every((v, i) => i === 0 || v >= ys[i - 1])
  if (trie) ordreOk++ // lignes déjà de haut en bas ?
  const haut = pg.lignes[0]?.dip || ''
  if (estEntete(haut)) entetesDetectees++
  for (const l of pg.lignes) { totalLignes++
    if (/[-¬]$/.test((l.dip || '').trim())) cesures++
    if (/\bfous\b|\beft\b|\bfcience\b|Philofophie/i.test(l.dip || '')) longS++ } // signes de confusion ſ→f (doit rester ~0)
  if (pg.lignes[1]) echantillon.push(`p${page} L2: ${pg.lignes[1].dip}`)
}
console.log(`Ordre de lecture haut→bas : ${ordreOk}/${PAGES.length} page(s).`)
console.log(`Titres courants détectés en tête : ${entetesDetectees} page(s).`)
console.log(`Lignes avec césure de fin (- ou ¬) : ${cesures} / ${totalLignes}.`)
console.log(`Indices de confusion ſ→f résiduels (doit être ~0) : ${longS}.`)
console.log('Échantillon (2e ligne de chaque page) :')
for (const s of echantillon) console.log('  ' + s)
console.log('\nProjet sauvegardé (candidat, NON validé). Relire dans l\'atelier avant tout import.')
