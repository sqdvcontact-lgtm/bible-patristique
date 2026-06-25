export const metadata = {
  title: "Soutenir le projet — La Bible des Pères",
  description: "Contribuez au développement de la bibliothèque patristique.",
};

// Remplace par ton lien PayPal.me ou ton lien de bouton « Faire un don »
// (https://www.paypal.com/donate/?hosted_button_id=XXXXXXXXXXXXX).
const LIEN_PAYPAL = "https://www.paypal.com/donate/?hosted_button_id=9M463NPH2RQXL";

export default function SoutenirPage() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 48px)",
        background: "#f7f4ef",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center",
      }}
    >
      {/* Icône cœur */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        style={{ marginBottom: "28px", opacity: 0.55 }}
        aria-hidden="true"
      >
        <path
          d="M20 35S4 24 4 13a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 22-16 22z"
          stroke="#3d6b4f"
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>

      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(22px, 3vw, 30px)",
          fontWeight: "normal",
          color: "#2a3d30",
          marginBottom: "20px",
        }}
      >
        Soutenir le projet
      </h1>

      <p
        style={{
          fontSize: "14px",
          color: "#5a6b5e",
          lineHeight: 1.75,
          maxWidth: "420px",
          marginBottom: "36px",
        }}
      >
        Ce site est un projet bénévole, sans publicité. Si vous souhaitez
        contribuer à son développement — enrichissement de la bibliothèque,
        maintenance technique, hébergement —, vous pouvez nous soutenir.
      </p>

      {/* Bouton de don */}
      <a
        href={LIEN_PAYPAL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          background: "#3d6b4f",
          color: "#fff",
          textDecoration: "none",
          fontSize: "14.5px",
          fontWeight: 500,
          padding: "13px 30px",
          borderRadius: "8px",
          boxShadow: "0 4px 14px rgba(61,107,79,0.25)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Icône PayPal simplifiée */}
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <path
            d="M4 13.5L5.3 3.8h4.6c2.1 0 3.4 1.1 3.1 3.1-.3 2.3-1.9 3.5-4 3.5H6.7l-.6 3.1H4z"
            fill="#fff"
            opacity="0.9"
          />
        </svg>
        Faire un don via PayPal
      </a>

      <p
        style={{
          fontSize: "11.5px",
          color: "#9a958d",
          marginTop: "18px",
          fontStyle: "italic",
        }}
      >
        Vous serez redirigé vers le site sécurisé de PayPal.
      </p>
    </main>
  );
}