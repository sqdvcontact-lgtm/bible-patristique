'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/app/lib/supabase'
import { chargerNoticesBibliographiques } from '@/app/lib/referencesBibliographiquesChargement'
import {
  fragmentsReference,
  type FragmentNotice,
  type NoticeBibliographique,
} from '@/app/lib/referenceBibliographique'
import { FragmentReference } from '@/app/components/ReferenceBibliographique'

export type ReferenceBibliographiqueNote = {
  citationRank: number
  ouvrageId: number
  sourceCitation: string
  locator: string | null
  avecAuteur: boolean
  wrapper: 'parentheses' | 'none'
  terminalPoint: boolean
  notice: NoticeBibliographique
}

export type BibliographieNoteParBloc = Record<string, ReferenceBibliographiqueNote[]>

type RelationRow = {
  id_texte: string
  block_id: string
  citation_rank: number
  ouvrage_id: number
  locator: string | null
  source_citation: string | null
  metadata: Record<string, unknown> | null
}

const boolMeta = (metadata: Record<string, unknown> | null, cle: string, repli: boolean) => {
  const valeur = metadata?.[cle]
  return typeof valeur === 'boolean' ? valeur : repli
}

const texteMeta = (metadata: Record<string, unknown> | null, cle: string) => {
  const valeur = metadata?.[cle]
  return typeof valeur === 'string' ? valeur : null
}

/**
 * LES OUVRAGES D'UNE NOTE, chargés à l'ouverture de son infobulle seulement.
 *
 * Le modèle normatif vit dans `texte_note_bloc_ouvrages` : le bloc garde la chaîne
 * de provenance, et la relation désigne l'ouvrage qui doit la remplacer au rendu.
 * `source_citation` est une SOUS-CHAÎNE EXACTE, jamais une regex ni une tentative de
 * reconnaissance. Si la relation n'est pas lisible, si deux textes portent par
 * accident la même paire note/bloc ou si la notice manque, la chaîne source reste
 * affichée : une dette bibliographique ne rend jamais une note vide.
 */
export function useBibliographieNote(
  noteKey: string,
  blockIds: readonly string[],
  enabled = true,
): BibliographieNoteParBloc {
  const cleBlocs = useMemo(() => [...blockIds].sort().join('\u001F'), [blockIds])
  const [parBloc, setParBloc] = useState<BibliographieNoteParBloc>({})

  useEffect(() => {
    let actif = true
    const ids = cleBlocs ? cleBlocs.split('\u001F').filter(Boolean) : []
    if (!enabled || !noteKey || ids.length === 0) {
      setParBloc({})
      return () => { actif = false }
    }

    ;(async () => {
      const { data, error } = await supabase
        .from('texte_note_bloc_ouvrages')
        .select('id_texte,block_id,citation_rank,ouvrage_id,locator,source_citation,metadata')
        .eq('note_key', noteKey)
        .in('block_id', ids)
        .order('block_id')
        .order('citation_rank')

      if (error) {
        console.error(`[notes] bibliographie illisible pour ${noteKey} :`, error)
        if (actif) setParBloc({})
        return
      }

      const lignes = ((data ?? []) as unknown as RelationRow[])
        .filter(ligne => boolMeta(ligne.metadata, 'render_structured', false))
        .filter(ligne => typeof ligne.source_citation === 'string' && ligne.source_citation.length > 0)

      if (lignes.length === 0) {
        if (actif) setParBloc({})
        return
      }

      const textes = new Set(lignes.map(ligne => ligne.id_texte))
      if (textes.size !== 1) {
        console.error(`[notes] relation bibliographique ambiguë pour ${noteKey} : ${[...textes].join(', ')}`)
        if (actif) setParBloc({})
        return
      }

      let notices: Map<number, NoticeBibliographique>
      try {
        notices = await chargerNoticesBibliographiques(supabase, lignes.map(ligne => ligne.ouvrage_id))
      } catch (error) {
        console.error(`[notes] notices bibliographiques illisibles pour ${noteKey} :`, error)
        if (actif) setParBloc({})
        return
      }

      const resultat: BibliographieNoteParBloc = {}
      for (const ligne of lignes) {
        const notice = notices.get(ligne.ouvrage_id)
        if (!notice || !ligne.source_citation) continue
        const wrapper = texteMeta(ligne.metadata, 'wrapper') === 'parentheses' ? 'parentheses' : 'none'
        resultat[ligne.block_id] ??= []
        resultat[ligne.block_id].push({
          citationRank: ligne.citation_rank,
          ouvrageId: ligne.ouvrage_id,
          sourceCitation: ligne.source_citation,
          locator: ligne.locator,
          avecAuteur: boolMeta(ligne.metadata, 'avec_auteur', true),
          wrapper,
          terminalPoint: boolMeta(ligne.metadata, 'terminal_point', true),
          notice,
        })
      }
      for (const refs of Object.values(resultat)) refs.sort((a, b) => a.citationRank - b.citationRank)
      if (actif) setParBloc(resultat)
    })()

    return () => { actif = false }
  }, [enabled, noteKey, cleBlocs])

  return parBloc
}

function retirerPointFinal(fragments: readonly FragmentNotice[]): FragmentNotice[] {
  const copie = fragments.map(fragment => ({ ...fragment }))
  const dernier = copie.at(-1)
  // Le moteur bibliographique détache son point final dans un fragment de ponctuation.
  // On ne retire JAMAIS un point qui ferait partie d'un champ source.
  if (dernier && dernier.champ === null && dernier.style === null && dernier.texte === '.') copie.pop()
  return copie
}

/** Une notice du catalogue, avec le LOCALISATEUR porté par la note imprimée. */
export function ReferenceBibliographiqueNote({ reference }: { reference: ReferenceBibliographiqueNote }) {
  let fragments = fragmentsReference(reference.notice, { avecAuteur: reference.avecAuteur })
  if (fragments.length === 0) return null

  const locator = reference.locator?.trim().replace(/[.\s]+$/u, '') ?? ''
  if (locator) {
    fragments = retirerPointFinal(fragments)
    fragments.push({
      champ: null,
      style: null,
      composition: 'romain',
      texte: `, ${locator}${reference.terminalPoint ? '.' : ''}`,
    })
  } else if (!reference.terminalPoint) {
    fragments = retirerPointFinal(fragments)
  }

  return (
    <span data-ouvrage-id={reference.ouvrageId} data-citation-rank={reference.citationRank}>
      {reference.wrapper === 'parentheses' ? '(' : null}
      {fragments.map((fragment, rang) => (
        <Fragment key={rang}>
          <FragmentReference segment={fragment} />
        </Fragment>
      ))}
      {reference.wrapper === 'parentheses' ? ')' : null}
    </span>
  )
}
