'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { CATEGORIES_ESSAIS } from './EtapeMetadonnees'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'

const CATEGORIES = CATEGORIES_ESSAIS
const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000

type Onglet = 'communaute' | 'mes-ecrits' | 'ecrire' | 'suggestion'

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null; contenu?: string | null
  categories: string[]; nb_vues: number; nb_likes: number; publie_at: string | null; auteur: string; auteur_score: number
  avatar_url?: string | null; user_id?: string | null
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
  const [monUserId, setMonUserId] = useState<string | null>(null)
  const [monAvatarUrl, setMonAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      setConnecte(!!uid)
      if (!uid) { setMesEcrits([]); return }
      setMonUserId(uid)
      try {
        const saved = localStorage.getItem('cs_photo_profil')
        if (saved) {
          const photo = JSON.parse(saved)
          if (photo?.imageUrl) setMonAvatarUrl(photo.imageUrl)
        }
      } catch {}
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
  const essaisAvecPhoto = useMemo(() =>
    monUserId && monAvatarUrl
      ? essais.map(e => e.user_id === monUserId ? { ...e, avatar_url: monAvatarUrl } : e)
      : essais,
    [essais, monUserId, monAvatarUrl]
  )
  const essaisFiltres = useMemo(() => essaisAvecPhoto.filter(e => {
    if (filtreCategorie && !e.categories.includes(filtreCategorie)) return false
    if (!q) return true
    return sansAccents(e.auteur).includes(q) || sansAccents(e.titre).includes(q) || (e.resume && sansAccents(e.resume).includes(q))
  }), [essaisAvecPhoto, filtreCategorie, q])

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '16px' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '16px 28px 80px' }}>

        {/* En-tête */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '18px' }}>

          {/* Pyramide */}
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 10px', letterSpacing: '0.03em' }}>
            Publications
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'italic', color: '#9a9088', margin: '0 0 10px', letterSpacing: '0.01em' }}>
            Communications savantes, spirituelles et poétiques
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '260px', margin: '0 auto 14px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #d6ceb8)' }} />
            <span style={{ fontSize: '9px', color: '#c8c0ac', letterSpacing: '0.1em' }}>✦</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #d6ceb8)' }} />
          </div>

          {/* Onglets navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', borderBottom: '1px solid #ddd8cf' }}>
            {([
              { key: 'communaute' as const, label: 'Communauté' },
              { key: 'mes-ecrits' as const, label: 'Mes écrits' },
            ]).map(o => (
              <button key={o.key} onClick={() => setOnglet(o.key)}
                style={{ padding: '6px 16px', fontSize: '11.5px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

          {(onglet === 'communaute' || onglet === 'mes-ecrits') && (
          <div className="ecrire-bandeau-container">
            <div className="ecrire-bandeau">
              <span className="ecrire-bandeau-label">✒ Écrire</span>
              <button className="ecrire-option"
                onClick={() => connecte ? router.push('/essais/nouveau?depuis=publications') : setOnglet('ecrire')}>
                Rédiger un texte
              </button>
              <button className="ecrire-option" onClick={() => setOnglet('suggestion')}>
                Commenter un verset aléatoire
              </button>
            </div>
          </div>
        )}

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
          <OngletEcrire connecte={connecte} />
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

  // Tri par date de publication décroissante
  const tries = [...essais].sort((a, b) => (b.publie_at ?? '').localeCompare(a.publie_at ?? ''))
  const populaires = [...essais]
    .sort((a, b) => (b.nb_likes - a.nb_likes) || (b.nb_vues - a.nb_vues) || (b.publie_at ?? '').localeCompare(a.publie_at ?? ''))
    .slice(0, 3)
  const populairesIds = new Set(populaires.map(e => e.id))
  const articlesJournal = tries.filter(e => !populairesIds.has(e.id))

  return (
    <>
      {/* Barre de recherche + filtres */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ position: 'relative', maxWidth: '400px', margin: '0 auto 8px' }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Auteur, titre, résumé…"
            style={{ width: '100%', fontSize: '11.5px', padding: '6px 12px 6px 30px', border: '1px solid #d6d0c4', borderRadius: '16px', background: 'rgba(255,255,255,0.72)', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', opacity: 0.32 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setFiltreCategorie(null)} style={tagFiltre(!filtreCategorie)}>Tout</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => setFiltreCategorie(c)} style={tagFiltre(filtreCategorie === c)}>{c}</button>)}
        </div>
      </div>

      <style>{`
        .publications-populaires-tete {
          position: relative;
          margin: 0 auto 24px;
          padding: 13px 18px 11px;
          background: linear-gradient(160deg, #f8f1df 0%, #ede3c2 100%);
          border: 1px solid #c8ad72;
          border-radius: 3px;
          box-shadow: 0 2px 8px rgba(140,110,45,0.09);
        }
        .publications-populaires-titre {
          margin: 0 0 11px;
          text-align: center;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #7a6030;
        }
        .publications-populaires-grille {
          display: grid;
          grid-template-columns: 1.25fr 0.9fr 0.9fr;
          gap: 0;
        }
        .publication-populaire-item {
          display: block;
          padding: 0 18px 0 0;
          color: #332c23;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .publication-populaire-item:hover {
          opacity: 0.78;
        }
        .publication-populaire-item + .publication-populaire-item {
          padding: 0 12px;
          border-left: 1px solid rgba(190,155,75,0.38);
        }
        .publication-populaire-item:last-child {
          padding-right: 0;
        }
        .publication-populaire-auteur {
          display: block;
          margin-bottom: 2px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #9a7a40;
        }
        .publication-populaire-titre {
          display: block;
          font-family: Georgia, serif;
          font-size: 13.5px;
          line-height: 1.22;
          color: #1e2e24;
        }
        .publication-populaire-item:first-child .publication-populaire-titre {
          font-size: 15.5px;
          line-height: 1.18;
        }
        .publication-populaire-resume {
          display: block;
          margin-top: 5px;
          font-family: Georgia, serif;
          font-size: 11px;
          line-height: 1.38;
          color: #71685d;
        }
        .publication-populaire-meta-ligne {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 6px;
        }
        .publication-populaire-meta {
          font-size: 9.5px;
          color: #a49b90;
        }
        @keyframes podium-shimmer {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(300%); }
        }
        .podium-lien {
          position: relative;
          overflow: hidden;
          display: block;
          text-decoration: none;
        }
        .podium-lien::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 20%, rgba(255,255,250,0.38) 50%, rgba(255,255,255,0) 80%, transparent 100%);
          pointer-events: none;
          opacity: 0;
          transform: translateX(-200%);
        }
        .podium-lien:hover::after {
          opacity: 1;
          animation: podium-shimmer 0.55s ease forwards;
        }
        .podium-overlay-lire {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.16s;
          pointer-events: none;
          background: rgba(250,248,243,0.93);
        }
        .podium-lien:hover .podium-overlay-lire {
          opacity: 1;
        }
        .podium-overlay-lire-texte {
          font-size: 12px;
          font-weight: 600;
          color: #c8a84a;
          letter-spacing: 0.03em;
        }
        .publications-litteraires {
          position: relative;
          padding: 2px 0 0;
        }
        .essais-journal {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          column-gap: 24px;
          row-gap: 0;
        }
        .essais-journal .essai-carte {
          border-right: 1px solid rgba(214,208,196,0.55);
        }
        .essais-journal .essai-carte:nth-child(3n) {
          border-right: none;
        }
        .essai-carte {
          position: relative;
          display: block;
          margin: 0 0 14px;
          background: transparent;
          border: 0;
          border-top: 1px solid rgba(214,208,196,0.78);
          border-radius: 0;
          padding: 11px 8px 12px;
          cursor: pointer;
          transition: background 0.16s, transform 0.16s;
          overflow: hidden;
        }
        .essai-carte:hover { background: rgba(255,255,255,0.44); transform: translateY(-1px); }
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
        .essai-carte:hover .essai-contenu { opacity: 0.06; transition: opacity 0.18s ease; }
        .essai-contenu { transition: opacity 0.18s ease; }
        .essai-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(250,248,243,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.18s;
          z-index: 4;
          padding: 14px 12px;
          pointer-events: none;
        }
        .essai-carte:hover .essai-hover-overlay { opacity: 1; pointer-events: auto; }
        .essai-hover-contenu {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          max-width: 100%;
        }
        .essai-hover-titre {
          font-family: Georgia, serif;
          font-size: 13.5px;
          color: #1e2e24;
          margin: 0;
          line-height: 1.25;
        }
        .essai-hover-auteur {
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #7a6a50;
          margin: 0;
        }
        .essai-hover-date {
          font-family: Georgia, serif;
          font-size: 10px;
          color: #a09880;
          font-style: italic;
          margin: 0;
        }
        .essai-hover-resume {
          font-family: Georgia, serif;
          font-size: 11px;
          color: #5a524a;
          line-height: 1.42;
          margin: 6px 0 0;
          font-style: italic;
        }
        .essai-hover-lire {
          display: inline-block;
          margin-top: 9px;
          font-size: 11.5px;
          color: #3d6b4f;
          font-weight: 600;
          letter-spacing: 0.03em;
        }
        .article-journal-cartouche-overlay {
          position: absolute;
          inset: 0;
          background: rgba(250,248,243,0.88);
          z-index: 0;
          pointer-events: none;
          border-radius: inherit;
        }
        .essai-etoile { opacity: 0; transition: opacity 0.15s; pointer-events: none; }
        .essai-carte:hover .essai-etoile { opacity: 1; pointer-events: auto; }
        .article-journal-normal {
          position: relative;
          color: #3d3832;
          display: flex;
          flex-direction: column;
        }
        .article-journal-carre {
          width: min(100%, 270px);
          height: 285px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .article-journal-lignes {
          font-family: Georgia, serif;
          font-size: 11.05px;
          line-height: 15px;
          letter-spacing: -0.002em;
          word-spacing: -0.06em;
          color: #4f4942;
          font-stretch: condensed;
          font-kerning: normal;
          hyphens: auto;
          overflow-wrap: normal;
          text-rendering: geometricPrecision;
        }
        .article-journal-lignes-haut { margin-bottom: 0; }
        .article-journal-lignes-bas { margin-top: 0; }
        .article-journal-centre-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(150px, 54%, 220px) minmax(0, 1fr);
          align-items: start;
          column-gap: 7px;
          height: 105px;
          margin: 0;
        }
        .article-journal-lignes-cote {
          min-width: 0;
          height: 105px;
          line-height: 15px;
          overflow: hidden;
          hyphens: none;
          overflow-wrap: normal;
          word-break: normal;
        }
        .article-journal-texte-cote {
          display: block;
          margin: 0;
          max-height: 60px;
          line-height: 15px;
          overflow: hidden;
        }
        .article-journal-lignes-gauche .article-journal-texte-cote {
          text-align: right;
          text-align-last: right;
        }
        .article-journal-lignes-droite .article-journal-texte-cote {
          text-align: left;
          text-align-last: left;
        }
        .article-journal-ligne {
          display: block;
          height: 15px;
          line-height: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-align: justify;
          text-align-last: justify;
          max-width: 100%;
        }
        .article-journal-lignes-gauche .article-journal-ligne {
          text-align: justify;
          text-align-last: justify;
        }
        .article-journal-lignes-droite .article-journal-ligne {
          text-align: justify;
          text-align-last: justify;
        }
        .article-journal-cartouche {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 105px;
          box-sizing: border-box;
          min-width: 0;
          max-width: none;
          margin: 0 auto;
          padding: 6px 10px 7px;
          background: #faf8f3;
          border: 1px solid rgba(61, 107, 79, 0.58);
          box-shadow:
            0 0 0 2px rgba(250, 248, 243, 0.92),
            0 0 0 3px rgba(61, 107, 79, 0.11),
            0 6px 14px rgba(38, 32, 24, 0.055);
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .article-journal-cartouche-auteur {
          margin: 0 0 4px;
          font-size: 8.5px;
          line-height: 1.1;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #9a7a50;
        }
        .article-journal-cartouche-titre {
          margin: 0;
          font-family: Georgia, serif;
          font-size: 15px;
          line-height: 1.1;
          font-weight: normal;
          color: #1e2e24;
          hyphens: auto;
          letter-spacing: 0.01em;
        }
        .article-journal-cartouche-titre-ligne {
          display: block;
          white-space: nowrap;
        }
        .article-journal-categories {
          display: flex;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: auto;
          padding-top: 10px;
          clear: both;
        }
        .article-journal-categorie {
          font-size: 8.5px;
          color: #4f4942;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ecrire-bandeau-container {
          margin: 10px auto 14px;
          max-width: 380px;
        }
        .ecrire-bandeau {
          display: flex;
          height: 34px;
          border: 1px solid rgba(61,107,79,0.18);
          border-radius: 3px;
          background: rgba(61,107,79,0.03);
          overflow: hidden;
          position: relative;
          transition: border-color 0.18s, background 0.18s;
        }
        .ecrire-bandeau:hover {
          border-color: rgba(61,107,79,0.32);
          background: rgba(61,107,79,0.05);
        }
        .ecrire-bandeau-label {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9.5px;
          font-style: italic;
          color: rgba(61,107,79,0.55);
          letter-spacing: 0.08em;
          transition: opacity 0.14s;
          pointer-events: none;
          z-index: 2;
        }
        .ecrire-bandeau:hover .ecrire-bandeau-label { opacity: 0; }
        .ecrire-option {
          flex: 1;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 10px;
          font-family: Georgia, serif;
          font-style: italic;
          color: #3d6b4f;
          opacity: 0;
          transition: opacity 0.14s, background 0.14s;
          letter-spacing: 0.02em;
        }
        .ecrire-option:hover { background: rgba(61,107,79,0.08); }
        .ecrire-option + .ecrire-option { border-left: 1px solid rgba(61,107,79,0.16); }
        .ecrire-bandeau:hover .ecrire-option { opacity: 1; }
        @media (max-width: 780px) {
          .publications-litteraires { padding: 18px 10px 28px; }
          .essais-journal { grid-template-columns: 1fr; }
          .essais-journal .essai-carte { border-right: none; }
          .article-journal-centre-row { grid-template-columns: 1fr; }
          .article-journal-lignes-cote { display: none; }
          .article-journal-cartouche { width: min(82%, 230px); }
          .essai-carte.featured { grid-row: auto; padding: 22px 20px 20px; }
        }
      `}</style>
      {tries.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun essai trouvé.</p>
      ) : (
        <>
          <EnTetePublicationsPopulaires essais={populaires} favorisEssais={favorisEssais} toggleFavoriEssai={toggleFavoriEssai} />
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

function EnTetePublicationsPopulaires({ essais, favorisEssais, toggleFavoriEssai }: {
  essais: EssaiResume[]
  favorisEssais: Set<string>
  toggleFavoriEssai: (id: string) => void
}) {
  if (essais.length === 0) return null
  const [premier, ...autres] = essais
  return (
    <section style={{ maxWidth: '680px', margin: '0 auto 26px', border: '1px solid #c8ad72', borderRadius: '3px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(140,110,45,0.09)' }} aria-label="Publications populaires">
      {/* Bandeau titre */}
      <div style={{ background: 'linear-gradient(to right, #c8a84a, #e0c470, #c8a84a)', padding: '6px 12px', textAlign: 'center', borderBottom: '1px solid #c8ad72' }}>
        <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#3a2a08' }}>
          &#10022; Oeuvres les plus lues &#10022;
        </span>
      </div>

      {/* Bandeau superieur - #1 */}
      <Link href={`/essais/${premier.id}`} className="podium-lien" style={{ display: 'block', padding: '16px 22px', background: 'linear-gradient(160deg, #faf3e2 0%, #f0e6c6 100%)', textDecoration: 'none', borderBottom: autres.length > 0 ? '1px solid rgba(200,180,114,0.45)' : 'none' }}>
        <span className="podium-overlay-lire"><span className="podium-overlay-lire-texte">Lire &rarr;</span></span>
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9a7a28', display: 'block', marginBottom: '5px' }}>
          {premier.auteur}
        </span>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '19px', lineHeight: 1.2, color: '#1e2e24', display: 'block', marginBottom: '7px' }}>
          {premier.titre}
        </span>
        {premier.resume && (
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#6a6050', lineHeight: 1.55, display: 'block', fontStyle: 'italic', marginBottom: '10px' }}>
            {premier.resume.length > 155 ? premier.resume.slice(0, 155) + ' ...' : premier.resume}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#a09068' }}>
            {premier.nb_likes > 0 ? `${premier.nb_likes} likes` : `${premier.nb_vues} vue${premier.nb_vues !== 1 ? 's' : ''}`}
          </span>
          <EtoileFavori actif={favorisEssais.has(String(premier.id))} onToggle={() => toggleFavoriEssai(String(premier.id))} size={12} style={{ color: favorisEssais.has(String(premier.id)) ? '#c8933a' : '#c0b48a' }} />
        </span>
      </Link>

      {/* Bandeau inferieur - #2 et #3 cote a cote */}
      {autres.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {autres.map((e, i) => (
            <Link key={e.id} href={`/essais/${e.id}`} className="podium-lien" style={{ display: 'block', padding: '12px 16px', background: i === 0 ? 'linear-gradient(160deg, #f5eedc 0%, #ece3c2 100%)' : 'linear-gradient(160deg, #ece3c2 0%, #f5eedc 100%)', textDecoration: 'none', borderLeft: i > 0 ? '1px solid rgba(200,180,114,0.42)' : 'none' }}>
              <span className="podium-overlay-lire"><span className="podium-overlay-lire-texte">Lire &rarr;</span></span>
              <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9a7a28', display: 'block', marginBottom: '3px' }}>
                {e.auteur}
              </span>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', lineHeight: 1.25, color: '#2a3d30', display: 'block', marginBottom: '5px' }}>
                {e.titre}
              </span>
              {e.resume && (
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#7a7060', lineHeight: 1.44, display: 'block', fontStyle: 'italic', marginBottom: '7px' }}>
                  {e.resume.length > 80 ? e.resume.slice(0, 80) + ' ...' : e.resume}
                </span>
              )}
              <span style={{ fontSize: '9px', color: '#a09068' }}>
                {e.nb_likes > 0 ? `${e.nb_likes} likes` : `${e.nb_vues} vue${e.nb_vues !== 1 ? 's' : ''}`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
type HabillageJournal = {
  haut: string[]
  gauche: string[]
  droite: string[]
  bas: string[]
}

const LARGEUR_LIGNE_JOURNAL = 260
const LARGEUR_LIGNE_COTE_JOURNAL = 49

function largeurCaractereJournal(caractere: string, type: 'marge' | 'auteur' | 'titre' = 'marge') {
  const facteur = type === 'titre' ? 1.46 : type === 'auteur' ? 1.14 : 1
  if (caractere === ' ') return 3.2 * facteur
  if ("ilI.,;:!'â€™".includes(caractere)) return 2.7 * facteur
  if ('mwMWÃ¢ÃªÃ´Ã»Ã‚ÃŠÃ”Ã›'.includes(caractere)) return 7.4 * facteur
  return 5.35 * facteur
}

function largeurMotJournal(mot: string, type: 'marge' | 'auteur' | 'titre' = 'marge') {
  const facteur = type === 'titre' ? 1.46 : type === 'auteur' ? 1.14 : 1
  return mot.split('').reduce((total, caractere) => {
    if (caractere === ' ') return total + 3.2 * facteur
    if ("ilI.,;:!'’".includes(caractere)) return total + 2.7 * facteur
    if ('mwMWâêôûÂÊÔÛ'.includes(caractere)) return total + 7.4 * facteur
    return total + 5.35 * facteur
  }, 0)
}

function largeurTexteJournal(texte: string, type: 'marge' | 'auteur' | 'titre' = 'marge') {
  return texte.split(/\s+/).filter(Boolean).reduce((total, mot, i) => total + largeurMotJournal(mot, type) + (i > 0 ? 3.2 : 0), 0)
}

function prendreLongueur(mots: string[], index: number, cible: number, minMots = 2, maxMots = 14) {
  const pris: string[] = []
  let longueur = 0
  while (pris.length < maxMots) {
    const mot = mots[index % mots.length]
    const prochaineLongueur = longueur + largeurTexteJournal(mot) + (pris.length > 0 ? 3.2 : 0)
    if (pris.length >= minMots && prochaineLongueur > cible) break
    pris.push(mot)
    longueur = prochaineLongueur
    index += 1
  }
  return { texte: pris.join(' '), index }
}

function estLettreJournal(caractere: string | undefined) {
  return !!caractere && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(caractere)
}

function prendreLigneForcee(texte: string, index: number, cible: number) {
  while (texte[index % texte.length] === ' ') index += 1
  const depart = index
  let longueur = 0
  let ligne = ''
  while (index - depart < 90) {
    const caractere = texte[index % texte.length]
    const largeur = largeurCaractereJournal(caractere)
    if (ligne.length > 0 && longueur + largeur > cible) break
    ligne += caractere
    longueur += largeur
    index += 1
  }
  const finitSurEspace = /\s$/.test(ligne)
  const ligneSansBlanc = ligne.trimEnd()
  const finitSurTiret = /[-‐‑‒–—]$/.test(ligneSansBlanc)
  const precedent = ligneSansBlanc.at(-1)
  const suivant = texte[index % texte.length]
  if (!finitSurEspace && !finitSurTiret && estLettreJournal(precedent) && estLettreJournal(suivant)) {
    const largeurTiret = largeurCaractereJournal('-')
    if (longueur + largeurTiret <= cible) {
      ligne = `${ligneSansBlanc}-`
    } else if (ligneSansBlanc.length > 2) {
      ligne = `${ligneSansBlanc.slice(0, -1)}-`
      index -= 1
    }
  } else {
    ligne = ligneSansBlanc
  }
  while (texte[index % texte.length] === ' ') index += 1
  const ligneNettoyee = ligne
    .trim()
    .replace(/\s+[-‐‑‒–—]$/, '')
    .replace(/[-‐‑‒–—]{2,}$/, '-')
  return { texte: ligneNettoyee, index }
}

function prendreLignesForcees(texte: string, index: number, nombre: number, cible: number) {
  const lignes: string[] = []
  for (let i = 0; i < nombre; i++) {
    const ligne = prendreLigneForcee(texte, index, cible)
    index = ligne.index
    lignes.push(ligne.texte)
  }
  return { lignes, index }
}

function lignesTitreCentre(titre: string) {
  const mots = titre.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (mots.length <= 2 || largeurTexteJournal(titre, 'titre') <= 124) return [titre]
  let meilleurIndex = 1
  let meilleurScore = Number.POSITIVE_INFINITY
  for (let i = 1; i < mots.length; i++) {
    const premiere = mots.slice(0, i).join(' ')
    const seconde = mots.slice(i).join(' ')
    const largeurPremiere = largeurTexteJournal(premiere, 'titre')
    const largeurSeconde = largeurTexteJournal(seconde, 'titre')
    const score = Math.max(largeurPremiere, largeurSeconde) + Math.abs(largeurPremiere - largeurSeconde) * 0.28
    if (score < meilleurScore) {
      meilleurScore = score
      meilleurIndex = i
    }
  }
  return [mots.slice(0, meilleurIndex).join(' '), mots.slice(meilleurIndex).join(' ')].filter(Boolean)
}

function creerHabillageJournal(texte: string): HabillageJournal {
  const base = texte.replace(/\s+/g, ' ').trim() || 'Lire cette contribution dans son entier pour en suivre le développement et les nuances.'
  const source = base.length < 520 ? `${base} ${base} ${base}` : base
  let index = 0
  const hautForce = prendreLignesForcees(source, index, 6, LARGEUR_LIGNE_JOURNAL)
  index = hautForce.index

  const gaucheForce = prendreLignesForcees(source, index, 7, LARGEUR_LIGNE_COTE_JOURNAL)
  index = gaucheForce.index
  const droiteForce = prendreLignesForcees(source, index, 7, LARGEUR_LIGNE_COTE_JOURNAL)
  index = droiteForce.index

  const basForce = prendreLignesForcees(source, index, 6, LARGEUR_LIGNE_JOURNAL)
  return {
    haut: hautForce.lignes,
    gauche: gaucheForce.lignes,
    droite: droiteForce.lignes,
    bas: basForce.lignes,
  }
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
  const lignesTitreAffichees = lignesTitreCentre(e.titre)
  const lignesHabillage = creerHabillageJournal(resumeJournal)

  if (!miseEnAvant) {
    return (
      <div className="essai-carte" onClick={() => router.push(`/essais/${e.id}`)}>
        {/* Overlay au survol */}
        <div className="essai-hover-overlay">
          <div className="essai-hover-contenu">
            <p className="essai-hover-titre">{e.titre}</p>
            <p className="essai-hover-auteur">{e.auteur}</p>
            {dateFormatee && <p className="essai-hover-date">{dateFormatee}</p>}
            {e.resume && (
              <p className="essai-hover-resume">
                {e.resume.length > 130 ? e.resume.slice(0, 130).replace(/\s+\S*$/, '') + ' ...' : e.resume}
              </p>
            )}
            <span className="essai-hover-lire">Lire &rarr;</span>
          </div>
        </div>

        <div className="essai-etoile" style={{ position: 'absolute', bottom: '12px', right: '10px', zIndex: 20 }}>
          <EtoileFavori actif={favorisEssais.has(String(e.id))} onToggle={() => toggleFavoriEssai(String(e.id))} size={14} />
        </div>

        <div className="essai-contenu article-journal-normal">
          <div className="article-journal-carre">
            <div className="article-journal-lignes article-journal-lignes-haut" aria-hidden="true">
              {lignesHabillage.haut.map((ligne, i) => (
                <span key={i} className="article-journal-ligne">{ligne}</span>
              ))}
            </div>
            <div className="article-journal-centre-row">
              <div className="article-journal-lignes article-journal-lignes-cote article-journal-lignes-gauche" aria-hidden="true">
                {lignesHabillage.gauche.map((ligne, i) => (
                  <span key={i} className="article-journal-ligne">{ligne}</span>
                ))}
              </div>
              <div className="article-journal-cartouche" style={e.avatar_url ? { backgroundImage: `url(${e.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center top' } : {}}>
                {e.avatar_url && <div className="article-journal-cartouche-overlay" />}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p className="article-journal-cartouche-auteur">{e.auteur}</p>
                  <p className="article-journal-cartouche-titre">
                    {lignesTitreAffichees.map((ligne, i) => <span key={i} className="article-journal-cartouche-titre-ligne">{ligne}</span>)}
                  </p>
                  {dateFormatee && (
                    <p style={{ margin: '7px 0 0', fontSize: '8.5px', fontStyle: 'italic', color: '#9a8a6a', fontFamily: 'Georgia, serif' }}>
                      {dateFormatee}
                    </p>
                  )}
                </div>
              </div>
              <div className="article-journal-lignes article-journal-lignes-cote article-journal-lignes-droite" aria-hidden="true">
                {lignesHabillage.droite.map((ligne, i) => (
                  <span key={i} className="article-journal-ligne">{ligne}</span>
                ))}
              </div>
            </div>
            <div className="article-journal-lignes article-journal-lignes-bas" aria-hidden="true">
              {lignesHabillage.bas.map((ligne, i) => (
                <span key={i} className="article-journal-ligne">{ligne}</span>
              ))}
            </div>
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
          <path d="M7 10.5L14 17.5L21 10.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

function OngletEcrire({ connecte }: { connecte: boolean | null }) {
  if (connecte === false) {
    return (
      <div style={{ textAlign: 'center', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '28px 24px', maxWidth: '520px', margin: '0 auto' }}>
        <p style={{ fontSize: '13px', color: '#6b6560', marginBottom: '14px' }}>Connectez-vous pour écrire un essai ou une méditation.</p>
        <Link href="/chantier" style={{ display: 'inline-block', padding: '8px 18px', fontSize: '12.5px', fontWeight: 600, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
          Se connecter
        </Link>
      </div>
    )
  }
  if (connecte === null) return <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: '30px 34px', textAlign: 'center' }}>
      <p style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 8px' }}>
        Espace de rédaction
      </p>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 10px' }}>
        Écrire une publication
      </h2>
      <p style={{ fontSize: '12.5px', color: '#6b6560', lineHeight: 1.65, margin: '0 auto 20px', maxWidth: '440px' }}>
        Le titre, le résumé, les catégories et le texte se renseignent désormais dans la même page.
      </p>
      <Link href="/essais/nouveau?depuis=publications" style={{ display: 'inline-block', padding: '9px 22px', fontSize: '12.5px', fontWeight: 600, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
        Ouvrir la rédaction
      </Link>
    </div>
  )
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
    .from('versets_lecture')
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
              href={`/?livre=${verset.livre}&chapitre=${verset.chapitre}&verset=${verset.verset}`}
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
          <Link href="/chantier" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>Connectez-vous</Link> pour enregistrer votre méditation.
        </p>
      )}
    </div>
  )
}

function tagFiltre(actif: boolean): React.CSSProperties {
  return { fontSize: '10.5px', padding: '3px 10px', borderRadius: '10px', border: `1px solid ${actif ? '#3d6b4f' : '#d6d0c4'}`, background: actif ? 'rgba(61,107,79,0.09)' : 'rgba(255,255,255,0.60)', color: actif ? '#3d6b4f' : '#8a8278', cursor: 'pointer', fontWeight: actif ? 600 : 400, letterSpacing: '0.01em' }
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
