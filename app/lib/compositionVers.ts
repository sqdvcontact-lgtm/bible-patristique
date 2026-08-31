import type { CSSProperties } from 'react'

/**
 * La composition des VERS — une seule règle, deux surfaces.
 *
 * Un poème ne se compose pas comme de la prose, et le site le savait à moitié : les
 * traductions parallèles traitaient les vers, la lecture ordinaire — celle où tout le
 * monde lit — les rendait en prose justifiée avec césure automatique. Ce module porte
 * la règle unique, et `OeuvreClient` comme `ComparaisonTraductions` s'y rapportent.
 *
 * ── L'ALINÉA DE BASE ────────────────────────────────────────────────────────────
 *
 * Tout vers est rentré de `RETRAIT_BASE` par rapport à la prose qui l'entoure. C'est
 * ce retrait, et non la longueur des lignes, qui dit au lecteur qu'il change de régime
 * avant qu'il ait lu un mot. Il ne dépend d'aucune donnée et ne se discute pas.
 *
 * ── LES ALINÉAS POÉTIQUES ───────────────────────────────────────────────────────
 *
 * ⛔ Ils ne se DEVINENT pas, ils se LISENT dans la source. La version précédente les
 * déduisait de la parité du rang — le second vers du distique est rentré. Mesuré sur
 * Boèce, cette règle est juste pour un dixième des vers et fausse pour le reste :
 * 954 vers sur 1 092 chez Mirandol et 1 123 sur 1 213 chez Ceriziers appartiennent à
 * des strophes de mètre UNIFORME, qu'elle faisait zigzaguer sans raison.
 *
 * La source, elle, les porte : l'océrisation relève `indent_inches`, la position du
 * bord gauche de chaque ligne sur la page. C'est une MESURE, non un rang — 206 valeurs
 * distinctes de 0,003 à 0,864 pouce pour le seul Ceriziers. Elle se rabat donc, comme
 * les 112 tailles de texte se sont rabattues sur 32 rangs et les rayons d'angle sur
 * cinq : `niveauxAlinea` groupe les valeurs voisines et rend un RANG par ligne, du
 * fer (0) au plus profond que l'échelle admette (`RANG_MAX`).
 *
 * ⚠️ Le rabattage se fait POÈME PAR POÈME, jamais sur tout l'ouvrage. Deux poèmes
 * posés à des places différentes sur la page n'ont pas la même origine : ce qui compte
 * est l'écart de chaque ligne au bord gauche du poème, pas sa cote absolue. Au mètre I
 * du Livre premier, les trois niveaux mesurés sont 0,73 · 0,02 · 0,44 — nets à ±0,02
 * près, ce qui prouve que la mesure est bonne et qu'il n'y a rien à deviner.
 */

/** Le retrait de tout vers par rapport à la prose. */
export const RETRAIT_BASE = 1.5

/** Ce qu'ajoute chaque rang d'alinéa poétique, au-dessus de la base. */
export const PAS_ALINEA = 1.5

/** Le retrait de CONTINUATION : un vers trop long pour la colonne repart en retrait,
 *  sans quoi rien ne le distingue du vers suivant. */
export const RETRAIT_SUITE = 1.15

/** Deux mesures plus proches que cela appartiennent au même rang. Le bruit relevé sur
 *  Boèce est de ±0,02 pouce (gauchissement du scan, forme de la lettre initiale) ;
 *  le plus petit écart VOULU qu'on ait vu est de 0,25. Le seuil se pose entre les deux. */
export const TOLERANCE_POUCES = 0.08

/**
 * Au-delà, on ne compose plus, on empile.
 *
 * ⚠️ Il a valu 3 jusqu'au 31 août 2026, et c'était un rang de trop peu. Une édition
 * qui rentre ses vers au quart de pouce dispose de CINQ positions — le fer, puis
 * `Em1` à `Em4` —, et le plafond n'en admettait que quatre. ⛔ Un plafond ne borne
 * pas une échelle, il ÉCRASE : tout ce qui dépasse retombe sur le dernier rang, et
 * deux niveaux que l'édition distingue se composent au même retrait.
 *
 * Le cas qui l'a révélé est le mètre XIV du Livre quatrième chez Mirandol, seul
 * poème du corpus où les quatre rentrées coexistent — 16 vers au fer, 5 à 0,25,
 * 10 à 0,50, 4 à 0,75 et 6 à 1,00 pouce. Les six derniers se composaient comme les
 * quatre précédents. ⛔ Le remède n'est pas de rabattre les mesures : les cinq
 * niveaux sont attestés par le témoin, relevés ligne à ligne sur les 1 092 vers.
 *
 * ⚠️ Le plafond fait un SECOND travail, qu'il ne faut pas lui découvrir par surprise :
 * il borne aussi le rabattage d'une océrisation bruitée. Chez Ceriziers 1646, dont les
 * mesures sont continues (206 valeurs de 0,003 à 0,864 pouce), la construction des
 * paliers monte jusqu'au rang 6 ; le passage de 3 à 4 y déplace **99 vers sur 1 213,
 * dans 13 poèmes**, d'un pas vers la droite. Mirandol, dont les mesures sont propres
 * (cinq valeurs exactes), n'en déplace que les 6 vers du mètre en cause. Un plafond
 * plus haut ne se pose donc qu'après avoir compté ce qu'il libère.
 */
export const RANG_MAX = 4

/**
 * Rabat une suite de mesures d'indentation sur des RANGS, poème par poème.
 *
 * Rend un rang par entrée, dans le même ordre. Une mesure absente vaut le rang 0 :
 * une édition qui ne dit rien n'est pas une édition qui dit « au fer à gauche », mais
 * en composition les deux se rendent pareil, et inventer un retrait serait pire.
 */
export function niveauxAlinea(mesures: readonly (number | null | undefined)[]): number[] {
  const connues = mesures.filter((m): m is number => typeof m === 'number' && Number.isFinite(m))
  if (connues.length === 0) return mesures.map(() => 0)

  // L'origine du poème : sa ligne la plus à gauche. Tout se compte à partir d'elle.
  const origine = Math.min(...connues)

  // Les paliers, construits en montant : une mesure ouvre un palier si elle s'écarte
  // de plus que la tolérance du dernier ouvert.
  const paliers: number[] = []
  for (const m of [...connues].sort((a, b) => a - b)) {
    const dernier = paliers[paliers.length - 1]
    if (dernier === undefined || m - dernier > TOLERANCE_POUCES) paliers.push(m)
  }

  return mesures.map(m => {
    if (typeof m !== 'number' || !Number.isFinite(m)) return 0
    // Le palier le plus proche, et non le premier franchi : une mesure tombée entre
    // deux paliers appartient à celui dont elle est le moins loin.
    let rang = 0
    let ecart = Infinity
    paliers.forEach((p, i) => {
      const d = Math.abs(m - p)
      if (d < ecart) { ecart = d; rang = i }
    })
    // Un palier qui ne s'écarte pas de l'origine est le rang 0, quel que soit son index.
    return paliers[rang] - origine <= TOLERANCE_POUCES ? 0 : Math.min(rang, RANG_MAX)
  })
}

/**
 * L'OMBRE DE LA LETTRINE — une mesure qui n'est pas un alinéa.
 *
 * ⛔ Une capitale ornée POUSSE vers la droite les premières lignes du poème, et
 * l'océrisation mesure ce déplacement comme n'importe quel autre. Ce n'en est pas un :
 * ces lignes ne sont pas rentrées, elles sont bornées par un ornement.
 *
 * Vérifié sur le fac-similé de Ceriziers 1646, page 19 (Livre premier, Poésie I) : un
 * grand M gravé occupe quatre lignes, et les quatre premiers vers commencent à sa
 * droite. Leurs mesures valent 0,73 quand le reste du poème vaut 0,02 — soit, rabattu,
 * le rang le plus profond de l'échelle, pour des vers que l'édition compose au fer.
 *
 * On rend donc leur rang aux lignes de tête, à DEUX conditions cumulées : elles
 * partagent toutes le même rang, et le poème revient ensuite PLUS À GAUCHE. Sans la
 * seconde, on confondrait l'ombre d'une lettrine avec un poème entièrement rentré.
 */
export function ombreDeLettrine(rangs: readonly number[]): number[] {
  if (rangs.length === 0 || rangs[0] === 0) return [...rangs]
  const tete = rangs[0]
  let i = 0
  while (i < rangs.length && rangs[i] === tete) i++
  if (i >= rangs.length || rangs[i] >= tete) return [...rangs]
  return rangs.map((r, j) => (j < i ? 0 : r))
}

/**
 * Découpe un texte en langue originale dont chaque ligne est un VERS.
 *
 * ⚠️ Le latin d'une strophe entière vit sur le segment de `rang = 1`, séparé par des
 * sauts de ligne (charte, § Textes originaux parallèles). Rendu dans un paragraphe de
 * prose, il se justifiait et se coupait à la césure pendant que le français d'en face
 * était composé en vers : les deux colonnes ne disaient plus la même chose.
 */
export function lignesDeVers(texte: string): string[] {
  return texte.split('\n').map(l => l.trim()).filter(l => l !== '')
}

/** Le retrait total d'un vers, en `em`, base comprise. */
export function retraitVers(rang: number): number {
  return RETRAIT_BASE + Math.max(0, Math.min(rang, RANG_MAX)) * PAS_ALINEA
}

/**
 * Une ligne de vers ouvre-t-elle une strophe ?
 *
 * ⚠️ Deux éditions, deux encodages, et il faut les servir tous les deux. Ceriziers
 * porte `stanza_before` sur ses 1 213 vers (81 à `true`) ; Mirandol, l'édition PAR
 * DÉFAUT, ne le porte sur aucun — sa structure de strophe vit dans `paragraphe`, qui
 * y vaut une strophe de douze vers. Ne lire que la métadonnée faisait donc couler
 * Mirandol d'un seul bloc, sans une seule respiration, dans la vue même dont l'objet
 * est de le mettre en regard de Ceriziers. On lit donc les deux, dans cet ordre :
 * la métadonnée quand elle existe, le changement de `paragraphe` sinon.
 */
export function ouvreStrophe(
  ligne: { strophe_avant?: boolean | null; paragraphe?: number | null },
  precedente: { paragraphe?: number | null } | undefined,
): boolean {
  if (!precedente) return false
  if (ligne.strophe_avant != null) return Boolean(ligne.strophe_avant)
  return ligne.paragraphe != null && precedente.paragraphe != null && ligne.paragraphe !== precedente.paragraphe
}

/**
 * Fond les blocs voisins que `fusionnable` reconnaît, et rend les autres tels quels.
 *
 * ⚠️ La lecture ordinaire découpe le texte par `paragraphe`, ce qui est juste pour de
 * la prose et faux pour un poème : les deux éditions de Boèce n'y mettent pas la même
 * chose. Ceriziers laisse `paragraphe` à 1 sur ses 1 213 vers et confie toute la
 * structure à `stanza_before` ; Mirandol y range une strophe de douze vers. Sans
 * fusion, le premier rendait un seul bloc par poème et le second un bloc par strophe —
 * deux compositions différentes du même texte, et deux blancs de strophe différents
 * (0,72 rem contre 0,6). On refait donc le POÈME, et les strophes s'y marquent seules.
 *
 * ⛔ Corollaire, et c'est la vraie raison : `niveauxAlinea` se calcule sur le poème.
 * Appliqué strophe par strophe, il prendrait pour origine la ligne la plus à gauche de
 * CHAQUE strophe, et une strophe entièrement rentrée retomberait au fer à gauche.
 */
export function fusionnerBlocs(
  blocs: readonly { ids: number[] }[],
  fusionnable: (ids: readonly number[]) => boolean,
): { ids: number[] }[] {
  const sortie: { ids: number[] }[] = []
  let precedentFusionnable = false
  for (const bloc of blocs) {
    const ok = bloc.ids.length > 0 && fusionnable(bloc.ids)
    const dernier = sortie[sortie.length - 1]
    if (ok && precedentFusionnable && dernier) dernier.ids.push(...bloc.ids)
    else sortie.push({ ids: [...bloc.ids] })
    precedentFusionnable = ok
  }
  return sortie
}

/** Une valeur venue de `segment_metadata->>indent_inches` : du texte, ou rien. */
export function mesureAlinea(brut: unknown): number | null {
  if (typeof brut === 'number') return Number.isFinite(brut) ? brut : null
  if (typeof brut !== 'string' || brut.trim() === '') return null
  const n = Number(brut)
  return Number.isFinite(n) ? n : null
}

/** Une valeur venue de `segment_metadata->>stanza_before` : `'true'`, `'false'`, ou rien. */
export function marqueStrophe(brut: unknown): boolean | null {
  if (typeof brut === 'boolean') return brut
  if (brut === 'true') return true
  if (brut === 'false') return false
  return null
}

/* ── LE VERS SE COMPOSE PARTOUT DE LA MÊME FAÇON ───────────────────────────────
 *
 * Demande de l'auteur, 29 août 2026 : « je veux un style propre à la poésie », et son
 * équivalent sur les quatre surfaces — le corps d'une œuvre, l'apparat d'une œuvre,
 * l'apparat d'une bible, le texte biblique lui-même.
 *
 * ⛔ C'est UN style, et quatre surfaces. Ce qui fait qu'un vers est un vers ne dépend
 * d'aucune d'elles : on ne le justifie pas, on ne le coupe pas — on ne coupe pas un
 * alexandrin —, il porte son alinéa, sa strophe et son retrait de suite. Seuls la
 * police, le corps et l'encre appartiennent à la surface, et vivent dans son bloc.
 *
 * ⚠️ `styleLigneDeVers` vivait dans `compositionOeuvre.ts`, où il ne servait qu'une
 * surface. Il est ici depuis le 29 août 2026, pour que les quatre le partagent.
 */

/** La clé qui déclare la FORME d'un segment patristique. */
export const CLE_FORME = 'forme'

/** La seule forme qui ne soit pas la prose. */
export const FORME_VERS = 'vers'

/**
 * Un segment tel qu'on le lit, quelle que soit la requête qui l'a chargé.
 *
 * ⚠️ La forme arrive sous DEUX enveloppes : à plat (`forme`) pour les lectures qui
 * passent par `SELECT_SEGMENT` et son `forme:segment_metadata->>forme`, imbriquée
 * (`segment_metadata.forme`) pour celles qui rapatrient la colonne entière. Ce ne
 * sont pas deux façons de DÉCLARER un vers — il n'y en a qu'une — mais deux façons de
 * le TRANSPORTER, et le prédicat lit les deux. ⛔ C'est exactement là que le défaut se
 * loge : trois lecteurs du site jugeaient le vers sans passer par ici.
 */
export type SegmentAForme = {
  forme?: unknown
  segment_metadata?: Record<string, unknown> | null
}

/** La forme déclarée d'un segment, sous l'une ou l'autre enveloppe. */
export function formeDeSegment(segment: SegmentAForme | null | undefined): string | null {
  if (!segment) return null
  if (typeof segment.forme === 'string') return segment.forme
  const imbriquee = segment.segment_metadata?.[CLE_FORME]
  return typeof imbriquee === 'string' ? imbriquee : null
}

/**
 * Ce segment est-il un VERS ?
 *
 * ⛔ Une SEULE déclaration, `segment_metadata.forme = 'vers'`, et c'est la nécessité
 * qui l'impose : dans l'apparat la nature vaut déjà `apparat_critique` — c'est par là
 * que le segment est SÉLECTIONNÉ — et elle ne peut pas dire en plus qu'il est en vers.
 * La forme dit la MATIÈRE sans toucher à la nature, comme le paratexte biblique le
 * fait depuis toujours avec son couple `kind` × `form`.
 *
 * ⚠️ `nature = 'vers'` a existé jusqu'au 29 août 2026, et n'existe plus. Les 2 325
 * segments qui la portaient — 2 305 de la *Consolation* de Boèce, 20 du *Manuel* de
 * Dhuoda — ont migré vers la forme, et la nature est sortie du vocabulaire. ⛔ Ne pas
 * la rétablir ici « au cas où » : une nature qu'aucun segment ne porte est une seconde
 * vérité qui attend de contredire la première.
 */
export function estEnVers(segment: SegmentAForme | null | undefined): boolean {
  return formeDeSegment(segment) === FORME_VERS
}

/** Ce bloc est-il ENTIÈREMENT composé de vers ? Tout ou rien, comme `estBlocVersets`. */
export function estBlocDeVers(
  segments: readonly (SegmentAForme | null | undefined)[],
): boolean {
  return segments.length > 0 && segments.every(estEnVers)
}

/**
 * La composition d'une LIGNE de vers, identique sur les quatre surfaces.
 *
 * ⛔ Une ligne de vers est une BOÎTE, jamais un fragment en ligne : `text-indent` ne
 * s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après un saut forcé. Sans
 * boîte, l'alinéa ne se poserait que sur le premier vers de la strophe.
 */
export function styleLigneDeVers({ rang, ouvreStrophe }: { rang: number; ouvreStrophe?: boolean }): CSSProperties {
  return {
    display: 'block',
    lineHeight: 1.4,
    marginTop: ouvreStrophe ? '0.6rem' : 0,
    marginLeft: `${retraitVers(rang)}em`,
    paddingLeft: `${RETRAIT_SUITE}em`,
    textIndent: `-${RETRAIT_SUITE}em`,
    hyphens: 'none',
    WebkitHyphens: 'none',
  } as CSSProperties
}
