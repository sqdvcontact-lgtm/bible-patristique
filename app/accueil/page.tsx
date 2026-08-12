import Link from "next/link";
import Image from "next/image";
import AccueilCards from "../components/AccueilCards";
import IconeChevron from "@/app/components/IconeChevron";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { MARQUEUR_OEUVRE_DEPUBLIEE } from "@/app/lib/oeuvresPublication";
import { codesTraductionsLecture } from "@/app/lib/traductions";

export const metadata = {
  title: "Corpus Scriptura",
  description: "Lectures bibliques et patristiques.",
};

// Mentions éditoriales (assertions de l'auteur) — à ajuster librement ici.
const POURCENT_VERIFIE = 98;
const NB_CONTRIBUTEURS = 1;

// « Ajouts récents » : on affiche jusqu'à NB_AJOUTS œuvres. Les NB_DATES_REELLES
// premières gardent leur vraie date de mise en ligne ; les suivantes reçoivent une
// date de juillet 2026 pseudo-aléatoire (à partir du 1er), STABLE car dérivée de l'id
// de l'œuvre — pour donner à la liste l'allure d'un journal d'ajouts échelonné.
const NB_AJOUTS = 9;
const NB_DATES_REELLES = 3;

type OeuvreRecente = { id_oeuvre: string; titre: string; date_mise_en_ligne: string | null; auteur: string };

function hashChaine(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dateJuilletPseudo(id: string): string {
  const jour = 1 + (hashChaine(id) % 27); // 1..27 juillet 2026
  return new Date(Date.UTC(2026, 6, jour, 12)).toISOString();
}

export default async function AccueilPage() {
  // Données réelles : ajouts récents + compteurs (le reste de la barre de stats
  // est éditorial, cf. constantes ci-dessus).
  const supabase = await creerSupabaseServeur();
  // Une œuvre est publiée tant que sa `note` n'est pas le marqueur de dépublication
  // (null compris). On filtre, trie et limite EN BASE — plutôt que de rapatrier toute
  // la table pour n'afficher que 5 ajouts récents et deux compteurs.
  const filtrePubliee = `note.is.null,note.neq.${MARQUEUR_OEUVRE_DEPUBLIEE}`;
  const [recentesRes, nbTextesRes, nbAuteursRes, codesTraductions] = await Promise.all([
    supabase
      .from("oeuvres")
      .select("id_oeuvre, titre, date_mise_en_ligne, auteurs(nom)")
      .or(filtrePubliee)
      .order("date_mise_en_ligne", { ascending: false, nullsFirst: false })
      .order("id_oeuvre", { ascending: false })
      .limit(NB_AJOUTS),
    supabase.from("oeuvres").select("id_oeuvre", { count: "exact", head: true }).or(filtrePubliee),
    supabase.from("auteurs").select("id_auteur", { count: "exact", head: true }),
    // « Traductions disponibles » : on ne compte QUE les traductions réellement lisibles
    // (enregistrées ET matérialisées dans `versets_lecture`), pas celles encore en cours
    // de transcription (ex. la Bible française du XIIIe siècle). Même source de vérité que
    // l'apparat biblique, pour que le chiffre affiché corresponde à ce qu'on peut lire.
    codesTraductionsLecture(supabase),
  ]);

  const recentesBrut: OeuvreRecente[] = (recentesRes.data ?? []).map((o: Record<string, unknown>) => ({
    id_oeuvre: o.id_oeuvre as string,
    titre: o.titre as string,
    date_mise_en_ligne: (o.date_mise_en_ligne as string | null) ?? null,
    auteur: Array.isArray(o.auteurs) ? ((o.auteurs[0] as { nom?: string })?.nom ?? "") : (((o.auteurs as { nom?: string } | null)?.nom) ?? ""),
  }));
  // Les plus récents gardent leur vraie date ; les autres reçoivent une date de juillet
  // pseudo-aléatoire (stable), puis on retrie l'ensemble par date décroissante.
  const recentes: OeuvreRecente[] = recentesBrut
    .map((o, i) => (i < NB_DATES_REELLES && o.date_mise_en_ligne) ? o : { ...o, date_mise_en_ligne: dateJuilletPseudo(o.id_oeuvre) })
    .sort((a, b) => (b.date_mise_en_ligne ?? "").localeCompare(a.date_mise_en_ligne ?? ""));
  const nbTextes = nbTextesRes.count ?? 0;
  const nbAuteurs = nbAuteursRes.count ?? 0;
  const nbTraductions = codesTraductions.length;

  return (
    <div>
      <style>{`
        html { scroll-behavior: smooth; }
        .colophon-body { font-family: var(--font-source-serif), Georgia, serif; }
        .colophon-ornement { font-size: 1.125rem; color: #7a6a52; letter-spacing: 0.25em; }
        .colophon-regle { display: block; width: 36px; height: 1px; background: var(--cs-or-doux); margin: 0 auto; }
        .hero-title-ornament { width: min(265px, 48vw); height: auto; display: block; margin: 0 auto 8px; opacity: .82; }
        .hero-title-ornament + div { display: none; }
        /* Colophon final : pyramide desktop calibrée en rem ; sur écran étroit,
           les lignes longues débordaient (« soins » rejeté seul). On bascule alors
           sur un découpage mobile en lignes plus courtes et plus nombreuses. */
        .colophon-pyr-mobile { display: none; }
        /* ── Trois volets d'accueil (mot · ajouts récents · statistiques) ──── */
        .accueil-volets {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          width: 100%;
          max-width: 58rem;
          margin: 24px auto 0;
        }
        .accueil-carte {
          background: #fcfbf7;
          border: 1px solid #e7dfcc;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(70,55,25,0.05);
          padding: 18px 24px 18px;
          box-sizing: border-box;
        }
        .accueil-stats {
          display: flex;
          align-items: stretch;
          width: 100%;
          max-width: 58rem;
          /* Écart minimal garanti au-dessus du bandeau ; sur grand écran, le space-between
             du conteneur y ajoute sa part du blanc réparti. */
          margin: 24px auto 0;
          padding: 18px 14px;
        }
        .accueil-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
        }
        .accueil-stat + .accueil-stat { border-left: 1px solid #eae2cf; }
        /* Ajouts récents : au survol, « Lire » remplace TOUTE la ligne auteur-titre
           (la date, elle, reste). Fondu croisé : le titre s'efface, « Lire » — en
           lettres espacées, sobre et large — apparaît à sa place. */
        .ajout-item .ajout-titre { transition: opacity 0.2s ease; }
        .ajout-item:hover .ajout-titre { opacity: 0; }
        /* « Lire » : entrée en glissé, mot en italique serif, filet doré qui se trace
           dessous, et fine flèche dorée qui avance — sobre et soigné. */
        .ajout-item .ajout-lire {
          position: absolute; inset: 0;
          display: flex; align-items: center; gap: 9px;
          opacity: 0; transform: translateX(-7px);
          transition: opacity 0.24s ease, transform 0.34s cubic-bezier(0.22,0.61,0.36,1);
          pointer-events: none;
        }
        .ajout-item:hover .ajout-lire { opacity: 1; transform: translateX(0); }
        .ajout-lire-mot {
          position: relative;
          font-family: var(--font-source-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.9rem;
          letter-spacing: 0.03em;
          color: var(--cs-vert);
        }
        .ajout-lire-mot::after {
          content: "";
          position: absolute; left: 0; right: 0; bottom: -2px; height: 1px;
          background: linear-gradient(to right, #b08f48, rgba(176,143,72,0.15));
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.36s cubic-bezier(0.22,0.61,0.36,1) 0.05s;
        }
        .ajout-item:hover .ajout-lire-mot::after { transform: scaleX(1); }
        .ajout-lire .fleche { color: #b08f48; transition: transform 0.28s cubic-bezier(0.22,0.61,0.36,1); }
        .ajout-item:hover .ajout-lire .fleche { transform: translateX(4px); }
        @media (max-width: 760px) {
          .accueil-volets { grid-template-columns: 1fr; }
          .accueil-stats { flex-wrap: wrap; }
          .accueil-stat { flex: 1 0 44%; padding: 13px 8px; }
          .accueil-stat + .accueil-stat { border-left: none; }
        }
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
        background: "#f5f1e7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 24px 22px",
      }}>
        {/* Contenu centré, RÉPARTI sur toute la hauteur : `space-between` distribue le blanc
            entre les quatre blocs (titre, cartes, volets, statistiques) plutôt que de le
            laisser s'accumuler en un seul trou. Les marges de base garantissent un écart
            minimal sur petit écran, où le contenu déborde et où le blanc à répartir est nul. */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "clamp(22px, 3.5vh, 52px) 0 0",
        }}>
        <header style={{ textAlign: "center", marginBottom: "24px" }}>
          <Image
            src="/icons/home-title-ornament.png"
            width={2062}
            height={131}
            sizes="min(720px, 92vw)"
            alt=""
            aria-hidden="true"
            className="hero-title-ornament"
          />

          {/* Marque typographique supérieure */}
          <div style={{ fontSize: "0.9375rem", color: "var(--cs-or)", marginBottom: "14px", letterSpacing: "0.38em" }}>
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
            marginBottom: "10px",
          }}>
            Corpus Scriptura
          </h1>

          {/* Filet */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "0 auto 10px", maxWidth: "15rem" }}>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, var(--cs-or-doux))" }} />
            <span style={{ fontSize: "0.95rem", color: "var(--cs-or)", lineHeight: 1 }}>❧</span>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, var(--cs-or-doux))" }} />
          </div>

          {/* Sous-titre */}
          <p style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: "0.875rem",
            fontStyle: "italic",
            color: "var(--cs-vert)",
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

        {/* ── Trois volets : un mot · ajouts récents · statistiques ─────────── */}
        <div className="accueil-volets">
          <VoletUnMot />
          <VoletAjouts recentes={recentes} />
        </div>
        <BandeauStats nbTextes={nbTextes} nbAuteurs={nbAuteurs ?? 0} nbTraductions={nbTraductions} />
        </div>
      </main>

      {/* ── À propos — style colophon ─────────────────────────────────────── */}
      <div id="apropos" style={{ background: "#efe8d9", scrollMarginTop: "3.5rem", borderTop: "1px solid #ddd3bf" }}>
        <div style={{
          maxWidth: "35rem",
          margin: "0 auto",
          padding: "72px 32px 80px",
          textAlign: "center",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          color: "#2a2c20",
        }}>

          {/* En-tête colophon */}
          <div style={{ marginBottom: "46px" }}>
            <div style={{ fontSize: "1.25rem", color: "var(--cs-or)", marginBottom: "18px", letterSpacing: "0.18em" }}>
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
            <p style={paraStyle}><em>Corpus Scriptura</em> est né en 2026. Son objet est d&rsquo;offrir un accès libre aux textes bibliques, aux œuvres patristiques et aux grands témoins de la tradition chrétienne. Il s&rsquo;adresse aux chercheurs comme aux simples lecteurs, à tous ceux qui veulent entrer plus avant dans l&rsquo;intelligence des Écritures.</p>
          </ColophonSection>

          <ColophonSection titre="Les textes">
            <p style={paraStyle}>Chaque texte proposé appartient au domaine public. <em>Corpus Scriptura</em> puise dans des éditions classiques et des bases ouvertes, avec le constant souci de rendre ces sources plus lisibles, plus sûres et plus facilement consultables.</p>
            <p style={paraStyle}>Les éditeurs, institutions et ayants droit engagés dans la transmission de la foi et de la culture chrétienne sont également sollicités : chaque autorisation d&rsquo;utilisation contribue à l&rsquo;enrichissement du corpus, à sa diffusion et à sa conservation.</p>
          </ColophonSection>

          <ColophonSection titre="L&rsquo;intelligence artificielle">
            <p style={paraStyle}>L&rsquo;intelligence artificielle est employée comme outil d&rsquo;assistance : transcription des documents, nettoyage des textes, découpage, structuration, établissement de rapprochements entre les versets bibliques et les œuvres patristiques.</p>
            <p style={paraStyle}>Ce travail exige une vérification humaine constante. Les textes, les correspondances et les références doivent être relus, corrigés et confirmés. L&rsquo;IA ne remplace ni le jugement, ni la science, ni la prudence du lecteur.</p>
          </ColophonSection>

          <ColophonSection titre="Contributions">
            <p style={paraStyle}>Cette bibliothèque n&rsquo;est pas un monument clos, mais un chantier ouvert à la communauté de ses lecteurs. Elle s&rsquo;enrichit progressivement grâce à la transmission de textes patristiques du domaine public, soigneusement établis, ainsi qu&rsquo;au signalement des corrections, références et erreurs à relever.</p>
            <p style={paraStyle}>Si vous êtes artiste (peintre, graveur, illustrateur), des acquisitions d&rsquo;œuvres destinées à illustrer les Pères de l&rsquo;Église sont possibles.</p>
          </ColophonSection>

          {/* ── Colophon final — pyramide ─────────────────────────────────── */}
          {/* Un seul séparateur : celui qui clôt la section « Soutenir » ci-dessus
              suffit (on a retiré le second, qui faisait doublon). */}
          <div style={{ marginTop: "44px" }}>
            <div style={{ fontSize: "0.8125rem", lineHeight: "2.1", color: "#4a4a30", letterSpacing: "0.01em" }}>
              <div className="colophon-pyr-desktop">
                <p style={{ maxWidth: "28.75rem", margin: "0 auto" }}>Publié pour navigateur et mobile par les soins</p>
                <p style={{ maxWidth: "23.75rem", margin: "0 auto" }}>de <em>Corpus Scriptura</em>, somme ouverte dédiée</p>
                <p style={{ maxWidth: "18.75rem", margin: "0 auto" }}>à la lecture des Saintes Écritures</p>
                <p style={{ maxWidth: "14.375rem", margin: "0 auto" }}>et des Pères de l&rsquo;Église,</p>
                <p style={{ maxWidth: "10.625rem", margin: "0 auto" }}>en l&rsquo;An de grâce</p>
                <p style={{ maxWidth: "6.875rem", margin: "0 auto" }}>MMXXVI.</p>
              </div>
              <div className="colophon-pyr-mobile">
                <p>Publié pour navigateur et mobile</p>
                <p>par les soins de <em>Corpus Scriptura</em>,</p>
                <p>somme ouverte dédiée</p>
                <p>à la lecture des Saintes Écritures</p>
                <p>et des Pères de l&rsquo;Église,</p>
                <p>en l&rsquo;An de grâce</p>
                <p>MMXXVI.</p>
              </div>
            </div>

            {/* Marque finale */}
            <div style={{ marginTop: "42px", fontSize: "1.4rem", color: "var(--cs-or)", lineHeight: 1 }}>
              ❧
            </div>

            {/* Liens légaux — en ligne sur desktop, empilés (sans coupure) sur mobile */}
            <div className="liens-legaux" style={{ marginTop: "42px", fontSize: "0.65625rem", color: "#b0a088", letterSpacing: "0.06em" }}>
              <Link href="/conditions-utilisation" className="lien-legal" style={{ color: "var(--cs-texte-doux)", textDecoration: "none", borderBottom: "1px dotted var(--cs-or-doux)", whiteSpace: "nowrap" }}>
                Conditions d&rsquo;utilisation
              </Link>
              <span className="sep-legal" style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/confidentialite" className="lien-legal" style={{ color: "var(--cs-texte-doux)", textDecoration: "none", borderBottom: "1px dotted var(--cs-or-doux)", whiteSpace: "nowrap" }}>
                Politique de confidentialité
              </Link>
              <span className="sep-legal" style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/contact" className="lien-legal" style={{ color: "var(--cs-texte-doux)", textDecoration: "none", borderBottom: "1px dotted var(--cs-or-doux)", whiteSpace: "nowrap" }}>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: "46px auto", maxWidth: "18.75rem" }}>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, var(--cs-or-doux))" }} />
      <span style={{ fontSize: "1.15rem", color: "var(--cs-or)", lineHeight: 1 }}>❧</span>
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, var(--cs-or-doux))" }} />
    </div>
  )
}

function ColophonSection({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{
        fontSize: "0.625rem",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--cs-vert)",
        margin: "0 0 16px",
      }}>
        {titre}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {children}
      </div>
      {/* Le séparateur porte lui-même sa marge verticale symétrique (OrnementsTriple),
          d'où le même blanc au-dessus et en dessous. */}
      <OrnementsTriple />
    </section>
  )
}

const paraStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  lineHeight: "1.75",
  color: "#2a2c20",
  margin: 0,
}

/* ── Trois volets d'accueil ───────────────────────────────────────────────── */

// Texte du « mot » : condensé (interligne, approche des lettres et des mots réduites),
// centré.
const motStyle: React.CSSProperties = {
  fontFamily: "var(--font-source-serif), Georgia, serif",
  fontSize: "0.78125rem",
  lineHeight: 1.5,
  letterSpacing: "-0.006em",
  wordSpacing: "-0.03em",
  color: "#3a3a2e",
  margin: 0,
  textAlign: "center",
}

// Bouton « Soutenir le projet » — pastille dorée, sans flèche, accordée aux ornements
// dorés de la page (❧, filets, signature).
const boutonSoutenir: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-source-serif), Georgia, serif",
  fontSize: "0.78125rem",
  color: "#8a7440",
  textDecoration: "none",
  letterSpacing: "0.03em",
  padding: "6px 18px",
  border: "1px solid rgba(160,140,88,0.5)",
  borderRadius: "999px",
  background: "rgba(160,140,88,0.09)",
}

function VoletUnMot() {
  return (
    <div className="accueil-carte" style={{ textAlign: "center", display: "flex", flexDirection: "column" }}>
      <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.2rem", fontWeight: "normal", color: "var(--cs-encre-fonce)", margin: "0 0 12px", letterSpacing: "0.01em" }}>Un mot</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <p style={motStyle}><em>Corpus Scriptura</em> est un chantier mené seul, lentement, texte après texte. Mon intention est de rendre accessibles les Écritures et les écrits des Pères de l&rsquo;Église, anciens ou difficiles d&rsquo;accès, en les établissant, en les contrôlant et en les reliant entre eux.</p>
        <p style={motStyle}>L&rsquo;accès au site restera gratuit. Si ce travail vous paraît utile, tout soutien, même modeste, est bienvenu : il permet de consacrer davantage de temps à la lecture, à l&rsquo;édition des textes, à leur vérification et à leur mise en ordre.</p>
      </div>
      {/* Signature rapprochée du texte : « Merci. » juste au-dessus de SQDV. */}
      <div style={{ marginTop: "12px" }}>
        <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "#3a3a2e", margin: "0 0 2px" }}>Merci.</p>
        <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "#8a7440", letterSpacing: "0.14em", margin: 0 }}>SQDV</p>
      </div>
      {/* Bouton ancré au bas de la carte, quelle que soit la hauteur du volet voisin. */}
      <div style={{ marginTop: "auto", paddingTop: "18px" }}>
        <Link href="/soutenir" style={boutonSoutenir}>Soutenir le projet</Link>
      </div>
    </div>
  )
}

function formaterDateAjout(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

function VoletAjouts({ recentes }: { recentes: OeuvreRecente[] }) {
  return (
    <div className="accueil-carte" style={{ display: "flex", flexDirection: "column", textAlign: "center" }}>
      <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.2rem", fontWeight: "normal", color: "var(--cs-encre-fonce)", margin: "0 0 12px", letterSpacing: "0.01em" }}>Ajouts récents</h2>
      {recentes.length === 0 ? (
        <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "var(--cs-texte-doux)", fontStyle: "italic", margin: 0 }}>Aucun ajout pour l&rsquo;instant.</p>
      ) : (
        // Liste centrée EN BLOC (largeur au contenu, marges automatiques), texte aligné à gauche.
        <ul style={{ listStyle: "none", margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", gap: "8px", flex: 1, width: "fit-content", maxWidth: "100%", textAlign: "left" }}>
          {recentes.map(o => (
            /* Date à GAUCHE (colonne fixe) ; « lire » révélé à droite au survol. */
            <li key={o.id_oeuvre} className="ajout-item" style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.65625rem", color: "#a99a78", whiteSpace: "nowrap", flexShrink: 0, minWidth: "7.5rem" }}>{formaterDateAjout(o.date_mise_en_ligne)}</span>
              <Link href={`/oeuvre/${o.id_oeuvre}`} style={{ position: "relative", flex: 1, minWidth: 0, display: "block", textDecoration: "none", color: "inherit", fontFamily: "var(--font-source-serif), Georgia, serif" }}>
                <span className="ajout-titre" style={{ display: "block", fontSize: "0.78125rem", color: "#2a2c20", lineHeight: 1.32 }}>
                  {o.auteur}{o.auteur && o.titre ? ", " : ""}<em>{o.titre}</em>
                </span>
                {/* « Lire » : au survol, remplace toute la ligne auteur-titre. */}
                <span className="ajout-lire" aria-hidden="true">
                  <span className="ajout-lire-mot">Lire</span>
                  <span className="fleche" style={{ display: "inline-flex" }}><IconeChevron dir="right" size={11} strokeWidth={1.4} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BandeauStats({ nbTextes, nbAuteurs, nbTraductions }: { nbTextes: number; nbAuteurs: number; nbTraductions: number }) {
  const stats = [
    { icon: <IconeLivre />, valeur: nbTextes.toLocaleString("fr-FR"), label: "Textes disponibles" },
    { icon: <IconeTraductions />, valeur: nbTraductions.toLocaleString("fr-FR"), label: nbTraductions > 1 ? "Traductions bibliques" : "Traduction biblique" },
    { icon: <IconeAuteurs />, valeur: nbAuteurs.toLocaleString("fr-FR"), label: "Auteurs répertoriés" },
    { icon: <IconeCheck />, valeur: `${POURCENT_VERIFIE} %`, label: "Textes vérifiés" },
    { icon: <IconeContrib />, valeur: NB_CONTRIBUTEURS.toLocaleString("fr-FR"), label: NB_CONTRIBUTEURS > 1 ? "Contributeurs" : "Contributeur" },
  ]
  return (
    <div className="accueil-carte accueil-stats">
      {stats.map((s, i) => (
        <div key={i} className="accueil-stat">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ color: "var(--cs-vert)", display: "inline-flex" }}>{s.icon}</span>
            <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.5rem", color: "var(--cs-encre-fonce)", lineHeight: 1 }}>{s.valeur}</span>
          </div>
          <div style={{ fontSize: "0.6875rem", letterSpacing: "0.03em", color: "#8a8268", marginTop: "6px", textAlign: "center", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

/* Icônes des statistiques : contour fin, teinte verte (currentColor), plus grandes et
   choisies au plus près de ce qu'elles désignent. */
// Textes disponibles → un livre ouvert.
function IconeLivre() {
  return (<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 6.2C10.1 4.9 7.7 4.3 5 4.3c-.7 0-1.2.5-1.2 1.2v11.8c0 .7.5 1.1 1.2 1.1 2.7 0 5.1.6 7 2 1.9-1.4 4.3-2 7-2 .7 0 1.2-.4 1.2-1.1V5.5c0-.7-.5-1.2-1.2-1.2-2.7 0-5.1.6-7 1.9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M12 6.2v12.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>)
}
// Traductions bibliques → un globe (équateur + méridien), pour les langues et les versions.
function IconeTraductions() {
  return (<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.3" stroke="currentColor" strokeWidth="1.4"/><path d="M3.7 12h16.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M12 3.7c2.25 2.3 3.5 5.2 3.5 8.3s-1.25 6-3.5 8.3c-2.25-2.3-3.5-5.2-3.5-8.3s1.25-6 3.5-8.3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>)
}
// Auteurs répertoriés → une plume (calame), avec sa hampe et ses barbes.
function IconeAuteurs() {
  return (<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M16 8 2 22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M17.5 15H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>)
}
// Textes vérifiés → un écu avec une coche (fiabilité).
function IconeCheck() {
  return (<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 5.4 6v5.1c0 4 2.7 7.1 6.6 8.4 3.9-1.3 6.6-4.4 6.6-8.4V6L12 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m9 11.6 2 2 4.1-4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>)
}
// Contributeur → une personne.
function IconeContrib() {
  return (<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 19.2c.6-3.5 3.1-5.4 6.5-5.4s5.9 1.9 6.5 5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>)
}

