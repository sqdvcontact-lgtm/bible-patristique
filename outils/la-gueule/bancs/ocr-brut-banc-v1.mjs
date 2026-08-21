// État 1 (ocr_brut) du banc : OCR des pages sélectionnées au SOCLE Kraken CATMuS-Print
// (jamais Tesseract). Produit un projet NON VALIDÉ que l'humain corrigera puis validera
// dans l'atelier. Ne fabrique AUCUNE validation humaine.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { ocrPage } from '../src/wsl.mjs'
import { parseAlto } from '../src/alto.mjs'
import { sauvegarderProjet } from '../src/projet.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const PDF = join(RACINE, 'incoming', 'boece-ceriziers-1646.pdf')
const SERVED = join(RACINE, 'sorties', 'atelier')
const NOM = 'banc-boece-ceriziers-1646-test-v1'

const sel = JSON.parse(await readFile(join(RACINE, 'bancs', 'boece-ceriziers-1646-test-v1', 'selection.json'), 'utf8'))
const pagesVoulues = sel.pages.map((p) => p.page)

const projet = {
  kind: 'imprime', chemin: PDF, total: sel.source_pdf_pages,
  meta: { auteur: 'Boèce', titre: 'La Consolation de la philosophie', trad_auteur: 'Ceriziers', date_publication: '1646' },
  _garde: { usage: 'evaluation_seulement', interdit_entrainement: true, valide_humain: false,
    note: 'OCR brut (état 1) au socle Kraken CATMuS-Print. Correction et validation humaine REQUISES avant tout usage comme banc.' },
  pages: {},
}

for (const page of pagesVoulues) {
  const t0 = process.hrtime.bigint()
  try {
    const r = await ocrPage({ kind: 'imprime', pdfWin: PDF, page, dpi: 300, moteur: 'kraken-print', servedDirWin: SERVED })
    const pa = parseAlto(r.alto)
    const secs = Number(process.hrtime.bigint() - t0) / 1e9
    projet.pages[page] = {
      pngUrl: '/api/fichier?path=' + encodeURIComponent(r.pngWin), largeur: pa.largeur, hauteur: pa.hauteur,
      etat: 'termine', ocr: { ...r.ocr, secondes: Math.round(secs) },
      // Trois états par ligne : ocr0 (brut) = dip (corrige, à modifier) ; incertain/valide_humain à la main.
      lignes: pa.lignes.map((l) => ({ bbox: l.bbox, confiance: l.confiance, ocr0: l.texte, dip: l.texte, incertain: false })),
    }
    console.log(`page ${page} : ${pa.lignes.length} lignes en ${secs.toFixed(0)}s`)
  } catch (e) {
    projet.pages[page] = { etat: 'erreur', erreur: String(e?.message || e).slice(0, 300) }
    console.log(`page ${page} : ERREUR ${e?.message || e}`)
  }
}

await sauvegarderProjet(NOM, projet)
const ok = Object.values(projet.pages).filter((p) => p.etat === 'termine').length
const err = Object.values(projet.pages).filter((p) => p.etat === 'erreur').length
console.log(`\nProjet « ${NOM} » sauvegardé : ${ok} page(s) OCR, ${err} erreur(s). NON VALIDÉ (correction humaine requise).`)
