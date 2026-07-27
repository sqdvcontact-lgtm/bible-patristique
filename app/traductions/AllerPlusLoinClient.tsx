'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { formaterSieclesHTML } from '@/app/oeuvre/[id]/texteEnrichi'
import QuizBibliqueClient from '../quiz/QuizBibliqueClient'

type Onglet = 'traductions' | 'acheter' | 'populaires' | 'quiz'

const ONGLETS: { code: Onglet; label: string }[] = [
  { code: 'traductions', label: 'Les traductions' },
  { code: 'acheter', label: 'Acheter des livres' },
  { code: 'populaires', label: 'Statistiques' },
  { code: 'quiz', label: 'Quiz biblique' },
]

export default function AllerPlusLoinClient() {
  const searchParams = useSearchParams()
  const [onglet, setOnglet] = useState<Onglet>('traductions')
  const [hashTraduction, setHashTraduction] = useState<string | null>(null)

  // Arrivée via ?onglet=… (anciens liens /populaires, /progression) ou
  // via #TR0002 (résultat de la recherche rapide, qui cible une traduction précise).
  useEffect(() => {
    const param = searchParams.get('onglet') as Onglet | null
    if (param && ONGLETS.some(o => o.code === param)) {
      setOnglet(param)
      return
    }
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      setOnglet('traductions')
      setHashTraduction(hash)
    }
  }, [searchParams])

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '22px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h1 style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: 'clamp(21px, 3.6vw, 29px)', fontWeight: 'normal',
            color: '#1e2e24', lineHeight: 1.15, marginBottom: '8px',
          }}>
            Aller plus loin
          </h1>
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto 12px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', borderBottom: '1px solid #ddd8cf', marginBottom: '12px', flexWrap: 'wrap' }}>
          {ONGLETS.map(o => (
            <button key={o.code} onClick={() => setOnglet(o.code)} style={{
              padding: '8px 14px', fontSize: '12.5px', fontWeight: onglet === o.code ? 600 : 400,
              color: onglet === o.code ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none',
              borderBottom: onglet === o.code ? '2px solid #3d6b4f' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {onglet === 'traductions' && <OngletTraductions hashTraduction={hashTraduction} />}
      {onglet === 'acheter' && <OngletAcheter />}
      {onglet === 'populaires' && <OngletStatistiques />}
      {onglet === 'quiz' && <OngletQuiz />}
    </main>
  )
}

function OngletQuiz() {
  return (
    <QuizBibliqueClient estAdminReel={false} />
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Onglet « Les traductions »
   ════════════════════════════════════════════════════════════════════════ */

type Traduction = {
  trad_id: string; nom: string; auteur: string | null; dates: string | null;
  bio_courte: string | null; date_publication: string | null;
  confession: string | null; langue: string | null;
  commentaire_editorial: string | null; ordre: number;
  photo: string | null;
  import_maj_le: string | null;
  photo_position: {
    bandeau:  { x: number; y: number; scale: number }
    lateral:  { x: number; y: number; scale: number }
  } | null;
};

function useImageLuminance(url: string | null): boolean | null {
  const [estSombre, setEstSombre] = useState<boolean | null>(null)
  useEffect(() => {
    if (!url) { setEstSombre(null); return }
    let annule = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (annule) return
      try {
        const canvas = document.createElement('canvas')
        const sw = Math.round(Math.min(img.naturalWidth, 400) * 0.45)
        const sh = Math.round(Math.min(img.naturalHeight, 300) * 0.65)
        canvas.width = sw; canvas.height = sh
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, sw * (img.naturalWidth / Math.min(img.naturalWidth, 400)), sh * (img.naturalHeight / Math.min(img.naturalHeight, 300)), 0, 0, sw, sh)
        const { data } = ctx.getImageData(0, 0, sw, sh)
        let lum = 0
        const n = sw * sh
        for (let i = 0; i < data.length; i += 4) {
          lum += 0.2126 * (data[i] / 255) + 0.7152 * (data[i + 1] / 255) + 0.0722 * (data[i + 2] / 255)
        }
        setEstSombre(lum / n < 0.55)
      } catch { setEstSombre(null) }
    }
    img.onerror = () => { if (!annule) setEstSombre(null) }
    img.src = url
    return () => { annule = true }
  }, [url])
  return estSombre
}

function BandeauTraduction({ t, estOuvert, onToggle }: {
  t: Traduction; estOuvert: boolean; onToggle: () => void
}) {
  const estSombre = useImageLuminance(t.photo ?? null)
  const meta = [t.langue, t.date_publication].filter(Boolean).join(' · ')

  const fondSombre = estSombre !== false
  const couleurTexte = t.photo ? (fondSombre ? '#f2efe8' : '#18130f') : '#1e2e24'
  const couleurMeta  = t.photo ? (fondSombre ? 'rgba(242,239,232,0.72)' : 'rgba(24,19,15,0.58)') : '#7a7268'
  const couleurChevron = t.photo ? (fondSombre ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.4)') : '#c8c0b4'

  const ombreForte = fondSombre
    ? '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.35)'
    : '0 1px 2px rgba(255,255,255,0.95), 0 2px 8px rgba(255,255,255,0.75), 0 4px 16px rgba(255,255,255,0.4)'
  const ombreTexte = t.photo ? ombreForte : 'none'

  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0', minHeight: t.photo ? '92px' : undefined,
        background: t.photo ? 'transparent' : estOuvert ? 'rgba(61,107,79,0.04)' : '#fff',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s', overflow: 'hidden',
      }}
    >
      {t.photo && (() => {
        const p = t.photo_position?.bandeau
        const px = p?.x ?? 50; const py = p?.y ?? 20; const ps = p?.scale ?? 1
        return (
          <img src={t.photo} alt="" aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: `${px}% ${py}%`, display: 'block',
            transform: `scale(${ps})`, transformOrigin: `${px}% ${py}%`,
            filter: estOuvert ? 'brightness(0.78)' : 'brightness(0.9)',
            transition: 'filter 0.2s',
          }} />
        )
      })()}

      {t.photo && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: fondSombre
            ? 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)'
            : 'linear-gradient(to right, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 55%, transparent 100%)',
          transition: 'background 0.2s',
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minWidth: 0,
        padding: t.photo ? '18px 14px 18px 20px' : '14px 18px',
      }}>
        <h2 style={{
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontSize: '17px', fontWeight: 'normal',
          color: couleurTexte, margin: 0, lineHeight: 1.25,
          textShadow: ombreTexte,
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {t.nom}
        </h2>
        {meta && (
          <span style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: '11px', fontStyle: 'italic',
            color: couleurMeta, letterSpacing: '0.02em',
            display: 'block', marginTop: '4px',
            textShadow: ombreTexte,
            transition: 'color 0.2s',
          }}>
            {meta}
          </span>
        )}
        {t.import_maj_le && (
          <span style={{
            fontSize: '10px', fontStyle: 'italic',
            color: t.photo ? (fondSombre ? 'rgba(242,239,232,0.48)' : 'rgba(24,19,15,0.38)') : '#b0a89e',
            display: 'block', marginTop: '3px',
            textShadow: t.photo ? ombreTexte : 'none',
            transition: 'color 0.2s',
          }}>
            Mis à jour le {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      <span style={{
        position: 'relative', zIndex: 1, fontSize: '10px', flexShrink: 0,
        marginRight: '18px', color: couleurChevron,
        textShadow: t.photo ? ombreTexte : 'none',
        display: 'inline-block', transition: 'transform 0.18s, color 0.2s',
        transform: estOuvert ? 'rotate(180deg)' : 'none',
      }}>▼</span>
    </button>
  )
}

function normaliserContenu(texte: string): string {
  if (!texte) return '';
  let html: string;
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)) {
    html = texte;
  } else {
    const pStyle = 'color:#2a2520;font-size:13.5px;line-height:1.78;margin:0 0 12px;text-decoration:none';
    html = texte
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p style="${pStyle}">${l}</p>`)
      .join('');
  }
  return formaterSieclesHTML(html);
}

function OngletTraductions({ hashTraduction }: { hashTraduction: string | null }) {
  const [traductions, setTraductions] = useState<Traduction[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("traductions").select("*").order("ordre", { ascending: true })
      .then(({ data }) => setTraductions(data ?? []));
  }, []);

  useEffect(() => {
    if (!hashTraduction || traductions.length === 0) return;
    setOuvert(hashTraduction);
    const el = document.getElementById(hashTraduction);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hashTraduction, traductions]);

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 24px 80px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {traductions.map((t) => {
          const estOuvert = ouvert === t.trad_id;
          return (
            <div key={t.trad_id} id={t.trad_id} style={{
              scrollMarginTop: "60px",
              border: "1px solid #ddd8cf", borderRadius: "8px",
              overflow: "hidden", background: "#fff",
            }}>
              <BandeauTraduction t={t} estOuvert={estOuvert} onToggle={() => setOuvert(prev => prev === t.trad_id ? null : t.trad_id)} />

              {estOuvert && (
                <div style={{ borderTop: "1px solid #ede9e2", display: "flex", alignItems: "stretch" }}>
                  {t.photo && (
                    <div style={{
                      width: "140px", flexShrink: 0,
                      borderRight: "1px solid #ede9e2",
                      overflow: "hidden",
                    }}>
                      <img src={t.photo} alt="" aria-hidden="true"
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${t.photo_position?.lateral?.x ?? 50}% ${t.photo_position?.lateral?.y ?? 20}%`, transform: `scale(${t.photo_position?.lateral?.scale ?? 1})`, transformOrigin: `${t.photo_position?.lateral?.x ?? 50}% ${t.photo_position?.lateral?.y ?? 20}%`, display: "block" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0, padding: "18px 20px 22px" }}>
                    {t.bio_courte && (
                      <p style={{
                        fontSize: "12.5px", color: "#5a6b5e", lineHeight: 1.65,
                        margin: "0 0 12px", fontStyle: "italic",
                        textAlign: "justify", hyphens: "auto",
                      }}>
                        {t.bio_courte}
                      </p>
                    )}
                    {t.commentaire_editorial && (
                      <div
                        className="trad-article"
                        style={{ color: "#2a2520", fontSize: "13.5px", lineHeight: 1.65, textAlign: "justify", hyphens: "auto" }}
                        dangerouslySetInnerHTML={{ __html: normaliserContenu(t.commentaire_editorial) }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Onglet « Acheter des livres »
   ════════════════════════════════════════════════════════════════════════ */

function OngletAcheter() {
  const librairies = [
    {
      nom: 'La Procure',
      description: 'Éditions contemporaines, annotées ou liturgiques — livres neufs.',
      url: 'https://www.laprocure.com/',
      logo: '/icons/librairies/procure-eventail.png',
      couleur: '#153f78',
      sep: 'rgba(22,63,125,0.32)',
    },
    {
      nom: 'Librairie Pierre Brunet',
      description: "Éditions anciennes et épuisées — livres d'occasion et anciens.",
      url: 'https://www.librairie-pierre-brunet.fr/librairie-en-ligne.html',
      logo: '/icons/librairies/pierre-brunet-livre.png',
      couleur: '#5e3a1c',
      sep: 'rgba(124,88,47,0.38)',
    },
    {
      nom: 'Sources Chrétiennes',
      description: 'La grande collection bilingue des textes patristiques, en édition critique.',
      url: 'https://sourceschretiennes.org/',
      logo: '/icons/librairies/sources-chretiennes-chrisme.png',
      couleur: '#8b1720',
      sep: 'rgba(151,30,37,0.36)',
    },
  ]
  return (
    <div style={{ maxWidth: '660px', margin: '0 auto', padding: '2px 24px 10px' }}>
      <style>{`
        .lib-row {
          display: flex;
          align-items: center;
          padding: 12px 0;
          text-decoration: none;
          border-bottom: 1px solid rgba(214,208,196,0.55);
          position: relative;
          overflow: hidden;
        }
        .lib-row:first-of-type { border-top: 1px solid rgba(214,208,196,0.55); }
        .lib-contenu {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .lib-row:hover .lib-contenu {
          opacity: 0.06;
          transform: translateX(-10px);
        }
        .lib-survol {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease;
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 15.5px;
          letter-spacing: 0.01em;
        }
        .lib-row:hover .lib-survol { opacity: 1; }
        .lib-logo-zone {
          width: 78px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lib-sep {
          width: 1px;
          height: 44px;
          flex-shrink: 0;
          margin: 0 20px;
        }
        .lib-nom {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 17px;
          font-weight: normal;
          margin: 0 0 4px;
          line-height: 1.15;
        }
        .lib-desc {
          font-size: 12px;
          color: #6a6258;
          margin: 0;
          line-height: 1.45;
        }
        .lib-fleche {
          margin-left: auto;
          padding-left: 18px;
          font-size: 18px;
          flex-shrink: 0;
          opacity: 0.82;
        }
      `}</style>
      {librairies.map(lib => (
        <a key={lib.nom} href={lib.url} target="_blank" rel="noopener noreferrer" className="lib-row">
          <div className="lib-contenu">
            <div className="lib-logo-zone">
              <img src={lib.logo} alt="" aria-hidden style={{ width: '52px', height: 'auto', objectFit: 'contain' }} />
            </div>
            <div className="lib-sep" style={{ background: lib.sep }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="lib-nom" style={{ color: lib.couleur }}>{lib.nom}</p>
              <p className="lib-desc">{lib.description}</p>
            </div>
            <span className="lib-fleche" style={{ color: lib.couleur }}>→</span>
          </div>
          <span className="lib-survol" style={{ color: lib.couleur }}>
            Visiter la librairie <span style={{ fontSize: '13px', opacity: 0.7 }}>→</span>
          </span>
        </a>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Onglet « Statistiques »
   ════════════════════════════════════════════════════════════════════════ */

const NOM_LIVRE: Record<string, string> = {
  GEN: 'Genèse', EXO: 'Exode', LEV: 'Lévitique', NUM: 'Nombres', DEU: 'Deutéronome', JOS: 'Josué', JDG: 'Juges', RUT: 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Rois', '2KI': '2 Rois', '1CH': '1 Chroniques', '2CH': '2 Chroniques',
  EZR: 'Esdras', NEH: 'Néhémie', EST: 'Esther', JOB: 'Job', PSA: 'Psaumes', PRO: 'Proverbes', ECC: 'Ecclésiaste', SNG: 'Cantique des cantiques',
  ISA: 'Isaïe', JER: 'Jérémie', LAM: 'Lamentations', EZK: 'Ézéchiel', DAN: 'Daniel', HOS: 'Osée', JOL: 'Joël', AMO: 'Amos',
  OBA: 'Abdias', JON: 'Jonas', MIC: 'Michée', NAM: 'Nahum', HAB: 'Habacuc', ZEP: 'Sophonie', HAG: 'Aggée', ZEC: 'Zacharie', MAL: 'Malachie',
  MAT: 'Matthieu', MRK: 'Marc', LUK: 'Luc', JHN: 'Jean', ACT: 'Actes', ROM: 'Romains', '1CO': '1 Corinthiens', '2CO': '2 Corinthiens',
  GAL: 'Galates', EPH: 'Éphésiens', PHP: 'Philippiens', COL: 'Colossiens', '1TH': '1 Thessaloniciens', '2TH': '2 Thessaloniciens',
  '1TI': '1 Timothée', '2TI': '2 Timothée', TIT: 'Tite', PHM: 'Philémon', HEB: 'Hébreux', JAS: 'Jacques', '1PE': '1 Pierre', '2PE': '2 Pierre',
  '1JN': '1 Jean', '2JN': '2 Jean', '3JN': '3 Jean', JUD: 'Jude', REV: 'Apocalypse',
};

type VersetPopulaire = { id_verset: string; livre: string; chapitre: number; verset: number; TR0002: string; nb_lectures: number };
type VersetCite = {
  canon_id: string; livre: string; chapitre: number; verset: number;
  score: number; nb_citations: number; nb_commentaires: number; nb_allusions: number; nb_segments: number;
  TR0002: string | null;
};

const statLigne: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: '12px', padding: '10px 14px',
  background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', textDecoration: 'none',
};
const statRang: React.CSSProperties = { fontSize: '11px', color: '#b0a89e', fontWeight: 600, width: '20px', flexShrink: 0 };
const statRef: React.CSSProperties = { fontSize: '11.5px', fontWeight: 600, color: '#2a3d30', margin: '0 0 2px' };
const statTexte: React.CSSProperties = { fontSize: '12px', color: '#5a5450', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

// En-tête d'une rubrique statistique : titre en serif + courte glose.
function EnteteStat({ titre, intro, style }: { titre: string; intro: string; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: '12px', ...style }}>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '17px', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 4px' }}>{titre}</h2>
      <p style={{ fontSize: '11.5px', color: '#9a958d', lineHeight: 1.55, margin: 0 }}>{intro}</p>
    </div>
  );
}

function OngletStatistiques() {
  const [cites, setCites] = useState<VersetCite[] | null>(null);
  const [lus, setLus] = useState<VersetPopulaire[] | null>(null);

  // Versets les plus cités et commentés par les Pères : le score est calculé en base
  // (vue versets_plus_cites) à partir des liens patristiques.
  useEffect(() => {
    supabase.from('versets_plus_cites')
      .select('canon_id, livre, chapitre, verset, score, nb_citations, nb_commentaires, nb_allusions, nb_segments, TR0002')
      .order('score', { ascending: false })
      .order('nb_commentaires', { ascending: false })
      .limit(30)
      .then(({ data }) => setCites((data as VersetCite[]) ?? []));
  }, []);

  // Versets les plus lus : ne s'affiche que si la donnée existe (le classement de lecture
  // n'est pas toujours alimenté).
  useEffect(() => {
    const charger = () => {
      supabase.from('versets_plus_lus')
        .select('id_verset, livre, chapitre, verset, TR0002, nb_lectures')
        .order('nb_lectures', { ascending: false })
        .limit(30)
        .then(({ data }) => setLus((data as VersetPopulaire[]) ?? []));
    };
    charger();
    const onVisible = () => { if (!document.hidden) charger(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const detailCite = (v: VersetCite) => {
    const parts: string[] = [];
    if (v.nb_commentaires > 0) parts.push(`${v.nb_commentaires} commentaire${v.nb_commentaires > 1 ? 's' : ''}`);
    if (v.nb_citations > 0) parts.push(`${v.nb_citations} citation${v.nb_citations > 1 ? 's' : ''}`);
    if (v.nb_allusions > 0) parts.push(`${v.nb_allusions} allusion${v.nb_allusions > 1 ? 's' : ''}`);
    return parts.join(' · ');
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 24px 80px' }}>
      <EnteteStat
        titre="Les plus cités et commentés par les Pères"
        intro="Classement établi à partir des liens patristiques : un commentaire pèse davantage qu'une citation, une citation davantage qu'une simple allusion. Le score grandira à mesure que les liens sont constitués." />
      {cites === null ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
      ) : cites.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun lien pour l'instant.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {cites.map((v, i) => (
            <Link key={v.canon_id} href={`/?livre=${v.livre}&chapitre=${v.chapitre}&trad=TR0002&verset=${v.verset}`} style={statLigne}>
              <span style={statRang}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={statRef}>{NOM_LIVRE[v.livre] ?? v.livre} {v.chapitre}, {v.verset}</p>
                {v.TR0002 && <p style={statTexte}>{v.TR0002}</p>}
                <p style={{ fontSize: '10.5px', color: '#9a8a6e', margin: '3px 0 0' }}>{detailCite(v)}</p>
              </div>
              <span title="Score patristique"
                style={{ fontSize: '13px', fontWeight: 700, color: '#3d6b4f', background: 'rgba(61,107,79,0.09)', border: '1px solid rgba(61,107,79,0.22)', borderRadius: '6px', padding: '2px 9px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {v.score}
              </span>
            </Link>
          ))}
        </div>
      )}

      {lus && lus.length > 0 && (
        <>
          <EnteteStat titre="Les plus lus" intro="D'après les consultations des versets sur le site." style={{ marginTop: '30px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lus.map((v, i) => (
              <Link key={v.id_verset} href={`/?livre=${v.livre}&chapitre=${v.chapitre}&trad=TR0002&verset=${v.verset}`} style={statLigne}>
                <span style={statRang}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={statRef}>{NOM_LIVRE[v.livre] ?? v.livre} {v.chapitre}, {v.verset}</p>
                  <p style={statTexte}>{v.TR0002}</p>
                </div>
                <span style={{ fontSize: '11px', color: '#9a958d', flexShrink: 0 }}>{v.nb_lectures} lecture{v.nb_lectures > 1 ? 's' : ''}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
