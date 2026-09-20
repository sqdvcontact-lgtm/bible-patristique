'use client'

// LES PRÉLÈVEMENTS BIBLIQUES DU CHAPITRE OUVERT — une seule recette, deux lectures.
//
// ⛔ LA CLÉ D'UN PRÉLÈVEMENT BIBLIQUE EST NATURELLE : ce lecteur, ce livre, ce chapitre, ce
// verset. Un verset se montre prélevé quelle que soit la traduction retenue — c'est ce que
// le signet de la page Bible montre depuis toujours. Les deux lectures peuvent donc
// partager ce chargement : elles ne diffèrent que par la colonne qu'on lit, jamais par ce
// qu'on a mis de côté.
//
// ⛔ Ne pas recopier cette lecture dans une page : elle l'était dans `TexteBible`, et la
// lecture en regard en aurait fait une seconde copie, que rien n'obligerait à rester
// d'accord avec la première.

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { ABREV_FR } from './bible'
import { supabase } from './supabase'

/** Le numéro d'un verset prélevé → l'identifiant de son prélèvement. */
export type PrelevementsDuChapitre = Map<number, string>

export function usePrelevementsDuChapitre(
  userId: string | null,
  livreActif: string,
  chapitreActif: number,
): [PrelevementsDuChapitre, Dispatch<SetStateAction<PrelevementsDuChapitre>>] {
  const [sauvegardes, setSauvegardes] = useState<PrelevementsDuChapitre>(new Map())

  // Les prélèvements du chapitre, et eux seuls, dépendent du chapitre : ils sont chargés à
  // part, au lieu d'entraîner avec eux la session et les droits.
  useEffect(() => {
    // Rien à effacer sans session : les signets ne sont rendus que sous `userId`.
    if (!userId) return
    let vivant = true
    const abr = ABREV_FR[livreActif] || livreActif
    supabase
      .from('prelevements')
      .select('id, ref_verset')
      .eq('user_id', userId)
      .eq('type', 'biblique')
      .eq('ref_livre_abr', abr)
      .eq('ref_chapitre', chapitreActif)
      .then(({ data, error }) => {
        if (!vivant) return
        // ⚠️ Un échec se DIT au journal : sans lui, un chapitre dont les signets se
        // chargent mal ne se distingue pas d'un chapitre sans aucun prélèvement.
        if (error) { console.error('[prélèvements] chapitre', error); return }
        const m: PrelevementsDuChapitre = new Map()
        ;(data ?? []).forEach((r: { ref_verset: number; id: string }) => m.set(r.ref_verset, r.id))
        setSauvegardes(m)
      })
    return () => { vivant = false }
  }, [userId, livreActif, chapitreActif])

  return [sauvegardes, setSauvegardes]
}
