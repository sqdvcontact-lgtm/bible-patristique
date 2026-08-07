'use client'

// Admin des OUVRAGES bibliographiques (références citées en documentation), adossé au
// nouveau système de qualification scientifique déjà déployé dans la base.
//
// Doctrine (ne pas la réimplémenter en TypeScript) :
//  · La valeur scientifique finale d'un ouvrage est CALCULÉE par Supabase dans
//    ouvrages_bibliographiques.statut_scientifique. Le code la lit, il ne la recalcule
//    jamais à partir des scores.
//  · La décision manuelle passe par statut_scientifique_override ; « — calcul
//    automatique — » remet cet override à null et rend la main au calcul de la base.
//  · Les rangs sont un rang ACADÉMIQUE, jamais des étoiles.
//  · Les refus de la base (lien vers un ouvrage inadmissible, validation d'un ouvrage
//    non retenu, exclusion sans motif) sont interceptés et expliqués, sans mise à jour
//    optimiste définitive avant confirmation.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { messageErreurQualification } from './qualification'

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'

// ── Libellés français (rang académique, non une note populaire) ─────────────
const L_SCI: Record<string, string> = { retenu: 'Retenu', secondaire: 'Source secondaire', a_verifier: 'À vérifier', exclu: 'Exclu' }
const C_SCI: Record<string, string> = { retenu: '#3d6b4f', secondaire: '#6f8a3e', a_verifier: '#9a7a38', exclu: '#9a2a2a' }
const L_EDITO: Record<string, string> = { a_revoir: 'À revoir', en_cours: 'En cours', valide: 'Validé', rejete: 'Rejeté' }
const C_EDITO: Record<string, string> = { a_revoir: '#9a7a38', en_cours: '#5f6b86', valide: '#3d6b4f', rejete: '#9a2a2a' }
const L_ROLE: Record<string, string> = { auteur_scientifique: 'Auteur (chercheur)', auteur_source: 'Auteur source (ancien)', editeur_scientifique: 'Éditeur scientifique', traducteur: 'Traducteur' }
const L_NATURE: Record<string, string> = { chercheur: 'Chercheur moderne', auteur_ancien: 'Auteur ancien', collectif: 'Collectif' }
const L_GARANTIE: Record<string, string> = { editeur_universitaire: 'Éditeur universitaire', collection_scientifique: 'Collection scientifique', edition_critique: 'Édition critique', a_verifier: 'À vérifier' }
const TYPES_OUVRAGE = ['commentaire_critique', 'monographie', 'introduction', 'edition_critique', 'histoire_reception', 'theologie_biblique', 'outil_philologique', 'autre_scientifique'] as const
const OVERRIDES = ['retenu', 'secondaire', 'a_verifier', 'exclu'] as const
const CONFIANCES = ['forte', 'moyenne', 'faible'] as const

// ── Types ───────────────────────────────────────────────────────────────────
type Contributeur = { nom: string; role: string; score: number | null; nature: string; statut: string | null; reserve: boolean }
type LigneQualite = {
  id: number; auteurs: string | null; titre: string; collection: string | null; editeur: string | null; annee: number | null
  statut_scientifique: string; statut_scientifique_override: string | null; motif_statut_scientifique: string | null
  statut_editorial: string; statut_editeur: string | null; statut_collection: string | null
  editeur_canonique: string | null; collection_canonique: string | null
  contributeurs: Contributeur[] | null; admissible: boolean; a_controler: boolean; a_ecarter: boolean
}
type OuvrageDetail = {
  id: number; auteurs: string; titre: string; sous_titre: string | null; directeurs: string | null; traducteurs: string | null
  collection: string | null; numero_collection: string | null; lieu: string | null; editeur: string; annee: number | null
  isbn: string | null; langue: string | null; type_ouvrage: string | null; garantie_scientifique: string | null; note: string | null
  statut_editorial: string; editeur_valeur_id: number | null; collection_valeur_id: number | null
  statut_scientifique: string; statut_scientifique_override: string | null; motif_statut_scientifique: string | null
  source_evaluation_scientifique: string | null; confiance_evaluation_scientifique: string | null
}
type Autorite = { id: number; nom: string; score: number | null; reserve?: boolean }
type LigneContrib = { id: number; ouvrage_id: number; auteur_valeur_id: number | null; nom_affiche: string; role_contributeur: string; nature_personne: string; ordre: number }

const messageErreur = messageErreurQualification

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// ── Puce de statut (couleur + libellé, jamais d'étoile) ─────────────────────
function Puce({ txt, coul }: { txt: string; coul: string }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.02em', color: coul, background: `${coul}18`, border: `1px solid ${coul}40`, borderRadius: '5px', padding: '1px 7px', whiteSpace: 'nowrap' }}>{txt}</span>
  )
}

// Filtre en pastille. Défini hors du composant pour ne pas être recréé à chaque rendu.
function Chip({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontFamily: SANS, fontSize: '0.72rem', fontWeight: actif ? 700 : 500, cursor: 'pointer', padding: '4px 11px', borderRadius: '20px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.1)' : 'var(--cs-surface)', color: actif ? 'var(--cs-vert-fonce)' : 'var(--cs-texte-second)', whiteSpace: 'nowrap' }}>{children}</button>
  )
}

const champStyle: React.CSSProperties = { fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '6px', padding: '6px 9px', width: '100%' }
const labelStyle: React.CSSProperties = { fontFamily: SANS, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '3px' }

export default function SectionOuvrages() {
  const [lignes, setLignes] = useState<LigneQualite[]>([])
  const [editeursV, setEditeursV] = useState<Autorite[]>([])
  const [collectionsV, setCollectionsV] = useState<Autorite[]>([])
  const [auteursV, setAuteursV] = useState<Autorite[]>([])
  const [chargement, setChargement] = useState(true)
  const [q, setQ] = useState('')
  const [filtreSci, setFiltreSci] = useState<string>('')      // '', retenu, secondaire, a_verifier, exclu
  const [filtreDrapeau, setFiltreDrapeau] = useState<string>('') // '', override, reserve, edito_a_revoir, edito_rejete
  const [ouvertId, setOuvertId] = useState<number | null>(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    let annule = false
    ;(async () => {
      const [vue, ed, co, au] = await Promise.all([
        supabase.from('v_ouvrages_bibliographiques_qualite')
          .select('id, auteurs, titre, collection, editeur, annee, statut_scientifique, statut_scientifique_override, motif_statut_scientifique, statut_editorial, statut_editeur, statut_collection, editeur_canonique, collection_canonique, contributeurs, admissible, a_controler, a_ecarter')
          .order('titre'),
        supabase.from('editeurs_valeur').select('id, nom, score').order('nom'),
        supabase.from('collections_valeur').select('id, nom, score').order('nom'),
        supabase.from('auteurs_valeur').select('id, nom, score, reserve').order('nom'),
      ])
      if (annule) return
      if (vue.error) setErreur(messageErreur(vue.error.message))
      setLignes((vue.data ?? []) as LigneQualite[])
      setEditeursV((ed.data ?? []) as Autorite[])
      setCollectionsV((co.data ?? []) as Autorite[])
      setAuteursV((au.data ?? []) as Autorite[])
      setChargement(false)
    })()
    return () => { annule = true }
  }, [])

  // Recharge une seule ligne après une écriture (la base a pu recalculer le statut).
  const rechargerLigne = useCallback(async (id: number) => {
    const { data } = await supabase.from('v_ouvrages_bibliographiques_qualite')
      .select('id, auteurs, titre, collection, editeur, annee, statut_scientifique, statut_scientifique_override, motif_statut_scientifique, statut_editorial, statut_editeur, statut_collection, editeur_canonique, collection_canonique, contributeurs, admissible, a_controler, a_ecarter')
      .eq('id', id).maybeSingle()
    if (data) setLignes(prev => prev.map(l => l.id === id ? (data as LigneQualite) : l))
  }, [])

  const qn = sansAccents(q.trim())
  const filtrees = useMemo(() => lignes.filter(l => {
    if (qn && !sansAccents(`${l.titre} ${l.auteurs ?? ''} ${l.editeur ?? ''} ${l.collection ?? ''}`).includes(qn)) return false
    if (filtreSci && l.statut_scientifique !== filtreSci) return false
    if (filtreDrapeau === 'override' && !l.statut_scientifique_override) return false
    if (filtreDrapeau === 'reserve' && !(l.contributeurs ?? []).some(c => c.reserve)) return false
    if (filtreDrapeau === 'edito_a_revoir' && l.statut_editorial !== 'a_revoir') return false
    if (filtreDrapeau === 'edito_rejete' && l.statut_editorial !== 'rejete') return false
    return true
  }), [lignes, qn, filtreSci, filtreDrapeau])

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.85rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Ouvrages bibliographiques</h2>
      <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 16px', maxWidth: '52rem' }}>
        La valeur scientifique est calculée par la base à partir de l’éditeur, de la collection et des contributeurs. On peut ici consulter ce statut, saisir une décision manuelle si nécessaire, et rattacher un ouvrage à ses autorités normalisées. Les Pères et autres auteurs anciens sont des sources, jamais des fiches notées.
      </p>

      {erreur && <p role="alert" style={{ fontFamily: SANS, fontSize: '0.78rem', color: 'var(--cs-danger-fonce)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '7px', padding: '8px 11px', margin: '0 0 12px' }}>{erreur}</p>}
      {info && <p style={{ fontFamily: SANS, fontSize: '0.78rem', color: 'var(--cs-vert-fonce)', background: 'rgba(var(--cs-vert-rgb),0.08)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', borderRadius: '7px', padding: '8px 11px', margin: '0 0 12px' }}>{info}</p>}

      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center', marginBottom: '14px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Titre, auteur, éditeur…"
          style={{ ...champStyle, width: 'auto', flex: '1 1 16rem', minWidth: '12rem' }} />
        {(['retenu', 'secondaire', 'a_verifier', 'exclu'] as const).map(s => (
          <Chip key={s} actif={filtreSci === s} onClick={() => setFiltreSci(filtreSci === s ? '' : s)}>{L_SCI[s]}</Chip>
        ))}
        <span aria-hidden style={{ width: '1px', height: '18px', background: 'var(--cs-bord)' }} />
        <Chip actif={filtreDrapeau === 'override'} onClick={() => setFiltreDrapeau(filtreDrapeau === 'override' ? '' : 'override')}>Décision manuelle</Chip>
        <Chip actif={filtreDrapeau === 'reserve'} onClick={() => setFiltreDrapeau(filtreDrapeau === 'reserve' ? '' : 'reserve')}>Contributeur en réserve</Chip>
        <Chip actif={filtreDrapeau === 'edito_a_revoir'} onClick={() => setFiltreDrapeau(filtreDrapeau === 'edito_a_revoir' ? '' : 'edito_a_revoir')}>À revoir</Chip>
        <Chip actif={filtreDrapeau === 'edito_rejete'} onClick={() => setFiltreDrapeau(filtreDrapeau === 'edito_rejete' ? '' : 'edito_rejete')}>Rejeté</Chip>
      </div>

      <p style={{ fontFamily: SANS, fontSize: '0.7rem', color: 'var(--cs-texte-faible)', margin: '0 0 8px' }}>{filtrees.length} ouvrage{filtrees.length > 1 ? 's' : ''}</p>

      {/* Liste */}
      <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '9px', overflow: 'hidden' }}>
        {filtrees.map((l, i) => {
          const ouvert = ouvertId === l.id
          const enReserve = (l.contributeurs ?? []).some(c => c.reserve)
          return (
            <div key={l.id} style={{ borderTop: i > 0 ? '1px solid var(--cs-bord-clair)' : 'none', background: ouvert ? 'rgba(var(--cs-vert-rgb),0.03)' : 'transparent' }}>
              <button onClick={() => setOuvertId(ouvert ? null : l.id)}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '9px 12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: '0.9rem', color: 'var(--cs-texte)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.titre}{l.annee ? <span style={{ color: 'var(--cs-texte-faible)' }}> ({l.annee})</span> : null}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: '0.72rem', color: 'var(--cs-texte-faible)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.auteurs || '—'}{l.editeur ? ` · ${l.editeur}` : ''}{l.collection ? ` · ${l.collection}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  {enReserve && <span title="Un contributeur est en réserve" style={{ fontSize: '0.72rem', color: 'var(--cs-danger-fonce)' }}>⚑</span>}
                  {l.statut_scientifique_override && <Puce txt="Manuel" coul="#5f6b86" />}
                  <Puce txt={L_EDITO[l.statut_editorial] ?? l.statut_editorial} coul={C_EDITO[l.statut_editorial] ?? '#5f6b86'} />
                  <Puce txt={L_SCI[l.statut_scientifique] ?? l.statut_scientifique} coul={C_SCI[l.statut_scientifique] ?? '#5f6b86'} />
                </div>
              </button>
              {ouvert && <Editeur id={l.id} ligne={l} editeursV={editeursV} collectionsV={collectionsV} auteursV={auteursV}
                onErreur={setErreur} onInfo={setInfo} onSauve={() => rechargerLigne(l.id)} />}
            </div>
          )
        })}
        {filtrees.length === 0 && <p style={{ fontFamily: SANS, fontSize: '0.82rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', padding: '14px 12px', margin: 0 }}>Aucun ouvrage ne correspond.</p>}
      </div>
    </div>
  )
}

// ── Panneau d'édition d'un ouvrage ──────────────────────────────────────────
function Editeur({ id, ligne, editeursV, collectionsV, auteursV, onErreur, onInfo, onSauve }: {
  id: number; ligne: LigneQualite; editeursV: Autorite[]; collectionsV: Autorite[]; auteursV: Autorite[]
  onErreur: (s: string) => void; onInfo: (s: string) => void; onSauve: () => void
}) {
  const [detail, setDetail] = useState<OuvrageDetail | null>(null)
  const [contribs, setContribs] = useState<LigneContrib[]>([])
  const [f, setF] = useState<Partial<OuvrageDetail>>({})

  useEffect(() => {
    let annule = false
    ;(async () => {
      const [d, c] = await Promise.all([
        supabase.from('ouvrages_bibliographiques')
          .select('id, auteurs, titre, sous_titre, directeurs, traducteurs, collection, numero_collection, lieu, editeur, annee, isbn, langue, type_ouvrage, garantie_scientifique, note, statut_editorial, editeur_valeur_id, collection_valeur_id, statut_scientifique, statut_scientifique_override, motif_statut_scientifique, source_evaluation_scientifique, confiance_evaluation_scientifique')
          .eq('id', id).maybeSingle(),
        supabase.from('ouvrage_contributeurs_scientifiques')
          .select('id, ouvrage_id, auteur_valeur_id, nom_affiche, role_contributeur, nature_personne, ordre')
          .eq('ouvrage_id', id).order('ordre'),
      ])
      if (annule) return
      setDetail((d.data ?? null) as OuvrageDetail | null)
      setF((d.data ?? {}) as Partial<OuvrageDetail>)
      setContribs((c.data ?? []) as LigneContrib[])
    })()
    return () => { annule = true }
  }, [id])

  const set = (k: keyof OuvrageDetail, v: unknown) => setF(prev => ({ ...prev, [k]: v }))

  // Écrit des champs de l'ouvrage (confirmé par la base avant de conclure).
  const ecrire = async (champs: Record<string, unknown>, messageOk: string) => {
    onErreur(''); onInfo('')
    const { error } = await supabase.from('ouvrages_bibliographiques').update(champs).eq('id', id)
    if (error) { onErreur(messageErreur(error.message)); return false }
    onInfo(messageOk); onSauve()
    return true
  }

  if (!detail) return <p style={{ fontFamily: SANS, fontSize: '0.78rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', padding: '10px 14px' }}>Chargement de la fiche…</p>

  const sciCalc = ligne.statut_scientifique // valeur calculée par la base, en lecture seule
  const overrideActuel = f.statut_scientifique_override ?? null

  // Enregistre la décision manuelle. Pré-contrôle : exclusion => motif obligatoire.
  const enregistrerDecision = async () => {
    if (overrideActuel === 'exclu' && !((f.motif_statut_scientifique ?? '').trim())) {
      onErreur('Une exclusion manuelle exige un motif.'); return
    }
    await ecrire({
      statut_scientifique_override: overrideActuel,
      motif_statut_scientifique: (f.motif_statut_scientifique ?? '') || null,
      source_evaluation_scientifique: (f.source_evaluation_scientifique ?? '') || null,
      confiance_evaluation_scientifique: f.confiance_evaluation_scientifique || null,
      evalue_at_scientifique: new Date().toISOString(),
    }, 'Décision scientifique enregistrée.')
  }
  const revenirAuto = async () => {
    set('statut_scientifique_override', null)
    await ecrire({ statut_scientifique_override: null }, 'Retour au calcul automatique.')
  }

  // Statut éditorial : la base refuse « validé » si la valeur scientifique n'est pas
  // admise (retenu / secondaire) ; on l'annonce avant l'écriture (§10).
  const majEditorial = async (v: string) => {
    if (v === 'valide' && !['retenu', 'secondaire'].includes(sciCalc)) {
      onErreur('Cet ouvrage ne peut pas être validé tant que sa valeur scientifique n’est pas admise (retenu ou source secondaire).')
      return
    }
    const champs: Record<string, unknown> = { statut_editorial: v }
    if (v === 'valide') { champs.valide_at = new Date().toISOString(); champs.valide_par = 'admin' }
    if (await ecrire(champs, 'Statut éditorial mis à jour.')) set('statut_editorial', v)
  }

  const majRattachement = async (champ: 'editeur_valeur_id' | 'collection_valeur_id', v: number | null) => {
    set(champ, v)
    await ecrire({ [champ]: v }, 'Rattachement mis à jour.')
  }

  return (
    <div style={{ padding: '4px 14px 16px', display: 'grid', gap: '16px' }}>
      {/* A · Décision scientifique */}
      <fieldset style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px', margin: 0 }}>
        <legend style={{ fontFamily: SANS, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', padding: '0 5px' }}>Valeur scientifique</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontFamily: SANS, fontSize: '0.76rem', color: 'var(--cs-texte-second)' }}>Calcul de la base :</span>
          <Puce txt={L_SCI[sciCalc] ?? sciCalc} coul={C_SCI[sciCalc] ?? '#5f6b86'} />
          {ligne.editeur_canonique && <span style={{ fontFamily: SANS, fontSize: '0.7rem', color: 'var(--cs-texte-faible)' }}>éditeur : {ligne.editeur_canonique}{ligne.statut_editeur ? ` (${ligne.statut_editeur})` : ''}</span>}
          {ligne.collection_canonique && <span style={{ fontFamily: SANS, fontSize: '0.7rem', color: 'var(--cs-texte-faible)' }}>· collection : {ligne.collection_canonique}{ligne.statut_collection ? ` (${ligne.statut_collection})` : ''}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Décision manuelle</label>
            <select value={overrideActuel ?? ''} onChange={e => set('statut_scientifique_override', e.target.value || null)} style={champStyle}>
              <option value="">— calcul automatique —</option>
              {OVERRIDES.map(o => <option key={o} value={o}>{L_SCI[o]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Confiance</label>
            <select value={f.confiance_evaluation_scientifique ?? ''} onChange={e => set('confiance_evaluation_scientifique', e.target.value || null)} style={champStyle}>
              <option value="">—</option>
              {CONFIANCES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Source de l’évaluation</label>
            <input value={f.source_evaluation_scientifique ?? ''} onChange={e => set('source_evaluation_scientifique', e.target.value)} style={champStyle} />
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label style={labelStyle}>Motif {overrideActuel === 'exclu' && <span style={{ color: 'var(--cs-danger)' }}>(obligatoire pour une exclusion)</span>}</label>
          <input value={f.motif_statut_scientifique ?? ''} onChange={e => set('motif_statut_scientifique', e.target.value)} style={champStyle} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '11px' }}>
          <button onClick={enregistrerDecision} className="btn-vert" style={{ fontFamily: SANS, fontSize: '0.76rem', fontWeight: 600, padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Enregistrer la décision</button>
          {ligne.statut_scientifique_override && <button onClick={revenirAuto} className="btn-gris" style={{ fontFamily: SANS, fontSize: '0.76rem', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Revenir au calcul automatique</button>}
        </div>
      </fieldset>

      {/* B · Rattachements normalisés */}
      <fieldset style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px', margin: 0 }}>
        <legend style={{ fontFamily: SANS, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', padding: '0 5px' }}>Autorités & contributeurs</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Autorité éditrice</label>
            <select value={f.editeur_valeur_id ?? ''} onChange={e => majRattachement('editeur_valeur_id', e.target.value ? Number(e.target.value) : null)} style={champStyle}>
              <option value="">— aucune —</option>
              {editeursV.map(a => <option key={a.id} value={a.id}>{a.nom}{a.score ? ` — ${a.score}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Collection</label>
            <select value={f.collection_valeur_id ?? ''} onChange={e => majRattachement('collection_valeur_id', e.target.value ? Number(e.target.value) : null)} style={champStyle}>
              <option value="">— aucune —</option>
              {collectionsV.map(a => <option key={a.id} value={a.id}>{a.nom}{a.score ? ` — ${a.score}` : ''}</option>)}
            </select>
          </div>
        </div>
        <ContributeursEditeur ouvrageId={id} contribs={contribs} setContribs={setContribs} auteursV={auteursV} onErreur={onErreur} onInfo={onInfo} onChange={onSauve} />
      </fieldset>

      {/* C · Statut éditorial */}
      <fieldset style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px', margin: 0 }}>
        <legend style={{ fontFamily: SANS, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', padding: '0 5px' }}>Statut éditorial</legend>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {(['a_revoir', 'en_cours', 'valide', 'rejete'] as const).map(s => {
            const actif = (f.statut_editorial ?? detail.statut_editorial) === s
            return (
              <button key={s} onClick={() => majEditorial(s)} style={{ fontFamily: SANS, fontSize: '0.74rem', fontWeight: actif ? 700 : 500, cursor: 'pointer', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${actif ? C_EDITO[s] : 'var(--cs-bord)'}`, background: actif ? `${C_EDITO[s]}18` : 'var(--cs-surface)', color: actif ? C_EDITO[s] : 'var(--cs-texte-second)' }}>{L_EDITO[s]}</button>
            )
          })}
        </div>
      </fieldset>

      {/* D · Champs bibliographiques (affichage / compatibilité) */}
      <fieldset style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px', margin: 0 }}>
        <legend style={{ fontFamily: SANS, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', padding: '0 5px' }}>Notice bibliographique</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '9px' }}>
          {([['auteurs', 'Auteurs'], ['titre', 'Titre'], ['sous_titre', 'Sous-titre'], ['directeurs', 'Directeurs'], ['traducteurs', 'Traducteurs'], ['editeur', 'Éditeur (texte)'], ['collection', 'Collection (texte)'], ['numero_collection', 'N° collection'], ['lieu', 'Lieu'], ['isbn', 'ISBN']] as const).map(([k, lab]) => (
            <div key={k}>
              <label style={labelStyle}>{lab}</label>
              <input value={(f[k] as string) ?? ''} onChange={e => set(k, e.target.value)} style={champStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Année</label>
            <input type="number" value={f.annee ?? ''} onChange={e => set('annee', e.target.value ? Number(e.target.value) : null)} style={champStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={f.type_ouvrage ?? ''} onChange={e => set('type_ouvrage', e.target.value || null)} style={champStyle}>
              <option value="">—</option>
              {TYPES_OUVRAGE.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Garantie</label>
            <select value={f.garantie_scientifique ?? ''} onChange={e => set('garantie_scientifique', e.target.value || null)} style={champStyle}>
              <option value="">—</option>
              {Object.keys(L_GARANTIE).map(g => <option key={g} value={g}>{L_GARANTIE[g]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '11px' }}>
          <button onClick={() => ecrire({
            auteurs: (f.auteurs ?? '').trim(), titre: (f.titre ?? '').trim(), sous_titre: f.sous_titre || null,
            directeurs: f.directeurs || null, traducteurs: f.traducteurs || null, editeur: (f.editeur ?? '').trim(),
            collection: f.collection || null, numero_collection: f.numero_collection || null, lieu: f.lieu || null,
            isbn: f.isbn || null, annee: f.annee ?? null, type_ouvrage: f.type_ouvrage || null, garantie_scientifique: f.garantie_scientifique || null,
          }, 'Notice enregistrée.')} className="btn-vert" style={{ fontFamily: SANS, fontSize: '0.76rem', fontWeight: 600, padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Enregistrer la notice</button>
        </div>
      </fieldset>
    </div>
  )
}

// ── Éditeur des contributeurs scientifiques ─────────────────────────────────
function ContributeursEditeur({ ouvrageId, contribs, setContribs, auteursV, onErreur, onInfo, onChange }: {
  ouvrageId: number; contribs: LigneContrib[]; setContribs: (c: LigneContrib[]) => void
  auteursV: Autorite[]; onErreur: (s: string) => void; onInfo: (s: string) => void; onChange: () => void
}) {
  const [nature, setNature] = useState<'chercheur' | 'auteur_ancien' | 'collectif'>('chercheur')
  const [role, setRole] = useState('auteur_scientifique')
  const [auteurId, setAuteurId] = useState<number | ''>('')
  const [nomLibre, setNomLibre] = useState('')

  const ajouter = async () => {
    onErreur(''); onInfo('')
    // Contrainte de la base : chercheur ⇒ fiche notée obligatoire ; auteur ancien /
    // collectif ⇒ jamais de fiche notée (auteur_valeur_id null). §6.
    const estNote = nature === 'chercheur'
    if (estNote && !auteurId) { onErreur('Choisir la fiche du chercheur (les chercheurs modernes sont notés).'); return }
    if (!estNote && !nomLibre.trim()) { onErreur('Indiquer le nom affiché.'); return }
    const nom = estNote ? (auteursV.find(a => a.id === auteurId)?.nom ?? '') : nomLibre.trim()
    const ordre = contribs.length ? Math.max(...contribs.map(c => c.ordre)) + 1 : 1
    const { data, error } = await supabase.from('ouvrage_contributeurs_scientifiques')
      .insert({ ouvrage_id: ouvrageId, auteur_valeur_id: estNote ? auteurId : null, nom_affiche: nom, role_contributeur: role, nature_personne: nature, ordre })
      .select('id, ouvrage_id, auteur_valeur_id, nom_affiche, role_contributeur, nature_personne, ordre').maybeSingle()
    if (error) { onErreur(messageErreur(error.message)); return }
    if (data) { setContribs([...contribs, data as LigneContrib]); setNomLibre(''); setAuteurId(''); onInfo('Contributeur ajouté.'); onChange() }
  }

  const supprimer = async (cid: number) => {
    onErreur(''); onInfo('')
    const { error } = await supabase.from('ouvrage_contributeurs_scientifiques').delete().eq('id', cid)
    if (error) { onErreur(messageErreur(error.message)); return }
    setContribs(contribs.filter(c => c.id !== cid)); onChange()
  }

  return (
    <div>
      <label style={labelStyle}>Contributeurs</label>
      <div style={{ display: 'grid', gap: '5px', marginBottom: '10px' }}>
        {contribs.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontFamily: SANS, fontSize: '0.78rem', color: 'var(--cs-texte)', padding: '5px 8px', border: '1px solid var(--cs-bord-clair)', borderRadius: '6px' }}>
            <span style={{ flex: 1, minWidth: 0 }}>{c.nom_affiche}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--cs-texte-faible)' }}>{L_ROLE[c.role_contributeur] ?? c.role_contributeur}</span>
            <span style={{ fontSize: '0.66rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>{L_NATURE[c.nature_personne] ?? c.nature_personne}</span>
            <button onClick={() => supprimer(c.id)} title="Retirer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--cs-danger)', fontSize: '0.85rem', lineHeight: 1 }}>×</button>
          </div>
        ))}
        {contribs.length === 0 && <span style={{ fontFamily: SANS, fontSize: '0.74rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Aucun contributeur rattaché.</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '7px', alignItems: 'end', background: 'rgba(var(--cs-vert-rgb),0.03)', border: '1px solid var(--cs-bord-clair)', borderRadius: '7px', padding: '9px' }}>
        <div>
          <label style={labelStyle}>Nature</label>
          <select value={nature} onChange={e => setNature(e.target.value as typeof nature)} style={champStyle}>
            <option value="chercheur">Chercheur moderne</option>
            <option value="auteur_ancien">Auteur ancien</option>
            <option value="collectif">Collectif</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Rôle</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={champStyle}>
            {Object.keys(L_ROLE).map(r => <option key={r} value={r}>{L_ROLE[r]}</option>)}
          </select>
        </div>
        {nature === 'chercheur' ? (
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Fiche du chercheur</label>
            <select value={auteurId} onChange={e => setAuteurId(e.target.value ? Number(e.target.value) : '')} style={champStyle}>
              <option value="">— choisir —</option>
              {auteursV.map(a => <option key={a.id} value={a.id}>{a.nom}{a.score ? ` — ${a.score}` : ''}{a.reserve ? ' · réserve' : ''}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Nom affiché</label>
            <input value={nomLibre} onChange={e => setNomLibre(e.target.value)} placeholder="Origène, Auteurs patristiques divers…" style={champStyle} />
          </div>
        )}
        <button onClick={ajouter} className="btn-vert" style={{ fontFamily: SANS, fontSize: '0.74rem', fontWeight: 600, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', height: 'fit-content' }}>Ajouter</button>
      </div>
    </div>
  )
}
