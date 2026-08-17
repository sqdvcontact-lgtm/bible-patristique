'use client'

// Lecture de deux témoins d'une même œuvre EN REGARD, division par division.
//
// L'appariement ne vient pas du texte mais de la base : `texte_alignements`
// décrit des GROUPES (un groupe = ce qui se répond de part et d'autre), et
// `texte_alignement_membres` dit quels segments composent chaque côté. Un groupe
// peut être 1:0 ou 0:1 — une phrase que l'autre témoin n'a pas. On laisse alors
// la case vide : jamais on ne comble par le voisin, ce serait fabriquer une
// correspondance que l'éditeur n'a pas établie.
//
// Le rendu du texte passe par le MÊME moteur que la lecture (`appelNote`) : les
// appels de note y sont donc vivants et de la même forme, et l'espacement
// typographique est celui du site.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { parseNotes } from '@/app/lib/notes'
import { nettoyerFin } from '@/app/lib/ponctuation'
import { cesurerLatin } from '@/app/lib/cesuresLatines'
import { normaliserEspaces } from './texteEnrichi'
import { rendreTexteAvecNotes } from './appelNote'
import type { AlignementDisponible } from './oeuvreTypes'
import {
  choisirAlignement,
  dedupeDivisions,
  divisionPresente,
  divisionVoisine,
  groupesSelonFiltre,
  libelleDivisionComparaison,
  libelleLivreComparaison,
  membresOrdonnesParGroupe,
  type DivisionAlignee,
  type FiltreAlignement,
} from './comparaisonTraductionsUtils'

type GroupeAligne = {
  alignment_id: string
  book: number
  canonical_division_order: number
  group_order: number
  cardinality: string
  status: string | null
}

type SegmentComparaison = {
  id_texte: string
  segment_key: string
  segment_texte: string
  notes: Record<string, string>
  nature: string | null
}

// PostgREST borne la longueur d'un `in.(…)` : on interroge par lots.
function lots<T>(items: T[], taille = 180) {
  const paquets: T[][] = []
  for (let i = 0; i < items.length; i += taille) paquets.push(items.slice(i, i + taille))
  return paquets
}

const estLangueOriginale = (langue: string | null) => {
  const l = String(langue ?? '').toLowerCase()
  return l.startsWith('lat') || l.startsWith('grec') || l.startsWith('gre')
}

export default function ComparaisonTraductions({ idOeuvre, alignements, estAdmin }: {
  idOeuvre: string
  alignements: AlignementDisponible[]
  estAdmin: boolean
}) {
  const mobile = useEstMobile()
  const [setChoisi, setSetChoisi] = useState<string | null>(alignements[0]?.alignmentSetId ?? null)
  const alignement = useMemo(() => choisirAlignement(alignements, setChoisi), [alignements, setChoisi])

  const [groupes, setGroupes] = useState<GroupeAligne[]>([])
  const [division, setDivision] = useState<DivisionAlignee | null>(null)
  const [segments, setSegments] = useState<Map<string, SegmentComparaison>>(new Map())
  const [membresParGroupe, setMembresParGroupe] = useState<ReturnType<typeof membresOrdonnesParGroupe>>(new Map())
  const [filtre, setFiltre] = useState<FiltreAlignement>('tous')
  const [chargement, setChargement] = useState(true)

  // ── 1. La charpente : tous les groupes de l'ensemble choisi ────────────────
  useEffect(() => {
    if (!alignement) return
    let annule = false
    setChargement(true)
    supabase.from('texte_alignements')
      .select('alignment_id,book,canonical_division_order,group_order,cardinality,status')
      .eq('alignment_set_id', alignement.alignmentSetId)
      .order('book', { ascending: true })
      .order('canonical_division_order', { ascending: true })
      .order('group_order', { ascending: true })
      .then(({ data }) => {
        if (annule) return
        const rangs = (data ?? []) as GroupeAligne[]
        setGroupes(rangs)
        setDivision(d => (d && divisionPresente(dedupeDivisions(rangs), d.book, d.division))
          ? d
          : dedupeDivisions(rangs)[0] ?? null)
      })
    return () => { annule = true }
  }, [alignement])

  const divisions = useMemo(() => dedupeDivisions(groupes), [groupes])

  const groupesDeLaDivision = useMemo(() => {
    if (!division) return []
    return groupes.filter(g => g.book === division.book && g.canonical_division_order === division.division)
  }, [groupes, division])

  const groupesVisibles = useMemo(
    () => groupesSelonFiltre(groupesDeLaDivision, filtre),
    [groupesDeLaDivision, filtre])

  // ── 2. Le contenu de la division courante ─────────────────────────────────
  // Chargé division par division : l'ensemble complet de La Cité de Dieu compte
  // plus de quatorze mille membres, qu'on ne descend pas d'un bloc.
  useEffect(() => {
    if (!alignement || groupesDeLaDivision.length === 0) { setChargement(false); return }
    let annule = false
    setChargement(true)
    const ids = groupesDeLaDivision.map(g => g.alignment_id)

    ;(async () => {
      const membres: any[] = []
      for (const paquet of lots(ids)) {
        const { data } = await supabase.from('texte_alignement_membres')
          .select('alignment_id,role,member_order,id_texte,segment_key')
          .eq('alignment_set_id', alignement.alignmentSetId)
          .in('alignment_id', paquet)
        membres.push(...(data ?? []))
      }
      if (annule) return

      const cles = [...new Set(membres.map(m => String(m.segment_key)))]
      const trouves = new Map<string, SegmentComparaison>()
      for (const paquet of lots(cles)) {
        const { data } = await supabase.from('segments')
          .select('id_texte,segment_key,segment_texte,notes,nature')
          .eq('id_oeuvre', idOeuvre)
          .in('id_texte', [alignement.referenceTextId, alignement.alignedTextId])
          .in('segment_key', paquet)
        for (const s of (data ?? []) as any[]) {
          trouves.set(`${s.id_texte}|${s.segment_key}`, {
            id_texte: String(s.id_texte),
            segment_key: String(s.segment_key),
            segment_texte: String(s.segment_texte ?? ''),
            notes: parseNotes(s.notes),
            nature: s.nature ?? null,
          })
        }
      }
      if (annule) return
      setSegments(trouves)
      setMembresParGroupe(membresOrdonnesParGroupe(membres))
      setChargement(false)
    })()

    return () => { annule = true }
  }, [alignement, groupesDeLaDivision, idOeuvre])

  if (!alignement) return null

  const refOriginale = estLangueOriginale(alignement.referenceLangue)
  const aliOriginale = estLangueOriginale(alignement.alignedLangue)

  const styleColonne = (originale: boolean): React.CSSProperties => ({
    // Règle d'auteur : un texte d'œuvre se lit en sérif, SAUF la langue
    // originale mise en regard du français, qui passe en sans-serif — la
    // différence de police sépare les deux colonnes mieux qu'un filet.
    fontFamily: originale
      ? 'var(--font-source-sans), system-ui, sans-serif'
      : 'var(--font-source-serif), Georgia, serif',
    fontSize: originale ? '0.79rem' : '0.84rem',
    lineHeight: originale ? 1.55 : 1.62,
    color: originale ? 'var(--cs-texte-second)' : 'var(--cs-texte)',
    textAlign: 'justify',
    hyphens: 'auto',
    wordSpacing: originale ? '-0.025em' : undefined,
  })

  const rendreCote = (cles: { segment_key: string }[], idTexte: string, originale: boolean) => {
    if (cles.length === 0) return (
      // Un groupe 1:0 : ce témoin n'a rien en face. On le dit, on ne comble pas.
      <span style={{ fontSize: '0.6875rem', fontStyle: 'italic', color: 'var(--cs-texte-faible)' }}>
        (rien en regard)
      </span>
    )
    return cles.map((membre, i) => {
      const seg = segments.get(`${idTexte}|${membre.segment_key}`)
      if (!seg) return null
      const texte = nettoyerFin(normaliserEspaces(seg.segment_texte))
      return (
        <span key={membre.segment_key} style={{ display: 'block', marginTop: i === 0 ? 0 : '0.35rem' }}>
          {rendreTexteAvecNotes(originale ? cesurerLatin(texte) : texte, seg.notes)}
        </span>
      )
    })
  }

  const precedente = division ? divisionVoisine(divisions, division.book, division.division, -1) : null
  const suivante = division ? divisionVoisine(divisions, division.book, division.division, 1) : null

  const styleFleche = (actif: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: actif ? 'pointer' : 'default',
    color: actif ? 'var(--cs-texte-second)' : 'var(--cs-bord)',
    fontSize: '0.9rem', padding: '0 6px', lineHeight: 1,
  })

  return (
    <div style={{ maxWidth: '58rem', margin: '0 auto', padding: mobile ? '0 12px 40px' : '0 20px 56px' }}>

      {/* Barre de circulation : l'ensemble comparé, puis la division lue. */}
      <div style={{ position: 'sticky', top: 'var(--haut-corps, 3.5rem)', zIndex: 5, background: 'var(--cs-fond)', paddingTop: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--cs-bord-clair)', marginBottom: '14px' }}>
        {alignements.length > 1 && (
          <div style={{ marginBottom: '8px' }}>
            <select value={setChoisi ?? ''} onChange={e => setSetChoisi(e.target.value)}
              style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-bord)', borderRadius: 4, padding: '3px 6px' }}>
              {alignements.map(a => (
                <option key={a.alignmentSetId} value={a.alignmentSetId}>
                  {a.referenceLabel} — {a.alignedLabel}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <button onClick={() => precedente && setDivision(precedente)} disabled={!precedente}
            aria-label="Division précédente" style={styleFleche(Boolean(precedente))}>‹</button>
          <span style={{ fontSize: '0.6875rem', letterSpacing: '0.06em', color: 'var(--cs-texte-second)', textTransform: 'uppercase' }}>
            {division ? `Livre ${libelleLivreComparaison(division.book)} — ${libelleDivisionComparaison(division.division)}` : '—'}
          </span>
          <button onClick={() => suivante && setDivision(suivante)} disabled={!suivante}
            aria-label="Division suivante" style={styleFleche(Boolean(suivante))}>›</button>
        </div>

        {/* La Cité de Dieu compte six cent soixante et une divisions alignées :
            on ne les parcourt pas à la flèche. */}
        {divisions.length > 1 && (
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <select
              aria-label="Aller à une division"
              value={division ? `${division.book}|${division.division}` : ''}
              onChange={e => {
                const [book, div] = e.target.value.split('|').map(Number)
                setDivision({ book, division: div })
              }}
              style={{ fontSize: '0.625rem', color: 'var(--cs-texte-second)', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-bord)', borderRadius: 4, padding: '2px 6px', maxWidth: '100%' }}>
              {divisions.map(d => (
                <option key={`${d.book}|${d.division}`} value={`${d.book}|${d.division}`}>
                  {`Livre ${libelleLivreComparaison(d.book)} — ${libelleDivisionComparaison(d.division)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {estAdmin && (
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <button onClick={() => setFiltre(f => (f === 'tous' ? 'uncertain' : 'tous'))}
              style={{ fontSize: '0.625rem', color: filtre === 'uncertain' ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {filtre === 'uncertain' ? 'Voir tous les groupes' : 'Ne voir que les appariements incertains'}
            </button>
          </div>
        )}
      </div>

      {/* Titres de colonnes. Sur téléphone, les deux textes s'empilent : chaque
          bloc porte alors son propre libellé, plus bas. */}
      {!mobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem', marginBottom: '10px' }}>
          {[alignement.referenceLabel, alignement.alignedLabel].map((label, i) => (
            <span key={i} style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>
              {label}
            </span>
          ))}
        </div>
      )}

      {chargement && (
        <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', textAlign: 'center', padding: '24px 0' }}>
          Chargement des textes en regard…
        </p>
      )}

      {!chargement && groupesVisibles.length === 0 && (
        <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', textAlign: 'center', padding: '24px 0' }}>
          {filtre === 'uncertain' ? 'Aucun appariement incertain dans cette division.' : 'Aucun appariement pour cette division.'}
        </p>
      )}

      {!chargement && groupesVisibles.map(groupe => {
        const membres = membresParGroupe.get(groupe.alignment_id) ?? { reference: [], aligned: [] }
        const incertain = groupe.status === 'uncertain'
        return (
          <div key={groupe.alignment_id}
            style={{
              display: mobile ? 'block' : 'grid',
              gridTemplateColumns: mobile ? undefined : '1fr 1fr',
              gap: mobile ? undefined : '0 2rem',
              padding: '10px 0',
              borderTop: '1px solid var(--cs-bord-clair)',
              background: incertain && estAdmin ? 'rgba(var(--cs-danger-rgb), 0.04)' : undefined,
            }}>
            {([
              { cles: membres.reference, idTexte: alignement.referenceTextId, originale: refOriginale, label: alignement.referenceLabel },
              { cles: membres.aligned, idTexte: alignement.alignedTextId, originale: aliOriginale, label: alignement.alignedLabel },
            ]).map((cote, i) => (
              <div key={i} style={{ marginTop: mobile && i === 1 ? '10px' : 0 }}>
                {mobile && (
                  <span style={{ display: 'block', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', marginBottom: '3px' }}>
                    {cote.label}
                  </span>
                )}
                <div style={styleColonne(cote.originale)}>
                  {rendreCote(cote.cles, cote.idTexte, cote.originale)}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
