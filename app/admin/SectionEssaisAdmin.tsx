'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Essai, EssaiPublie } from './adminTypes'

type SousOnglet = 'moderation' | 'archive'
type Dir = 'asc' | 'desc'

export default function SectionEssaisAdmin({
  essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, actionPublierEssai, actionRenvoyerBrouillonEssai,
}: {
  essaisEnAttente: Essai[]
  essaisModification: Essai[]
  essaisPublies: EssaiPublie[]
  essaisBrouillons: EssaiPublie[]
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number, note: string, refus?: boolean) => Promise<void>
}) {
  const [sous, setSous] = useState<SousOnglet>('moderation')
  const nbModeration = essaisEnAttente.length + essaisModification.length

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', marginBottom: '20px', alignItems: 'flex-end' }}>
        {([
          { key: 'moderation' as const, label: 'À modérer', badge: nbModeration },
          { key: 'archive' as const, label: 'Publiés & brouillons', badge: 0 },
        ]).map(o => (
          <button key={o.key} onClick={() => setSous(o.key)}
            style={{ padding: '9px 14px', fontSize: '12px', fontWeight: sous === o.key ? 600 : 400, color: sous === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: sous === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            {o.label}
            {o.badge > 0 && <span style={{ fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600 }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {/* Débordement négatif pour utiliser toute la largeur disponible */}
      <div style={{ margin: '0 -24px' }}>
        {sous === 'moderation' && (
          <TableModeration
            essais={[
              ...essaisEnAttente.map(e => ({ ...e, _groupe: 'validation' as const })),
              ...essaisModification.map(e => ({ ...e, _groupe: 'modification' as const })),
            ]}
            actionPublierEssai={actionPublierEssai}
            actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
          />
        )}

        {sous === 'archive' && (
          <TableArchive
            essais={[
              ...essaisPublies.map(e => ({ ...e, _variante: 'publie' as const })),
              ...essaisBrouillons.map(e => ({ ...e, _variante: 'brouillon' as const })),
            ]}
          />
        )}
      </div>
    </div>
  )
}

/* ── Table modération ── */

type EssaiMod = Essai & { _groupe: 'validation' | 'modification' }
type SortMod = 'titre' | 'auteur' | 'statut' | 'date'

function TableModeration({ essais: init, actionPublierEssai, actionRenvoyerBrouillonEssai }: {
  essais: EssaiMod[]
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number, note: string, refus?: boolean) => Promise<void>
}) {
  const [essais, setEssais] = useState(init)
  const [action, setAction] = useState<Record<number, 'loading' | 'publie' | 'renvoye'>>({})
  const [sortCol, setSortCol] = useState<SortMod>('date')
  const [sortDir, setSortDir] = useState<Dir>('desc')

  const toggleSort = (col: SortMod) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...essais].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'titre') cmp = a.titre.localeCompare(b.titre, 'fr')
    else if (sortCol === 'auteur') cmp = (a.auteur_pseudo ?? '').localeCompare(b.auteur_pseudo ?? '', 'fr')
    else if (sortCol === 'statut') cmp = a._groupe.localeCompare(b._groupe)
    else if (sortCol === 'date') cmp = (a.created_at ?? '').localeCompare(b.created_at ?? '')
    return sortDir === 'asc' ? cmp : -cmp
  })

  const publier = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionPublierEssai(id)
    setAction(p => ({ ...p, [id]: 'publie' }))
    setTimeout(() => setEssais(p => p.filter(e => e.id !== id)), 700)
  }

  const renvoyer = async (id: number, refus = false) => {
    const note = window.prompt(refus ? "Motif du refus transmis à l'auteur :" : "Commentaire transmis à l'auteur :")
    if (note === null) return
    if (!note.trim()) { window.alert("Merci d'indiquer un motif ou une consigne pour l'auteur."); return }
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionRenvoyerBrouillonEssai(id, note.trim(), refus)
    setAction(p => ({ ...p, [id]: 'renvoye' }))
    setTimeout(() => setEssais(p => p.filter(e => e.id !== id)), 700)
  }

  if (essais.length === 0) {
    return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', padding: '0 24px' }}>Aucun essai en attente de modération.</p>
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e4dfd8', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '32%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr style={{ background: '#faf8f4', borderBottom: '1px solid #e4dfd8' }}>
            <ThSort label="Titre" active={sortCol === 'titre'} dir={sortDir} onClick={() => toggleSort('titre')} />
            <ThSort label="Auteur" active={sortCol === 'auteur'} dir={sortDir} onClick={() => toggleSort('auteur')} />
            <ThSort label="Statut" active={sortCol === 'statut'} dir={sortDir} onClick={() => toggleSort('statut')} />
            <ThSort label="Dates" active={sortCol === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
            <Th>Activité</Th>
            <Th>Signalements</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #f0ece6' }}>
              <Td>
                <Link href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#1e2e24', textDecoration: 'none', fontWeight: 600 }}>{e.titre} ↗</Link>
                {e.sous_titre && <p style={{ fontSize: '10px', color: '#9a958d', fontStyle: 'italic', margin: '2px 0 0' }}>{e.sous_titre}</p>}
                <p style={{ fontSize: '9.5px', color: '#b0a89e', margin: '2px 0 0' }}>#{e.id}</p>
              </Td>
              <Td>{e.auteur_pseudo ?? '—'}</Td>
              <Td>
                <span style={{ fontSize: '10px', fontWeight: 700, color: e._groupe === 'modification' ? '#9a5a2a' : '#3d6b4f' }}>
                  {e._groupe === 'modification' ? 'À modifier' : 'En attente'}
                </span>
              </Td>
              <Td>
                <DateInfo label="Soumis" valeur={e.created_at} />
                <DateInfo label="Modifié" valeur={e.updated_at ?? null} discret />
              </Td>
              <Td><span style={{ fontSize: '10px', color: '#b0a89e' }}>—</span></Td>
              <Td><span style={{ fontSize: '10px', color: '#b0a89e' }}>—</span></Td>
              <Td align="right">
                {action[e.id] === 'loading' ? (
                  <span style={{ fontSize: '10.5px', color: '#9a958d' }}>…</span>
                ) : action[e.id] === 'publie' ? (
                  <span style={{ fontSize: '10.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Publié</span>
                ) : action[e.id] === 'renvoye' ? (
                  <span style={{ fontSize: '10.5px', color: '#c0562a' }}>Renvoyé</span>
                ) : (
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={() => renvoyer(e.id)} style={petitBouton('#6b6560', '#d6d0c4')}>Renvoyer</button>
                    <button onClick={() => renvoyer(e.id, true)} style={petitBouton('#c0562a', '#e4c4b8')}>Refus</button>
                    <button onClick={() => publier(e.id)} style={petitBouton('#3d6b4f', '#b4d4c0')}>Publier ✓</button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Table archive ── */

type EssaiArchive = EssaiPublie & { _variante: 'publie' | 'brouillon' }
type SortArchive = 'titre' | 'auteur' | 'statut' | 'date' | 'vues' | 'signalements'

function TableArchive({ essais: init }: { essais: EssaiArchive[] }) {
  const [essais, setEssais] = useState(init)
  const [action, setAction] = useState<Record<number, 'loading' | 'ok'>>({})
  const [sortCol, setSortCol] = useState<SortArchive>('date')
  const [sortDir, setSortDir] = useState<Dir>('desc')

  const toggleSort = (col: SortArchive) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'titre' || col === 'auteur' || col === 'statut' ? 'asc' : 'desc') }
  }

  const sorted = [...essais].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'titre') cmp = a.titre.localeCompare(b.titre, 'fr')
    else if (sortCol === 'auteur') cmp = a.auteur.localeCompare(b.auteur, 'fr')
    else if (sortCol === 'statut') cmp = a._variante.localeCompare(b._variante)
    else if (sortCol === 'date') cmp = ((a._variante === 'publie' ? a.publie_at : a.created_at) ?? '').localeCompare((b._variante === 'publie' ? b.publie_at : b.created_at) ?? '')
    else if (sortCol === 'vues') cmp = a.nb_vues - b.nb_vues
    else if (sortCol === 'signalements') cmp = a.nb_signalements - b.nb_signalements
    return sortDir === 'asc' ? cmp : -cmp
  })

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer définitivement cet essai et ses commentaires ?')) return
    setAction(p => ({ ...p, [id]: 'loading' }))
    const res = await fetch('/api/admin/essai-supprimer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setEssais(p => p.filter(e => e.id !== id))
    else setAction(p => { const c = { ...p }; delete c[id]; return c })
  }

  const demanderModification = async (id: number) => {
    const note = window.prompt("Commentaire transmis à l'auteur pour améliorer ou reprendre l'essai :")
    if (note === null) return
    if (!note.trim()) { window.alert("Merci d'indiquer une consigne pour l'auteur."); return }
    setAction(p => ({ ...p, [id]: 'loading' }))
    const res = await fetch('/api/admin/essai-demander-modification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, note: note.trim() }) })
    if (res.ok) { setAction(p => ({ ...p, [id]: 'ok' })); setTimeout(() => setEssais(p => p.filter(e => e.id !== id)), 800) }
    else setAction(p => { const c = { ...p }; delete c[id]; return c })
  }

  if (essais.length === 0) {
    return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', padding: '0 24px' }}>Aucun essai publié ni brouillon pour l'instant.</p>
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e4dfd8', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <thead>
          <tr style={{ background: '#faf8f4', borderBottom: '1px solid #e4dfd8' }}>
            <ThSort label="Titre" active={sortCol === 'titre'} dir={sortDir} onClick={() => toggleSort('titre')} />
            <ThSort label="Auteur" active={sortCol === 'auteur'} dir={sortDir} onClick={() => toggleSort('auteur')} />
            <ThSort label="Statut" active={sortCol === 'statut'} dir={sortDir} onClick={() => toggleSort('statut')} />
            <ThSort label="Dates" active={sortCol === 'date'} dir={sortDir} onClick={() => toggleSort('date')} />
            <ThSort label="Activité" active={sortCol === 'vues'} dir={sortDir} onClick={() => toggleSort('vues')} />
            <ThSort label="Signalements" active={sortCol === 'signalements'} dir={sortDir} onClick={() => toggleSort('signalements')} />
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(e => {
            const estBrouillon = e._variante === 'brouillon'
            return (
              <tr key={e.id} style={{ borderBottom: '1px solid #f0ece6' }}>
                <Td>
                  <Link href={estBrouillon ? `/essais/${e.id}/modifier` : `/essais/${e.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#1e2e24', textDecoration: 'none', fontWeight: 600 }}>{e.titre} ↗</Link>
                  {e.sous_titre && <p style={{ fontSize: '10px', color: '#9a958d', fontStyle: 'italic', margin: '2px 0 0' }}>{e.sous_titre}</p>}
                  <p style={{ fontSize: '9.5px', color: '#b0a89e', margin: '2px 0 0' }}>#{e.id} · {e.nb_signes.toLocaleString('fr')} signes</p>
                </Td>
                <Td>{e.auteur}</Td>
                <Td>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: estBrouillon ? '#9a5a2a' : '#3d6b4f' }}>
                    {estBrouillon ? 'Brouillon' : 'Publié'}
                  </span>
                </Td>
                <Td>
                  <DateInfo label={estBrouillon ? 'Créé' : 'Publié'} valeur={estBrouillon ? e.created_at : e.publie_at} />
                  <DateInfo label="Modifié" valeur={e.updated_at} discret />
                </Td>
                <Td>
                  <CountInfo label="vues" valeur={e.nb_vues} />
                  <CountInfo label="cœurs" valeur={e.nb_likes} />
                  <CountInfo label="comm." valeur={e.nb_commentaires} />
                </Td>
                <Td><CountInfo label="signalements" valeur={e.nb_signalements} alerte={e.nb_signalements > 0} /></Td>
                <Td align="right">
                  {action[e.id] === 'ok' ? (
                    <span style={{ fontSize: '10.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Renvoyé</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Link href={`/essais/${e.id}/modifier`} style={petitBouton('#3d6b4f', '#d6d0c4')}>Modifier</Link>
                      {!estBrouillon && (
                        <button onClick={() => demanderModification(e.id)} disabled={action[e.id] === 'loading'} style={petitBouton('#9a5a2a', '#e4d2bd')}>
                          Renvoyer
                        </button>
                      )}
                      <button onClick={() => supprimer(e.id)} disabled={action[e.id] === 'loading'} style={petitBouton('#c0562a', '#e4c4b8')}>
                        Supprimer
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Helpers ── */

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ padding: '7px 8px', fontSize: '9px', color: '#8a8278', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: align, fontWeight: 700 }}>{children}</th>
}

function ThSort({ label, active, dir, onClick }: { label: string; active: boolean; dir: Dir; onClick: () => void }) {
  return (
    <th onClick={onClick} style={{ padding: '7px 8px', fontSize: '9px', color: active ? '#3d6b4f' : '#8a8278', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left', fontWeight: 700, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label} <span style={{ opacity: active ? 1 : 0.3, fontSize: '8px' }}>{active && dir === 'desc' ? '▼' : '▲'}</span>
    </th>
  )
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '8px 8px', verticalAlign: 'top', fontSize: '11px', color: '#4a4540', textAlign: align, overflow: 'hidden' }}>{children}</td>
}

function DateInfo({ label, valeur, discret = false }: { label: string; valeur: string | null | undefined; discret?: boolean }) {
  if (!valeur) return <p style={{ fontSize: '10px', color: '#b0a89e', margin: '0 0 1px' }}>{label} : —</p>
  return (
    <p style={{ fontSize: '10px', color: discret ? '#b0a89e' : '#6b6560', margin: '0 0 1px', whiteSpace: 'nowrap' }}>
      {label} : {new Date(valeur).toLocaleDateString('fr-FR')}
    </p>
  )
}

function CountInfo({ label, valeur, alerte = false }: { label: string; valeur: number; alerte?: boolean }) {
  return (
    <span style={{ display: 'block', fontSize: '10px', color: alerte ? '#c0562a' : '#9a958d', whiteSpace: 'nowrap', marginBottom: '1px' }}>
      <strong style={{ color: alerte ? '#c0562a' : '#6b6560', fontWeight: 600 }}>{Number(valeur ?? 0).toLocaleString('fr')}</strong> {label}
    </span>
  )
}

function petitBouton(couleur: string, bordure: string): React.CSSProperties {
  return { fontSize: '10px', padding: '3px 7px', borderRadius: '4px', border: `1px solid ${bordure}`, background: '#fff', color: couleur, cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }
}
