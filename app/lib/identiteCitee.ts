/**
 * L'IDENTITÉ D'UNE ÉDITION, DANS LA FORME QUE LA CITATION LIT.
 *
 * Un passage se cite sous l'édition d'où il vient, et non sous l'œuvre qui la range. La
 * règle est celle de la page de lecture (`identiteEdition`, charte § 5.5) : une version
 * dit TOUT de son édition, son silence compris, et l'œuvre ne répond que pour son texte
 * par défaut.
 *
 * ⛔ Quatre surfaces la lisaient à l'ŒUVRE, et prêtaient donc au latin l'identité du
 * français (contrôle des éditions latines, 16 septembre 2026) : la copie d'un passage dans
 * le volet des Pères et dans « Mes citations », et les deux chemins du sélecteur de
 * citation d'un essai. Un passage du latin des Confessions se citait « trad. Robert
 * Arnauld d'Andilly, Paris, 1649 », au-dessus du texte de Knöll.
 *
 * Module PUR : ni React, ni Supabase. Testé dans `identiteCitee.test.ts`.
 */

import type { IndexEditeurs } from './editeursNormalisation'
import type { OeuvreCitee } from './noticeOeuvre'
import {
  identiteEdition,
  versionTextuelleDepuisLigne,
  type LigneVersionTextuelle,
  type OeuvreIdentifiable,
} from '@/app/oeuvre/[id]/versionTextuelle'

/** Les colonnes d'`oeuvre_textes` qu'une citation demande : celles de
 *  `LigneVersionTextuelle`, et l'œuvre qui range le texte. */
export const COLONNES_IDENTITE_TEXTE =
  'id_texte, id_oeuvre, titre_version, langue, traducteur, edition_label, annee_edition, is_default, is_public, statut'

export type LigneIdentiteTexte = LigneVersionTextuelle & { id_oeuvre: string }

export type IdentiteCitee = Required<
  Pick<OeuvreCitee, 'tradAuteur' | 'editeur' | 'collection' | 'ville' | 'datePublication' | 'responsable'>
>

/**
 * L'identité de l'édition d'un passage.
 *
 * ⚠️ Sans ligne de texte — un segment ancien sans `id_texte`, ou un texte que la politique de
 * lecture ne montre pas —, c'est l'œuvre qui répond : c'est ce que fait la page quand
 * aucune version n'est active.
 */
export function identiteCitee(
  oeuvre: OeuvreIdentifiable,
  ligne: LigneVersionTextuelle | null | undefined,
  index: IndexEditeurs | null,
): IdentiteCitee {
  const identite = identiteEdition(oeuvre, ligne ? versionTextuelleDepuisLigne(ligne, index) : null)
  return {
    tradAuteur: identite.traducteur,
    editeur: identite.editeur,
    collection: identite.collection,
    ville: identite.ville,
    datePublication: identite.datePublication,
    responsable: identite.responsable,
  }
}

/**
 * Le paramètre d'adresse qui rouvre CE texte : `?texte=…` pour une édition qui n'est pas
 * celle par défaut, rien sinon. ⛔ Sans lui, un lien vers un passage latin rouvrait la
 * traduction française, qui est le texte par défaut de l'œuvre.
 */
export function parametreTexte(ligne: Pick<LigneVersionTextuelle, 'id_texte' | 'is_default'> | null | undefined): string {
  return ligne && ligne.is_default !== true ? `texte=${encodeURIComponent(ligne.id_texte)}` : ''
}
