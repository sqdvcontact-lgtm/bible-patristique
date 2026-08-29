/**
 * LE VOCABULAIRE DES NATURES DE SEGMENT — une seule liste, trois emplois.
 *
 * Elle borne les deux importateurs génériques, le menu « Nature » du centre de
 * contrôle, et doit rester le miroir exact de `chk_segments_nature` en base.
 *
 * ⛔ Trois listes vivaient là où il n'en faut qu'une, et chacune mentait à sa façon
 * (relevé le 2026-08-29) : le menu offrait `titre` et `note`, que la base refuse ;
 * la base acceptait `apparat_auteur` et `apparat_editeur`, que les importateurs ne
 * savaient pas écrire — ils les rabattaient sur `texte` en silence, alors que
 * quatre cent dix-neuf segments les portent ; et `signature` n'existait que dans le
 * code. Une liste offerte est une promesse : offrir ce que la base refuse, ou taire
 * ce qu'elle accepte, sont deux façons de mentir.
 *
 * ⚠️ `separateur` n'est conservé que pour la compatibilité des anciens exports :
 * ⛔ ne plus en créer.
 */
export const NATURE_VALIDES = [
  'texte',
  'citation',
  'lemme',
  'vers',
  'rubrique',
  'dialogue',
  'introduction',
  'apparat_critique',
  // ⛔ L'apparat de l'AUTEUR — prologue, avertissement, dédicace — appartient au
  // corps et se lit à sa place ; celui de l'ÉDITEUR lui est extérieur. La base les
  // acceptait tous deux, les importateurs les ignoraient : 419 segments les portent.
  'apparat_auteur',
  'apparat_editeur',
  'separateur',
  'texte absent',
  // Bloc de signatures (approbations, censeurs, souscripteurs) : composé au fer à
  // droite, interligne resserré, sans espace entre lignes de même nature.
  // ⚠️ La base la refusait jusqu’au 29 août 2026 — le rendu existait, la donnée ne
  // pouvait pas l’atteindre. Contrainte élargie : migration 20260829090000.
  'signature',
  // Verset d'une citation biblique longue que l'édition pose verset par verset.
  // Un segment = un verset ; la suite forme le bloc. Voir `compositionVersets.ts`.
  'verset',
] as const

export type NatureSegmentValide = typeof NATURE_VALIDES[number]

export function normaliserNatureSegment(nature: unknown): NatureSegmentValide {
  const valeur = String(nature ?? '')
  return (NATURE_VALIDES as readonly string[]).includes(valeur)
    ? valeur as NatureSegmentValide
    : 'texte'
}

