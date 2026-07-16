'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

type Notice = {
  id: number
  id_ligne: string
  id_auteur: string | null
  auteur: string
  dates_auteur: string | null
  id_oeuvre_stable: string
  titre_stable: string
  titre_original: string | null
  titre_edition: string | null
  traducteur: string | null
  annee_edition: number | null
  siecle_edition: string | null
  editeur: string | null
  collection_nom: string | null
  domaine_public: string | null
  url_source: string | null
  decision_import: string | null
  niveau_verification: string | null
  score_fiabilite: number | null
  presence_sur_le_site: boolean
  verifie: boolean
  genre: string | null
  langue_originale: string | null
  date_oeuvre: string | null
  authenticite: string | null
  created_at: string
}

type FiltreStatut = 'a_verifier' | 'toutes' | 'verifiees' | 'sur_site'

async function getHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function couleurScore(s: number | null) {
  if (s == null) return '#b66a54'
  if (s >= 90) return '#3d6b4f'
  if (s >= 70) return '#8a5a00'
  return '#c0562a'
}

function labelDecision(d: string | null): string {
  if (!d) return 'A verifier'
  if (d.startsWith('Candidat')) return 'Candidat'
  if (d.startsWith('Bibliographie')) return 'Biblio seulement'
  if (d.startsWith('Repérage') || d.startsWith('Reperage')) return 'A verifier'
  if (d.startsWith('Écarter') || d.startsWith('Ecarter')) return 'A ecarter'
  return d.slice(0, 34)
}

function couleurDecision(d: string | null): { color: string; bg: string; border: string } {
  if (!d) return { color: '#a43d2d', bg: '#fff1ee', border: '#e8b1a4' }
  if (d.startsWith('Candidat')) return { color: '#2f6046', bg: '#edf5f0', border: '#b8d4c4' }
  if (d.startsWith('Bibliographie')) return { color: '#8a5a00', bg: '#fdf3ea', border: '#e7cda8' }
  if (d.startsWith('Repérage') || d.startsWith('Reperage')) return { color: '#a43d2d', bg: '#fff1ee', border: '#e8b1a4' }
  if (d.startsWith('Écarter') || d.startsWith('Ecarter')) return { color: '#a43d2d', bg: '#fff1ee', border: '#e8b1a4' }
  return { color: '#6b6560', bg: '#f5f3ef', border: '#e4dfd8' }
}

function estVideOuAVerifier(valeur: unknown) {
  if (valeur == null || valeur === '') return true
  if (typeof valeur !== 'string') return false
  const v = valeur.trim().toLowerCase()
  return !v || v.includes('à vérifier') || v.includes('a verifier') || v.includes('verif') || v.includes('vérif')
}

function majuscule(valeur: unknown) {
  if (typeof valeur === 'boolean') return valeur ? 'OUI' : 'NON'
  return String(valeur ?? '').toUpperCase()
}

function majPremierMot(valeur: unknown) {
  const texte = String(valeur ?? '').trim()
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : ''
}

function datePublication(n: Notice) {
  if (n.annee_edition) return String(n.annee_edition)
  return n.siecle_edition
}

function titreDeclineNotice(n: Notice) {
  return n.titre_edition || n.titre_original || n.titre_stable
}

function regrouperNotices(notices: Notice[]) {
  const groupes = new Map<string, { cle: string; titre: string; auteur: string; notices: Notice[] }>()
  notices.forEach(n => {
    const cle = `${n.auteur}__${n.id_oeuvre_stable || n.titre_stable}`
    const groupe = groupes.get(cle) ?? { cle, titre: n.titre_stable, auteur: n.auteur, notices: [] }
    groupe.notices.push(n)
    groupes.set(cle, groupe)
  })
  return [...groupes.values()].map(groupe => ({
    ...groupe,
    notices: groupe.notices.sort((a, b) =>
      String(datePublication(a) ?? '').localeCompare(String(datePublication(b) ?? ''), 'fr') ||
      titreDeclineNotice(a).localeCompare(titreDeclineNotice(b), 'fr')
    ),
  })).sort((a, b) =>
    a.auteur.localeCompare(b.auteur, 'fr') ||
    a.titre.localeCompare(b.titre, 'fr')
  )
}

function ChampNotice({ label, valeur, accent = false, transform }: {
  label: string
  valeur: unknown
  accent?: boolean
  transform?: (valeur: unknown) => string
}) {
  const critique = estVideOuAVerifier(valeur)
  const contenu = critique ? 'A completer' : (transform ? transform(valeur) : String(valeur))
  return (
    <div style={{
      minWidth: 0,
      border: `1px solid ${critique ? '#e5a99b' : accent ? '#b8d4c4' : '#e4dfd8'}`,
      background: critique ? '#fff1ee' : accent ? '#edf5f0' : '#fff',
      borderRadius: '6px',
      padding: '7px 9px',
    }}>
      <span style={{ display: 'block', marginBottom: '2px', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: critique ? '#b14b38' : '#9a958d' }}>
        {label}
      </span>
      <span style={{ display: 'block', fontSize: '11.5px', lineHeight: 1.3, color: critique ? '#a43d2d' : '#2a3d30', fontWeight: accent ? 700 : 400, wordBreak: 'break-word' }}>
        {contenu}
      </span>
    </div>
  )
}

function GroupeNotice({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #ede9e2', borderRadius: '8px', background: '#fbfaf7', padding: '10px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#857c73' }}>{titre}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '7px' }}>
        {children}
      </div>
    </section>
  )
}

function DetailNotice({ n }: { n: Notice }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px', flexWrap: 'wrap' }}>
        {[
          ['Id ligne', n.id_ligne],
          ['Id oeuvre', n.id_oeuvre_stable],
          ['Id auteur', n.id_auteur],
        ].map(([label, valeur]) => (
          <span key={label} style={{ fontSize: '9px', color: '#8a8278', background: '#f0ece6', border: '1px solid #e4dfd8', borderRadius: '4px', padding: '2px 6px' }}>
            <strong style={{ color: '#6b6560' }}>{label}</strong> {valeur || 'A completer'}
          </span>
        ))}
      </div>

      <GroupeNotice titre="Auteur">
        <ChampNotice label="Auteur" valeur={n.auteur} />
        <ChampNotice label="Authenticite" valeur={n.authenticite} transform={majuscule} />
        <ChampNotice label="Dates auteur" valeur={n.dates_auteur} />
      </GroupeNotice>

      <GroupeNotice titre="Titres">
        <ChampNotice label="Titre stable" valeur={n.titre_stable} />
        <ChampNotice label="Titre original" valeur={n.titre_original} />
        <ChampNotice label="Titre d'edition" valeur={n.titre_edition} />
      </GroupeNotice>

      <GroupeNotice titre="Edition">
        <ChampNotice label="Editeur" valeur={n.editeur} />
        <ChampNotice label="Ville" valeur={null} />
        <ChampNotice label="Collection" valeur={n.collection_nom} />
        <ChampNotice label="Date de publication" valeur={datePublication(n)} />
      </GroupeNotice>

      <GroupeNotice titre="Classification">
        <ChampNotice label="Genre" valeur={n.genre} transform={majPremierMot} />
        <ChampNotice label="Langue d'origine" valeur={n.langue_originale} transform={majPremierMot} />
        <ChampNotice label="Date de premiere publication" valeur={n.date_oeuvre} />
      </GroupeNotice>

      <GroupeNotice titre="Import">
        <ChampNotice label="Decision import" valeur={n.decision_import} accent transform={() => labelDecision(n.decision_import)} />
        <ChampNotice label="Niveau verif." valeur={n.niveau_verification} />
        <ChampNotice label="Score" valeur={n.score_fiabilite} />
        <ChampNotice label="Present sur le site" valeur={n.presence_sur_le_site} transform={majuscule} />
        <ChampNotice label="Notice validee" valeur={n.verifie} transform={majuscule} />
        <ChampNotice label="URL" valeur={n.url_source} />
      </GroupeNotice>
    </div>
  )
}

export default function SectionVerificationCatalogue() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<FiltreStatut>('a_verifier')
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [ouverte, setOuverte] = useState<number | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const headers = await getHeaders()
      const params = new URLSearchParams({ page: String(page) })
      if (filtre === 'a_verifier') params.set('verifie', 'false')
      if (filtre === 'verifiees') params.set('verifie', 'true')
      if (filtre === 'sur_site') params.set('presence', 'true')
      if (recherche.trim()) params.set('auteur', recherche.trim())
      const res = await fetch(`/api/admin/catalogue?${params}`, { headers })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const json = await res.json()
      setNotices(json.data ?? [])
      setTotal(json.count ?? 0)
    } catch {
      setErreur('Impossible de charger le catalogue.')
    } finally {
      setChargement(false)
    }
  }, [filtre, recherche, page])

  useEffect(() => { charger() }, [charger])

  const valider = async (id: number) => {
    if (!confirm('Valider définitivement cette notice ? Elle ne pourra plus être modifiée.')) return
    setNotices(prev => prev.map(n => n.id === id ? { ...n, verifie: true } : n))
    const headers = await getHeaders()
    const res = await fetch('/api/admin/catalogue', { method: 'PATCH', headers, body: JSON.stringify({ id, verifie: true }) })
    if (!res.ok) {
      setNotices(prev => prev.map(n => n.id === id ? { ...n, verifie: false } : n))
      alert('Erreur lors de la validation.')
    }
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer définitivement cette notice ?')) return
    const sauvegarde = notices.find(n => n.id === id)
    setNotices(prev => prev.filter(n => n.id !== id))
    if (ouverte === id) setOuverte(null)
    const headers = await getHeaders()
    const res = await fetch('/api/admin/catalogue', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
    if (!res.ok) {
      const json = await res.json()
      if (sauvegarde) setNotices(prev => [...prev, sauvegarde].sort((a, b) => a.id - b.id))
      alert(json.error ?? 'Impossible de supprimer.')
    }
  }

  const FILTRES_STATUT: [FiltreStatut, string][] = [
    ['a_verifier', 'A verifier'],
    ['toutes', 'Toutes'],
    ['verifiees', 'Verifiees'],
    ['sur_site', 'Sur le site'],
  ]

  return (
    <div style={{ maxWidth: '960px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', margin: 0 }}>
          Catalogue bibliographique - {total.toLocaleString('fr-FR')} notices
        </h2>
        <input
          value={recherche}
          onChange={e => { setRecherche(e.target.value); setPage(0) }}
          placeholder="Filtrer par auteur..."
          style={{ fontSize: '11.5px', padding: '5px 10px', border: '1px solid #344d3e', borderRadius: '4px', background: '#1e2e26', color: '#c8d8cc', outline: 'none', width: '200px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #344d3e', marginBottom: '20px' }}>
        {FILTRES_STATUT.map(([key, label]) => (
          <button key={key} onClick={() => { setFiltre(key); setPage(0) }} style={{
            padding: '7px 14px', fontSize: '11px', background: 'none', border: 'none',
            borderBottom: filtre === key ? '2px solid #7aaa8e' : '2px solid transparent',
            color: filtre === key ? '#a8d4b8' : '#6a9080', cursor: 'pointer', marginBottom: '-1px',
          }}>
            {label}
          </button>
        ))}
      </div>

      {chargement ? (
        <p style={{ fontSize: '12px', color: '#6a9080', fontStyle: 'italic' }}>Chargement...</p>
      ) : erreur ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#c0562a' }}>{erreur}</span>
          <button onClick={charger} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #4a6459', background: 'transparent', color: '#7aaa8e', cursor: 'pointer' }}>Réessayer</button>
        </div>
      ) : notices.length === 0 ? (
        <p style={{ fontSize: '12.5px', color: '#6a9080', fontStyle: 'italic' }}>Aucune notice dans cette catégorie.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {regrouperNotices(notices).map(groupe => (
            <div key={groupe.cle} style={{ border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
              <div style={{ padding: '9px 14px', background: '#f5f1e8', borderBottom: '1px solid #e4dfd8', display: 'flex', alignItems: 'baseline', gap: '9px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.8px', fontWeight: 700, color: '#2a3d30', fontFamily: 'Georgia, serif' }}>{groupe.titre}</span>
                <span style={{ fontSize: '11px', color: '#6b6560', fontStyle: 'italic' }}>{groupe.auteur}</span>
                <span style={{ fontSize: '10px', color: '#b0a89e' }}>{groupe.notices.length} titre{groupe.notices.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {groupe.notices.map(n => {
                  const ouv = ouverte === n.id
                  const dec = couleurDecision(n.decision_import)
                  return (
                    <div key={n.id} style={{
                      background: n.verifie ? '#f0f5f2' : '#fff',
                      borderTop: '1px solid #ede9e2',
                      overflow: 'hidden',
                    }}>
                <div style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setOuverte(ouv ? null : n.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12.2px', fontWeight: 500, color: '#3f3832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px', fontStyle: n.titre_edition || n.titre_original ? 'italic' : 'normal' }}>
                        {titreDeclineNotice(n)}
                      </span>
                      {n.dates_auteur && <span style={{ fontSize: '10px', color: '#b0a89e' }}>{n.dates_auteur}</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: '#b0a89e', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {n.traducteur && <span>trad. {n.traducteur}</span>}
                      {datePublication(n) && <span>{datePublication(n)}</span>}
                      {n.editeur && <span>{n.editeur}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f0f0ee', color: couleurScore(n.score_fiabilite), minWidth: '24px', textAlign: 'center' }}>
                      {n.score_fiabilite ?? 'Score ?'}
                    </span>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: dec.bg, color: dec.color, border: `1px solid ${dec.border}`, whiteSpace: 'nowrap' }}>
                      {labelDecision(n.decision_import)}
                    </span>
                    {n.verifie ? (
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#d8ede2', color: '#3d6b4f', fontWeight: 600 }}>Validee</span>
                    ) : (
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#fff1ee', color: '#a43d2d' }}>A verifier</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setOuverte(ouv ? null : n.id) }}
                      style={{ fontSize: '9.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #d6d0c4', background: ouv ? '#3d6b4f' : '#fff', color: ouv ? '#fff' : '#3d6b4f', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {ouv ? 'Replier' : 'Déployer'}
                    </button>
                  </div>
                </div>

                {ouv && (
                  <div style={{ borderTop: `1px solid ${n.verifie ? '#b8d4c4' : '#ede9e2'}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: n.verifie ? '#e8f2ec' : '#faf8f4' }}>
                    <DetailNotice n={n} />

                    {n.url_source && (
                      <a href={n.url_source} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3d6b87', wordBreak: 'break-all', textDecoration: 'underline' }}>
                        {n.url_source}
                      </a>
                    )}

                    {n.verifie ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #b8d4c4' }}>
                        <span style={{ fontSize: '11px', color: '#3d6b4f', fontStyle: 'italic' }}>Notice validée - verrouillée définitivement</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid #ede9e2', flexWrap: 'wrap' }}>
                        <button onClick={() => valider(n.id)} className="btn-vert" style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', cursor: 'pointer' }}>
                          Valider définitivement
                        </button>
                        <button onClick={() => supprimer(n.id)} className="btn-rouge" style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {total > 100 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingTop: '16px', alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #344d3e', background: 'transparent', color: page === 0 ? '#4a6459' : '#7aaa8e', cursor: page === 0 ? 'default' : 'pointer' }}>
                Précédent
              </button>
              <span style={{ fontSize: '11px', color: '#6a9080' }}>Page {page + 1} / {Math.ceil(total / 100)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 100 >= total}
                style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #344d3e', background: 'transparent', color: (page + 1) * 100 >= total ? '#4a6459' : '#7aaa8e', cursor: (page + 1) * 100 >= total ? 'default' : 'pointer' }}>
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
