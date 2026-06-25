'use client'

import React from 'react'
import { supabase, SiecleDisplay } from './adminShared'

export default function SectionAuteurs() {
  const [auteurs, setAuteurs] = React.useState<any[]>([])
  const [chargement, setChargement] = React.useState(true)
  const [edition, setEdition] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<Record<string, string>>({})
  const [ajout, setAjout] = React.useState(false)
  const [nouvel, setNouvel] = React.useState({ nom: '', dates: '', siecle: '', tradition: '', note: '', aire_geographique: '', langue_principale: '' })
  const [statut, setStatut] = React.useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [msgAjout, setMsgAjout] = React.useState<string | null>(null)
  const [recherche, setRecherche] = React.useState('')
  const [photos, setPhotos] = React.useState<Record<string, boolean>>({})
  const photoRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  // Vérifier quels auteurs ont une photo
  React.useEffect(() => {
    supabase.storage.from('auteurs').list('').then(({ data }) => {
      if (!data) return
      const map: Record<string, boolean> = {}
      data.forEach(f => { map[f.name.replace('.jpg', '')] = true })
      setPhotos(map)
    })
  }, [])

  const uploadPhoto = async (idAuteur: string, fichier: File) => {
    const { error } = await supabase.storage.from('auteurs').upload(`${idAuteur}.jpg`, fichier, { upsert: true, contentType: 'image/jpeg' })
    if (!error) setPhotos(prev => ({ ...prev, [idAuteur]: true }))
    else alert('Erreur upload : ' + error.message)
  }

  React.useEffect(() => {
    supabase.from('auteurs').select('*').order('nom', { ascending: true })
      .then(({ data }) => { setAuteurs(data ?? []); setChargement(false) })
  }, [])

  const ouvrir = (a: any) => { setEdition(a.id_auteur); setForm({ ...a }); setStatut(null) }
  const fermer = () => { setEdition(null); setForm({}) }

  const sauvegarder = async () => {
    if (!edition) return
    const res = await fetch('/api/admin/update-auteur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_auteur: edition, champs: form }),
    })
    const json = await res.json()
    if (!res.ok) { setStatut({ id: edition, ok: false, msg: json.error ?? 'Erreur.' }); return }
    setAuteurs(prev => prev.map(a => a.id_auteur === edition ? { ...a, ...form } : a))
    setStatut({ id: edition, ok: true, msg: 'Enregistré.' })
    setTimeout(() => { setStatut(null); fermer() }, 1200)
  }

  const creer = async () => {
    if (!nouvel.nom.trim()) { setMsgAjout('Le nom est requis.'); return }
    const { data: derniers } = await supabase.from('auteurs').select('id_auteur').order('id_auteur', { ascending: false }).limit(1)
    let prochainNum = 1
    if (derniers && derniers.length > 0) {
      const num = parseInt((derniers[0].id_auteur as string).replace('A', ''), 10)
      if (!isNaN(num)) prochainNum = num + 1
    }
    const idAuteur = `A${String(prochainNum).padStart(4, '0')}`
    const { data, error } = await supabase.from('auteurs').insert({
      id_auteur: idAuteur,
      nom: nouvel.nom.trim(),
      dates: nouvel.dates || null,
      siecle: nouvel.siecle || null,
      tradition: nouvel.tradition || null,
      note: nouvel.note || null,
      aire_geographique: nouvel.aire_geographique || null,
      langue_principale: nouvel.langue_principale || null,
    }).select().single()
    if (error) { setMsgAjout('Erreur : ' + error.message); return }
    setAuteurs(prev => [...prev, data])
    setAjout(false)
    setNouvel({ nom: '', dates: '', siecle: '', tradition: '', note: '', aire_geographique: '', langue_principale: '' })
    setMsgAjout(null)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: '12px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#f9f7f4', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '3px' }

  const CHAMPS: { key: string; label: string; type?: string }[] = [
    { key: 'nom', label: 'Nom *' },
    { key: 'dates', label: 'Dates (ex. 354-430)' },
    { key: 'siecle', label: 'Siècle', type: 'number' },
    { key: 'tradition', label: 'Tradition', type: 'select' },
    { key: 'aire_geographique', label: 'Aire géographique' },
    { key: 'langue_principale', label: 'Langue principale' },
    { key: 'note', label: 'Note' },
  ]

  if (chargement) return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
        <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher un auteur…"
          style={{ flex: 1, fontSize: '12px', padding: '6px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', outline: 'none' }} />
        {recherche && <button onClick={() => setRecherche('')} style={{ fontSize: '11px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
      </div>

      {/* Bouton nouvel auteur */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button onClick={() => { setAjout(!ajout); setMsgAjout(null) }}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: ajout ? '#2e5440' : '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {ajout ? 'Annuler' : '+ Nouvel auteur'}
        </button>
      </div>

      {/* Formulaire nouvel auteur */}
      {ajout && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '16px 20px', marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '14px' }}>Nouvel auteur</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            {CHAMPS.map(c => (
              <div key={c.key} style={c.key === 'note' ? { gridColumn: '1 / -1' } : {}}>
                <label style={labelStyle}>{c.key === 'note' ? 'NOTE' : c.label.toUpperCase()}</label>
                {c.key === 'note'
                  ? <textarea value={(nouvel as any)[c.key]} onChange={e => setNouvel(p => ({ ...p, [c.key]: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  : c.type === 'select'
                  ? <select value={(nouvel as any)[c.key]} onChange={e => setNouvel(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyle}>
                      <option value="">— Choisir —</option>
                      {['apostolique','apologétique','alexandrine','antiochienne','cappadocienne','latine','africaine','syriaque','monastique','liturgique','conciliaire','pastorale'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  : <input type={c.type === 'number' ? 'number' : 'text'} value={(nouvel as any)[c.key]} onChange={e => setNouvel(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyle} placeholder={c.key === 'nom' ? "Augustin d'Hippone" : c.key === 'siecle' ? '5 (négatif = av. J.-C.)' : ''} />
                }
              </div>
            ))}
          </div>
          {msgAjout && <p style={{ fontSize: '11.5px', color: '#c0562a', marginBottom: '8px' }}>{msgAjout}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => { setAjout(false); setMsgAjout(null) }} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
            <button onClick={creer} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer</button>
          </div>
        </div>
      )}

      {/* Liste des auteurs — groupés par siècle, triés alphabétiquement */}
      {(() => {
        const auteursFiltres = recherche.trim()
          ? auteurs.filter((a: any) => a.nom.toLowerCase().startsWith(recherche.toLowerCase()))
          : auteurs
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {auteursFiltres.length === 0 && (
              <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', padding: '12px 0' }}>Aucun auteur trouvé.</p>
            )}
            {auteursFiltres.map((a: any) => (
              <div key={a.id_auteur} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: '14px', color: '#2a3d30' }}>{a.nom}</span>
                      {a.dates && <span style={{ fontSize: '11px', color: '#9a958d' }}>{a.dates}</span>}
                      {a.siecle && <span style={{ fontSize: '10.5px', color: '#9a958d' }}><SiecleDisplay n={parseInt(a.siecle)} /></span>}
                      {a.tradition && <span style={{ fontSize: '10.5px', color: '#9a958d', background: '#eeeae4', padding: '1px 6px', borderRadius: '3px' }}>{a.tradition}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                      <code style={{ fontSize: '10px', background: '#f0ece6', padding: '2px 6px', borderRadius: '3px', color: '#6b6560' }}>{a.id_auteur}</code>
                      <button
                        onClick={() => photoRefs.current[a.id_auteur]?.click()}
                        title={photos[a.id_auteur] ? 'Remplacer la photo' : 'Ajouter une photo'}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${photos[a.id_auteur] ? '#3d6b4f' : '#d6d0c4'}`, background: photos[a.id_auteur] ? 'rgba(61,107,79,0.08)' : '#fff', color: photos[a.id_auteur] ? '#3d6b4f' : '#9a958d', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {photos[a.id_auteur] ? '✓ Photo' : '+ Photo'}
                      </button>
                      <input ref={el => { photoRefs.current[a.id_auteur] = el }} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          // Renommer automatiquement en id_auteur.jpg
                          const blob = f.slice(0, f.size, 'image/jpeg')
                          const fichierRenomme = new File([blob], `${a.id_auteur}.jpg`, { type: 'image/jpeg' })
                          await uploadPhoto(a.id_auteur, fichierRenomme)
                          e.target.value = ''
                        }} />
                      <button onClick={() => edition === a.id_auteur ? fermer() : ouvrir(a)}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer' }}>
                        {edition === a.id_auteur ? 'Fermer' : 'Modifier'}
                      </button>
                    </div>
                  </div>
                  {edition === a.id_auteur && (
                    <div style={{ padding: '14px 16px 16px', borderTop: '1px solid #f0ece6', background: '#faf8f4' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {CHAMPS.map(c => (
                          <div key={c.key} style={c.key === 'note' ? { gridColumn: '1 / -1' } : {}}>
                            <label style={labelStyle}>{c.label.toUpperCase()}</label>
                            {c.key === 'note'
                              ? <textarea value={form[c.key] ?? ''} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                              : c.type === 'select'
                              ? <select value={form[c.key] ?? ''} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyle}>
                                  <option value="">— Choisir —</option>
                                  {['apostolique','apologétique','alexandrine','antiochienne','cappadocienne','latine','africaine','syriaque','monastique','liturgique','conciliaire','pastorale'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              : <input type={c.type === 'number' ? 'number' : 'text'} value={form[c.key] ?? ''} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyle} />
                            }
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {statut?.id === a.id_auteur && (
                          <span style={{ fontSize: '11.5px', color: statut?.ok ? '#3d6b4f' : '#c0562a' }}>
                            {statut?.ok ? '✓' : '✗'} {statut?.msg}
                          </span>
                        )}
                        <button onClick={fermer} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                        <button onClick={sauvegarder} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
                      </div>
                    </div>
                  )}
                </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}