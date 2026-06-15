export const metadata = {
  title: "Soutenir le projet — Bible & Tradition",
  description: "Contribuez au développement de la bibliothèque patristique.",
};

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
          marginBottom: "40px",
        }}
      >
        Ce site est un projet bénévole, sans publicité. Si vous souhaitez
        contribuer à son développement — enrichissement de la bibliothèque,
        maintenance technique, hébergement —, vous pouvez nous soutenir.
      </p>

      {/* Encart "bientôt disponible" */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd8d0",
          borderRadius: "10px",
          padding: "28px 36px",
          maxWidth: "360px",
          width: "100%",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#3d6b4f",
            marginBottom: "10px",
          }}
        >
          Bientôt disponible
        </p>
        <p style={{ fontSize: "13px", color: "#7a8e7e", lineHeight: 1.65 }}>
          Les modalités de dons seront précisées prochainement.
          <br />
          Merci de votre intérêt.
        </p>
      </div>
    </main>
  );
}