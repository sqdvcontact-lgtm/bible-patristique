'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { CATEGORIES_ESSAIS } from './EtapeMetadonnees'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { couvertureDe } from '@/app/lib/couverturesEssai'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'

const CATEGORIES = CATEGORIES_ESSAIS

type Onglet = 'communaute' | 'mes-ecrits' | 'ecrire' | 'suggestion'

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; nb_vues: number; nb_likes: number; publie_at: string | null; auteur: string
  user_id?: string | null
  /** Clé de la couleur de couverture choisie par l'auteur (voir couverturesEssai.ts). */
  couverture?: string | null
}

type EssaiPerso = {
  id: number; titre: string; sous_titre: string | null; statut: string
  updated_at: string | null; publie_at: string | null; nb_vues: number | null; nb_likes: number
}

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: 'var(--cs-texte-doux)' },
  en_attente: { label: 'En attente', couleur: '#9a5a2a' },
  publie: { label: 'Publié', couleur: 'var(--cs-vert)' },
  a_reviser: { label: 'À réviser', couleur: 'var(--cs-danger)' },
  refuse: { label: 'Refusé', couleur: 'var(--cs-danger)' },
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

export default function EssaisListeClient({ essais }: { essais: EssaiResume[] }) {
  const [onglet, setOnglet] = useState<Onglet>('communaute')
  // Sous-onglet de « Écrire » : rédiger un texte, ou commenter un verset aléatoire.
  const [sousEcrire, setSousEcrire] = useState<'rediger' | 'suggestion'>('rediger')
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
    <main style={{ background: 'var(--cs-fond)', minHeight: '100vh', paddingTop: '8px' }}>
      <div style={{ maxWidth: '71rem', margin: '0 auto', padding: '8px 30px 70px' }}>

        {/* En-tête — sobre : le titre, un discret losange, puis les onglets. */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '4px' }}>

          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.6875rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, letterSpacing: '0.02em' }}>
            Publications
          </h1>
          <div aria-hidden="true" style={{ color: 'var(--cs-or)', fontSize: '0.4375rem', letterSpacing: '0.4em', margin: '6px 0 8px' }}>◆</div>

          {/* Onglets navigation — trois entrées : les écrits de la communauté, les siens,
              et « Écrire » (qui se subdivise en deux sous-onglets). */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', borderBottom: '1px solid var(--cs-bord)' }}>
            {([
              { key: 'communaute' as const, label: 'Écrits de la communauté' },
              { key: 'mes-ecrits' as const, label: 'Mes écrits' },
              { key: 'ecrire' as const, label: 'Écrire' },
            ]).map(o => (
              <button key={o.key} onClick={() => setOnglet(o.key)}
                style={{ padding: '6px 16px', fontSize: '0.71875rem', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid var(--cs-vert)' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {o.label}
              </button>
            ))}
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
        ) : (
          <>
            {/* Deux sous-onglets sous « Écrire ». */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '14px 0 18px' }}>
              {([
                { key: 'rediger' as const, label: 'Rédiger un texte' },
                { key: 'suggestion' as const, label: 'Commenter un verset' },
              ]).map(s => (
                <button key={s.key} onClick={() => setSousEcrire(s.key)}
                  style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '999px', border: `1px solid ${sousEcrire === s.key ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: sousEcrire === s.key ? 'rgba(var(--cs-vert-rgb),0.09)' : 'rgba(255,255,255,0.6)', color: sousEcrire === s.key ? 'var(--cs-vert)' : '#8a8278', fontWeight: sousEcrire === s.key ? 600 : 400, cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
            {sousEcrire === 'rediger' ? <OngletEcrire connecte={connecte} /> : <OngletSuggestion connecte={connecte} />}
          </>
        )}
      </div>
    </main>
  )
}


function formaterDateLongue(publie_at: string | null): string {
  if (!publie_at) return ''
  return new Date(publie_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function OngletCommunaute({
  recherche, setRecherche, filtreCategorie, setFiltreCategorie, essais,
}: {
  recherche: string; setRecherche: (v: string) => void
  filtreCategorie: string | null; setFiltreCategorie: (v: string | null) => void
  essais: EssaiResume[]
}) {
  const { favoris: favorisEssais, toggle: toggleFavoriEssai } = useFavoris('essai')

  // Fil chronologique : du plus récent au plus ancien.
  const tries = useMemo(
    () => [...essais].sort((a, b) => (b.publie_at ?? '').localeCompare(a.publie_at ?? '')),
    [essais],
  )

  // Le filtrage par catégorie et par recherche se fait chez l'appelant : la table
  // reçoit déjà les publications retenues, et n'a plus qu'à les ordonner.

  // Les plus lus : signalés au dos de la couverture, sans être retirés du fil.
  const plusLus = useMemo(() => new Set(
    [...tries]
      .sort((a, b) => (b.nb_vues - a.nb_vues) || (b.nb_likes - a.nb_likes))
      .slice(0, 3)
      .map(e => e.id),
  ), [tries])

  return (
    <>
      {/* Recherche + filtres de catégorie, centrés ; les tags passent à la ligne. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <div style={{ position: 'relative', width: '13.75rem', flexShrink: 0 }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Auteur, titre, résumé…"
            style={{ width: '100%', fontSize: '0.6875rem', padding: '5px 12px 5px 28px', border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'rgba(255,255,255,0.72)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.32 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setFiltreCategorie(null)} style={tagFiltre(!filtreCategorie)}>Tout</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => setFiltreCategorie(c)} style={tagFiltre(filtreCategorie === c)}>{c}</button>)}
        </div>
      </div>

      <style>{`
        .publications-sommaire-tete { display: flex; align-items: center; gap: 14px; margin: 0 0 14px; }
        .publications-sommaire-tete::before,
        .publications-sommaire-tete::after {
          content: ""; height: 1px; flex: 1;
          background: linear-gradient(90deg, rgba(154,122,56,0.04), rgba(154,122,56,0.34), rgba(154,122,56,0.04));
        }
        .publications-sommaire-tete span {
          font-size: 0.59375rem; font-weight: 700; letter-spacing: 0.24em;
          text-transform: uppercase; color: #7a6030;
        }

        /* Trois couvertures par rang, comme une table d'étalage. */
        .rayon { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.7rem 1.5rem; }

        /* Une couverture : proportion d'un petit livre, couleur pleine, composition
           CENTRÉE. Tout est sans empattement, la quatrième exceptée. */
        .couverture {
          position: relative; display: block; aspect-ratio: 2 / 3; overflow: hidden;
          border-radius: 2px; text-decoration: none; isolation: isolate;
          font-family: var(--font-source-sans), Arial, sans-serif;
          box-shadow: 0 1px 2px rgba(40,30,15,0.18), 0 10px 22px -12px rgba(40,30,15,0.40);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .couverture:hover { transform: translateY(-4px); box-shadow: 0 2px 5px rgba(40,30,15,0.20), 0 20px 34px -14px rgba(40,30,15,0.46); }

        /* Le dos de reliure : une bande sombre au bord gauche, discrète. */
        .couverture::before {
          content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 7px; z-index: 2;
          background: linear-gradient(90deg, rgba(0,0,0,0.30), rgba(0,0,0,0.05) 70%, rgba(255,255,255,0.06));
          pointer-events: none;
        }

        /* Trois zones : l'auteur en haut, le titre au centre optique, la date au
           pied. C'est cette respiration qui fait la couverture, plus qu'un cadre. */
        .couverture-face {
          position: absolute; inset: 0; z-index: 1;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 2.1rem 1.4rem 1.5rem 1.55rem;
          transition: opacity 0.22s ease;
        }
        .couverture-cadre { position: absolute; inset: 0.75rem 0.7rem 0.7rem 1rem; border: 1px solid; pointer-events: none; }

        .couverture-auteur {
          font-size: 0.75rem; font-weight: 600; line-height: 1.3;
          letter-spacing: 0.19em; text-transform: uppercase;
        }
        .couverture-centre { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; }
        .couverture-filet { height: 1px; width: 1.9rem; }
        .couverture-titre { font-size: 1.375rem; font-weight: 600; line-height: 1.16; letter-spacing: -0.012em; }
        .couverture-soustitre { font-size: 0.78125rem; font-weight: 400; line-height: 1.34; opacity: 0.82; }
        .couverture-date { font-size: 0.625rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.72; }

        .couverture-etoile { position: absolute; top: 0.55rem; right: 0.6rem; z-index: 4; line-height: 1; }

        /* La quatrième : elle se retourne au survol. Seul endroit en empattement. */
        .couverture-dos {
          position: absolute; inset: 0; z-index: 3;
          display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
          padding: 2rem 1.5rem 1.5rem 1.65rem;
          opacity: 0; pointer-events: none; transition: opacity 0.22s ease;
        }
        .couverture:hover .couverture-dos { opacity: 1; pointer-events: auto; }
        .couverture:hover .couverture-face { opacity: 0; }
        .couverture-resume {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.84375rem; line-height: 1.5;
          overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 8;
        }
        /* « Lire » : ni cadre ni flèche. Un mot, espacé, souligné d'un filet fin. */
        .couverture-lire {
          margin-top: 1.15rem;
          font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase;
          padding-bottom: 0.28rem; border-bottom: 1px solid currentColor;
        }
        .couverture-dos-meta {
          position: absolute; left: 0; right: 0; bottom: 1.15rem;
          display: flex; align-items: center; justify-content: center; gap: 0.85rem;
          font-size: 0.5625rem; letter-spacing: 0.09em; text-transform: uppercase; opacity: 0.66;
        }

        @media (max-width: 900px) { .rayon { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.2rem 1rem; } }
        @media (max-width: 520px) { .rayon { grid-template-columns: 1fr; } }

        /* Tactile : rien ne se survole. La face reste, le dos ne s'affiche jamais ;
           le résumé se lit sur la page de la publication, à un doigt de là. */
        @media (hover: none) {
          .couverture-dos { display: none; }
          .couverture:hover .couverture-face { opacity: 1; }
          .couverture:hover { transform: none; }
        }
      `}</style>

      {tries.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun essai trouvé.</p>
      ) : (
        <>
          <div className="publications-sommaire-tete"><span>Au sommaire</span></div>
          <div className="rayon">
            {tries.map(e => (
              <CouvertureEssai key={e.id} essai={e} plusLu={plusLus.has(e.id)}
                favorisEssais={favorisEssais} toggleFavoriEssai={toggleFavoriEssai} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

// Une publication se présente comme un petit livre. La face porte le nom de
// l'auteur, le titre, le sous-titre et la date ; la quatrième, qui se retourne au
// survol, porte le résumé et le bouton « Lire ». La couleur est celle que l'auteur
// a choisie (voir app/lib/couverturesEssai.ts).
function CouvertureEssai({ essai: e, plusLu, favorisEssais, toggleFavoriEssai }: {
  essai: EssaiResume; plusLu: boolean
  favorisEssais: Set<string>; toggleFavoriEssai: (id: string) => void
}) {
  const c = couvertureDe(e.couverture)
  return (
    <Link href={`/essais/${e.id}`} className="couverture"
      style={{ background: c.fond, color: c.encre }}
      title={`${e.titre} — ${e.auteur}`}>

      <span className="couverture-etoile">
        <EtoileFavori actif={favorisEssais.has(String(e.id))} onToggle={() => toggleFavoriEssai(String(e.id))} size={13} />
      </span>

      <span className="couverture-face">
        <span className="couverture-cadre" style={{ borderColor: c.filet }} aria-hidden="true" />
        <span className="couverture-auteur">{e.auteur}</span>
        <span className="couverture-centre">
          <span className="couverture-filet" style={{ background: c.filet }} aria-hidden="true" />
          <span className="couverture-titre">{e.titre}</span>
          {e.sous_titre && <span className="couverture-soustitre">{e.sous_titre}</span>}
        </span>
        {e.publie_at && <span className="couverture-date">{formaterDateLongue(e.publie_at)}</span>}
      </span>

      {/* La quatrième de couverture. `aria-hidden` : le résumé est déjà porté par
          le titre du lien et par la page de la publication ; ce calque est un
          doublon visuel, il n'a pas à être annoncé deux fois. */}
      <span className="couverture-dos" style={{ background: c.fond }} aria-hidden="true">
        <span className="couverture-cadre" style={{ borderColor: c.filet }} />
        {e.resume
          ? <span className="couverture-resume">{e.resume}</span>
          : <span className="couverture-resume" style={{ opacity: 0.7, fontStyle: 'italic' }}>{e.titre}</span>}
        <span className="couverture-lire">Lire</span>
        <span className="couverture-dos-meta">
          <span>{e.nb_vues} vue{e.nb_vues !== 1 ? 's' : ''}</span>
          {e.nb_likes > 0 && <span>♥ {e.nb_likes}</span>}
          {plusLu && <span>◆ parmi les plus lus</span>}
        </span>
      </span>
    </Link>
  )
}

function OngletEcrire({ connecte }: { connecte: boolean | null }) {
  if (connecte === false) {
    return (
      <div style={{ textAlign: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '28px 24px', maxWidth: '32.5rem', margin: '0 auto' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', marginBottom: '14px' }}>Connectez-vous pour écrire un essai ou une méditation.</p>
        <Link href="/chantier" style={{ display: 'inline-block', padding: '8px 18px', fontSize: '0.78125rem', fontWeight: 600, background: 'var(--cs-vert)', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
          Se connecter
        </Link>
      </div>
    )
  }
  if (connecte === null) return <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
  return (
    <div style={{ maxWidth: '38.75rem', margin: '0 auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '10px', padding: '30px 34px', textAlign: 'center' }}>
      <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 8px' }}>
        Espace de rédaction
      </p>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 10px' }}>
        Écrire une publication
      </h2>
      <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0 auto 20px', maxWidth: '27.5rem' }}>
        Le titre, le résumé, les catégories et le texte se renseignent désormais dans la même page.
      </p>
      <Link href="/essais/nouveau?depuis=publications" style={{ display: 'inline-block', padding: '9px 22px', fontSize: '0.78125rem', fontWeight: 600, background: 'var(--cs-vert)', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
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
    return <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-danger-fonce)', fontStyle: 'italic' }}>Connectez-vous pour voir vos écrits.</p>
  }
  if (essais === null) return <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
  if (essais.length === 0) return <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun écrit pour l&apos;instant.</p>

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
    // « Déjà validée » = possède un publie_at (validée au moins une fois). On ne compare
    // plus updated_at à publie_at : publie_at est figé à la 1re publication alors que
    // updated_at avance à chaque édition, ce qui désactivait à tort la republication. Le
    // serveur (trigger forcer_statut_essai) reste seul juge : contenu modifié → en_attente.
    const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at)
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
    <div style={{ maxWidth: '42.5rem', margin: '0 auto' }}>
      {/* Filtres — puces discrètes ; le compteur ne s'affiche que s'il y a des écrits. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {groupes.map(g => {
          const actif = filtre === g.key
          const nb = essais.filter(g.test).length
          return (
            <button key={g.key} onClick={() => setFiltre(g.key)}
              style={{ fontSize: '0.625rem', padding: '3px 10px', borderRadius: '999px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.09)' : 'transparent', color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', cursor: 'pointer', fontWeight: actif ? 700 : 500, letterSpacing: '0.01em' }}>
              {g.label}{nb > 0 ? <span style={{ opacity: 0.55, marginLeft: '4px' }}>{nb}</span> : null}
            </button>
          )
        })}
      </div>
      {essaisFiltres.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun écrit dans cet onglet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {essaisFiltres.map(e => {
            const st = STATUTS[e.statut] ?? { label: e.statut, couleur: 'var(--cs-texte-doux)' }
            const date = e.publie_at ?? e.updated_at
            const statutStyle = styleStatut(e.statut)
            const dernier = derniereAction(e.id)
            const restant = Math.max(0, 60 * 60 * 1000 - (maintenant - dernier))
            const verrouille = restant > 0
            // « Déjà validée » = possède un publie_at (validée au moins une fois). On ne compare
    // plus updated_at à publie_at : publie_at est figé à la 1re publication alors que
    // updated_at avance à chaque édition, ce qui désactivait à tort la republication. Le
    // serveur (trigger forcer_statut_essai) reste seul juge : contenu modifié → en_attente.
    const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at)
            const peutBasculer = dejaValide && (e.statut === 'publie' || e.statut === 'brouillon')
            const timer = verrouille ? formatTimer(restant) : ''
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', background: statutStyle.fond, border: `1px solid ${statutStyle.bordure}`, borderLeft: `3px solid ${statutStyle.accent}`, borderRadius: '7px', padding: '8px 12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: 'var(--cs-encre-fonce)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titre}</span>
                    {e.sous_titre && <span style={{ fontSize: '0.71875rem', color: '#8a8278', fontStyle: 'italic' }}>{e.sous_titre}</span>}
                  </div>
                  {/* Méta sur UNE seule ligne : statut · date · vues · cœurs. La révision en
                      cours est signalée là, sans encart séparé. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.59375rem', color: 'var(--cs-texte-faible)', marginTop: '2px' }}>
                    <span style={{ color: st.couleur, fontWeight: 700 }}>{st.label}</span>
                    <span>{date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sans date'}</span>
                    <span>{e.nb_vues ?? 0} vue{(e.nb_vues ?? 0) > 1 ? 's' : ''}</span>
                    <span>♥ {e.nb_likes ?? 0}</span>
                    {e.statut === 'en_attente' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#9a5a2a', fontWeight: 600 }}>
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.2" stroke="#9a5a2a" strokeWidth="1.4"/>
                          <path d="M8 4.6V8l2.4 1.6" stroke="#9a5a2a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        révision en cours
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button onClick={() => basculerPublication(e)} disabled={!peutBasculer || verrouille}
                    title={!dejaValide ? "Publication possible après validation par l'administration." : verrouille ? 'Interrupteur disponible une heure après le dernier changement.' : e.statut === 'publie' ? 'Dépublier' : 'Publier'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.625rem', color: e.statut === 'publie' ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', background: 'transparent', border: 'none', padding: 0, cursor: !peutBasculer || verrouille ? 'default' : 'pointer', opacity: !peutBasculer ? 0.4 : 1, fontWeight: 600 }}>
                    {timer && <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-doux)', fontWeight: 600 }}>{timer}</span>}
                    <span style={{ width: '26px', height: '14px', borderRadius: '999px', background: e.statut === 'publie' ? 'var(--cs-vert)' : 'var(--cs-bord)', position: 'relative', display: 'inline-block', transition: 'background 0.15s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: e.statut === 'publie' ? '14px' : '2px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--cs-surface)', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                    </span>
                  </button>
                  <Link href={`/essais/${e.id}/modifier`} style={{ fontSize: '0.65625rem', color: 'var(--cs-vert)', textDecoration: 'none', fontWeight: 600 }}>Modifier</Link>
                  <button onClick={() => supprimer(e.id)} style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Supprimer</button>
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
    <div style={{ maxWidth: '35rem', margin: '0 auto', textAlign: 'center', paddingTop: '8px' }}>
      {!verset ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginTop: '20px' }}>
          {chargement ? 'Chargement…' : 'Impossible de charger une suggestion.'}
        </p>
      ) : (
        <>
          <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '10px', padding: '34px 36px 28px', marginBottom: '18px' }}>
            <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 20px' }}>
              Verset proposé à la méditation
            </p>
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', lineHeight: 1.8, color: 'var(--cs-encre-fonce)', fontStyle: 'italic', margin: '0 0 18px' }}>
              «&#8201;{rendreTexteEnrichi(verset.texte)}&#8201;»
            </p>
            <p style={{ fontSize: '0.75rem', color: '#8a8278', margin: 0 }}>
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
              style={{ display: 'inline-block', padding: '9px 22px', fontSize: '0.78125rem', fontWeight: 600, background: 'var(--cs-vert)', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
              Écrire sur ce verset
            </Link>
            <Link
              href={`/?livre=${verset.livre}&chapitre=${verset.chapitre}&verset=${verset.verset}`}
              style={{ display: 'inline-block', padding: '9px 16px', fontSize: '0.78125rem', color: 'var(--cs-vert)', borderRadius: '6px', textDecoration: 'none', border: '1px solid #c8d8cc' }}>
              Lire dans la Bible
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => charger(versets)}
              disabled={!peutRelancer || chargement}
              style={{ fontSize: '0.71875rem', color: peutRelancer ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: peutRelancer ? 'pointer' : 'default', padding: 0, textDecoration: peutRelancer && !chargement ? 'underline' : 'none', fontStyle: 'italic' }}>
              {chargement ? 'Chargement…' : peutRelancer ? 'Autre suggestion' : 'Limite atteinte pour aujourd\'hui'}
            </button>
            <span style={{ fontSize: '0.625rem', color: 'var(--cs-bord)' }}>({versets.length}/{MAX_SUGGESTIONS_JOUR})</span>
          </div>

          {versets.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
              {versets.map((_, i) => (
                <button key={i} onClick={() => setIndex(i)}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === index ? 'var(--cs-vert)' : 'var(--cs-bord)', border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.13s' }} />
              ))}
            </div>
          )}
        </>
      )}

      {connecte === false && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', marginTop: '18px', fontStyle: 'italic' }}>
          <Link href="/chantier" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>Connectez-vous</Link> pour enregistrer votre méditation.
        </p>
      )}
    </div>
  )
}

function tagFiltre(actif: boolean): React.CSSProperties {
  // Tags resserrés et plus légers : pastilles fines, sans bordure au repos ; l'actif se
  // marque d'un aplat vert discret. Plus élégant que les anciens contours gris.
  return {
    fontSize: '0.625rem', padding: '3px 10px', borderRadius: '999px',
    border: '1px solid ' + (actif ? 'var(--cs-vert)' : 'transparent'),
    background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'rgba(120,110,96,0.06)',
    color: actif ? 'var(--cs-vert)' : '#8a8278', cursor: 'pointer',
    fontWeight: actif ? 600 : 400, letterSpacing: '0.02em', lineHeight: 1.3,
    transition: 'background 0.12s, color 0.12s',
  }
}
function formatTimer(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const secondes = total % 60
  return `${minutes}:${String(secondes).padStart(2, '0')}`
}
function styleStatut(statut: string): { fond: string; bordure: string; accent: string } {
  if (statut === 'publie') return { fond: 'rgba(var(--cs-vert-rgb),0.075)', bordure: 'rgba(var(--cs-vert-rgb),0.24)', accent: 'var(--cs-vert)' }
  if (statut === 'en_attente') return { fond: 'rgba(154,90,42,0.075)', bordure: 'rgba(154,90,42,0.24)', accent: '#9a5a2a' }
  if (statut === 'a_reviser') return { fond: 'rgba(var(--cs-danger-rgb),0.08)', bordure: 'rgba(var(--cs-danger-rgb),0.25)', accent: 'var(--cs-danger)' }
  if (statut === 'refuse') return { fond: 'rgba(160,45,45,0.08)', bordure: 'rgba(160,45,45,0.25)', accent: '#a02d2d' }
  return { fond: '#fff', bordure: 'var(--cs-bord-clair)', accent: 'var(--cs-bord)' }
}
