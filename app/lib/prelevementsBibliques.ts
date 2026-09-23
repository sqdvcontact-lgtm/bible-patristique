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
//
// ⛔ UNE MODIFICATION FAITE AVANT QUE LA LISTE N'ARRIVE N'EST PAS PERDUE (2026-09-22). Tant
// que la première lecture n'avait pas répondu, `modifierPour` ignorait tout : un
// prélèvement réussi laissait le signet VIDE, et un second clic écrivait un doublon. Les
// modifications faites sous la clé COURANTE attendent donc la liste, et s'y rejouent à son
// arrivée. ⚠️ Elles sont idempotentes (poser un identifiant, retirer un numéro) : qu'une
// lecture partie avant l'écriture la contienne déjà ou non, le résultat est le même.

// ⛔ MAIS UN NUMÉRO NE DÉSIGNE PAS UNE LIGNE (audit du 2026-09-22). Sept cent une paires de
// `versets_lecture` portent le même numéro : le verset « 8 » et la ligne propre à une
// édition « 8+ » (DAN 13, LJE, PSA 106…). Clée sur le seul numéro, la liste montrait le
// signet de l'un sur l'autre, et le retrait supprimait les deux. La clé est désormais le
// CRÉNEAU CANONIQUE (`prelevements.canon_id`, migration 20260922173520), qui vaut pour les
// deux lectures et pour les deux membres de l'édition du témoin — une ligne recomposée
// « 899:GEN.29.3 » désigne le même créneau que « GEN.29.3 ». ⚠️ Un prélèvement ANTÉRIEUR
// que la migration n'a pas su replacer n'en porte pas : il se range alors sous son numéro,
// et ne se montre que sur le verset ordinaire, jamais sur la ligne surnuméraire.

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ABREV_FR } from './bible'
import { supabase } from './supabase'

/** La clé d'un verset prélevé (`cleVersetPreleve`) → l'identifiant de son prélèvement. */
export type PrelevementsDuChapitre = Map<string, string>

/** Un créneau canonique tel que `versets_lecture` l'écrit : « GEN.1.8 », « DAN.13.44+ ». */
const RE_CRENEAU = /^[0-9]?[A-Z]{2,5}\.\d+\.\d+\+?$/u

/**
 * Le créneau canonique d'une ligne de lecture, ou `null` quand elle n'en a pas.
 *
 * ⚠️ Une ligne recomposée porte le préfixe de son édition (« 899:GEN.29.3 ») : on l'ôte,
 * pour qu'un verset se montre prélevé quelle que soit la bible qu'on lit. Une GLOSE n'a
 * pas de créneau (charte § 15.4) : son identifiant ne prend pas cette forme, et elle
 * retombe sur le numéro de son hôte, comme avant.
 */
export function canonIdDeLigne(idVerset: string | null | undefined): string | null {
  const nu = String(idVerset ?? '').replace(/^[^:]*:/, '')
  return RE_CRENEAU.test(nu) ? nu : null
}

/** La clé d'affichage d'un verset : son créneau quand on le connaît, son numéro sinon. */
export function cleVersetPreleve(canonId: string | null | undefined, numero: number): string {
  return canonId ? `c:${canonId}` : `n:${numero}`
}

/**
 * L'identifiant du prélèvement d'un verset, ou `null` s'il n'est pas prélevé.
 *
 * ⚠️ Le repli sur le numéro ne vaut que pour un verset ORDINAIRE : une ligne surnuméraire
 * (« 8+ ») ne prend jamais à son compte un prélèvement ancien qui ne dit pas son créneau.
 */
export function prelevementDuVerset(
  liste: PrelevementsDuChapitre,
  canonId: string | null | undefined,
  numero: number,
): string | null {
  const direct = liste.get(cleVersetPreleve(canonId, numero))
  if (direct) return direct
  if (!canonId || canonId.endsWith('+')) return null
  return liste.get(cleVersetPreleve(null, numero)) ?? null
}

/** La clé d'une liste de prélèvements : ce lecteur, ce livre, ce chapitre. `null` sans
 *  session — il n'y a alors rien à montrer. */
export function clePrelevements(userId: string | null, livreActif: string, chapitreActif: number): string | null {
  if (!userId) return null
  return `${userId}|${ABREV_FR[livreActif] || livreActif}|${chapitreActif}`
}

const VIDE: PrelevementsDuChapitre = new Map()

type Action = SetStateAction<PrelevementsDuChapitre>

type Etat = {
  cle: string | null
  liste: PrelevementsDuChapitre
  /** Les modifications faites sous une clé dont la liste n'est pas encore arrivée. */
  enAttente: { cle: string; actions: Action[] } | null
}

/** Applique une modification à une liste, en forme de valeur ou de fonction. */
function appliquer(liste: PrelevementsDuChapitre, action: Action): PrelevementsDuChapitre {
  return typeof action === 'function' ? action(liste) : action
}

/** La liste qui arrive, les modifications en attente rejouées dessus. */
export function listeArrivee(liste: PrelevementsDuChapitre, cle: string, enAttente: Etat['enAttente']): PrelevementsDuChapitre {
  if (!enAttente || enAttente.cle !== cle) return liste
  return enAttente.actions.reduce(appliquer, liste)
}

/**
 * Où va une modification : dans la liste si elle porte la clé visée ; en attente si la clé
 * visée est la clé COURANTE et que sa liste n'est pas encore là ; nulle part sinon (une
 * réponse tardive d'un autre chapitre).
 */
export function modifierEtat(etat: Etat, cleVisee: string, cleCourante: string | null, action: Action): Etat {
  if (etat.cle === cleVisee) return { ...etat, liste: appliquer(etat.liste, action) }
  if (cleVisee !== cleCourante) return etat
  const actions = etat.enAttente?.cle === cleVisee ? [...etat.enAttente.actions, action] : [action]
  return { ...etat, enAttente: { cle: cleVisee, actions } }
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
  const [etat, setEtat] = useState<Etat>({ cle: null, liste: VIDE, enAttente: null })
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
      .select('id, ref_verset, canon_id')
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
          setEtat(prev => ({ cle, liste: listeArrivee(new Map(), cle, prev.enAttente), enAttente: null }))
          return
        }
        const m: PrelevementsDuChapitre = new Map()
        ;(data ?? []).forEach((r: { ref_verset: number; canon_id: string | null; id: string }) => {
          m.set(cleVersetPreleve(r.canon_id, r.ref_verset), r.id)
        })
        setEtat(prev => ({ cle, liste: listeArrivee(m, cle, prev.enAttente), enAttente: null }))
      })
    return () => { vivant = false }
  }, [userId, livreActif, chapitreActif, cle])

  const modifierPour = useCallback((cleAttendue: string | null, action: Action) => {
    if (!cleAttendue) return
    setEtat(prev => modifierEtat(prev, cleAttendue, cleCourante.current, action))
  }, [])

  const modifier = useCallback((action: Action) => {
    modifierPour(cleCourante.current, action)
  }, [modifierPour])

  const liste = cle !== null && etat.cle === cle ? etat.liste : VIDE
  return [liste, modifier, cle, modifierPour]
}
