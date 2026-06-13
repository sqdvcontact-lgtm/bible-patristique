import AccueilCards from "../components/AccueilCards";

export const metadata = {
  title: "Bible & Tradition patristique",
  description: "Accès à la Bible et à la bibliothèque des Pères de l'Église.",
};

export default function AccueilPage() {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center px-6"
      style={{ background: "#f7f4ef", minHeight: "calc(100vh - 48px)" }}
    >
      {/* En-tête */}
      <header className="text-center mb-14" style={{ maxWidth: "500px" }}>
        <p
          className="mb-3"
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#3d6b4f",
          }}
        >
          Textes sacrés &amp; tradition
        </p>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(24px, 3.5vw, 34px)",
            fontWeight: "normal",
            color: "#2a3d30",
            lineHeight: 1.25,
            marginBottom: "14px",
          }}
        >
          Lire les Écritures et les Pères
        </h1>
        <p style={{ fontSize: "13.5px", color: "#5a6b5e", lineHeight: 1.7 }}>
          Un espace de lecture comparée — la Bible dans ses grandes traductions,
          éclairée par deux millénaires de commentaires patristiques.
        </p>
      </header>

      <AccueilCards />
    </main>
  );
}