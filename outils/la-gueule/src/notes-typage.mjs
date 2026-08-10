// TYPAGE DES NOTES (charte §13.4) — décomposer une note en BLOCS typés.
//
// « La mise en forme d'une note suit la FONCTION de ses éléments, non leur seule position dans la
// page. La prose de commentaire, les citations, les citations en vers et les références
// bibliographiques ou attributions doivent rester distinguables. » (§13.4)
//
// Le vocabulaire n'est pas inventé : il est repris TEL QUEL de ce qui existe en base, dans
// `texte_note_blocs` (modèle structuré déjà en service) —
//   kind     : lemma · commentary · quotation · translation · reference · attribution
//   form     : prose · verse
//   language : fr · la · grc · it
//   rank     : 100, 200, 300… (pas de 100, pour laisser insérer sans tout renuméroter)
// Patron récurrent observé en base : lemma → quotation/commentary → translation → reference.
//
// Le typage est une SUGGESTION : `needs_review` reste vrai dès que la décision n'est pas évidente.
// Module PUR, sans I/O. Réutilise `detecterLangue` (bilingue.mjs) : pas de second système.

import { detecterLangue } from './bilingue.mjs'

export const KINDS = ['lemma', 'commentary', 'quotation', 'translation', 'reference', 'attribution']
export const RANG_PAS = 100

// Abréviations de livres bibliques telles qu'elles paraissent dans les manchettes d'Ancien Régime
// (« Esa.40. », « Ps. 61. 11. », « Matth.3. », « Hebr.14 », « Gen.3 »). Volontairement large sur la
// forme, stricte sur la structure : une abréviation SUIVIE d'un nombre.
const REF_BIBLIQUE = /\b(gen|exo?d|lev|num|deut?|jos|jug|judic|ruth?|reg|sam|par|esdr|neh|tob|judith|esth|job|ps|psal|prov|eccl|cant|sap|eccli|isa?|esa|jer|lam|bar|ezech?|dan|os|joel|am|abd|jon|mich?|nah|hab|soph|agg|zach|mal|mac|matth?|marc?|luc|jo?h|joan|act|rom|cor|gal|eph?es|philipp?|coloss?|thess?|tim|tit|philem|hebr|jac|petr?|jud|apoc)\b\.?\s*\d/iu
// Référence bibliographique. On ne peut pas énumérer les abréviations (« Él. v. », « Sat. x. »,
// « Pontiques », « c. 20. »…) : on reconnaît la STRUCTURE d'un renvoi — bref, au moins une
// abréviation (mot suivi d'un point) ET un nombre (arabe ou romain), et pas une phrase.
const REF_APPUYEE = /\b(t\.|p\.|pag\.|c\.|cap\.|lib\.|liv\.|éd(it)?\.|col\.|n[°o]\.?)\s*[IVXLCDM0-9]/iu
const ABREV = /\b[A-Za-zÀ-ÿ]{1,12}\./gu
const NOMBRE = /\b(\d{1,4}|[IVXLCDM]{1,6}|[ivxlcdm]{1,6})\b\.?/u
function structureDeRenvoi(t) {
  const mots = t.split(/\s+/).filter(Boolean)
  if (mots.length > 12) return false
  const abrevs = (t.match(ABREV) || []).length
  return abrevs >= 1 && NOMBRE.test(t)
}
// Attribution : « (Trad. de M. Yemeniz.) », « (Édit. Gilbert.) ».
const ATTRIBUTION = /\b(trad(uction|\.)|traduit|éd(it(ion|eur))?\.|interpr[eè]t)/iu

const nettoyer = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const entreGuillemets = (s) => /^[«"“].*[»"”][.,;:]?$/u.test(nettoyer(s))
const entreParentheses = (s) => /^\(.*\)[.,;:]?$/u.test(nettoyer(s))

/** Langue d'un bloc : `fr` ou `la` via le détecteur partagé ; `grc` si l'alphabet grec domine. */
export function langueBloc(texte) {
  const t = String(texte ?? '')
  const grec = (t.match(/[Ͱ-Ͽἀ-῿]/gu) || []).length
  if (grec >= 3) return 'grc'
  return detecterLangue(t)
}

/**
 * Type d'un bloc isolé. Ordre des tests = du plus discriminant au plus général ; le commentaire est
 * le repli, jamais un choix par défaut déguisé.
 */
export function typerBloc(texte, { estCitation = false } = {}) {
  const t = nettoyer(texte)
  if (!t) return null
  const langue = langueBloc(t)
  const court = t.length <= 90
  // Attribution : mention de traducteur/éditeur, généralement entre parenthèses et brève.
  if (court && ATTRIBUTION.test(t) && (entreParentheses(t) || /^[—–-]/.test(t))) {
    return { kind: 'attribution', form: 'prose', language: langue, sur: 'mention de traduction ou d’édition' }
  }
  // Référence : renvoi scripturaire ou bibliographique. Une manchette « Esa.40. » est une référence.
  if (REF_BIBLIQUE.test(t) && court) {
    return { kind: 'reference', form: 'prose', language: langue, sur: 'renvoi scripturaire' }
  }
  if (court && (entreParentheses(t) || /[.,]$/u.test(t)) && (REF_APPUYEE.test(t) || (entreParentheses(t) && structureDeRenvoi(t)))) {
    return { kind: 'reference', form: 'prose', language: langue, sur: 'référence bibliographique' }
  }
  // Citation : texte encadré de guillemets. En langue ancienne → citation ; en français, une
  // citation qui SUIT une citation en langue ancienne est sa traduction (décidé par l'appelant).
  if (entreGuillemets(t)) {
    if (estCitation && langue === 'fr') return { kind: 'translation', form: 'prose', language: 'fr', sur: 'traduction de la citation précédente' }
    return { kind: 'quotation', form: 'prose', language: langue, sur: 'texte entre guillemets' }
  }
  return { kind: 'commentary', form: 'prose', language: langue, sur: 'prose de commentaire' }
}

/**
 * Découpe une note en blocs, aux frontières SÛRES seulement (§13.4). On ne fragmente pas la prose :
 * on isole ce qui a une fonction distincte et reconnaissable —
 *   - une citation entre guillemets ;
 *   - une référence ou une attribution en FIN de note, entre parenthèses.
 * Tout le reste demeure d'un seul tenant. En l'absence de frontière sûre, la note fait UN bloc.
 */
export function decomposerNote(texte, { lemme = null, verse = false } = {}) {
  const t = nettoyer(texte)
  if (!t) return []
  const morceaux = []
  let reste = t

  // Référence ou attribution en fin de note, entre parenthèses : « … (Ovide, Pontiques, Él. v.) »
  const finPar = /\s(\([^()]{3,80}\)[.,;:]?)$/u.exec(reste)
  let queue = null
  if (finPar) {
    const cand = typerBloc(finPar[1])
    if (cand && (cand.kind === 'reference' || cand.kind === 'attribution')) {
      queue = finPar[1]; reste = reste.slice(0, finPar.index).trim()
    }
  }
  // Citations entre guillemets : chacune devient un bloc, la prose entre elles aussi.
  const RE_CIT = /[«"“][^»"”]{3,}[»"”][.,;:]?/gu
  let dernier = 0, m
  RE_CIT.lastIndex = 0
  while ((m = RE_CIT.exec(reste)) !== null) {
    const avant = reste.slice(dernier, m.index).trim()
    if (avant) morceaux.push(avant)
    morceaux.push(m[0])
    dernier = m.index + m[0].length
  }
  const fin = reste.slice(dernier).trim()
  if (fin) morceaux.push(fin)
  if (!morceaux.length && reste) morceaux.push(reste)
  if (queue) morceaux.push(queue)

  const blocs = []
  let rang = RANG_PAS
  // Le LEMME (fragment du corps annoté) ouvre la note quand on le connaît — jamais fabriqué.
  if (lemme && nettoyer(lemme)) {
    blocs.push({ rank: rang, kind: 'lemma', form: 'prose', language: langueBloc(lemme), text: nettoyer(lemme), rendering: 'word_paragraph', needs_review: false })
    rang += RANG_PAS
  }
  let citationAncienne = false
  for (const morceau of morceaux) {
    const ty = typerBloc(morceau, { estCitation: citationAncienne })
    if (!ty) continue
    if (ty.kind === 'quotation' && ty.language !== 'fr') citationAncienne = true
    else if (ty.kind === 'translation') citationAncienne = false
    const estVers = verse && (ty.kind === 'quotation' || ty.kind === 'lemma')
    blocs.push({
      rank: rang, kind: ty.kind, form: estVers ? 'verse' : ty.form, language: ty.language,
      text: nettoyer(morceau),
      rendering: estVers ? 'Footnote Verse' : 'word_paragraph',
      // Une note d'un seul tenant classée « commentary » est le cas le plus incertain : à relire.
      needs_review: ty.kind === 'commentary' && morceaux.length === 1 && !lemme,
      regle: ty.sur,
    })
    rang += RANG_PAS
  }
  return blocs
}

/**
 * Note complète, à la forme de `texte_notes` + `texte_note_blocs`. `numero` est l'appel « [[n]] »
 * déjà posé dans le corps ; il sert de `note_number` et de racine de `note_key` (numérotation
 * globale à l'œuvre, §13.2 — jamais celle du fac-similé).
 */
export function noteTypee({ numero, texte, lemme = null, page = null, verse = false, origine = 'la-gueule' } = {}) {
  const blocs = decomposerNote(texte, { lemme, verse })
  if (!blocs.length) return null
  const cle = 'N-' + String(numero).padStart(3, '0')
  return {
    note_key: cle,
    note_number: numero,
    printed_page: page ?? null,
    source_target: origine,
    blocs: blocs.map((b) => ({ ...b, note_key: cle, block_id: cle + '-' + b.rank })),
    // §13.4 : le lien traduction ↔ citation est une donnée, pas une mise en page.
    relations: relationsTraduction(blocs, cle),
  }
}

/**
 * Une note est-elle EN VERS ? Signature typographique, mesurée sur les lignes d'origine (§13.4
 * « lorsqu'une note contient une citation en vers, son caractère versifié est une donnée
 * éditoriale ») : au moins deux lignes, dont la plupart commencent par une CAPITALE et sont de
 * longueurs voisines — c'est le vers, par opposition à la prose qui remplit la justification.
 * Conservateur : au moindre doute, `false` (la prose est le cas ordinaire).
 */
export function noteEstEnVers(lignes = []) {
  const textes = (Array.isArray(lignes) ? lignes : [])
    .map((l) => nettoyer(typeof l === 'string' ? l : (l?.dip ?? l?.texte ?? '')))
    .filter((t) => t.length >= 2)
  if (textes.length < 2) return false
  const capitales = textes.filter((t) => /^[«"“(]?\s*[A-ZÀ-ÞŒÆ]/u.test(t)).length
  if (capitales / textes.length < 0.7) return false
  // Des longueurs voisines : un vers n'atteint pas la marge comme la prose justifiée.
  const longueurs = textes.map((t) => t.length)
  const moy = longueurs.reduce((a, b) => a + b, 0) / longueurs.length
  if (moy < 12) return false                                   // fragments trop courts : indécidable
  const ecart = Math.max(...longueurs) - Math.min(...longueurs)
  return ecart <= moy * 0.6
}

/**
 * ANCRAGE d'une note dans son segment, à la forme de `texte_note_ancres` : position EXACTE de
 * l'appel (offset en points de code Unicode, comme la table l'exige) et contexte de part et
 * d'autre. Renvoie null si l'appel n'est pas dans le segment (on n'invente aucune position).
 */
export function ancrageNote({ numero, segment_texte, segment_numero = null, segment_key = null, contexte = 12 } = {}) {
  const marker = '[[' + numero + ']]'
  const t = String(segment_texte ?? '')
  const idx = t.indexOf(marker)
  if (idx < 0) return null
  const cps = [...t]                                            // découpe par POINTS DE CODE
  const avant = [...t.slice(0, idx)]
  const offset = avant.length
  return {
    note_key: 'N-' + String(numero).padStart(3, '0'),
    source_target: 'ancrage_' + numero,
    anchor_id: 'N-' + String(numero).padStart(3, '0') + ':ancrage_' + numero,
    segment_key: segment_key ?? null,
    segment_numero: segment_numero ?? null,
    segment_offset_unicode: offset,
    marker,
    anchor_text_left: avant.slice(-contexte).join(''),
    anchor_text_right: cps.slice(offset + [...marker].length, offset + [...marker].length + contexte).join(''),
  }
}

/** `translation_of` : relie chaque traduction au bloc de citation qui la précède immédiatement. */
export function relationsTraduction(blocs = [], cle = '') {
  const rel = []
  for (let i = 1; i < blocs.length; i++) {
    if (blocs[i].kind !== 'translation') continue
    const prec = blocs[i - 1]
    if (prec.kind !== 'quotation') continue
    rel.push({
      note_key: cle, relation_kind: 'translation_of',
      source_block_id: cle + '-' + blocs[i].rank,
      target_block_id: cle + '-' + prec.rank,
    })
  }
  return rel
}
