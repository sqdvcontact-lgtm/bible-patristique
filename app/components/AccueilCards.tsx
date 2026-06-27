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
      <path d="M21 5.8c-4.1 0-7.3 3.2-7.3 7.2 0 2.6 1.2 5.4 3.1 7.2l.6 3.2h7.2l.6-3.2c1.9-1.8 3.1-4.6 3.1-7.2 0-4-3.2-7.2-7.3-7.2Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.78)" strokeWidth="1.35" strokeLinejoin="round"/>
      <path d="M15.4 17.2c1.4.9 3.3 1.4 5.6 1.4s4.2-.5 5.6-1.4" stroke="rgba(255,255,255,0.62)" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M17.4 13.8c.8-.5 1.5-.7 2.1-.7M22.5 13.1c.7 0 1.4.2 2.1.7" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M19.2 23.4 16 35.5h10l-3.2-12.1M16 27.8c-3.2 1.5-5.3 4.1-5.9 7.7h21.8c-.6-3.6-2.7-6.2-5.9-7.7" stroke="rgba(255,255,255,0.78)" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round"/>
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
          border-radius: 12px;
          text-decoration: none;
          padding: 32px 20px;
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 30px rgba(31,76,52,0.13);
          transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
          position: relative;
          overflow: hidden;
        }
        .ac-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(145deg, rgba(255,255,255,0.20), transparent 42%, rgba(20,57,38,0.16));
          pointer-events: none;
        }
        .ac-card > svg,
        .ac-card > span { position: relative; z-index: 1; }
        .ac-card:hover {
          transform: translateY(-3px);
          filter: saturate(1.04);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 16px 38px rgba(31,76,52,0.20);
        }
        .ac-bible {
          background: linear-gradient(142deg, #244a35 0%, #3d6b4f 48%, #6f9778 100%);
        }
        .ac-patristique {
          background: linear-gradient(142deg, #315a42 0%, #557d5f 52%, #91ad86 100%);
        }
        .ac-publications {
          background: linear-gradient(142deg, #2e6044 0%, #4f8a62 52%, #a2ba8d 100%);
        }
        .ac-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 20px;
          font-weight: normal;
          color: #fff;
          text-shadow: 0 1px 8px rgba(20,57,38,0.28);
        }
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
