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
 *
 * ⛔ `vers` EST SORTIE DU VOCABULAIRE le 29 août 2026, et ce n'est pas un retrait de
 * fonction : la poésie se déclare désormais par `segment_metadata.forme = 'vers'`, la
 * seule écriture qui vaille aussi dans l'apparat, où la nature est déjà prise par
 * `apparat_critique`. Les 2 325 segments qui la portaient ont migré, aucun n'a changé
 * de composition, et `chk_segments_nature` la refuse désormais. ⛔ Une nature et une
 * forme qui disent le même fait, c'est la seconde vérité qui finit par contredire la
 * première — trois lecteurs du site jugeaient déjà le vers sans passer par
 * `estEnVers`. Voir `app/lib/compositionVers.ts`.
 */
import { CLE_FORME, FORME_VERS } from './compositionVers'

export const NATURE_VALIDES = [
  'texte',
  'citation',
  'lemme',
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

/** L'ancienne façon de déclarer un vers, reconnue à l'import pour n'être pas perdue. */
const NATURE_VERS_HERITEE = 'vers'

/**
 * Ce qu'une ligne d'import déclare : sa NATURE et sa FORME, qui sont DEUX AXES.
 *
 * ⛔ Sans cette fonction, un import qui écrit `nature: 'vers'` perd le vers EN SILENCE :
 * `normaliserNatureSegment` rabat toute valeur inconnue sur `texte`, et la poésie
 * deviendrait de la prose sans que rien ne le dise. C'est exactement le défaut que la
 * charte reproche à une nature admise et jamais composée — sauf qu'ici la perte a lieu
 * à l'écriture, donc sans retour possible.
 *
 * ⚠️ La nature héritée est donc TRADUITE, jamais rabattue : elle pose la forme, et la
 * nature retombe sur celle des FRÈRES du segment — ce que porte un bloc de même
 * fonction dans le même espace. C'est la règle qu'a suivie la migration du 29 août
 * 2026, et le seul choix qu'un importateur puisse faire sans lire l'œuvre.
 *
 * ⛔ Elle n'ouvre PAS `segment_metadata` en grand : la seule clé qu'elle écrive est
 * `forme`. Un passe-plat de métadonnées serait une porte par où entrerait tout ce que
 * personne ne relit.
 */
export function declarationDeSegment(ligne: {
  nature?: unknown
  forme?: unknown
  espace_textuel?: unknown
}): { nature: NatureSegmentValide; segment_metadata: Record<string, string> | null } {
  const brute = String(ligne.nature ?? '').trim()
  const heritee = brute === NATURE_VERS_HERITEE
  const enVers = heritee || String(ligne.forme ?? '').trim() === FORME_VERS
  const nature: NatureSegmentValide = heritee
    ? (String(ligne.espace_textuel ?? '').trim() === 'introduction' ? 'introduction' : 'texte')
    : normaliserNatureSegment(brute)
  return { nature, segment_metadata: enVers ? { [CLE_FORME]: FORME_VERS } : null }
}

export function normaliserNatureSegment(nature: unknown): NatureSegmentValide {
  const valeur = String(nature ?? '')
  return (NATURE_VALIDES as readonly string[]).includes(valeur)
    ? valeur as NatureSegmentValide
    : 'texte'
}

