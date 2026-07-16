'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import EtapeMetadonnees, { CATEGORIES_ESSAIS, type Metadonnees } from './EtapeMetadonnees'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'

const CATEGORIES = CATEGORIES_ESSAIS
const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000

type Onglet = 'communaute' | 'mes-ecrits' | 'ecrire' | 'suggestion'

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null; contenu?: string | null
  categories: string[]; nb_vues: number; nb_likes: number; publie_at: string | null; auteur: string; auteur_score: number
}

type EssaiPerso = {
  id: number; titre: string; sous_titre: string | null; statut: string
  updated_at: string | null; publie_at: string | null; nb_vues: number | null; nb_likes: number
}

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: '#9a958d' },
  en_attente: { label: 'En attente', couleur: '#9a5a2a' },
  publie: { label: 'Publié', couleur: '#3d6b4f' },
  a_reviser: { label: 'À réviser', couleur: '#c0562a' },
  refuse: { label: 'Refusé', couleur: '#c0562a' },
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

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
    const lignes = data ?? []
    const ids = lignes.map(e => e.id)
    const { data: likes } = ids.length
      ? await supabase.from('essais_appreciations').select('id_essai').in('id_essai', ids)
      : { data: [] as any[] }
    const likesParEssai = new Map<number, number>()
    ;(likes ?? []).forEach((l: any) => likesParEssai.set(l.id_essai, (likesParEssai.get(l.id_essai) ?? 0) + 1))
    setMesEcrits(lignes.map(e => ({ ...e, nb_likes: likesParEssai.get(e.id) ?? 0 })))
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
  const essaisFiltres = useMemo(() => essais.filter(e => {
    if (filtreCategorie && !e.categories.includes(filtreCategorie)) return false
    if (!q) return true
    return sansAccents(e.auteur).includes(q) || sansAccents(e.titre).includes(q) || (e.resume && sansAccents(e.resume).includes(q))
  }), [essais, filtreCategorie, q])

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '40px 28px 80px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '8px', letterSpacing: '0.02em' }}>
            Publications
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '13.5px', fontStyle: 'italic', color: '#8a8278', margin: '0 0 18px' }}>
            Communications savantes, spirituelles et poétiques
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '180px', margin: '0 auto 20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#d6cfc4' }} />
            <span style={{ fontSize: '9px', color: '#b0a088', letterSpacing: '0.2em' }}>· · ·</span>
            <div style={{ flex: 1, height: '1px', background: '#d6cfc4' }} />
          </div>

          {/* Onglets — groupe navigation à gauche, groupe action à droite */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2px', borderBottom: '1px solid #ddd8cf', flexWrap: 'wrap' }}>
            {/* Navigation */}
            {([
              { key: 'communaute' as const, label: 'Communauté' },
              { key: 'mes-ecrits' as const, label: 'Mes écrits' },
            ]).map(o => (
              <button key={o.key} onClick={() => setOnglet(o.key)}
                style={{ padding: '9px 16px', fontSize: '12px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {o.label}
              </button>
            ))}
            {/* Séparateur */}
            <span style={{ width: '1px', height: '18px', background: '#ddd8cf', margin: '0 8px 11px', flexShrink: 0 }} />
            {/* Actions — style distinct : fond vert léger sur actif, police italique */}
            {([
              { key: 'ecrire' as const, label: '+ Écrire' },
              { key: 'suggestion' as const, label: '✦ Suggestion' },
            ]).map(o => {
              const actif = onglet === o.key
              return (
                <button key={o.key} onClick={() => setOnglet(o.key)}
                  style={{ padding: '7px 14px', fontSize: '11.5px', fontStyle: 'italic', fontWeight: actif ? 600 : 400, color: actif ? '#fff' : '#5a8a6a', background: actif ? '#3d6b4f' : 'transparent', border: 'none', borderRadius: '5px 5px 0 0', borderBottom: actif ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em', transition: 'background 0.13s, color 0.13s' }}>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>

        {onglet === 'communaute' ? (
          <OngletCommunaute
            recherche={recherche}
            setRecherche={setRecherche}
            filtreCategorie={filtreCategorie}
            setFiltreCategorie={setFiltreCategorie}
            essais={essaisFiltres}
          />
        ) : onglet === 'mes-ecrits' ? (
          <OngletMesEcrits connecte={connecte} essais={mesEcrits} changerStatut={changerStatut} supprimer={supprimer} />
        ) : onglet === 'ecrire' ? (
          <OngletEcrire connecte={connecte} onValider={(m) => {
            window.sessionStorage.setItem('nouvel-essai-metadonnees', JSON.stringify(m))
            router.push('/essais/nouveau?depuis=publications')
          }} />
        ) : (
          <OngletSuggestion connecte={connecte} />
        )}
      </div>
    </main>
  )
}

function OngletCommunaute({
  recherche, setRecherche, filtreCategorie, setFiltreCategorie, essais,
}: {
  recherche: string; setRecherche: (v: string) => void
  filtreCategorie: string | null; setFiltreCategorie: (v: string | null) => void
  essais: EssaiResume[]
}) {
  const { favoris: favorisEssais, toggle: toggleFavoriEssai } = useFavoris('essai')

  // Tri : par auteur alphabétique, puis par date décroissante au sein de chaque auteur
  const tries = [...essais].sort((a, b) => {
    const cmp = a.auteur.localeCompare(b.auteur, 'fr')
    if (cmp !== 0) return cmp
    return (b.publie_at ?? '').localeCompare(a.publie_at ?? '')
  })
  const populaires = [...essais]
    .sort((a, b) => (b.nb_likes - a.nb_likes) || (b.nb_vues - a.nb_vues) || (b.publie_at ?? '').localeCompare(a.publie_at ?? ''))
    .slice(0, 3)
  const populairesIds = new Set(populaires.map(e => e.id))
  const articlesJournal = tries.filter(e => !populairesIds.has(e.id))

  return (
    <>
      {/* Barre de recherche + filtres */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ position: 'relative', maxWidth: '300px', margin: '0 auto 14px' }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Auteur, titre, résumé…"
            style={{ width: '100%', fontSize: '13px', padding: '8px 14px 8px 36px', border: '1px solid #d6d0c4', borderRadius: '20px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.38 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setFiltreCategorie(null)} style={tagFiltre(!filtreCategorie)}>Tout</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => setFiltreCategorie(c)} style={tagFiltre(filtreCategorie === c)}>{c}</button>)}
        </div>
      </div>

      <style>{`
        .publications-populaires-tete {
          position: relative;
          margin: 0 auto 24px;
          border-top: 1px solid #d9d2c8;
          border-bottom: 1px solid #d9d2c8;
          padding: 16px 0;
        }
        .publications-populaires-titre {
          margin: 0 0 12px;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #9a8c72;
        }
        .publications-populaires-grille {
          display: grid;
          grid-template-columns: 1.25fr 0.9fr 0.9fr;
          gap: 14px;
        }
        .publication-populaire-item {
          position: relative;
          display: block;
          min-height: 104px;
          padding: 13px 14px 12px;
          color: #332c23;
          text-decoration: none;
          background: rgba(255,255,255,0.42);
          border-left: 2px solid rgba(61,107,79,0.35);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
          transition: background 0.16s ease, transform 0.16s ease;
        }
        .publication-populaire-item:hover {
          background: rgba(255,255,255,0.72);
          transform: translateY(-1px);
        }
        .publication-populaire-item:first-child {
          min-height: 128px;
          padding: 16px 18px 15px;
          border-left-color: rgba(159,135,87,0.62);
        }
        .publication-populaire-rang {
          display: block;
          margin-bottom: 5px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #a09078;
          text-transform: uppercase;
        }
        .publication-populaire-titre {
          display: block;
          font-family: Georgia, serif;
          font-size: 15px;
          line-height: 1.22;
          color: #1e2e24;
        }
        .publication-populaire-item:first-child .publication-populaire-titre {
          font-size: 20px;
          line-height: 1.12;
        }
        .publication-populaire-resume {
          display: block;
          margin-top: 7px;
          font-family: Georgia, serif;
          font-size: 11.5px;
          line-height: 1.42;
          color: #71685d;
          text-align: justify;
        }
        .publication-populaire-meta {
          display: block;
          margin-top: 8px;
          font-size: 10px;
          color: #a49b90;
        }
        .publications-litteraires {
          position: relative;
          padding: 2px 0 0;
        }
        .essais-journal {
          column-count: 3;
          column-gap: 24px;
          column-rule: 1px solid rgba(214,208,196,0.55);
        }
        .essai-carte {
          position: relative;
          display: block;
          break-inside: avoid;
          margin: 0 0 14px;
          background: transparent;
          border: 0;
          border-top: 1px solid rgba(214,208,196,0.78);
          border-radius: 0;
          padding: 11px 2px 12px;
          cursor: pointer;
          transition: background 0.16s, transform 0.16s;
          overflow: hidden;
        }
        .essai-carte:hover { background: rgba(255,255,255,0.44); transform: translateY(-1px); }
        .essai-carte:not(.featured)::before {
          content: "";
          position: absolute;
          inset: 10px 8px 12px;
          background: rgba(250, 248, 243, 0.78);
          opacity: 0;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.16s ease;
        }
        .essai-carte:not(.featured):hover::before {
          opacity: 1;
        }
        .essai-carte.featured {
          grid-row: span 3;
          padding: 28px 28px 26px;
          border: 1px solid #d8d0c4;
          background: rgba(255,255,255,0.62);
          box-shadow: 0 8px 20px rgba(53,39,22,0.045);
        }
        .essai-carte.featured::before {
          content: "";
          position: absolute;
          left: 18px;
          top: 18px;
          bottom: 18px;
          width: 1px;
          background: linear-gradient(to bottom, transparent, #bfae8f, transparent);
          opacity: 0.7;
        }
        .essai-carte:hover .essai-contenu { opacity: 0.04; transform: translateX(-5px); }
        .essai-carte::after {
          content: "Lire cette publication";
          position: absolute; top: 29%; left: 50%;
          width: min(82%, 250px); height: 28px;
          display: flex; align-items: center; justify-content: center;
          transform: translate(-50%, -50%) translateY(8px);
          font-family: Georgia, serif; font-size: 15px; font-style: italic;
          color: rgba(35,79,51,0); letter-spacing: 0.01em;
          pointer-events: none;
          text-shadow: 0 1px 0 rgba(255,255,255,0.35);
          transition: color 0.18s ease, transform 0.18s ease;
          white-space: nowrap;
          z-index: 3;
        }
        .essai-carte:hover::after {
          color: rgba(24,20,17,0.88);
          transform: translate(-50%, -50%) translateY(0);
        }
        .essai-survol-resume {
          position: absolute;
          left: 50%;
          top: calc(29% + 52px);
          width: min(78%, 245px);
          transform: translate(-50%, -50%) translateY(9px);
          opacity: 0;
          z-index: 3;
          pointer-events: none;
          font-family: Georgia, serif;
          font-size: 11.8px;
          line-height: 1.36;
          color: rgba(24,20,17,0.84);
          text-align: center;
          text-shadow: 0 1px 0 rgba(255,255,255,0.38);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .essai-carte:hover .essai-survol-resume {
          opacity: 1;
          transform: translate(-50%, -50%) translateY(0);
        }
        .essai-carte .fleche-lire {
          position: absolute; top: calc(29% - 28px); left: 50%;
          width: 24px; height: 24px;
          transform: translate(-50%, -50%) translateY(8px);
          color: rgba(61,107,79,0);
          pointer-events: none;
          transition: color 0.18s ease, transform 0.18s ease;
          z-index: 3;
        }
        .essai-carte:hover .fleche-lire {
          color: rgba(54,49,44,0.44);
          transform: translate(-50%, -50%) translateY(0);
        }
        .essai-contenu { transition: opacity 0.18s ease, transform 0.18s ease; }
        .essai-etoile { opacity: 0; transition: opacity 0.15s; pointer-events: none; }
        .essai-carte:hover .essai-etoile { opacity: 1; pointer-events: auto; }
        .article-journal-normal {
          position: relative;
          min-height: 218px;
          color: #3d3832;
        }
        .article-journal-lignes {
          font-family: Georgia, serif;
          font-size: 10.9px;
          line-height: 1.18;
          letter-spacing: -0.006em;
          word-spacing: 0.015em;
          color: #4f4942;
          font-stretch: condensed;
          hyphens: auto;
          overflow-wrap: anywhere;
          text-rendering: geometricPrecision;
        }
        .article-journal-ligne {
          display: block;
          min-height: 12.8px;
          white-space: nowrap;
          overflow: hidden;
          text-align: left;
        }
        .article-journal-ligne-fracturee {
          display: flex;
          align-items: baseline;
          gap: var(--trou, 96px);
          min-height: 12.8px;
        }
        .article-journal-ligne-fracturee .article-journal-fragment {
          flex: 1 1 0;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          hyphens: auto;
        }
        .article-journal-ligne-fracturee .article-journal-fragment:first-child {
          text-align: right;
        }
        .article-journal-ligne-fracturee .article-journal-fragment:last-child {
          text-align: left;
        }
        .article-journal-ilot {
          position: absolute;
          top: calc(12.8px * 8.5);
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
          padding: 0;
          width: min(158px, 56%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: transparent;
        }
        .article-journal-auteur {
          margin: 0 0 3px;
          padding: 0;
          font-size: 10.8px;
          line-height: 1.15;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #36312c;
          text-align: center;
        }
        .article-journal-titre {
          margin: 0;
          padding: 0;
          font-family: Georgia, serif;
          font-size: 15.2px;
          line-height: 1.05;
          font-weight: normal;
          color: #2f6848;
          text-align: center;
          hyphens: auto;
        }
        .article-journal-titre-ligne {
          display: block;
          white-space: nowrap;
        }
        .article-journal-categories {
          display: flex;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 10px;
          clear: both;
        }
        .article-journal-categorie {
          font-size: 8.5px;
          color: #4f4942;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        @media (max-width: 780px) {
          .publications-populaires-grille { grid-template-columns: 1fr; }
          .publications-litteraires { padding: 18px 10px 28px; }
          .essais-journal { column-count: 1; column-rule: 0; }
          .essai-carte.featured { grid-row: auto; padding: 22px 20px 20px; }
        }
        @media (min-width: 781px) and (max-width: 980px) {
          .essais-journal { column-count: 2; }
        }
      `}</style>
      {tries.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun essai trouvé.</p>
      ) : (
        <>
          <EnTetePublicationsPopulaires essais={populaires} />
          <div className="publications-litteraires">
            <div className="essais-journal">
              {articlesJournal.map(e => <EssaiCarte key={e.id} essai={e} favorisEssais={favorisEssais} toggleFavoriEssai={toggleFavoriEssai} />)}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function EnTetePublicationsPopulaires({ essais }: { essais: EssaiResume[] }) {
  if (essais.length === 0) return null
  return (
    <section className="publications-populaires-tete" aria-label="Publications populaires">
      <p className="publications-populaires-titre">Œuvres les plus lues</p>
      <div className="publications-populaires-grille">
        {essais.map((e, i) => (
          <Link key={e.id} href={`/essais/${e.id}`} className="publication-populaire-item">
            <span className="publication-populaire-rang">{i + 1}</span>
            <span className="publication-populaire-titre">{e.titre}</span>
            {e.resume && (
              <span className="publication-populaire-resume">
                {e.resume.length > (i === 0 ? 190 : 105) ? e.resume.slice(0, i === 0 ? 190 : 105) + ' …' : e.resume}
              </span>
            )}
            <span className="publication-populaire-meta">
              {e.nb_likes > 0 ? `♥ ${e.nb_likes}` : `${e.nb_vues} vue${e.nb_vues > 1 ? 's' : ''}`}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

type LigneHabillage = { gauche?: string; droite?: string; pleine?: string; trou?: number }

function prendreLongueur(mots: string[], index: number, cible: number) {
  const pris: string[] = []
  let longueur = 0
  while (pris.length < 18 && (longueur < cible || pris.length < 3)) {
    const mot = mots[index % mots.length]
    pris.push(mot)
    longueur += mot.length + (pris.length > 1 ? 1 : 0)
    index += 1
  }
  return { texte: pris.join(' '), index }
}

function bornerNombre(valeur: number, min: number, max: number) {
  return Math.max(min, Math.min(max, valeur))
}

function largeurApproxTexte(texte: string, type: 'auteur' | 'titre') {
  const nettoye = texte.replace(/\s+/g, ' ').trim()
  const moyenne = type === 'auteur' ? 6.9 : 7.35
  const espace = type === 'auteur' ? 4.2 : 4.4
  return nettoye.split('').reduce((total, caractere) => total + (caractere === ' ' ? espace : moyenne), 0)
}

function lignesTitreCentre(titre: string) {
  const mots = titre.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (mots.length <= 2 || titre.length <= 22) return [titre]
  const total = mots.reduce((s, mot) => s + mot.length, 0) + mots.length - 1
  const cible = total / 2
  const premiere: string[] = []
  let longueur = 0
  while (mots.length > 1 && longueur < cible) {
    const mot = mots.shift()!
    premiere.push(mot)
    longueur += mot.length + (premiere.length > 1 ? 1 : 0)
  }
  return [premiere.join(' '), mots.join(' ')].filter(Boolean)
}

function creerHabillageJournal(texte: string, auteur: string, titre: string): LigneHabillage[] {
  const base = texte.replace(/\s+/g, ' ').trim() || 'Lire cette contribution dans son entier pour en suivre le développement et les nuances.'
  const mots = base.split(' ').filter(Boolean)
  const lignes: LigneHabillage[] = []
  let index = 0
  const marge = 18
  const lignesTitre = lignesTitreCentre(titre)
  const trouAuteur = bornerNombre(largeurApproxTexte(auteur, 'auteur') + marge, 54, 164)
  const trouTitre1 = bornerNombre(largeurApproxTexte(lignesTitre[0] ?? titre, 'titre') + marge, 88, 184)
  const trouTitre2 = bornerNombre(largeurApproxTexte(lignesTitre[1] ?? lignesTitre[0] ?? titre, 'titre') + marge, 88, 184)
  const trouInterligne = bornerNombre(Math.max(trouAuteur, Math.min(trouTitre1, trouTitre2)) * 0.62, 56, 118)
  const enveloppeCentrale: Record<number, { trou: number; gauche: number; droite: number }> = {
    6: { trou: trouAuteur, gauche: 44, droite: 44 },
    7: { trou: trouInterligne, gauche: 44, droite: 44 },
    8: { trou: trouTitre1, gauche: 42, droite: 42 },
    9: { trou: trouTitre2, gauche: 42, droite: 42 },
  }
  for (let ligne = 0; ligne < 17; ligne++) {
    const enveloppe = enveloppeCentrale[ligne]
    if (enveloppe) {
      const gauche = prendreLongueur(mots, index, enveloppe.gauche); index = gauche.index
      const droite = prendreLongueur(mots, index, enveloppe.droite); index = droite.index
      lignes.push({ gauche: gauche.texte, droite: droite.texte, trou: enveloppe.trou })
    } else {
      const pleine = prendreLongueur(mots, index, 72); index = pleine.index
      lignes.push({ pleine: pleine.texte })
    }
  }
  return lignes
}

function nettoyerTextePublication(texte: string) {
  return texte
    .replace(/\[\^.+?\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_`>{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function EssaiCarte({ essai: e, miseEnAvant = false, favorisEssais, toggleFavoriEssai }: { essai: EssaiResume; miseEnAvant?: boolean; favorisEssais: Set<string>; toggleFavoriEssai: (id: string) => void }) {
  const router = useRouter()
  const estNouveau = !!(e.publie_at && (Date.now() - new Date(e.publie_at).getTime()) < SEMAINE_MS)
  const dateFormatee = e.publie_at
    ? new Date(e.publie_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const rang = calculerRang(e.auteur_score)
  const couleurs = couleurRang(rang.rang)
  const resume = nettoyerTextePublication(e.contenu?.trim() || e.resume?.trim() || e.sous_titre?.trim() || '')
  const resumeJournal = resume
    ? (resume.length < 150 ? `${resume} ${resume}` : resume)
    : 'Lire cette contribution dans son entier pour en suivre le développement et les nuances.'
  const lignesHabillage = creerHabillageJournal(resumeJournal, e.auteur, e.titre)
  const lignesTitreAffichees = lignesTitreCentre(e.titre)

  if (!miseEnAvant) {
    return (
      <div className="essai-carte" onClick={() => router.push(`/essais/${e.id}`)}>
        <svg className="fleche-lire" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M4 14H22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M15 7L22.5 14L15 21" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {e.resume && (
          <span className="essai-survol-resume">
            {e.resume.length > 170 ? `${e.resume.slice(0, 170).replace(/\s+\S*$/, '')} …` : e.resume}
          </span>
        )}

        <div className="essai-etoile" style={{ position: 'absolute', bottom: '12px', right: '10px', zIndex: 20 }}>
          <EtoileFavori actif={favorisEssais.has(String(e.id))} onToggle={() => toggleFavoriEssai(String(e.id))} size={14} />
        </div>

        <div className="essai-contenu article-journal-normal">
          <div className="article-journal-lignes" aria-hidden="true">
            {lignesHabillage.map((ligne, i) => ligne.pleine ? (
              <span key={i} className="article-journal-ligne">{ligne.pleine}</span>
            ) : (
              <span key={i} className="article-journal-ligne-fracturee" style={{ '--trou': `${ligne.trou ?? 96}px` } as CSSProperties}>
                <span className="article-journal-fragment">{ligne.gauche}</span>
                <span className="article-journal-fragment">{ligne.droite}</span>
              </span>
            ))}
          </div>
          <div className="article-journal-ilot">
            <p className="article-journal-auteur">{e.auteur}</p>
            <p className="article-journal-titre">
              {lignesTitreAffichees.map((ligne, i) => <span key={i} className="article-journal-titre-ligne">{ligne}</span>)}
            </p>
          </div>
          <div className="article-journal-categories">
            {e.categories.slice(0, 3).map(c => <span key={c} className="article-journal-categorie">{c}</span>)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`essai-carte${miseEnAvant ? ' featured' : ''}`} onClick={() => router.push(`/essais/${e.id}`)}>
        <svg className="fleche-lire" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M4 14H22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M15 7L22.5 14L15 21" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="essai-etoile" style={{ position: 'absolute', bottom: '14px', right: '14px', zIndex: 20 }}>
          <EtoileFavori actif={favorisEssais.has(String(e.id))} onToggle={() => toggleFavoriEssai(String(e.id))} size={15} />
        </div>

        <div className="essai-contenu">
          {/* Ligne supérieure : auteur + rang + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: miseEnAvant ? '16px' : '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic', color: '#3d6b4f', flexShrink: 0 }}>
              {e.auteur}
            </span>
            <span style={{ fontSize: '7.5px', fontWeight: 700, color: couleurs.texte, background: couleurs.fond, padding: '1.5px 6px', borderRadius: '3px', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
              {rang.rang}
            </span>
            <div style={{ flex: 1, height: '1px', background: '#eae5de', minWidth: '12px' }} />
            {estNouveau && (
              <span style={{ fontSize: '7.5px', color: '#9a5a2a', background: 'rgba(192,86,42,0.10)', padding: '2px 7px', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
                Nouveau
              </span>
            )}
            {dateFormatee && (
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#a09488', fontStyle: 'italic', flexShrink: 0 }}>
                {dateFormatee}
              </span>
            )}
          </div>

          {/* Titre */}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: miseEnAvant ? '25px' : '16px', fontWeight: 'normal', color: '#1a2820', margin: '0 0 4px', lineHeight: miseEnAvant ? 1.14 : 1.25, letterSpacing: '0.01em' }}>
            {e.titre}
          </p>

          {/* Sous-titre */}
          {e.sous_titre && (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: miseEnAvant ? '15px' : '12.5px', fontStyle: 'italic', color: '#7a7268', margin: '0 0 10px', lineHeight: 1.4 }}>
              {e.sous_titre}
            </p>
          )}

          {/* Résumé */}
          {e.resume && (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: miseEnAvant ? '13.5px' : '12px', color: '#6a6258', lineHeight: miseEnAvant ? 1.72 : 1.55, margin: `${e.sous_titre ? '0' : '8px'} 0 12px`, fontStyle: 'italic', textAlign: miseEnAvant ? 'justify' : 'left' }}>
              {e.resume.length > (miseEnAvant ? 340 : 150) ? e.resume.slice(0, miseEnAvant ? 340 : 150) + ' …' : e.resume}
            </p>
          )}

          {/* Pied : catégories + vues + likes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: e.resume || e.sous_titre ? '0' : '10px', flexWrap: 'wrap' }}>
            {e.categories.slice(0, 3).map(c => (
              <span key={c} style={{ fontSize: '9px', color: '#5a7060', background: 'rgba(61,107,79,0.08)', padding: '2px 8px', borderRadius: '3px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {c}
              </span>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {e.nb_likes > 0 && (
                <span style={{ fontSize: '10.5px', color: '#b8b0a4', fontVariantNumeric: 'tabular-nums' }}>
                  ♥ {e.nb_likes}
                </span>
              )}
              <span style={{ fontSize: '10.5px', color: '#b8b0a4', fontVariantNumeric: 'tabular-nums' }}>
                {e.nb_vues} vue{e.nb_vues > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
  )
}

function OngletEcrire({ connecte, onValider }: { connecte: boolean | null; onValider: (m: Metadonnees) => void }) {
  if (connecte === false) {
    return (
      <div style={{ textAlign: 'center', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '28px 24px', maxWidth: '520px', margin: '0 auto' }}>
        <p style={{ fontSize: '13px', color: '#6b6560', marginBottom: '14px' }}>Connectez-vous pour écrire un essai ou une méditation.</p>
        <Link href="/compte" style={{ display: 'inline-block', padding: '8px 18px', fontSize: '12.5px', fontWeight: 600, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
          Se connecter
        </Link>
      </div>
    )
  }
  if (connecte === null) return <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
  return <EtapeMetadonnees mode="bloc" onValider={onValider} />
}

function OngletMesEcrits({
  connecte, essais, changerStatut, supprimer,
}: {
  connecte: boolean | null; essais: EssaiPerso[] | null
  changerStatut: (id: number, statut: string) => Promise<void>; supprimer: (id: number) => Promise<void>
}) {
  const [filtre, setFiltre] = useState<'tous' | 'brouillon' | 'verification' | 'publie' | 'a_reviser' | 'refuse'>('tous')
  const [toggles, setToggles] = useState<Record<number, number>>({})
  const [maintenant, setMaintenant] = useState(Date.now())

  useEffect(() => {
    const aUnTimerActif = () => (essais ?? []).some(e => {
      const t = toggles[e.id] ?? Number(window.localStorage.getItem(`essai-publication-toggle-${e.id}`) ?? 0)
      return t > 0 && (Date.now() - t) < 60 * 60 * 1000
    })
    if (!aUnTimerActif()) return
    const timer = window.setInterval(() => {
      setMaintenant(Date.now())
      if (!aUnTimerActif()) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [essais, toggles])

  if (connecte === false) {
    return <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a4a2a', fontStyle: 'italic' }}>Connectez-vous pour voir vos écrits.</p>
  }
  if (essais === null) return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
  if (essais.length === 0) return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun écrit pour l&apos;instant.</p>

  const groupes = [
    { key: 'tous' as const, label: 'Tous', test: (_: EssaiPerso) => true },
    { key: 'brouillon' as const, label: 'Brouillons', test: (e: EssaiPerso) => e.statut === 'brouillon' },
    { key: 'verification' as const, label: 'En vérification', test: (e: EssaiPerso) => e.statut === 'en_attente' },
    { key: 'publie' as const, label: 'Publiés', test: (e: EssaiPerso) => e.statut === 'publie' },
    { key: 'a_reviser' as const, label: 'À réviser', test: (e: EssaiPerso) => e.statut === 'a_reviser' },
    { key: 'refuse' as const, label: 'Refusés', test: (e: EssaiPerso) => e.statut === 'refuse' },
  ]
  const groupeActif = groupes.find(g => g.key === filtre) ?? groupes[0]
  const essaisFiltres = essais.filter(groupeActif.test)

  const derniereAction = (id: number) => {
    if (toggles[id]) return toggles[id]
    if (typeof window === 'undefined') return 0
    return Number(window.localStorage.getItem(`essai-publication-toggle-${id}`) ?? 0)
  }
  const basculerPublication = async (e: EssaiPerso) => {
    const dernier = derniereAction(e.id)
    const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at && (!e.updated_at || new Date(e.updated_at).getTime() <= new Date(e.publie_at).getTime() + 1000))
    if (!dejaValide) { alert("Cet écrit doit d'abord être validé par l'administration."); return }
    const restant = 60 * 60 * 1000 - (Date.now() - dernier)
    if (restant > 0) {
      const minutes = Math.ceil(restant / 60000)
      alert(`Vous pourrez modifier la publication de cet écrit dans ${minutes} minute${minutes > 1 ? 's' : ''}.`)
      return
    }
    await changerStatut(e.id, e.statut === 'publie' ? 'brouillon' : 'publie')
    const now = Date.now()
    if (typeof window !== 'undefined') window.localStorage.setItem(`essai-publication-toggle-${e.id}`, String(now))
    setToggles(prev => ({ ...prev, [e.id]: now }))
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {groupes.map(g => {
          const actif = filtre === g.key
          const nb = essais.filter(g.test).length
          return (
            <button key={g.key} onClick={() => setFiltre(g.key)}
              style={{ fontSize: '10.5px', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${actif ? '#3d6b4f' : '#d6d0c4'}`, background: actif ? 'rgba(61,107,79,0.10)' : '#fff', color: actif ? '#3d6b4f' : '#8a8278', cursor: 'pointer', fontWeight: actif ? 700 : 500 }}>
              {g.label} <span style={{ opacity: 0.65 }}>{nb}</span>
            </button>
          )
        })}
      </div>
      {essaisFiltres.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#9a958d', fontStyle: 'italic' }}>Aucun écrit dans cet onglet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {essaisFiltres.map(e => {
            const st = STATUTS[e.statut] ?? { label: e.statut, couleur: '#9a958d' }
            const date = e.publie_at ?? e.updated_at
            const statutStyle = styleStatut(e.statut)
            const dernier = derniereAction(e.id)
            const restant = Math.max(0, 60 * 60 * 1000 - (maintenant - dernier))
            const verrouille = restant > 0
            const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at && (!e.updated_at || new Date(e.updated_at).getTime() <= new Date(e.publie_at).getTime() + 1000))
            const peutBasculer = dejaValide && (e.statut === 'publie' || e.statut === 'brouillon')
            const timer = verrouille ? formatTimer(restant) : ''
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', background: statutStyle.fond, border: `1px solid ${statutStyle.bordure}`, borderLeft: `4px solid ${statutStyle.accent}`, borderRadius: '8px', padding: '10px 13px 10px 12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#1e2e24', margin: 0 }}>{e.titre}</p>
                    {e.sous_titre && <p style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', margin: 0 }}>{e.sous_titre}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '10px', color: '#b0a89e', marginTop: '3px' }}>
                    <span>{date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sans date'}</span>
                    <span>{e.nb_vues ?? 0} vue{(e.nb_vues ?? 0) > 1 ? 's' : ''}</span>
                    <span>♥ {e.nb_likes ?? 0}</span>
                    <span style={{ color: st.couleur, fontWeight: 700 }}>{st.label}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => basculerPublication(e)} disabled={!peutBasculer || verrouille}
                    title={!dejaValide ? "Publication possible après validation par l'administration." : verrouille ? 'Interrupteur disponible une heure après le dernier changement.' : e.statut === 'publie' ? 'Dépublier' : 'Publier'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: e.statut === 'publie' ? '#3d6b4f' : '#8a8278', background: 'transparent', border: 'none', padding: 0, cursor: !peutBasculer || verrouille ? 'default' : 'pointer', opacity: !peutBasculer ? 0.45 : 1, fontWeight: 700 }}>
                    <span>Publié</span>
                    {timer && <span style={{ fontSize: '9.5px', color: '#9a958d', fontWeight: 600 }}>{timer}</span>}
                    <span style={{ width: '28px', height: '15px', borderRadius: '999px', background: e.statut === 'publie' ? '#3d6b4f' : '#d6d0c4', position: 'relative', display: 'inline-block', transition: 'background 0.15s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: e.statut === 'publie' ? '15px' : '2px', width: '11px', height: '11px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                    </span>
                  </button>
                  <Link href={`/essais/${e.id}/modifier`} style={{ fontSize: '10.5px', color: '#3d6b4f', textDecoration: 'none', fontWeight: 600 }}>Modifier</Link>
                  <button onClick={() => supprimer(e.id)} style={{ fontSize: '10.5px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Supprimer</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Suggestion aléatoire ─────────────────────────────────────────────────────

const TOTAL_VERSETS = 41899
const MAX_SUGGESTIONS_JOUR = 3

type VerseSug = { id_verset: string; livre: string; chapitre: number; verset: number; texte: string }

function cleJour() {
  return `suggestion-versets-${new Date().toISOString().slice(0, 10)}`
}

function lireSuggestionsJour(): VerseSug[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(cleJour()) ?? '[]') }
  catch { return [] }
}

async function piocherVerset(essais = 0): Promise<VerseSug | null> {
  if (essais > 5) return null
  const offset = Math.floor(Math.random() * TOTAL_VERSETS)
  const { data } = await supabase
    .from('versets')
    .select('id_verset, livre, chapitre, verset, TR0001, TR0002')
    .range(offset, offset)
  const row = data?.[0]
  if (!row) return piocherVerset(essais + 1)
  const texte = ((row.TR0001 as string | null) || (row.TR0002 as string | null) || '').trim()
  if (!texte) return piocherVerset(essais + 1)
  return { id_verset: row.id_verset as string, livre: row.livre as string, chapitre: row.chapitre as number, verset: row.verset as number, texte }
}

function OngletSuggestion({ connecte }: { connecte: boolean | null }) {
  const [versets, setVersets] = useState<VerseSug[]>([])
  const [index, setIndex] = useState(0)
  const [chargement, setChargement] = useState(false)
  const initialise = useRef(false)

  useEffect(() => {
    if (initialise.current) return
    initialise.current = true
    const existants = lireSuggestionsJour()
    if (existants.length > 0) {
      setVersets(existants)
      setIndex(existants.length - 1)
    } else {
      charger([])
    }
  }, [])

  const charger = async (base: VerseSug[]) => {
    if (base.length >= MAX_SUGGESTIONS_JOUR) return
    setChargement(true)
    const v = await piocherVerset()
    setChargement(false)
    if (!v) return
    const nouveaux = [...base, v]
    localStorage.setItem(cleJour(), JSON.stringify(nouveaux))
    setVersets(nouveaux)
    setIndex(nouveaux.length - 1)
  }

  const verset = versets[index]
  const peutRelancer = versets.length < MAX_SUGGESTIONS_JOUR

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', paddingTop: '8px' }}>
      {!verset ? (
        <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', marginTop: '20px' }}>
          {chargement ? 'Chargement…' : 'Impossible de charger une suggestion.'}
        </p>
      ) : (
        <>
          <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '34px 36px 28px', marginBottom: '18px' }}>
            <p style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 20px' }}>
              Verset proposé à la méditation
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.8, color: '#1e2e24', fontStyle: 'italic', margin: '0 0 18px' }}>
              «&#8201;{verset.texte}&#8201;»
            </p>
            <p style={{ fontSize: '12px', color: '#8a8278', margin: 0 }}>
              {ABREV_FR[verset.livre] ?? verset.livre} {verset.chapitre},{verset.verset}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Link
              href="/essais/nouveau?depuis=publications"
              onClick={() => {
                const ref = `${LIVRES.find(l => l.code === verset.livre)?.nom ?? verset.livre} ${verset.chapitre},${verset.verset}`
                sessionStorage.setItem('suggestion-verset-en-tete', JSON.stringify({ ref, texte: verset.texte }))
              }}
              style={{ display: 'inline-block', padding: '9px 22px', fontSize: '12.5px', fontWeight: 600, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
              Écrire sur ce verset
            </Link>
            <Link
              href={`/?livre=${verset.livre}&chapitre=${verset.chapitre}`}
              style={{ display: 'inline-block', padding: '9px 16px', fontSize: '12.5px', color: '#3d6b4f', borderRadius: '6px', textDecoration: 'none', border: '1px solid #c8d8cc' }}>
              Lire dans la Bible
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => charger(versets)}
              disabled={!peutRelancer || chargement}
              style={{ fontSize: '11.5px', color: peutRelancer ? '#3d6b4f' : '#b0a89e', background: 'none', border: 'none', cursor: peutRelancer ? 'pointer' : 'default', padding: 0, textDecoration: peutRelancer && !chargement ? 'underline' : 'none', fontStyle: 'italic' }}>
              {chargement ? 'Chargement…' : peutRelancer ? 'Autre suggestion' : 'Limite atteinte pour aujourd\'hui'}
            </button>
            <span style={{ fontSize: '10px', color: '#c8c0b4' }}>({versets.length}/{MAX_SUGGESTIONS_JOUR})</span>
          </div>

          {versets.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
              {versets.map((_, i) => (
                <button key={i} onClick={() => setIndex(i)}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === index ? '#3d6b4f' : '#d6d0c4', border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.13s' }} />
              ))}
            </div>
          )}
        </>
      )}

      {connecte === false && (
        <p style={{ fontSize: '11px', color: '#9a958d', marginTop: '18px', fontStyle: 'italic' }}>
          <Link href="/compte" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>Connectez-vous</Link> pour enregistrer votre méditation.
        </p>
      )}
    </div>
  )
}

function tagFiltre(actif: boolean): React.CSSProperties {
  return { fontSize: '11px', padding: '4px 12px', borderRadius: '12px', border: `1px solid ${actif ? '#3d6b4f' : '#d6d0c4'}`, background: actif ? 'rgba(61,107,79,0.10)' : '#fff', color: actif ? '#3d6b4f' : '#8a8278', cursor: 'pointer', fontWeight: actif ? 600 : 400 }
}
function formatTimer(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const secondes = total % 60
  return `${minutes}:${String(secondes).padStart(2, '0')}`
}
function styleStatut(statut: string): { fond: string; bordure: string; accent: string } {
  if (statut === 'publie') return { fond: 'rgba(61,107,79,0.075)', bordure: 'rgba(61,107,79,0.24)', accent: '#3d6b4f' }
  if (statut === 'en_attente') return { fond: 'rgba(154,90,42,0.075)', bordure: 'rgba(154,90,42,0.24)', accent: '#9a5a2a' }
  if (statut === 'a_reviser') return { fond: 'rgba(192,86,42,0.08)', bordure: 'rgba(192,86,42,0.25)', accent: '#c0562a' }
  if (statut === 'refuse') return { fond: 'rgba(160,45,45,0.08)', bordure: 'rgba(160,45,45,0.25)', accent: '#a02d2d' }
  return { fond: '#fff', bordure: '#e4dfd8', accent: '#d6d0c4' }
}
