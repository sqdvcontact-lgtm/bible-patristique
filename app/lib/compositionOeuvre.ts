/**
 * La composition de la lecture d'une ŒUVRE — une seule écriture, deux emplois.
 *
 * Ces styles vivaient en clair dans le JSX d'`OeuvreClient`. Ils en sont sortis le
 * 2026-08-28, non pour ranger, mais parce que la PLANCHE DES STYLES (`/admin/styles`)
 * doit montrer ce que le site fait, et non ce qu'on croit qu'il fait : un spécimen
 * qui rejoue une composition de mémoire dérive au premier réglage, et fait ensuite
 * autorité contre la page qu'il prétend décrire.
 *
 * ⛔ Toute composition de la lecture d'une œuvre s'écrit ICI. En poser une seconde
 * dans le JSX, c'est rouvrir la dérive que ce module ferme.
 *
 * ⚠️ Les MESURES des vers — alinéa de base, alinéas poétiques, retrait de suite —
 * ne sont pas ici : elles vivent dans `compositionVers.ts`, avec la règle qui les
 * calcule. Ce module ne fait que les poser.
 */

import type { CSSProperties } from 'react'
import { NATURE_EXERGUE, RAPPORT_CORPS_EXERGUE, RETRAIT_EXERGUE } from './compositionExergue'
import { FORME_VERS, styleLigneDeVers } from './compositionVers'

const SERIF = 'var(--font-source-serif), Georgia, serif'

/** Le corps de la lecture, et l'espace entre ses mots. */
export const CORPS_LECTURE = '0.8125rem'

/** L'ordinal du segment dans l'œuvre : un repère et une ancre de prélèvement.
 *  ⛔ Il s'efface dans un bloc de versets, où le numéro de VERSET prend sa place. */
export const STYLE_NUMERO_SEGMENT: CSSProperties = {
  fontSize: '0.50rem',
  color: 'var(--cs-texte-faible)',
  userSelect: 'none',
  marginRight: '2px',
  lineHeight: 1,
}

/**
 * Le blanc qui COUD deux lignes d'une même liste de signatures : elles sont un seul
 * objet, et deux blancs de paragraphe en feraient deux.
 */
const COUTURE_SIGNATURE = '0.3rem'

/**
 * Le blanc qui FERME un bloc dérogeant, quand la prose reprend : une ligne de prose
 * entière, `1,62 × 0,8125 rem`. La dernière signature d'une liste le prend, et
 * l'exergue aussi, qui est un seuil et doit laisser voir qu'on le franchit.
 *
 * ⚠️ 1,32 rem est ici une HAUTEUR DE LIGNE, non l'interligne 1,32 de la signature : les
 * deux nombres se ressemblent et ne disent pas la même chose.
 */
const LIGNE_DE_PROSE = '1.32rem'

/** Le blanc ordinaire entre deux paragraphes de prose. */
const BLANC_PARAGRAPHE = '0.72rem'

/**
 * Le blanc qui COUD un exergue au suivant — la moitié du blanc de paragraphe.
 *
 * ⛔ Le verset latin et sa traduction française sont UN SEUL exergue dit deux fois, et
 * le blanc de paragraphe entier en ferait deux seuils l'un derrière l'autre. La couture
 * de la signature (0,3 rem) serait à l'inverse trop serrée : deux noms dans une liste se
 * touchent presque, deux paragraphes de trois lignes ne le peuvent pas.
 */
const COUTURE_EXERGUE = `${Number.parseFloat(BLANC_PARAGRAPHE) / 2}rem`

export type FormeParagraphe = {
  /**
   * Bloc de signatures : au fer à droite, interligne resserré.
   *
   * ⛔ Le blanc qui la suit n'est PAS symétrique de celui qui la précède, et les deux
   * valeurs ne disent pas la même chose : `'suite'` — une autre signature vient après,
   * et le blanc COUD une liste ; `'fin'` — elle ferme le bloc, et le blanc devient une
   * COUPURE. Une seule valeur pour les deux serrait le privilège du Roy contre la
   * signature de son secrétaire.
   */
  signature?: 'suite' | 'fin'
  /**
   * Exergue : le verset posé en seuil d'une pièce, rentré du quart de la mesure et
   * justifié. Toute la règle et ses mesures vivent dans `compositionExergue.ts`.
   *
   * ⛔ Les deux valeurs disent, comme pour la signature, ce qui SUIT le bloc :
   * `'suite'` — l'exergue est repris dans une autre langue, et le blanc les COUD ;
   * `'fin'` — le texte s'ouvre après lui, et le blanc devient un SEUIL.
   */
  exergue?: 'suite' | 'fin'
  /** Rubrique éditoriale : centrée, en italique. */
  rubrique?: boolean
  /** Masqué parce que la page ne montre que l'original. */
  masque?: boolean
}

/**
 * La place d'une signature dans son bloc, d'où dépend le blanc qui la suit.
 *
 * ⚠️ Elle se juge sur le bloc SUIVANT, jamais sur le segment : deux signatures voisines
 * font deux blocs, chacun sa ligne, et c'est leur voisinage qui les réunit en liste.
 */
export function placeDeLaSignature(
  estSignature: boolean,
  suivieDUneSignature: boolean,
): 'suite' | 'fin' | undefined {
  return placeDansSonBloc(estSignature, suivieDUneSignature)
}

/**
 * La place d'un EXERGUE dans son bloc, d'où dépend le blanc qui le suit.
 *
 * ⚠️ Même règle et même raison que pour la signature : elle se juge sur le bloc SUIVANT.
 * Le verset latin et sa traduction sont deux blocs — l'édition les sépare, et la donnée
 * leur donne deux `paragraphe` — que seul leur voisinage réunit en un seul seuil.
 */
export function placeDeLExergue(
  estExergue: boolean,
  suiviDUnExergue: boolean,
): 'suite' | 'fin' | undefined {
  return placeDansSonBloc(estExergue, suiviDUnExergue)
}

/** Ce que les deux places ont en commun : on est dedans, et quelque chose suit ou non. */
function placeDansSonBloc(dedans: boolean, suiviDuMeme: boolean): 'suite' | 'fin' | undefined {
  if (!dedans) return undefined
  return suiviDuMeme ? 'suite' : 'fin'
}

/** L’interligne de la prose de lecture. ⛔ Il se NOMME depuis le 2026-09-09 : le
 *  préfixe de la lettrine descend d’exactement une ligne pour se poser sur la
 *  première, et deux écritures du même nombre divergeraient au premier réglage. */
export const INTERLIGNE_LECTURE = 1.62

/** Le corps de la LETTRINE, en em du texte. Le préfixe s’y rapporte : posé DANS le
 *  flottant, son `font-size` se compte en em de la lettrine, et `1 / 3.4` lui rend
 *  exactement le corps du texte courant. */
export const CORPS_LETTRINE = 3.4

/** Le paragraphe de prose de la lecture, avec ses trois dérogations de nature. */
export function styleParagrapheLecture({ signature, exergue, rubrique, masque }: FormeParagraphe = {}): CSSProperties {
  // ⛔ L'EXERGUE reste justifié, comme la prose : c'est son RETRAIT qui le détache, et
  // le retrait se pose en quatrième valeur du raccourci de marge — jamais en
  // `marginLeft` posé après le raccourci, qui laisserait deux écritures de la même
  // marge dans le même style et ne tiendrait que par leur ordre.
  const blancDeSortie = signature === 'suite' ? COUTURE_SIGNATURE
    : signature === 'fin' ? LIGNE_DE_PROSE
    : exergue === 'suite' ? COUTURE_EXERGUE
    : exergue === 'fin' ? LIGNE_DE_PROSE
    : BLANC_PARAGRAPHE
  return {
    display: masque ? 'none' : undefined,
    fontFamily: SERIF,
    fontSize: exergue ? `calc(${CORPS_LECTURE} * ${RAPPORT_CORPS_EXERGUE})` : CORPS_LECTURE,
    color: 'var(--cs-texte-fort)',
    lineHeight: signature ? '1.32' : String(INTERLIGNE_LECTURE),
    textAlign: signature ? 'right' : rubrique ? 'center' : 'justify',
    textJustify: 'inter-word',
    fontStyle: rubrique ? 'italic' : undefined,
    margin: `0 0 ${blancDeSortie}${exergue ? ` ${RETRAIT_EXERGUE}` : ''}`,
    wordSpacing: '-0.025em',
    letterSpacing: 0,
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
  } as CSSProperties
}

/** La nature d'un bloc de SIGNATURES : approbations, censeurs, souscripteurs. */
export const NATURE_SIGNATURE = 'signature'

/**
 * Un bloc de signatures : toutes ses lignes en portent la nature, et il n'est pas vide.
 *
 * ⚠️ Même contrat que `estBlocVersets`, et pour la même raison : c'est le BLOC qui change
 * de composition, jamais la ligne seule. Une signature perdue au milieu de la prose ne
 * ferre pas le paragraphe à droite ; elle en sort d'abord.
 */
export function estBlocDeSignatures(natures: readonly (string | null | undefined)[]): boolean {
  return natures.length > 0 && natures.every(nature => nature === NATURE_SIGNATURE)
}

/**
 * La nature qui SORT un segment du paragraphe de prose, ou `null` s'il y coule.
 *
 * ⛔ Les deux qu'elle nomme ne dérogent pas de la même façon — la signature se ferre à
 * droite, l'exergue se rentre du quart de la mesure — mais elles dérogent pour une même
 * raison : un bloc ne se compose pas à moitié. Ce qui les distingue de la `rubrique` ou
 * du `verset`, qui dérogent aussi, est que la donnée peut les avoir rangées dans le
 * paragraphe qu'elles bordent, et qu'il faut donc les en tirer.
 */
function natureDerogeante(nature: string | null | undefined): string | null {
  return nature === NATURE_SIGNATURE || nature === NATURE_EXERGUE ? nature : null
}

/** Ce qu'il faut savoir d'un segment pour le ranger dans son paragraphe. */
export type SegmentAParagrapher = {
  paragraphe?: number | null
  rang?: number | null
  nature?: string | null
}

/**
 * La découpe d'une suite de segments en PARAGRAPHES (colonne `paragraphe`, charte § 6.1).
 *
 * Segments consécutifs de même paragraphe : un bloc coulant, ordonné en interne par
 * `rang`. Un `paragraphe` nul isole le segment — garde-fou : une œuvre dont les segments
 * n'ont pas de numéro se lit sans dommage, chacun dans son propre bloc.
 *
 * ⛔ Une SIGNATURE ne coule pas dans la prose qu'elle clôt : elle se compose au fer à
 * droite, et un bloc ne peut pas être justifié d'un côté et ferré de l'autre. Elle sort
 * donc du paragraphe, que la donnée l'y range ou non — et la donnée l'y range souvent :
 * 4 des 11 signatures du corpus portent le `paragraphe` du texte qui les précède (les
 * trois de Boèce, le Privilège des Confessions), héritage d'un import qui n'a marqué le
 * passage à la ligne que par `join_before`.
 *
 * ⛔ Un EXERGUE en sort pour la même raison : il est rentré du quart de la mesure, et un
 * bloc ne peut pas être rentré sur une partie seulement de ses lignes. La donnée des
 * Catéchèses lui donne bien son propre `paragraphe`, mais rien n'oblige un import à le
 * faire, et la règle ne doit pas dépendre de la propreté de celui qui l'écrit.
 *
 * ⚠️ Elle vivait dans `OeuvreClient` (`paragraphesDe`), donc hors d'atteinte de toute
 * autre surface : l'extraction d'une œuvre en a eu besoin à son tour, et une découpe
 * recopiée ne reste identique que par accident. Générique sur l'identifiant, pour servir
 * la lecture (qui range ses segments dans une `Map`) comme l'extraction (qui les tient
 * dans l'ordre).
 */
export function paragraphesDeSegments<T>(
  identifiants: readonly T[],
  lire: (identifiant: T) => SegmentAParagrapher | undefined,
): T[][] {
  const blocs: { par: number | null | undefined; derogeante: string | null; ids: T[] }[] = []
  for (const identifiant of identifiants) {
    const segment = lire(identifiant)
    const par = segment?.paragraphe
    const derogeante = natureDerogeante(segment?.nature)
    const dernier = blocs[blocs.length - 1]
    if (dernier && par != null && dernier.par === par && dernier.derogeante === derogeante) dernier.ids.push(identifiant)
    else blocs.push({ par, derogeante, ids: [identifiant] })
  }
  for (const bloc of blocs) bloc.ids.sort((a, b) => {
    const ra = lire(a)?.rang, rb = lire(b)?.rang
    return (ra != null && rb != null) ? ra - rb : 0
  })
  return blocs.map(bloc => bloc.ids)
}

/**
 * Le paragraphe de l'APPARAT : la même prose, et LES MÊMES DÉROGATIONS DE NATURE.
 *
 * ⛔ Il n'en prenait aucune jusqu'au 6 septembre 2026, au motif qu'une nature dérogeante
 * n'atteindrait jamais l'apparat. C'était faux, et faux à l'envers exact : ONZE des
 * dix-huit `signature` du corpus — les quatre approbateurs du Mépris du monde, ceux de
 * Boèce, le Privilège des Confessions — portent `espace_textuel = 'apparat_critique'`.
 * La composition au fer à droite existait donc dans le code, avait sa nature en base et
 * sa fiche à l'épreuve des styles, et ne touchait AUCUN de ces onze segments :
 * « A. Debreda Curé de S. André. » se composait en prose justifiée, comme l'approbation
 * qu'il signe.
 *
 * ⛔ Les SEPT autres vivent dans le CORPS, et cette note a soutenu le contraire jusqu'au
 * 9 septembre 2026 : ce sont les mentions de traducteur que Bar-le-Duc imprime en
 * CLÔTURE d'une pièce — « Traduit par M. Portelette. » au bas du neuvième Discours sur
 * la Genèse, cinq psaumes du Commentaire, et « Cette traduction est l'œuvre de M. l'abbé
 * Pognon. », qui ferme les Questions sur l'Heptateuque. Une mention de traducteur clôt le
 * TEXTE : elle se lit dans le corps, à la place que l'imprimé lui donne, et n'est pas un
 * apparat critique. La lecture la composait donc déjà, et l'épreuve ne le disait pas.
 */
export function styleParagrapheApparat(forme: FormeParagraphe = {}): CSSProperties {
  return styleParagrapheLecture(forme)
}


/** L'enveloppe d'un bloc de VERS. ⛔ Elle ne porte ni interligne ni alignement :
 *  ceux-là appartiennent à la LIGNE, qui est une boîte et non un fragment. */
/**
 * Le BLOC qui porte des vers — dans la LECTURE comme dans l'APPARAT.
 *
 * ⚠️ Les deux surfaces composent pareil, `styleParagrapheApparat` n'étant que
 * `styleParagrapheLecture` : il n'y a donc qu'un bloc. Le style de la LIGNE, lui, est
 * celui de PARTOUT — `styleLigneDeVers`, dans `compositionVers.ts`.
 */
export function styleBlocDeVers({ masque }: { masque?: boolean } = {}): CSSProperties {
  return {
    display: masque ? 'none' : undefined,
    fontFamily: SERIF,
    fontSize: CORPS_LECTURE,
    color: 'var(--cs-texte-fort)',
    margin: '0 0 0.72rem',
    wordSpacing: '-0.025em',
    letterSpacing: 0,
  }
}

/**
 * Une LIGNE de vers.
 *
 * ⛔ C'est une boîte, jamais un fragment en ligne : `text-indent` ne s'applique qu'à
 * la première ligne d'un bloc, et jamais après un saut forcé. Ni justification ni
 * césure — on ne coupe pas un alexandrin —, et un retrait de suite qui distingue une
 * ligne trop longue du vers d'après.
 */
// ⚠️ `styleLigneDeVers` a QUITTÉ ce module le 29 août 2026 pour `compositionVers.ts`.
// Il n'avait rien de propre à la lecture d'une œuvre : l'interligne, l'alinéa, le
// retrait de suite et l'absence de césure sont ceux d'un vers PARTOUT. Seul le bloc
// qui les porte — police, corps, encre — appartient à sa surface.

/**
 * L'ARGUMENT qui ouvre une division — « Saint Chrysostome examine dans cette
 * homélie… ». Hissé en tête, hors des groupes et de la pagination : plus petit,
 * en italique, d'une encre plus claire.
 */
/**
 * La FACE d'un argument — sérif, petit corps, italique, encre effacée.
 *
 * ⛔ C'est tout ce qui appartient à la SURFACE, et rien d'autre : la prose y ajoute sa
 * justification, le vers sa géométrie. Les deux la partagent, sinon un poème d'argument
 * se composerait dans un autre corps que l'argument qui le précède.
 */
const FACE_ARGUMENT = {
  fontFamily: SERIF,
  fontSize: '0.75rem',
  fontStyle: 'italic',
  color: 'var(--cs-texte-second)',
} as const

/** Le blanc qui ferme un argument, quand il ne partage pas son paragraphe. */
const BLANC_ARGUMENT = '0.55rem'

/** La cible cliquable d'un argument : son arrondi et sa surbrillance. */
function chromeArgument(actif?: boolean) {
  return {
    cursor: 'pointer',
    borderRadius: '4px',
    background: actif ? 'var(--cs-vert-pale)' : 'transparent',
  } as const
}

export function styleArgument({ actif }: { actif?: boolean } = {}): CSSProperties {
  return {
    ...FACE_ARGUMENT,
    lineHeight: 1.6,
    textAlign: 'justify',
    textJustify: 'inter-word',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    padding: '2px 6px',
    margin: 0,
    ...chromeArgument(actif),
  } as CSSProperties
}

/**
 * Le BLOC d'un argument EN VERS — la CINQUIÈME surface de la poésie (2026-09-07).
 *
 * ⛔ L'introduction se rend hors des groupes, par un chemin à elle, et ce chemin ne
 * savait rien de `forme = vers` : les 79 vers du *Manuel* de Dhuoda s'y composaient en
 * prose justifiée et césurée, un bloc par vers, avec un blanc à chaque changement de
 * `paragraphe`. Le poème demande pourtant qu'on lise l'initiale de chaque vers — « Lector
 * qui cupis formulam hanc nostram… capita perquiras apta versorum » —, et la ligne y
 * porte donc le sens même.
 *
 * ⚠️ Le bloc n'apporte que la FACE. La géométrie du vers — alinéa, retrait de suite,
 * interligne, absence de césure — vient de `styleLigneDeVers`, comme sur les quatre
 * autres surfaces.
 */
export function styleBlocArgumentEnVers(
  { enRegard, masque }: { enRegard?: boolean; masque?: boolean } = {},
): CSSProperties {
  return {
    ...FACE_ARGUMENT,
    display: masque ? 'none' : undefined,
    margin: enRegard ? 0 : `0 0 ${BLANC_ARGUMENT}`,
  } as CSSProperties
}

/**
 * Une LIGNE de vers dans un argument : la géométrie du VERS, le chrome de l'ARGUMENT.
 *
 * ⛔ Les rembourrages se posent en LONGHAND, jamais par le raccourci `padding` : celui-ci
 * écraserait le `padding-left` de la ligne de vers, qui EST le retrait de suite, et une
 * ligne trop longue ne se distinguerait plus du vers d'après.
 */
export function styleLigneArgumentEnVers(
  { rang, ouvreStrophe, actif }: { rang: number; ouvreStrophe?: boolean; actif?: boolean },
): CSSProperties {
  return {
    ...styleLigneDeVers({ rang, ouvreStrophe }),
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingRight: '6px',
    ...chromeArgument(actif),
  } as CSSProperties
}

/**
 * Le blanc entre deux arguments : resserré quand ils partagent leur paragraphe.
 *
 * ⛔ DANS UNE GRILLE EN REGARD, LE BLANC APPARTIENT À LA RANGÉE, NON À LA CELLULE. Les
 * deux colonnes doivent rester de niveau : un blanc posé par le seul français pousserait
 * le français et laisserait le latin en arrière. C'est le raisonnement qui a mis le blanc
 * sur `.para-bilingue` dès l'origine, et il vaut ici comme là. La cellule rend donc sa
 * marge, et la rangée reprend le rythme de la lecture en regard.
 */
export function margeArgument(
  { memeParagraphe, enRegard }: { memeParagraphe?: boolean; enRegard?: boolean } = {},
): string | number {
  if (enRegard) return 0
  return `0 0 ${memeParagraphe ? '0.18rem' : BLANC_ARGUMENT}`
}

// ── La colonne en LANGUE ORIGINALE ────────────────────────────────────

/**
 * La SURFACE qui porte une colonne originale. Les deux composent leur français
 * autrement, donc elles composent autrement le latin qu'on met en face.
 */
export type SurfaceOriginale = 'lecture' | 'argument'

/**
 * La colonne en LANGUE ORIGINALE — en regard du français, ou seule à sa place.
 *
 * ⛔ ELLE ÉTAIT ÉCRITE EN LIGNE, DANS LA PAGE, ET DEUX FOIS (prose et vers). C'est ce
 * qui a permis à deux tailles de rester HORS DE L'ÉCHELLE sans que rien ne le dise :
 * `0.79rem` vaut 12,64 px et `0.82rem` 13,12 px, et aucun de ces deux rangs n'existe
 * (`echelleTypographique.ts`). Elles étaient invisibles à la garde, qui ne lisait la
 * taille qu'immédiatement après `fontSize:` et ne voyait donc rien dans un TERNAIRE
 * — le trou même que la garde chromatique avait déjà payé, où trente-sept teintes se
 * cachaient. Rabattues sur leur rang le plus proche : 12,5 et 13 px, soit 0,14 et
 * 0,12 px de déplacement, très au-dessous du seuil de perception (méthode de l'échelle,
 * dont le rabattage maximal fut de 0,86 px).
 *
 * ⚠️ Et 13 px n'est pas un chiffre rond : c'est `CORPS_LECTURE`, le corps du français.
 * Le commentaire de la page promettait déjà qu'en « Latin seul » l'original occupe la
 * colonne « au gabarit du français (mêmes taille et teinte) » ; il ne le tenait pas.
 *
 * ⛔ LE CORPS ET L'ENCRE VIENNENT DE LA SURFACE, jamais d'une valeur recopiée. Une
 * colonne SEULE prend le gabarit du français qu'elle remplace ; une colonne EN REGARD
 * descend d'un rang, pour que l'œil sache laquelle des deux il lit. Ce qui sépare les
 * deux colonnes reste la POLICE — le sans de `.para-bilingue > .texte-original` —,
 * comme la charte le dit depuis l'origine : « le change de caractère les sépare, mieux
 * qu'un filet ».
 *
 * ⛔ L'ENCRE D'UN ARGUMENT NE PEUT PAS ÊTRE `--cs-original`, ET C'EST MESURÉ. L'échelle
 * du Clair est `--cs-texte` #3a3530, `--cs-original` #575048, `--cs-texte-second`
 * #6b6560 : l'encre de l'original est plus FONCÉE que celle d'un argument. En regard du
 * corps elle s'efface, en regard d'un argument elle pèserait davantage que le français
 * qu'elle accompagne, et la relation s'inverserait d'une surface à l'autre. Au Cuir elle
 * ne s'inverse pas (#e6ded0 › #cdc2ab › #bdb3a0), si bien que le même jeton dirait deux
 * choses contraires selon le thème — exactement le défaut relevé sur
 * `--cs-danger-fonce`, transposé à l'envers. L'argument garde donc SON encre des deux
 * côtés, et la police suffit à séparer les colonnes.
 *
 * ⚠️ Un bloc de VERS ne porte ni justification, ni césure, ni interligne : ses lignes
 * les portent elles-mêmes (`styleLigneDeVers`, `compositionVers.ts`), sur les cinq
 * surfaces du vers.
 */
export function styleColonneOriginale(
  { surface, seul, grec, vers }: {
    surface: SurfaceOriginale
    seul?: boolean
    grec?: boolean
    vers?: boolean
  },
): CSSProperties {
  const argument = surface === 'argument'
  const commun: CSSProperties = {
    // Le gabarit du français qu'on remplace, ou un rang au-dessous quand on l'accompagne.
    fontSize: argument
      ? (seul ? '0.75rem' : '0.71875rem')
      : (seul ? CORPS_LECTURE : '0.78125rem'),
    // ⚠️ `undefined` laisse parler `.texte-original`, qui pose `--cs-original`.
    color: argument ? 'var(--cs-texte-second)' : seul ? 'var(--cs-texte-fort)' : undefined,
    margin: `0 0 ${argument ? BLANC_ARGUMENT : '0.72rem'}`,
    // Le latin se resserre, le grec beaucoup moins : ses signes diacritiques portent.
    wordSpacing: grec ? '-0.01em' : '-0.025em',
    letterSpacing: 0,
  }
  if (vers) return commun as CSSProperties
  return {
    ...commun,
    lineHeight: argument ? 1.6 : seul ? 1.62 : 1.58,
    textAlign: 'justify',
    textJustify: 'inter-word',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
  } as CSSProperties
}

// ── Les TITRES du corps d'une œuvre ──────────────────────────────────────────

/**
 * Le rang d'un titre dans le corps d'une œuvre. Quatre niveaux, pas davantage.
 *
 * ⛔ Ces quatre compositions étaient écrites EN LIGNE dans `OeuvreClient`, et
 * recopiées DEUX fois — une fois pour la lecture, une fois pour l'apparat. Elles
 * avaient déjà divergé : le rang 2 valait `1.125rem` en graisse 400 dans la lecture
 * et `1.0625rem` en graisse 500 dans l'apparat, soit deux rendus d'un même rang à un
 * onglet de distance. Rien ne le justifiait, `styleParagrapheApparat` n'étant que
 * `styleParagrapheLecture` : les deux surfaces composent leur prose au même corps,
 * elles n'ont aucune raison de composer leurs titres autrement. Les valeurs de la
 * LECTURE font foi (relevé et réuni le 29 août 2026).
 *
 * ⚠️ Seul le CARACTÈRE est ici. Le cadre — marges, centrage, filet de gauche, place
 * du crayon d'administration — appartient à la SURFACE et reste chez elle : c'est la
 * distinction de toujours, le style dit ce que la chose est, la surface dit comment
 * elle se compose. Les deux flux n'ont pas les mêmes blancs, et c'est légitime.
 */
export type RangTitreOeuvre = 1 | 2 | 3 | 4

/** Comment un intitulé de division s'ENROULE, aux trois rangs qui ont leur ligne.
 *
 *  `pre-line` fait voir le saut saisi par l'éditeur ; `balance` égalise les lignes
 *  d'un intitulé qui en prend plusieurs, au lieu de rejeter deux syllabes seules à la
 *  dernière (« … un commerce / impur ? », « … et leur / nourriture »). C'est le réglage
 *  du sommaire (`COMPOSITION_INTITULE`), porté dans la colonne de lecture le
 *  2026-09-03 après essai sur les Questions sur l'Heptateuque. Le texte suivi,
 *  justifié, n'est pas concerné. ⛔ Le rang 4 reste hors de portée : son sous-titre
 *  vit sur la ligne du titre, et un équilibrage y déplacerait la coupe entre les deux. */
const ENROULEMENT_INTITULE = { whiteSpace: 'pre-line', textWrap: 'balance' } as const

/** Le TITRE d'un rang. Les deux hauts sont en sérif, les deux bas en sans. */
export function styleTitreNiveau(rang: RangTitreOeuvre): CSSProperties {
  if (rang === 1) {
    return {
      fontFamily: SERIF, fontSize: '1.4375rem', fontWeight: 500,
      color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  if (rang === 2) {
    return {
      fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 400,
      color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0,
      letterSpacing: '0.01em', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  if (rang === 3) {
    return {
      fontSize: '0.78125rem', fontWeight: 600, color: 'var(--cs-texte)',
      lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  // Rang 4 : le seul qui prenne la capitale, et le seul dont le sous-titre reste
  // sur la même ligne. C'est le rang des intertitres serrés d'un commentaire.
  return {
    fontSize: '0.71875rem', fontWeight: 600, color: 'var(--cs-texte-faible)',
    letterSpacing: '0.10em', textTransform: 'uppercase',
    margin: '0.5rem 0 0.25rem', whiteSpace: 'pre-line',
  } as CSSProperties
}

/**
 * Le SOUS-TITRE d'un rang — le `ref_nivN_texte` de la donnée.
 *
 * ⚠️ Il est en ITALIQUE à tous les rangs, et d'une encre plus claire que son titre :
 * c'est ce qui l'en distingue sans l'en détacher. ⛔ Au rang 4 il reste sur la LIGNE
 * du titre, en romain de casse ordinaire — une capitale espacée de plus y ferait deux
 * titres au lieu d'un titre et de sa glose.
 */
export function styleSousTitreNiveau(rang: RangTitreOeuvre): CSSProperties {
  if (rang === 1 || rang === 2) {
    return {
      fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 400,
      color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4,
      margin: '5px 0 0', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  if (rang === 3) {
    return {
      fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)',
      lineHeight: 1.3, margin: '2px 0 0', ...ENROULEMENT_INTITULE,
    } as CSSProperties
  }
  return {
    fontWeight: 400, textTransform: 'none', letterSpacing: 0,
    marginLeft: '6px', fontStyle: 'italic',
  } as CSSProperties
}

/**
 * L'EN-TÊTE D'UNE SECTION D'APPARAT — « ce qui suit est de l'auteur », « de l'éditeur ».
 *
 * L'apparat porte depuis le 9 septembre 2026 les DEUX apparats, celui de l'auteur et
 * celui de l'éditeur, et il faut bien qu'on sache de qui l'on lit la préface : c'est
 * toute la demande, et c'est tout ce que cet en-tête fait.
 *
 * ⛔ Il n'est PAS un titre de rang 1 et ne doit pas lui ressembler. Les rangs nomment des
 * divisions de l'ŒUVRE ; celui-ci nomme une MAIN, et il en nomme deux dans la même page.
 * D'où la capitale espacée du rang 4, le filet qui coupe franchement, et une encre en
 * retrait de celle des titres : au-dessus d'eux dans la page, en dessous dans la voix.
 *
 * ⚠️ Il ne se compose QUE si la vue porte les deux mains — un en-tête seul ne distingue
 * rien et poserait un titre là où le lecteur n'avait qu'une matière (voir la vue
 * d'apparat, `OeuvreClient.tsx`).
 */
export const LIBELLE_SECTION_APPARAT = {
  auteur: 'Apparat de l’auteur',
  editeur: 'Apparat de l’éditeur',
} as const

export function styleEnteteSectionApparat({ premiere = false }: { premiere?: boolean } = {}): CSSProperties {
  return {
    fontFamily: SERIF,
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--cs-texte-second)',
    textAlign: 'center',
    // ⚠️ Le blanc d'entrée est celui d'une COUPURE, non d'un titre : trois fois et demie
    // le corps du texte, quand un rang 1 en prend deux fois huit dixièmes. Sur la
    // première section il n'y a rien à couper, et il tombe à zéro.
    margin: premiere ? '0 0 1.7rem' : '3.6rem 0 1.7rem',
    paddingBottom: '0.55rem',
    borderBottom: '1px solid var(--cs-bord)',
  } as CSSProperties
}

/**
 * La LETTRINE du premier segment d'une division.
 *
 * ⛔ C'est un FLOTTANT, et c'est ce qui lui interdit un vers ou un verset : posée
 * dans la boîte d'une ligne, elle déborde sur les suivantes, qui sont des boîtes
 * sœurs. Elle n'a de sens que dans un paragraphe de prose, dont les lignes coulent.
 *
 * ⚠️ Elle vivait en constante LOCALE d'`OeuvreClient`, donc refabriquée à chaque
 * rendu de la page.
 */
export const STYLE_LETTRINE: CSSProperties = {
  float: 'left',
  fontFamily: SERIF,
  fontSize: `${CORPS_LETTRINE}em`,
  lineHeight: '0.78',
  paddingRight: '5px',
  paddingTop: '3px',
  color: 'var(--cs-encre)',
  fontWeight: 'normal',
  userSelect: 'none',
}

/**
 * La ponctuation qui PRÉCÈDE la lettre ornée, glissée dans le même flottant.
 *
 * ⛔ Rendue à part, le flottant la rejetterait à DROITE de la lettrine : on lirait
 * « [V] «ous… » au lieu de « «Vous… ». Elle reste donc solidaire du flottant.
 *
 * ⛔ ELLE SE POSE SUR LA LIGNE DE BASE DE LA PREMIÈRE LIGNE, et elle prend le CORPS
 * DU TEXTE (décision de l’auteur, 2026-09-09, sur planche). Elle valait 0,34 em de la
 * lettrine et se relevait de 0,72 em : elle flottait à mi-hauteur, entre la première
 * ligne et la seconde, sans appartenir ni à l’ornement ni à la ligne. Mesuré sur la
 * colonne réelle, la lettrine s’en trouvait en outre poussée de 12,2 px du fer.
 *
 * ⚠️ Les deux nombres se DÉDUISENT, ils ne se règlent pas. `1 / CORPS_LETTRINE` rend
 * exactement le corps du texte courant, le `font-size` se comptant en em du flottant.
 * Et `vertical-align` vaut une ligne entière de prose : la valeur est en em de
 * l’élément, dont le corps EST celui du texte, si bien que `INTERLIGNE_LECTURE` y
 * descend la ponctuation d’exactement une ligne. Mesuré : 0,00 px d’écart avec la
 * ligne de base de la première ligne — à UN PIXEL près, et il faut le dire : la
 * lettrine elle-même n’est pas calée sur une ligne du texte. Mesuré, sa ligne de base
 * tombe à 20,05 px sous la première pour un interligne de 21,06 ; elle est posée à
 * l’œil, par son `padding-top` et son interligne de 0,78. Le guillemet
 * finit donc
 * 1,01 px trop haut, soit un vingtième de ligne. ⛔ Ne pas le rattraper par un nombre :
 * la valeur juste (1,542 em) dépend des métriques de la police et cesserait d’être
 * vraie à la première retouche de la lettrine.
 *
 * ⚠️ L’ENCRE est celle du TEXTE, non celle de l’ornement : ce guillemet ouvre une
 * citation dans la phrase de l’auteur, il n’appartient pas à la capitale gravée.
 *
 * ⚠️ QUATRE PARTIS ONT ÉTÉ ÉCARTÉS, et l’un d’eux par la mesure : faire PENDRE la
 * ponctuation dans la marge rendait le fer à la lettrine (0,0 px contre 12,2), mais
 * à la taille de l’ornement elle pendait de 19 px dans un rembourrage qui en fait 14,
 * donc hors de l’écran sur un téléphone. Planche : `tmp/planche-lettrine-guillemet`.
 */
export const STYLE_PREFIXE_LETTRINE: CSSProperties = {
  fontSize: `${1 / CORPS_LETTRINE}em`,
  verticalAlign: `${INTERLIGNE_LECTURE}em`,
  lineHeight: 1,
  color: 'var(--cs-texte-fort)',
}

/**
 * Les natures qui PEUVENT porter la lettrine — la parole de l'AUTEUR, et elle seule.
 *
 * ⛔ Liste CLOSE : une nature qui n'y figure pas ne prend pas l'ornement, et une
 * nature nouvelle ne l'attrapera pas par distraction. Le drop cap dit « ici commence
 * ce que cet homme a écrit » ; le poser ailleurs, c'est le faire mentir.
 *
 * ⛔ Ce qui en est exclu, et pourquoi : la `citation` et le `lemme` sont la parole
 * d'un AUTRE, que l'auteur commente ; la `rubrique` est un intertitre, centré et en
 * italique, où une capitale ornée n'a aucun sens ; le `verset` a déjà son bloc ; la
 * `signature`, le `separateur` et le `texte absent` ne sont pas du texte suivi ; le
 * VERS enfin l'interdit pour une raison mécanique, consignée plus haut avec le style.
 */
const NATURES_ORNABLES = new Set(['texte', 'dialogue', 'introduction', 'apparat_auteur'])

/**
 * Ce segment peut-il porter la LETTRINE ?
 *
 * ⚠️ Une division ne s'ouvre pas toujours sur la prose de son auteur : sur les 8 223
 * divisions du corpus, 159 commencent par autre chose — 60 par un lemme, 55 par une
 * citation, 41 par une rubrique, 2 par un verset, 1 par une lacune. Toutes recevaient
 * la lettrine, et le défaut se voyait le mieux chez Chrysostome, où chaque psaume
 * s'ouvre sur le verset commenté : la capitale ornait « 1. « Nations, louez le
 * Seigneur… » », dont elle emportait le numéro de verset et le guillemet dans son
 * flottant, en petit corps collé à sa gauche (relevé de l'auteur, 2026-08-30).
 *
 * ⚠️ Un segment sans nature déclarée est de la prose : c'est le cas ordinaire, et
 * refuser l'ornement par défaut ferait disparaître la lettrine de tout le corpus.
 */
export function accepteLaLettrine(
  segment: { nature?: string | null; forme?: string | null } | null | undefined,
): boolean {
  if (!segment) return false
  if (segment.forme === FORME_VERS) return false
  return NATURES_ORNABLES.has(segment.nature ?? 'texte')
}
