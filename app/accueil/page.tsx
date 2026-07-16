import Link from "next/link";
import AccueilCards from "../components/AccueilCards";

export const metadata = {
  title: "Corpus Scriptura",
  description: "Lectures bibliques et patristiques.",
};

export default function AccueilPage() {
  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap');
        .colophon-body { font-family: Georgia, 'Times New Roman', serif; }
        .colophon-ornement { font-size: 18px; color: #7a6a52; letter-spacing: 0.25em; }
        .colophon-regle { display: block; width: 36px; height: 1px; background: #c8b89e; margin: 0 auto; }
        .hero-title-ornament { width: min(265px, 48vw); height: auto; display: block; margin: 0 auto 8px; opacity: .82; }
        .hero-title-ornament + div { display: none; }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main style={{
        minHeight: "calc(100vh - 48px)",
        background: "#f7f3eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 24px 28px",
      }}>
        {/* Contenu centré — prend tout l'espace disponible */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: "42px 0 0",
        }}>
        <header style={{ textAlign: "center", marginBottom: "34px" }}>
          <img
            src="/icons/home-title-ornament.png"
            alt=""
            aria-hidden="true"
            className="hero-title-ornament"
          />

          {/* Marque typographique supérieure */}
          <div style={{ fontSize: "13px", color: "#8a7a5e", marginBottom: "22px", letterSpacing: "0.45em" }}>
            ❧ · ❧
          </div>

          {/* Titre principal */}
          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(26px, 3.4vw, 38px)",
            fontWeight: "normal",
            color: "#1a2820",
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            paddingLeft: "0.04em",
            marginBottom: "14px",
          }}>
            Corpus Scriptura
          </h1>

          {/* Filet */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "0 auto 14px", maxWidth: "240px" }}>
            <div style={{ flex: 1, height: "1px", background: "#c8b89e" }} />
            <span style={{ fontSize: "10px", color: "#a89878", letterSpacing: "0.2em" }}>✦</span>
            <div style={{ flex: 1, height: "1px", background: "#c8b89e" }} />
          </div>

          {/* Sous-titre */}
          <p style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "14px",
            fontStyle: "italic",
            color: "#5a6b5e",
            letterSpacing: "0.02em",
            marginBottom: "6px",
          }}>
            Lectures bibliques et patristiques
          </p>
          <p style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "#9a8a6e",
          }}>
            Somme collaborative
          </p>
        </header>

        <AccueilCards />

        <a href="#apropos" aria-label="En savoir plus" style={{
          marginTop: "12px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
          color: "#9a8a72", textDecoration: "none", fontSize: "10.5px", letterSpacing: "0.08em",
          fontFamily: "Georgia, serif", fontStyle: "italic",
        }}>
          <span>Le projet</span>
          <span style={{ fontSize: "14px", lineHeight: 1 }}>⌄</span>
        </a>
        </div>

        {/* Soutenir — ancré en bas du viewport initial */}
        <Link href="/soutenir" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          fontSize: "12.5px",
          color: "#42583c",
          background: "rgba(255,252,242,0.96)",
          textDecoration: "none",
          padding: "8px 20px",
          border: "1px solid rgba(154,126,61,0.38)",
          borderRadius: "999px",
          boxShadow: "0 4px 16px rgba(74,55,32,0.09), inset 0 1px 0 rgba(255,255,255,0.78)",
          letterSpacing: "0.04em",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.65 }}>
            <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z"
              stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
          </svg>
          Soutenir le projet
        </Link>
      </main>

      {/* ── À propos — style colophon ─────────────────────────────────────── */}
      <div id="apropos" style={{ background: "#f4f0e4", scrollMarginTop: "48px", borderTop: "1px solid #ddd4c0" }}>
        <div style={{
          maxWidth: "560px",
          margin: "0 auto",
          padding: "72px 32px 80px",
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#2a2218",
        }}>

          {/* En-tête colophon */}
          <div style={{ marginBottom: "52px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "#9a8a6e", marginBottom: "18px" }}>
              ¶
            </div>
            <h2 style={{
              fontSize: "clamp(19px, 2.8vw, 24px)",
              fontWeight: "normal",
              color: "#1a2018",
              lineHeight: 1.3,
              marginBottom: "18px",
              letterSpacing: "0.02em",
            }}>
              Du projet
            </h2>
            <OrnementsTriple />
          </div>

          {/* Sections */}
          <ColophonSection titre="Origine">
            <p style={paraStyle}><em>Corpus Scriptura</em> est né à l&rsquo;été 2026. Il entend offrir un libre accès aux textes bibliques, aux œuvres patristiques et aux grands témoins de la tradition chrétienne : aux chercheurs, aux lecteurs, aux curieux, à tous ceux qui veulent entrer plus profondément dans l&rsquo;intelligence des Écritures.</p>
            <p style={paraStyle}>Un système de commentaires permet à chacun d&rsquo;apporter sa contribution : une lecture, une référence, un rapprochement. Cette bibliothèque n&rsquo;est pas un monument clos, mais un chantier ouvert.</p>
          </ColophonSection>

          <ColophonSection titre="Les textes">
            <p style={paraStyle}>Chaque texte proposé appartient au domaine public ou est librement accessible. Nous puisons dans des bases de données ouvertes, avec le souci de rendre ces textes plus lisibles, plus sûrs et plus facilement consultables.</p>
            <p style={paraStyle}>Nous demandons aux éditeurs, institutions et ayants droit qui œuvrent à la transmission de la foi et de la culture chrétienne de nous permettre, lorsque cela est possible, d&rsquo;utiliser leurs textes afin d&rsquo;en favoriser l&rsquo;étude, la circulation et la conservation.</p>
          </ColophonSection>

          <ColophonSection titre="L&rsquo;intelligence artificielle">
            <p style={paraStyle}>L&rsquo;intelligence artificielle est utilisée comme outil d&rsquo;assistance : nettoyage des textes, découpage, structuration, établissement de rapprochements entre les versets bibliques et les œuvres patristiques.</p>
            <p style={paraStyle}>Ce travail exige une vérification humaine. Les textes, les correspondances et les références doivent être relus, corrigés et confirmés. L&rsquo;IA ne remplace ni le jugement, ni la science, ni la prudence du lecteur.</p>
          </ColophonSection>

          <ColophonSection titre="Contributions">
            <p style={paraStyle}>La bibliothèque s&rsquo;enrichit progressivement. Vous pouvez contribuer en nous transmettant des textes patristiques appartenant au domaine public, soigneusement établis, ou en proposant corrections, références et signalements d&rsquo;erreurs.</p>
            <p style={paraStyle}>Si vous êtes artiste — peintre, graveur, illustrateur — nous pouvons également acquérir vos œuvres pour illustrer les Pères de l&rsquo;Église dans la page <Link href="/bibliotheque" style={{ color: "#3d5c30", textDecoration: "none", borderBottom: "1px dotted #8a7a5e" }}>Bibliothèque</Link>.</p>
          </ColophonSection>

          <ColophonSection titre="Soutenir le projet">
            <p style={paraStyle}>Le site est proposé en accès libre. Son développement demande toutefois du temps, des outils, des vérifications et un travail régulier de mise en forme.</p>
            <p style={paraStyle}>Si vous souhaitez soutenir ce travail, vous pouvez le faire par un don, même modeste, depuis la page <Link href="/soutenir" style={{ color: "#3d5c30", textDecoration: "none", borderBottom: "1px dotted #8a7a5e" }}>Soutenir le projet</Link>. Votre aide contribue directement à l&rsquo;enrichissement de la bibliothèque et à la mise en ligne de nouvelles œuvres.</p>
          </ColophonSection>

          {/* ── Colophon final — pyramide ─────────────────────────────────── */}
          <div style={{ marginTop: "56px" }}>
            <OrnementsTriple />
            <div style={{ marginTop: "32px", fontSize: "13px", lineHeight: "2.1", color: "#4a3e2e", letterSpacing: "0.01em" }}>
              <p style={{ maxWidth: "460px", margin: "0 auto" }}>Imprimé sur le réseau des réseaux par les soins</p>
              <p style={{ maxWidth: "380px", margin: "0 auto" }}>de <em>Corpus Scriptura</em>, somme ouverte dédiée</p>
              <p style={{ maxWidth: "300px", margin: "0 auto" }}>à la lecture des Saintes Écritures</p>
              <p style={{ maxWidth: "230px", margin: "0 auto" }}>et des Pères de l&rsquo;Église,</p>
              <p style={{ maxWidth: "170px", margin: "0 auto" }}>en l&rsquo;An de grâce</p>
              <p style={{ maxWidth: "110px", margin: "0 auto" }}>MMXXVI.</p>
            </div>

            {/* Marque finale */}
            <div style={{ marginTop: "28px", fontSize: "20px", color: "#9a8a6e", letterSpacing: "0.3em" }}>
              ✦
            </div>

            {/* Liens légaux */}
            <div style={{ marginTop: "28px", fontSize: "10.5px", color: "#b0a088", letterSpacing: "0.06em" }}>
              <Link href="/conditions-utilisation" style={{ color: "#9a8a6e", textDecoration: "none", borderBottom: "1px dotted #c8b89e" }}>
                Conditions d&rsquo;utilisation
              </Link>
              <span style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/confidentialite" style={{ color: "#9a8a6e", textDecoration: "none", borderBottom: "1px dotted #c8b89e" }}>
                Politique de confidentialité
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Composants ──────────────────────────────────────────────────────────── */

function OrnementsTriple() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "0 auto", maxWidth: "280px" }}>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #c8b49a)" }} />
      <span style={{ fontSize: "15px", color: "#9a8a6e" }}>⁂</span>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #c8b49a)" }} />
    </div>
  )
}

function ColophonSection({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "44px" }}>
      <h3 style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "#8a7a5e",
        margin: "0 0 16px",
      }}>
        {titre}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>
      <div style={{ marginTop: "28px" }}>
        <OrnementsTriple />
      </div>
    </section>
  )
}

const paraStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.75",
  color: "#2e2618",
  margin: 0,
}
