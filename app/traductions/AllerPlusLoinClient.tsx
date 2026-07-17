'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import DOMPurify from 'dompurify'
import { supabase } from '@/app/lib/supabase'
import { formaterSieclesHTML } from '@/app/oeuvre/[id]/texteEnrichi'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import QuizBibliqueClient from '../quiz/QuizBibliqueClient'

type Onglet = 'traductions' | 'acheter' | 'populaires' | 'quiz'

const ONGLETS: { code: Onglet; label: string }[] = [
  { code: 'traductions', label: 'Les traductions' },
  { code: 'acheter', label: 'Acheter des livres' },
  { code: 'populaires', label: 'Versets populaires' },
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

function AvatarTraduction({ t }: { t: Traduction }) {
  const px = t.photo_position?.lateral?.x ?? 50
  const py = t.photo_position?.lateral?.y ?? 20
  const ps = t.photo_position?.lateral?.scale ?? 1
  if (!t.photo) return (
    <div style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, background: '#f0ece4', border: '2px solid #e0d8cc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8b888" strokeWidth="1.4" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  )
  return (
    <div style={{ width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '2px solid #e0d8cc' }}>
      <img src={t.photo} alt="" aria-hidden="true"
        style={{ width: '100%', height: '100%', objectFit: 'cover',
          objectPosition: `${px}% ${py}%`,
          transform: `scale(${ps})`,
          transformOrigin: `${px}% ${py}%`,
          display: 'block' }} />
    </div>
  )
}

function normaliserContenu(texte: string): string {
  if (!texte || typeof window === 'undefined') return '';
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
  return DOMPurify.sanitize(formaterSieclesHTML(html));
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
        .trad-article p { color: #2a2520; font-size: 13px; line-height: 1.75; margin: 0 0 10px; }
        .trad-article p:last-child { margin-bottom: 0; }
        .trad-entete { width: 100%; display: flex; align-items: center; gap: 14px; padding: 13px 16px; background: transparent; border: none; cursor: pointer; text-align: left; transition: background 0.12s; }
        .trad-entete:hover { background: rgba(138,112,72,0.05); }
        .trad-entete-ouvert { background: rgba(138,112,72,0.07); }
        .trad-corps { display: flex; align-items: stretch; border-top: 1px solid #e8e2d8; }
        .trad-photo-lat { width: 110px; flex-shrink: 0; border-right: 1px solid #e8e2d8; overflow: hidden; }
        .trad-photo-lat img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .trad-texte { flex: 1; min-width: 0; padding: 15px 18px 18px; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {traductions.map(t => {
          const estOuvert = ouvert === t.trad_id;
          const meta = [t.langue, t.date_publication].filter(Boolean).join(' · ');
          const px = t.photo_position?.lateral?.x ?? 50;
          const py = t.photo_position?.lateral?.y ?? 20;
          const ps = t.photo_position?.lateral?.scale ?? 1;
          return (
            <div key={t.trad_id} id={t.trad_id}
              style={{ scrollMarginTop: '60px', border: '1px solid #ddd8ce', borderRadius: '9px', overflow: 'hidden', background: '#fff', boxShadow: estOuvert ? '0 2px 14px rgba(0,0,0,0.07)' : 'none', transition: 'box-shadow 0.18s' }}>
              {/* En-tête repliable */}
              <button
                className={`trad-entete${estOuvert ? ' trad-entete-ouvert' : ''}`}
                onClick={() => setOuvert(prev => prev === t.trad_id ? null : t.trad_id)}>
                <AvatarTraduction t={t} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '15px', fontWeight: 'normal', color: '#1e1a16', margin: 0, lineHeight: 1.2 }}>
                      {t.auteur ?? t.nom}
                    </h2>
                    {t.dates && (
                      <span style={{ fontSize: '11px', color: '#9a8a6a', fontStyle: 'italic', flexShrink: 0 }}>{t.dates}</span>
                    )}
                  </div>
                  <span style={{ display: 'block', fontSize: '12px', color: '#8a7248', fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic', marginTop: '3px', lineHeight: 1.3 }}>
                    {t.nom}{meta ? <span style={{ color: '#b0a080', fontStyle: 'normal', fontSize: '11px' }}> — {meta}</span> : null}
                  </span>
                </div>
                {/* Flèche SVG */}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
                  style={{ flexShrink: 0, color: '#c0b098', transition: 'transform 0.18s', transform: estOuvert ? 'rotate(180deg)' : 'none' }}>
                  <path d="M2.5 4.5L6.5 8.5L10.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Corps déployé */}
              {estOuvert && (
                <div className="trad-corps">
                  {t.photo && (
                    <div className="trad-photo-lat">
                      <img src={t.photo} alt="" aria-hidden="true"
                        style={{ objectPosition: `${px}% ${py}%`, transform: `scale(${ps})`, transformOrigin: `${px}% ${py}%` }} />
                    </div>
                  )}
                  <div className="trad-texte">
                    {t.bio_courte && (
                      <p style={{ fontSize: '12.5px', color: '#5a5045', lineHeight: 1.65, margin: '0 0 10px', fontStyle: 'italic', textAlign: 'justify', hyphens: 'auto' }}>
                        {t.bio_courte}
                      </p>
                    )}
                    {t.commentaire_editorial && (
                      <div className="trad-article"
                        style={{ color: '#2a2520', textAlign: 'justify', hyphens: 'auto' }}
                        dangerouslySetInnerHTML={{ __html: normaliserContenu(t.commentaire_editorial) }}
                      />
                    )}
                    {t.import_maj_le && (
                      <p style={{ fontSize: '10px', color: '#b8b0a4', margin: '10px 0 0', fontStyle: 'italic' }}>
                        Mis à jour le {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
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

type ThemeLibrairie = {
  fond: string
  bordure: string
  accent: string
  titre: string
  texte: string
  logo: string
  filigraneLogo?: string
  logoStyle?: CSSProperties
}

// Filigrane : même traitement graphique pour les trois cartes.
// height fixe 120px (> hauteur carte ~100px) pour couverture uniforme,
// calé en haut-droite avec léger débordement.
const FIL_COMMUN: CSSProperties = {
  position: 'absolute', zIndex: 0, height: '120px', width: 'auto',
  right: '-16px', top: '-10px',
  opacity: 0.09, filter: 'grayscale(1) contrast(1.1)',
  mixBlendMode: 'multiply', pointerEvents: 'none', userSelect: 'none',
}

const THEMES_LIBRAIRIE: Record<string, ThemeLibrairie> = {
  procure: {
    fond: 'rgba(234,242,250,0.52)',
    bordure: 'rgba(22,63,125,0.18)',
    accent: '#1a4a8a',
    titre: '#153f78',
    texte: '#4a6072',
    logo: '/icons/librairies/procure-eventail.png',
    filigraneLogo: '/icons/librairies/procure-rayonnage.png',
    logoStyle: { height: '54px', width: 'auto' },
  },
  brunet: {
    fond: 'rgba(246,237,222,0.55)',
    bordure: 'rgba(124,88,47,0.20)',
    accent: '#7a4820',
    titre: '#5e3a1c',
    texte: '#665445',
    logo: '/icons/librairies/pierre-brunet-livre.png',
    filigraneLogo: '/icons/librairies/pierre-brunet-portrait.png',
    logoStyle: { height: '62px', width: 'auto' },
  },
  sources: {
    fond: 'rgba(252,232,230,0.52)',
    bordure: 'rgba(151,30,37,0.18)',
    accent: '#9a1c25',
    titre: '#8b1720',
    texte: '#664a4c',
    logo: '/icons/librairies/sources-chretiennes-chrisme.png',
    filigraneLogo: '/icons/librairies/sources-chretiennes-pere.png',
    logoStyle: { height: '56px', width: 'auto' },
  },
}

function CarteLibrairie({ titre, description, url, theme }: { titre: string; description: string; url: string; theme: ThemeLibrairie }) {
  return (
    <a className="lib-carte" href={url} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: '20px',
      background: theme.fond,
      border: `1px solid ${theme.bordure}`,
      borderRadius: '7px',
      padding: '18px 22px 18px 18px',
      textDecoration: 'none',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.055)',
    }}>
      {/* Filet coloré gauche */}
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: theme.accent }} />
      {/* Filigrane — traitement uniforme */}
      {theme.filigraneLogo && (
        <img src={theme.filigraneLogo} alt="" aria-hidden="true" style={FIL_COMMUN} />
      )}
      {/* Contenu — s'efface légèrement au survol */}
      <div className="lib-contenu" style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ width: '72px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={theme.logo} alt="" aria-hidden="true"
            style={{ maxWidth: '72px', maxHeight: '66px', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.13))', pointerEvents: 'none', ...(theme.logoStyle ?? {}) }} />
        </div>
        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '15.5px', fontWeight: 'normal', color: theme.titre, margin: '0 0 5px', lineHeight: 1.2 }}>
            {titre}
          </p>
          <p style={{ fontSize: '12px', color: theme.texte, margin: 0, lineHeight: 1.65 }}>
            {description}
          </p>
        </div>
      </div>
      {/* Overlay survol */}
      <div className="lib-survol" style={{ color: theme.accent }}>
        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', letterSpacing: '0.01em' }}>
          Visiter la librairie en ligne
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M4 10H16M11.5 5.5L16 10L11.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </a>
  )
}

function OngletAcheter() {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <style>{`
        .lib-carte { transition: box-shadow 0.18s, transform 0.18s; }
        .lib-carte:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.12) !important; }
        .lib-contenu { transition: opacity 0.20s ease; }
        .lib-carte:hover .lib-contenu { opacity: 0.12; }
        .lib-survol {
          position: absolute; inset: 0; z-index: 2;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          opacity: 0; pointer-events: none;
          transition: opacity 0.20s ease;
        }
        .lib-carte:hover .lib-survol { opacity: 1; }
      `}</style>
      <CarteLibrairie
        titre="La Procure"
        description="Éditions contemporaines, annotées ou liturgiques — livres neufs."
        url="https://www.laprocure.com/"
        theme={THEMES_LIBRAIRIE.procure}
      />
      <CarteLibrairie
        titre="Librairie Pierre Brunet"
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
    </div>
  )
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
