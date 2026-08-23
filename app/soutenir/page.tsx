export const metadata = {
  title: "Soutenir le projet",
  description: "Lectures bibliques et patristiques.",
};

const LIEN_PAYPAL = "https://www.paypal.com/donate/?hosted_button_id=9M463NPH2RQXL";

// Colophon en pyramide (pointe en bas) : chaque entrée [texte, largeur max].
// Largeurs en EM (relatives à la taille de police du colophon) : elles suivent donc
// EXACTEMENT le texte quand il grandit (police fluide vw/rem), si bien que chaque ligne
// reste d'un seul tenant et que la pyramide garde ses proportions à toutes les tailles.
const COLOPHON: [string, string][] = [
  ["Ce site est un projet bénévole, sans publicité,",        "29.29em"],
  ["ouvert à tous, sans abonnement ni registre.",            "26.07em"],
  ["Si vous souhaitez contribuer à son développement",       "23.93em"],
  ["(enrichissement de la bibliothèque,",                    "20.36em"],
  ["maintenance, hébergement),",                             "16.07em"],
  ["vous pouvez nous soutenir.",                             "13.57em"],
  ["Chaque geste compte.",                                   "10.71em"],
];

export default function SoutenirPage() {
  return (
    // La composition reste centrée et tient sur une page, mais ses tailles suivent
    // désormais la police racine fluide (rem) ET la taille de la fenêtre (vw/vh) : elle
    // grandit franchement sur grand écran et reste contenue sur petit écran. `minHeight`
    // (plutôt qu'une hauteur figée) + `overflow: visible` laissent le contenu déborder en
    // défilement plutôt que d'être rogné sur les écrans très courts.
    <section style={{
      minHeight: "calc(100dvh - 3.5rem)",
      boxSizing: "border-box",
      background: "var(--cs-fond)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(24px, 4vh, 72px) clamp(20px, 4vw, 48px)",
      textAlign: "center",
    }}>

      {/* Le semeur : une main qui confie un grain au sillon — l'image du don qui germe.
          `multiply` fond le blanc du dessin dans le papier ; l'invite se pose au ras du
          sillon (marge négative). Taille fluide, plus généreuse sur grand écran. */}
      <img src="/ornements/semeur.png" alt="" aria-hidden="true"
        style={{ width: "clamp(150px, 8vw + 8vh, 250px)", height: "auto", opacity: 0.92, mixBlendMode: "multiply", marginBottom: "clamp(-14px, -1vh, -8px)", flexShrink: 0 }} />

      {/* Titre */}
      <h1 style={{
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: "clamp(1.4rem, 0.95rem + 0.85vw, 1.95rem)",
        fontWeight: "normal",
        color: "var(--cs-encre-fonce)",
        margin: "0 0 clamp(8px, 1.2vh, 14px)",
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}>
        Soutenir le projet
      </h1>

      {/* Filet ornemental */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.7em", width: "clamp(9.375rem, 12vw, 13rem)", margin: "0 auto clamp(16px, 2.4vh, 30px)", flexShrink: 0 }}>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #cfc6b6)" }} />
        <span style={{ fontSize: "clamp(0.5rem, 0.4rem + 0.3vw, 0.75rem)", color: "#b0a088", letterSpacing: "0.22em" }}>· · ·</span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #cfc6b6)" }} />
      </div>

      {/* Colophon pyramide */}
      <div style={{
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: "clamp(0.85rem, 0.6rem + 0.35vw, 1.08rem)",
        fontStyle: "italic",
        color: "#4a5e50",
        lineHeight: 1.55,
        textAlign: "center",
        marginBottom: "clamp(22px, 3.4vh, 44px)",
        flexShrink: 0,
      }}>
        {COLOPHON.map(([line, width], i) => (
          <p key={i} style={{ maxWidth: width, margin: "0 auto" }}>{line}</p>
        ))}
      </div>

      {/* Bouton PayPal */}
      <a href={LIEN_PAYPAL} target="_blank" rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.6em",
          background: "var(--cs-vert-aplat)", color: "var(--cs-sur-aplat)", textDecoration: "none",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontSize: "clamp(0.875rem, 0.68rem + 0.28vw, 1.05rem)", fontWeight: 500,
          padding: "clamp(10px, 1.1vh, 14px) clamp(24px, 2vw, 38px)",
          borderRadius: "8px",
          boxShadow: "0 3px 12px rgba(var(--cs-vert-rgb),0.22)",
          letterSpacing: "0.01em",
          flexShrink: 0,
        }}>
        <PaypalIcon />
        Faire un don via PayPal
      </a>

      <p style={{
        fontSize: "clamp(0.65625rem, 0.55rem + 0.18vw, 0.8rem)",
        color: "var(--cs-texte-doux)",
        marginTop: "clamp(10px, 1.4vh, 16px)",
        fontStyle: "italic",
        flexShrink: 0,
      }}>
        Vous serez redirigé vers le site sécurisé de PayPal.
      </p>

    </section>
  );
}

function PaypalIcon({ size = "1.15em" }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 13.5L5.3 3.8h4.6c2.1 0 3.4 1.1 3.1 3.1-.3 2.3-1.9 3.5-4 3.5H6.7l-.6 3.1H4z"
        fill="#fff" opacity="0.9" />
    </svg>
  );
}
