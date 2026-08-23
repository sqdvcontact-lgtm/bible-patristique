'use client'

import React from 'react'
import { supabase, parseCSV, telechargerCSVModele, headersAdmin } from './adminShared'
import type { Auteur } from './adminTypes'
import { formaterDateHistorique, normaliserDateHistoriqueTexte } from '@/app/lib/datesHistoriques'
import { mentionTraducteurs } from '@/app/lib/traducteurs'

const lbl: React.CSSProperties = { fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', display: 'block', marginBottom: '3px' }
const inp: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: '0.875rem', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }
const sep: React.CSSProperties = { borderTop: '1px solid var(--cs-fond-doux)', gridColumn: '1 / -1', margin: '2px 0' }

// ── Genres ────────────────────────────────────────────────────────────────────
const GENRES_PAR_CATEGORIE: { cat: string; genres: string[] }[] = [
  { cat: 'Écriture & exégèse', genres: ['Commentaire biblique', 'Homélie exégétique', 'Chaîne (catena)', 'Scolie'] },
  { cat: 'Théologie', genres: ['Traité théologique', 'Apologie', 'Réfutation / Controverse', 'Symbole de foi', 'Questions & réponses'] },
  { cat: 'Pastorale & discipline', genres: ['Homélie / Sermon', 'Catéchèse / Mystagogíe', 'Lettre pastorale', 'Règle monastique', 'Droit canonique'] },
  { cat: 'Spiritualité & ascèse', genres: ['Sentence / Apophtegme', 'Traité ascétique', 'Hagiographie (vie de saint)', 'Actes de martyre', 'Récit monastique'] },
  { cat: 'Liturgie & prière', genres: ['Anaphore / Liturgie', 'Hymne', 'Prière / Invocation'] },
  { cat: 'Littérature', genres: ['Confession / Autobiographie', 'Poème', 'Dialogue philosophique', 'Florilège', 'Encyclopédie'] },
]

function TagsGenres({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [nouveau, setNouveau] = React.useState(false)
  const [saisie, setSaisie] = React.useState('')
  const ajouter = (v: string) => { if (!tags.includes(v)) onChange([...tags, v]) }
  const supprimer = (v: string) => onChange(tags.filter(x => x !== v))
  const ajouterCustom = () => { const v = saisie.trim(); if (v) { ajouter(v); setSaisie(''); setNouveau(false) } }
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        {GENRES_PAR_CATEGORIE.map(({ cat, genres }) => (
          <div key={cat} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, minWidth: '130px' }}>{cat}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {genres.map(g => {
                const actif = tags.includes(g)
                return (
                  <button key={g} onClick={() => actif ? supprimer(g) : ajouter(g)}
                    style={{ fontSize: '0.75rem', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', border: actif ? '1px solid rgba(var(--cs-vert-rgb),0.35)' : '1px solid var(--cs-bord)', background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-fond)', color: actif ? 'var(--cs-vert-fonce)' : 'var(--cs-texte-second)', fontWeight: actif ? 600 : 400 }}>
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tags.length > 0 ? '8px' : '0' }}>
        {nouveau ? (
          <>
            <input value={saisie} onChange={e => setSaisie(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ajouterCustom(); if (e.key === 'Escape') { setNouveau(false); setSaisie('') } }}
              autoFocus style={{ ...inp, width: '11.25rem', fontSize: '0.78125rem', padding: '4px 8px' }} />
            <button onClick={ajouterCustom} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer' }}>Ajouter</button>
            <button onClick={() => { setNouveau(false); setSaisie('') }} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', cursor: 'pointer' }}>Annuler</button>
          </>
        ) : (
          <button onClick={() => setNouveau(true)} style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', border: '1px dashed var(--cs-bord)', background: 'transparent', borderRadius: '4px', padding: '2px 10px', cursor: 'pointer' }}>
            + Nouveau genre
          </button>
        )}
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '6px', borderTop: '1px solid var(--cs-fond-doux)' }}>
          {tags.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78125rem', background: 'rgba(var(--cs-vert-rgb),0.10)', color: 'var(--cs-vert-fonce)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', borderRadius: '4px', padding: '1px 8px' }}>
              {t}
              <button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-doux)', fontSize: '0.71875rem', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
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
  const filtres = saisie.trim() ? auteurs.filter(a => a.nom.toLowerCase().includes(saisie.toLowerCase())) : auteurs
  React.useEffect(() => {
    const fermer = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false) }
    document.addEventListener('mousedown', fermer)
    return () => document.removeEventListener('mousedown', fermer)
  }, [])
  const selectionner = (a: AuteurOpt) => { onChange(String(a.id_auteur)); setSaisie(''); setOuvert(false) }
  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <div style={{ display: 'flex', gap: '0', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', overflow: 'hidden' }}>
        <input
          value={ouvert ? saisie : (auteurActuel ? `${auteurActuel.nom}${auteurActuel.dates ? ` (${auteurActuel.dates})` : ''}` : '')}
          onChange={e => { setSaisie(e.target.value); setOuvert(true) }}
          onFocus={() => setOuvert(true)}
          placeholder=""
          style={{ ...inp, border: 'none', flex: 1, borderRadius: 0, background: 'transparent' }}
        />
        {value && (
          <button onClick={() => { onChange(''); setSaisie(''); setOuvert(false) }}
            style={{ padding: '0 8px', background: 'none', border: 'none', color: 'var(--cs-texte-faible)', cursor: 'pointer', fontSize: '0.875rem' }}>✕</button>
        )}
      </div>
      {ouvert && filtres.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderTop: 'none', borderRadius: '0 0 4px 4px', maxHeight: '220px', overflowY: 'auto', boxShadow: 'var(--cs-ombre-flottante)' }}>
          {filtres.map(a => (
            <div key={a.id_auteur} onMouseDown={() => selectionner(a)}
              style={{ padding: '6px 10px', fontSize: '0.875rem', cursor: 'pointer', background: String(a.id_auteur) === value ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)', color: 'var(--cs-texte-fort)', display: 'flex', gap: '8px', alignItems: 'baseline' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--cs-vert-rgb),0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = String(a.id_auteur) === value ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)')}>
              <span>{a.nom}</span>
              {a.dates && <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)' }}>{a.dates}</span>}
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
  const ajouter = (v?: string) => { const val = (v ?? saisie).trim(); if (val && !tags.includes(val)) onChange([...tags, val]); setSaisie('') }
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
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78125rem', background: 'rgba(var(--cs-vert-rgb),0.10)', color: 'var(--cs-vert-fonce)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', borderRadius: '4px', padding: '1px 7px' }}>
              {t}<button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-doux)', fontSize: '0.71875rem', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {suggestions.map(t => (
            <button key={t} onClick={() => ajouter(t)}
              style={{ fontSize: '0.75rem', background: 'var(--cs-fond)', color: 'var(--cs-texte-second)', border: '1px solid var(--cs-bord)', borderRadius: '4px', padding: '1px 7px', cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Catalogue ─────────────────────────────────────────────────────────────────
type NoticesCatalogue = {
  id_oeuvre_stable: string
  titre_stable: string
  titre_original: string | null
  id_auteur: string
  auteur: string
  date_oeuvre: string | null
  traducteur: string | null
  editeur: string | null
  lieu_edition: string | null
  annee_edition: number | null
  collection_nom: string | null
  langue_originale: string | null
  url_source: string | null
  genre: string | null
  decision_import: string | null
  presence_sur_le_site: boolean | null
}

const LANGUES_MAP: Record<string, string> = {
  'latin': 'Latin', 'grec': 'Grec', 'grec ancien': 'Grec', 'grec classique': 'Grec',
  'syriaque': 'Syriaque', 'copte': 'Copte', 'arménien': 'Arménien',
  'géorgien': 'Géorgien', 'arabe': 'Arabe chrétien', 'arabe chrétien': 'Arabe chrétien',
  'guèze': 'Guèze', 'éthiopien': 'Guèze',
}

function normaliserLangue(l: string | null): string {
  if (!l) return ''
  return LANGUES_MAP[l.toLowerCase().trim()] ?? l
}

function RechercheCatalogue({ onSelect }: { onSelect: (n: NoticesCatalogue) => void }) {
  const [saisie, setSaisie] = React.useState('')
  const [resultats, setResultats] = React.useState<NoticesCatalogue[]>([])
  const [chargement, setChargement] = React.useState(false)
  const [afficher, setAfficher] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    const fermer = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAfficher(false) }
    document.addEventListener('mousedown', fermer)
    return () => document.removeEventListener('mousedown', fermer)
  }, [])

  const chercher = React.useCallback(async (q: string) => {
    if (q.length < 2) { setResultats([]); setAfficher(false); return }
    setChargement(true)
    const { data } = await supabase
      .from('catalogue_notices')
      .select('id_oeuvre_stable, titre_stable, titre_original, id_auteur, auteur, date_oeuvre, traducteur, editeur, lieu_edition, annee_edition, collection_nom, langue_originale, url_source, genre, decision_import, presence_sur_le_site')
      .or(`titre_stable.ilike.%${q}%,titre_original.ilike.%${q}%,auteur.ilike.%${q}%`)
      .order('auteur')
      .order('titre_stable')
      .limit(60)
    if (data) {
      // Dédupliquer par id_oeuvre_stable, garder la notice vérifiée
      const map = new Map<string, NoticesCatalogue>()
      for (const n of data as NoticesCatalogue[]) {
        const ex = map.get(n.id_oeuvre_stable)
        if (!ex) map.set(n.id_oeuvre_stable, n)
      }
      setResultats([...map.values()].slice(0, 20))
    }
    setChargement(false)
    setAfficher(true)
  }, [])

  const onChange = (v: string) => {
    setSaisie(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => chercher(v), 250)
  }

  const selectionner = (n: NoticesCatalogue) => {
    setSaisie('')
    setAfficher(false)
    setResultats([])
    onSelect(n)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={saisie}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { if (resultats.length > 0) setAfficher(true) }}
          placeholder="Auteur, titre français ou latin…"
          style={{ ...inp, paddingRight: chargement ? '30px' : '9px' }}
        />
        {chargement && (
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78125rem', color: 'var(--cs-texte-faible)' }}>…</span>
        )}
      </div>
      {afficher && resultats.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: '340px', overflowY: 'auto', boxShadow: 'var(--cs-ombre-flottante)' }}>
          {resultats.map(n => (
            <div key={n.id_oeuvre_stable} onMouseDown={() => selectionner(n)}
              style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--cs-fond-doux)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--cs-vert-rgb),0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--cs-surface)')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--cs-texte-fort)', fontWeight: 500 }}>{n.titre_stable}</span>
                <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', flexShrink: 0, fontFamily: 'monospace' }}>{n.id_oeuvre_stable}</span>
              </div>
              <div style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span>{n.auteur}</span>
                {n.titre_original && <span style={{ fontStyle: 'italic' }}>{n.titre_original}</span>}
                {n.date_oeuvre && <span>{formaterDateHistorique(n.date_oeuvre)}</span>}
                {n.presence_sur_le_site && (
                  <span style={{ color: 'var(--cs-danger)', fontWeight: 500 }}>déjà en ligne</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {afficher && resultats.length === 0 && saisie.length >= 2 && !chargement && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '12px', fontSize: '0.875rem', color: 'var(--cs-texte-doux)', boxShadow: 'var(--cs-ombre-flottante)' }}>
          Aucune œuvre trouvée dans le catalogue.
        </div>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
type MetaOeuvre = {
  id_oeuvre: string
  id_auteur: string; titre: string; sous_titre: string; titre_original: string
  trad_auteur: string; editeur: string; collection: string
  ville: string; url_source: string; date_publication: string; date_composition: string
  genres: string[]; langue: string
}

const VIDE_META: MetaOeuvre = {
  id_oeuvre: '',
  id_auteur: '', titre: '', sous_titre: '', titre_original: '',
  trad_auteur: '', editeur: '', collection: '',
  ville: '', url_source: '', date_publication: '', date_composition: '',
  genres: [], langue: '',
}

type AuteurAvecDates = Auteur & { date_naissance?: string | null; date_mort?: string | null; traditions?: string[] | null }

// ── Composant principal ───────────────────────────────────────────────────────
export default function SectionAjouterOeuvre({ auteurs }: { auteurs: Auteur[] }) {
  const [etape, setEtape] = React.useState<'selection' | 'meta' | 'csv' | 'preview' | 'done'>('selection')
  const [meta, setMeta] = React.useState<MetaOeuvre>(VIDE_META)
  const set = (k: keyof MetaOeuvre, v: string) => setMeta(m => ({ ...m, [k]: v }))
  const [noticeSelectionnee, setNoticeSelectionnee] = React.useState<NoticesCatalogue | null>(null)

  // Auteurs
  const [auteursCourants, setAuteursCourants] = React.useState<AuteurAvecDates[]>(auteurs as AuteurAvecDates[])
  React.useEffect(() => {
    supabase.from('auteurs')
      .select('id_auteur, nom, dates, date_naissance, date_mort, siecle, traditions, oeuvres!oeuvres_id_auteur_fkey(id_oeuvre, titre)')
      .order('nom', { ascending: true })
      .then(({ data }) => { if (data) setAuteursCourants(data as AuteurAvecDates[]) })
  }, [])

  const auteurSelectionne = auteursCourants.find(a => String(a.id_auteur) === meta.id_auteur) as AuteurAvecDates | undefined

  const dateCompositionAuto = React.useMemo(() => {
    if (!auteurSelectionne) return ''
    const dn = parseInt(auteurSelectionne.date_naissance ?? '')
    const dm = parseInt(auteurSelectionne.date_mort ?? '')
    if (isNaN(dn) || isNaN(dm)) return ''
    return `vers ${Math.round((dn + dm) / 2)}`
  }, [auteurSelectionne])

  const tousLesTags = React.useMemo(() => {
    const s = new Set<string>()
    auteursCourants.forEach(a => a.traditions?.forEach(t => s.add(t)))
    return [...s].sort()
  }, [auteursCourants])

  // Sélection depuis le catalogue
  const selectionnerDepuisCatalogue = (n: NoticesCatalogue) => {
    setNoticeSelectionnee(n)
    setMeta({
      id_oeuvre: n.id_oeuvre_stable,
      id_auteur: n.id_auteur,
      titre: n.titre_stable,
      sous_titre: '',
      titre_original: n.titre_original ?? '',
      trad_auteur: n.traducteur ?? '',
      editeur: n.editeur ?? '',
      collection: n.collection_nom ?? '',
      ville: n.lieu_edition ?? '',
      url_source: n.url_source ?? '',
      date_publication: n.annee_edition ? formaterDateHistorique(n.annee_edition) : '',
      date_composition: formaterDateHistorique(n.date_oeuvre) ?? '',
      genres: n.genre ? [n.genre] : [],
      langue: normaliserLangue(n.langue_originale),
    })
    setEtape('meta')
  }

  const creerSansCatalogue = () => {
    setNoticeSelectionnee(null)
    setMeta(VIDE_META)
    setEtape('meta')
  }

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
    const dateComp = normaliserDateHistoriqueTexte(meta.date_composition.trim() || dateCompositionAuto)
    const res = await fetch('/api/admin/import-oeuvre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ meta: { ...meta, titre: meta.titre.trim(), date_publication: normaliserDateHistoriqueTexte(meta.date_publication), date_composition: dateComp }, segments }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.ok) { setResultat({ ok: false, msg: json.error ?? `Erreur (${res.status})` }); setImporting(false); return }
    setResultat({ ok: true, msg: `${json.count} segments importés.`, idOeuvre: json.idOeuvre })
    setEtape('done'); setImporting(false)
  }

  const reset = () => {
    setEtape('selection'); setMeta(VIDE_META); setNoticeSelectionnee(null)
    setSegments([]); setNomFichier(''); setCsvErreur(null); setResultat(null); setAjoutAuteur(false)
  }

  // ── Indicateur d'étapes
  const ETAPES_LABEL: [string, string][] = [['selection', 'Sélection'], ['meta', 'Métadonnées'], ['csv', 'Import CSV'], ['preview', 'Prévisualisation']]
  const indexEtape = ETAPES_LABEL.findIndex(([k]) => k === etape)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Barre d'étapes */}
      {etape !== 'done' && (
        <div style={{ display: 'flex', gap: '0', marginBottom: '4px' }}>
          {ETAPES_LABEL.map(([k, l], i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: etape === k ? 600 : 400, color: etape === k ? 'var(--cs-vert)' : i < indexEtape ? 'var(--cs-texte-doux)' : '#c8c3bc' }}>
                {i + 1}. {l}
              </span>
              {i < ETAPES_LABEL.length - 1 && <span style={{ margin: '0 10px', color: 'var(--cs-bord)' }}>→</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── ÉTAPE 0 : SÉLECTION ── */}
      {etape === 'selection' && (
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '22px 24px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', marginBottom: '14px', marginTop: 0 }}>
            Recherchez l’œuvre dans le catalogue pour pré-remplir les métadonnées automatiquement.
          </p>
          <label style={lbl}>Titre, auteur ou titre original</label>
          <RechercheCatalogue onSelect={selectionnerDepuisCatalogue} />
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--cs-fond-doux)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={creerSansCatalogue}
              style={{ fontSize: '0.875rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
              Créer sans catalogue →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 1 : MÉTADONNÉES ── */}
      {(etape === 'meta' || etape === 'csv') && (
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '18px 22px' }}>

          {/* Bandeau catalogue */}
          {noticeSelectionnee && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--cs-vert-rgb),0.07)', border: '1px solid rgba(var(--cs-vert-rgb),0.20)', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-vert)', marginRight: '8px' }}>Catalogue</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--cs-encre)', fontWeight: 500 }}>{noticeSelectionnee.titre_stable}</span>
                <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', marginLeft: '8px', fontFamily: 'monospace' }}>{noticeSelectionnee.id_oeuvre_stable}</span>
              </div>
              <button onClick={() => setEtape('selection')}
                style={{ fontSize: '0.75rem', padding: '3px 9px', borderRadius: '4px', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', background: 'transparent', color: 'var(--cs-vert)', cursor: 'pointer' }}>
                Changer
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

            {/* Auteur */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Auteur *</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <ComboboxAuteur auteurs={auteursCourants} value={meta.id_auteur} onChange={id => setMeta(m => ({ ...m, id_auteur: id }))} />
                <button onClick={() => setAjoutAuteur(!ajoutAuteur)}
                  style={{ fontSize: '0.78125rem', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: ajoutAuteur ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: ajoutAuteur ? 'var(--cs-sur-aplat)' : 'var(--cs-vert)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Nouvel auteur
                </button>
              </div>
            </div>

            {/* Formulaire nouvel auteur */}
            {ajoutAuteur && (
              <div style={{ gridColumn: '1 / -1', background: 'var(--cs-fond)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '12px 14px' }}>
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
                {auteurMsg && <p style={{ fontSize: '0.78125rem', color: 'var(--cs-danger)', margin: '0 0 6px' }}>{auteurMsg}</p>}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAjoutAuteur(false); setAuteurMsg(null) }} style={{ fontSize: '0.78125rem', padding: '5px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={creerAuteur} style={{ fontSize: '0.78125rem', padding: '5px 10px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 500 }}>Créer</button>
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
            {/* Plusieurs traducteurs : séparés par un point-virgule (mise en forme à l'affichage). */}
            <div><label style={lbl}>Traducteur</label><input value={meta.trad_auteur} onChange={e => set('trad_auteur', e.target.value)} placeholder="Prénom Nom ; Prénom Nom" style={inp} /></div>
            <div><label style={lbl}>Ville</label><input value={meta.ville} onChange={e => set('ville', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Collection</label><input value={meta.collection} onChange={e => set('collection', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Date de publication</label><input value={meta.date_publication} onChange={e => set('date_publication', e.target.value)} style={inp} /></div>
            <div>
              <label style={lbl}>
                Date de composition
                {dateCompositionAuto && !meta.date_composition && (
                  <span style={{ fontWeight: 400, color: 'var(--cs-texte-faible)', marginLeft: '6px', textTransform: 'none', letterSpacing: 0, fontSize: '0.65625rem' }}>
                    — si vide : <em>{dateCompositionAuto}</em>
                  </span>
                )}
              </label>
              <input value={meta.date_composition} onChange={e => set('date_composition', e.target.value)} style={inp} placeholder={dateCompositionAuto || ''} />
            </div>
            <div>
              <label style={lbl}>Langue originale</label>
              <select value={meta.langue} onChange={e => set('langue', e.target.value)} style={inp}>
                <option value="">—</option>
                <option value="Latin">Latin</option>
                <option value="Grec">Grec</option>
                <option disabled style={{ color: 'var(--cs-bord)' }}>──────</option>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
            <button onClick={() => setEtape('selection')}
              style={{ fontSize: '0.875rem', padding: '7px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
              ← Sélection
            </button>
            <button onClick={() => { if (!meta.id_auteur || !meta.titre.trim()) { alert('Titre et auteur sont requis.'); return } setEtape('csv') }}
              style={{ fontSize: '0.875rem', padding: '7px 18px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 500 }}>
              Suivant : import CSV →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : CSV ── */}
      {(etape === 'csv' || etape === 'preview') && (
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.0625rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Import des segments</h2>
            <button onClick={() => telechargerCSVModele(meta.titre.slice(0, 20).replace(/\s/g, '_'))}
              style={{ fontSize: '0.78125rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
              ↓ CSV modèle
            </button>
          </div>
          <div style={{ background: 'var(--cs-fond)', borderRadius: '4px', padding: '10px 14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-texte-second)', marginBottom: '4px' }}>COLONNES ATTENDUES</p>
            <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontFamily: 'monospace', lineHeight: 1.7, margin: 0 }}>
              segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,<br />
              lien_1, lien_2, lien_3, lien_4, fiabilite
            </p>
          </div>
          <div onClick={() => inputCsvRef.current?.click()}
            style={{ border: '2px dashed var(--cs-bord)', borderRadius: '8px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: 'var(--cs-fond-clair)' }}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-vert)' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-bord)' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--cs-bord)'; const f = e.dataTransfer.files[0]; if (f) lireFichier(f) }}>
            <p style={{ fontSize: '0.9375rem', color: 'var(--cs-texte-doux)', margin: '0 0 4px' }}>
              {nomFichier ? `✓ ${nomFichier} — ${segments.length} segments` : 'Glissez un fichier CSV ou cliquez pour sélectionner'}
            </p>
            <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', margin: 0 }}>Format .csv, encodage UTF-8</p>
          </div>
          <input ref={inputCsvRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) lireFichier(f) }} />
          {csvErreur && <p style={{ fontSize: '0.875rem', color: 'var(--cs-danger)', marginTop: '10px' }}>⚠ {csvErreur}</p>}
          {segments.length > 0 && etape === 'csv' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', gap: '8px' }}>
              <button onClick={() => setEtape('meta')} style={{ fontSize: '0.875rem', padding: '7px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => setEtape('preview')} style={{ fontSize: '0.875rem', padding: '7px 18px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 500 }}>Prévisualiser →</button>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAPE 3 : PRÉVISUALISATION ── */}
      {etape === 'preview' && segments.length > 0 && (
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--cs-bord-clair)', background: 'var(--cs-fond)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--cs-encre)', fontWeight: 500, margin: '0 0 2px' }}>
              {auteursCourants.find(a => String(a.id_auteur) === meta.id_auteur)?.nom} — {meta.titre}
              {meta.id_oeuvre && <span style={{ fontSize: '0.78125rem', fontFamily: 'monospace', color: 'var(--cs-texte-doux)', marginLeft: '10px' }}>{meta.id_oeuvre}</span>}
            </p>
            <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0 }}>
              {segments.length} segments{meta.trad_auteur ? ` · ${mentionTraducteurs(meta.trad_auteur) || meta.trad_auteur}` : ''}{meta.genres.length > 0 ? ` · ${meta.genres.join(', ')}` : ''}
            </p>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead><tr style={{ background: 'var(--cs-fond)', position: 'sticky', top: 0 }}>
                <th style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)', width: '50px' }}>§</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)', width: '6.875rem' }}>Réf.</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)' }}>Texte</th>
              </tr></thead>
              <tbody>
                {segments.slice(0, 10).map((s, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--cs-surface)' : 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                    <td style={{ padding: '6px 12px', color: 'var(--cs-vert)', fontWeight: 500 }}>{s.segment_numero}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--cs-texte-doux)' }}>{[s.ref_niv1, s.ref_niv2].filter(Boolean).join(', ')}</td>
                    <td style={{ padding: '6px 12px', color: 'var(--cs-texte-fort)' }}>{(s.segment_texte || '').slice(0, 80)}{(s.segment_texte?.length ?? 0) > 80 ? '…' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {segments.length > 10 && <p style={{ padding: '8px 12px', fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>… et {segments.length - 10} autres</p>}
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--cs-bord-clair)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <button onClick={() => setEtape('csv')} disabled={importing} style={{ fontSize: '0.875rem', padding: '7px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>← Retour</button>
            <button onClick={confirmerImport} disabled={importing}
              style={{ fontSize: '0.875rem', padding: '7px 20px', borderRadius: '4px', border: 'none', background: importing ? '#8aaa96' : 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: importing ? 'default' : 'pointer', fontWeight: 500 }}>
              {importing ? 'Import en cours…' : `Confirmer (${segments.length} segments)`}
            </button>
          </div>
        </div>
      )}

      {resultat && !resultat.ok && (
        <div style={{ background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '12px 16px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-danger)', margin: 0 }}>✗ {resultat.msg}</p>
        </div>
      )}

      {/* ── ÉTAPE 4 : SUCCÈS ── */}
      {etape === 'done' && resultat?.ok && (
        <div style={{ background: 'var(--cs-surface)', border: '2px solid var(--cs-vert)', borderRadius: '8px', padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '1.625rem', marginBottom: '10px' }}>✓</p>
          <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.125rem', color: 'var(--cs-encre)', marginBottom: '8px' }}>{meta.titre}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', marginBottom: '20px' }}>{resultat.msg}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {resultat.idOeuvre && (
              <a href={`/oeuvre/${resultat.idOeuvre}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.875rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-bord)', color: 'var(--cs-encre)', textDecoration: 'none' }}>
                Lire l’œuvre ↗
              </a>
            )}
            <button onClick={reset} style={{ fontSize: '0.875rem', padding: '7px 16px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 500 }}>
              Ajouter une autre œuvre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
