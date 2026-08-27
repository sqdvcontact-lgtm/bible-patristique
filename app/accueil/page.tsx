import Link from "next/link";
import AccueilCards from "../components/AccueilCards";
import IconeChevron from "@/app/components/IconeChevron";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { MARQUEUR_OEUVRE_DEPUBLIEE } from "@/app/lib/oeuvresPublication";
import { codesTraductionsLecture } from "@/app/lib/traductions";

export const metadata = {
  title: { absolute: "Corpus Scriptura" },
  description: "Lectures bibliques et patristiques.",
};

// Le bandeau de statistiques ne porte plus aucun chiffre écrit à la main. Les
// « textes vérifiés » et les « contributeurs » étaient des constantes qu'il fallait
// penser à corriger, et qui vieillissaient donc en silence. Tout vient désormais de
// la base, par la fonction `statistiques_accueil()` : voir `BandeauStats` plus bas.

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

// Chiffres du bandeau, tels que la base les rend. `pourcent_verifie` peut être nul
// quand aucune œuvre n'a encore été contrôlée : la tuile se retire alors d'elle-même,
// plutôt que d'annoncer « 0 % ».
type StatistiquesAccueil = {
  textes: number;
  auteurs: number;
  pourcent_verifie: number | null;
  contributeurs: number;
};

export default async function AccueilPage() {
  const supabase = await creerSupabaseServeur();
  // Une œuvre est publiée tant que sa `note` n'est pas le marqueur de dépublication
  // (null compris). On filtre, trie et limite EN BASE — plutôt que de rapatrier toute
  // la table pour n'afficher que quelques ajouts récents.
  const filtrePubliee = `note.is.null,note.neq.${MARQUEUR_OEUVRE_DEPUBLIEE}`;
  const [recentesRes, statsRes, codesTraductions] = await Promise.all([
    supabase
      .from("oeuvres")
      .select("id_oeuvre, titre, date_mise_en_ligne, auteurs!oeuvres_id_auteur_fkey(nom)")
      .or(filtrePubliee)
      .order("date_mise_en_ligne", { ascending: false, nullsFirst: false })
      .order("id_oeuvre", { ascending: false })
      .limit(NB_AJOUTS),
    // Compteurs du bandeau, calculés en base et IDENTIQUES pour tout visiteur. Les
    // compter ici reviendrait à les soumettre aux droits du lecteur : l'administrateur
    // voyait 52 œuvres là où le visiteur en voyait 35, et le pourcentage de textes
    // vérifiés ne se lisait pas du tout sans droits d'administration. Une annonce
    // publique doit dire la même chose à tous.
    supabase.rpc("statistiques_accueil").maybeSingle<StatistiquesAccueil>(),
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
  const stats = statsRes.data;
  const nbTextes = stats?.textes ?? 0;
  const nbAuteurs = stats?.auteurs ?? 0;
  const pourcentVerifie = stats?.pourcent_verifie ?? null;
  const nbContributeurs = stats?.contributeurs ?? 0;
  const nbTraductions = codesTraductions.length;

  return (
    <div className="accueil">
      <style>{`
        html { scroll-behavior: smooth; }
        /* ── UNE SEULE MESURE pour toute la colonne d'accueil ────────────────
           Les trois cartes tenaient dans 42,5rem quand les volets et le bandeau
           en prenaient 58 : sur un grand écran, le bloc le plus important de la
           page — celui par où l'on entre — était le plus étroit, en retrait de
           124 px de chaque côté sur les autres. La page dessinait un sablier.
           Tout se mesure désormais à la même justification, dont hérite la grille
           des cartes d'AccueilCards (qui garde son ancienne valeur en repli, au cas
           où ce composant servirait ailleurs un jour). ⛔ Changer cette valeur les
           déplace TOUS ensemble : c'est le but, ne pas la redonner bloc par bloc. */
        .accueil { --accueil-mesure: 55rem; }
        .colophon-body { font-family: var(--font-source-serif), Georgia, serif; }
        .colophon-ornement { font-size: 1.125rem; color: var(--cs-texte-second); letter-spacing: 0.25em; }
        .colophon-regle { display: block; width: 36px; height: 1px; background: var(--cs-or-doux); margin: 0 auto; }
        /* La marque qui ferme la page. C'était le fleuron ❧, un CARACTÈRE : son
           dessin dépendait donc de la police que le système voulait bien lui donner,
           et il ne disait rien du site. C'est maintenant le CHIFFRE de Corpus
           Scriptura — le C et le S entrelacés, gravés pour lui.
           ⛔ La planche ne sert que d'ALPHA : elle est posée en MASQUE, et c'est le
           fond de l'élément qui peint. L'or est celui que portait le fleuron ; seul
           le dessin change. Voir la charte, « Le monogramme CS ».
           ⚠️ Ce chiffre n'est PAS le monogramme du frontispice : celui-là est une
           lettrine gothique, celui-ci une capitale didone. Deux dessins, deux
           emplois, deux fichiers. */
        .colophon-marque {
          display: inline-block; height: 1.75rem; aspect-ratio: 535 / 512; width: auto;
          background-color: var(--cs-or);
          -webkit-mask: url("/ornements/chiffre-cs.png") no-repeat center / contain;
          mask: url("/ornements/chiffre-cs.png") no-repeat center / contain;
        }
        /* ⛔ PLUS DE MONOGRAMME EN TÊTE (décision de l'auteur, 27 août 2026).
           Le frontispice tenait en quatre temps — la marque, le nom, un filet
           gravé, la devise ; il en tient trois. La marque reste à sa place dans
           la barre de navigation, où elle est présente sur TOUTES les pages :
           répétée juste dessous, elle ne disait rien de plus, et sa masse poussait
           au second rang le titre, qui est l'enseigne véritable. La planche
           « /logo/monogramme-encre.png » n'est donc plus appelée par aucune page.
           ⚠️ Le commentaire vit DANS un gabarit de chaîne : un accent grave autour
           d'un chemin la fermerait, et la page tomberait en 500.
           Le titre porte seul, et se prend d'un cran plus haut en conséquence. */
        /* La gravure ferme le titre au lieu de l'annoncer. Son intensité suit sa
           place : 0,72, comme toute gravure qui porte encore le propos, et non
           les 0,42 à 0,5 d'un cul-de-lampe qui n'orne qu'un vide. */
        .hero-filet-grave { width: min(265px, 48vw); height: auto; display: block; margin: 2px auto 14px; opacity: .72; }
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
          max-width: var(--accueil-mesure);
          margin: 24px auto 0;
        }
        .accueil-carte {
          background: var(--cs-fond-clair);
          border: 1px solid var(--cs-bord-clair);
          border-radius: 12px;
          box-shadow: var(--cs-ombre-flottante);
          padding: 18px 24px 18px;
          box-sizing: border-box;
        }
        .accueil-stats {
          display: flex;
          align-items: stretch;
          width: 100%;
          max-width: var(--accueil-mesure);
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
        .accueil-stat + .accueil-stat { border-left: 1px solid var(--cs-bord-clair); }
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
          font-size: 0.875rem;
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
        /* ⚠️ 900 et non plus 760, et c'est le seuil de la charte (celui de
           useEstMobile). Entre les deux, les volets tenaient bien deux colonnes,
           mais de 365 px : la liste des ajouts y cassait tous ses titres sur deux
           ou trois lignes, et le mot de l'auteur, plus court, se creusait d'autant.
           Deux colonnes qu'on doit lire en escalier n'en valent pas une. */
        @media (max-width: 900px) {
          .accueil-volets { grid-template-columns: 1fr; }
        }
        /* ⚠️ Le bandeau ne suit PAS les volets, et il ne faut pas les fondre en un
           seul seuil. Un volet de texte devient illisible bien avant qu'une tuile de
           chiffre ne manque de place : les cinq tuiles tiennent encore leur rang à
           640 px, où deux colonnes de prose ne tiendraient plus depuis longtemps.
           Passé à 900 comme les volets, le bandeau ouvrait à 768 px deux colonnes de
           360 px pour y loger un nombre à deux chiffres. */
        @media (max-width: 640px) {
          .accueil-stats { flex-wrap: wrap; }
          /* Deux tuiles par rang, la cinquième prenant le rang entier : les filets
             passent de la verticale à l'horizontale, sinon les tuiles flottent sans
             rien qui les tienne. */
          .accueil-stat { flex: 1 0 44%; padding: 13px 8px; }
          .accueil-stat + .accueil-stat { border-left: none; }
          .accueil-stat:nth-child(n + 3) { border-top: 1px solid var(--cs-bord-clair); }
        }
        @media (max-width: 640px) {
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
        background: "var(--cs-fond)",
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
          padding: "clamp(30px, 5vh, 64px) 0 0",
        }}>
        {/* Le frontispice tient en TROIS temps : le nom, un filet gravé, la devise.
            Il en comptait sept jusqu'au 2026-08-19, puis quatre, la marque ouvrant
            la page ; elle en est retirée le 2026-08-27 (voir la note du bloc de
            style). La gravure fait à elle seule le travail du filet, et elle le fait
            EN PIED, où sa place est (charte, « Une gravure se pose en pied »).
            ⚠️ Le blanc au-dessus est monté d'un cran, le titre ayant pris la tête :
            une page de titre respire au-dessus de son premier mot. */}
        <header style={{ textAlign: "center", marginBottom: "24px" }}>
          {/* Titre principal — il ouvre la page, sans marque au-dessus de lui. */}
          <h1 style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            /* Un cran plus haut depuis le retrait de la marque : le titre est seul à
               ouvrir la page, et la masse qu'elle portait lui revient. Bornes en rem,
               jamais en px : elles suivent la police racine fluide. */
            fontSize: "clamp(2rem, 4.8vw, 3.625rem)",
            fontWeight: "normal",
            color: "var(--cs-encre-fonce)",
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            paddingLeft: "0.04em",
            marginBottom: "10px",
          }}>
            Corpus Scriptura
          </h1>

          {/* Le filet du frontispice : la gravure elle-même, qui EST un filet.
              En <img> et non en <Image> — elle porte une couche alpha, et
              l'optimiseur l'aplatit par intermittence sur du blanc, si bien que
              le rectangle crème reparaît (charte, « Les ornements se DÉTOURENT »).
              Elle était justement rendue en <Image> jusqu'ici. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/home-title-ornament.png" alt="" aria-hidden="true"
            className="hero-filet-grave" />

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
          {/* ⛔ PAS `--cs-etiquette` ici, malgré la forme d'étiquette. Ce jeton est un
              khaki doré, #9e8e6a au Clair : sous le vert d'encre de la ligne qui
              précède, les deux lignes du frontispice tenaient deux familles de couleur
              étrangères l'une à l'autre, et le couple sonnait faux. Elles se tiennent
              maintenant dans le MÊME ton, à un pas d'écart.
              ⚠️ Le pas se prend en MÊLANT l'accent au papier, non en écrivant une
              valeur : au Cuir, où `--cs-vert` vire à l'or et `--cs-fond` au brun, le
              même calcul rend le même rapport. La quantité de vert est réglée pour
              que la ligne garde EXACTEMENT le poids qu'elle avait — on change sa
              famille, non sa place dans la hiérarchie. */}
          <p style={{
            fontSize: "0.625rem",
            fontWeight: 600,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "color-mix(in oklab, var(--cs-vert) 78%, var(--cs-fond))",
          }}>
            Somme collaborative
          </p>
        </header>

        {/* L'ancre sert la planche des illustrations, qui renvoie ici pour montrer
            les trois icônes de carte en place.

            ⛔ `width: 100%` N'EST PAS UN ORNEMENT : sans lui les trois cartes
            disparaissent, et c'est cette ancre qui les a fait disparaître le
            2026-08-24. Ce conteneur est un enfant de flex en colonne réglé sur
            `align-items: center` : sa largeur se calcule donc sur son contenu. Or
            tout ce qui garnit une carte est en `position: absolute`, si bien que la
            grille ne réclame pour elle-même que ses bordures — trois cartes de 2 px,
            invisibles à l'œil. Le `width: 100%` d'`.ac-root` se mesurait alors sur ce
            presque-rien. Tant que `<AccueilCards />` était l'enfant direct du flex,
            son 100 % portait sur la largeur de `<main>`, qui est définie ; l'ancre
            glissée au milieu a rompu la chaîne. Toute enveloppe posée ici doit donc
            porter une largeur. */}
        <div id="cartes" style={{ width: "100%", scrollMarginTop: "3.5rem" }}>
          <AccueilCards />
        </div>

        {/* ── Trois volets : un mot · ajouts récents · statistiques ─────────── */}
        <div className="accueil-volets">
          <VoletUnMot />
          <VoletAjouts recentes={recentes} />
        </div>
        <BandeauStats
          nbTextes={nbTextes}
          nbAuteurs={nbAuteurs}
          nbTraductions={nbTraductions}
          pourcentVerifie={pourcentVerifie}
          nbContributeurs={nbContributeurs}
        />
        </div>
      </main>

      {/* ── À propos — style colophon ─────────────────────────────────────── */}
      <div id="apropos" style={{ background: "var(--cs-fond-doux)", scrollMarginTop: "3.5rem", borderTop: "1px solid var(--cs-bord)" }}>
        <div style={{
          maxWidth: "35rem",
          margin: "0 auto",
          padding: "72px 32px 80px",
          textAlign: "center",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          color: "var(--cs-texte-fort)",
        }}>

          {/* En-tête colophon. ⛔ PLUS DE FLEURON AU-DESSUS DU TITRE (décision de
              l'auteur, 27 août 2026). Un ❧ l'annonçait, un second le fermait juste
              dessous avec ses filets : deux ornements pour un seul titre, et le
              premier butait devant le nom de la section avant qu'on sache de quoi
              il retourne. Le fleuron à filets qui SUIT le titre demeure, comme sous
              chaque section — un ornement ferme un texte, il ne l'annonce pas
              (charte, « Une gravure se pose en pied »). */}
          <div style={{ marginBottom: "46px" }}>
            <h2 style={{
              fontSize: "clamp(1.1875rem, 2.8vw, 1.5rem)",
              fontWeight: "normal",
              color: "var(--cs-texte-fort)",
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
            {/* La pyramide garde un interligne PLUS LARGE que la prose : ses lignes
                sont des lignes de colophon, chacune se lisant pour elle-même. Elle
                suit tout de même le resserrement du 27 août, de 2,1 à 1,85, sans quoi
                elle aurait paru deux fois plus aérée que le texte qu'elle ferme. */}
            <div style={{ fontSize: "0.8125rem", lineHeight: "1.85", color: "var(--cs-texte-second)", letterSpacing: "0.01em" }}>
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

            {/* Marque finale — voir la règle .colophon-marque. */}
            <div style={{ marginTop: "42px", lineHeight: 1 }}>
              <span className="colophon-marque" aria-hidden="true" />
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
      <span style={{ fontSize: "1.125rem", color: "var(--cs-or)", lineHeight: 1 }}>❧</span>
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

// Prose du colophon. L'interligne est RESSERRÉ (décision de l'auteur, 27 août 2026) :
// il valait 1,75, c'est-à-dire le double de la hauteur d'œil d'un sérif à ce corps, et
// les paragraphes s'y délitaient en lignes indépendantes. À 1,55 le bloc redevient un
// paragraphe. ⚠️ C'est la seule mesure qui bouge : le corps, l'encre et le blanc entre
// les sections ne changent pas, sans quoi l'on ne saurait plus ce qui a produit l'effet.
const paraStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  lineHeight: "1.55",
  color: "var(--cs-texte-fort)",
  margin: 0,
}

/* ── Trois volets d'accueil ───────────────────────────────────────────────── */

// Texte du « mot » : condensé (interligne, approche des lettres et des mots réduites),
// centré.
const motStyle: React.CSSProperties = {
  fontFamily: "var(--font-source-serif), Georgia, serif",
  fontSize: "0.78125rem",
  lineHeight: 1.38,
  letterSpacing: "-0.006em",
  wordSpacing: "-0.03em",
  color: "var(--cs-texte)",
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
  color: "var(--cs-or)",
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
      <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.1875rem", fontWeight: "normal", color: "var(--cs-encre-fonce)", margin: "0 0 12px", letterSpacing: "0.01em" }}>Un mot</h2>
      {/* Le mot garde sa MESURE quand le volet passe à une colonne. En dessous de
          900 px les deux volets s'empilent et prennent toute la page : le texte,
          qui est CENTRÉ, y courait alors sur sept cents pixels, et l'œil perdait le
          début de la ligne suivante. Le bloc se borne et reste centré dans sa carte. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "30rem", width: "100%", margin: "0 auto" }}>
        <p style={motStyle}><em>Corpus Scriptura</em> est un chantier mené seul, lentement, texte après texte. Mon intention est de rendre accessibles les Écritures et les écrits des Pères de l&rsquo;Église, anciens ou difficiles d&rsquo;accès, en les établissant, en les contrôlant et en les reliant entre eux.</p>
        <p style={motStyle}>L&rsquo;accès au site restera gratuit. Si ce travail vous paraît utile, tout soutien, même modeste, est bienvenu : il permet de consacrer davantage de temps à la lecture, à l&rsquo;édition des textes, à leur vérification et à leur mise en ordre.</p>
      </div>
      {/* PIED SOLIDAIRE : signature et bouton descendent ENSEMBLE au bas de la carte.
          Le bouton seul y descendait, et le blanc que lui laisse le volet voisin,
          toujours plus haut, s'ouvrait alors ENTRE « SQDV » et « Soutenir le projet » :
          la signature restait accrochée au texte et le bouton flottait seul, quatre-vingts
          pixels plus bas. Le blanc se met maintenant là où une carte en veut, entre le
          corps et son pied. « Merci. » se tient juste au-dessus de SQDV. */}
      <div style={{ marginTop: "auto", paddingTop: "20px" }}>
        <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "var(--cs-texte)", margin: "0 0 2px" }}>Merci.</p>
        <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "var(--cs-or)", letterSpacing: "0.14em", margin: "0 0 16px" }}>SQDV</p>
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
      <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.1875rem", fontWeight: "normal", color: "var(--cs-encre-fonce)", margin: "0 0 12px", letterSpacing: "0.01em" }}>Ajouts récents</h2>
      {recentes.length === 0 ? (
        <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "var(--cs-texte-doux)", fontStyle: "italic", margin: 0 }}>Aucun ajout pour l&rsquo;instant.</p>
      ) : (
        // Liste centrée EN BLOC (largeur au contenu, marges automatiques), texte aligné à gauche.
        <ul style={{ listStyle: "none", margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", gap: "8px", flex: 1, width: "fit-content", maxWidth: "100%", textAlign: "left" }}>
          {recentes.map(o => (
            /* Date à GAUCHE (colonne fixe) ; « lire » révélé à droite au survol. */
            <li key={o.id_oeuvre} className="ajout-item" style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.65625rem", color: "#a99a78", whiteSpace: "nowrap", flexShrink: 0, minWidth: "6.5rem" }}>{formaterDateAjout(o.date_mise_en_ligne)}</span>
              <Link href={`/oeuvre/${o.id_oeuvre}`} style={{ position: "relative", flex: 1, minWidth: 0, display: "block", textDecoration: "none", color: "inherit", fontFamily: "var(--font-source-serif), Georgia, serif" }}>
                <span className="ajout-titre" style={{ display: "block", fontSize: "0.78125rem", color: "var(--cs-texte-fort)", lineHeight: 1.32 }}>
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

function BandeauStats({ nbTextes, nbAuteurs, nbTraductions, pourcentVerifie, nbContributeurs }: {
  nbTextes: number;
  nbAuteurs: number;
  nbTraductions: number;
  pourcentVerifie: number | null;
  nbContributeurs: number;
}) {
  // Une tuile ne paraît que si son chiffre a un sens : mieux vaut quatre tuiles que
  // cinq dont une annonce « 0 % ». Les filets étant posés par la règle
  // `.accueil-stat + .accueil-stat`, la barre se recompose quel qu’en soit le nombre.
  const stats = [
    { icon: <IconeLivre />, valeur: nbTextes.toLocaleString("fr-FR"), label: "Textes disponibles" },
    { icon: <IconeTraductions />, valeur: nbTraductions.toLocaleString("fr-FR"), label: nbTraductions > 1 ? "Traductions bibliques" : "Traduction biblique" },
    { icon: <IconeAuteurs />, valeur: nbAuteurs.toLocaleString("fr-FR"), label: "Auteurs répertoriés" },
    pourcentVerifie === null ? null : { icon: <IconeCheck />, valeur: `${pourcentVerifie} %`, label: "Textes vérifiés" },
    nbContributeurs < 1 ? null : { icon: <IconeContrib />, valeur: nbContributeurs.toLocaleString("fr-FR"), label: nbContributeurs > 1 ? "Contributeurs" : "Contributeur" },
  ].filter((s) => s !== null)
  return (
    <div className="accueil-carte accueil-stats">
      {stats.map((s, i) => (
        <div key={i} className="accueil-stat">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ color: "var(--cs-vert)", display: "inline-flex" }}>{s.icon}</span>
            <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.5rem", color: "var(--cs-encre-fonce)", lineHeight: 1 }}>{s.valeur}</span>
          </div>
          <div style={{ fontSize: "0.6875rem", letterSpacing: "0.03em", color: "var(--cs-texte-gris)", marginTop: "6px", textAlign: "center", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>{s.label}</div>
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

