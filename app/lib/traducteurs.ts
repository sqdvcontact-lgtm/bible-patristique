// Libellé d'affichage d'une mention de traducteur. Module pur (testé
// `traducteurs.test.ts`), ré-exporté par `app/oeuvre/[id]/PageTitre.tsx` pour les
// appelants historiques. La donnée du catalogue reste intacte : on ne met en forme
// qu'à l'affichage.

import { deNom } from './elision'

const TITRES_RE = /^(M\.|Mme\.?|Mlle\.?|Dr\.?|Pr\.?|Dom |Père |Frère |Sœur |Abbé |Saint |Sainte |Rev\.? ?|Mgr\.?|R\.\s*P\.|l['’]abbé|le père)/i

// Titres à passer en minuscule à l'affichage (ils suivent « Traduction … », donc pas
// en début de phrase). On ne touche PAS à « Saint(e) », partie du nom propre.
// ⚠️ Fin de mot par lookahead, jamais `\b` : en JavaScript, `\b` ne connaît que
// l'ASCII, si bien que « Abbé\b » ne s'appariait jamais (la frontière tombe entre
// « é » et l'espace, deux caractères non-mots). Les titres accentués — abbé, père,
// frère, sœur, mère — restaient donc en capitale. Le lookahead borne quand même le
// mot, pour que « Domitien » ne devienne pas « domitien ».
const TITRE_MINUSCULE_RE = /^(Abbé|Dom|Père|Frère|Sœur|Chanoine|Cardinal|Monseigneur|Mgr|Mère)(?=[\s.]|$)/

// Mention de travail gardée en base quand le traducteur n'est pas identifié.
const EST_NON_ETABLI = /^non établi/i

// ── Réserves d'attribution ───────────────────────────────────────────────────
// ⛔ Une mention qui OUVRE sur une réserve ne nomme personne à la place d'un nom :
// « Attribution non fixée : Antoine Arnauld ou Jean Segui ; Philippe Goibaud-Dubois
// également signalé » n'est pas un traducteur, c'est un dossier. Composée par le
// moteur bibliographique, elle donnait « trad. Attribution non fixée : … » au milieu
// d'une notice (relevé de l'auteur, 2026-09-06). Le champ reste INTACT en base et se
// lit tel quel là où le catalogue se montre en tant que tel ; c'est l'APPAREIL
// bibliographique qui se tait.
// ⚠️ « Anonyme » n'en est PAS une : c'est un fait éditorial, et « trad. anonyme » est
// une mention bibliographique reçue. Ne pas l'ajouter ici.
// ⚠️ Et la réserve se juge sur la TÊTE de la mention : « Nicolas Fontaine — attribution
// retenue par la BnF » nomme quelqu'un, et se compose.
const RESERVE_ATTRIBUTION_RE = /^(attributions?\s+(non\s+fix|discut|incertain|contest|à\s+(contrôler|établir))|traduct(eur|rice|ion)\s+non\s+(établie?|identifiée?)|non\s+(établi|identifié))/i

// Note d'atelier accolée à un nom : « Nicolas Fontaine [attribution générale du recueil ;
// attribution analytique à contrôler] ». Le crochet FINAL est un carnet de travail, non
// une partie de la mention. ⚠️ Un crochet en TÊTE ne se retire pas : il porterait alors
// tout ce que la mention a à dire.
const NOTE_ATELIER_RE = /\s*\[[^\]]*\]\s*$/

/** La mention est-elle une RÉSERVE d'attribution plutôt qu'un nom ? */
export function estReserveDAttribution(trad: string | null | undefined): boolean {
  return RESERVE_ATTRIBUTION_RE.test((trad ?? '').trim())
}

/** La mention du catalogue telle qu'une NOTICE peut la porter : sans sa note d'atelier
 *  finale, et `null` sur une réserve d'attribution comme sur le vide. Dans les deux cas
 *  il n'y a pas de traducteur à nommer, et une notice sans mention vaut mieux qu'une
 *  mention qui n'en est pas une. */
export function mentionCatalogueLisible(trad: string | null | undefined): string | null {
  const brut = (trad ?? '').trim()
  if (!brut || estReserveDAttribution(brut)) return null
  // ⚠️ Le crochet ne se retire QUE s'il reste un nom devant lui : une mention qui
  //    n'est qu'un crochet y porte tout ce qu'elle a à dire.
  const sansNote = brut.replace(NOTE_ATELIER_RE, '').trim()
  return sansNote || brut
}

// ── Mentions de responsabilité collective ─────────────────────────────────────
// Le champ ne porte alors pas un nom de personne mais une formule entière. La
// préfixer de « Traduction par » donnait « Traduction par Sous la direction de
// M. Jeannin ». La formule commande le libellé : « Traduction sous la direction… ».
const DIRECTION_RE = /\bsous la direction\b/i
// Formule qui se suffit déjà à elle-même : on l'affiche telle quelle, sans préfixe
// (« Traduction collective sous la direction de… », « Édition française sous… »).
const FORMULE_COMPLETE_RE = /^(traductions?|éditions?|editions?)\b/i
// Tête qui ne nomme personne et que « Traduction sous la direction… » rend déjà.
const TETE_COLLECTIVE_RE = /^(équipes?|equipes?|collectifs?|traducteurs?)\s+(?=sous\b)/i
// Qualificatifs qui ne sont pas des noms de personnes. Écartés seulement s'il reste
// un vrai nom à côté : seuls, ils valent mieux que rien.
const NON_NOM_RE = /^(traducteurs?\s+multiples?|traducteurs?\s+divers|collaborateurs?)\.?$/i

// ── Queues de liste ──────────────────────────────────────────────────────────
// « et al. », « et collaborateurs » ferment une liste sans nommer personne. Jointes
// par « et » comme un nom, elles donnaient « …, Jean-Baptiste de Salvert et et al. »
// dans les notices du catalogue. Deux formes : la queue SEULE (une entrée à elle,
// « A ; B ; et al. ») et la queue COLLÉE au dernier nom (« A ; B et collaborateurs »),
// qui appelle une virgule plutôt qu'un « et » de plus.
const QUEUE_SEULE_RE = /^et\s+(al\.?|alii|autres|collaborateurs?|collab\.?)$/i
const QUEUE_COLLEE_RE = /\set\s+(al\.|alii|autres|collaborateurs?|collab\.?)$/i

/** Met les noms en énumération française, queue comprise. */
function composerNoms(noms: string[]): string {
  const dernier = noms[noms.length - 1] ?? ''
  if (noms.length > 1 && QUEUE_SEULE_RE.test(dernier)) {
    return `${noms.slice(0, -1).join(', ')} ${dernier}`
  }
  if (noms.length > 1 && QUEUE_COLLEE_RE.test(dernier)) {
    return `${noms.slice(0, -1).join(', ')}, ${dernier}`
  }
  return enumererNoms(noms)
}

/** « A ; B » → « A et B » ; « A ; B ; C » → « A, B et C ».
 *  Le point-virgule est la façon dont le catalogue sépare les noms ; il n'a
 *  rien à faire dans une phrase affichée. */
export function enumererNoms(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? ''
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

/** Nettoyage d'AFFICHAGE d'un nom de traducteur (les données restent intactes) :
 *  masque « — prénom non établi » (gardé en base pour les passes de recherche),
 *  retire un « signalé(e) » superflu en fin, met le titre en minuscule. */
function nettoyerNomTrad(nom: string): string {
  return nom
    .replace(/\s*[—–-]\s*prénom non établi/gi, '')
    .replace(/\s+signalée?\.?\s*$/i, '')
    .replace(TITRE_MINUSCULE_RE, m => m.toLowerCase())
    .trim()
}

function minusculeInitiale(texte: string): string {
  return texte ? `${texte.charAt(0).toLocaleLowerCase('fr-FR')}${texte.slice(1)}` : texte
}

/** Rend une mention qui porte déjà « sous la direction ». */
function libelleDirection(mention: string): string {
  if (FORMULE_COMPLETE_RE.test(mention)) return mention
  return `Traduction ${minusculeInitiale(mention.replace(TETE_COLLECTIVE_RE, ''))}`
}

// ── Traduction produite par la machine ───────────────────────────────────────
// Le catalogue porte « Traduction IA — Corpus Scriptura » : une mention de RÉGIME
// suivie de la maison qui en répond, non un nom de personne. Prise pour un nom, elle
// donnait « Traduction par Traduction IA — Corpus Scriptura » en page de titre
// (relevé de l'auteur, 2026-09-08) : le mot « traduction » deux fois, et un instrument
// présenté comme un traducteur. Une page de titre nomme l'instrument en toutes lettres
// et la direction éditoriale comme telle.
// ⚠️ La donnée reste INTACTE en base : c'est l'affichage qui rédige.
const IA_RE = /^(?:traductions?\s+)?(?:(?:réalisée?|produite?|faite?)\s+)?(?:par\s+)?(?:i\.?\s?a\.?|intelligence\s+artificielle)(?:\s*[—–-]\s*(.+))?$/i

/** La direction éditoriale d'une traduction faite par la machine : le nom qui suit le
 *  tiret, la chaîne vide quand la mention n'en porte pas — et `null` quand la mention
 *  n'est pas de ce régime, seul cas où il y a un traducteur à nommer. */
function directionIA(trad: string | null | undefined): string | null {
  const trouve = IA_RE.exec((trad ?? '').trim())
  return trouve ? (trouve[1]?.trim() ?? '') : null
}

/** « Traduction par intelligence artificielle sous la direction de Corpus Scriptura » :
 *  l'instrument en toutes lettres, la direction éditoriale nommée comme telle. */
function libelleIA(direction: string): string {
  const socle = 'Traduction par intelligence artificielle'
  return direction ? `${socle} sous la direction ${deNom(direction)}` : socle
}

/** La mention nomme-t-elle la MACHINE plutôt qu'une personne ? Un appelant qui
 *  découpe un patronyme (une tête de colonne, un label court) doit le savoir :
 *  « Traduction IA — Corpus Scriptura » n'a pas de nom de famille à prendre. */
export function estTraductionMachine(trad: string | null | undefined): boolean {
  return directionIA(trad) !== null
}

/** Découpe brute : le catalogue sépare les noms par un point-virgule, et lui seul. */
function decouper(trad: string | null | undefined): string[] {
  return (trad ?? '').split(';').map(s => s.trim()).filter(Boolean)
}

/** Les noms d'une mention « A ; B ; C », nettoyés pour l'affichage. Les qualificatifs
 *  qui ne nomment personne sont écartés, sauf s'ils sont tout ce qu'on a. C'est la
 *  seule lecture du champ : tout le reste met en forme cette liste. */
export function nomsTraducteurs(trad: string | null | undefined): string[] {
  // « Non établi » n'est pas un nom : traducteur inconnu.
  const nomsBruts = decouper(trad).map(nettoyerNomTrad).filter(n => n && !EST_NON_ETABLI.test(n))
  const nomsUtiles = nomsBruts.filter(n => !NON_NOM_RE.test(n))
  return nomsUtiles.length ? nomsUtiles : nomsBruts
}

/** Fragment prêt à entrer dans une ligne bibliographique déjà faite (« Augustin,
 *  *Confessions*, trad. A et B, Paris, 1861 »), où « Traduction par… » ferait une
 *  phrase dans la phrase. Une mention de responsabilité collective se suffit à
 *  elle-même : elle entre sans « trad. ». */
/** L'énumération seule, sans phrase autour : pour les écrans d'administration, qui
 *  montrent la donnée plus qu'ils ne la rédigent. */
export function enumererTraducteurs(trad: string | null | undefined): string {
  return composerNoms(nomsTraducteurs(trad))
}

export function mentionTraducteurs(trad: string | null | undefined): string {
  // Comme une formule de direction, elle se suffit à elle-même : pas de « trad. ».
  const directionMachine = directionIA(trad)
  if (directionMachine !== null) return minusculeInitiale(libelleIA(directionMachine))

  const noms = nomsTraducteurs(trad)
  if (noms.length === 0) return ''
  const direction = noms.find(n => DIRECTION_RE.test(n))
  if (direction) {
    const autres = noms.filter(n => n !== direction)
    const formule = minusculeInitiale(direction.replace(TETE_COLLECTIVE_RE, ''))
    return autres.length ? `${formule} et ${composerNoms(autres)}` : formule
  }
  return `trad. ${composerNoms(noms)}`
}

export function libelleTrad(trad: string | null | undefined): string {
  // Une mention de régime commande tout le libellé : il n'y a pas de nom à composer.
  const directionMachine = directionIA(trad)
  if (directionMachine !== null) return libelleIA(directionMachine)

  const noms = nomsTraducteurs(trad)
  if (noms.length === 0) {
    return decouper(trad).some(b => EST_NON_ETABLI.test(b)) ? 'Traducteur non identifié' : ''
  }

  // Une mention de direction commande tout le libellé : elle porte sa propre formule.
  const direction = noms.find(n => DIRECTION_RE.test(n))
  if (direction) {
    const autres = noms.filter(n => n !== direction)
    const formule = libelleDirection(direction)
    return autres.length ? `${formule} et ${composerNoms(autres)}` : formule
  }

  if (noms.length > 1) {
    // Uniformité : préfixe « : » dès qu'un titre (abbé, dom…) est en tête.
    const prefixe = TITRES_RE.test(noms[0]) ? 'Traduction : ' : 'Traduction par '
    return `${prefixe}${composerNoms(noms)}`
  }
  const t = noms[0]
  if (t.toLowerCase() === 'anonyme') return 'Traduction anonyme'
  if (TITRES_RE.test(t)) return `Traduction : ${t}`
  if (t.includes(' ')) return `Traduction par ${t}`
  return `Traduction de ${t}`
}
