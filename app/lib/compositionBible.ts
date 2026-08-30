/**
 * La composition de la RANGÉE DE VERSET — une seule écriture, deux emplois.
 *
 * Ces styles vivaient en clair dans le JSX de `TexteBible`. Ils en sont sortis le
 * 2026-08-28 pour la même raison que ceux de la lecture d'une œuvre : la PLANCHE
 * DES STYLES (`/admin/styles`) doit montrer ce que la page FAIT. Un spécimen qui
 * rejoue une composition de mémoire dérive au premier réglage, et fait ensuite
 * autorité contre la page qu'il prétend décrire.
 *
 * ⛔ Toute composition de la rangée de verset s'écrit ICI.
 *
 * ⚠️ La rangée vit dans une GRILLE à deux colonnes — le bloc de texte, puis la
 * gouttière d'actions de 2,375 rem. Le titre du chapitre et les versets se centrent
 * sur le BLOC, gouttière exclue : c'est l'axe unique de la page (charte, page Bible).
 */

import type { CSSProperties } from 'react'

const SERIF = 'var(--font-source-serif), Georgia, serif'

/**
 * L'AXE DE TEXTE — l'enveloppe que prend tout ce qui se centre sur la page Bible.
 *
 * ⛔ La page en portait TROIS avant le 2026-08-28 : le titre du chapitre à 503 px,
 * les versets à 495,5, les blocs éditoriaux à 514,5. Tout passe désormais par cette
 * grille — le bloc de lecture, puis la gouttière d'actions —, et le centrage se fait
 * sur le BLOC, gouttière exclue.
 */
export function styleAxeTexte(): CSSProperties {
  return {
    width: 'min(var(--mesure-ligne), 100%)',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, var(--mesure-bloc)) 2.375rem',
  }
}

/** La rangée entière : ce qui prend le survol, la sélection et le clic. */
export function styleRangeeVerset({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    // ⚠️ Le blanc entre versets se paie deux fois : le rembourrage de la rangée le pose
    // en haut ET en bas, la marge s'y ajoute. Ce qui identifie un verset n'est pas ce
    // blanc mais son RETRAIT (décision de l'auteur, 2026-08-29) : on rend au retrait ce
    // qu'on retire au blanc, et la colonne se lit d'un trait au lieu de s'égrener.
    padding: mobile ? '0.03125rem 0.375rem' : '0.125rem 0.375rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: mobile ? '0.05rem' : '0.125rem',
    background: 'transparent',
  }
}

/** La grille de la rangée : le bloc de lecture, puis la gouttière d'actions.
 *  ⛔ Sur mobile la gouttière disparaît — les actions y surgissent au tap. */
export function styleGrilleRangee({ mobile }: { mobile?: boolean } = {}): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, var(--mesure-bloc)) 2.375rem',
    width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)',
    alignItems: 'flex-start',
  }
}

/** Le bloc numéro + texte, celui que la sélection teinte d'un seul tenant. */
export function styleBlocVerset({ actif }: { actif?: boolean } = {}): CSSProperties {
  return {
    display: 'grid',
    // ⚠️ La gouttière du numéro s'élargit de 8 px et la piste de texte se resserre
    // d'autant : le bloc garde EXACTEMENT sa largeur, mais le verset rentre davantage
    // et sa ligne porte moins de mots. C'est le retrait, non le blanc, qui le désigne.
    gridTemplateColumns: 'auto minmax(0, calc(var(--mesure-texte) - 0.5rem))',
    columnGap: '0.1875rem',
    alignItems: 'baseline',
    borderRadius: '4px',
    padding: '0.0625rem 0.25rem 0.0625rem 0',
    background: actif ? 'rgba(var(--cs-vert-rgb),0.11)' : 'transparent',
  }
}

/**
 * Le NUMÉRO, dans sa gouttière.
 *
 * ⛔ Jamais en exposant : posé dans une colonne au fer à droite, il laisse la
 * colonne du texte rigoureusement stable d'un verset à l'autre. C'est cette face —
 * 0,625 rem, graisse 600, teinte faible — que reprend le numéro de verset d'une
 * citation patristique, en exposant faute de gouttière (voir `compositionVersets.ts`).
 */
export const STYLE_NUMERO_VERSET: CSSProperties = {
  minWidth: '1.4375rem',
  textAlign: 'right',
  paddingRight: '0.4375rem',
  fontSize: '0.625rem',
  fontWeight: 600,
  color: 'var(--cs-texte-faible)',
  lineHeight: 1.40,
  whiteSpace: 'nowrap',
}

/** La numérotation d'une AUTRE édition, entre parenthèses : elle ne pèse pas. */
export const STYLE_NUMERO_ALTERNATIF: CSSProperties = {
  fontWeight: 400,
  fontStyle: 'italic',
  color: 'var(--cs-texte-faible)',
}

/** Le texte du verset. Justifié sur écran large, au fer sur mobile. */
/**
 * Le texte d'un verset de la page Bible.
 *
 * ⚠️ `enVers` compose le verset comme de la POÉSIE : ni justification ni césure — on
 * ne coupe pas un stique —, et une boîte par ligne, portant l'alinéa de
 * `styleLigneDeVers`, celui-là même que composent le corps d'une œuvre, son apparat
 * et l'apparat d'une bible. Un style, quatre surfaces (charte § 7.4).
 *
 * ⛔ **Rien ne l'emploie encore, et ce n'est pas un oubli.** Le Psautier est de la
 * poésie, mais la donnée n'en porte pas la coupe : relevé le 29 août 2026, sur les
 * 2 693 versets du Psautier, AUCUNE des quatre traductions ne contient un seul saut
 * de ligne. Sans stiques, il n'y a rien à composer. Le style est prêt pour le jour où
 * la donnée les portera ; il ne se devine pas d'ici là.
 */
export function styleTexteVerset({ mobile, enVers }: { mobile?: boolean; enVers?: boolean } = {}): CSSProperties {
  if (enVers) {
    return {
      fontFamily: SERIF,
      fontSize: '0.875rem',
      color: 'var(--cs-texte-fort)',
      margin: 0,
      // ⛔ Ni justification ni césure : c'est ce qui fait un vers, partout.
      textAlign: 'left',
      hyphens: 'none',
      WebkitHyphens: 'none',
      overflowWrap: 'break-word',
    } as CSSProperties
  }
  return {
    fontFamily: SERIF,
    fontSize: '0.875rem',
    lineHeight: 1.42,
    color: 'var(--cs-texte-fort)',
    margin: 0,
    textAlign: mobile ? 'left' : 'justify',
    textJustify: 'inter-word',
    // Une chasse à peine resserrée referme les blancs que la justification ouvre entre
    // les mots. Même valeur que la colonne en langue originale d'une œuvre.
    wordSpacing: '-0.02em',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    overflowWrap: 'break-word',
  } as CSSProperties
}

/** Un verset absent du témoin : italique de labeur, teinte effacée.
 *  ⛔ Signalé sans peser, et UNE fois — non autant de fois qu'il manque de versets. */
export const STYLE_LACUNE: CSSProperties = {
  fontFamily: SERIF,
  color: 'var(--cs-lacune)',
  fontStyle: 'italic',
}

/** La traduction ne porte rien pour ce créneau canonique. */
export const STYLE_VERSET_VIDE: CSSProperties = {
  color: 'var(--cs-bord)',
  fontStyle: 'italic',
}

/* ── Les MENTIONS des grilles de comparaison ───────────────────────────────────────
 * La Polyglotte et la Polyglotte de la page Recherche ne rendent pas que du texte :
 * elles rendent aussi, dans la cellule même, ce qui tient la place du texte absent.
 * Ces mentions vivaient en ligne, chacune pour soi, et le registre avait dérivé —
 * relevé le 2026-08-30 : QUATRE corps pour une seule voix (9,5 · 10,5 · 11,5 · 12,5 px),
 * DEUX polices dans la même colonne (l'invite des notes en sérif, le message de
 * connexion en sans, hérité du `body`), TROIS teintes pour le même fait, et un libellé
 * différent d'une grille à l'autre.
 *
 * ⛔ Elles sont ici, et non en ligne dans les pages, pour la raison que la charte donne
 * déjà : « un spécimen qui rejoue une composition de mémoire dérive au premier réglage,
 * et fait ensuite autorité contre la page qu'il décrit ». La planche des styles publiait
 * `bible/verset vide` — un tiret cadratin — pendant que la Polyglotte rendait une phrase.
 *
 * ⚠️ Ne pas confondre avec STYLE_LACUNE et STYLE_VERSET_VIDE, juste au-dessus : ceux-là
 * se posent DANS LE FIL d'un texte suivi et héritent du corps du verset. Ceux-ci
 * REMPLISSENT une cellule de tableau et portent donc leur propre corps.
 */

/** Le corps de la mention : un cran fin, deux rangs sous le texte comparé (14 px). */

/**
 * LE CORPS D’UN PARATEXTE — la composition d’un verset de la page Bible, mais
 * un cran en dessous. Une introduction de Fillion se lit AUTOUR du texte biblique,
 * non à sa place : elle se compose donc plus petit, plus serré et d’une encre plus
 * claire. C’est cette différence de composition qui la situe, et non un filet dans
 * la marge. ⛔ Aucun filet à gauche ni sous un bloc.
 *
 * ⛔ Le nombre lui-même vit dans la feuille de styles (--cs-corps-apparat) : le
 * rang de titre T4 s’aligne dessus depuis le 30 août 2026, et deux valeurs
 * recopiées ne restent identiques que par accident.
 *
 * ⚠️ Sorti de BibleEditionParatext le 30 août 2026, pour la raison donnée en tête
 * de ce module : une planche qui rejoue une composition de mémoire dérive au
 * premier réglage. La planche des illustrations s’en sert pour montrer les trois
 * régimes proposés aux gravures de Fillion.
 */
export const STYLE_CORPS: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'var(--cs-corps-apparat)',
  lineHeight: 1.3,
  color: 'var(--cs-texte-second)',
  textAlign: 'justify',
  hyphens: 'auto',
  overflowWrap: 'break-word',
}

export const CORPS_MENTION = '0.6875rem'
/** L'invite est d'un rang encore plus fin : elle propose, elle ne constate pas. */
export const CORPS_INVITE = '0.625rem'

/** La voix commune : sérif italique, très légèrement espacée. Une mention n'est jamais
 *  du texte de corpus, et l'italique le dit avant qu'on ait lu. */
const VOIX_MENTION: CSSProperties = {
  fontFamily: SERIF,
  fontStyle: 'italic',
  letterSpacing: '0.02em',
  lineHeight: 1.35,
}

/** Une mention qui TIENT LA PLACE d'un texte : centrée dans sa cellule, en hauteur comme
 *  en largeur. ⚠️ `textAlignLast` est indispensable — la cellule de comparaison est en
 *  `text-align: justify`, et sans lui la dernière ligne d'une mention qui se replie
 *  reste au fer à gauche. */
export const STYLE_MENTION: CSSProperties = {
  ...VOIX_MENTION,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: '1.6em',
  padding: '3px 6px',
  textAlign: 'center',
  textAlignLast: 'center',
  fontSize: CORPS_MENTION,
  color: 'var(--cs-mention)',
}

/** La lacune garde SON ocre, et elle seule : la mention ordinaire dit qu'une traduction
 *  ne porte pas le passage, la lacune dit qu'un manuscrit l'a perdu. Même forme, deux
 *  teintes — la teinte seule fait la différence, comme pour les marqueurs du témoin. */
export const STYLE_MENTION_LACUNE: CSSProperties = { ...STYLE_MENTION, color: 'var(--cs-lacune)' }

/** Une INVITE : ce qu'on peut faire ici, non ce qui manque. Typographie seule — la boîte
 *  appartient à l'appelant, qui est tantôt un bouton, tantôt une case de tableau. */
export const STYLE_INVITE: CSSProperties = {
  ...VOIX_MENTION,
  textAlign: 'center',
  fontSize: CORPS_INVITE,
  color: 'var(--cs-mention)',
}

/* Les libellés, pour que le même fait se dise du même mot sur les deux grilles. La
 * Polyglotte disait « Cette traduction ne contient pas ce verset » et la Recherche
 * « Absent dans cette traduction ». La phrase longue tenait sur trois lignes dans une
 * colonne de comparaison ; le sujet, lui, est donné par la grille — la ligne EST un
 * verset, la colonne EST une traduction. La mention brève suffit donc, et la phrase
 * entière passe à l'infobulle, pour qui la cherche. */
export const MENTION_ABSENT = 'Absent de cette traduction'
export const MENTION_ABSENT_TITRE = 'Cette traduction ne porte pas ce verset.'
export const MENTION_DEUTERO = 'Absent des Bibles hébraïque et protestante'
export const MENTION_LACUNE = 'Lacune du manuscrit'
export const MENTION_LACUNE_TITRE = 'Lacune matérielle du manuscrit'

/**
 * La composition d'un SOUS-TITRE, selon le rang du titre auquel il appartient.
 *
 * Un sous-titre est le CHAPEAU de son titre, tombé dans un bloc voisin par l'ordre
 * matériel de la page imprimée. Il se compose donc comme lui : centré sous un titre
 * centré, au fer sous un titre au fer, dans son encre et un cran sous son corps.
 *
 * ⛔ **Tout est en style EN LIGNE, et ce n'est pas un choix de confort.** Le paragraphe
 * d'apparat pose déjà son corps et son encre en ligne (`STYLE_CORPS`) : une règle de
 * feuille serait morte, et le sous-titre garderait la composition du texte courant.
 * Essayé le 29 août 2026, et repris aussitôt.
 *
 * ⚠️ **Le rang vient du TITRE, jamais du sous-titre.** Ni son rôle ni son propre rang
 * ne le disent : au 29 août 2026, un `section_subtitle` de rang I3 visait indifféremment
 * un titre T3, T4 ou T5. Et les deux échelles divergent dès le quatrième rang, I4 étant
 * le CHAPITRE quand T4 est la SOUS-SECTION. Voir `rangDesSousTitres`.
 *
 * ⚠️ Sans rang connu, on garde la composition des rangs hauts : c'est celle que les
 * 201 sous-titres du corpus recevaient tous, et l'on ne dégrade pas ce qu'on ne sait pas.
 */
export function compositionSousTitre(rangDuTitre?: string | null): CSSProperties {
  // ⚠️ Ni T5 ni T4 ne sont au fer : le paragraphe et la sous-section de Fillion
  // n'ont pour intitulé qu'une désignation — « § I », « II » —, qui pendait au bord
  // gauche pendant que son objet, seul porteur du sens, se lisait plus bas comme une
  // légende. T5 s'est centré le 29 août 2026, T4 le 30 (voir `.cs-bible-title--t4`
  // et `--t5`), et leurs sous-titres les suivent : c'est toute la règle de cette
  // fonction. ⛔ SEUL T6 reste au fer, comme son titre.
  const auFer = rangDuTitre === 'T6'
  // ⛔ Le corps du sous-titre suit celui de SON CHAPEAU, jamais une valeur à part :
  // les deux formes d'une même paire — l'objet accolé au titre, et l'objet tombé dans
  // le bloc voisin — doivent se ressembler. Les chiffres sont ceux de `globals.css`,
  // `.cs-bible-title--tN > .cs-bible-chapeau`.
  const corps = auFer ? '0.875rem' : rangDuTitre === 'T4' ? '1rem' : '0.9375rem'
  // ⛔ L'encre est celle de SON titre. Une encre plus claire ferait du sous-titre
  // un commentaire du titre, quand il en est la suite. Les rangs de l'apparat —
  // sous-section, paragraphe, péricope — ont quitté le vert des titres le
  // 30 août 2026 pour le gris d'apparat ; T3 et au-dessus le gardent.
  const encre = rangDuTitre === 'T4' || rangDuTitre === 'T5' || rangDuTitre === 'T6'
    ? 'var(--cs-encre-apparat)'
    : rangDuTitre === 'T3'
      ? 'var(--cs-encre)'
      : 'var(--cs-encre-fonce)'
  return {
    fontSize: corps,
    color: encre,
    textAlign: auFer ? 'left' : 'center',
    lineHeight: 1.35,
    fontStyle: 'italic',
    hyphens: 'manual',
    margin: 0,
  }
}
