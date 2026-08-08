// Persistance des relectures et export au format `segments` de Corpus Scriptura.
//
// Un « projet » = l'état de relecture d'un document : la source, et pour chaque page ses
// lignes (coordonnées + texte corrigé par couche). Sauvegardé en JSON dans `projets/`.
// L'export regroupe les lignes en PARAGRAPHES (segments), réunit les mots coupés en fin de
// ligne (§14.3), et produit des lignes prêtes pour la table `segments` — en CANDIDAT, jamais
// écrites en direct dans la base.

import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

import { recenserReferences, formaterNotes } from './notes.mjs'
import { construireDocx } from './docx.mjs'
import { construireSqlSupabase } from './sql.mjs'
import { construireTexte, construireMarkdown } from './texte.mjs'
import { altoPage, pageXml } from './echange.mjs'
import { segmenterColonnes } from './colonnes.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR_PROJETS = join(RACINE, 'projets')
const DIR_EXPORTS = join(RACINE, 'exports')

const nomSur = (n) => String(n || 'sans-nom').replace(/[^\w.-]+/g, '_').slice(0, 80)

export async function sauvegarderProjet(nom, projet) {
  await mkdir(DIR_PROJETS, { recursive: true })
  const chemin = join(DIR_PROJETS, nomSur(nom) + '.json')
  await writeFile(chemin, JSON.stringify({ ...projet, nom, maj: new Date().toISOString() }, null, 2), 'utf8')
  return chemin
}

export async function chargerProjet(nom) {
  const chemin = join(DIR_PROJETS, nomSur(nom) + '.json')
  return JSON.parse(await readFile(chemin, 'utf8'))
}

export async function listerProjets() {
  try {
    const noms = await readdir(DIR_PROJETS)
    return noms.filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, ''))
  } catch { return [] }
}

/** Titre courant / numéro de page à écarter de l'export (pas un vrai paragraphe). */
export function estEntete(texte) {
  const s = (texte || '').trim()
  if (!s) return true
  if (/^[_—–\-\s.]*\d{1,4}[_—–\-\s.]*$/.test(s)) return true          // « — 66 — », « 10 »
  if (/^\d{0,4}\s*[A-ZÀ-Þ][A-ZÀ-Þ'’ .-]{2,24}\d{0,4}$/.test(s)) return true // « 10 HOMÉLIE », « HOMÉLIE 10 »
  if (/digitized by google/i.test(s)) return true
  return false
}

/** Réunit les lignes d'un paragraphe en un texte : mot coupé en fin de ligne recollé (§14.3). */
export function joindreLignes(lignes, champ) {
  let out = ''
  for (let i = 0; i < lignes.length; i++) {
    const t = String(lignes[i]?.[champ] ?? '').trim()
    if (!t) continue
    if (out === '') { out = t; continue }
    if (/[-‐¬]\s*$/.test(out)) out = out.replace(/[-‐¬]\s*$/, '') + t // trait d'union de coupure → recollé
    else out += ' ' + t
  }
  return out.replace(/\s+/g, ' ').trim()
}

const texteLigne = (l) => String(l.texte ?? l.dip ?? l.fr ?? '')

/** Retire la ligne du HAUT (titre courant / n° de page) et du BAS (pied, « Digitized by Google »). */
function sansEntetesPied(lignes) {
  const avec = lignes.filter((l) => Array.isArray(l.bbox)).sort((a, b) => a.bbox[1] - b.bbox[1])
  if (!avec.length) return lignes
  const retirer = new Set()
  if (estEntete(texteLigne(avec[0]))) retirer.add(avec[0])
  const bas = avec[avec.length - 1]
  if (estEntete(texteLigne(bas)) || /digitized by google/i.test(texteLigne(bas))) retirer.add(bas)
  return lignes.filter((l) => !retirer.has(l))
}

/** Regroupe des lignes (avec bbox) en paragraphes : grand saut vertical OU première ligne indentée. */
export function grouperParagraphes(lignesBrutes) {
  const lignes = sansEntetesPied(lignesBrutes)
  const avec = lignes.filter((l) => Array.isArray(l.bbox))
  if (avec.length < 2) return [lignes] // pas de coordonnées : un seul bloc
  const ls = [...avec].sort((a, b) => a.bbox[1] - b.bbox[1])
  const hauteurs = ls.map((l) => l.bbox[3]).sort((a, b) => a - b)
  const hMed = hauteurs[Math.floor(hauteurs.length / 2)] || 1
  const xMin = Math.min(...ls.map((l) => l.bbox[0]))
  const paras = []
  let cur = []
  let basPrec = null
  for (const l of ls) {
    const saut = basPrec == null ? 0 : l.bbox[1] - basPrec
    const indente = l.bbox[0] - xMin > hMed * 0.8
    if (cur.length && (saut > hMed * 0.9 || indente)) { paras.push(cur); cur = [] }
    cur.push(l)
    basPrec = l.bbox[1] + l.bbox[3]
  }
  if (cur.length) paras.push(cur)
  return paras
}

/** SHA-256 + taille du fichier source, pour la traçabilité §14 (null si illisible). */
export async function empreinteFichier(cheminWin) {
  try {
    const data = await readFile(cheminWin)
    return { sha256: createHash('sha256').update(data).digest('hex'), octets: data.length }
  } catch { return null }
}

/** Métadonnées OCR par page (moteur, modèle/langue, DPI), triées par n° de page. Pur. */
export function metaPagesOcr(pages = {}) {
  return Object.keys(pages).map(Number).sort((a, b) => a - b)
    .filter((n) => pages[n]?.ocr)
    .map((n) => ({ page: n, ...pages[n].ocr }))
}

/**
 * Construit la liste des segments (candidats) d'un projet. `couche` = quelle couche prendre
 * pour le texte imprimé ('dip'). Pur : réutilisé par tous les formats d'export.
 */
export function construireSegments(projet, { id_oeuvre = null, couche = 'dip', recenserNotes = true } = {}) {
  const pages = projet.pages || {}
  const numeros = Object.keys(pages).map(Number).sort((a, b) => a - b)
  const segments = []
  let rang = 1
  // Structure éditoriale COURANTE (ref_niv1..5), persistée d'une page à l'autre : une ligne
  // marquée `titre:{niveau,texte}` la met à jour ; chaque segment hérite de l'état courant.
  const struct = [null, null, null, null, null]
  const refNiv = () => ({ ref_niv1_texte: struct[0], ref_niv2_texte: struct[1], ref_niv3_texte: struct[2], ref_niv4_texte: struct[3], ref_niv5_texte: struct[4] })
  const majStructure = (niveau, texte) => { struct[niveau - 1] = String(texte).trim(); for (let j = niveau; j < 5; j++) struct[j] = null }
  const estTitre = (l) => l && l.titre && Number.isInteger(l.titre.niveau) && l.titre.niveau >= 1 && l.titre.niveau <= 5 && String(l.titre.texte || '').trim()

  for (const n of numeros) {
    const page = pages[n]
    // Page bilingue (paires latin/français alignées par paragraphe) → deux colonnes remplies.
    if (Array.isArray(page.paires) && page.paires.length) {
      for (const pr of page.paires) {
        const fr = String(pr.fr || '').trim()
        const la = String(pr.la || '').trim()
        if (!fr && !la) continue
        if (estEntete(fr) && estEntete(la)) continue // titre courant / n° de page
        segments.push({
          id_oeuvre, page: n, rang: rang++,
          paragraphe: pr.paragraphe ?? null, nature: 'texte', ...refNiv(),
          segment_texte: fr || null, texte_original: la || null, notes: null,
        })
      }
      continue
    }
    // Page monolingue → paragraphes, en respectant les titres de structure (ref_niv) et les
    // COLONNES (double colonne type Migne). Une colonne unique = une seule piste, ordre inchangé.
    // Un titre FERME le bloc courant, met à jour la structure, et n'entre pas dans le corps.
    let bloc = []
    const vider = () => {
      for (const para of grouperParagraphes(bloc)) {
        const texte = joindreLignes(para, couche)
        if (!texte || estEntete(texte)) continue // titre courant / n° de page
        segments.push({
          id_oeuvre, page: n, rang: rang++,
          paragraphe: null, nature: 'texte', ...refNiv(),
          segment_texte: texte, texte_original: null, notes: null,
        })
      }
      bloc = []
    }
    // On groupe DANS chaque piste (jamais à cheval sur deux colonnes) : flush entre pistes.
    for (const piste of segmenterColonnes(page.lignes || [], page.largeur)) {
      for (const l of piste.lignes) {
        if (estTitre(l)) { vider(); majStructure(l.titre.niveau, l.titre.texte) }
        else bloc.push(l)
      }
      vider()
    }
  }
  // Recensement des notes : références parenthétiques → appels [[N]] + champ `notes`,
  // avec un compteur GLOBAL à l'œuvre (comme la numérotation continue du site).
  if (recenserNotes) {
    let n = 1
    for (const seg of segments) {
      if (!seg.segment_texte) continue
      const r = recenserReferences(seg.segment_texte, n)
      seg.segment_texte = r.texte
      seg.notes = formaterNotes(r.notes)
      n = r.prochain
    }
  }
  return segments
}

/** Provenance §14 : un candidat doit être traçable jusqu'à sa source et son moteur. */
async function construireProvenance(projet) {
  return {
    logiciel: 'La Gueule',
    genere_le: new Date().toISOString(),
    statut: 'CANDIDAT',
    source: {
      fichier: projet.chemin ? basename(projet.chemin) : null,
      ...(await empreinteFichier(projet.chemin) || { sha256: null, octets: null }),
    },
    pages: metaPagesOcr(projet.pages || {}),
  }
}

/** Export JSON `segments` (candidat) — conserve l'API existante. */
export async function exporterSegments(nom, projet, opts = {}) {
  const segments = construireSegments(projet, opts)
  const provenance = await construireProvenance(projet)
  await mkdir(DIR_EXPORTS, { recursive: true })
  const chemin = join(DIR_EXPORTS, nomSur(nom) + '.segments.json')
  await writeFile(chemin, JSON.stringify({ id_oeuvre: opts.id_oeuvre ?? null, meta: projet.meta || null, provenance, statut: 'CANDIDAT', segments }, null, 2), 'utf8')
  return { chemin, nbSegments: segments.length, apercu: segments.slice(0, 3), provenance }
}

/**
 * Export TRIPLE : JSON (candidat), DOCX (propre, styles + niveaux de titre) et SQL (prêt à
 * importer dans Supabase). Renvoie les trois chemins + un aperçu.
 */
export async function exporterTout(nom, projet, opts = {}) {
  const meta = projet.meta || {}
  const segments = construireSegments(projet, opts)
  const provenance = await construireProvenance(projet)
  const base = nomSur(nom)
  await mkdir(DIR_EXPORTS, { recursive: true })

  const cheminJson = join(DIR_EXPORTS, base + '.segments.json')
  await writeFile(cheminJson, JSON.stringify({ id_oeuvre: opts.id_oeuvre ?? null, meta: meta || null, provenance, statut: 'CANDIDAT', segments }, null, 2), 'utf8')

  const cheminDocx = join(DIR_EXPORTS, base + '.docx')
  await writeFile(cheminDocx, construireDocx({ meta, segments }))

  const cheminSql = join(DIR_EXPORTS, base + '.supabase.sql')
  await writeFile(cheminSql, construireSqlSupabase({ meta, segments, id_oeuvre: opts.id_oeuvre ?? null }), 'utf8')

  const cheminTxt = join(DIR_EXPORTS, base + '.txt')
  await writeFile(cheminTxt, construireTexte({ meta, segments }), 'utf8')

  const cheminMd = join(DIR_EXPORTS, base + '.md')
  await writeFile(cheminMd, construireMarkdown({ meta, segments }), 'utf8')

  return { nbSegments: segments.length, apercu: segments.slice(0, 3), provenance, fichiers: { json: cheminJson, docx: cheminDocx, sql: cheminSql, txt: cheminTxt, md: cheminMd } }
}

// ── Données d'entraînement Kraken/ketos ──────────────────────────────────────
const escXml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** ALTO d'une page avec la transcription CORRIGÉE (ground truth) + coordonnées, référençant l'image.
 *  Format lu par `ketos train -f alto`. Pur (testable). */
export function altoEntrainement(imageFichier, largeur, hauteur, lignes = []) {
  const tls = lignes.filter((l) => Array.isArray(l.bbox) && String(l.dip ?? '').trim()).map((l, i) => {
    const [x, y, w, h] = l.bbox
    return `    <TextLine ID="line_${i}" HPOS="${x}" VPOS="${y}" WIDTH="${w}" HEIGHT="${h}"><String CONTENT="${escXml(l.dip)}" HPOS="${x}" VPOS="${y}" WIDTH="${w}" HEIGHT="${h}"/></TextLine>`
  }).join('\n')
  const L = largeur || 0, H = hauteur || 0
  return `<?xml version="1.0" encoding="UTF-8"?>
<alto xmlns="http://www.loc.gov/standards/alto/ns-v4#">
  <Description><sourceImageInformation><fileName>${escXml(imageFichier)}</fileName></sourceImageInformation></Description>
  <Layout><Page ID="page" PHYSICAL_IMG_NR="1" WIDTH="${L}" HEIGHT="${H}"><PrintSpace HPOS="0" VPOS="0" WIDTH="${L}" HEIGHT="${H}">
${tls}
  </PrintSpace></Page></Layout>
</alto>
`
}

/** Le chemin Windows de l'image de page, extrait de pngUrl (/api/fichier?path=…). */
function cheminImageDepuisUrl(pngUrl) {
  const m = /[?&]path=([^&]+)/.exec(pngUrl || '')
  return m ? decodeURIComponent(m[1]) : null
}

/**
 * Exporte les corrections des pages VALIDÉES en jeu d'entraînement Kraken : par page, l'image +
 * un ALTO corrigé (ground truth) ; plus un manifeste JSONL riche (ocr original, corrigé, bbox,
 * source, page, moteur, modèle, date, confiance). NE lance AUCUN entraînement.
 */
export async function exporterEntrainement(nom, projet, { date = null } = {}) {
  // Garde-fou données : un projet marqué comme référence contaminée ne peut JAMAIS
  // servir de jeu d'entraînement (ex. Boèce Tesseract, confusions ſ→f). Refus explicite.
  if (projet?._garde?.interdit_entrainement) {
    throw new Error(`projet « ${nom} » marqué interdit_entrainement (${projet._garde.motif || 'référence invalide'}) — export refusé`)
  }
  const base = join(DIR_EXPORTS, 'entrainement', nomSur(nom))
  await mkdir(base, { recursive: true })
  const pages = projet.pages || {}
  const numeros = Object.keys(pages).map(Number).sort((a, b) => a - b)
  const jsonl = []
  const dateISO = date || new Date().toISOString()
  const source = projet.meta?.titre || (projet.chemin ? basename(projet.chemin) : nom)
  let nbPages = 0, nbLignes = 0, nbCorrigees = 0

  for (const n of numeros) {
    const pg = pages[n]
    if (!pg || !pg.valide || !Array.isArray(pg.lignes)) continue // seulement les pages VALIDÉES
    const imgWin = cheminImageDepuisUrl(pg.pngUrl)
    if (!imgWin) continue
    const imgNom = `p${String(n).padStart(4, '0')}.png`
    try { await copyFile(imgWin, join(base, imgNom)) } catch { continue } // image absente → page ignorée

    await writeFile(join(base, `p${String(n).padStart(4, '0')}.alto.xml`), altoEntrainement(imgNom, pg.largeur, pg.hauteur, pg.lignes), 'utf8')
    nbPages++
    for (const l of pg.lignes) {
      const corrige = String(l.dip ?? '').trim()
      if (!Array.isArray(l.bbox) || !corrige) continue
      const original = l.ocr0 != null ? l.ocr0 : corrige
      nbLignes++; if (corrige !== original) nbCorrigees++
      jsonl.push(JSON.stringify({
        image: imgNom, bbox: l.bbox, ocr_original: original, corrige, modifie: corrige !== original,
        confiance: l.confiance ?? null, source, page: n,
        moteur: pg.ocr?.moteur ?? null, modele: pg.ocr?.modele ?? null, date: dateISO,
      }))
    }
  }
  await writeFile(join(base, 'manifeste.jsonl'), jsonl.join('\n') + (jsonl.length ? '\n' : ''), 'utf8')
  await writeFile(join(base, 'README.txt'),
    `Données d'entraînement Kraken — « ${nom} »\n${nbPages} page(s) validée(s), ${nbLignes} ligne(s) (${nbCorrigees} corrigée(s)).\n\n` +
    `Contenu :\n  pXXXX.png        image de la page\n  pXXXX.alto.xml   transcription CORRIGÉE (ground truth) + coordonnées, référençant l'image\n  manifeste.jsonl  métadonnées par ligne\n\n` +
    `Fine-tuning (NE PAS lancer sans décision — voir doc) :\n  ketos train -f alto -i catmus-print-fondue-large.mlmodel --resize both -o modele-corpus *.alto.xml\n\n` +
    `Doctrine §14 : ces données servent à AMÉLIORER le modèle, jamais à publier du texte non relu.\n`, 'utf8')

  return { dossier: base, nbPages, nbLignes, nbCorrigees }
}

/**
 * Exporte chaque page océrisée aux formats d'échange ALTO v4 et PAGE XML (coordonnées + texte),
 * avec l'image, dans `exports/<nom>-xml/`. Ouvrable dans eScriptorium / Transkribus / Aletheia.
 * `couche` = quelle transcription exporter (dip par défaut). N'écrit rien dans l'actif (§14).
 */
export async function exporterPagesXml(nom, projet, { couche = 'dip', date = null } = {}) {
  const base = join(DIR_EXPORTS, nomSur(nom) + '-xml')
  await mkdir(base, { recursive: true })
  const pages = projet.pages || {}
  const numeros = Object.keys(pages).map(Number).sort((a, b) => a - b)
  const dateISO = date || new Date().toISOString()
  let nbPages = 0, nbLignes = 0
  for (const n of numeros) {
    const pg = pages[n]
    if (!pg || !Array.isArray(pg.lignes) || !pg.lignes.length) continue
    const pad = String(n).padStart(4, '0')
    let imgNom = `p${pad}.png`
    const imgWin = cheminImageDepuisUrl(pg.pngUrl)
    if (imgWin) { try { await copyFile(imgWin, join(base, imgNom)) } catch { imgNom = basename(imgWin) } }
    const commun = { image: imgNom, largeur: pg.largeur, hauteur: pg.hauteur, lignes: pg.lignes, couche }
    await writeFile(join(base, `p${pad}.alto.xml`), altoPage(commun), 'utf8')
    await writeFile(join(base, `p${pad}.page.xml`), pageXml({ ...commun, date: dateISO }), 'utf8')
    nbPages++
    nbLignes += pg.lignes.filter((l) => Array.isArray(l.bbox) && String(l[couche] ?? l.dip ?? l.texte ?? '').trim()).length
  }
  return { dossier: base, nbPages, nbLignes }
}
