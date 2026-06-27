"use client";

import Link from "next/link";

function IconBible() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="24" height="30" rx="2.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" fill="none"/>
      <rect x="5" y="3" width="4.5" height="30" rx="1.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
      <line x1="18" y1="22" x2="18" y2="30" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="13.5" y1="25.5" x2="22.5" y2="25.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Icône stylo ───────────────────────────────────────────────────────────── */
function IconStylo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Corps du stylo */}
      <path
        d="M20 4 L28 12 L10 30 L2 30 L2 22 Z"
        stroke="#7a6448" strokeWidth="1.2" fill="none"
        strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Ligne de séparation bord de la plume */}
      <line x1="17" y1="7" x2="25" y2="15"
        stroke="#9a8a7a" strokeWidth="0.9" strokeLinecap="round"/>
      {/* Pointe */}
      <path d="M2 22 L10 30" stroke="#7a6448" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Petit trait de plume */}
      <line x1="6" y1="26" x2="4" y2="28"
        stroke="#b0a090" strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconPublications() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <rect x="8" y="5" width="18" height="24" rx="2" stroke="#3d6b4f" strokeWidth="1.2" fill="none"/>
      <line x1="12" y1="12" x2="22" y2="12" stroke="#6f8a77" strokeWidth="1" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="22" y2="17" stroke="#6f8a77" strokeWidth="1" strokeLinecap="round"/>
      <line x1="12" y1="22" x2="19" y2="22" stroke="#6f8a77" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function IconDon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z"
        stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AccueilCards() {
  return (
    <div className="ac-root">

      <div className="ac-grid">

        {/* Carte Bible */}
        <Link href="/?livre=GEN&chapitre=1" className="ac-card ac-bible">
          <IconBible />
          <span className="ac-title">Bibles</span>
        </Link>

        {/* Carte Patristique */}
        <Link href="/bibliotheque" className="ac-card ac-patristique">
          <IconStylo />
          <span className="ac-title">Patristique</span>
        </Link>

        {/* Carte Publications */}
        <Link href="/essais" className="ac-card ac-publications">
          <IconPublications />
          <span className="ac-title">Publications</span>
        </Link>

      </div>

      {/* Lien don discret */}
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
          gap: 14px;
          border-radius: 12px;
          text-decoration: none;
          padding: 32px 20px;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        .ac-card:hover { transform: translateY(-3px); }
        .ac-bible {
          background: #3d6b4f;
          border: 1px solid #2e5440;
        }
        .ac-bible:hover { box-shadow: 0 10px 32px rgba(61,107,79,0.28); }
        .ac-patristique {
          background: #faf8f4;
          border: 1px solid #d6d0c6;
        }
        .ac-patristique:hover { box-shadow: 0 10px 32px rgba(61,107,79,0.10); }
        .ac-publications {
          background: #fff;
          border: 1px solid #d6d0c6;
        }
        .ac-publications:hover { box-shadow: 0 10px 32px rgba(61,107,79,0.12); }
        .ac-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 20px;
          font-weight: normal;
          letter-spacing: 0.01em;
        }
        .ac-bible .ac-title { color: #fff; }
        .ac-patristique .ac-title,
        .ac-publications .ac-title { color: #2a3d30; }
        .ac-don {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: #3d6b4f;
          text-decoration: none;
          padding: 9px 20px;
          border-radius: 18px;
          letter-spacing: 0.01em;
          box-shadow: 0 2px 8px rgba(61,107,79,0.25);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .ac-don:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(61,107,79,0.32); }
        @media (max-width: 620px) {
          .ac-grid { grid-template-columns: 1fr; max-width: 320px; }
          .ac-card { padding: 24px 16px; }
        }
      `}</style>
    </div>
  );
}
