export const metadata = {
  title: "Soutenir le projet — Corpus Scriptura",
  description: "Lectures bibliques et patristiques.",
};

const LIEN_PAYPAL = "https://www.paypal.com/donate/?hosted_button_id=9M463NPH2RQXL";

// Colophon en pyramide (pointe en bas) : chaque entrée [texte, largeur max].
const COLOPHON: [string, string][] = [
  ["Ce site est un projet bénévole, sans publicité,",        "410px"],
  ["ouvert à tous, sans abonnement ni registre.",            "365px"],
  ["Si vous souhaitez contribuer à son développement",       "335px"],
  ["(enrichissement de la bibliothèque,",                    "285px"],
  ["maintenance, hébergement),",                             "225px"],
  ["vous pouvez nous soutenir.",                             "190px"],
  ["Chaque geste compte.",                                   "150px"],
];

export default function SoutenirPage() {
  return (
    // Hauteur fixée à l'écran (moins la navbar) + overflow caché : TOUT tient sur une page,
    // aucun défilement. Les tailles clés dépendent de la hauteur de la fenêtre (vh) pour
    // rester dans le cadre même sur un écran court.
    <section style={{
      height: "calc(100dvh - 3.5rem)",
      overflow: "hidden",
      background: "#f7f3eb",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px 24px",
      textAlign: "center",
    }}>

      {/* Le semeur : une main qui confie un grain au sillon — l'image du don qui germe.
          `multiply` fond le blanc du dessin dans le papier ; l'invite se pose au ras du
          sillon (marge négative). Taille bornée par la hauteur de fenêtre. */}
      <img src="/ornements/semeur.png" alt="" aria-hidden="true"
        style={{ width: "clamp(150px, 26vh, 240px)", height: "auto", opacity: 0.92, mixBlendMode: "multiply", marginBottom: "-10px", flexShrink: 0 }} />

      {/* Titre */}
      <h1 style={{
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: "clamp(19px, 2.6vw, 26px)",
        fontWeight: "normal",
        color: "#1e2e24",
        margin: "0 0 8px",
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}>
        Soutenir le projet
      </h1>

      {/* Filet ornemental */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "9.375rem", margin: "0 auto 16px", flexShrink: 0 }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #cfc6b6)" }} />
        <span style={{ fontSize: "0.5rem", color: "#b0a088", letterSpacing: "0.22em" }}>· · ·</span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #cfc6b6)" }} />
      </div>

      {/* Colophon pyramide */}
      <div style={{
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: "clamp(12px, 1.5vh, 14px)",
        fontStyle: "italic",
        color: "#4a5e50",
        lineHeight: 1.5,
        textAlign: "center",
        marginBottom: "22px",
        flexShrink: 0,
      }}>
        {COLOPHON.map(([line, width], i) => (
          <p key={i} style={{ maxWidth: width, margin: "0 auto" }}>{line}</p>
        ))}
      </div>

      {/* Bouton PayPal */}
      <a href={LIEN_PAYPAL} target="_blank" rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          background: "#3d6b4f", color: "#fff", textDecoration: "none",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontSize: "0.84375rem", fontWeight: 500, padding: "10px 26px",
          borderRadius: "6px",
          boxShadow: "0 3px 12px rgba(61,107,79,0.22)",
          letterSpacing: "0.01em",
          flexShrink: 0,
        }}>
        <PaypalIcon />
        Faire un don via PayPal
      </a>

      <p style={{
        fontSize: "0.65625rem",
        color: "#a09488",
        marginTop: "10px",
        fontStyle: "italic",
        flexShrink: 0,
      }}>
        Vous serez redirigé vers le site sécurisé de PayPal.
      </p>

    </section>
  );
}

function PaypalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M4 13.5L5.3 3.8h4.6c2.1 0 3.4 1.1 3.1 3.1-.3 2.3-1.9 3.5-4 3.5H6.7l-.6 3.1H4z"
        fill="#fff" opacity="0.9" />
    </svg>
  );
}
