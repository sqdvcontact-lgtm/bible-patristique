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
//
// ⛔ LA LISTE EST ATTACHÉE À SA CLÉ (`lecteur|livre|chapitre`), ET NE SE MONTRE QUE SOUS
// ELLE (2026-09-22). Elle n'était jamais vidée : changer de chapitre, se déconnecter ou
// rencontrer une erreur laissait les signets du chapitre précédent sur celui qu'on ouvrait,
// et un signet « hérité » supprimait au clic le prélèvement d'un AUTRE chapitre. Dès que la
// clé ne correspond plus, le crochet rend une liste VIDE ; une réponse arrivée après un
// changement de chapitre ne s'applique pas (`modifierPour`).

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ABREV_FR } from './bible'
import { supabase } from './supabase'

/** Le numéro d'un verset prélevé → l'identifiant de son prélèvement. */
export type PrelevementsDuChapitre = Map<number, string>

/** La clé d'une liste de prélèvements : ce lecteur, ce livre, ce chapitre. `null` sans
 *  session — il n'y a alors rien à montrer. */
export function clePrelevements(userId: string | null, livreActif: string, chapitreActif: number): string | null {
  if (!userId) return null
  return `${userId}|${ABREV_FR[livreActif] || livreActif}|${chapitreActif}`
}

const VIDE: PrelevementsDuChapitre = new Map()

type Etat = { cle: string | null; liste: PrelevementsDuChapitre }

/** Applique une modification à une liste, en forme de valeur ou de fonction. */
function appliquer(liste: PrelevementsDuChapitre, action: SetStateAction<PrelevementsDuChapitre>): PrelevementsDuChapitre {
  return typeof action === 'function' ? action(liste) : action
}

/**
 * Les prélèvements du chapitre ouvert.
 *
 * Rend `[liste, modifier, cle, modifierPour]` :
 * - `liste` est vide tant que la clé courante n'est pas celle de la liste chargée ;
 * - `modifier` touche la liste de la clé COURANTE (celle de la page quand le geste arrive) ;
 * - `cle` est la clé courante, à retenir AVANT un envoi ;
 * - `modifierPour(cle, …)` ne touche la liste que si elle porte encore cette clé : c'est
 *   la forme à employer après un `await`, pour qu'une réponse tardive ne s'inscrive pas
 *   dans le chapitre suivant.
 */
export function usePrelevementsDuChapitre(
  userId: string | null,
  livreActif: string,
  chapitreActif: number,
): [
  PrelevementsDuChapitre,
  Dispatch<SetStateAction<PrelevementsDuChapitre>>,
  string | null,
  (cle: string | null, action: SetStateAction<PrelevementsDuChapitre>) => void,
] {
  const cle = clePrelevements(userId, livreActif, chapitreActif)
  const [etat, setEtat] = useState<Etat>({ cle: null, liste: VIDE })
  // La clé courante, lue par les gestes (jamais pendant le rendu).
  const cleCourante = useRef(cle)
  useEffect(() => { cleCourante.current = cle }, [cle])

  // Les prélèvements du chapitre, et eux seuls, dépendent du chapitre : ils sont chargés à
  // part, au lieu d'entraîner avec eux la session et les droits.
  useEffect(() => {
    // Sans session, il n'y a rien à charger : la clé est nulle et la liste se montre vide.
    if (!userId || !cle) return
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
        // chargent mal ne se distingue pas d'un chapitre sans aucun prélèvement. La liste
        // de CETTE clé est posée vide : rien d'un autre chapitre ne peut y survivre.
        if (error) {
          console.error('[prélèvements] chapitre', error)
          setEtat({ cle, liste: new Map() })
          return
        }
        const m: PrelevementsDuChapitre = new Map()
        ;(data ?? []).forEach((r: { ref_verset: number; id: string }) => m.set(r.ref_verset, r.id))
        setEtat({ cle, liste: m })
      })
    return () => { vivant = false }
  }, [userId, livreActif, chapitreActif, cle])

  const modifierPour = useCallback((cleAttendue: string | null, action: SetStateAction<PrelevementsDuChapitre>) => {
    if (!cleAttendue) return
    setEtat(prev => prev.cle !== cleAttendue ? prev : { cle: prev.cle, liste: appliquer(prev.liste, action) })
  }, [])

  const modifier = useCallback((action: SetStateAction<PrelevementsDuChapitre>) => {
    modifierPour(cleCourante.current, action)
  }, [modifierPour])

  const liste = cle !== null && etat.cle === cle ? etat.liste : VIDE
  return [liste, modifier, cle, modifierPour]
}
