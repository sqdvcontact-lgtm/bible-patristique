import VotesClient from './VotesClient'

export const metadata = {
  title: "Soutenir le projet — Corpus Scriptura",
  description: "Lectures bibliques et patristiques.",
};

const LIEN_PAYPAL = "https://www.paypal.com/donate/?hosted_button_id=9M463NPH2RQXL";

// Chaque entrée : [texte, largeur max] — triangle pointe en bas
const COLOPHON: [string, string][] = [
  ["Ce site est un projet bénévole, sans publicité,",        "400px"],
  ["ouvert à tous, sans abonnement ni registre.",            "360px"],
  ["Si vous souhaitez contribuer à son développement",       "330px"],
  ["— enrichissement de la bibliothèque,",                   "280px"],
  ["maintenance, hébergement —,",                            "220px"],
  ["vous pouvez nous soutenir.",                             "185px"],
  ["Chaque geste compte.",                                   "148px"],
]

export default function SoutenirPage() {
  return (
    <>
      {/* ── Hero — pleine hauteur ── */}
      <section style={{
        minHeight: "calc(100vh - 48px)",
        background: "#f7f3eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px 72px",
        textAlign: "center",
        position: "relative",
      }}>

        {/* Cœur */}
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none"
          style={{ marginBottom: "18px" }} aria-hidden="true">
          <path d="M20 34S4 23 4 13a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 10-16 21-16 21z"
            stroke="#3d6b4f" strokeWidth="1.5" fill="rgba(61,107,79,0.07)" strokeLinejoin="round" />
        </svg>

        {/* Titre */}
        <h1 style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(20px, 2.8vw, 27px)",
          fontWeight: "normal",
          color: "#1e2e24",
          marginBottom: "8px",
          letterSpacing: "0.02em",
        }}>
          Soutenir le projet
        </h1>

        {/* Filet ornemental */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", maxWidth: "140px", margin: "0 auto 22px" }}>
          <div style={{ flex: 1, height: "1px", background: "#d6cfc4" }} />
          <span style={{ fontSize: "8px", color: "#b0a088", letterSpacing: "0.2em" }}>· · ·</span>
          <div style={{ flex: 1, height: "1px", background: "#d6cfc4" }} />
        </div>

        {/* Colophon pyramide */}
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "14px",
          fontStyle: "italic",
          color: "#4a5e50",
          lineHeight: 1.55,
          textAlign: "center",
          marginBottom: "28px",
        }}>
          {COLOPHON.map(([line, width], i) => (
            <p key={i} style={{ maxWidth: width, margin: "0 auto" }}>{line}</p>
          ))}
        </div>

        {/* Bouton sticky */}
        <div style={{ position: "sticky", top: "60px", zIndex: 10 }}>
          <a href={LIEN_PAYPAL} target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              background: "#3d6b4f", color: "#fff", textDecoration: "none",
              fontFamily: "Georgia, serif",
              fontSize: "13.5px", fontWeight: 500, padding: "11px 28px",
              borderRadius: "6px",
              boxShadow: "0 3px 12px rgba(61,107,79,0.22)",
              letterSpacing: "0.01em",
            }}>
            <PaypalIcon />
            Faire un don via PayPal
          </a>
        </div>

        <p style={{
          fontSize: "10.5px",
          color: "#a09488",
          marginTop: "10px",
          fontStyle: "italic",
        }}>
          Vous serez redirigé vers le site sécurisé de PayPal.
        </p>

        {/* Indicateur de défilement */}
        <a href="#votes" style={{
          position: "absolute",
          bottom: "20px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
          color: "#b0a088", textDecoration: "none",
          fontSize: "9.5px", letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          <span>Pistes de financement</span>
          <svg width="11" height="7" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1l5 5 5-5" stroke="#b0a088" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </section>

      {/* ── Section votes ── */}
      <div id="votes" style={{ background: "#f4f0e4", borderTop: "1px solid #ddd4c0", scrollMarginTop: "48px" }}>
        <VotesClient />
      </div>
    </>
  )
}

function PaypalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M4 13.5L5.3 3.8h4.6c2.1 0 3.4 1.1 3.1 3.1-.3 2.3-1.9 3.5-4 3.5H6.7l-.6 3.1H4z"
        fill="#fff" opacity="0.9" />
    </svg>
  )
}
