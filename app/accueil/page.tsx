import Link from "next/link";
import AccueilCards from "../components/AccueilCards";

export const metadata = {
  title: "Corpus Scriptura",
  description: "Lectures bibliques et patristiques.",
};

export default function AccueilPage() {
  return (
    <div>
      <style>{`
        html { scroll-behavior: smooth; }
        .colophon-body { font-family: var(--font-source-serif), Georgia, serif; }
        .colophon-ornement { font-size: 1.125rem; color: #7a6a52; letter-spacing: 0.25em; }
        .colophon-regle { display: block; width: 36px; height: 1px; background: #c8b89e; margin: 0 auto; }
        .hero-title-ornament { width: min(265px, 48vw); height: auto; display: block; margin: 0 auto 8px; opacity: .82; }
        .hero-title-ornament + div { display: none; }
        /* Colophon final : pyramide desktop calibrée en rem ; sur écran étroit,
           les lignes longues débordaient (« soins » rejeté seul). On bascule alors
           sur un découpage mobile en lignes plus courtes et plus nombreuses. */
        .colophon-pyr-mobile { display: none; }
        @media (max-width: 600px) {
          .colophon-pyr-desktop { display: none; }
          .colophon-pyr-mobile { display: block; }
          .colophon-pyr-mobile p { margin: 0 auto; max-width: 90vw; }
          /* Liens légaux empilés, chacun entier sur sa ligne. */
          .liens-legaux { display: flex; flex-direction: column; align-items: center; gap: 9px; }
          .liens-legaux .sep-legal { display: none; }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main style={{
        minHeight: "calc(100vh - 3.5rem)",
        background: "#eef2ea",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 24px 32px",
      }}>
        {/* Contenu centré — prend tout l'espace disponible */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          width: "100%",
          padding: "clamp(48px, 8vh, 110px) 0 0",
        }}>
        <header style={{ textAlign: "center", marginBottom: "34px" }}>
          <img
            src="/icons/home-title-ornament.png"
            alt=""
            aria-hidden="true"
            className="hero-title-ornament"
          />

          {/* Marque typographique supérieure */}
          <div style={{ fontSize: "0.9375rem", color: "#8a7440", marginBottom: "22px", letterSpacing: "0.38em" }}>
            ❧ · ❧
          </div>

          {/* Titre principal */}
          <h1 style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: "clamp(30px, 4.4vw, 54px)",
            fontWeight: "normal",
            color: "#1a2818",
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            paddingLeft: "0.04em",
            marginBottom: "14px",
          }}>
            Corpus Scriptura
          </h1>

          {/* Filet */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "0 auto 14px", maxWidth: "15rem" }}>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #b8a070)" }} />
            <span style={{ fontSize: "0.95rem", color: "#9a8248", lineHeight: 1 }}>❧</span>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #b8a070)" }} />
          </div>

          {/* Sous-titre */}
          <p style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: "0.875rem",
            fontStyle: "italic",
            color: "#3d6b4f",
            letterSpacing: "0.02em",
            marginBottom: "6px",
          }}>
            Lectures bibliques et patristiques
          </p>
          <p style={{
            fontSize: "0.625rem",
            fontWeight: 600,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "#8a7848",
          }}>
            Somme collaborative
          </p>
        </header>

        <AccueilCards />

        {/* Espace libre entre les cartes et le bouton « Soutenir » (l'emblème aux
            deux anges a été retiré). */}
        <div style={{ flex: 1, minHeight: "clamp(48px, 12vh, 140px)" }} />
        </div>

        {/* Soutenir — ancré en bas du viewport initial */}
        <Link href="/soutenir" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          fontSize: "0.75rem",
          color: "#3d6b4f",
          background: "rgba(255,253,245,0.97)",
          textDecoration: "none",
          padding: "8px 22px",
          border: "1px solid rgba(140,110,40,0.32)",
          borderRadius: "999px",
          boxShadow: "0 3px 14px rgba(60,45,20,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-source-serif), Georgia, serif",
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.60 }}>
            <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z"
              stroke="#3d6b4f" strokeWidth="1.1" strokeLinejoin="round"/>
          </svg>
          Soutenir le projet
        </Link>
      </main>

      {/* ── À propos — style colophon ─────────────────────────────────────── */}
      <div id="apropos" style={{ background: "#e7ede1", scrollMarginTop: "3.5rem", borderTop: "1px solid #cdd6c2" }}>
        <div style={{
          maxWidth: "35rem",
          margin: "0 auto",
          padding: "72px 32px 80px",
          textAlign: "center",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          color: "#2a2c20",
        }}>

          {/* En-tête colophon */}
          <div style={{ marginBottom: "52px" }}>
            <div style={{ fontSize: "1.25rem", color: "#9a8248", marginBottom: "18px", letterSpacing: "0.18em" }}>
              ❧
            </div>
            <h2 style={{
              fontSize: "clamp(19px, 2.8vw, 24px)",
              fontWeight: "normal",
              color: "#1a2018",
              lineHeight: 1.3,
              marginBottom: "18px",
              letterSpacing: "0.02em",
            }}>
              Le projet
            </h2>
            <OrnementsTriple />
          </div>

          {/* Sections */}
          <ColophonSection titre="Origine">
            <p style={paraStyle}><em>Corpus Scriptura</em> est né en 2026. Son objet est d&rsquo;offrir un accès libre aux textes bibliques, aux œuvres patristiques et aux grands témoins de la tradition chrétienne — aux chercheurs comme aux simples lecteurs, à tous ceux qui veulent entrer plus avant dans l&rsquo;intelligence des Écritures.</p>
            <p style={paraStyle}>Un système de commentaires permet à chacun d&rsquo;apporter sa contribution : une lecture, une référence, un rapprochement. Cette bibliothèque n&rsquo;est pas un monument clos, mais un chantier ouvert sur la communauté de ceux qui lisent.</p>
          </ColophonSection>

          <ColophonSection titre="Les textes">
            <p style={paraStyle}>Chaque texte proposé appartient au domaine public ou est librement accessible. Nous puisons dans des éditions classiques et des bases ouvertes, avec le constant souci de rendre ces sources plus lisibles, plus sûres et plus facilement consultables.</p>
            <p style={paraStyle}>Nous sollicitons également les éditeurs, institutions et ayants droit qui œuvrent à la transmission de la foi et de la culture chrétienne : toute autorisation d&rsquo;utilisation nous permet d&rsquo;étendre le corpus, d&rsquo;en favoriser la diffusion et d&rsquo;en assurer la conservation.</p>
          </ColophonSection>

          <ColophonSection titre="L&rsquo;intelligence artificielle">
            <p style={paraStyle}>L&rsquo;intelligence artificielle est employée comme outil d&rsquo;assistance : nettoyage des textes, découpage, structuration, établissement de rapprochements entre les versets bibliques et les œuvres patristiques.</p>
            <p style={paraStyle}>Ce travail exige une vérification humaine constante. Les textes, les correspondances et les références doivent être relus, corrigés et confirmés. L&rsquo;IA ne remplace ni le jugement, ni la science, ni la prudence du lecteur.</p>
          </ColophonSection>

          <ColophonSection titre="Contributions">
            <p style={paraStyle}>La bibliothèque s&rsquo;enrichit progressivement. Vous pouvez y contribuer en nous transmettant des textes patristiques du domaine public, soigneusement établis, ou en nous signalant corrections, références et erreurs à relever.</p>
            <p style={paraStyle}>Si vous êtes artiste — peintre, graveur, illustrateur — des acquisitions d&rsquo;œuvres destinées à illustrer les Pères de l&rsquo;Église sont possibles : consultez la page <Link href="/bibliotheque" style={{ color: "#3d6b4f", textDecoration: "none", borderBottom: "1px dotted #8a7a5e" }}>Bibliothèque</Link>.</p>
          </ColophonSection>

          <ColophonSection titre="Soutenir">
            <p style={paraStyle}>Le site est proposé en accès entièrement libre. Son développement suppose néanmoins du temps, des outils, des vérifications et un travail régulier de mise en forme et d&rsquo;établissement des textes.</p>
            <p style={paraStyle}>Si vous souhaitez soutenir cette entreprise, un don, même modeste, peut être adressé depuis la page <Link href="/soutenir" style={{ color: "#3d6b4f", textDecoration: "none", borderBottom: "1px dotted #8a7a5e" }}>Soutenir le projet</Link>. Votre aide contribue directement à l&rsquo;enrichissement de la bibliothèque et à la mise en ligne de nouvelles œuvres.</p>
          </ColophonSection>

          {/* ── Colophon final — pyramide ─────────────────────────────────── */}
          {/* Un seul séparateur : celui qui clôt la section « Soutenir » ci-dessus
              suffit (on a retiré le second, qui faisait doublon). */}
          <div style={{ marginTop: "44px" }}>
            <div style={{ fontSize: "0.8125rem", lineHeight: "2.1", color: "#4a4a30", letterSpacing: "0.01em" }}>
              <div className="colophon-pyr-desktop">
                <p style={{ maxWidth: "28.75rem", margin: "0 auto" }}>Imprimé sur le réseau des réseaux par les soins</p>
                <p style={{ maxWidth: "23.75rem", margin: "0 auto" }}>de <em>Corpus Scriptura</em>, somme ouverte dédiée</p>
                <p style={{ maxWidth: "18.75rem", margin: "0 auto" }}>à la lecture des Saintes Écritures</p>
                <p style={{ maxWidth: "14.375rem", margin: "0 auto" }}>et des Pères de l&rsquo;Église,</p>
                <p style={{ maxWidth: "10.625rem", margin: "0 auto" }}>en l&rsquo;An de grâce</p>
                <p style={{ maxWidth: "6.875rem", margin: "0 auto" }}>MMXXVI.</p>
              </div>
              <div className="colophon-pyr-mobile">
                <p>Imprimé sur le réseau des réseaux</p>
                <p>par les soins de <em>Corpus Scriptura</em>,</p>
                <p>somme ouverte dédiée</p>
                <p>à la lecture des Saintes Écritures</p>
                <p>et des Pères de l&rsquo;Église,</p>
                <p>en l&rsquo;An de grâce</p>
                <p>MMXXVI.</p>
              </div>
            </div>

            {/* Marque finale */}
            <div style={{ marginTop: "28px", fontSize: "1.4rem", color: "#9a8248", lineHeight: 1 }}>
              ❧
            </div>

            {/* Liens légaux — en ligne sur desktop, empilés (sans coupure) sur mobile */}
            <div className="liens-legaux" style={{ marginTop: "28px", fontSize: "0.65625rem", color: "#b0a088", letterSpacing: "0.06em" }}>
              <Link href="/conditions-utilisation" className="lien-legal" style={{ color: "#9a8a6e", textDecoration: "none", borderBottom: "1px dotted #c8b89e", whiteSpace: "nowrap" }}>
                Conditions d&rsquo;utilisation
              </Link>
              <span className="sep-legal" style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/confidentialite" className="lien-legal" style={{ color: "#9a8a6e", textDecoration: "none", borderBottom: "1px dotted #c8b89e", whiteSpace: "nowrap" }}>
                Politique de confidentialité
              </Link>
              <span className="sep-legal" style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/contact" className="lien-legal" style={{ color: "#9a8a6e", textDecoration: "none", borderBottom: "1px dotted #c8b89e", whiteSpace: "nowrap" }}>
                Contact
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Composants ──────────────────────────────────────────────────────────── */

function OrnementsTriple() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: "0 auto", maxWidth: "18.75rem" }}>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #b8a060)" }} />
      <span style={{ fontSize: "1.15rem", color: "#9a8248", lineHeight: 1 }}>❧</span>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #b8a060)" }} />
    </div>
  )
}

function ColophonSection({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "44px" }}>
      <h3 style={{
        fontSize: "0.625rem",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "#3d6b4f",
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
  fontSize: "0.875rem",
  lineHeight: "1.75",
  color: "#2a2c20",
  margin: 0,
}
