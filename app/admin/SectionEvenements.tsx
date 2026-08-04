'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { Auteur } from './adminTypes'

// Curation de la chronologie : événements centraux et leurs associations aux auteurs.
// On NE crée ni ne corrige de données historiques ici (elles sont fournies séparément,
// charte §26.2) ; on édite, on contrôle, on relie à des auteurs EXISTANTS. Supprimer une
// association ne touche jamais l'événement central.

type Evt = {
  id: string; date_debut: number; date_fin: number; date_exacte: string | null
  qualification_date: string; titre: string; notice: string | null; lieu: string | null
  importance_generale: string | null; genre_id: string; portee: string
  note_datation: string | null; source_principale: string; source_secondaire: string | null
  origine_donnee: string; statut_source: string; oeuvre_id: string | null; est_publie: boolean
}
type Assoc = {
  id: number; auteur_id: string; evenement_id: string; nature_lien: string; pertinence: string
  justification: string; titre_personnalise: string | null; notice_personnalisee: string | null
  source_lien: string; commentaire: string | null; est_affiche: boolean; a_controler: boolean; ordre_force: number | null
}
type Genre = { id: string; nom: string; famille: string }

const QUALIFS = ['exacte', 'année certaine', 'vers', 'entre', 'après', 'avant', 'traditionnellement', 'période']
const PORTEES = ['générale', 'biographique', 'bibliographique']
const IMPORTANCES = ['A — structurant', 'B — majeur', 'C — complément']
const STATUTS = ['sourcé', 'à consolider']
const NATURES = ['direct', 'biographique', 'bibliographique', 'doctrinal', 'géographique', 'institutionnel', 'politique', 'contextuel', 'réception']
const PERTINENCES = ['indispensable', 'utile', 'secondaire']

const champ: React.CSSProperties = { width: '100%', fontSize: '0.83rem', padding: '5px 8px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const label: React.CSSProperties = { display: 'block', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', color: '#8a8278', textTransform: 'uppercase', margin: '0 0 3px' }
const btn = (bg: string, fg: string, bd?: string): React.CSSProperties => ({ fontSize: '0.79rem', padding: '5px 12px', borderRadius: '5px', border: bd ? `1px solid ${bd}` : 'none', background: bg, color: fg, cursor: 'pointer', fontWeight: 600 })

function Selecteur({ value, onChange, options, vide }: { value: string; onChange: (v: string) => void; options: string[]; vide?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={champ}>
      {vide !== undefined && <option value="">{vide}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export default function SectionEvenements({ auteurs }: { auteurs: Auteur[] }) {
  const [evts, setEvts] = useState<Evt[] | null>(null)
  const [assocs, setAssocs] = useState<Assoc[]>([])
  const [genres, setGenres] = useState<Map<string, Genre>>(new Map())
  const [familles, setFamilles] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [fPortee, setFPortee] = useState('')
  const [fFamille, setFFamille] = useState('')
  const [seulControle, setSeulControle] = useState(false)
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const auteurNom = useMemo(() => new Map(auteurs.map(a => [a.id_auteur, a.nom])), [auteurs])
  const auteursTries = useMemo(() => [...auteurs].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), [auteurs])

  const charger = useCallback(async () => {
    const [ev, gr, fr, ae] = await Promise.all([
      supabase.from('evenements').select('*').order('date_debut', { ascending: true }),
      supabase.from('genres_evenements').select('id,nom,famille_id'),
      supabase.from('familles_evenements').select('id,nom,ordre').order('ordre', { ascending: true, nullsFirst: false }),
      supabase.from('auteurs_evenements').select('*'),
    ])
    const famNom = new Map<number, string>((fr.data ?? []).map((f: any) => [f.id, f.nom]))
    const gm = new Map<string, Genre>()
    ;(gr.data ?? []).forEach((g: any) => gm.set(g.id, { id: g.id, nom: g.nom, famille: famNom.get(g.famille_id) ?? '' }))
    setGenres(gm)
    setFamilles((fr.data ?? []).map((f: any) => f.nom))
    setEvts((ev.data ?? []) as Evt[])
    setAssocs((ae.data ?? []) as Assoc[])
  }, [])

  useEffect(() => { charger() }, [charger])

  const familleDe = (e: Evt) => genres.get(e.genre_id)?.famille ?? ''
  const genreNom = (e: Evt) => genres.get(e.genre_id)?.nom ?? ''
  const genresTries = useMemo(() => Array.from(genres.values()).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), [genres])

  const assocParEvt = useMemo(() => {
    const m = new Map<string, Assoc[]>()
    assocs.forEach(a => { const l = m.get(a.evenement_id) ?? []; l.push(a); m.set(a.evenement_id, l) })
    return m
  }, [assocs])
  const aControler = useMemo(() => assocs.filter(a => a.a_controler), [assocs])

  const liste = useMemo(() => {
    if (!evts) return []
    const t = q.trim().toLowerCase()
    return evts.filter(e => {
      if (t && !(e.titre.toLowerCase().includes(t) || e.id.toLowerCase().includes(t))) return false
      if (fPortee && e.portee !== fPortee) return false
      if (fFamille && familleDe(e) !== fFamille) return false
      if (seulControle && !(assocParEvt.get(e.id) ?? []).some(a => a.a_controler)) return false
      return true
    })
  }, [evts, q, fPortee, fFamille, seulControle, genres, assocParEvt])

  // ── Appels API ───────────────────────────────────────────────────────
  const appel = async (payload: object): Promise<boolean> => {
    setMsg('')
    const { data: session } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/evenements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session?.access_token}` },
      body: JSON.stringify(payload),
    })
    if (!res.ok) { const d = await res.json().catch(() => null); setMsg(d?.error ?? 'Erreur.'); return false }
    await charger()
    return true
  }
  const majEvt = (id: string, champs: object) => appel({ action: 'maj-evenement', id, champs })
  const majAssoc = (id: number, champs: object) => appel({ action: 'maj-association', id, champs })
  const supprAssoc = (id: number) => appel({ action: 'suppr-association', id })

  const anB = (n: number) => (n < 0 ? `${-n} av.` : String(n))
  const annees = (e: Evt) => (e.date_fin !== e.date_debut ? `${anB(e.date_debut)}–${anB(e.date_fin)}` : anB(e.date_debut))

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
      <p style={{ fontSize: '0.9rem', color: '#6b6560', lineHeight: 1.55, margin: '0 0 8px' }}>
        Curation de la <strong>chronologie</strong> : les événements centraux et leurs liens aux auteurs.
        On n'y invente ni ne corrige les données historiques (charte §26) ; on édite, on contrôle, on relie à
        des auteurs déjà répertoriés. <strong>Supprimer une association ne supprime jamais l'événement.</strong>
      </p>
      <p style={{ fontSize: '0.8rem', color: '#9a958d', margin: '0 0 18px' }}>
        {evts ? `${evts.length} événement${evts.length > 1 ? 's' : ''} · ${assocs.length} association${assocs.length > 1 ? 's' : ''} · ${aControler.length} à contrôler` : 'Chargement…'}
      </p>

      {msg && <p style={{ fontSize: '0.82rem', color: '#c0562a', background: '#fdf2ee', border: '1px solid #e4c4b8', borderRadius: '6px', padding: '7px 11px', margin: '0 0 16px' }}>{msg}</p>}

      {/* ── File « à contrôler » ─────────────────────────────────────── */}
      {aControler.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e7d3b8', borderRadius: '9px', padding: '14px 16px', marginBottom: '22px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9a5a2a', margin: '0 0 10px' }}>À contrôler ({aControler.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {aControler.map(a => {
              const e = evts?.find(x => x.id === a.evenement_id)
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', borderTop: '1px solid #f1ece0', paddingTop: '7px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9rem', color: '#1e2e24' }}>{auteurNom.get(a.auteur_id) ?? a.auteur_id}</span>
                    <span style={{ color: '#b0a89e', margin: '0 6px' }}>·</span>
                    <span style={{ fontSize: '0.82rem', color: '#5a5450' }}>{e?.titre ?? a.evenement_id}</span>
                    <span style={{ fontSize: '0.68rem', color: '#a89a80', marginLeft: '7px' }}>{a.nature_lien} · {a.pertinence}{a.est_affiche ? '' : ' · masquée'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => setOuvert(a.evenement_id)} style={{ ...btn('#fff', 'var(--cs-vert)', '#cdd8d0'), fontSize: '0.74rem' }}>Ouvrir</button>
                    <button onClick={() => majAssoc(a.id, { a_controler: false })} style={{ ...btn('var(--cs-vert)', '#fff'), fontSize: '0.74rem' }}>Marquer contrôlé</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filtres ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un titre ou un identifiant…" style={{ ...champ, flex: 1, minWidth: '12rem' }} />
        <select value={fPortee} onChange={e => setFPortee(e.target.value)} style={{ ...champ, width: 'auto' }}>
          <option value="">Toutes portées</option>
          {PORTEES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={fFamille} onChange={e => setFFamille(e.target.value)} style={{ ...champ, width: 'auto' }}>
          <option value="">Toutes familles</option>
          {familles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#6b6560', cursor: 'pointer' }}>
          <input type="checkbox" checked={seulControle} onChange={e => setSeulControle(e.target.checked)} /> à contrôler
        </label>
      </div>

      {/* ── Liste des événements ─────────────────────────────────────── */}
      {evts === null ? (
        <p style={{ fontSize: '0.86rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
      ) : liste.length === 0 ? (
        <p style={{ fontSize: '0.86rem', color: '#9a958d', fontStyle: 'italic' }}>Aucun événement pour ces critères.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {liste.map(e => {
            const liens = assocParEvt.get(e.id) ?? []
            const nControl = liens.filter(a => a.a_controler).length
            const estOuvert = ouvert === e.id
            return (
              <div key={e.id} style={{ background: '#fff', border: `1px solid ${estOuvert ? '#cdd8d0' : '#e4dfd8'}`, borderRadius: '8px', overflow: 'hidden' }}>
                <button onClick={() => setOuvert(estOuvert ? null : e.id)} style={{ display: 'grid', gridTemplateColumns: '5.5rem 1fr auto', gap: '12px', alignItems: 'center', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 13px' }}>
                  <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8rem', color: '#b7a06a', whiteSpace: 'nowrap' }}>{annees(e)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.92rem', color: '#1e2e24' }}>{e.titre}</span>
                    <span style={{ fontSize: '0.66rem', color: '#a89a80', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{e.portee} · {familleDe(e)}</span>
                  </span>
                  <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {!e.est_publie && <Etiquette texte="dépublié" coul="#c0562a" />}
                    {nControl > 0 && <Etiquette texte={`${nControl} à contrôler`} coul="#9a5a2a" />}
                    <span style={{ fontSize: '0.72rem', color: '#a89a80' }}>{liens.length} lien{liens.length > 1 ? 's' : ''}</span>
                    <span style={{ color: '#b0a89e', fontSize: '0.8rem' }}>{estOuvert ? '▲' : '▼'}</span>
                  </span>
                </button>

                {estOuvert && (
                  <EditeurEvenement
                    e={e} liens={liens} genresTries={genresTries} auteurNom={auteurNom} auteursTries={auteursTries}
                    onMajEvt={majEvt} onMajAssoc={majAssoc} onSupprAssoc={supprAssoc}
                    onCreerAssoc={(auteur_id, nature_lien, pertinence) => appel({ action: 'creer-association', evenement_id: e.id, auteur_id, nature_lien, pertinence, a_controler: true })}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Etiquette({ texte, coul }: { texte: string; coul: string }) {
  return <span style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: coul, background: `${coul}14`, border: `1px solid ${coul}40`, borderRadius: '999px', padding: '1px 8px' }}>{texte}</span>
}

// ── Éditeur d'un événement + ses associations ────────────────────────────
function EditeurEvenement({ e, liens, genresTries, auteurNom, auteursTries, onMajEvt, onMajAssoc, onSupprAssoc, onCreerAssoc }: {
  e: Evt; liens: Assoc[]; genresTries: Genre[]
  auteurNom: Map<string, string>; auteursTries: Auteur[]
  onMajEvt: (id: string, champs: object) => Promise<boolean>
  onMajAssoc: (id: number, champs: object) => Promise<boolean>
  onSupprAssoc: (id: number) => Promise<boolean>
  onCreerAssoc: (auteur_id: string, nature_lien: string, pertinence: string) => Promise<boolean>
}) {
  const [b, setB] = useState(e)
  useEffect(() => { setB(e) }, [e])
  const [envoi, setEnvoi] = useState(false)
  const set = (k: keyof Evt, v: any) => setB(p => ({ ...p, [k]: v }))
  const generale = b.portee === 'générale'

  const enregistrer = async () => {
    setEnvoi(true)
    await onMajEvt(e.id, {
      titre: b.titre, notice: b.notice, lieu: b.lieu, date_debut: b.date_debut, date_fin: b.date_fin,
      date_exacte: b.date_exacte, qualification_date: b.qualification_date, genre_id: b.genre_id, portee: b.portee,
      importance_generale: generale ? b.importance_generale : null, note_datation: b.note_datation,
      source_principale: b.source_principale, source_secondaire: b.source_secondaire, statut_source: b.statut_source,
      oeuvre_id: b.oeuvre_id, est_publie: b.est_publie,
    })
    setEnvoi(false)
  }

  return (
    <div style={{ borderTop: '1px solid #eee6da', background: '#fbf9f5', padding: '15px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px' }}>
        <div style={{ gridColumn: '1 / -1' }}><label style={label}>Titre</label><input style={champ} value={b.titre} onChange={ev => set('titre', ev.target.value)} /></div>
        <div><label style={label}>Année début</label><input type="number" style={champ} value={b.date_debut} onChange={ev => set('date_debut', ev.target.value === '' ? 0 : Number(ev.target.value))} /></div>
        <div><label style={label}>Année fin</label><input type="number" style={champ} value={b.date_fin} onChange={ev => set('date_fin', ev.target.value === '' ? 0 : Number(ev.target.value))} /></div>
        <div><label style={label}>Date exacte (affichée en infobulle)</label><input style={champ} value={b.date_exacte ?? ''} onChange={ev => set('date_exacte', ev.target.value)} placeholder="24 août 410" /></div>
        <div><label style={label}>Qualification</label><Selecteur value={b.qualification_date} onChange={v => set('qualification_date', v)} options={QUALIFS} /></div>
        <div><label style={label}>Portée</label><Selecteur value={b.portee} onChange={v => set('portee', v)} options={PORTEES} /></div>
        <div><label style={label}>Genre</label>
          <select value={b.genre_id} onChange={ev => set('genre_id', ev.target.value)} style={champ}>
            {genresTries.map(g => <option key={g.id} value={g.id}>{g.nom} — {g.famille}</option>)}
          </select>
        </div>
        <div><label style={label}>Importance {generale ? '' : '(portée générale seulement)'}</label>
          {generale ? <Selecteur value={b.importance_generale ?? ''} onChange={v => set('importance_generale', v)} options={IMPORTANCES} vide="—" />
            : <input style={{ ...champ, background: '#f2efe9', color: '#a89a80' }} value="—" disabled />}
        </div>
        <div><label style={label}>Lieu</label><input style={champ} value={b.lieu ?? ''} onChange={ev => set('lieu', ev.target.value)} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={label}>Notice</label><textarea style={{ ...champ, minHeight: '58px', resize: 'vertical' }} value={b.notice ?? ''} onChange={ev => set('notice', ev.target.value)} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={label}>Note de datation</label><input style={champ} value={b.note_datation ?? ''} onChange={ev => set('note_datation', ev.target.value)} /></div>
        <div><label style={label}>Source principale</label><input style={champ} value={b.source_principale} onChange={ev => set('source_principale', ev.target.value)} /></div>
        <div><label style={label}>Source secondaire</label><input style={champ} value={b.source_secondaire ?? ''} onChange={ev => set('source_secondaire', ev.target.value)} /></div>
        <div><label style={label}>Statut de la source</label><Selecteur value={b.statut_source} onChange={v => set('statut_source', v)} options={STATUTS} /></div>
        <div><label style={label}>Œuvre liée (id, facultatif)</label><input style={champ} value={b.oeuvre_id ?? ''} onChange={ev => set('oeuvre_id', ev.target.value)} placeholder="A0010O0001" /></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '13px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.83rem', color: '#3a3530', cursor: 'pointer' }}>
          <input type="checkbox" checked={b.est_publie} onChange={ev => set('est_publie', ev.target.checked)} /> Publié
        </label>
        <span style={{ fontSize: '0.68rem', color: '#b0a89e' }}>{e.id}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={enregistrer} disabled={envoi} style={btn('var(--cs-vert)', '#fff')}>{envoi ? 'Enregistrement…' : 'Enregistrer l’événement'}</button>
        </div>
      </div>

      {/* ── Associations aux auteurs ─────────────────────────────────── */}
      <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8278', margin: '20px 0 8px' }}>Associations aux auteurs ({liens.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {liens.map(a => (
          <LigneAssoc key={a.id} a={a} nom={auteurNom.get(a.auteur_id) ?? a.auteur_id} onMaj={onMajAssoc} onSuppr={onSupprAssoc} />
        ))}
        {liens.length === 0 && <p style={{ fontSize: '0.8rem', color: '#a89a80', fontStyle: 'italic', margin: 0 }}>Aucune association.</p>}
      </div>

      <AjoutAssoc auteursTries={auteursTries} dejaLies={new Set(liens.map(l => l.auteur_id))} onCreer={onCreerAssoc} />
    </div>
  )
}

// Une association éditable (nature, pertinence, titre personnalisé, drapeaux).
function LigneAssoc({ a, nom, onMaj, onSuppr }: { a: Assoc; nom: string; onMaj: (id: number, champs: object) => Promise<boolean>; onSuppr: (id: number) => Promise<boolean> }) {
  const [d, setD] = useState(a)
  useEffect(() => { setD(a) }, [a])
  const set = (k: keyof Assoc, v: any) => setD(p => ({ ...p, [k]: v }))
  const modifie = d.nature_lien !== a.nature_lien || d.pertinence !== a.pertinence || (d.titre_personnalise ?? '') !== (a.titre_personnalise ?? '')
  return (
    <div style={{ border: '1px solid #e7e1d6', borderRadius: '7px', padding: '10px 12px', background: a.a_controler ? '#fdf9f2' : '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9rem', color: '#1e2e24' }}>{nom}</span>
        <span style={{ fontSize: '0.66rem', color: '#b0a89e' }}>{a.auteur_id}</span>
        {a.a_controler && <Etiquette texte="à contrôler" coul="#9a5a2a" />}
        {!a.est_affiche && <Etiquette texte="masquée" coul="#8a8278" />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: '9px', alignItems: 'end' }}>
        <div><label style={label}>Nature du lien</label><Selecteur value={d.nature_lien} onChange={v => set('nature_lien', v)} options={NATURES} /></div>
        <div><label style={label}>Pertinence</label><Selecteur value={d.pertinence} onChange={v => set('pertinence', v)} options={PERTINENCES} /></div>
        <div><label style={label}>Titre personnalisé (facultatif)</label><input style={champ} value={d.titre_personnalise ?? ''} onChange={ev => set('titre_personnalise', ev.target.value)} placeholder="remplace le titre de l’événement" /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#3a3530', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.est_affiche} onChange={ev => { set('est_affiche', ev.target.checked); onMaj(a.id, { est_affiche: ev.target.checked }) }} /> Affichée
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#3a3530', cursor: 'pointer' }}>
          <input type="checkbox" checked={d.a_controler} onChange={ev => { set('a_controler', ev.target.checked); onMaj(a.id, { a_controler: ev.target.checked }) }} /> À contrôler
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {modifie && <button onClick={() => onMaj(a.id, { nature_lien: d.nature_lien, pertinence: d.pertinence, titre_personnalise: d.titre_personnalise })} style={{ ...btn('var(--cs-vert)', '#fff'), fontSize: '0.74rem' }}>Enregistrer</button>}
          <button onClick={() => { if (window.confirm(`Supprimer l’association de ${nom} ? L’événement central n’est pas touché.`)) onSuppr(a.id) }} style={{ ...btn('#fff', '#c0562a', '#e4c4b8'), fontSize: '0.74rem' }}>Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// Ajout d'une association vers un auteur EXISTANT (jamais de création d'auteur).
function AjoutAssoc({ auteursTries, dejaLies, onCreer }: { auteursTries: Auteur[]; dejaLies: Set<string>; onCreer: (auteur_id: string, nature_lien: string, pertinence: string) => Promise<boolean> }) {
  const [auteurId, setAuteurId] = useState('')
  const [nature, setNature] = useState('direct')
  const [pertinence, setPertinence] = useState('utile')
  const [envoi, setEnvoi] = useState(false)
  const ajouter = async () => {
    if (!auteurId) return
    setEnvoi(true)
    const ok = await onCreer(auteurId, nature, pertinence)
    setEnvoi(false)
    if (ok) setAuteurId('')
  }
  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e0d8cc', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
      <div><label style={label}>Relier un auteur répertorié</label>
        <select value={auteurId} onChange={ev => setAuteurId(ev.target.value)} style={champ}>
          <option value="">Choisir un auteur…</option>
          {auteursTries.map(a => <option key={a.id_auteur} value={a.id_auteur} disabled={dejaLies.has(a.id_auteur)}>{a.nom}{dejaLies.has(a.id_auteur) ? ' (déjà lié)' : ''}</option>)}
        </select>
      </div>
      <div><label style={label}>Nature</label><Selecteur value={nature} onChange={setNature} options={NATURES} /></div>
      <div><label style={label}>Pertinence</label><Selecteur value={pertinence} onChange={setPertinence} options={PERTINENCES} /></div>
      <button onClick={ajouter} disabled={!auteurId || envoi} style={{ ...btn('var(--cs-vert)', '#fff'), opacity: auteurId ? 1 : 0.5 }}>{envoi ? '…' : 'Relier'}</button>
    </div>
  )
}
