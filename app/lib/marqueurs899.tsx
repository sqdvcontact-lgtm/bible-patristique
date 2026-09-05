import type { ReactNode } from 'react'
import { normaliserEspaces } from './typographie'

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
// Lacune dans le fil (au milieu d’un verset par ailleurs porté) : le manque se dit
// « […] », entre CROCHETS — le signe que la philologie donne à ce qu’un témoin a perdu,
// et celui que la donnée écrit déjà. Mise en forme demandée par l’auteur le 2026-09-05 :
// un corps légèrement plus petit, un léger espace avant et après les crochets, l’ocre des
// absences. Le motif exact (déchirure, fin du manuscrit) reste à l’infobulle.
//
// ⚠️ L’air est une MARGE, non une espace du texte : une espace serait une occasion de
// couper la ligne entre le crochet et le mot qui le précède, et elle s’emporterait en
// copiant le verset. `whiteSpace` garde la marque d’un seul tenant.
export const STYLE_LACUNE: React.CSSProperties = {
  color: 'var(--cs-lacune)',
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: '0.85em',
  margin: '0 0.15em',
  whiteSpace: 'nowrap',
}
// Espace fine insécable (« espace fine » de la typographie française) : quand la lacune
// coupe un MOT (« por[…]er »), elle sépare le marqueur du fragment resté collé, pour ne
// l’attacher ni le détacher comme un mot entier.
const FINE = ' '
export const MARQUEUR_LACUNE = '[…]'
export const TITRE_LACUNE = 'Lacune matérielle du manuscrit'

// Un token, dans cet ordre : une lacune NUE « […] », qui se ferme d’elle-même ; une
// ouverture « [<type> : » ; une fermeture « ] ». La lacune nue passe en TÊTE pour que son
// crochet fermant ne soit jamais pris pour la fin d’une portée ouverte au verset d’avant.
const RE_TOKEN = /\[\s*(?:…|\.\.\.)\s*\]|\[(lecture incertaine|lacune|ajout marginal)\s*:\s*|\]/gu

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

  const marqueLacune = () => (
    <span key={`m${cle++}`} title={TITRE_LACUNE} style={STYLE_LACUNE}>{MARQUEUR_LACUNE}</span>
  )
  /** Une fine quand la marque se colle au caractère qui la borde (lacune au milieu d'un mot). */
  const fineSiColle = (index: number) => {
    const c = texte[index]
    if (c && !/\s/.test(c)) noeuds.push(FINE)
  }

  RE_TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_TOKEN.exec(texte)) !== null) {
    pousser(texte.slice(dernier, m.index), mode)
    const fin = m.index + m[0].length
    if (m[0] === ']') {
      // Fermeture d'une lacune collée à la suite (« …]er ») : une fine, pas un mot recollé.
      if (mode === 'lacune') fineSiColle(fin)
      mode = 'normal'
    } else if (m[1] === undefined) {
      // Lacune NUE « […] » : la donnée porte déjà la marque, il n'y a aucun motif à masquer,
      // et elle se referme d'elle-même — le mode courant n'en est pas changé.
      fineSiColle(m.index - 1)
      noeuds.push(marqueLacune())
      fineSiColle(fin)
    } else if (m[1] === 'lacune') {
      // Ouverture collée au texte précédent (« por[… ») : une fine avant le marqueur.
      fineSiColle(m.index - 1)
      noeuds.push(marqueLacune())
      mode = 'lacune'
    } else {
      mode = m[1] === 'ajout marginal' ? 'ajout' : 'incertaine'
    }
    dernier = fin
  }
  pousser(texte.slice(dernier), mode)

  if (noeuds.length === 0) return texte
  if (noeuds.length === 1 && typeof noeuds[0] === 'string') return noeuds[0]
  return noeuds
}

// ── La lacune du témoin dans un texte QUI N'EST PAS RECOMPOSÉ ─────────────────────────
//
// La traduction moderne du même témoin (TR0013) porte les mêmes LACUNES que le manuscrit
// — « […] », et neuf fois « [lacune : motif] » — mais son texte vit dans `versets_v2`, un
// verset par ligne, et passe donc par `rendreTexteEnrichi` comme n'importe quelle bible.
// Les crochets s'y imprimaient bruts.
//
// ⛔ On ne lui passe PAS `rendreMarqueurs899`, et ce n'est pas une commodité : ce
// tokeniseur tolère un « ] » orphelin parce que la recomposition par créneau canonique
// coupe un marqueur en deux. Cette traduction, elle, porte 85 RESTITUTIONS entre crochets
// (« il [m'exauça] »), qui sont l'usage philologique et doivent s'imprimer telles quelles :
// le tokeniseur y verrait autant de fermetures orphelines et griserait tout ce qui les
// précède. On ne reconnaît donc ici que la lacune, et par PAIRES COMPLÈTES.
//
// La forme rendue est la même des deux côtés — même marque, même style, même infobulle :
// c'est le même fait dans les deux membres d'une même édition.
const RE_LACUNE_NUE = /\[\s*(?:…|\.\.\.)\s*\]|\[lacune\s*:[^\]]*\]/gu

/**
 * Transformation à passer à `rendreTexteEnrichi` : elle rend la marque de lacune dans les
 * portions de texte NATUREL, sans toucher à l'enrichissement ni au surlignage.
 * Le texte sans lacune ressort littéralement.
 */
export function marquerLacunesDuTemoin(texte: string, cle: string): ReactNode {
  if (!texte || !texte.includes('[')) return texte

  const noeuds: ReactNode[] = []
  let n = 0
  let dernier = 0
  const fineSiColle = (index: number) => {
    const c = texte[index]
    if (c && !/\s/.test(c)) noeuds.push(FINE)
  }

  RE_LACUNE_NUE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_LACUNE_NUE.exec(texte)) !== null) {
    const avant = texte.slice(dernier, m.index)
    if (avant) noeuds.push(avant)
    fineSiColle(m.index - 1)
    noeuds.push(
      <span key={`${cle}-l${n++}`} title={TITRE_LACUNE} style={STYLE_LACUNE}>{MARQUEUR_LACUNE}</span>,
    )
    dernier = m.index + m[0].length
    fineSiColle(dernier)
  }
  if (noeuds.length === 0) return texte
  const reste = texte.slice(dernier)
  if (reste) noeuds.push(reste)
  return noeuds
}
