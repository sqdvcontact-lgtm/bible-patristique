'use client'

// CE QUE LE LASSO FAIT D'UNE SÉLECTION DE VERSETS — prélever, retirer, copier.
//
// ⛔ UNE SEULE ÉCRITURE POUR LES DEUX LECTURES (dette relevée le 2026-09-22). Les trois
// gestes vivaient mot pour mot dans `TexteBible` et dans `LectureBilingueBible` : même
// insertion, même retrait, même citation, à la CUEILLETTE près — l'une part de lignes de
// `versets_lecture`, l'autre de cellules de colonnes. Deux copies qu'aucune garde
// n'obligeait à rester d'accord, et la seconde avait déjà divergé (elle emportait le texte
// BRUT du témoin). Les composants ne gardent donc que la cueillette : ils rendent des
// `PassageDuLasso`, et ce module fait le reste.
//
// ⛔ LE RETRAIT VISE L'IDENTIFIANT DU PRÉLÈVEMENT, jamais le numéro du verset : un
// `in('ref_verset', …)` supprimait d'un coup le verset « 8 » et la ligne « 8+ » d'une
// édition, qui portent le même numéro (voir `prelevementsBibliques.ts`).

import { supabase } from './supabase'
import { espacerAbrev } from './bible'
import { citationBiblique, copierCitation } from './citation'
import { referenceDesVersets, texteDesVersets } from './selectionPassages'
import { cleVersetPreleve, prelevementDuVerset, type PrelevementsDuChapitre } from './prelevementsBibliques'
import type { SetStateAction } from 'react'

/** Un verset pris par le lasso, tel que la page le donne. */
export type PassageDuLasso = {
  /** Son numéro canonique, celui que `prelevements.ref_verset` porte. */
  numero: number
  /** Le texte que l'ÉCRAN montre — marqueurs éditoriaux du témoin ôtés (charte § 50.3). */
  texte: string
  /** Le nom de la bible d'où il vient, celui que `prelevements.traduction` porte. */
  label: string
  /** Son CODE (« TR0004 »), celui que `prelevements.trad_id` porte : c'est lui qui dit
   *  quelle colonne est prélevée. ⚠️ Facultatif pour les appelants anciens ; toute surface
   *  de lecture le passe. */
  trad?: string | null
  /** Son créneau canonique (« GEN.1.8 »), quand la ligne en a un. */
  canonId?: string | null
}

/** Ce qu'il faut savoir du chapitre ouvert et du lecteur pour écrire. */
export type ContexteDuLasso = {
  userId: string | null
  nomLivre: string
  /** L'abréviation française du livre, celle que `ref_livre_abr` porte. */
  livreAbrege: string
  chapitre: number
  sauvegardes: PrelevementsDuChapitre
  /** La clé de la liste AU DÉPART du geste : la réponse ne s'inscrit que sous elle. */
  cleDepart: string | null
  modifierPour: (cle: string | null, action: SetStateAction<PrelevementsDuChapitre>) => void
  /** La garde de compte (`useCompte`) : sans compte personnel, elle ouvre l'invitation. */
  exigerCompte: (contexte?: string) => boolean
}

/** Les passages qui ne sont pas encore prélevés, sans doublon de créneau. */
export function passagesAPrelever(
  sauvegardes: PrelevementsDuChapitre,
  passages: readonly PassageDuLasso[],
): PassageDuLasso[] {
  const vus = new Set<string>()
  return passages.filter((p) => {
    const cle = cleVersetPreleve(p.canonId, p.numero, p.trad)
    if (vus.has(cle) || prelevementDuVerset(sauvegardes, p.canonId, p.numero, p.trad)) return false
    vus.add(cle)
    return true
  })
}

/** Les prélèvements déjà en place sous les passages donnés : leur clé et leur identifiant. */
export function prelevementsDesPassages(
  sauvegardes: PrelevementsDuChapitre,
  passages: readonly PassageDuLasso[],
): { cle: string; id: string }[] {
  const vus = new Set<string>()
  const trouves: { cle: string; id: string }[] = []
  for (const p of passages) {
    const id = prelevementDuVerset(sauvegardes, p.canonId, p.numero, p.trad)
    if (!id || vus.has(id)) continue
    vus.add(id)
    // ⚠️ La clé retirée est celle sous laquelle la liste le porte : un prélèvement ancien,
    // sans créneau, se range sous son numéro, et c'est là qu'il faut aller le chercher.
    const cle = sauvegardes.get(cleVersetPreleve(p.canonId, p.numero, p.trad)) === id
      ? cleVersetPreleve(p.canonId, p.numero, p.trad)
      : cleVersetPreleve(null, p.numero, p.trad)
    trouves.push({ cle, id })
  }
  return trouves
}

/** Combien de versets de la sélection sont déjà prélevés (ce que la barre du lasso dit). */
export function compterDejaPreleves(
  sauvegardes: PrelevementsDuChapitre,
  passages: readonly PassageDuLasso[],
): number {
  return prelevementsDesPassages(sauvegardes, passages).length
}

/** La citation d'une sélection : « … » (Gn 1, 3-5.7), une élision là où un verset manque. */
export function citationDuLasso(
  passages: readonly PassageDuLasso[],
  { livreAbrege, nomLivre, chapitre }: Pick<ContexteDuLasso, 'livreAbrege' | 'nomLivre' | 'chapitre'>,
) {
  return citationBiblique(
    texteDesVersets(passages.map((p) => ({ numero: p.numero, texte: p.texte }))),
    `${livreAbrege ? espacerAbrev(livreAbrege) : nomLivre} ${chapitre}, ${referenceDesVersets(passages.map((p) => p.numero))}`,
  )
}

/** Prélever la sélection. Rend le nombre écrit, ou `null` quand il faut un compte. */
export async function enregistrerLeLasso(
  contexte: ContexteDuLasso,
  passages: readonly PassageDuLasso[],
): Promise<number | null> {
  const { userId, exigerCompte } = contexte
  if (!exigerCompte('prélever ces versets') || !userId) return null
  const aEcrire = passagesAPrelever(contexte.sauvegardes, passages)
  if (aEcrire.length === 0) return 0
  const { data, error } = await supabase.from('prelevements').insert(aEcrire.map((p) => ({
    user_id: userId, type: 'biblique',
    ref_livre: contexte.nomLivre, ref_livre_abr: contexte.livreAbrege,
    ref_chapitre: contexte.chapitre, ref_verset: p.numero,
    canon_id: p.canonId ?? null,
    texte: p.texte, traduction: p.label, trad_id: p.trad ?? null,
  }))).select('id, ref_verset, canon_id, trad_id')
  if (error) throw error
  contexte.modifierPour(contexte.cleDepart, (prev) => {
    const suite = new Map(prev)
    for (const ligne of (data ?? []) as { id: string; ref_verset: number; canon_id: string | null; trad_id: string | null }[]) {
      suite.set(cleVersetPreleve(ligne.canon_id, ligne.ref_verset, ligne.trad_id), ligne.id)
    }
    return suite
  })
  return aEcrire.length
}

/** Retirer de mes prélèvements les versets de la sélection qui y sont. */
export async function retirerDuLasso(
  contexte: ContexteDuLasso,
  passages: readonly PassageDuLasso[],
): Promise<number | null> {
  const { userId } = contexte
  if (!userId) return null
  const aRetirer = prelevementsDesPassages(contexte.sauvegardes, passages)
  if (aRetirer.length === 0) return 0
  const { error } = await supabase.from('prelevements').delete()
    .eq('user_id', userId)
    .in('id', aRetirer.map((p) => p.id))
  if (error) throw error
  contexte.modifierPour(contexte.cleDepart, (prev) => {
    const suite = new Map(prev)
    for (const { cle } of aRetirer) suite.delete(cle)
    return suite
  })
  return aRetirer.length
}

/** Copier la citation de la sélection. */
export async function copierLeLasso(
  contexte: ContexteDuLasso,
  passages: readonly PassageDuLasso[],
): Promise<void> {
  if (passages.length === 0) return
  await copierCitation(citationDuLasso(passages, contexte))
}
