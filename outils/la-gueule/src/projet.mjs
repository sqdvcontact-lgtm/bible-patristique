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
import { analyserComparaison, comparaisonMarkdown } from './comparaison.mjs'
import { rapportTriageMarkdown } from './ia/rapport-triage.mjs'
import { mesurerTriage } from './ia/triage.mjs'
import { noteTypee, ancrageNote, noteEstEnVers } from './notes-typage.mjs' // §13.4 : notes typées + ancrées
import { construireSqlNotes, identifiantTexte } from './sql-notes.mjs'
import { altoPage, pageXml } from './echange.mjs'
import { segmenterColonnes } from './colonnes.mjs'
import { estHorsCorpsConfirme, extraireStructure, metadonneesPagesProjet, registrePoemesProjet } from './structure.mjs'
import { espacementDiplomatique } from './typographie.mjs'
import { assurerWorkflow } from './workflow.mjs'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR_PROJETS = join(RACINE, 'projets')
const DIR_EXPORTS = join(RACINE, 'exports')
const DIR_BANCS = join(RACINE, 'bancs')
const DIR_PROFILS = join(RACINE, 'profils-traitement')

const nomSur = (n) => String(n || 'sans-nom').replace(/[^\w.-]+/g, '_').slice(0, 80)

/** Phase B — écrit le profil de traitement du diagnostic (jamais destructif : nom versionné). */
export async function sauverProfil(nom, profil) {
  await mkdir(DIR_PROFILS, { recursive: true })
  const chemin = join(DIR_PROFILS, nomSur(nom) + '-profil-v1.json')
  await writeFile(chemin, JSON.stringify({ ...profil, projet: nom, genere_le: new Date().toISOString() }, null, 2), 'utf8')
  return chemin
}

/** Phase F — écrit le rapport de génération (versionné par run_id → n'écrase JAMAIS une livraison). */
export async function sauverRapportGeneration(nom, rapport) {
  await mkdir(DIR_EXPORTS, { recursive: true })
  const rid = String(rapport?.run_id || 'run').replace(/[^\w.-]+/g, '_').slice(0, 40)
  const chemin = join(DIR_EXPORTS, nomSur(nom) + '-generation-' + rid + '.json')
  await writeFile(chemin, JSON.stringify(rapport, null, 2), 'utf8')
  return chemin
}

export async function sauvegarderProjet(nom, projet) {
  await mkdir(DIR_PROJETS, { recursive: true })
  const chemin = join(DIR_PROJETS, nomSur(nom) + '.json')
  await writeFile(chemin, JSON.stringify({ ...projet, nom, maj: new Date().toISOString() }, null, 2), 'utf8')
  return chemin
}

export async function chargerProjet(nom) {
  const chemin = join(DIR_PROJETS, nomSur(nom) + '.json')
  const projet = JSON.parse(await readFile(chemin, 'utf8'))
  return assurerWorkflow(projet) // Phase A : ajoute le workflow (états inférés) sans rien détruire
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

/**
 * Réunit les lignes d'un paragraphe en un texte (§14.3, passe 3 Q2). Convention CATMuS-Print :
 *  - « ¬ » en fin de ligne = césure typographique → SUPPRIMÉE et fragments recollés sans blanc ;
 *  - « - » / « ‐ » = trait LEXICAL → CONSERVÉ, fragments recollés sans blanc (arc-/en-ciel → arc-en-ciel) ;
 *  - une ligne dont la césure est marquée ambiguë (`l.cesure.ambigu`) n'est PAS jointe (blanc, on ne
 *    décide rien) ;
 *  - sinon, jonction par une espace.
 */
export function joindreLignes(lignes, champ) {
  let out = '', prevAmbigu = false
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    const t = String(l?.[champ] ?? '').trim()
    if (!t) continue
    if (out === '') { out = t; prevAmbigu = !!(l?.cesure?.ambigu); continue }
    if (!prevAmbigu && /¬\s*$/.test(out)) out = out.replace(/¬\s*$/, '') + t        // césure typographique → recollée sans trait
    else if (!prevAmbigu && /[-‐]\s*$/.test(out)) out = out.replace(/\s*$/, '') + t  // trait lexical conservé
    else out += ' ' + t                                                             // ligne normale ou césure ambiguë
    prevAmbigu = !!(l?.cesure?.ambigu)
  }
  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Passe 3 Q2 — suggestion (jamais de conversion silencieuse) : la fin de `ligne` porte « - » et la
 * `suivante` continue manifestement le même mot (commence par une minuscule) → proposer de classer
 * en césure typographique « ¬ ». Fonction PURE, pour l'atelier ; ne modifie rien.
 */
export function suggererCesure(ligne, suivante) {
  const a = String(ligne ?? '').trim(), b = String(suivante ?? '').trim()
  if (!/[-‐]$/.test(a)) return false
  return /^[a-zà-öø-ÿ]/.test(b) // la suite commence par une minuscule → coupure de mot probable
}

/**
 * Passe 4 §4 — césure dépendante de la PROVENANCE du moteur. Pour Kraken CATMuS-Print, « - » reste
 * lexical (« ¬ » est la marque de césure) → aucune suggestion auto. Pour Tesseract ou un moteur
 * INCONNU, un « - » final n'est PAS présumé lexical : on propose un `cesure_candidate` si les signaux
 * (fin lettre+« - » unique, suite minuscule même colonne, interligne normal, marge droite atteinte,
 * pas de blanc de paragraphe) sont réunis. JAMAIS de conversion ni de jointure sans validation humaine ;
 * confiance réduite si le moteur est inconnu. Renvoie l'objet suggestion ou null.
 */
export function detecterCesureCandidate(ligne, suivante, { moteur_source = 'inconnu', largeur = 0, ligne_suivante_id = null } = {}) {
  const a = String(ligne?.dip ?? ligne?.texte ?? '').trim()
  const b = String(suivante?.dip ?? suivante?.texte ?? '').trim()
  if (/kraken/i.test(moteur_source)) return null          // Kraken : « - » lexical par défaut
  if (!/[A-Za-zÀ-ÿ]-$/.test(a)) return null               // finit par lettre + un seul « - »
  if (/--$/.test(a) || /—-?$/.test(a)) return null        // double trait / tiret de dialogue exclus
  if (!/^[a-zà-öø-ÿ]/.test(b)) return null                // capitale en tête → aucune suggestion
  const preuves = ['fin lettre + « - »', 'suite en minuscule']
  if (Array.isArray(ligne?.bbox) && Array.isArray(suivante?.bbox) && largeur) {
    const [x1, y1, w1, h1] = ligne.bbox, [x2, y2] = suivante.bbox, W = largeur
    if ((x1 + w1) < W * 0.82) return null                 // n'atteint pas la marge droite
    if (Math.abs(x2 - x1) > W * 0.15) return null         // colonne différente / alinéa de paragraphe
    const gap = y2 - (y1 + h1)
    if (gap > h1 * 1.2) return null                       // blanc de paragraphe → pas de césure
    if (gap < -h1 * 0.6) return null                      // chevauchement anormal
    preuves.push('marge droite', 'même colonne', 'interligne normal')
  }
  const inconnu = !/tesseract/i.test(moteur_source)
  return {
    role_suggere: 'cesure_typographique',
    glyphe_source: '-',
    marque_ground_truth_proposee: '¬',
    moteur_source: inconnu ? 'inconnu' : 'tesseract',
    ligne_suivante_id,
    preuves,
    statut: 'suggere',
    jointure_confirmee: false,
    confiance: inconnu ? 0.55 : 0.75, // confiance réduite si le moteur est inconnu
  }
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
  // Notes ANCRÉES récoltées au fil des pages : numéro → lignes qui composent la note (une glose de
  // marge tient sur plusieurs lignes). Rendues au champ `notes` du segment porteur (§13.1).
  const notesAncrees = new Map()
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
      // Ordre de lecture garanti haut→bas : Kraken émet parfois le n° de page en dernier
      // (bas index, haut de page). Un tri par VPOS le remet en place → filtré comme en-tête.
      const parY = [...piste.lignes].sort((a, b) => (a.bbox ? a.bbox[1] : 1e9) - (b.bbox ? b.bbox[1] : 1e9))
      for (const l of parY) {
        if (estHorsCorpsConfirme(l)) {
          // §13.1 « Les notes de l'édition sont conservées » : une note ancrée (manchette ou note
          // de pied estampillée d'un `note_numero`) sort du flux de prose MAIS son texte est
          // récolté ici pour être rendu au champ `notes` du segment qui porte son appel.
          const num = Number(l.note_numero)
          if (Number.isInteger(num) && num >= 1) {
            if (!notesAncrees.has(num)) notesAncrees.set(num, [])
            notesAncrees.get(num).push(l)
          }
          continue // exclu du CORPS, jamais de la source
        }
        if (estTitre(l)) { vider(); majStructure(l.titre.niveau, l.titre.texte) }
        else bloc.push(l)
      }
      vider()
    }
  }
  // 1. NOTES ANCRÉES (manchettes, notes de pied rattachées au Contrôle) : leur texte rejoint le
  //    champ `notes` du segment qui porte l'appel « [[n]] », au format EXACT de `segments.notes`
  //    en base (« [[n]] texte », une note par ligne). Une glose de marge tient sur plusieurs
  //    lignes courtes coupées par « ¬ » : `joindreLignes` les recolle en une seule note.
  for (const [num, lignes] of notesAncrees) {
    const texte = joindreLignes(lignes, 'dip') || joindreLignes(lignes, 'texte')
    if (!texte) continue
    const porteur = segments.find((s) => s.segment_texte && s.segment_texte.includes('[[' + num + ']]'))
    if (!porteur) continue // appel absent du corps : on ne rattache pas au hasard (§13.1)
    porteur.notes = (porteur.notes ? porteur.notes + '\n' : '') + '[[' + num + ']] ' + texte
  }
  // 2. Références parenthétiques du texte → appels [[N]] + champ `notes`. Le compteur DÉMARRE
  //    après le plus grand numéro déjà posé par l'ancrage : deux notes ne portent jamais le
  //    même numéro (§13.2 « un numéro unique … global à l'échelle de l'œuvre »).
  if (recenserNotes) {
    let n = 1
    for (const num of notesAncrees.keys()) if (num >= n) n = num + 1
    for (const seg of segments) {
      if (!seg.segment_texte) continue
      const r = recenserReferences(seg.segment_texte, n)
      seg.segment_texte = r.texte
      const ajout = formaterNotes(r.notes)
      if (ajout) seg.notes = (seg.notes ? seg.notes + '\n' : '') + ajout
      n = r.prochain
    }
  }
  // 3. Renumérotation finale DANS L'ORDRE DE LECTURE (§13.2 : « Les notes sont renumérotées dans
  //    l'ordre de lecture de l'édition numérique »). Sans elle, les manchettes et les références
  //    parenthétiques se suivraient dans deux séries, et l'ordre des appels serait quelconque.
  const ancienVersNeuf = renumeroterNotes(segments)
  // Caractère VERSIFIÉ des notes ancrées (§13.4) : mesuré sur les lignes d'origine, avant que
  // `joindreLignes` ne les ait fondues en une seule chaîne. Reporté sur le numéro FINAL.
  segments._versParNumero = new Map()
  for (const [num, lignes] of notesAncrees) {
    if (!noteEstEnVers(lignes)) continue
    segments._versParNumero.set(ancienVersNeuf.get(num) ?? num, true)
  }
  return segments
}

/**
 * Renumérote tous les appels « [[n]] » d'une œuvre dans l'ORDRE DE LECTURE (§13.2) : premier appel
 * rencontré = 1, et ainsi de suite. Réécrit les appels du texte ET les entrées du champ `notes`.
 * Pure sur le tableau reçu (mute les segments), sans I/O. Un appel sans note, ou une note sans
 * appel, est conservé tel quel plutôt que perdu — le contrôle structurel (§20) le signalera.
 */
export function renumeroterNotes(segments = []) {
  const ordre = new Map() // ancien numéro → nouveau (renvoyée : d'autres passes en dépendent)
  let n = 1
  for (const seg of segments) {
    const t = String(seg?.segment_texte ?? '')
    for (const m of t.matchAll(/\[\[(\d+)\]\]/gu)) {
      const a = Number(m[1])
      if (!ordre.has(a)) ordre.set(a, n++)
    }
  }
  if (!ordre.size) return ordre
  const remplacer = (s) => String(s ?? '').replace(/\[\[(\d+)\]\]/gu, (tout, a) => {
    const neuf = ordre.get(Number(a))
    return neuf ? '[[' + neuf + ']]' : tout
  })
  for (const seg of segments) {
    if (seg.segment_texte) seg.segment_texte = remplacer(seg.segment_texte)
    if (seg.notes) {
      // Les notes d'un même segment sont réordonnées selon leur nouveau numéro.
      seg.notes = String(seg.notes).split('\n').filter(Boolean).map(remplacer)
        .sort((x, y) => (Number((/^\[\[(\d+)\]\]/.exec(x) || [])[1]) || 0) - (Number((/^\[\[(\d+)\]\]/.exec(y) || [])[1]) || 0))
        .join('\n')
    }
  }
  return ordre // table ancien → nouveau : les passes suivantes (vers, ancres) en dépendent
}

/**
 * Notes de l'œuvre TYPÉES (§13.4), à la forme de `texte_notes` / `texte_note_blocs` / relations.
 * Lit le champ `notes` déjà construit (« [[n]] texte », format de `segments.notes`) et décompose
 * chaque note en blocs de fonction. N'altère RIEN : `segments.notes` reste le format que le site
 * consomme ; ceci est une couche d'analyse supplémentaire, portée par l'export JSON.
 */
export function notesTypeesProjet(segments = [], { versParNumero = new Map(), id_texte = null } = {}) {
  const notes = []
  for (const seg of segments) {
    if (!seg?.notes) continue
    for (const ligne of String(seg.notes).split('\n')) {
      const m = /^\[\[(\d+)\]\]\s*(.+)$/su.exec(ligne.trim())
      if (!m) continue
      const numero = Number(m[1])
      const n = noteTypee({ numero, texte: m[2], page: seg.page ?? null, verse: versParNumero.get(numero) === true })
      if (!n) continue
      // Le LIVRE courant, quand la structure éditoriale le donne (colonne `texte_notes.book`).
      if (seg.ref_niv1_texte) n.book = String(seg.ref_niv1_texte).slice(0, 40)
      // ANCRE : position exacte de l'appel dans CE segment (jamais inventée — null si absent).
      // `rang` EST l'ordre de lecture du segment : c'est lui que `sql.mjs` écrit dans
      // `segments.segment_numero` (cf. sql.mjs), donc c'est lui que l'ancre doit viser.
      const numSeg = seg.segment_numero ?? seg.rang ?? null
      const a = ancrageNote({
        numero, segment_texte: seg.segment_texte, segment_numero: numSeg,
        segment_key: id_texte && numSeg != null ? `${id_texte}:s${String(numSeg).padStart(3, '0')}` : null,
      })
      if (a) n.ancre = { ...a, structured_block_count: n.blocs.length }
      notes.push(n)
    }
  }
  return notes.sort((a, b) => a.note_number - b.note_number)
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
  await writeFile(chemin, JSON.stringify({ id_oeuvre: opts.id_oeuvre ?? null, meta: projet.meta || null, provenance, statut: 'CANDIDAT', segments, structure: extraireStructure(projet), metadonnees_pages: metadonneesPagesProjet(projet), poemes: registrePoemesProjet(projet), notes_typees: notesTypeesProjet(segments, { versParNumero: segments._versParNumero || new Map(), id_texte: identifiantTexte({ id_oeuvre: opts.id_oeuvre ?? null, meta: projet.meta || {} }) }) }, null, 2), 'utf8')
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
  await writeFile(cheminJson, JSON.stringify({ id_oeuvre: opts.id_oeuvre ?? null, meta: meta || null, provenance, statut: 'CANDIDAT', segments, structure: extraireStructure(projet), metadonnees_pages: metadonneesPagesProjet(projet), poemes: registrePoemesProjet(projet), notes_typees: notesTypeesProjet(segments, { versParNumero: segments._versParNumero || new Map(), id_texte: identifiantTexte({ id_oeuvre: opts.id_oeuvre ?? null, meta: projet.meta || {} }) }) }, null, 2), 'utf8')

  const cheminDocx = join(DIR_EXPORTS, base + '.docx')
  await writeFile(cheminDocx, construireDocx({ meta, segments }))

  const cheminSql = join(DIR_EXPORTS, base + '.supabase.sql')
  await writeFile(cheminSql, construireSqlSupabase({ meta, segments, id_oeuvre: opts.id_oeuvre ?? null }), 'utf8')

  const cheminTxt = join(DIR_EXPORTS, base + '.txt')
  await writeFile(cheminTxt, construireTexte({ meta, segments }), 'utf8')

  const cheminMd = join(DIR_EXPORTS, base + '.md')
  await writeFile(cheminMd, construireMarkdown({ meta, segments }), 'utf8')

  // NOTES STRUCTURÉES (§13.4) — fichier SÉPARÉ : `segments` d'abord, les notes typées ensuite,
  // dans leurs propres tables. Écrit seulement s'il y a des notes (pas de fichier vide).
  const idTexte = identifiantTexte({ id_oeuvre: opts.id_oeuvre ?? null, meta })
  const notesTypees = notesTypeesProjet(segments, { versParNumero: segments._versParNumero || new Map(), id_texte: idTexte })
  let cheminNotesSql = null
  if (notesTypees.length) {
    cheminNotesSql = join(DIR_EXPORTS, base + '.notes.sql')
    await writeFile(cheminNotesSql, construireSqlNotes({ id_texte: idTexte, notes: notesTypees }), 'utf8')
  }

  return { nbSegments: segments.length, nbNotes: notesTypees.length, apercu: segments.slice(0, 3), provenance, fichiers: { json: cheminJson, docx: cheminDocx, sql: cheminSql, txt: cheminTxt, md: cheminMd, ...(cheminNotesSql ? { notes_sql: cheminNotesSql } : {}) } }
}

/**
 * Extraction de CONTRÔLE pour GPT : compare l'OCR IA (couche `dip`, après contrôle) à
 * l'OCR mécanique (`ocr0`, immuable), ligne à ligne. Écrit un Markdown lisible + un JSON
 * structuré dans exports/. N'écrit rien dans le projet actif (§14).
 */
export async function exporterComparaison(nom, projet, { date = null, seuilConfiance = 0.8 } = {}) {
  const base = nomSur(nom)
  await mkdir(DIR_EXPORTS, { recursive: true })
  const { resume, pages } = analyserComparaison(projet, { seuilConfiance })
  const md = comparaisonMarkdown(projet, { nom, date, seuilConfiance })
  const jsonTexte = JSON.stringify({ nom, meta: projet.meta || null, genere_le: date, statut: 'CANDIDAT', resume, pages }, null, 2)
  const cheminMd = join(DIR_EXPORTS, base + '.comparaison-ocr.md')
  await writeFile(cheminMd, md, 'utf8')
  const cheminJson = join(DIR_EXPORTS, base + '.comparaison-ocr.json')
  await writeFile(cheminJson, jsonTexte, 'utf8')
  // On renvoie AUSSI le contenu (md + json) et un nom de fichier suggéré : l'atelier
  // ouvre un sélecteur « Enregistrer sous » pour que l'utilisateur choisisse son dossier.
  return { resume, fichiers: { md: cheminMd, json: cheminJson }, md, json: jsonTexte, nomFichier: base + '.comparaison-ocr.md' }
}

/**
 * RAPPORT DE CONTRÔLE après triage (§10) : la file de relecture d'abord, l'audit replié ensuite.
 * `findings` sont les interventions du contrôle, chacune portant sa décision de triage. Comme pour la
 * comparaison, on écrit dans `exports/` ET on renvoie le contenu, pour que l'atelier propose
 * « Enregistrer sous » et que l'utilisateur choisisse son dossier.
 */
export async function exporterRapportTriage(nom, projet, findings = [], { date = null, mode = 'file', lignesFaiblesConfirmees = 0 } = {}) {
  const base = nomSur(nom)
  await mkdir(DIR_EXPORTS, { recursive: true })
  const md = rapportTriageMarkdown(projet, findings, { nom, date, mode, lignesFaiblesConfirmees })
  const mesures = mesurerTriage((findings || []).map((f) => f?.triage).filter(Boolean))
  const jsonTexte = JSON.stringify({
    nom, meta: projet?.meta || null, genere_le: date, statut: 'CANDIDAT', mesures,
    lignes_faibles_confirmees: lignesFaiblesConfirmees,
    // On exporte les décisions AVEC leur trace : c'est ce qui rend l'automatisation auditable.
    decisions: (findings || []).filter((f) => f?.triage).map((f) => ({
      page: f.page, ligne_ids: f.ligne_ids, type: f.type, regle: f.regle,
      ocr0: f.texte_original, candidat: f.texte_candidat, triage: f.triage,
    })),
  }, null, 2)
  const cheminMd = join(DIR_EXPORTS, base + '.controle-triage.md')
  await writeFile(cheminMd, md, 'utf8')
  const cheminJson = join(DIR_EXPORTS, base + '.controle-triage.json')
  await writeFile(cheminJson, jsonTexte, 'utf8')
  return { mesures, fichiers: { md: cheminMd, json: cheminJson }, md, json: jsonTexte, nomFichier: base + '.controle-triage.md' }
}

// ── Données d'entraînement Kraken/ketos ──────────────────────────────────────
const escXml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** ALTO d'une page avec la transcription CORRIGÉE (ground truth) + coordonnées, référençant l'image.
 *  Format lu par `ketos train -f alto`. Pur (testable). */
export function altoEntrainement(imageFichier, largeur, hauteur, lignes = []) {
  const tls = lignes.filter((l) => Array.isArray(l.bbox) && String(l.dip ?? '').trim()).map((l, i) => {
    const [x, y, w, h] = l.bbox
    // Q3 : jamais de fine U+202F dans le ground-truth (convention de rendu, pas de vérité terrain).
    return `    <TextLine ID="line_${i}" HPOS="${x}" VPOS="${y}" WIDTH="${w}" HEIGHT="${h}"><String CONTENT="${escXml(espacementDiplomatique(l.dip))}" HPOS="${x}" VPOS="${y}" WIDTH="${w}" HEIGHT="${h}"/></TextLine>`
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
      if (l.incertain) continue // lecture incertaine → jamais en ground-truth
      const corrige = espacementDiplomatique(String(l.dip ?? '').trim()) // Q3 : pas de fine U+202F en GT
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

// ── Banc d'essai (ÉVALUATION seulement, jamais entraînement) ─────────────────
/** Manifeste PUR d'un banc : ne compte QUE les lignes valide_humain (hors incertaines). Testable. */
export function construireManifesteBanc(projet) {
  const pages = projet?.pages || {}
  const nums = Object.keys(pages).map(Number).sort((a, b) => a - b)
  const out = { valide_humain: !!projet?._garde?.valide_humain, pages: [], nbLignesTotal: 0, nbCaracteresTotal: 0 }
  for (const n of nums) {
    const pg = pages[n]
    if (!pg || !pg.valide_humain || !Array.isArray(pg.lignes)) continue
    const lignes = pg.lignes.filter((l) => l.valide_humain && !l.incertain && Array.isArray(l.bbox) && String(l.dip ?? '').trim())
    if (!lignes.length) continue
    const nbCar = lignes.reduce((s, l) => s + [...String(l.dip)].length, 0)
    out.pages.push({ page: n, nbLignes: lignes.length, nbCaracteres: nbCar, moteur: pg.ocr?.moteur ?? null, modele: pg.ocr?.modele ?? null })
    out.nbLignesTotal += lignes.length
    out.nbCaracteresTotal += nbCar
  }
  return out
}

/**
 * Constitue le dossier de banc `bancs/<nom>/` : par page VALIDÉE HUMAINEMENT, l'image + un ALTO
 * corrigé (seules les lignes valide_humain, hors incertaines) + un manifeste (pages, nb lignes,
 * nb caractères, empreintes SHA-256, état de validation, moteur/modèle, date). RÉSERVÉ à
 * l'évaluation (jamais l'entraînement). REFUSE un banc non valide_humain.
 */
export async function exporterBanc(nom, projet, { date = null } = {}) {
  if (!projet?._garde?.valide_humain) throw new Error(`banc « ${nom} » non valide_humain — validation humaine requise avant export`)
  const man = construireManifesteBanc(projet)
  if (!man.pages.length) throw new Error(`banc « ${nom} » : aucune page valide_humain à exporter`)
  const base = join(DIR_BANCS, nomSur(nom))
  await mkdir(base, { recursive: true })
  const dateISO = date || new Date().toISOString()
  const empreintes = {}
  for (const info of man.pages) {
    const pg = projet.pages[info.page]
    const pad = String(info.page).padStart(4, '0')
    const imgNom = `p${pad}.png`
    const imgWin = cheminImageDepuisUrl(pg.pngUrl)
    if (imgWin) { try { await copyFile(imgWin, join(base, imgNom)); empreintes[imgNom] = await empreinteFichier(join(base, imgNom)) } catch { /* image absente */ } }
    const lignes = pg.lignes.filter((l) => l.valide_humain && !l.incertain)
    const alto = altoEntrainement(imgNom, pg.largeur, pg.hauteur, lignes)
    const altoNom = `p${pad}.alto.xml`
    await writeFile(join(base, altoNom), alto, 'utf8')
    empreintes[altoNom] = { sha256: createHash('sha256').update(alto).digest('hex'), octets: Buffer.byteLength(alto) }
  }
  const manifeste = { banc: nom, usage: 'evaluation_seulement', interdit_entrainement: true, valide_le: dateISO, ...man, empreintes }
  await writeFile(join(base, 'manifeste.json'), JSON.stringify(manifeste, null, 2), 'utf8')
  return { dossier: base, nbPages: man.pages.length, nbLignes: man.nbLignesTotal, nbCaracteres: man.nbCaracteresTotal }
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
