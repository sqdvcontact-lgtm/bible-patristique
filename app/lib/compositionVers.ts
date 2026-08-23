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
 * cinq : `niveauxAlinea` groupe les valeurs voisines et rend un RANG par ligne.
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

/** Au-delà, on ne compose plus, on empile. Une page imprimée passe rarement trois rangs. */
export const RANG_MAX = 3

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
