"use client";

import Link from "next/link";

function IconBible() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <path d="M11 6.5h17.5c2.2 0 4 1.8 4 4v25H14.2A5.2 5.2 0 0 1 9 30.3V8.5c0-1.1.9-2 2-2Z" fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.78)" strokeWidth="1.35"/>
      <path d="M14.5 6.5v29" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1"/>
      <path d="M14.5 31.5h18" stroke="rgba(255,255,255,0.5)" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M23.5 14v11.5M18.8 18.6h9.4" stroke="#fff" strokeWidth="1.45" strokeLinecap="round"/>
    </svg>
  );
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

function IconDon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.7 }}>
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z"
        stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AccueilCards() {
  return (
    <div className="ac-root">
      <div className="ac-grid">
        <Link href="/?livre=GEN&chapitre=1" className="ac-card ac-bible">
          <IconBible />
          <span className="ac-title">Bibles</span>
        </Link>

        <Link href="/bibliotheque" className="ac-card ac-patristique">
          <IconPere />
          <span className="ac-title">Patristique</span>
        </Link>

        <Link href="/essais" className="ac-card ac-publications">
          <IconCrayon />
          <span className="ac-title">Publications</span>
        </Link>
      </div>

      <Link href="/soutenir" className="ac-don">
        <IconDon />
        Soutenir le projet
      </Link>

      <style>{`
        .ac-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          width: 100%;
        }
        .ac-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
          max-width: 680px;
        }
        .ac-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 13px;
          border-radius: 10px;
          text-decoration: none;
          padding: 32px 20px;
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 6px 24px rgba(0,0,0,0.22);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          position: relative;
          overflow: hidden;
        }
        .ac-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(255,255,255,0.07) 0%, transparent 55%);
          pointer-events: none;
        }
        .ac-card > svg,
        .ac-card > span { position: relative; z-index: 1; }
        .ac-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.28);
        }
        .ac-bible {
          background: linear-gradient(155deg, #1a2e22 0%, #253d2c 100%);
        }
        .ac-patristique {
          background: linear-gradient(155deg, #2c2418 0%, #42361e 100%);
        }
        .ac-publications {
          background: linear-gradient(155deg, #1c2428 0%, #2c383e 100%);
        }
        .ac-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 20px;
          font-weight: normal;
          color: rgba(255,255,255,0.90);
          letter-spacing: 0.01em;
        }
        .ac-don {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          color: #7a8a6e;
          background: none;
          text-decoration: none;
          padding: 6px 4px;
          letter-spacing: 0.04em;
          font-family: Georgia, serif;
          font-style: italic;
          transition: color 0.15s;
          border-bottom: 1px solid transparent;
        }
        .ac-don:hover { color: #4a6040; border-bottom-color: #c8b89e; }
        @media (max-width: 620px) {
          .ac-grid { grid-template-columns: 1fr; max-width: 320px; }
          .ac-card { padding: 24px 16px; }
        }
      `}</style>
    </div>
  );
}
