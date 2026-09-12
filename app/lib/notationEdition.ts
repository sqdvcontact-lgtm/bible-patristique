/**
 * LA NOTATION D'UNE NOTICE D'ÉDITION — trois niveaux, deux marques.
 *
 * Doctrine : charte `parametres.charte_ia`, **§ 5.6.1**. Demande de l'auteur du
 * 12 septembre 2026 : « mettre à disposition de GPT des styles, pour mettre en forme
 * clairement les informations, distinguer les niveaux d'informations ».
 *
 * Ce que `oeuvre_textes.informations_complementaires` porte n'est pas de la prose suivie :
 * c'est une notice de transmission — un chapeau, une liste de témoins, une liste
 * d'abréviations, des remarques de l'éditeur. Rendue d'un seul tenant, elle se lisait
 * comme un paragraphe, et le lecteur qui cherche ce que « P » désigne devait le trouver
 * au milieu d'une phrase.
 *
 * ⛔ TROIS NIVEAUX, ET PAS UN DE PLUS (charte § 7.6) :
 *
 *   Transmission et sigles de l'édition Bondurand (1887).   ← PROSE, le cas ordinaire
 *   ## Témoins                                              ← RUBRIQUE
 *   - P — Paris, BnF, latin 12293 : copie du XVIIe siècle.  ← ENTRÉE
 *
 * ⛔ UNE SEULE ENTRÉE POUR TROIS CHOSES. Un témoin, une abréviation et une remarque sont
 * le même objet — une tête, un tiret, un corps — et se composent donc de même (§ 13.11 :
 * deux natures d'une même famille se composent de même, sauf raison NOMMÉE). C'est la
 * RUBRIQUE qui dit le niveau, jamais un troisième style : trois styles pour une seule
 * forme rouvriraient la dérive que le § 7.6 ferme.
 *
 * ⛔ LA RUBRIQUE SE NOMME LIBREMENT. « Témoins », « Abréviations », « Remarques »,
 * « Conventions de transcription » : c'est un TITRE que l'éditeur écrit, non un style, et
 * il ne commande aucun comportement. Clore la liste interdirait une rubrique légitime
 * qu'on n'a pas prévue, pour ne rien garantir.
 *
 * ⛔ ET RIEN NE SE DEVINE. Une ligne sans marque est de la prose — c'est ce qui rend la
 * notation rétro-compatible : ce qui est déjà écrit continue de se rendre comme avant. Une
 * entrée dont le tiret manque reste une entrée, sans tête en relief : on ne coupe pas au
 * jugé une ligne qui n'a pas déclaré où elle se coupe.
 *
 * Module PUR : ni requête, ni React. La COMPOSITION y vit aussi, comme dans
 * `compositionNote.ts` — deux écritures d'une même forme divergent au premier réglage.
 */
import type { CSSProperties } from 'react'
import { RUBRIQUE_AXE } from './stylesVoletLecture'

/** La marque d'une RUBRIQUE, en tête de ligne. */
export const MARQUE_RUBRIQUE = '## '
/** La marque d'une ENTRÉE, en tête de ligne. */
export const MARQUE_ENTREE = '- '

/**
 * Les deux graphies du tiret qui sépare la tête du corps.
 *
 * ⛔ Le tiret est OBLIGATOIRE : sans lui, il faudrait deviner où finit le sigle, et un
 * comptage de signes n'est pas un critère. ⚠️ Deux graphies pour un seul séparateur,
 * cadratin et demi-cadratin : les notices attestées emploient l'un ou l'autre, et les
 * accepter tous deux ne fait rien deviner — c'est la même marque écrite de deux façons.
 * ⛔ Jamais le trait d'union, qui ouvre déjà la ligne.
 */
export const SEPARATEURS_TETE = [' — ', ' – '] as const

/** Le tiret que le RENDU repose entre la tête et le corps, insécable devant : une tête
 *  seule en fin de ligne, ou un tiret seul en tête de la suivante, se verraient. */
export const SEPARATEUR_RENDU = String.fromCharCode(0x00A0) + '— '

export type EntreeNotation = {
  /** Le sigle, l'abréviation ou le lieu de la remarque. `null` quand la ligne ne déclare
   *  aucune tête : elle se compose alors entière, sans relief. */
  tete: string | null
  corps: string
}

export type BlocNotation =
  | { type: 'prose'; texte: string }
  | { type: 'rubrique'; texte: string }
  | { type: 'liste'; entrees: EntreeNotation[] }

/**
 * Coupe une entrée à son PREMIER tiret, quelle qu'en soit la graphie.
 *
 * ⚠️ Le premier, non celui d'une graphie préférée : un corps qui porte un second tiret
 * — « P — Paris, BnF — copie du XVIIe siècle » — garde le sien, et la tête reste « P ».
 */
function decouperEntree(ligne: string): EntreeNotation {
  let place = -1
  let separateur = ''
  for (const sep of SEPARATEURS_TETE) {
    const i = ligne.indexOf(sep)
    if (i > 0 && (place < 0 || i < place)) { place = i; separateur = sep }
  }
  if (place < 0) return { tete: null, corps: ligne }
  const tete = ligne.slice(0, place).trim()
  const corps = ligne.slice(place + separateur.length).trim()
  // Une tête vide ou un corps vide ne font pas une entrée : mieux vaut la ligne entière
  // qu'une moitié en relief et l'autre absente.
  return tete && corps ? { tete, corps } : { tete: null, corps: ligne }
}

/**
 * Ce qui suit la marque en tête d'une ligne, ou `null` quand la ligne ne la porte pas.
 *
 * ⚠️ Une marque POSÉE SEULE — « ## » sans titre, « - » sans texte — rend la chaîne vide,
 * et l'appelant l'écarte : sans ce cas, la garde qui refuse un bloc vide ne pourrait
 * jamais s'exercer, la ligne ayant déjà été rognée de son espace. ⛔ Une marque COLLÉE
 * à son texte (« ##Témoins ») n'en est pas une : rien ne se devine.
 */
function apresLaMarque(nette: string, marque: string): string | null {
  if (nette === marque.trimEnd()) return ''
  if (!nette.startsWith(marque)) return null
  return nette.slice(marque.length).trim()
}

/**
 * Lit une notice et rend ses blocs, dans l'ordre.
 *
 * ⛔ UNE LIGNE VIDE FERME UNE LISTE, JAMAIS LA PROSE. Deux listes que rien ne sépare
 * seraient une seule, et la ligne vide ne ferait rien ; la PROSE, elle, garde ses lignes
 * vides comme tous ses autres sauts (le rendu est en `pre-line`). C'est ce qui rend la
 * rétro-compatibilité EXACTE : une notice sans marque se rend au pixel près comme avant la
 * notation, et non « à peu près ». ⚠️ Les blancs de TÊTE et de QUEUE d'un bloc de prose
 * tombent quand même : ils ne séparent rien.
 */
export function lireNotationEdition(brut: string | null | undefined): BlocNotation[] {
  const lignes = String(brut ?? '').replace(/\r\n?/gu, '\n').split('\n')
  const blocs: BlocNotation[] = []
  let prose: string[] = []
  let liste: EntreeNotation[] | null = null

  // ⚠️ UN SEUL BLOC EST OUVERT À LA FOIS : une entrée ferme la prose, une ligne de prose
  // ferme la liste, une rubrique ferme les deux. ⛔ Une LIGNE VIDE ne ferme que la LISTE —
  // sans quoi deux listes que rien ne sépare n'en feraient qu'une — et la prose la garde,
  // pour se rendre exactement comme avant la notation.
  const fermerLeBloc = () => {
    const texte = prose.join('\n').trim()
    if (texte) blocs.push({ type: 'prose', texte })
    prose = []
    if (liste && liste.length) blocs.push({ type: 'liste', entrees: liste })
    liste = null
  }

  for (const ligne of lignes) {
    const nette = ligne.trim()
    if (!nette) {
      if (liste) fermerLeBloc()
      else prose.push('')
      continue
    }

    const titre = apresLaMarque(nette, MARQUE_RUBRIQUE)
    if (titre !== null) {
      fermerLeBloc()
      // Une rubrique sans nom ne coiffe rien : on ne pose pas un titre vide, et on
      // n'imprime pas davantage la marque, que le lecteur n'a pas à voir.
      if (titre) blocs.push({ type: 'rubrique', texte: titre })
      continue
    }

    const ligneDEntree = apresLaMarque(nette, MARQUE_ENTREE)
    if (ligneDEntree !== null) {
      if (prose.length) fermerLeBloc()
      const entree = decouperEntree(ligneDEntree)
      if (!entree.corps) continue
      if (!liste) liste = []
      liste.push(entree)
      continue
    }

    if (liste) fermerLeBloc()
    prose.push(ligne.trimEnd())
  }
  fermerLeBloc()
  return blocs
}

/** Une notice porte-t-elle au moins une marque ? ⚠️ Sert l'administration, qui le DIT à
 *  celui qui saisit : une notice sans marque se rend en prose, ce qui reste correct. */
export function porteUneNotation(brut: string | null | undefined): boolean {
  return lireNotationEdition(brut).some(bloc => bloc.type !== 'prose')
}

// ── LA COMPOSITION ────────────────────────────────────────────────────────────
// ⛔ AUCUN DESSIN NEUF : les trois niveaux réemploient trois formes que le lecteur
// connaît déjà — la rubrique d'un volet, le retrait suspendu d'une bibliographie, la
// prose de la fiche. Un style qui inventerait sa forme se distinguerait de tout le site
// pour ne rien dire de plus.

/**
 * ⛔ LE BLANC SE CALCULE SUR LE VOISINAGE, il ne se pose pas une fois pour toutes.
 *
 * Un écart unique entre tous les blocs — la première écriture, un `gap` de 9 px — laissait
 * une rubrique FLOTTER entre les deux listes qu'elle sépare : mesuré sur la composition
 * servie, 12 px au-dessus et 11 en dessous, si bien qu'elle n'appartenait à aucune des deux.
 * ⚠️ Une rubrique nomme ce qui la SUIT : elle en est donc cousue, et c'est au-dessus
 * qu'elle prend son air.
 *
 * ⚠️ 15 px n'est pas le blanc des SECTIONS de la fiche, qui vaut 18 : une rubrique est un
 * rang au-dessous, et lui donner le même air aplatirait la hiérarchie qu'on vient de poser.
 */
export const BLANC_BLOC = '10px'
export const BLANC_GROUPE = '15px'
export const BLANC_COUTURE = '4px'

/** Le blanc au-dessus d'un bloc, d'après celui qui le précède. ⛔ `0` en tête : le
 *  conteneur ne s'ouvre pas sur un blanc que personne n'a demandé. */
export function blancAuDessus(precedent: BlocNotation | null, courant: BlocNotation): string {
  if (!precedent) return '0'
  if (courant.type === 'rubrique') return BLANC_GROUPE
  if (precedent.type === 'rubrique') return BLANC_COUTURE
  return BLANC_BLOC
}

/** ⛔ Aucun `gap` : c'est `blancAuDessus` qui sépare, et un écart de conteneur s'y
 *  ajouterait sans qu'aucune des deux écritures ne le sache. */
export const STYLE_NOTATION: CSSProperties = { display: 'flex', flexDirection: 'column' }

/**
 * La RUBRIQUE prend le rang des rubriques d'un volet (`RUBRIQUE_AXE`), un cran sous le
 * titre de section qui coiffe la fiche : les deux ne peuvent donc pas se confondre.
 *
 * ⚠️ Son ENCRE monte d'un rang, `--cs-texte-second` au lieu de `--cs-texte-faible`. Dans
 * un volet, la rubrique accompagne une liste qui la redit ; ici, elle est la SEULE à
 * nommer son groupe, et un texte qui porte seul son information tient le seuil de 4,5 —
 * 5,24 sur le papier de la fiche, contre 2,14 pour le rang qu'emploie un volet.
 *
 * ⚠️ Les marges s'écrivent en LONGHANDS et à ZÉRO : un raccourci `margin` posé après la
 * diffusion de `RUBRIQUE_AXE` écraserait son `marginBottom` sans qu'on le voie, et c'est
 * `blancAuDessus` qui pose le blanc, le rendu connaissant seul le voisinage.
 */
export const STYLE_RUBRIQUE_NOTATION: CSSProperties = {
  ...RUBRIQUE_AXE,
  color: 'var(--cs-texte-second)',
  marginTop: '0',
  marginBottom: '0',
}

/** La LISTE : ni puce ni retrait de liste — le retrait suspendu de l'entrée fait tout. */
export const STYLE_LISTE_NOTATION: CSSProperties = {
  listStyle: 'none',
  marginTop: 0,
  marginBottom: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

/**
 * L'ENTRÉE, au RETRAIT SUSPENDU des bibliographies imprimées : la première ligne part du
 * bord, les suivantes rentrent d'une largeur. C'est ce qui fait qu'on descend la colonne
 * des sigles du regard, ce qu'une liste au fer interdit.
 *
 * ⛔ Ni justification ni césure : une entrée est brève, et couper « Sessorianus » ou
 * étirer trois mots sur la mesure se verrait.
 */
export const RETRAIT_ENTREE = '1.1em'
export const STYLE_ENTREE_NOTATION: CSSProperties = {
  margin: 0,
  paddingLeft: RETRAIT_ENTREE,
  textIndent: `-${RETRAIT_ENTREE}`,
  textAlign: 'left',
  hyphens: 'none',
}

/** La TÊTE : le rang d'une manchette de commentaire — reconnue d'un coup d'œil, sans
 *  peser comme un rang de titre (charte § 35.9, la graisse ramenée de 600 à 500). */
export const STYLE_TETE_NOTATION: CSSProperties = {
  fontWeight: 500,
  color: 'var(--cs-texte-fort)',
}
