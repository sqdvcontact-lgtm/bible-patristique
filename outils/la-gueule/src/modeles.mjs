// Registre des modèles OCR/HTR et mesures de qualité.
//
// Rôle : ne jamais remplacer aveuglément un bon modèle par un moins bon.
// On garde CHAQUE modèle avec sa version, sa date, son corpus d'entraînement
// et ses mesures de qualité (CER/WER) mesurées sur un banc d'essai stable ;
// un candidat n'est adopté que s'il est MEILLEUR que la référence.
//
// Ce module NE LANCE AUCUN entraînement : il ne fait que mesurer, décider et
// consigner. L'entraînement (ketos) reste une opération manuelle, documentée
// dans docs/guides/ENTRAINEMENT.md.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ICI = dirname(fileURLToPath(import.meta.url))
const DOSSIER = join(ICI, '..', 'modeles')
const REGISTRE = join(DOSSIER, 'registre.json')

const pct = x => `${(x * 100).toFixed(2)} %`

// --- Métriques de qualité (pures) ---------------------------------------

// Distance d'édition de Levenshtein entre deux séquences (tableaux de
// caractères ou de mots). Deux lignes glissantes → mémoire O(min).
export function distanceEdition(a, b) {
  const n = a.length
  const m = b.length
  if (n === 0) return m
  if (m === 0) return n
  const prec = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    let diag = prec[0]
    prec[0] = i
    for (let j = 1; j <= m; j++) {
      const tmp = prec[j]
      const cout = a[i - 1] === b[j - 1] ? 0 : 1
      prec[j] = Math.min(prec[j] + 1, prec[j - 1] + 1, diag + cout)
      diag = tmp
    }
  }
  return prec[m]
}

// Taux d'erreur d'une hypothèse (sortie OCR) face à une référence (texte
// corrigé). Par caractère (CER) par défaut ; par mot (WER) si mots=true.
// Référence vide : 0 si l'hypothèse est vide aussi, sinon 1.
export function tauxErreur(reference, hypothese, { mots = false } = {}) {
  const decouper = s =>
    mots
      ? String(s).trim().split(/\s+/).filter(Boolean)
      : Array.from(String(s))
  const ref = decouper(reference)
  const hyp = decouper(hypothese)
  if (ref.length === 0) return hyp.length === 0 ? 0 : 1
  return distanceEdition(ref, hyp) / ref.length
}

// Évalue un modèle sur un jeu de paires { reference, hypothese }.
// CER/WER au niveau du CORPUS (somme des distances ÷ somme des longueurs),
// qui est la mesure standard — et non la moyenne des taux par ligne, qui
// surpondère les lignes courtes.
export function evaluerModele(paires = []) {
  let distC = 0
  let longC = 0
  let distM = 0
  let longM = 0
  for (const p of paires) {
    const ref = Array.from(String(p.reference ?? ''))
    const hyp = Array.from(String(p.hypothese ?? ''))
    distC += distanceEdition(ref, hyp)
    longC += ref.length
    const refM = String(p.reference ?? '').trim().split(/\s+/).filter(Boolean)
    const hypM = String(p.hypothese ?? '').trim().split(/\s+/).filter(Boolean)
    distM += distanceEdition(refM, hypM)
    longM += refM.length
  }
  return {
    nbLignes: paires.length,
    nbCaracteres: longC,
    cer: longC ? distC / longC : 0,
    wer: longM ? distM / longM : 0,
  }
}

// Normalisation TYPOGRAPHIQUE pour la comparaison OCR. La convention française (espace fine
// avant « ; : ! ? » et autour des guillemets) relève du RENDU, pas de la reconnaissance : le
// site la pose par code. On la neutralise donc au moment de comparer — appliquée À L'IDENTIQUE
// sur la référence ET l'hypothèse — pour qu'un espace avant une ponctuation haute (présent d'un
// côté, absent de l'autre) ne soit pas compté comme une erreur du socle. On unifie aussi les
// espaces insécables / fines avec l'espace simple. Ne touche à RIEN d'autre (lettres, mots).
export function normaliserTypographie(s) {
  return String(s ?? '')
    .replace(/[       ]/g, ' ') // insécable / fine / cadratins → espace simple
    .replace(/ +([;:!?»])/g, '$1')                                   // pas d'espace avant ; : ! ? »
    .replace(/(«) +/g, '$1')                                         // ni après «
}

// --- Décision d'adoption (pure) -----------------------------------------

// N'adopte un candidat que s'il est MEILLEUR que la référence d'une marge
// nette (CER strictement plus bas de plus de `marge`). Sans référence
// mesurée (premier modèle), on adopte le candidat comme socle. Si le CER du
// candidat n'est pas mesuré, on refuse : il faut évaluer d'abord.
export function comparerQualite(candidat, reference, { marge = 0.005 } = {}) {
  const cerC = candidat?.cer
  if (typeof cerC !== 'number' || Number.isNaN(cerC)) {
    return { adopter: false, raison: 'CER du candidat inconnu — évaluer d’abord sur le banc d’essai', delta: null }
  }
  const cerR = reference?.cer
  if (typeof cerR !== 'number' || Number.isNaN(cerR)) {
    return { adopter: true, raison: 'aucune référence mesurée — on adopte le candidat comme socle', delta: null }
  }
  const delta = cerR - cerC // > 0 = le candidat s'améliore
  if (delta > marge) {
    return { adopter: true, raison: `CER ${pct(cerC)} < référence ${pct(cerR)} (gain ${pct(delta)})`, delta }
  }
  return {
    adopter: false,
    raison: `pas d’amélioration nette (candidat ${pct(cerC)} vs référence ${pct(cerR)}, marge ${pct(marge)}) — on garde la référence`,
    delta,
  }
}

// --- Registre (persistance) ---------------------------------------------

// Construit une entrée de registre. La date est fournie par l'appelant
// (pas de Date.now ici, pour rester pur et testable).
export function entreeModele({
  version,
  chemin,
  base = null,
  corpus = null,
  cer = null,
  wer = null,
  nbLignesEval = null,
  banc = null,
  date = null,
  notes = '',
  statut = 'candidat',
} = {}) {
  return { version, chemin, base, corpus, cer, wer, nbLignesEval, banc, date, notes, statut }
}

export async function chargerRegistre() {
  try {
    const r = JSON.parse(await readFile(REGISTRE, 'utf8'))
    return Array.isArray(r?.modeles) ? r : { modeles: [] }
  } catch {
    return { modeles: [] }
  }
}

// Ajoute une entrée, ou remplace celle de même `version`. N'écrase jamais
// un fichier de modèle : ne touche qu'au registre JSON.
export async function enregistrerModele(entree) {
  const registre = await chargerRegistre()
  const i = registre.modeles.findIndex(m => m.version === entree.version)
  if (i >= 0) registre.modeles[i] = entree
  else registre.modeles.push(entree)
  await mkdir(DOSSIER, { recursive: true })
  await writeFile(REGISTRE, JSON.stringify(registre, null, 2) + '\n', 'utf8')
  return registre
}

// Le meilleur modèle utilisable (socle ou adopté) : CER mesuré le plus bas.
export function meilleurModele(registre) {
  const utilisables = (registre?.modeles ?? []).filter(
    m => (m.statut === 'adopte' || m.statut === 'socle') && typeof m.cer === 'number',
  )
  if (!utilisables.length) return null
  return utilisables.reduce((a, b) => (b.cer < a.cer ? b : a))
}

export const CHEMIN_REGISTRE = REGISTRE
