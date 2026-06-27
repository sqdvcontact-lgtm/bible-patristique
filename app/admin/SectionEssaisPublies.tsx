'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EssaiPublie } from './adminTypes'

export default function SectionEssaisPublies({ essais: init, variante = 'publies' }: { essais: EssaiPublie[]; variante?: 'publies' | 'brouillons' }) {
  const [essais, setEssais] = useState(init)
  const [action, setAction] = useState<Record<number, 'loading' | 'ok'>>({})
  const estBrouillons = variante === 'brouillons'

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer définitivement cet essai et ses commentaires ?')) return
    setAction(p => ({ ...p, [id]: 'loading' }))
    const res = await fetch('/api/admin/essai-supprimer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setEssais(prev => prev.filter(e => e.id !== id))
    else setAction(p => { const c = { ...p }; delete c[id]; return c })
  }

  const demanderModification = async (id: number) => {
    const note = window.prompt("Commentaire transmis à l'auteur pour améliorer ou reprendre l'essai :")
    if (note === null) return
    if (!note.trim()) {
      window.alert('Merci d’indiquer une consigne pour l’auteur.')
      return
    }
    setAction(p => ({ ...p, [id]: 'loading' }))
    const res = await fetch('/api/admin/essai-demander-modification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, note: note.trim() }) })
    if (res.ok) { setAction(p => ({ ...p, [id]: 'ok' })); setTimeout(() => setEssais(prev => prev.filter(e => e.id !== id)), 800) }
    else setAction(p => { const c = { ...p }; delete c[id]; return c })
  }

  if (essais.length === 0) {
    return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>{estBrouillons ? "Aucun brouillon pour l'instant." : "Aucun essai publié pour l'instant."}</p>
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
        <thead>
          <tr style={{ background: '#faf8f4', borderBottom: '1px solid #e4dfd8' }}>
            <Th>Titre</Th>
            <Th>Auteur</Th>
            <Th>Dates</Th>
            <Th>Activité</Th>
            <Th>Signalements</Th>
            <Th>Statut</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {essais.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #f0ece6' }}>
              <Td>
                <Link href={estBrouillons ? `/essais/${e.id}/modifier` : `/essais/${e.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12.5px', color: '#1e2e24', textDecoration: 'none', fontWeight: 600 }}>{e.titre} ↗</Link>
                {e.sous_titre && <p style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic', margin: '2px 0 0' }}>{e.sous_titre}</p>}
                <p style={{ fontSize: '10px', color: '#b0a89e', margin: '3px 0 0' }}>#{e.id} · {e.nb_signes.toLocaleString('fr')} signes</p>
              </Td>
              <Td>{e.auteur}</Td>
              <Td>
                <DateInfo label={estBrouillons ? 'Créé' : 'Publié'} valeur={estBrouillons ? e.created_at : e.publie_at} />
                <DateInfo label="Modifié" valeur={e.updated_at} discret />
              </Td>
              <Td>
                <Info label="vues" valeur={e.nb_vues} />
                <Info label="cœurs" valeur={e.nb_likes} />
                <Info label="commentaires" valeur={e.nb_commentaires} />
              </Td>
              <Td><Info label="signalements" valeur={e.nb_signalements} alerte={e.nb_signalements > 0} /></Td>
              <Td><span style={{ fontSize: '10.5px', color: estBrouillons ? '#9a5a2a' : '#3d6b4f', fontWeight: 700 }}>{estBrouillons ? 'Brouillon' : 'Publié'}</span></Td>
              <Td align="right">
                {action[e.id] === 'ok' ? (
                  <span style={{ fontSize: '11px', color: '#3d6b4f', fontWeight: 600 }}>✓ Renvoyé</span>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Link href={`/essais/${e.id}/modifier`} style={petitBouton('#3d6b4f', '#d6d0c4')}>Modifier</Link>
                    {!estBrouillons && (
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
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ padding: '8px 10px', fontSize: '9.5px', color: '#8a8278', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: align, fontWeight: 700 }}>{children}</th>
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '9px 10px', verticalAlign: 'top', fontSize: '11.5px', color: '#4a4540', textAlign: align }}>{children}</td>
}

function DateInfo({ label, valeur, discret = false }: { label: string; valeur: string | null; discret?: boolean }) {
  if (!valeur) return <p style={{ fontSize: '10.5px', color: '#b0a89e', margin: '0 0 2px' }}>{label} : —</p>
  return (
    <p style={{ fontSize: '10.5px', color: discret ? '#b0a89e' : '#6b6560', margin: '0 0 2px', whiteSpace: 'nowrap' }}>
      {label} : {new Date(valeur).toLocaleDateString('fr-FR')}
    </p>
  )
}

function Info({ label, valeur, alerte = false }: { label: string; valeur: number; alerte?: boolean }) {
  return (
    <span style={{ display: 'block', fontSize: '10.5px', color: alerte ? '#c0562a' : '#9a958d', whiteSpace: 'nowrap', marginBottom: '2px' }}>
      <strong style={{ color: alerte ? '#c0562a' : '#6b6560', fontWeight: 600 }}>{Number(valeur ?? 0).toLocaleString('fr')}</strong> {label}
    </span>
  )
}

function petitBouton(couleur: string, bordure: string): React.CSSProperties {
  return { fontSize: '10.5px', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${bordure}`, background: '#fff', color: couleur, cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }
}
