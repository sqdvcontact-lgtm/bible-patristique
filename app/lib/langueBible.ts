'use client'

// ── LA LANGUE D'UNE BIBLE, POUR `lang` ET POUR LA CÉSURE ─────────────────────
//
// La page Bible ne posait `lang` que sur le témoin de la Bible du XIIIe siècle : la
// Vulgate et la Septante se déclaraient donc dans la langue du document (le français),
// si bien que le navigateur les coupait — quand il les coupait — au dictionnaire
// français. Décision de l'auteur (2026-09-22) : `lang` vient de la langue de la
// traduction (`traductions.langue`), et le latin comme le grec reçoivent les césures du
// site, comme dans la Polyglotte (`texteCesure`, app/polyglotte/page.tsx).
//
// ⛔ La langue se LIT, elle ne se devine pas au code de la traduction : aucune liste de
// codes n'est écrite ici. La page peut la passer avec la traduction (`langue`) ; à défaut,
// elle se lit une fois par session dans `traductions`, sous la session du lecteur.
//
// ⚠️ Les césures ne changent pas la longueur LOGIQUE d'un morceau que l'appelant a déjà
// découpé : elles se posent APRÈS le placement des appels de note (qui se fait par offset
// sur le texte entier), morceau par morceau.

import { useEffect, useState } from 'react'
import { cesurerLatin } from './cesuresLatines'
import { cesurerGrec } from './grec'
import { supabase } from './supabase'

/** Le code BCP 47 d'une langue telle que `traductions.langue` l'écrit : « Latin » → `la`,
 *  « Grec ancien » → `grc`, « Hébreu » → `he`, « Ancien français (langue d'oïl) » →
 *  `fro`, « Français » → `fr`. Une langue inconnue rend `undefined` : on ne déclare pas
 *  ce qu'on ne sait pas. */
export function codeLangueBible(langue: string | null | undefined): string | undefined {
  const l = (langue ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (!l) return undefined
  if (l.startsWith('lat')) return 'la'
  if (l.startsWith('grec') || l === 'gr' || l.startsWith('grc')) return 'grc'
  if (l.startsWith('hebr') || l === 'he') return 'he'
  if (l.startsWith('ancien francais')) return 'fro'
  if (l.startsWith('francais') || l === 'fr') return 'fr'
  return undefined
}

/** Pose les césures du site sur un morceau de texte, selon sa langue. Le latin et le
 *  grec seulement : le français a le dictionnaire du navigateur, les autres n'ont rien.
 *  ⚠️ Un morceau qui porte un lien (`[texte](adresse)`) n'est pas césuré : un tiret
 *  conditionnel posé dans l'adresse la casserait. */
export function cesurerSelonLangue(texte: string, lang: string | undefined): string {
  if (!texte || (lang !== 'la' && lang !== 'grc')) return texte
  if (texte.includes('](')) return texte
  return lang === 'la' ? cesurerLatin(texte) : cesurerGrec(texte)
}

// Une lecture par session, partagée par toutes les pages qui la demandent.
let promesse: Promise<Map<string, string>> | null = null

function chargerLangues(): Promise<Map<string, string>> {
  if (promesse) return promesse
  promesse = (async () => {
    const { data, error } = await supabase.from('traductions').select('trad_id, langue').eq('est_biblique', true)
    if (error) throw error
    const m = new Map<string, string>()
    for (const r of (data ?? []) as { trad_id: string; langue: string | null }[]) {
      if (r.langue) m.set(r.trad_id, r.langue)
    }
    return m
  })()
  // ⚠️ Un échec s'oublie : la prochaine demande le retente.
  promesse.catch(err => { console.error('[langue des bibles]', err); promesse = null })
  return promesse
}

/** La langue d'une traduction biblique, au code BCP 47. `connue` vient de la page quand
 *  elle la porte ; sinon on la lit (une fois par session). `undefined` tant qu'on ne sait
 *  pas, ce qui laisse le texte sans `lang` ni césure le temps de la lecture. */
export function useLangueBible(code: string, connue?: string | null): string | undefined {
  const [lues, setLues] = useState<Map<string, string> | null>(null)
  const aLire = connue === undefined
  useEffect(() => {
    if (!aLire) return
    let vivant = true
    chargerLangues().then(m => { if (vivant) setLues(m) }).catch(() => {})
    return () => { vivant = false }
  }, [aLire])
  return codeLangueBible(aLire ? lues?.get(code) : connue)
}
