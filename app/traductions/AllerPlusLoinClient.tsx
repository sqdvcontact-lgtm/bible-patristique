'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
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
    <QuizBibliqueClient />
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
        // Échantillonner uniquement le quart supérieur gauche — là où se pose le texte
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

  // Texte clair sur fond sombre, texte sombre sur fond clair
  // estSombre=null (calcul en cours) → on suppose sombre par défaut (texte clair + scrim)
  const fondSombre = estSombre !== false
  const couleurTexte = t.photo ? (fondSombre ? '#f2efe8' : '#18130f') : '#1e2e24'
  const couleurMeta  = t.photo ? (fondSombre ? 'rgba(242,239,232,0.72)' : 'rgba(24,19,15,0.58)') : '#7a7268'
  const couleurChevron = t.photo ? (fondSombre ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.4)') : '#c8c0b4'

  // Ombres multicouches pour garantir la lisibilité dans tous les cas
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
      {/* Image plein bandeau */}
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

      {/* Scrim gauche — dégradé discret qui renforce le contraste sans alourdir l'image */}
      {t.photo && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: fondSombre
            ? 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)'
            : 'linear-gradient(to right, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 55%, transparent 100%)',
          transition: 'background 0.2s',
        }} />
      )}

      {/* Titre + méta directement sur l'image */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minWidth: 0,
        padding: t.photo ? '18px 14px 18px 20px' : '14px 18px',
      }}>
        <h2 style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: '17px', fontWeight: 'normal',
          color: couleurTexte, margin: 0, lineHeight: 1.25,
          textShadow: ombreTexte,
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {t.nom}
        </h2>
        {meta && (
          <span style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '11px', fontStyle: 'italic',
            color: couleurMeta, letterSpacing: '0.02em',
            display: 'block', marginTop: '4px',
            textShadow: ombreTexte,
            transition: 'color 0.2s',
          }}>
            {meta}
          </span>
        )}
      </div>

      {/* Chevron */}
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
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)) return texte;
  const pStyle = 'color:#2a2520;font-size:13.5px;line-height:1.78;margin:0 0 12px;text-decoration:none';
  return texte
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => `<p style="${pStyle}">${l}</p>`)
    .join('');
}

function OngletTraductions({ hashTraduction }: { hashTraduction: string | null }) {
  const [traductions, setTraductions] = useState<Traduction[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    const charger = () => {
      supabase.from("traductions").select("*").order("ordre", { ascending: true })
        .then(({ data }) => setTraductions(data ?? []));
    };
    charger();
    const onVisible = () => { if (!document.hidden) charger(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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

              {/* ── Contenu déployé ── */}
              {estOuvert && (
                <div style={{ borderTop: "1px solid #ede9e2", display: "flex", alignItems: "stretch" }}>
                  {/* Colonne image */}
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
                  {/* Texte */}
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

function IconLivreNeuf() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3d6b4f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconLivreAncien() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7a6448" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5.5C10.3 4.4 7.8 4 5 4.3v14.5c2.8-.3 5.3.1 7 1.2" />
      <path d="M12 5.5C13.7 4.4 16.2 4 19 4.3v14.5c-2.8-.3-5.3.1-7 1.2" />
      <path d="M12 5.5v15.5" />
      <path d="M5 7.3c1.8-.2 3.5 0 5 .7M5 11c1.8-.2 3.5 0 5 .7M14 8c1.5-.7 3.2-.9 5-.7M14 11.7c1.5-.7 3.2-.9 5-.7" strokeWidth="0.9" />
    </svg>
  );
}

function IconTetePere() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5a5040" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="3.3" rx="6.2" ry="1.3" stroke="#b08a30" strokeWidth="1.1" />
      <path d="M8 8.2c0-2.4 1.8-4 4-4s4 1.6 4 4v1.3c0 1-.2 1.8-.7 2.6l-.8 1.3c-.6 1-1.5 1.6-2.5 1.6s-1.9-.6-2.5-1.6l-.8-1.3c-.5-.8-.7-1.6-.7-2.6V8.2z" />
      <path d="M8.6 12.5c-1 .5-1.8 1.3-2.1 2.4l-1 4.3c-.1.6.3 1.1.9 1.1h2" />
      <path d="M15.4 12.5c1 .5 1.8 1.3 2.1 2.4l1 4.3c.1.6-.3 1.1-.9 1.1h-2" />
      <path d="M9.6 17.5c.7 1.6 1.6 2.7 2.4 2.7s1.7-1.1 2.4-2.7" />
    </svg>
  );
}

function CarteLibrairie({ icone, titre, description, url }: { icone: React.ReactNode; titre: string; description: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", alignItems: "center", gap: "18px",
      background: "#fff", border: "1px solid #ddd8cf", borderRadius: "8px",
      padding: "18px 20px", textDecoration: "none", transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.06)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
      <div style={{ flexShrink: 0, width: "40px", display: "flex", justifyContent: "center" }}>{icone}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "15px", color: "#1e2e24", margin: "0 0 4px" }}>
          {titre}
        </p>
        <p style={{ fontSize: "12px", color: "#6b7a6e", lineHeight: 1.6, margin: 0 }}>{description}</p>
      </div>
      <span style={{ fontSize: "13px", color: "#b0a89e", flexShrink: 0 }}>↗</span>
    </a>
  );
}

function OngletAcheter() {
  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 24px 80px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <CarteLibrairie
        icone={<IconLivreNeuf />}
        titre="La Procure"
        description="Éditions contemporaines, annotées ou liturgiques — livres neufs."
        url="https://www.laprocure.com/"
      />
      <CarteLibrairie
        icone={<IconLivreAncien />}
        titre="Librairie Pierre-Brunet"
        description="Éditions anciennes et épuisées — livres d'occasion et anciens."
        url="https://www.librairie-pierre-brunet.fr/librairie-en-ligne.html"
      />
      <CarteLibrairie
        icone={<IconTetePere />}
        titre="Sources Chrétiennes"
        description="La grande collection bilingue des textes patristiques, en édition critique."
        url="https://sourceschretiennes.org/"
      />
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
