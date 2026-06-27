'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { calculerRang, couleurRang } from '@/app/lib/classement'

const CATEGORIES = ['Philosophie', 'Théologie', 'Exégèse', 'Spiritualité', 'Littérature', 'Poésie', 'Histoire', 'Patristique']
const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000

type Onglet = 'communaute' | 'mes-ecrits'

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; nb_vues: number; publie_at: string | null; auteur: string; auteur_score: number
}

type EssaiPerso = {
  id: number; titre: string; sous_titre: string | null; statut: string
  updated_at: string | null; publie_at: string | null; nb_vues: number | null
}

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: '#9a958d' },
  en_attente: { label: 'En attente', couleur: '#9a5a2a' },
  publie: { label: 'Publié', couleur: '#3d6b4f' },
  a_reviser: { label: 'À réviser', couleur: '#c0562a' },
  refuse: { label: 'Refusé', couleur: '#c0562a' },
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

export default function EssaisListeClient({ essais }: { essais: EssaiResume[] }) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('communaute')
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null)
  const [mesEcrits, setMesEcrits] = useState<EssaiPerso[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      setConnecte(!!uid)
      if (!uid) { setMesEcrits([]); return }
      chargerMesEcrits(uid)
    })
  }, [])

  const chargerMesEcrits = async (uid?: string) => {
    const id = uid ?? (await supabase.auth.getSession()).data.session?.user.id
    if (!id) return
    const { data } = await supabase
      .from('essais')
      .select('id, titre, sous_titre, statut, updated_at, publie_at, nb_vues')
      .eq('user_id', id)
      .order('updated_at', { ascending: false })
    setMesEcrits(data ?? [])
  }

  const changerStatut = async (id: number, statut: string) => {
    const payload = statut === 'publie'
      ? { statut, publie_at: new Date().toISOString() }
      : { statut }
    await supabase.from('essais').update(payload).eq('id', id)
    await chargerMesEcrits()
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer définitivement cet écrit ?')) return
    await supabase.from('essais').delete().eq('id', id)
    await chargerMesEcrits()
  }

  const q = sansAccents(recherche.trim())
  const essaisFiltres = essais.filter(e => {
    if (filtreCategorie && !e.categories.includes(filtreCategorie)) return false
    if (!q) return true
    return sansAccents(e.auteur).includes(q) || sansAccents(e.titre).includes(q) || (e.resume && sansAccents(e.resume).includes(q))
  })

  const parAuteur = new Map<string, EssaiResume[]>()
  essaisFiltres.forEach(e => {
    const liste = parAuteur.get(e.auteur) ?? []
    liste.push(e)
    parAuteur.set(e.auteur, liste)
  })
  const auteurs = [...parAuteur.keys()].sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 32px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '14px' }}>
            Essais et méditations
          </h1>
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto 18px' }} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', borderBottom: '1px solid #ddd8cf', marginBottom: '14px', flexWrap: 'wrap' }}>
            {([
              { key: 'communaute' as const, label: 'Communications de la communauté' },
              { key: 'mes-ecrits' as const, label: 'Mes écrits' },
            ]).map(o => (
              <button key={o.key} onClick={() => setOnglet(o.key)}
                style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {o.label}
              </button>
            ))}
            <button type="button" onClick={() => router.push('/essais/nouveau')} style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 400, color: '#3d6b4f', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Écrire
            </button>
          </div>
        </div>

        {onglet === 'communaute' ? (
          <OngletCommunaute
            recherche={recherche}
            setRecherche={setRecherche}
            filtreCategorie={filtreCategorie}
            setFiltreCategorie={setFiltreCategorie}
            auteurs={auteurs}
            parAuteur={parAuteur}
          />
        ) : (
          <OngletMesEcrits connecte={connecte} essais={mesEcrits} changerStatut={changerStatut} supprimer={supprimer} />
        )}
      </div>
    </main>
  )
}

function OngletCommunaute({
  recherche, setRecherche, filtreCategorie, setFiltreCategorie, auteurs, parAuteur,
}: {
  recherche: string; setRecherche: (v: string) => void
  filtreCategorie: string | null; setFiltreCategorie: (v: string | null) => void
  auteurs: string[]; parAuteur: Map<string, EssaiResume[]>
}) {
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '320px', margin: '0 auto 16px' }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un auteur, un titre, un résumé"
            style={{ width: '100%', fontSize: '13px', padding: '8px 14px 8px 36px', border: '1px solid #d6d0c4', borderRadius: '20px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setFiltreCategorie(null)} style={tagFiltre(!filtreCategorie)}>Tout</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => setFiltreCategorie(c)} style={tagFiltre(filtreCategorie === c)}>{c}</button>)}
        </div>
      </div>

      {auteurs.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun essai trouvé.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {auteurs.map(auteur => {
            const score = parAuteur.get(auteur)?.[0]?.auteur_score ?? 0
            const rang = calculerRang(score)
            const couleurs = couleurRang(rang.rang)
            return (
              <section key={auteur} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e4dfd8', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: 700, color: '#3d6b4f', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                    {auteur}
                  </h2>
                  <span style={{ fontSize: '8.5px', fontWeight: 700, color: couleurs.texte, background: couleurs.fond, padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.03em' }}>{rang.rang}</span>
                </div>
                <div>
                  {parAuteur.get(auteur)!.map(e => <EssaiCarte key={e.id} essai={e} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

function EssaiCarte({ essai: e }: { essai: EssaiResume }) {
  const estNouveau = e.publie_at && (Date.now() - new Date(e.publie_at).getTime()) < SEMAINE_MS
  const tags = [...e.categories.slice(0, 3), ...(estNouveau ? ['Nouveau'] : [])]
  return (
    <Link href={`/essais/${e.id}`} style={{ display: 'block', padding: '10px 16px 12px', borderTop: '1px solid #ede9e2', textDecoration: 'none' }}
      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(61,107,79,0.035)')}
      onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
      <div style={{ float: 'left', maxWidth: '52%', margin: '0 12px 4px 0', padding: '6px 9px', borderRadius: '6px', background: '#faf8f4', border: '1px solid #ede9e2' }}>
        <p style={{ margin: 0, lineHeight: 1.25 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '14.5px', color: '#1e2e24' }}>{e.titre}</span>
          {e.sous_titre && <span style={{ fontSize: '11.5px', color: '#8a8278', fontStyle: 'italic' }}> · {e.sous_titre}</span>}
        </p>
        <p style={{ fontSize: '9.5px', color: '#b0a89e', margin: '3px 0 0' }}>
          {e.publie_at ? new Date(e.publie_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} · {e.nb_vues} vue{e.nb_vues > 1 ? 's' : ''}
        </p>
      </div>
      <div style={{ float: 'right', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '34%', margin: '0 0 5px 10px' }}>
        {tags.map(c => (
          <span key={c} style={c === 'Nouveau' ? tagNouveau() : tagGenre()}>{c}</span>
        ))}
      </div>
      {e.resume && <p style={{ fontSize: '12px', color: '#5a5450', lineHeight: 1.48, margin: 0, textAlign: 'justify' }}>{e.resume}</p>}
      <div style={{ clear: 'both' }} />
    </Link>
  )
}

function OngletMesEcrits({
  connecte, essais, changerStatut, supprimer,
}: {
  connecte: boolean | null; essais: EssaiPerso[] | null
  changerStatut: (id: number, statut: string) => Promise<void>; supprimer: (id: number) => Promise<void>
}) {
  if (connecte === false) {
    return <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a4a2a', fontStyle: 'italic' }}>Connectez-vous pour voir vos écrits.</p>
  }
  if (essais === null) return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
  if (essais.length === 0) return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun écrit pour l'instant.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {essais.map(e => {
        const st = STATUTS[e.statut] ?? { label: e.statut, couleur: '#9a958d' }
        const date = e.publie_at ?? e.updated_at
        const peutRepublier = e.statut === 'brouillon' && !!e.publie_at && (!e.updated_at || new Date(e.updated_at).getTime() <= new Date(e.publie_at).getTime() + 1000)
        return (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '11px 14px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#1e2e24', margin: 0 }}>{e.titre}</p>
                {e.sous_titre && <p style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', margin: 0 }}>{e.sous_titre}</p>}
              </div>
              <p style={{ fontSize: '10px', color: '#b0a89e', margin: '3px 0 0' }}>
                {date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sans date'} · {e.nb_vues ?? 0} vue{(e.nb_vues ?? 0) > 1 ? 's' : ''} · <span style={{ color: st.couleur, fontWeight: 700 }}>{st.label}</span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link href={`/essais/${e.id}/modifier`} style={actionLien()}>Modifier</Link>
              {e.statut === 'publie' && <button onClick={() => changerStatut(e.id, 'brouillon')} style={actionBouton('#9a5a2a')}>Dépublier</button>}
              {peutRepublier && <button onClick={() => changerStatut(e.id, 'publie')} style={actionBouton('#3d6b4f')}>Republier</button>}
              <button onClick={() => supprimer(e.id)} style={actionBouton('#c0562a')}>Supprimer</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function tagFiltre(actif: boolean): React.CSSProperties {
  return { fontSize: '11px', padding: '4px 12px', borderRadius: '12px', border: `1px solid ${actif ? '#3d6b4f' : '#d6d0c4'}`, background: actif ? 'rgba(61,107,79,0.10)' : '#fff', color: actif ? '#3d6b4f' : '#8a8278', cursor: 'pointer', fontWeight: actif ? 600 : 400 }
}
function tagGenre(): React.CSSProperties {
  return { fontSize: '9px', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', padding: '1px 7px', borderRadius: '8px', fontWeight: 600 }
}
function tagNouveau(): React.CSSProperties {
  return { fontSize: '9px', color: '#9a5a2a', background: 'rgba(192,86,42,0.10)', padding: '1px 7px', borderRadius: '8px', fontWeight: 700 }
}
function actionLien(): React.CSSProperties {
  return { fontSize: '10.5px', color: '#3d6b4f', textDecoration: 'none', fontWeight: 600 }
}
function actionBouton(couleur: string): React.CSSProperties {
  return { fontSize: '10.5px', color: couleur, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }
}
