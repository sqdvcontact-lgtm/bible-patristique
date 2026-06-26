import Link from "next/link";
import AccueilCards from "../components/AccueilCards";

export const metadata = {
  title: "Bible & Patristique",
  description: "La Bible dans ses grandes traductions, éclairée par deux millénaires de commentaires patristiques.",
};

export default function AccueilPage() {
  return (
    <>
      {/* ── Première page : hero + cartes, inchangé ──────────────────────── */}
      <main style={{
        height: "calc(100vh - 48px)",
        background: "#f7f4ef",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        overflow: "hidden",
        position: "relative",
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
            Somme collaborative
          </p>

          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(24px, 3.2vw, 34px)",
            fontWeight: "normal",
            color: "#2a3d30",
            lineHeight: 1.25,
            marginBottom: "16px",
          }}>
            Lire les Écritures et les Pères
          </h1>

          <p style={{ fontSize: "13.5px", color: "#5a6b5e", lineHeight: 1.45 }}>
            La Bible dans ses grandes traductions,
            <br />
            éclairée par deux millénaires de commentaires patristiques.
          </p>
        </header>

        <AccueilCards />

        {/* Indice de défilement, discret, vers la présentation du projet */}
        <a href="#apropos" aria-label="En savoir plus sur le projet" style={{
          position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
          color: "#9a958d", textDecoration: "none", fontSize: "10.5px", letterSpacing: "0.04em",
        }}>
          <span>Le projet</span>
          <span style={{ fontSize: "13px", lineHeight: 1 }}>⌄</span>
        </a>
      </main>

      {/* ── À propos, fusionné ici : déroule sous la première page ───────── */}
      <div id="apropos" style={{ background: "#f7f4ef", scrollMarginTop: "48px" }}>
        <div style={{ maxWidth: "620px", margin: "0 auto", padding: "64px 32px 80px" }}>

          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: "normal", color: "#1e2e24", lineHeight: 1.2, marginBottom: "20px" }}>
              À propos du projet
            </h2>
            <div style={{ width: "36px", height: "1px", background: "#c8c0b4", margin: "0 auto" }} />
          </div>

          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "14px", lineHeight: "1.65", color: "#2a2520" }}>

            <Section titre="Origine du projet">
              <p><em>La Bible des Pères</em> est née à l&rsquo;été 2026. Elle entend offrir un libre accès aux textes bibliques, aux œuvres patristiques et aux grands témoins de la tradition chrétienne : aux chercheurs, aux lecteurs, aux curieux, à tous ceux qui veulent entrer plus profondément dans l&rsquo;intelligence des Écritures.</p>
              <p>Un système de commentaires permet à chacun d&rsquo;apporter sa contribution : une lecture, une référence, un rapprochement. Cette bibliothèque n&rsquo;est pas un monument clos, mais un chantier ouvert.</p>
            </Section>

            <Section titre="Les textes">
              <p>Chaque texte proposé appartient au domaine public ou est librement accessible. Nous puisons dans des bases de données ouvertes, avec le souci de rendre ces textes plus lisibles, plus sûrs et plus facilement consultables.</p>
              <p>Nous demandons aux éditeurs, institutions et ayants droit qui œuvrent à la transmission de la foi et de la culture chrétienne de nous permettre, lorsque cela est possible, d&rsquo;utiliser leurs textes afin d&rsquo;en favoriser l&rsquo;étude, la circulation et la conservation.</p>
            </Section>

            <Section titre="L&rsquo;intelligence artificielle">
              <p>L&rsquo;intelligence artificielle est utilisée comme outil d&rsquo;assistance : nettoyage des textes, découpage, structuration, établissement de rapprochements entre les versets bibliques et les œuvres patristiques.</p>
              <p>Ce travail exige une vérification humaine. Les textes, les correspondances et les références doivent être relus, corrigés et confirmés. L&rsquo;IA ne remplace ni le jugement, ni la science, ni la prudence du lecteur.</p>
            </Section>

            <Section titre="Contributions">
              <p>La bibliothèque s&rsquo;enrichit progressivement. Vous pouvez contribuer en nous transmettant des textes patristiques appartenant au domaine public, soigneusement établis, ou en proposant corrections, références et signalements d&rsquo;erreurs.</p>
              <p>Si vous êtes artiste — peintre, graveur, illustrateur — nous pouvons également acquérir vos œuvres pour représenter les Pères de l&rsquo;Église dans la page <Link href="/bibliotheque" style={{ color: "#3d6b4f", textDecoration: "none", borderBottom: "1px solid rgba(61,107,79,0.3)" }}>Bibliothèque</Link>.</p>
            </Section>

            <Section titre="Soutenir le projet">
              <p>Le site est proposé en accès libre. Son développement demande toutefois du temps, des outils, des vérifications et un travail régulier de mise en forme. Si vous souhaitez soutenir ce travail, vous pouvez le faire par un don, même modeste, depuis la page <Link href="/soutenir" style={{ color: "#3d6b4f", textDecoration: "none", borderBottom: "1px solid rgba(61,107,79,0.3)" }}>Soutenir le projet</Link>.</p>
              <p>Votre aide contribue directement à l&rsquo;enrichissement de la bibliothèque, à la correction des textes et à la mise en ligne de nouvelles œuvres.</p>
            </Section>

          </div>

          {/* Informations légales */}
          <div style={{ marginTop: "40px", paddingTop: "24px", borderTop: "1px solid #d6d0c4", textAlign: "center" }}>
            <Link href="/conditions-utilisation" style={{ fontSize: "11px", color: "#b0a89e", textDecoration: "none", marginRight: "18px" }}>Conditions d&rsquo;utilisation</Link>
            <Link href="/confidentialite" style={{ fontSize: "11px", color: "#b0a89e", textDecoration: "none" }}>Politique de confidentialité</Link>
          </div>

        </div>
      </div>
    </>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "36px" }}>
      <h3 style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "16px", fontWeight: "normal",
        color: "#2a3d30", marginBottom: "14px",
        paddingBottom: "8px", borderBottom: "1px solid #e4dfd8",
      }}>
        {titre}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {children}
      </div>
    </section>
  );
}