"use client";

import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";

type DernierBible   = { livre: string; chapitre: number; trad: string; nomLivre: string }
type DerniereOeuvre = { id: string; titre: string; auteur: string }
type DernierePublication = { id: number; titre: string; auteur?: string | null }

function abregerTexte(texte?: string, max = 30) {
  const propre = (texte ?? '').trim()
  if (propre.length <= max) return propre
  return `${propre.slice(0, Math.max(0, max - 3)).trimEnd()}...`
}

function IconBible() {
  return <Image className="ac-icon-img ac-icon-bible" src="/icons/home-bible-book.png" width={1201} height={1310} sizes="160px" alt="" aria-hidden="true" />;
}

function IconPere() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
      {/* Robe ample */}
      <path d="M15 24Q7 27 6 38h30Q35 27 27 24" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.80)" strokeWidth="1.35" strokeLinejoin="round"/>
      {/* Barbe */}
      <path d="M16 14Q13.5 19 14.5 23Q17.5 27.5 21 27.5Q24.5 27.5 27.5 23Q28.5 19 26 14" fill="rgba(255,255,255,0.11)" stroke="rgba(255,255,255,0.78)" strokeWidth="1.35" strokeLinejoin="round"/>
      {/* Tête */}
      <circle cx="21" cy="10" r="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.85)" strokeWidth="1.35"/>
      {/* Détails barbe */}
      <path d="M18.5 18.5Q19.5 23.5 21 25.5M23.5 18.5Q22.5 23.5 21 25.5" stroke="rgba(255,255,255,0.36)" strokeWidth="0.9" strokeLinecap="round"/>
      {/* Pli de la robe */}
      <path d="M11.5 31Q21 28.5 30.5 31" stroke="rgba(255,255,255,0.38)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function IconCrayon() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <path d="M28.7 6.8 35.2 13 16.4 31.8 8.8 34l2.3-7.5L28.7 6.8Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.35" strokeLinejoin="round"/>
      <path d="m25.8 9.9 6.3 6.3M11.1 26.5l5.2 5.2" stroke="#fff" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M8.8 34 6.7 35.2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M18.2 35.2h15.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function IconPereImage() {
  return <Image className="ac-icon-img ac-icon-pere" src="/icons/home-patristique-buste.png" width={1145} height={1374} sizes="160px" alt="" aria-hidden="true" />;
}

function IconPublicationsImage() {
  return <Image className="ac-icon-img ac-icon-publications" src="/icons/home-publications-writing.png" width={1254} height={1254} sizes="160px" alt="" aria-hidden="true" />;
}

function IconDon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.7 }}>
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z"
        stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

function CarteAccueil({
  href,
  className,
  icon,
  titre,
  reprendreHref,
  reprendreLabel,
}: {
  href: string
  className: string
  icon: React.ReactNode
  titre: string
  reprendreHref?: string
  reprendreLabel?: string
}) {
  return (
    <div className={`ac-card ${className}`}>
      <Link href={href} className="ac-card-main" aria-label={titre}>
        {icon}
        <span className="ac-title">{titre}</span>
      </Link>
      <div className="ac-hover-panel">
        {reprendreHref ? (
          <Link href={reprendreHref} className="ac-hover-choice">
            <span className="ac-hover-kicker">Reprendre la lecture</span>
            <span className="ac-hover-line" title={reprendreLabel}>{abregerTexte(reprendreLabel, 31)}</span>
          </Link>
        ) : (
          <span className="ac-hover-choice ac-hover-choice--disabled">
            <span className="ac-hover-kicker">Reprendre la lecture</span>
            <span className="ac-hover-line">Aucune lecture récente</span>
          </span>
        )}
        <Link href={href} className="ac-hover-choice">
          <span className="ac-hover-kicker">Nouvelle lecture</span>
        </Link>
      </div>
    </div>
  )
}

export default function AccueilCards() {
  const [bible, setBible]   = useState<DernierBible | null>(null)
  const [oeuvre, setOeuvre] = useState<DerniereOeuvre | null>(null)
  const [publication, setPublication] = useState<DernierePublication | null>(null)

  useEffect(() => {
    try {
      const b = localStorage.getItem('cs_dernier_bible')
      const o = localStorage.getItem('cs_derniere_oeuvre')
      const p = localStorage.getItem('cs_derniere_publication')
      if (b) setBible(JSON.parse(b))
      if (o) setOeuvre(JSON.parse(o))
      if (p) setPublication(JSON.parse(p))
    } catch {}
  }, [])

  return (
    <div className="ac-root">
      <div className="ac-grid">
        <CarteAccueil
          href="/?livre=GEN&chapitre=1"
          className="ac-bible"
          icon={<IconBible />}
          titre="Bible"
          reprendreHref={bible ? `/?livre=${bible.livre}&chapitre=${bible.chapitre}&trad=${bible.trad}` : undefined}
          reprendreLabel={bible ? `${bible.nomLivre} ${bible.chapitre}` : undefined}
        />

        <CarteAccueil
          href="/bibliotheque"
          className="ac-patristique"
          icon={<IconPereImage />}
          titre="Patristique"
          reprendreHref={oeuvre ? `/oeuvre/${oeuvre.id}` : undefined}
          reprendreLabel={oeuvre ? oeuvre.titre : undefined}
        />

        <CarteAccueil
          href="/essais"
          className="ac-publications"
          icon={<IconPublicationsImage />}
          titre="Publications"
          reprendreHref={publication ? `/essais/${publication.id}` : undefined}
          reprendreLabel={publication ? publication.titre : undefined}
        />
      </div>

      <style>{`
        .ac-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          width: 100%;
        }
        .ac-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          width: 100%;
          max-width: 42.5rem;
        }
        .ac-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.8125rem;
          border-radius: 8px;
          text-decoration: none;
          min-height: 8.875rem;
          padding: 0;
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 6px 24px rgba(10,18,8,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          position: relative;
          overflow: hidden;
        }
        .ac-card-main {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-decoration: none;
          transition: opacity 0.16s ease, transform 0.18s ease;
        }
        .ac-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 45%);
          pointer-events: none;
        }
        .ac-card-main > svg,
        .ac-card-main > img,
        .ac-card-main > span { position: relative; z-index: 1; }
        .ac-icon-img {
          width: 4.75rem;
          height: 4.75rem;
          object-fit: contain;
          opacity: 0.86;
          mix-blend-mode: screen;
        }
        .ac-icon-bible {
          width: 5.375rem;
          height: 4.375rem;
        }
        .ac-icon-pere {
          width: 4.625rem;
          height: 4.625rem;
        }
        .ac-icon-publications {
          width: 5.75rem;
          height: 4.625rem;
        }
        .ac-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(20,30,16,0.34), inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .ac-card:hover .ac-card-main,
        .ac-card:focus-within .ac-card-main {
          opacity: 0.12;
          transform: scale(0.99);
        }
        /* Trois tons terreux SOBRES et coordonnés (assourdis) : vert sombre,
           bronze doux, olive — distincts mais sans éclat. */
        .ac-bible {
          background: linear-gradient(160deg, var(--cs-encre) 0%, var(--cs-encre-fonce) 100%);
        }
        .ac-patristique {
          background: linear-gradient(160deg, #52472c 0%, var(--cs-texte) 100%);
        }
        .ac-publications {
          background: linear-gradient(160deg, var(--cs-texte) 0%, var(--cs-texte-fort) 100%);
        }
        .ac-title {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 1.25rem;
          font-weight: normal;
          color: rgba(255,255,255,0.90);
          letter-spacing: 0.01em;
        }
        .ac-hover-panel {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 0;
          width: 100%;
          opacity: 0;
          transform: none;
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.18s ease;
        }
        .ac-card:hover .ac-hover-panel,
        .ac-card:focus-within .ac-hover-panel {
          opacity: 1;
          pointer-events: auto;
        }
        .ac-hover-choice {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          padding: 9px 16px;
          align-items: center;
          text-align: center;
          border-radius: 0;
          border: none;
          background: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.96);
          text-decoration: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
        }
        .ac-hover-choice:first-child {
          border-bottom: 1px solid rgba(255,255,255,0.22);
          border-radius: 8px 10px 0 0;
        }
        .ac-hover-choice:last-child {
          border-radius: 0 0 10px 10px;
        }
        .ac-hover-choice:hover,
        .ac-hover-choice:focus-visible {
          background: rgba(255,255,255,0.26);
          transform: none;
          outline: none;
        }
        .ac-hover-choice--disabled {
          color: rgba(255,255,255,0.52);
          pointer-events: none;
        }
        .ac-hover-kicker {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          line-height: 1.15;
          color: rgba(255,255,255,0.84);
          text-align: center;
        }
        .ac-hover-line {
          display: block;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          padding: 0 10px;
          box-sizing: border-box;
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.8125rem;
          font-style: italic;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
        }
        @media (max-width: 620px) {
          .ac-grid { grid-template-columns: 1fr; max-width: 320px; }
          .ac-card { min-height: 124px; }
        }
      `}</style>
    </div>
  );
}
