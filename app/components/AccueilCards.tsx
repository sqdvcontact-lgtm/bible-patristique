"use client";

import Link from "next/link";

/* ─── Icône livre — épuré ───────────────────────────────────────────────────── */
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

/* ─── Icône tradition — épuré ───────────────────────────────────────────────── */
function IconTradition() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      {/* Auréole simple */}
      <circle cx="18" cy="11" r="7.5" stroke="#3d6b4f" strokeWidth="1" fill="none"/>
      {/* Tête */}
      <circle cx="18" cy="11" r="4" stroke="#7a6448" strokeWidth="1" fill="none"/>
      {/* Corps */}
      <path d="M8 33 Q9.5 22 18 20 Q26.5 22 28 33" stroke="#9a8a7a" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Icône don ─────────────────────────────────────────────────────────────── */
function IconDon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="round"/>
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

        {/* Carte Tradition */}
        <Link href="/bibliotheque" className="ac-card ac-tradition">
          <IconTradition />
          <span className="ac-title">Tradition</span>
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
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
          max-width: 480px;
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

        .ac-tradition {
          background: #faf8f4;
          border: 1px solid #d6d0c6;
        }
        .ac-tradition:hover { box-shadow: 0 10px 32px rgba(61,107,79,0.10); }

        .ac-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 20px;
          font-weight: normal;
          letter-spacing: 0.01em;
        }
        .ac-bible .ac-title { color: #fff; }
        .ac-tradition .ac-title { color: #2a3d30; }

        .ac-don {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #8a9e8e;
          text-decoration: none;
          border-bottom: 1px dotted #b8c8bc;
          padding-bottom: 1px;
          transition: color 0.14s;
          letter-spacing: 0.02em;
        }
        .ac-don:hover { color: #3d6b4f; border-bottom-color: #3d6b4f; border-bottom-style: solid; }

        @media (max-width: 480px) {
          .ac-grid { grid-template-columns: 1fr 1fr; max-width: 320px; }
          .ac-card { padding: 24px 16px; }
        }
      `}</style>
    </div>
  );
}