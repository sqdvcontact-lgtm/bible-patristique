// Libellé d'affichage d'une mention de traducteur. Module pur (testé
// `traducteurs.test.ts`), ré-exporté par `app/oeuvre/[id]/PageTitre.tsx` pour les
// appelants historiques. La donnée du catalogue reste intacte : on ne met en forme
// qu'à l'affichage.

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
export function mentionTraducteurs(trad: string | null | undefined): string {
  const noms = nomsTraducteurs(trad)
  if (noms.length === 0) return ''
  const direction = noms.find(n => DIRECTION_RE.test(n))
  if (direction) {
    const autres = noms.filter(n => n !== direction)
    const formule = minusculeInitiale(direction.replace(TETE_COLLECTIVE_RE, ''))
    return autres.length ? `${formule} et ${enumererNoms(autres)}` : formule
  }
  return `trad. ${enumererNoms(noms)}`
}

export function libelleTrad(trad: string | null | undefined): string {
  const noms = nomsTraducteurs(trad)
  if (noms.length === 0) {
    return decouper(trad).some(b => EST_NON_ETABLI.test(b)) ? 'Traducteur non identifié' : ''
  }

  // Une mention de direction commande tout le libellé : elle porte sa propre formule.
  const direction = noms.find(n => DIRECTION_RE.test(n))
  if (direction) {
    const autres = noms.filter(n => n !== direction)
    const formule = libelleDirection(direction)
    return autres.length ? `${formule} et ${enumererNoms(autres)}` : formule
  }

  if (noms.length > 1) {
    // Uniformité : préfixe « : » dès qu'un titre (abbé, dom…) est en tête.
    const prefixe = TITRES_RE.test(noms[0]) ? 'Traduction : ' : 'Traduction par '
    return `${prefixe}${enumererNoms(noms)}`
  }
  const t = noms[0]
  if (t.toLowerCase() === 'anonyme') return 'Traduction anonyme'
  if (TITRES_RE.test(t)) return `Traduction : ${t}`
  if (t.includes(' ')) return `Traduction par ${t}`
  return `Traduction de ${t}`
}
