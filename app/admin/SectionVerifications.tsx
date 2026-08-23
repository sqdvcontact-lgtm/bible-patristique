'use client'

import React from 'react'
import { supabase, refFrVer } from './adminShared'
import { verifierLien } from '@/app/actions/verifications'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

const PAGE_SIZE = 12
type Action = 1 | 2 | 3 | 4 | 'pas_de_lien'

// Les quatre types de la charte §9, désormais portés par `liens_bibliques.type`.
const OPTIONS: { label: string; action: Action; couleur?: string }[] = [
  { label: 'Citation directe',         action: 1 },
  { label: 'Citation paraphrastique',  action: 2 },
  { label: 'Commentaire doctrinal',    action: 3 },
  { label: 'Écho thématique',          action: 4 },
  { label: 'Pas de lien',              action: 'pas_de_lien', couleur: 'var(--cs-danger)' },
]

function verifies(seg: any): string[] {
  const v = seg.verifies
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } }
  return []
}


export default function SectionVerifications({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [segments, setSegments] = React.useState<any[]>([])
  const [chargement, setChargement] = React.useState(true)
  const [oeuvres, setOeuvres] = React.useState<Record<string, { titre: string; auteur: string }>>({})
  const [versetMap, setVersetMap] = React.useState<Record<string, { ref: string; texte: string }>>({})
  const [page, setPage] = React.useState(0)
  const [statut, setStatut] = React.useState<Record<string, 'loading' | 'ok' | 'err'>>({})
  const [liensParSegment, setLiensParSegment] = React.useState<Map<number, { canon_id: string; type: number }[]>>(new Map())

  React.useEffect(() => {
    const charger = async () => {
      setChargement(true)
      // La file de travail se lit maintenant sur les LIENS, non sur les segments :
      // c'est le lien qu'on arbitre. On prend ceux qui ne sont pas encore fermes.
      let liens: any[] = []
      for (let from = 0; ; from += 1000) {
        const { data: batch } = await supabase
          .from('liens_bibliques')
          .select('id, segment_id, canon_id, type, fiabilite')
          .not('canon_id', 'is', null)
          .neq('fiabilite', 'vérifié')
          .order('segment_id')
          .range(from, from + 999)
        if (!batch || batch.length === 0) break
        liens = liens.concat(batch)
        if (batch.length < 1000) break
      }

      const parSegment = new Map<number, { canon_id: string; type: number }[]>()
      for (const l of liens) {
        if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])
        parSegment.get(l.segment_id)!.push({ canon_id: l.canon_id, type: l.type })
      }
      setLiensParSegment(parSegment)

      const idsSeg = [...parSegment.keys()]
      let segs: any[] = []
      for (let i = 0; i < idsSeg.length; i += 500) {
        const { data } = await supabase
          .from('segments')
          .select('id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, verifies')
          .in('id', idsSeg.slice(i, i + 500))
        segs = segs.concat(data ?? [])
      }
      segs.sort((a, b) => String(a.id_oeuvre).localeCompare(String(b.id_oeuvre)) || a.segment_numero - b.segment_numero)

      // Ne garder que les segments qui ont encore des versets non passés en revue
      const segsFiltres = segs.filter(s => {
        const vv = verifies(s)
        return (parSegment.get(s.id) ?? []).some(l => !vv.includes(l.canon_id))
      })
      setSegments(segsFiltres)

      const { data: ods } = await supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur')
      const { data: ads } = await supabase.from('auteurs').select('id_auteur, nom')
      const auteurs = new Map((ads ?? []).map((a: any) => [a.id_auteur, a.nom]))
      const om: Record<string, { titre: string; auteur: string }> = {}
      ;(ods ?? []).forEach((o: any) => { om[o.id_oeuvre] = { titre: o.titre, auteur: auteurs.get(o.id_auteur) ?? '' } })
      setOeuvres(om)

      const ids = new Set<string>()
      segsFiltres.forEach(s => (parSegment.get(s.id) ?? []).forEach(l => ids.add(l.canon_id)))
      const vm: Record<string, { ref: string; texte: string }> = {}
      const idsArr = Array.from(ids)
      for (let i = 0; i < idsArr.length; i += 500) {
        const { data: vs } = await supabase.from('versets_lecture').select('id_verset, ref, TR0001').in('id_verset', idsArr.slice(i, i + 500))
        ;(vs ?? []).forEach((v: any) => { vm[v.id_verset] = { ref: v.ref, texte: v.TR0001 ?? '' } })
      }
      setVersetMap(vm)
      setChargement(false)
    }
    charger()
  }, [])

  const choisir = async (seg: any, idVerset: string, action: Action) => {
    const key = `${seg.id}_${idVerset}`
    setStatut(p => ({ ...p, [key]: 'loading' }))

    let verifiesApres: string[]
    try {
      const result = await verifierLien({ id: seg.id, verifies: verifies(seg) }, idVerset, action)
      verifiesApres = result.verifies
    } catch (e: any) {
      console.error('[SectionVerifications] update error:', e)
      setStatut(p => ({ ...p, [key]: 'err', [`${key}_msg`]: e?.message || 'inconnue' }))
      setTimeout(() => setStatut(p => { const n = { ...p }; delete n[key]; delete n[`${key}_msg`]; return n }), 6000)
      return
    }

    setStatut(p => ({ ...p, [key]: 'ok' }))

    // Mettre à jour l'état local : retirer ce (seg, verset) de la liste
    setSegments(prev => prev
      .map(s => s.id === seg.id ? { ...s, verifies: verifiesApres } : s)
      .filter(s => {
        const vvs = verifies(s)
        return (liensParSegment.get(s.id) ?? []).some(l => !vvs.includes(l.canon_id))
      })
    )
  }

  // Construire la liste des paires (segment, verset) à afficher.
  // La vérification se fait par (segment, verset) — `verifies(seg)` ne stocke que des canon_id —,
  // or un lemme porte deux liens vers le même verset (type 1 « citation » + type 3 « commentaire »).
  // On dédoublonne donc par canon_id pour ne montrer et ne compter chaque paire qu'une fois
  // (sans quoi la clé React `${seg.id}_${idVerset}` n'est pas unique et le badge compte double).
  const paires: { seg: any; idVerset: string }[] = []
  segments.forEach(seg => {
    const vv = verifies(seg)
    const vus = new Set<string>()
    ;(liensParSegment.get(seg.id) ?? []).forEach(({ canon_id }) => {
      if (!vv.includes(canon_id) && !vus.has(canon_id)) {
        vus.add(canon_id)
        paires.push({ seg, idVerset: canon_id })
      }
    })
  })

  // Mettre à jour le badge de l'onglet et notifier la Navbar
  React.useEffect(() => {
    onCountChange?.(paires.length)
    if (!chargement) {
      localStorage.setItem('admin_verif_count', String(paires.length))
      window.dispatchEvent(new CustomEvent('admin-verif-count', { detail: paires.length }))
    }
  }, [paires.length, chargement])

  const nbPages = Math.ceil(paires.length / PAGE_SIZE)
  const pageCourante = paires.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)


  return (
    <div>
      {/* Compteur central, élégant : le nombre en chiffre serif, mis en avant. */}
      <div style={{ textAlign: 'center', margin: '4px 0 20px' }}>
        {chargement ? (
          <p style={{ margin: 0, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
        ) : paires.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun lien en attente de vérification.</p>
        ) : (
          <p style={{ margin: 0, color: 'var(--cs-texte-second)', fontSize: '0.875rem', letterSpacing: '0.01em' }}>
            <strong style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontWeight: 'normal', fontSize: '1.625rem', color: 'var(--cs-vert)', verticalAlign: '-2px' }}>{paires.length}</strong>
            {'  '}lien{paires.length > 1 ? 's' : ''} à vérifier
          </p>
        )}
      </div>

      {nbPages > 1 && <Pagination page={page} nbPages={nbPages} onPage={setPage} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {pageCourante.map(({ seg, idVerset }) => {
          const oeuvre = oeuvres[seg.id_oeuvre] ?? { titre: seg.id_oeuvre, auteur: '' }
          const refsPatristiques = [seg.ref_niv1, seg.ref_niv2, seg.ref_niv3].filter(Boolean).join(', ')
          const verset = versetMap[idVerset]
          const refVerset = verset ? refFrVer(verset.ref) : idVerset
          const key = `${seg.id}_${idVerset}`
          const st = statut[key]

          return (
            <article key={key} style={carteStyle}>
              {/* En-tête : référence biblique | référence patristique */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                <a href={`/recherche?q=${encodeURIComponent(refVerset)}`} target="_blank" rel="noopener noreferrer" style={enteteColStyle}>
                  {refVerset}
                </a>
                <a href={`/oeuvre/${seg.id_oeuvre}#s${seg.segment_numero}`} target="_blank" rel="noopener noreferrer"
                  style={{ ...enteteColStyle, borderLeft: '1px solid var(--cs-fond-doux)' }}>
                  <strong>{oeuvre.auteur}</strong>
                  <span style={{ fontStyle: 'italic', marginLeft: '7px' }}>{oeuvre.titre}</span>
                  {refsPatristiques && <span style={{ color: 'var(--cs-texte-doux)', marginLeft: '7px' }}>{refsPatristiques}</span>}
                </a>
              </div>

              {/* Corps : texte biblique | texte patristique */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
                <div style={{ padding: '14px 16px', background: 'var(--cs-fond-clair)' }}>
                  <p style={texteBibleStyle}>{verset?.texte ? rendreTexteEnrichi(verset.texte) : 'Verset introuvable.'}</p>
                </div>
                <div style={{ padding: '14px 16px', borderLeft: '1px solid var(--cs-fond-doux)' }}>
                  <p style={textePatristiqueStyle}>{rendreTexteEnrichi(seg.segment_texte)}</p>
                </div>
              </div>

              {/* Boutons de qualification */}
              <div style={{ display: 'flex', gap: '7px', padding: '10px 16px 12px', borderTop: '1px solid var(--cs-fond-doux)', flexWrap: 'wrap' }}>
                {st === 'err' && (
                  <span style={{ fontSize: '0.78125rem', color: 'var(--cs-danger)', fontStyle: 'italic', alignSelf: 'center' }}>
                    Erreur : {statut[`${key}_msg`] || 'inconnue'}
                  </span>
                )}
                {(!st || st === 'err') && OPTIONS.map(opt => (
                  <button key={opt.action}
                    onClick={() => choisir(seg, idVerset, opt.action)}
                    style={{
                      fontSize: '0.78125rem', padding: '5px 11px', borderRadius: '4px', fontWeight: 600,
                      border: opt.couleur ? `1px solid ${opt.couleur}` : '1px solid var(--cs-bord)',
                      background: 'var(--cs-surface)',
                      color: opt.couleur ?? 'var(--cs-vert)',
                      cursor: 'pointer',
                    }}>
                    {opt.label}
                  </button>
                ))}
                {st === 'loading' && (
                  <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', alignSelf: 'center' }}>
                    Enregistrement…
                  </span>
                )}
                {st === 'ok' && (
                  <span style={{ fontSize: '0.78125rem', color: 'var(--cs-vert)', fontWeight: 600, alignSelf: 'center' }}>
                    ✓ Enregistré
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {nbPages > 1 && <Pagination page={page} nbPages={nbPages} onPage={setPage} bas />}
    </div>
  )
}

// Pagination centrée et sobre : deux flèches rondes encadrant « Page X sur Y » en serif.
function Pagination({ page, nbPages, onPage, bas = false }: {
  page: number; nbPages: number
  onPage: React.Dispatch<React.SetStateAction<number>>; bas?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: bas ? '22px 0 0' : '0 0 20px' }}>
      <button aria-label="Page précédente" onClick={() => onPage(p => Math.max(0, p - 1))} disabled={page === 0} style={flecheBtn(page === 0)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontStyle: 'italic', fontSize: '0.84375rem', color: 'var(--cs-texte-gris)', minWidth: '6.5rem', textAlign: 'center' }}>
        Page {page + 1} sur {nbPages}
      </span>
      <button aria-label="Page suivante" onClick={() => onPage(p => Math.min(nbPages - 1, p + 1))} disabled={page >= nbPages - 1} style={flecheBtn(page >= nbPages - 1)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  )
}

function flecheBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--cs-bord)',
    background: 'var(--cs-surface)', color: disabled ? 'var(--cs-bord)' : 'var(--cs-vert-aplat)', cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: disabled ? 'none' : '0 1px 5px rgba(60,50,30,0.06)', transition: 'color 0.12s, box-shadow 0.12s',
  }
}

const carteStyle: React.CSSProperties = { background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', overflow: 'hidden' }
const enteteColStyle: React.CSSProperties = { display: 'block', padding: '9px 16px', background: 'rgba(var(--cs-vert-rgb),0.06)', color: 'var(--cs-encre-fonce)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', minWidth: 0, letterSpacing: '0.01em' }
const texteBibleStyle: React.CSSProperties = { fontSize: '0.875rem', color: 'var(--cs-texte)', lineHeight: 1.58, margin: 0, textAlign: 'justify' }
const textePatristiqueStyle: React.CSSProperties = { fontSize: '0.875rem', color: 'var(--cs-texte-fort)', lineHeight: 1.58, margin: 0, textAlign: 'justify', wordSpacing: '-0.02em' }
