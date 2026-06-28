'use client'

import React from 'react'
import { supabase, parseCSV, telechargerCSVModele, headersAdmin } from './adminShared'
import type { Auteur } from './adminTypes'

const lbl: React.CSSProperties = { fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9a958d', display: 'block', marginBottom: '3px' }
const inp: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: '12px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#fff', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }
const sep: React.CSSProperties = { borderTop: '1px solid #ede9e2', gridColumn: '1 / -1', margin: '2px 0' }

// ── Genres ────────────────────────────────────────────────────────────────────
const GENRES_PAR_CATEGORIE: { cat: string; genres: string[] }[] = [
  { cat: 'Écriture & exégèse', genres: ['Commentaire biblique', 'Homélie exégétique', 'Chaîne (catena)', 'Scolie'] },
  { cat: 'Théologie', genres: ['Traité théologique', 'Apologie', 'Réfutation / Controverse', 'Symbole de foi', 'Questions & réponses'] },
  { cat: 'Pastorale & discipline', genres: ['Homélie / Sermon', 'Catéchèse / Mystagogíe', 'Lettre pastorale', 'Règle monastique', 'Droit canonique'] },
  { cat: 'Spiritualité & ascèse', genres: ['Sentence / Apophtegme', 'Traité ascétique', 'Hagiographie (vie de saint)', 'Actes de martyre', 'Récit monastique'] },
  { cat: 'Liturgie & prière', genres: ['Anaphore / Liturgie', 'Hymne', 'Prière / Invocation'] },
  { cat: 'Littérature', genres: ['Confession / Autobiographie', 'Poème', 'Dialogue philosophique', 'Florilège', 'Encyclopédie'] },
]
const TOUS_GENRES = GENRES_PAR_CATEGORIE.flatMap(c => c.genres)

function TagsGenres({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [nouveau, setNouveau] = React.useState(false)
  const [saisie, setSaisie] = React.useState('')
  const ajouter = (v: string) => { if (!tags.includes(v)) onChange([...tags, v]) }
  const supprimer = (v: string) => onChange(tags.filter(x => x !== v))
  const ajouterCustom = () => {
    const v = saisie.trim()
    if (v) { ajouter(v); setSaisie(''); setNouveau(false) }
  }

  return (
    <div>
      {/* Genres par catégorie */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        {GENRES_PAR_CATEGORIE.map(({ cat, genres }) => (
          <div key={cat} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '9px', color: '#b0a89e', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, minWidth: '130px' }}>{cat}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {genres.map(g => {
                const actif = tags.includes(g)
                return (
                  <button key={g} onClick={() => actif ? supprimer(g) : ajouter(g)}
                    style={{ fontSize: '10.5px', borderRadius: '3px', padding: '2px 8px', cursor: 'pointer', border: actif ? '1px solid rgba(61,107,79,0.35)' : '1px solid #d6d0c4', background: actif ? 'rgba(61,107,79,0.10)' : '#f7f4ef', color: actif ? '#2e5440' : '#6b6560', fontWeight: actif ? 600 : 400 }}>
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Nouveau genre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tags.length > 0 ? '8px' : '0' }}>
        {nouveau ? (
          <>
            <input value={saisie} onChange={e => setSaisie(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ajouterCustom(); if (e.key === 'Escape') { setNouveau(false); setSaisie('') } }}
              autoFocus
              style={{ ...inp, width: '180px', fontSize: '11px', padding: '4px 8px' }} />
            <button onClick={ajouterCustom} style={{ fontSize: '10.5px', padding: '3px 10px', borderRadius: '3px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer' }}>Ajouter</button>
            <button onClick={() => { setNouveau(false); setSaisie('') }} style={{ fontSize: '10.5px', padding: '3px 8px', borderRadius: '3px', border: '1px solid #d6d0c4', background: '#fff', color: '#9a958d', cursor: 'pointer' }}>Annuler</button>
          </>
        ) : (
          <button onClick={() => setNouveau(true)}
            style={{ fontSize: '10.5px', color: '#6b6560', border: '1px dashed #d6d0c4', background: 'transparent', borderRadius: '3px', padding: '2px 10px', cursor: 'pointer' }}>
            + Nouveau genre
          </button>
        )}
      </div>

      {/* Tags actifs */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '6px', borderTop: '1px solid #ede9e2' }}>
          {tags.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(61,107,79,0.10)', color: '#2e5440', border: '1px solid rgba(61,107,79,0.25)', borderRadius: '3px', padding: '1px 8px' }}>
              {t}
              <button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a958d', fontSize: '10px', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Combobox auteur ───────────────────────────────────────────────────────────
type AuteurOpt = { id_auteur: string; nom: string; dates?: string | null }

function ComboboxAuteur({ auteurs, value, onChange }: { auteurs: AuteurOpt[]; value: string; onChange: (id: string) => void }) {
  const [saisie, setSaisie] = React.useState('')
  const [ouvert, setOuvert] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const auteurActuel = auteurs.find(a => String(a.id_auteur) === value)

  const filtres = saisie.trim()
    ? auteurs.filter(a => a.nom.toLowerCase().includes(saisie.toLowerCase()))
    : auteurs

  React.useEffect(() => {
    const fermer = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', fermer)
    return () => document.removeEventListener('mousedown', fermer)
  }, [])

  const selectionner = (a: AuteurOpt) => {
    onChange(String(a.id_auteur))
    setSaisie('')
    setOuvert(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div style={{ display: 'flex', gap: '0', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#fff', overflow: 'hidden' }}>
        <input
          value={ouvert ? saisie : (auteurActuel ? `${auteurActuel.nom}${auteurActuel.dates ? ` (${auteurActuel.dates})` : ''}` : '')}
          onChange={e => { setSaisie(e.target.value); setOuvert(true) }}
          onFocus={() => setOuvert(true)}
          placeholder=""
          style={{ ...inp, border: 'none', flex: 1, borderRadius: 0, background: 'transparent' }}
        />
        {value && (
          <button onClick={() => { onChange(''); setSaisie(''); setOuvert(false) }}
            style={{ padding: '0 8px', background: 'none', border: 'none', color: '#b0a89e', cursor: 'pointer', fontSize: '12px' }}>✕</button>
        )}
      </div>
      {ouvert && filtres.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #d6d0c4', borderTop: 'none', borderRadius: '0 0 4px 4px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          {filtres.map(a => (
            <div key={a.id_auteur} onMouseDown={() => selectionner(a)}
              style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', background: String(a.id_auteur) === value ? 'rgba(61,107,79,0.08)' : '#fff', color: '#1e1a16', display: 'flex', gap: '8px', alignItems: 'baseline' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(61,107,79,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = String(a.id_auteur) === value ? 'rgba(61,107,79,0.08)' : '#fff')}>
              <span>{a.nom}</span>
              {a.dates && <span style={{ fontSize: '10.5px', color: '#9a958d' }}>{a.dates}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tags traditions ───────────────────────────────────────────────────────────
type NouvelAuteurForm = { nom: string; nom_original: string; date_naissance: string; date_mort: string; traditions: string[] }
const VIDE_AUTEUR: NouvelAuteurForm = { nom: '', nom_original: '', date_naissance: '', date_mort: '', traditions: [] }

function TagsTraditions({ tags, onChange, tousLesTags }: { tags: string[]; onChange: (t: string[]) => void; tousLesTags: string[] }) {
  const [saisie, setSaisie] = React.useState('')
  const ajouter = (v?: string) => {
    const val = (v ?? saisie).trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setSaisie('')
  }
  const supprimer = (v: string) => onChange(tags.filter(x => x !== v))
  const suggestions = tousLesTags.filter(t => !tags.includes(t) && (!saisie || t.toLowerCase().includes(saisie.toLowerCase())))
  return (
    <div>
      <input value={saisie} onChange={e => setSaisie(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); ajouter() } }}
        placeholder="" style={{ ...inp, marginBottom: '5px' }} />
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '5px' }}>
          {tags.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(61,107,79,0.10)', color: '#2e5440', border: '1px solid rgba(61,107,79,0.25)', borderRadius: '3px', padding: '1px 7px' }}>
              {t}<button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a958d', fontSize: '10px', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {suggestions.map(t => (
            <button key={t} onClick={() => ajouter(t)}
              style={{ fontSize: '10.5px', background: '#f7f4ef', color: '#6b6560', border: '1px solid #d6d0c4', borderRadius: '3px', padding: '1px 7px', cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
type MetaOeuvre = {
  id_auteur: string; titre: string; sous_titre: string; titre_original: string
  trad_auteur: string; editeur: string; collection: string
  ville: string; url_source: string; date_publication: string; date_composition: string
  genres: string[]; langue: string
}

const VIDE_META: MetaOeuvre = {
  id_auteur: '', titre: '', sous_titre: '', titre_original: '',
  trad_auteur: '', editeur: '', collection: '',
  ville: '', url_source: '', date_publication: '', date_composition: '',
  genres: [], langue: '',
}

type AuteurAvecDates = Auteur & { date_naissance?: string | null; date_mort?: string | null; traditions?: string[] | null }

// ── Composant principal ───────────────────────────────────────────────────────
export default function SectionAjouterOeuvre({ auteurs }: { auteurs: Auteur[] }) {
  const [etape, setEtape] = React.useState<'meta' | 'csv' | 'preview' | 'done'>('meta')
  const [meta, setMeta] = React.useState<MetaOeuvre>(VIDE_META)
  const set = (k: keyof MetaOeuvre, v: string) => setMeta(m => ({ ...m, [k]: v }))

  // Auteurs
  const [auteursCourants, setAuteursCourants] = React.useState<AuteurAvecDates[]>(auteurs as AuteurAvecDates[])
  React.useEffect(() => {
    supabase.from('auteurs')
      .select('id_auteur, nom, dates, date_naissance, date_mort, siecle, traditions, oeuvres(id_oeuvre, titre)')
      .order('nom', { ascending: true })
      .then(({ data }) => { if (data) setAuteursCourants(data as AuteurAvecDates[]) })
  }, [])

  const auteurSelectionne = auteursCourants.find(a => String(a.id_auteur) === meta.id_auteur) as AuteurAvecDates | undefined

  const dateCompositionAuto = React.useMemo(() => {
    if (!auteurSelectionne) return ''
    const dn = parseInt((auteurSelectionne as any).date_naissance ?? '')
    const dm = parseInt((auteurSelectionne as any).date_mort ?? '')
    if (isNaN(dn) || isNaN(dm)) return ''
    return `vers ${Math.round((dn + dm) / 2)}`
  }, [auteurSelectionne])

  const tousLesTags = React.useMemo(() => {
    const s = new Set<string>()
    auteursCourants.forEach(a => (a as any).traditions?.forEach((t: string) => s.add(t)))
    return [...s].sort()
  }, [auteursCourants])

  // Nouvel auteur
  const [ajoutAuteur, setAjoutAuteur] = React.useState(false)
  const [nouvelAuteur, setNouvelAuteur] = React.useState<NouvelAuteurForm>(VIDE_AUTEUR)
  const [auteurMsg, setAuteurMsg] = React.useState<string | null>(null)

  const creerAuteur = async () => {
    if (!nouvelAuteur.nom.trim()) { setAuteurMsg('Le nom est requis.'); return }
    const res = await fetch('/api/admin/auteur-creer', {
      method: 'POST',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(nouvelAuteur),
    })
    const json = await res.json()
    if (!res.ok) { setAuteurMsg('Erreur : ' + (json.error ?? 'inconnue')); return }
    const nouv = { ...json.auteur, oeuvres: [] } as AuteurAvecDates
    setAuteursCourants(prev => [...prev, nouv].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
    setMeta(m => ({ ...m, id_auteur: json.auteur.id_auteur }))
    setAjoutAuteur(false); setNouvelAuteur(VIDE_AUTEUR); setAuteurMsg(null)
  }

  // CSV
  const [segments, setSegments] = React.useState<Record<string, string>[]>([])
  const [nomFichier, setNomFichier] = React.useState('')
  const [csvErreur, setCsvErreur] = React.useState<string | null>(null)
  const inputCsvRef = React.useRef<HTMLInputElement | null>(null)

  const lireFichier = async (fichier: File) => {
    setCsvErreur(null)
    const texte = await fichier.text()
    const lignes = parseCSV(texte)
    if (lignes.length === 0) { setCsvErreur('Fichier vide ou non reconnu.'); return }
    if (!Object.keys(lignes[0]).includes('segment_texte')) { setCsvErreur('Colonne segment_texte manquante.'); return }
    setSegments(lignes); setNomFichier(fichier.name)
  }

  // Import
  const [importing, setImporting] = React.useState(false)
  const [resultat, setResultat] = React.useState<{ ok: boolean; msg: string; idOeuvre?: string } | null>(null)

  const confirmerImport = async () => {
    if (!meta.id_auteur || !meta.titre.trim()) { setCsvErreur('Titre et auteur sont requis.'); return }
    setImporting(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) { setResultat({ ok: false, msg: 'Session expirée. Reconnectez-vous.' }); setImporting(false); return }
    const dateComp = meta.date_composition.trim() || dateCompositionAuto || null
    const res = await fetch('/api/admin/import-oeuvre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ meta: { ...meta, titre: meta.titre.trim(), date_composition: dateComp }, segments }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.ok) { setResultat({ ok: false, msg: json.error ?? `Erreur (${res.status})` }); setImporting(false); return }
    setResultat({ ok: true, msg: `${json.count} segments importés.`, idOeuvre: json.idOeuvre })
    setEtape('done'); setImporting(false)
  }

  const reset = () => {
    setEtape('meta'); setMeta(VIDE_META)
    setSegments([]); setNomFichier(''); setCsvErreur(null); setResultat(null); setAjoutAuteur(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Étapes */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '4px' }}>
        {([['meta', 'Métadonnées'], ['csv', 'Import CSV'], ['preview', 'Prévisualisation']] as const).map(([k, l], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: etape === k ? 600 : 400, color: etape === k ? '#3d6b4f' : '#b0a89e' }}>{i + 1}. {l}</span>
            {i < 2 && <span style={{ margin: '0 10px', color: '#d6d0c4' }}>→</span>}
          </div>
        ))}
      </div>

      {/* ── ÉTAPE 1 ── */}
      {(etape === 'meta' || etape === 'csv') && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

            {/* Auteur */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Auteur *</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <ComboboxAuteur
                  auteurs={auteursCourants}
                  value={meta.id_auteur}
                  onChange={id => setMeta(m => ({ ...m, id_auteur: id }))}
                />
                <button onClick={() => setAjoutAuteur(!ajoutAuteur)}
                  style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: ajoutAuteur ? '#3d6b4f' : '#fff', color: ajoutAuteur ? '#fff' : '#3d6b4f', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Nouvel auteur
                </button>
              </div>
            </div>

            {/* Formulaire nouvel auteur */}
            {ajoutAuteur && (
              <div style={{ gridColumn: '1 / -1', background: '#f7f4ef', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div><label style={lbl}>Nom *</label><input value={nouvelAuteur.nom} onChange={e => setNouvelAuteur(p => ({ ...p, nom: e.target.value }))} style={inp} /></div>
                  <div><label style={lbl}>Nom original</label><input value={nouvelAuteur.nom_original} onChange={e => setNouvelAuteur(p => ({ ...p, nom_original: e.target.value }))} style={inp} /></div>
                  <div><label style={lbl}>Naissance</label><input value={nouvelAuteur.date_naissance} onChange={e => setNouvelAuteur(p => ({ ...p, date_naissance: e.target.value }))} style={inp} /></div>
                  <div><label style={lbl}>Mort</label><input value={nouvelAuteur.date_mort} onChange={e => setNouvelAuteur(p => ({ ...p, date_mort: e.target.value }))} style={inp} /></div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={lbl}>Tradition / École</label>
                  <TagsTraditions tags={nouvelAuteur.traditions} onChange={t => setNouvelAuteur(p => ({ ...p, traditions: t }))} tousLesTags={tousLesTags} />
                </div>
                {auteurMsg && <p style={{ fontSize: '11px', color: '#c0562a', margin: '0 0 6px' }}>{auteurMsg}</p>}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAjoutAuteur(false); setAuteurMsg(null) }} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={creerAuteur} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer</button>
                </div>
              </div>
            )}

            {/* Titres */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Titre *</label>
              <input value={meta.titre} onChange={e => set('titre', e.target.value)} style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Sous-titre</label>
              <input value={meta.sous_titre} onChange={e => set('sous_titre', e.target.value)} style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Titre original</label>
              <input value={meta.titre_original} onChange={e => set('titre_original', e.target.value)} style={inp} />
            </div>

            <hr style={sep} />

            {/* Édition */}
            <div><label style={lbl}>Éditeur</label><input value={meta.editeur} onChange={e => set('editeur', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Traducteur</label><input value={meta.trad_auteur} onChange={e => set('trad_auteur', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Ville</label><input value={meta.ville} onChange={e => set('ville', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Collection</label><input value={meta.collection} onChange={e => set('collection', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Date de publication</label><input value={meta.date_publication} onChange={e => set('date_publication', e.target.value)} style={inp} /></div>
            <div>
              <label style={lbl}>
                Date de publication originale
                {dateCompositionAuto && !meta.date_composition && (
                  <span style={{ fontWeight: 400, color: '#b0a89e', marginLeft: '6px', textTransform: 'none', letterSpacing: 0, fontSize: '9px' }}>
                    — si vide : <em>{dateCompositionAuto}</em>
                  </span>
                )}
              </label>
              <input value={meta.date_composition} onChange={e => set('date_composition', e.target.value)} style={inp}
                placeholder={dateCompositionAuto || ''} />
            </div>
            <div>
              <label style={lbl}>Langue originale</label>
              <select value={meta.langue} onChange={e => set('langue', e.target.value)} style={inp}>
                <option value="">—</option>
                <option value="Latin">Latin</option>
                <option value="Grec">Grec</option>
                <option disabled style={{ color: '#d6d0c4' }}>──────</option>
                <option value="Syriaque">Syriaque</option>
                <option value="Copte">Copte</option>
                <option value="Arménien">Arménien</option>
                <option value="Géorgien">Géorgien</option>
                <option value="Arabe chrétien">Arabe chrétien</option>
                <option value="Guèze">Guèze</option>
              </select>
            </div>
            <div><label style={lbl}>URL source</label><input value={meta.url_source} onChange={e => set('url_source', e.target.value)} style={inp} /></div>

            <hr style={sep} />

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Genre</label>
              <TagsGenres tags={meta.genres} onChange={genres => setMeta(m => ({ ...m, genres }))} />
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button onClick={() => { if (!meta.id_auteur || !meta.titre.trim()) { alert('Titre et auteur sont requis.'); return } setEtape('csv') }}
              style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Suivant : import CSV →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 ── */}
      {(etape === 'csv' || etape === 'preview') && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: '15px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>Import des segments</h2>
            <button onClick={() => telechargerCSVModele(meta.titre.slice(0, 20).replace(/\s/g, '_'))}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>
              ↓ CSV modèle
            </button>
          </div>
          <div style={{ background: '#f7f4ef', borderRadius: '5px', padding: '10px 14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '10.5px', fontWeight: 600, color: '#6b6560', marginBottom: '4px' }}>COLONNES ATTENDUES</p>
            <p style={{ fontSize: '11px', color: '#9a958d', fontFamily: 'monospace', lineHeight: 1.7, margin: 0 }}>
              segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,<br />
              lien_1, lien_2, lien_3, lien_4, fiabilite
            </p>
          </div>
          <div onClick={() => inputCsvRef.current?.click()}
            style={{ border: '2px dashed #d6d0c4', borderRadius: '8px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: '#faf8f4' }}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#3d6b4f' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d6d0c4' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#d6d0c4'; const f = e.dataTransfer.files[0]; if (f) lireFichier(f) }}>
            <p style={{ fontSize: '13px', color: '#9a958d', margin: '0 0 4px' }}>
              {nomFichier ? `✓ ${nomFichier} — ${segments.length} segments` : 'Glissez un fichier CSV ou cliquez pour sélectionner'}
            </p>
            <p style={{ fontSize: '11px', color: '#b0a89e', margin: 0 }}>Format .csv, encodage UTF-8</p>
          </div>
          <input ref={inputCsvRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) lireFichier(f) }} />
          {csvErreur && <p style={{ fontSize: '12px', color: '#c0562a', marginTop: '10px' }}>⚠ {csvErreur}</p>}
          {segments.length > 0 && etape === 'csv' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', gap: '8px' }}>
              <button onClick={() => setEtape('meta')} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => setEtape('preview')} style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Prévisualiser →</button>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAPE 3 ── */}
      {etape === 'preview' && segments.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4dfd8', background: '#f7f4ef' }}>
            <p style={{ fontSize: '12px', color: '#2a3d30', fontWeight: 500, margin: '0 0 2px' }}>
              {auteursCourants.find(a => String(a.id_auteur) === meta.id_auteur)?.nom} — {meta.titre}
            </p>
            <p style={{ fontSize: '11px', color: '#9a958d', margin: 0 }}>
              {segments.length} segments{meta.trad_auteur ? ` · trad. ${meta.trad_auteur}` : ''}{meta.genres.length > 0 ? ` · ${meta.genres.join(', ')}` : ''}
            </p>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead><tr style={{ background: '#f7f4ef', position: 'sticky', top: 0 }}>
                <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '50px' }}>§</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '110px' }}>Réf.</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8' }}>Texte</th>
              </tr></thead>
              <tbody>
                {segments.slice(0, 10).map((s, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f4', borderBottom: '1px solid #f0ece6' }}>
                    <td style={{ padding: '6px 12px', color: '#3d6b4f', fontWeight: 500 }}>{s.segment_numero}</td>
                    <td style={{ padding: '6px 12px', color: '#9a958d' }}>{[s.ref_niv1, s.ref_niv2].filter(Boolean).join(', ')}</td>
                    <td style={{ padding: '6px 12px', color: '#2a2520' }}>{(s.segment_texte || '').slice(0, 80)}{(s.segment_texte?.length ?? 0) > 80 ? '…' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {segments.length > 10 && <p style={{ padding: '8px 12px', fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>… et {segments.length - 10} autres</p>}
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e4dfd8', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <button onClick={() => setEtape('csv')} disabled={importing} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>← Retour</button>
            <button onClick={confirmerImport} disabled={importing}
              style={{ fontSize: '12px', padding: '7px 20px', borderRadius: '5px', border: 'none', background: importing ? '#8aaa96' : '#3d6b4f', color: '#fff', cursor: importing ? 'default' : 'pointer', fontWeight: 500 }}>
              {importing ? 'Import en cours…' : `Confirmer (${segments.length} segments)`}
            </button>
          </div>
        </div>
      )}

      {resultat && !resultat.ok && (
        <div style={{ background: '#fdf2ee', border: '1px solid #e4c4b8', borderRadius: '6px', padding: '12px 16px' }}>
          <p style={{ fontSize: '12.5px', color: '#c0562a', margin: 0 }}>✗ {resultat.msg}</p>
        </div>
      )}

      {/* ── ÉTAPE 4 ── */}
      {etape === 'done' && resultat?.ok && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '22px', marginBottom: '10px' }}>✓</p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: '16px', color: '#2a3d30', marginBottom: '8px' }}>{meta.titre}</p>
          <p style={{ fontSize: '12.5px', color: '#5a6b5e', marginBottom: '20px' }}>{resultat.msg}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {resultat.idOeuvre && (
              <a href={`/oeuvre/${resultat.idOeuvre}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', color: '#2a3d30', textDecoration: 'none' }}>
                Lire l'œuvre ↗
              </a>
            )}
            <button onClick={reset} style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Ajouter une autre œuvre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
