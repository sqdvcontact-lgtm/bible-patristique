"use client";

import Link from "next/link";

export default function AccueilCards() {
  return (
    <>
      <div className="accueil-grid">
        <Link href="/?livre=GEN&chapitre=1" className="accueil-card accueil-card--bible">
          <span className="accueil-card-ornament">✦</span>
          <h2 className="accueil-card-title">Bible</h2>
          <p className="accueil-card-body">
            Parcourez les Écritures en plusieurs traductions — Sacy, Segond,
            Crampon, Vulgate.
          </p>
          <span className="accueil-card-cta">Ouvrir la Bible →</span>
        </Link>

        <Link href="/bibliotheque" className="accueil-card accueil-card--tradition">
          <span className="accueil-card-ornament">✦</span>
          <h2 className="accueil-card-title">Tradition</h2>
          <p className="accueil-card-body">
            Accédez aux œuvres des Pères de l'Église, en regard des versets
            qu'elles commentent.
          </p>
          <span className="accueil-card-cta">Ouvrir la bibliothèque →</span>
        </Link>
      </div>

      <style>{`
        .accueil-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          max-width: 680px;
          width: 100%;
        }
        .accueil-card {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          text-decoration: none;
          padding: 34px 30px 26px;
          transition: transform 0.17s ease, box-shadow 0.17s ease;
        }
        .accueil-card:hover {
          transform: translateY(-3px);
        }
        .accueil-card--bible {
          background: #3d6b4f;
          border: 1px solid #2e5440;
        }
        .accueil-card--bible:hover {
          box-shadow: 0 10px 36px rgba(61,107,79,0.22);
        }
        .accueil-card--tradition {
          background: #fff;
          border: 1px solid #d0cbc2;
        }
        .accueil-card--tradition:hover {
          box-shadow: 0 10px 36px rgba(61,107,79,0.13);
        }
        .accueil-card-ornament {
          font-size: 20px;
          margin-bottom: 16px;
          display: block;
        }
        .accueil-card--bible .accueil-card-ornament  { color: rgba(255,255,255,0.22); }
        .accueil-card--tradition .accueil-card-ornament { color: rgba(61,107,79,0.18); }
        .accueil-card-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 21px;
          font-weight: normal;
          margin: 0 0 10px;
        }
        .accueil-card--bible .accueil-card-title     { color: #fff; }
        .accueil-card--tradition .accueil-card-title { color: #2a3d30; }
        .accueil-card-body {
          font-size: 13px;
          line-height: 1.65;
          flex: 1;
          margin: 0 0 22px;
        }
        .accueil-card--bible .accueil-card-body      { color: rgba(255,255,255,0.72); }
        .accueil-card--tradition .accueil-card-body  { color: #5a6b5e; }
        .accueil-card-cta {
          display: block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding-top: 14px;
        }
        .accueil-card--bible .accueil-card-cta {
          color: rgba(255,255,255,0.88);
          border-top: 1px solid rgba(255,255,255,0.15);
        }
        .accueil-card--tradition .accueil-card-cta {
          color: #3d6b4f;
          border-top: 1px solid #e0dbd4;
        }
      `}</style>
    </>
  );
}