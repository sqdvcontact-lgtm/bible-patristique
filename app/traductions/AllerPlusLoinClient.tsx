'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { formaterSieclesHTML } from '@/app/oeuvre/[id]/texteEnrichi'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import ProgressionClient from '../progression/ProgressionClient'
import QuizBibliqueClient from '../quiz/QuizBibliqueClient'

type Onglet = 'traductions' | 'acheter' | 'populaires' | 'progression' | 'quiz'

const ONGLETS: { code: Onglet; label: string }[] = [
  { code: 'traductions', label: 'Les traductions' },
  { code: 'acheter', label: 'Acheter des livres' },
  { code: 'populaires', label: 'Versets populaires' },
  { code: 'progression', label: 'Ma progression' },
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
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1 style={{
            fontFamily: "Georgia, serif",
            fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 'normal',
            color: '#1e2e24', lineHeight: 1.2, marginBottom: '14px',
          }}>
            Aller plus loin
          </h1>
          <div style={{ width: '36px', height: '1px', background: '#c8c0b4', margin: '0 auto 18px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', borderBottom: '1px solid #ddd8cf', marginBottom: '14px', flexWrap: 'wrap' }}>
          {ONGLETS.map(o => (
            <button key={o.code} onClick={() => setOnglet(o.code)} style={{
              padding: '10px 14px', fontSize: '12.5px', fontWeight: onglet === o.code ? 600 : 400,
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
      {onglet === 'populaires' && <OngletPopulaires />}
      {onglet === 'progression' && <ProgressionClient />}
      {onglet === 'quiz' && <OngletQuiz />}
    </main>
  )
}

function IconQuestionBiblique() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3d6b4f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 19.5A2.5 2.5 0 0 1 7 17h13" />
      <path d="M7 3h13v19H7a2.5 2.5 0 0 1-2.5-2.5v-14A2.5 2.5 0 0 1 7 3z" />
      <path d="M11 8.5a2.4 2.4 0 0 1 4.6 1c0 1.8-2.2 2-2.2 3.6" />
      <path d="M13.4 16.2h.01" />
    </svg>
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

function normaliserContenu(texte: string): string {
  if (!texte) return '';
  let html: string;
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)) {
    html = texte;
  } else {
    const pStyle = 'color:#2a2218;font-size:13.5px;line-height:1.78;margin:0 0 12px;text-decoration:none';
    html = texte
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p style="${pStyle}">${l}</p>`)
      .join('');
  }
  return formaterSieclesHTML(html);
}

function CarteTraduction({ t, estOuvert, onToggle }: {
  t: Traduction; estOuvert: boolean; onToggle: () => void
}) {
  const [imgErreur, setImgErreur] = useState(false)
  const px = t.photo_position?.lateral?.x ?? 50
  const py = t.photo_position?.lateral?.y ?? 20
  const ps = t.photo_position?.lateral?.scale ?? 1
  const meta = [t.auteur, t.langue].filter(Boolean).join(' · ')
  const datePub = formaterDateHistorique(t.date_publication)

  return (
    <div id={t.trad_id} style={{ scrollMarginTop: '60px', border: '1px solid #ddd8d0', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>

      {/* ── En-tête cliquable ── */}
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'stretch',
        background: estOuvert ? '#fdf9f2' : '#fff',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.14s', padding: 0,
      }}>

        {/* Photo latérale */}
        {t.photo && !imgErreur && (
          <div style={{ width: '90px', flexShrink: 0, position: 'relative', overflow: 'hidden', borderRight: '1px solid #ede9e0' }}>
            <img src={t.photo} alt="" aria-hidden="true" onError={() => setImgErreur(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${px}% ${py}%`, transform: `scale(${ps})`, transformOrigin: `${px}% ${py}%`, display: 'block' }} />
          </div>
        )}

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0, padding: '18px 14px 16px 20px' }}>
          <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '16.5px', fontWeight: 'normal', color: '#1e1a12', margin: '0 0 3px', lineHeight: 1.25 }}>
            {t.nom}
          </h2>
          {meta && (
            <span style={{ fontSize: '11px', color: '#8a7e70', letterSpacing: '0.02em', display: 'block', marginBottom: '2px' }}>
              {meta}
            </span>
          )}
          {datePub && (
            <span style={{ fontSize: '10.5px', fontStyle: 'italic', color: '#b0a48e', display: 'block' }}>
              {datePub}
            </span>
          )}
          {t.bio_courte && (
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12.5px', fontStyle: 'italic', color: '#5a5040', lineHeight: 1.6, margin: '10px 0 0' }}>
              {t.bio_courte}
            </p>
          )}
          {t.import_maj_le && (
            <span style={{ fontSize: '9.5px', color: '#c8bfb0', display: 'block', marginTop: '8px', letterSpacing: '0.02em' }}>
              Mis à jour le {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '18px', flexShrink: 0 }}>
          <span style={{ fontSize: '9px', color: '#c8bfb0', display: 'inline-block', transition: 'transform 0.18s', transform: estOuvert ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </button>

      {/* ── Contenu déployé ── */}
      {estOuvert && t.commentaire_editorial && (
        <div style={{ borderTop: '1px solid #ede9e0', padding: '20px 24px 24px', background: '#fdf9f2' }}>
          <div
            className="trad-article"
            style={{ color: '#2a2218', fontSize: '13.5px', lineHeight: 1.72, textAlign: 'justify', hyphens: 'auto' }}
            dangerouslySetInnerHTML={{ __html: normaliserContenu(t.commentaire_editorial) }}
          />
        </div>
      )}
    </div>
  )
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
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 24px 80px' }}>
      <style>{`
        .trad-article p { color: #2a2218; font-size: 13.5px; line-height: 1.78; margin: 0 0 12px; }
        .trad-article p:last-child { margin-bottom: 0; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {traductions.map(t => (
          <CarteTraduction
            key={t.trad_id}
            t={t}
            estOuvert={ouvert === t.trad_id}
            onToggle={() => setOuvert(prev => prev === t.trad_id ? null : t.trad_id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Onglet « Acheter des livres »
   ════════════════════════════════════════════════════════════════════════ */

type ThemeLibrairie = {
  fond: string
  bordure: string
  accent: string
  titre: string
  texte: string
  logo: string
  filigraneLogo?: string
  logoStyle?: CSSProperties
  filigraneStyle?: CSSProperties
  motif?: CSSProperties
}

const THEMES_LIBRAIRIE: Record<string, ThemeLibrairie> = {
  procure: {
    fond: 'linear-gradient(135deg, rgba(248,251,253,0.99), rgba(229,238,246,0.98))',
    bordure: 'rgba(22,63,125,0.24)',
    accent: '#b89642',
    titre: '#153f78',
    texte: '#4a6072',
    logo: '/icons/librairies/procure-eventail.png',
    filigraneLogo: '/icons/librairies/procure-rayonnage.png',
    logoStyle: { width: '76px', transform: 'translateY(2px)' },
    filigraneStyle: { width: '300px', right: '-58px', top: '-54px', opacity: 0.095, mixBlendMode: 'multiply', filter: 'grayscale(1) contrast(1.12)' },
  },
  brunet: {
    fond: 'linear-gradient(135deg, rgba(253,248,238,0.99), rgba(233,218,190,0.98))',
    bordure: 'rgba(124,88,47,0.30)',
    accent: '#8a5a2b',
    titre: '#5e3a1c',
    texte: '#665445',
    logo: '/icons/librairies/pierre-brunet-livre.png',
    filigraneLogo: '/icons/librairies/pierre-brunet-portrait.png',
    logoStyle: { width: '54px', transform: 'translateY(1px)' },
    filigraneStyle: { width: '188px', right: '-34px', top: '-54px', opacity: 0.13, mixBlendMode: 'multiply', filter: 'grayscale(1) contrast(1.18)' },
    motif: { inset: 0, opacity: 0.10, background: 'repeating-linear-gradient(0deg, transparent 0, transparent 13px, rgba(122,86,45,0.15) 14px)' },
  },
  sources: {
    fond: 'linear-gradient(135deg, rgba(255,248,247,0.99), rgba(244,225,221,0.98))',
    bordure: 'rgba(151,30,37,0.28)',
    accent: '#9a1c25',
    titre: '#8b1720',
    texte: '#664a4c',
    logo: '/icons/librairies/sources-chretiennes-chrisme.png',
    filigraneLogo: '/icons/librairies/sources-chretiennes-pere.png',
    logoStyle: { width: '66px', transform: 'translateY(1px)' },
    filigraneStyle: { width: '136px', right: '-22px', bottom: '-46px', opacity: 0.09 },
  },
}

function CarteLibrairie({ titre, description, url, theme }: { titre: string; description: string; url: string; theme: ThemeLibrairie }) {
  return (
    <a className="librairie-carte" href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", alignItems: "center", gap: "18px",
      background: theme.fond, border: `1px solid ${theme.bordure}`, borderRadius: "8px",
      padding: "17px 20px", minHeight: '88px', textDecoration: "none", transition: "box-shadow 0.15s, transform 0.15s",
      position: 'relative', overflow: 'hidden', boxShadow: '0 10px 26px rgba(74,55,32,0.075)',
    }}>
      {theme.motif && (
        <span aria-hidden style={{ position: 'absolute', pointerEvents: 'none', zIndex: 0, ...theme.motif }} />
      )}
      <img className="librairie-filigrane" src={theme.filigraneLogo ?? theme.logo} alt="" aria-hidden="true" style={theme.filigraneStyle} />
      <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: theme.accent, opacity: 0.86 }} />
      <div className="librairie-contenu" style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div className="librairie-logo-cadre">
          <img className="librairie-logo" src={theme.logo} alt="" aria-hidden="true" style={theme.logoStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "15.5px", color: theme.titre, margin: "0 0 4px" }}>
            {titre}
          </p>
          <p style={{ fontSize: "12px", color: theme.texte, lineHeight: 1.6, margin: 0 }}>{description}</p>
        </div>
      </div>
      <span className="librairie-survol" style={{ color: theme.accent }}>Visiter la librairie</span>
      <svg className="librairie-fleche" viewBox="0 0 28 28" fill="none" aria-hidden="true" style={{ color: theme.accent }}>
        <path d="M4 14H22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M15 7L22.5 14L15 21" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function OngletAcheter() {
  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 24px 80px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <CarteLibrairie
        titre="La Procure"
        description="Éditions contemporaines, annotées ou liturgiques — livres neufs."
        url="https://www.laprocure.com/"
        theme={THEMES_LIBRAIRIE.procure}
      />
      <CarteLibrairie
        titre="Librairie Pierre-Brunet"
        description="Éditions anciennes et épuisées — livres d'occasion et anciens."
        url="https://www.librairie-pierre-brunet.fr/librairie-en-ligne.html"
        theme={THEMES_LIBRAIRIE.brunet}
      />
      <CarteLibrairie
        titre="Sources Chrétiennes"
        description="La grande collection bilingue des textes patristiques, en édition critique."
        url="https://sourceschretiennes.org/"
        theme={THEMES_LIBRAIRIE.sources}
      />
      <style>{`
        .librairie-carte:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 32px rgba(74,55,32,0.12), inset 0 1px 0 rgba(255,255,255,0.78) !important;
        }
        .librairie-logo-cadre {
          position: relative;
          flex-shrink: 0;
          width: 74px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }
        .librairie-logo {
          display: block;
          height: auto;
          max-height: 82px;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(24,20,16,0.13));
          pointer-events: none;
          user-select: none;
        }
        .librairie-filigrane {
          position: absolute;
          z-index: 0;
          height: auto;
          pointer-events: none;
          user-select: none;
          filter: grayscale(1) contrast(1.08);
        }
        .librairie-contenu {
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .librairie-carte:hover .librairie-contenu {
          opacity: 0.11;
          transform: translateX(-8px);
        }
        .librairie-survol {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 2;
          transform: translate(-50%, -46%);
          opacity: 0;
          pointer-events: none;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px;
          letter-spacing: 0.01em;
          white-space: nowrap;
          transition: opacity 0.16s ease, transform 0.16s ease;
        }
        .librairie-carte:hover .librairie-survol {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
        .librairie-fleche {
          position: absolute;
          top: 50%;
          left: calc(50% + 105px);
          width: 22px;
          height: 22px;
          z-index: 2;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) translateX(-14px);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .librairie-carte:hover .librairie-fleche {
          opacity: 0.48;
          transform: translate(-50%, -50%) translateX(0);
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Onglet « Versets populaires »
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

function OngletPopulaires() {
  const [versets, setVersets] = useState<VersetPopulaire[] | null>(null);

  useEffect(() => {
    const charger = () => {
      supabase.from('versets_plus_lus')
        .select('id_verset, livre, chapitre, verset, TR0002, nb_lectures')
        .order('nb_lectures', { ascending: false })
        .limit(50)
        .then(({ data }) => setVersets((data as VersetPopulaire[]) ?? []));
    };
    charger();
    const onVisible = () => { if (!document.hidden) charger(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "24px 24px 80px" }}>
      {versets === null ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
      ) : versets.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>
          Aucune donnée pour l'instant.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {versets.map((v, i) => (
            <Link key={v.id_verset} href={`/?livre=${v.livre}&chapitre=${v.chapitre}&trad=TR0002&verset=${v.verset}`}
              style={{
                display: 'flex', alignItems: 'baseline', gap: '12px', padding: '10px 14px',
                background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', textDecoration: 'none',
              }}>
              <span style={{ fontSize: '11px', color: '#b0a89e', fontWeight: 600, width: '20px', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#2a3d30', margin: '0 0 2px' }}>
                  {NOM_LIVRE[v.livre] ?? v.livre} {v.chapitre}, {v.verset}
                </p>
                <p style={{ fontSize: '12px', color: '#5a5450', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.TR0002}
                </p>
              </div>
              <span style={{ fontSize: '11px', color: '#9a958d', flexShrink: 0 }}>{v.nb_lectures} lecture{v.nb_lectures > 1 ? 's' : ''}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
