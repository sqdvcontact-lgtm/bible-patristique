import type { ReactNode } from 'react'
import { STYLE_MENTION_DANS_LE_FIL } from './compositionBible'
import { normaliserEspaces } from './typographie'
import AppelNoteBiblique from '../components/NoteBibliqueFenetre'

// Rendu des marqueurs éditoriaux INLINE portés par le texte recomposé de TR0009
// (Bible 899) : « lecture incertaine », « lacune », « ajout marginal ». Ce sont des
// faits du témoin, à conserver comme signal éditorial, mais SANS surcharger la lecture :
// le texte reste lisible ; le marqueur ne fait qu'un discret rappel visuel + infobulle.
// Les statuts techniques d'alignement (MATCH/OFFSET/review…) ne passent JAMAIS par ici.
//
// ⚠️ Les marqueurs peuvent être à CHEVAL sur plusieurs versets : la recomposition
// canonique découpe le texte par créneau, si bien qu'un « [lecture incertaine : … »
// peut s'ouvrir dans un verset et se fermer (« …] ») dans le suivant. Ce module se lit
// donc verset par verset avec un petit automate tolérant aux marqueurs non fermés ou
// non ouverts — jamais de crochet brut laissé à l'écran.

// Lecture incertaine : le fait éditorial se dit par la seule teinte grise — le mot
// s'efface d'un ton sous le texte établi, sans jamais le concurrencer. Plus de
// soulignement pointillé (jugé disgracieux) : la couleur suffit, l'infobulle porte
// le sens savant.
const STYLE_INCERTAINE: React.CSSProperties = {
  color: 'var(--cs-texte-second)',
}
// Lacune dans le fil (au milieu d’un verset par ailleurs porté) : le manque se dit entre
// CROCHETS — le signe que la philologie donne à ce qu’un témoin a perdu, et celui que la
// donnée écrit déjà. Mise en forme demandée par l’auteur le 2026-09-05 : un corps
// légèrement plus petit, un léger espace avant et après les crochets, l’ocre des absences.
//
// ⛔ ET CE QUI S’IMPRIME ENTRE LES CROCHETS EST LA CAUSE, non des points de suspension
// (demande de l’auteur, 2026-09-08 : « plutôt que des “…”, indiquer la nature de la lacune
// ou du problème »). La marque valait « […] » dans tous les cas, et le motif que la donnée
// porte — « [lacune : déchirure] » — était MASQUÉ à l’écran comme s’il n’existait pas. Il
// existe pourtant, et il est même EXIGÉ : `tei.ts` refuse tout `<gap>` privé de `reason`
// et de `cause`, et écrit cette cause dans le marqueur. Un lecteur voyait donc trois points
// là où l’édition avait pris la peine de dire « déchirure » ou « fin du manuscrit ».
//
// ⚠️ L’ITALIQUE N’EST PAS UN ORNEMENT : elle devient nécessaire le jour où la marque porte
// un MOT. « [déchirure] » et « [m’exauça] » s’écrivent de la même façon, et le second est
// une RESTITUTION — du texte, rendu au témoin par l’éditeur —, que la traduction moderne
// emploie quatre-vingt-cinq fois. L’italique est la voix éditoriale du site (sérif italique
// et teinte, comme toute mention) : elle sépare ici ce qui parle DU manuscrit de ce qui
// parle POUR lui.
//
// ⚠️ L’air est une MARGE, non une espace du texte : une espace serait une occasion de
// couper la ligne entre le crochet et le mot qui le précède, et elle s’emporterait en
// copiant le verset. `whiteSpace` garde la marque d’un seul tenant.
//
// ⛔ ET ELLE PARLE DE LA VOIX DES MENTIONS, TEINTE COMPRISE (décision de l’auteur,
// 14 septembre 2026 : « il faut reprendre le style de “Absent de cette traduction” »).
// L’ocre des absences est parti avec elle : le corps, l’italique, l’espacement et l’encre
// viennent de `STYLE_MENTION_DANS_LE_FIL`, et il ne reste ici que ce qui tient la marque
// dans sa ligne.
export const STYLE_LACUNE: React.CSSProperties = {
  ...STYLE_MENTION_DANS_LE_FIL,
  margin: '0 0.15em',
  whiteSpace: 'nowrap',
}
// Espace fine insécable (« espace fine » de la typographie française) : quand la lacune
// coupe un MOT (« por[…]er »), elle sépare le marqueur du fragment resté collé, pour ne
// l’attacher ni le détacher comme un mot entier.
const FINE = ' '
export const TITRE_LACUNE = 'Lacune matérielle du manuscrit'
/** Ce qu’on écrit quand le témoin ne dit pas POURQUOI il manque quelque chose : le mot de
 *  la philologie, et celui que le site emploie déjà pour un verset entier perdu. */
export const LACUNE_SANS_CAUSE = 'lacune'

/**
 * Le libellé visible d’une lacune : sa CAUSE quand l’édition la donne, le mot « lacune »
 * sinon — jamais des points de suspension.
 * ⚠️ « non précisée » est ce que `tei.ts` écrit quand un `<gap>` n’a ni `reason` ni
 * `cause` : c’est un aveu d’ignorance, non une cause, et il retombe donc sur le mot nu.
 */
export function libelleLacune(cause?: string | null): string {
  const c = (cause ?? '').trim()
  return `[${!c || /^non\s+pr[ée]cis/iu.test(c) ? LACUNE_SANS_CAUSE : c}]`
}

// Un token, dans cet ordre : une lacune NUE « […] », qui se ferme d’elle-même ; une lacune
// MOTIVÉE et complète « [lacune : déchirure] », dont on retient la cause ; une ouverture
// « [<type> : » restée sans sa fermeture ; une fermeture « ] ». Les deux formes COMPLÈTES
// passent en TÊTE pour que leur crochet fermant ne soit jamais pris pour la fin d’une
// portée ouverte au verset d’avant.
// ⚠️ La lacune nue s’écrit AUSSI en toutes lettres, « [lacune] » : c’est la forme que porte la
// traduction moderne (Gn 38, 9 ; Gn 50, 26), qui s’imprimait brute faute d’être reconnue.
// ⚠️ « lecture difficile » est le SYNONYME de « lecture incertaine » (décision de l'auteur,
// 2026-09-21) : même mode, même infobulle. Elle ne se distingue que par son libellé en base.
const RE_TOKEN = /\[\s*(?:…|\.\.\.|[Ll]acune)\s*\]|\[\s*lacune\s*:\s*(?<cause>[^\]]*)\]|\[(?<type>lecture incertaine|lecture difficile|lacune|ajout marginal)\s*:\s*|\]/gu

type Mode = 'normal' | 'incertaine' | 'ajout' | 'lacune'

function infobulle(mode: Mode): string {
  if (mode === 'ajout') return 'Ajout marginal du manuscrit'
  return 'Lecture incertaine (transcription du manuscrit)'
}

/**
 * Transforme le texte recomposé (couche du manuscrit) en nœuds React où les marqueurs
 * éditoriaux inline sont rendus discrètement. Le texte hors marqueur reste littéral.
 * Tolère les marqueurs à cheval : un verset qui commence par une fermeture « … ] » est
 * réputé prolonger une lecture incertaine ouverte au verset précédent.
 */
export function rendreMarqueurs899(texteBrut: string): ReactNode {
  if (!texteBrut) return texteBrut

  // ⚠️ LA COLONNE DU MANUSCRIT PASSE PAR LA MÊME TYPOGRAPHIE QUE LE RESTE DU SITE. Elle en
  // était la seule exceptée : `rendreTexteEnrichi` appelle `normaliserEspaces` à son entrée,
  // par où passe toute la lecture — mais TR0009 ne passe pas par lui, puisqu'il porte des
  // marqueurs éditoriaux et non de l'enrichissement, et arrivait donc ici brut. Relevé le
  // 2026-08-30 : 556 versets du témoin portent une espace ORDINAIRE, sécable, devant un
  // deux-points, et pas un seul n'en porte d'insécable. Le deux-points de la Bible 899
  // pouvait donc passer à la ligne quand celui des cinq autres colonnes ne le pouvait pas.
  //
  // ⛔ La normalisation est caractère pour caractère : les indices dont se sert l'automate
  // ci-dessous restent valides. Ne jamais mettre ici une fonction qui change la longueur
  // (`normaliserTypographieLecture`, par exemple, en change).
  const texte = normaliserEspaces(texteBrut)

  // Le verset commence-t-il À L'INTÉRIEUR d'une portée ouverte au verset précédent ?
  // Signe : le PREMIER token est une fermeture orpheline.
  //
  // ⛔ Il se lit sur les TOKENS, et non plus sur un `indexOf(']')` : une lacune nue « […] »
  // porte elle aussi un crochet fermant, et le verset qui s'ouvre sur elle (« […] et il
  // prenait… ») aurait basculé tout entier en lecture incertaine.
  RE_TOKEN.lastIndex = 0
  const premier = RE_TOKEN.exec(texte)
  let mode: Mode = premier?.[0] === ']' ? 'incertaine' : 'normal'

  const noeuds: ReactNode[] = []
  let cle = 0
  let dernier = 0

  const pousser = (txt: string, m: Mode) => {
    if (!txt) return
    if (m === 'normal') noeuds.push(txt)
    else if (m === 'lacune') return // contenu d'une lacune = un motif, pas du texte lisible : masqué
    else noeuds.push(
      <span key={`m${cle++}`} title={infobulle(m)} style={STYLE_INCERTAINE}>{txt}</span>,
    )
  }

  const marqueLacune = (cause?: string) => (
    <span key={`m${cle++}`} title={TITRE_LACUNE} style={STYLE_LACUNE}>{libelleLacune(cause)}</span>
  )
  /** Une fine quand la marque se colle au caractère qui la borde (lacune au milieu d'un mot). */
  const fineSiColle = (index: number) => {
    const c = texte[index]
    // ⚠️ Contre une LETTRE ou un CHIFFRE seulement : devant un point ou une virgule, la fine
    // ouvrirait un blanc que la typographie française ne connaît pas.
    if (c && /[\p{L}\p{N}]/u.test(c)) noeuds.push(FINE)
  }

  RE_TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_TOKEN.exec(texte)) !== null) {
    pousser(texte.slice(dernier, m.index), mode)
    const fin = m.index + m[0].length
    const { cause, type } = m.groups ?? {}
    if (m[0] === ']') {
      // Fermeture d'une lacune collée à la suite (« …]er ») : une fine, pas un mot recollé.
      if (mode === 'lacune') fineSiColle(fin)
      mode = 'normal'
    } else if (cause !== undefined) {
      // Lacune MOTIVÉE et complète : c'est LA CAUSE qui s'imprime, et la marque se referme
      // d'elle-même — le mode courant n'en est pas changé.
      fineSiColle(m.index - 1)
      noeuds.push(marqueLacune(cause))
      fineSiColle(fin)
    } else if (type === undefined) {
      // Lacune NUE « […] » : la donnée ne dit pas pourquoi, on écrit le mot nu.
      fineSiColle(m.index - 1)
      noeuds.push(marqueLacune())
      fineSiColle(fin)
    } else if (type === 'lacune') {
      // ⚠️ Une ouverture de lacune SANS sa fermeture : le marqueur est à cheval, et sa
      // cause tombe dans le verset suivant, où elle sera masquée. On ne peut donc pas la
      // dire ici, et la marque retombe sur le mot nu. Ouverture collée au texte précédent
      // (« por[… ») : une fine avant le marqueur.
      fineSiColle(m.index - 1)
      noeuds.push(marqueLacune())
      mode = 'lacune'
    } else {
      mode = type === 'ajout marginal' ? 'ajout' : 'incertaine'
    }
    dernier = fin
  }
  pousser(texte.slice(dernier), mode)

  if (noeuds.length === 0) return texte
  if (noeuds.length === 1 && typeof noeuds[0] === 'string') return noeuds[0]
  return noeuds
}

// ── Les marqueurs du témoin dans un texte QUI N'EST PAS RECOMPOSÉ ─────────────────────
//
// La traduction moderne du même témoin (TR0013) porte les mêmes faits éditoriaux que le
// manuscrit — 46 lacunes nues « […] », neuf motivées (huit « déchirure », une « fin du
// manuscrit »), et 588 versets de LECTURE INCERTAINE —, mais son texte vit dans
// `versets_v2`, un verset par ligne, et passe donc par `rendreTexteEnrichi` comme
// n'importe quelle bible.
//
// ⛔ ET CES MARQUEURS S'Y IMPRIMAIENT BRUTS. Seule la lacune était mise en forme : un
// lecteur de la traduction moderne trouvait « et [lecture incertaine : preig] » au milieu
// d'une phrase française, c'est-à-dire un terme d'atelier posé dans le texte, quand la
// colonne du manuscrit rendait le MÊME fait d'une simple teinte. Un fait de l'édition ne
// se dit pas de deux façons selon la colonne où on le lit.
//
// ⛔ ON NE LUI PASSE POURTANT PAS `rendreMarqueurs899`, et ce n'est pas une commodité :
// ce tokeniseur consomme tout « ] », parce que la recomposition par créneau canonique
// coupe un marqueur en deux. Cette traduction, elle, porte 85 RESTITUTIONS entre crochets
// (« il [m'exauça] ») — du texte rendu au témoin par l'éditeur, qui doit s'imprimer tel
// quel. Le tokeniseur y mangerait le crochet fermant, et grièserait ce qui précède une
// restitution ouvrant un verset.
//
// ⚠️ D'où la règle de cette fonction, et elle se démontre : ON NE CONSOMME JAMAIS UN
// « ] » QUI SUIT UN « [ » DANS LA MÊME PORTION. Ne sont donc reconnues que des formes
// EXPLICITES — un marqueur nommé, complet ou ouvert jusqu'à la fin — et une fermeture
// orpheline, définie comme un « ] » qui précède TOUT crochet ouvrant : aucune restitution
// ne peut prendre cette place, puisqu'il lui faudrait un « [ » avant elle.
//
// La forme rendue est alors la même des deux côtés — même marque, même style, même
// infobulle : c'est le même fait dans les deux membres d'une même édition.
const RE_MARQUEUR_TEMOIN = /\[\s*(?:…|\.\.\.|[Ll]acune)\s*\]|\[\s*lacune\s*:\s*(?<cause>[^\]]*)\]|\[\s*(?<type>lecture incertaine|lecture difficile|ajout marginal)\s*:\s*(?<contenu>[^\]]*)\]|\[\s*(?<ouvert>lecture incertaine|lecture difficile|ajout marginal|lacune)\s*:\s*(?<reste>[^\]]*)$/gu

// ⛔ DANS LA TRADUCTION, UNE LECTURE INCERTAINE PREND LA VOIX DES MENTIONS (décision de
// l'auteur, 2026-09-21 : « s'inspirer du style de la Polyglotte quand il manque un texte ou
// qu'il est corrompu »). Ce qu'elle porte n'est pas du texte traduit mais l'ancien français
// laissé tel quel : c'est l'éditeur qui parle à la place d'une traduction qu'il n'a pas pu
// donner, exactement comme « Absent de cette traduction » et la lacune. La colonne du
// MANUSCRIT, elle, garde sa teinte grise : là, le passage incertain EST le texte.
const STYLE_INCERTAINE_TRADUCTION: React.CSSProperties = { ...STYLE_MENTION_DANS_LE_FIL }
const REPERE_INCERTAINE = {
  signe: '?',
  intitule: 'Lecture incertaine',
  nomAccessible: 'Lecture incertaine du manuscrit : explication',
}
const BLOC_EXPLICATION_INCERTAINE = {
  id: 'explication-lecture-incertaine',
  kind: 'commentary' as const,
  form: 'prose' as const,
  text: 'Le manuscrit se lit mal à cet endroit. La traduction garde donc l’ancien français du copiste, tel qu’il est écrit, sans en proposer de sens.',
}

/**
 * Transformation à passer à `rendreTexteEnrichi` : elle met en forme les marqueurs du
 * témoin dans les portions de texte NATUREL, sans toucher à l'enrichissement ni au
 * surlignage. Le texte sans marqueur ressort littéralement.
 *
 * ⚠️ `cle` vaut « t0 » pour la portion qui OUVRE le texte, et c'est la seule où une
 * fermeture orpheline peut se lire comme telle : ailleurs, le « [ » qui l'appareille peut
 * vivre dans une portion précédente, et le crochet resterait littéral. La règle dégrade
 * donc du bon côté — un marqueur non reconnu s'imprime, aucune restitution n'est mangée.
 */
export function marquerLacunesDuTemoin(texte: string, cle: string): ReactNode {
  if (!texte || (!texte.includes('[') && !texte.includes(']'))) return texte

  const noeuds: ReactNode[] = []
  let n = 0
  let dernier = 0
  const fineSiColle = (index: number) => {
    const c = texte[index]
    // ⚠️ Contre une LETTRE ou un CHIFFRE seulement : devant un point ou une virgule, la fine
    // ouvrirait un blanc que la typographie française ne connaît pas.
    if (c && /[\p{L}\p{N}]/u.test(c)) noeuds.push(FINE)
  }
  // ⛔ LE TEXTE NE PORTE QUE LE MOT, L'EXPLICATION VIT DANS UN APPEL (décision de l'auteur,
  // 2026-09-21). Un libellé « lecture incertaine : » écrit dans le fil cassait la phrase à
  // chaque occurrence ; une infobulle ne se voit pas au doigt. L'appel « ? » ouvre l'encart
  // des notes du site, au clic. ⚠️ La suite d'une portée ouverte au verset d'avant (`nom`
  // absent) ne redonne pas d'appel : il est posé sur l'ouverture.
  const marqueTexte = (contenu: string, nom?: string) => {
    if (nom === 'ajout marginal') {
      return <span key={`${cle}-i${n++}`} title={infobulle('ajout')} style={STYLE_INCERTAINE}>{contenu}</span>
    }
    const rang = n++
    return (
      <span key={`${cle}-i${rang}`}>
        <span style={STYLE_INCERTAINE_TRADUCTION}>{contenu}</span>
        {nom ? (
          <AppelNoteBiblique
            note={{ id: `incertaine-${cle}-${rang}`, displayNumber: 0, blocks: [BLOC_EXPLICATION_INCERTAINE] }}
            repere={REPERE_INCERTAINE}
          />
        ) : null}
      </span>
    )
  }

  // La FERMETURE ORPHELINE qui ouvre le verset : un marqueur commencé au verset d'avant se
  // termine ici. ⛔ Elle ne se reconnaît qu'AVANT tout crochet ouvrant — voir l'en-tête.
  const iFerme = texte.indexOf(']')
  const iOuvre = texte.indexOf('[')
  if (cle === 't0' && iFerme >= 0 && (iOuvre < 0 || iFerme < iOuvre)) {
    if (iFerme > 0) noeuds.push(marqueTexte(texte.slice(0, iFerme)))
    dernier = iFerme + 1
  }

  RE_MARQUEUR_TEMOIN.lastIndex = dernier
  let m: RegExpExecArray | null
  while ((m = RE_MARQUEUR_TEMOIN.exec(texte)) !== null) {
    const { cause, type, contenu, ouvert, reste } = m.groups ?? {}
    const avant = texte.slice(dernier, m.index)
    if (avant) noeuds.push(avant)
    if (type !== undefined) {
      // Marqueur nommé et COMPLET : son contenu est du texte à lire, la teinte dit le
      // doute, l'infobulle porte le sens savant. Pas de crochets à l'écran.
      noeuds.push(marqueTexte(contenu ?? '', type))
    } else if (ouvert !== undefined) {
      // Marqueur OUVERT jusqu'au bout du verset : la portée se ferme au verset suivant.
      // ⚠️ Une LACUNE ouverte n'a pas de cause lisible — celle qu'on voit est tronquée —,
      // elle retombe donc sur le mot nu ; les 43 marqueurs coupés du témoin sont d'ailleurs
      // tous des lectures incertaines.
      if (ouvert === 'lacune') {
        fineSiColle(m.index - 1)
        noeuds.push(<span key={`${cle}-l${n++}`} title={TITRE_LACUNE} style={STYLE_LACUNE}>{libelleLacune()}</span>)
      } else {
        noeuds.push(marqueTexte(reste ?? '', ouvert))
      }
    } else {
      // Lacune, nue ou motivée : la CAUSE s'imprime quand la donnée la porte.
      fineSiColle(m.index - 1)
      noeuds.push(
        <span key={`${cle}-l${n++}`} title={TITRE_LACUNE} style={STYLE_LACUNE}>{libelleLacune(cause)}</span>,
      )
      fineSiColle(m.index + m[0].length)
    }
    dernier = m.index + m[0].length
  }
  if (noeuds.length === 0) return texte
  const suite = texte.slice(dernier)
  if (suite) noeuds.push(suite)
  return noeuds
}
