'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  cleEditeur,
  construireIndexEditeurs,
  estCoedition,
  partiesCoedition,
  resoudreNomEditeur,
  variantesDepuisLignes,
} from '@/app/lib/editeursNormalisation'

// Écran de curation des éditeurs : liste, ajout/édition, et repérage des éditeurs
// « à normaliser » (présents dans oeuvres.editeur mais pas encore répertoriés). Les
// données brutes des œuvres ne sont jamais modifiées.
//
// ⛔ Le « ; » d’une mention d’éditeur dit que DEUX MAISONS ont coédité l’ouvrage : ce
// n’est jamais le nom d’une maison, et une forme composée n’a donc pas sa place parmi
// les répertoriés. Elle se TRAITE — on ouvre ou l’on réemploie chaque maison, puis la
// fiche composée disparaît. ⚠️ Une VARIANTE composée reste licite : « Veuve Jean
// Camusat ; Pierre Le Petit » est une graphie d’une maison unique.

type Editeur = {
  id: number
  nom_complet: string
  variantes: string[]
  ville: string | null
  annee_debut: number | null
  annee_fin: number | null
  notes: string | null
  // Marque de TRAVAIL, purement informative : ce que l’auteur a déjà examiné. ⛔ Elle ne
  // commande ni la résolution, ni l’affichage, ni la fusion.
  valide: boolean
  valide_le: string | null
}

type Brouillon = {
  id?: number
  nom_complet: string
  variantes: string
  ville: string
  annee_debut: string
  annee_fin: string
  notes: string
}

const VIDE: Brouillon = { nom_complet: '', variantes: '', ville: '', annee_debut: '', annee_fin: '', notes: '' }

// Le compte rendu d’une coédition traitée : ce qu’on a ouvert, ce qu’on a réemployé, et
// la fiche composée qui a disparu. Rien ne s’efface en silence.
function messageDeCoedition(r: {
  creees?: string[]; reemployees?: string[]; separee?: string | null
} | null): string {
  if (!r) return ''
  const noms = (liste: string[]) => liste.map(n => '« ' + n + ' »').join(', ')
  const phrases: string[] = []
  if (r.creees?.length) phrases.push('Maisons ouvertes : ' + noms(r.creees) + '.')
  if (r.reemployees?.length) phrases.push('Déjà répertoriées : ' + noms(r.reemployees) + '.')
  if (r.separee) phrases.push('La forme composée « ' + r.separee + ' » a quitté la liste des éditeurs.')
  return phrases.join(' ')
}

// Le compte rendu d'un enregistrement : ce qui a été absorbé de part et d'autre, et ce
// que le référentiel bibliographique a refusé. Une graphie ne disparaît pas en silence.
function messageDeFusion(r: {
  fusions?: string[]; fusionsAutorites?: string[]; avertissement?: string | null
} | null): string {
  if (!r) return ''
  const noms = (l: string[]) => l.map(n => '« ' + n + ' »').join(', ')
  const phrases: string[] = []
  if (r.fusions?.length) phrases.push(
    r.fusions.length > 1
      ? noms(r.fusions) + ' ne sont plus des éditeurs à part : ces fiches ont été fusionnées dans celle-ci.'
      : noms(r.fusions) + " n'est plus un éditeur à part : cette fiche a été fusionnée dans celle-ci.")
  if (r.fusionsAutorites?.length) phrases.push(
    'Dans les autorités bibliographiques, ' + noms(r.fusionsAutorites) + ' a rejoint la même autorité, avec ses notices.')
  if (r.avertissement) phrases.push(r.avertissement)
  return phrases.join(' ')
}

export default function SectionEditeurs() {
  const [editeurs, setEditeurs] = useState<Editeur[] | null>(null)
  const [aNormaliser, setANormaliser] = useState<string[]>([])
  const [brouillon, setBrouillon] = useState<Brouillon>(VIDE)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'err'>('idle')
  const [erreur, setErreur] = useState('')
  // Ce que l'enregistrement a FUSIONNÉ : une variante déclarée fait disparaître de la
  // liste l'autorité qu'elle remplace, et le dire est le seul moyen de s'en assurer.
  const [bilan, setBilan] = useState('')
  // Les maisons d’une coédition qu’on propose d’ouvrir séparément, après un refus de la
  // route ou un clic sur une forme composée de la file.
  const [coedition, setCoedition] = useState<{ parties: string[]; id?: number } | null>(null)
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'a_traiter' | 'valides'>('tous')

  const charger = useCallback(async () => {
    const [{ data: eds }, { data: oeuvres }] = await Promise.all([
      supabase.from('editeurs').select('*').order('nom_complet'),
      supabase.from('oeuvres').select('editeur').not('editeur', 'is', null),
    ])
    const liste = (eds ?? []) as Editeur[]
    setEditeurs(liste)
    // Clés couvertes (noms complets + variantes).
    const couvertes = new Set<string>()
    liste.forEach(e => { couvertes.add(cleEditeur(e.nom_complet)); (e.variantes ?? []).forEach(v => couvertes.add(cleEditeur(v))) })
    // La forme ENTIÈRE d'abord, ses co-éditeurs ensuite : « Veuve Jean Camusat ; Pierre
    // Le Petit » est une graphie répertoriée à elle seule, et la découper d'office ferait
    // reparaître ses deux moitiés dans la file de ce qui reste à normaliser.
    const brutes = new Set<string>()
    ;((oeuvres ?? []) as { editeur: string | null }[]).forEach(o => {
      const brut = String(o.editeur ?? '').trim()
      if (!brut || couvertes.has(cleEditeur(brut))) return
      brut.split(/\s*[;/]\s*/u).forEach((p: string) => {
        const t = p.trim()
        if (t && !couvertes.has(cleEditeur(t))) brutes.add(t)
      })
    })
    setANormaliser([...brutes].sort((a, b) => a.localeCompare(b, 'fr')))
  }, [])

  useEffect(() => { let a = false; (async () => { if (!a) await charger() })(); return () => { a = true } }, [charger])

  // Une maison porte un nom simple ; une coédition en réunit deux et se traite à part.
  const index = useMemo(() => construireIndexEditeurs(editeurs ?? []), [editeurs])
  // La recherche compare par CLÉ : « guerin » trouve « L. Guérin & Cie », accents,
  // ponctuation et casse étant ce que la clé efface. Elle regarde aussi les variantes,
  // puisque c’est souvent par elles qu’on cherche une maison.
  const retenus = useMemo(() => {
    const cle = cleEditeur(q)
    return (editeurs ?? []).filter(e =>
      (!cle || cleEditeur(e.nom_complet).includes(cle) || (e.variantes ?? []).some(v => cleEditeur(v).includes(cle)))
      && (filtre === 'tous' || (filtre === 'valides') === !!e.valide))
  }, [editeurs, q, filtre])
  const maisons = useMemo(() => retenus.filter(e => !estCoedition(e.nom_complet)), [retenus])
  const coeditions = useMemo(() => retenus.filter(e => estCoedition(e.nom_complet)), [retenus])
  const nbValides = useMemo(() => (editeurs ?? []).filter(e => e.valide).length, [editeurs])

  const editer = (e: Editeur) => setBrouillon({
    id: e.id, nom_complet: e.nom_complet, variantes: (e.variantes ?? []).join('\n'),
    ville: e.ville ?? '', annee_debut: e.annee_debut?.toString() ?? '', annee_fin: e.annee_fin?.toString() ?? '', notes: e.notes ?? '',
  })

  const enregistrer = async () => {
    if (!brouillon.nom_complet.trim()) { setErreur('Le nom complet est requis.'); setStatut('err'); return }
    setStatut('envoi'); setErreur('')
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/editeurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: brouillon.id,
        nom_complet: brouillon.nom_complet.trim(),
        variantes: variantesDepuisLignes(brouillon.variantes),
        ville: brouillon.ville.trim() || null,
        annee_debut: brouillon.annee_debut.trim() || null,
        annee_fin: brouillon.annee_fin.trim() || null,
        notes: brouillon.notes.trim() || null,
      }),
    })
    const reponse = await res.json().catch(() => null)
    if (!res.ok) {
      setErreur(reponse?.error ?? 'Erreur.'); setStatut('err')
      // ⛔ On n’enregistre pas « A ; B » : on propose d’ouvrir A et B.
      if (Array.isArray(reponse?.coedition)) setCoedition({ parties: reponse.coedition, id: brouillon.id })
      return
    }
    setBrouillon(VIDE); setStatut('idle'); setErreur(''); setCoedition(null)
    setBilan(messageDeFusion(reponse))
    await charger()
  }

  // La marque se pose SANS attendre le serveur : c’est un repère de travail, et une liste
  // de six cents lignes ne se recharge pas pour une case cochée. Un refus la rend.
  const basculerValide = async (fiche: Editeur) => {
    const valide = !fiche.valide
    const poser = (v: boolean, le: string | null) => setEditeurs(liste =>
      (liste ?? []).map(x => (x.id === fiche.id ? { ...x, valide: v, valide_le: le } : x)))
    poser(valide, valide ? new Date().toISOString() : null)
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/editeurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'valider', id: fiche.id, valide }),
    })
    if (!res.ok) {
      const reponse = await res.json().catch(() => null)
      poser(fiche.valide, fiche.valide_le)
      setErreur(reponse?.error ?? 'Erreur.'); setStatut('err')
    }
  }

  // Ouvre ou réemploie chaque maison, puis retire la fiche composée quand il y en a une.
  const ouvrirCoedition = async (parties: string[], id?: number) => {
    setStatut('envoi'); setErreur('')
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/editeurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'coedition', parties, id }),
    })
    const reponse = await res.json().catch(() => null)
    if (!res.ok) { setErreur(reponse?.error ?? 'Erreur.'); setStatut('err'); return }
    setStatut('idle'); setErreur(''); setCoedition(null); setBrouillon(VIDE)
    setBilan(messageDeCoedition(reponse))
    await charger()
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer cet éditeur de la table de référence ? (les œuvres ne sont pas touchées)')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    await fetch('/api/admin/editeurs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (brouillon.id === id) setBrouillon(VIDE)
    await charger()
  }

  const champ: React.CSSProperties = { width: '100%', fontSize: '0.8125rem', padding: '5px 8px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--cs-texte-gris)', textTransform: 'uppercase', margin: '0 0 2px' }
  const entete: React.CSSProperties = { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }

  // ⛔ Le libellé dit l’ÉTAT, non le geste : « À traiter » sur une fiche non traitée. Un
  // bouton qui nommerait l’action laisserait ignorer où l’on en est, ce qui est tout ce
  // qu’on lui demande.
  const boutonValide = (e: Editeur) => (
    <button className="ed-lien" onClick={() => basculerValide(e)}
      aria-pressed={e.valide}
      title={e.valide
        ? (e.valide_le ? `Validé le ${new Date(e.valide_le).toLocaleDateString('fr-FR')} — cliquer pour dé-valider` : 'Validé — cliquer pour dé-valider')
        : 'Marquer comme traité'}
      style={{ fontSize: '0.71875rem', color: e.valide ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, whiteSpace: 'nowrap' }}>
      {e.valide ? '\u2713\u202fValidé' : 'À traiter'}
    </button>
  )

  return (
    <div>
      <style>{`
        .ed-grid { display: grid; grid-template-columns: 20.5rem 1fr; gap: 22px; align-items: start; }
        .ed-aside { position: sticky; top: 4.75rem; }
        .ed-row:hover { border-color: rgba(var(--cs-vert-rgb),0.5) !important; }
        .ed-lien:hover { text-decoration: underline; }
        @media (max-width: 760px) {
          .ed-grid { grid-template-columns: 1fr; }
          .ed-aside { position: static; }
        }
      `}</style>

      <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '52rem' }}>
        Table de référence des maisons d’édition. Le <strong>nom complet</strong> s’affiche partout où l’éditeur est répertorié ; les <strong>variantes</strong> (abréviations, graphies) le résolvent. Les données des œuvres restent intactes.
      </p>

      <div className="ed-grid">
        {/* ── Colonne gauche : formulaire + à normaliser (collante) ── */}
        <div className="ed-aside">
          <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '13px 14px' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>{brouillon.id ? 'Modifier un éditeur' : 'Ajouter un éditeur'}</p>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '11px' }}>
              <div>
                <label style={label}>Nom complet *</label>
                <input style={champ} value={brouillon.nom_complet} onChange={e => setBrouillon(b => ({ ...b, nom_complet: e.target.value }))} placeholder="Louis Guérin" />
              </div>
              <div>
                <label style={label}>Variantes (une par ligne)</label>
                <textarea rows={3} style={{ ...champ, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
                  value={brouillon.variantes} onChange={e => setBrouillon(b => ({ ...b, variantes: e.target.value }))}
                  placeholder={'L. Guérin\nL. Guérin & Cie'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '7px' }}>
                <div>
                  <label style={label}>Ville</label>
                  <input style={champ} value={brouillon.ville} onChange={e => setBrouillon(b => ({ ...b, ville: e.target.value }))} placeholder="Paris" />
                </div>
                <div>
                  <label style={label}>Depuis</label>
                  <input style={champ} value={brouillon.annee_debut} onChange={e => setBrouillon(b => ({ ...b, annee_debut: e.target.value }))} placeholder="1840" />
                </div>
                <div>
                  <label style={label}>Jusqu’à</label>
                  <input style={champ} value={brouillon.annee_fin} onChange={e => setBrouillon(b => ({ ...b, annee_fin: e.target.value }))} placeholder="1884" />
                </div>
              </div>
              <div>
                <label style={label}>Notes</label>
                <input style={champ} value={brouillon.notes} onChange={e => setBrouillon(b => ({ ...b, notes: e.target.value }))} placeholder="Facultatif" />
              </div>
            </div>
            {statut === 'err' && <p style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', margin: '0 0 8px' }}>{erreur}</p>}
            {coedition && (
              <div style={{ margin: '0 0 8px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', lineHeight: 1.45, margin: '0 0 6px' }}>
                  Deux maisons ont coédité : {coedition.parties.map(m => `« ${m} »`).join(
)}. Chacune devient une fiche.
                </p>
                <button onClick={() => ouvrirCoedition(coedition.parties, coedition.id)} disabled={statut === 'envoi'}
                  style={{ fontSize: '0.75rem', padding: '4px 11px', borderRadius: '4px', border: '1px solid var(--cs-vert)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', fontWeight: 600 }}>
                  Ouvrir les {coedition.parties.length} maisons séparément
                </button>
              </div>
            )}
            {bilan && <p style={{ fontSize: '0.75rem', color: 'var(--cs-vert)', margin: '0 0 8px', lineHeight: 1.45 }}>{bilan}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {brouillon.id && <button onClick={() => { setBrouillon(VIDE); setStatut('idle'); setBilan('') }} style={{ fontSize: '0.78125rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>}
              <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize: '0.78125rem', padding: '5px 15px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 600 }}>
                {statut === 'envoi' ? 'Enregistrement…' : brouillon.id ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>

          {/* À normaliser */}
          {aNormaliser.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ ...entete, color: 'var(--cs-attente)' }}>À normaliser ({aNormaliser.length})</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', lineHeight: 1.45, margin: '0 0 9px' }}>Formes rencontrées dans le catalogue, pas encore répertoriées. Cliquez pour préremplir le formulaire.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {aNormaliser.map(nom => (
                  <button key={nom} onClick={() => setBrouillon({ ...VIDE, nom_complet: nom })}
                    style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-danger-fond)', color: 'var(--cs-attente)', cursor: 'pointer' }}>
                    {nom}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite : liste des éditeurs répertoriés ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', margin: '0 0 13px' }}>
            <input value={q} onChange={ev => setQ(ev.target.value)} aria-label="Rechercher un éditeur"
              placeholder="Rechercher un nom ou une variante…"
              style={{ ...champ, width: 'auto', flex: '1 1 15rem', maxWidth: '24rem' }} />
            <div role="group" aria-label="Filtrer par état" style={{ display: 'inline-flex', border: '1px solid var(--cs-bord)', borderRadius: '999px', overflow: 'hidden' }}>
              {([['tous', 'Tous'], ['a_traiter', 'À traiter'], ['valides', 'Validés']] as const).map(([cle, libelle]) => (
                <button key={cle} onClick={() => setFiltre(cle)} aria-pressed={filtre === cle}
                  style={{ fontSize: '0.71875rem', fontWeight: 600, padding: '4px 12px', border: 'none', cursor: 'pointer',
                    background: filtre === cle ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)',
                    color: filtre === cle ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)' }}>
                  {libelle}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)' }} aria-live="polite">
              {nbValides} validés sur {editeurs?.length ?? 0}
            </span>
          </div>
          <p style={{ ...entete, color: 'var(--cs-texte-gris)' }}>Répertoriés ({maisons.length})</p>
          {editeurs === null ? (
            <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
          ) : maisons.length === 0 ? (
            <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>{q || filtre !== 'tous' ? 'Aucun éditeur ne répond à cette recherche.' : 'Aucun éditeur répertorié pour l’instant.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {maisons.map(e => (
                <div key={e.id} className="ed-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '7px 11px', transition: 'border-color 0.12s' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: 'var(--cs-encre-fonce)' }}>{e.nom_complet}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', marginTop: '1px' }}>
                      {e.variantes?.length > 0 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>≈ {e.variantes.join(' · ')}</span>}
                      {(e.ville || e.annee_debut || e.annee_fin) && <span>{[e.ville, [e.annee_debut, e.annee_fin].filter(Boolean).join('–')].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '9px', flexShrink: 0 }}>
                    {boutonValide(e)}
                    <button className="ed-lien" onClick={() => editer(e)} style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Modifier</button>
                    <button className="ed-lien" onClick={() => supprimer(e.id)} style={{ fontSize: '0.71875rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Coéditions : deux maisons pour un même ouvrage, jamais une autorité ── */}
          {coeditions.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ ...entete, color: 'var(--cs-attente)' }}>Coéditions à séparer ({coeditions.length})</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', lineHeight: 1.45, margin: '0 0 9px', maxWidth: '38rem' }}>
                Le point-virgule dit que deux maisons ont travaillé au même ouvrage : ce n’est pas le nom d’un éditeur.
                Chaque maison déjà répertoriée est réemployée ; les autres s’ouvrent. La forme composée disparaît alors de la liste.
                ⚠️ Une partie qui n’est pas une maison, une mention de diffusion ou d’impression, se retire d’abord par « Corriger le nom ».
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {coeditions.map(e => {
                  const parties = partiesCoedition(e.nom_complet)
                  return (
                    <div key={e.id} className="ed-row"
                      style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '7px 11px', transition: 'border-color 0.12s' }}>
                      <div style={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                        {parties.map((partie, rang) => {
                          const connue = resoudreNomEditeur(partie, index)
                          return (
                            <React.Fragment key={partie}>
                              {rang > 0 && <span style={{ color: 'var(--cs-texte-faible)', fontSize: '0.75rem' }}>+</span>}
                              <span title={connue && connue !== partie ? `répertoriée sous « ${connue} »` : undefined}
                                style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', padding: '2px 9px', borderRadius: '999px', border: connue ? '1px solid var(--cs-bord-clair)' : '1px solid var(--cs-danger-bord)', background: connue ? 'var(--cs-fond-doux)' : 'var(--cs-danger-fond)', color: connue ? 'var(--cs-encre-fonce)' : 'var(--cs-attente)' }}>
                                {partie}
                              </span>
                            </React.Fragment>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '9px', flexShrink: 0 }}>
                        {boutonValide(e)}
                        <button className="ed-lien" onClick={() => ouvrirCoedition(parties, e.id)} disabled={statut === 'envoi'}
                          style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Séparer</button>
                        <button className="ed-lien" onClick={() => editer(e)}
                          style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-second)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Corriger le nom</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
