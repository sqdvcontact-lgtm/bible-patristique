import AccueilCards from "../components/AccueilCards";

export const metadata = {
  title: "Bible & Tradition patristique",
  description: "La Bible dans ses grandes traductions, éclairée par deux millénaires de commentaires patristiques.",
};

export default function AccueilPage() {
  return (
    <main style={{
      height: "calc(100vh - 48px)",
      background: "#f7f4ef",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 24px",
      overflow: "hidden",
    }}>
      <header style={{ textAlign: "center", marginBottom: "40px" }}>
        <p style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#3d6b4f",
          marginBottom: "14px",
        }}>
          Textes sacrés &amp; tradition
        </p>

        <h1 style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(24px, 3.2vw, 34px)",
          fontWeight: "normal",
          color: "#2a3d30",
          lineHeight: 1.25,
          marginBottom: "10px",
        }}>
          Lire les Écritures et les Pères
        </h1>

        <p style={{
          fontSize: "13px",
          fontStyle: "italic",
          color: "#7a8e7e",
          marginBottom: "16px",
        }}>
          Somme collaborative
        </p>

        <p style={{ fontSize: "13.5px", color: "#5a6b5e", lineHeight: 1.75 }}>
          La Bible dans ses grandes traductions,
          <br />
          éclairée par deux millénaires de commentaires patristiques.
        </p>
      </header>

      <AccueilCards />
    </main>
  );
}