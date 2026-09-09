import Link from "next/link";
import AccueilCards from "../components/AccueilCards";
import VisiteDeLAccueil from "./VisiteDeLAccueil";
import IconeChevron from "@/app/components/IconeChevron";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { auteurDeLigne, auteursDuCorpus, type AuteurDuCorpus } from "@/app/lib/auteursDuCorpus";
import { cssServi } from "@/app/lib/cssServi";
import { enTetesPartage } from "@/app/lib/metadonneesSeo";

// La devise du frontispice, mot pour mot. « Lectures bibliques et patristiques »
// décrivait un rayon de bibliothèque ; la phrase dit ce que le site FAIT, et que
// nul autre ne fait.
const DEVISE = "La Bible à la lumière des Pères, les Pères à la lumière de la Bible.";

export const metadata = {
  title: { absolute: "Corpus Scriptura" },
  description: DEVISE,
  // ⚠️ L'ACCUEIL EST À `/accueil`, ET C'EST LUI QUI FAIT FOI. La racine `/` sert la
  // Bible dès qu'elle porte des paramètres et redirige ici quand elle n'en a pas
  // (app/page.tsx) : sans canonique, la page la plus liée du site serait une
  // redirection vers une page qui ne se désigne pas. Le plan du site pointe la même
  // adresse (app/sitemap.ts) — les deux se relisent ensemble.
  alternates: { canonical: "/accueil" },
  // ⛔ Le layout racine porte bien un Open Graph, mais celui du SITE : sans cette
  // reprise, une page qui redéfinit sa description partage l'ancienne. Le titre et la
  // description de l'aperçu disent désormais ce que la page dit.
  ...enTetesPartage("Corpus Scriptura", DEVISE),
};

// ⛔ PLUS DE BANDEAU DE CHIFFRES (décision de l'auteur, 2026-08-31). Il annonçait
// « 48 · 5 · 536 · 98 % · 1 », c'est-à-dire les cinq chiffres les plus faibles que
// la base sache produire, et deux d'entre eux ne disaient pas ce qu'ils avaient
// l'air de dire : sur les 536 auteurs répertoriés, 15 ont une œuvre publiée et 43
// une notice biographique ; les 98 % de textes vérifiés étaient annoncés par un
// seul contributeur, à côté d'un colophon qui dit que l'IA exige une vérification
// humaine constante. Une page d'accueil se passe mieux d'un chiffre que d'un
// chiffre qui promet plus qu'il ne tient.
//
// ⚠️ La fonction `statistiques_accueil()` demeure en base et sert encore
// `/api/chiffres`, donc la page d'ouverture `/chantier` : ne pas la supprimer.

// « Ajouts récents » : jusqu'à NB_AJOUTS œuvres, dans l'ordre où elles ont été mises en
// ligne. La date affichée est celle de la base.
//
// ⚠️ Plusieurs œuvres importées d'un même lot partagent leur date, et la liste répète
// alors le même jour : c'est la vérité de l'ajout, et un chantier mené par lots ressemble
// à cela.
const NB_AJOUTS = 5;

// ⚠️ Il en était tiré NEUF pour n'en montrer que cinq : quatre lignes parcouraient le
// réseau à chaque visite pour être jetées. Les deux constantes n'en font plus qu'une.

type OeuvreRecente = { id_oeuvre: string; titre: string; date_mise_en_ligne: string | null; auteur: string };

export default async function AccueilPage() {
  const supabase = await creerSupabaseServeur();
  // Une œuvre est publiée quand elle porte `acces_public` — le drapeau que lisent
  // aussi les politiques RLS (app/lib/oeuvresPublication.ts). On filtre, trie et
  // limite EN BASE, plutôt que de rapatrier toute la table pour n'afficher que
  // quelques ajouts récents.
  //
  // ⚠️ C'est désormais la SEULE lecture de la page : le bandeau en coûtait deux de
  // plus, dont un appel de fonction qui agrège tout le corpus.

  // ⚠️ DEUX lectures, mais UNE SEULE VAGUE. Un aller-retour vers Supabase coûte
  // environ 65 ms quoi qu'il transporte, et c'est leur mise en CASCADE qui se voit,
  // jamais leur nombre : celles-ci ne dépendent pas les unes des autres, elles
  // partent donc ensemble.
  const [oeuvresRes, coSignaturesRes] = await Promise.all([
    // ⛔ UNE SEULE lecture d'« oeuvres » pour les DEUX blocs de la porte. Il y en avait
    // deux, sur la même table et le même filtre : l'une prenait les neuf dernières mises
    // en ligne, l'autre les quarante-huit œuvres offertes avec leur auteur. La seconde
    // contenait déjà la première. Mesuré : 91 ms et 83 ms côte à côte, contre 69 ms
    // fondues, pour 9,5 Ko au lieu de 6,8 — sur un lien serveur à serveur, ce sont les
    // ALLERS-RETOURS qui coûtent, jamais les octets.
    //
    // ⚠️ L'ordre reste celui de la BASE, et c'est la condition pour que la fusion soit
    // licite : on ne trie rien ici, on prend les premiers d'une liste déjà ordonnée. Un
    // tri rejoué en JavaScript perdrait le départage des œuvres entrées le même jour,
    // qui sont la majorité.
    supabase
      .from("oeuvres")
      .select("id_oeuvre, titre, date_mise_en_ligne, auteurs!oeuvres_id_auteur_fkey(id_auteur, nom, date_debut_annee)")
      .eq("acces_public", true)
      .order("date_mise_en_ligne", { ascending: false, nullsFirst: false })
      .order("id_oeuvre", { ascending: false }),
    // Les CO-SIGNATAIRES. ⛔ Sans elles, Rufin d'Aquilée disparaît de la galerie : il
    // est le second auteur de l'Histoire ecclésiastique, et « oeuvres.id_auteur » ne
    // porte que le premier (AGENTS.md, « Une œuvre à plusieurs auteurs »).
    supabase
      .from("oeuvres_auteurs")
      .select("id_oeuvre, auteurs(id_auteur, nom, date_debut_annee)"),
  ]);

  // ⚠️ Un panneau qui se rend VIDE quand sa requête échoue ne se distingue pas d'un
  // panneau qui n'a rien à montrer. Le cas n'est pas d'école : « anon » n'a
  // aujourd'hui aucun droit de lecture sur « oeuvres » ni sur « auteurs », de sorte
  // qu'à l'ouverture du site les deux blocs de cette porte se rendront vides. Au
  // moins le journal du serveur le dira.
  for (const lecture of [
    { nom: "œuvres offertes", erreur: oeuvresRes.error },
    { nom: "co-signatures", erreur: coSignaturesRes.error },
  ]) {
    if (lecture.erreur) console.error(`[accueil] lecture « ${lecture.nom} » : ${lecture.erreur.message}`);
  }

  // ⛔ L'ordre est celui de la base — date décroissante, puis identifiant — et il ne se
  // rejoue pas ici : un tri par la seule date perdrait le départage des œuvres entrées le
  // même jour, qui sont la majorité.
  // Les lignes servent DEUX fois, et c'est tout l'objet de la fusion : elles portent
  // l'auteur de chaque œuvre offerte, et leur tête est le journal des ajouts.
  const signatures = (oeuvresRes.data ?? []).map((o: Record<string, unknown>) => ({
    id_oeuvre: o.id_oeuvre as string,
    auteur: auteurDeLigne(o.auteurs),
  }));
  const recentes: OeuvreRecente[] = (oeuvresRes.data ?? []).slice(0, NB_AJOUTS).map((o: Record<string, unknown>) => ({
    id_oeuvre: o.id_oeuvre as string,
    titre: o.titre as string,
    date_mise_en_ligne: (o.date_mise_en_ligne as string | null) ?? null,
    auteur: auteurDeLigne(o.auteurs)?.nom ?? "",
  }));
  const coSignatures = (coSignaturesRes.data ?? []).map((o: Record<string, unknown>) => ({
    id_oeuvre: o.id_oeuvre as string,
    auteur: auteurDeLigne(o.auteurs),
  }));
  const auteurs = auteursDuCorpus(
    [...signatures, ...coSignatures],
    new Set(signatures.map(s => s.id_oeuvre)),
  );

  return (
    <div className="accueil">
      {/* ⚠️ Les commentaires de ce bloc font partie du littéral, donc du HTML servi :
          mesurés, ils y pesaient 12 Ko sur 19,3. On les retire au SERVICE, jamais de la
          source — ils portent la doctrine du dessin, et c'est ici qu'on la relit. */}
      <style>{cssServi(`
        html { scroll-behavior: smooth; }
        /* ── UNE SEULE MESURE pour toute la colonne d'accueil ────────────────
           Les cartes tenaient dans 42,5rem quand les volets et le bandeau en prenaient
           58 : sur un grand écran, le bloc le plus important de la page — celui par où
           l'on entre — était le plus étroit, en retrait de 124 px de chaque côté sur
           les autres. La page dessinait un sablier. Tout se mesure désormais à la même
           justification, dont hérite la grille des cartes d'AccueilCards (qui garde son
           ancienne valeur en repli, au cas où ce composant servirait ailleurs un jour).
           ⛔ Changer cette valeur les déplace TOUS ensemble : c'est le but, ne pas la
           redonner bloc par bloc. */
        .accueil { --accueil-mesure: 55rem; }

        /* ── L'or QU'ON PEUT LIRE ────────────────────────────────────────────
           --cs-or rend 3,80 sur le papier : au-dessous du seuil, et c'est justement
           lui qui portait le bouton de don, la signature et les dates des ajouts.
           On ne change pas l'or de la page, on en tire une encre.
           ⛔ Le pas se prend sur --cs-texte-fort, non sur une valeur écrite : au Clair
           il fonce l'or, au Cuir il l'éclaircit, et le rapport tient dans les deux
           thèmes sans qu'on ait deux règles à entretenir.

           ⚠️ 68 %, ET LA MÊME RÈGLE PRISE EN DÉFAUT TROIS FOIS DE SUITE. Elle disait :
           une encre se mesure contre TOUS les fonds qu'un thème peut lui donner. À 78 %
           on l'avait mesurée sur --cs-fond-clair, le fond de la carte du mot ; le cadre
           retiré, le vrai sol était --cs-fond-doux, et 78 % n'y rendait que 4,49. À 74 %
           on l'a mesurée sur --cs-fond-doux — et l'on a encore oublié un fond, celui que
           l'objet S'AJOUTE : la pastille du bouton pose sur la bande un aplat d'or à
           9 %, qui porte le sol sous l'encre à rgb(230,223,211) au lieu de
           rgb(237,233,226). Mesuré là : 4,32, sous le seuil, sur le SEUL appel à
           l'action de la page.
           ⛔ Le fond d'un texte n'est pas celui de la bande qui le porte, c'est celui
           du dernier aplat posé sous lui — le sien compris.
           Mesuré à 68 %, au Clair : 4,73 dans la pastille, 5,17 sur le papier doux
           (la signature), 5,71 sur le papier du seuil (les dates). Au Cuir : 6,76,
           7,88 et 9,17. Les trois usages du jeton montent ensemble. */
        .accueil { --cs-or-lisible: color-mix(in oklab, var(--cs-or) 68%, var(--cs-texte-fort)); }

        .colophon-ornement { font-size: 1.125rem; color: var(--cs-texte-second); letter-spacing: 0.25em; }
        /* La marque qui ferme la page. C'était le fleuron ❧, un CARACTÈRE : son dessin
           dépendait donc de la police que le système voulait bien lui donner, et il ne
           disait rien du site. C'est maintenant le CHIFFRE de Corpus Scriptura, gravé
           pour lui. ⛔ La planche ne sert que d'ALPHA : elle est posée en MASQUE, et
           c'est le fond de l'élément qui peint.
           ⚠️ C'est la MÊME marque que la barre de navigation depuis le 2026-09-06, et
           c'est tout ce qui a changé : la barre portait jusque-là une lettrine gothique,
           si bien que le site avait deux marques et n'en imposait aucune. Ici elle est
           d'or et ferme un colophon ; là-haut elle prend l'encre du nom et ouvre la
           barre. Une seule planche, deux encres. */
        .colophon-marque {
          display: inline-block; height: 1.75rem; aspect-ratio: 535 / 512; width: auto;
          background-color: var(--cs-or);
          -webkit-mask: url("/ornements/chiffre-cs.png") no-repeat center / contain;
          mask: url("/ornements/chiffre-cs.png") no-repeat center / contain;
        }

        /* ── La gravure suit la DEVISE, qui est une phrase ────────────────────
           Elle valait 265 px, taillée pour « Lectures bibliques et patristiques »
           (249,5 px mesurés) qu'elle fermait de justesse. La devise en fait le double :
           un filet plus court que la ligne qu'il annonce ne ferme plus rien, il flotte.
           La planche fait 2062 px de large, elle a la matière. */
        .hero-filet-grave { width: min(26rem, 62vw); height: auto; display: block; margin: 4px auto 16px; opacity: .72; }

        .colophon-pyr-mobile { display: none; }

        /* ── LE SEUIL : la porte occupe l'écran, et rien n'y est coupé ────────
           ⛔ 100dvh et non 100vh : sur téléphone la barre d'adresse se rétracte, et
           100vh mesure l'écran SANS elle. La porte débordait donc d'une centaine de
           pixels à l'arrivée, exactement là où elle doit tenir entière.

           ⚠️ CETTE PROMESSE SE VÉRIFIE, ET LA VÉRIFIER DEMANDE DE SAVOIR OÙ ON MESURE.
           La police racine du site est FLUIDE et suit la LARGEUR — clamp(16px, 7px +
           0,625vw, 22px) — de sorte que TOUT ce qui est en rem se réduit avec elle. Une
           mesure prise sur un seul écran ne se transpose donc pas : l'audit du
           2026-09-09 a d'abord conclu, depuis un écran de 2844 px de large (racine 22),
           que la porte manquait de 195 à 470 px sur un portable. C'était faux d'un
           facteur trois. Remesuré écran par écran, en forçant la racine ET les clamps
           en « vw » :

             2844×1350 (racine 22)  1082 pour 1273 — il RESTE 191
             1920×1080 (racine 19)   918 pour  879 — manque  40
             1680×1050 (racine 17,5) 860 pour  854 — manque   6
             1512×982  (racine 16,4) 811 pour  792 — manque  19
             1440×900  (racine 16)   784 pour  744 — manque  40
             1366×768  (racine 16)   760 pour  614 — manque 146

           ⛔ LE JOURNAL RESTE DONC DANS LA PORTE (décision de l'auteur, 2026-09-09 :
           « je veux les ajouts récents sur la première page »). Le manque n'est que de
           quelques dizaines de pixels, et il se rend par les BLANCS — voir l'échelle de
           crans plus bas. Seul un 1366×768 demande davantage, et c'est là qu'on se
           débrouille autrement.
           ⚠️ Se remesure ainsi : forcer la racine et les clamps en vw pour l'écran visé,
           puis sommer les enfants de « .accueil-seuil » avec leurs marges et les
           rembourrages. Une mesure prise à une seule largeur ne dit rien des autres. */
        .accueil-seuil {
          min-height: calc(100dvh - 3.5rem);
          background: var(--cs-fond);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 4vh, 56px) 24px clamp(28px, 5vh, 64px);
          box-sizing: border-box;
        }
        /* ⚠️ Ce qui suit la porte commence sur l'AUTRE papier, et la couture se voit :
           c'est elle qui dit qu'il y a une suite. Sans ce changement de fond, la porte
           n'a plus de bord et l'on ne sait pas qu'on la franchit.
           ⚠️ Le mot y est SEUL. Le journal des ajouts y a passé une heure le 2026-09-09,
           et c'était un contresens : cette bande est le mot de celui qui établit les
           textes, non un bulletin. ⛔ Ne rien y ajouter qui ne soit de sa voix. */
        .accueil-suite {
          background: var(--cs-fond-doux);
          border-top: 1px solid var(--cs-bord);
          padding: clamp(36px, 6vh, 72px) 24px clamp(40px, 6vh, 76px);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        /* ⚠️ 184 px et non 176 : deux cartes sur la même justification font 432 px de
           large au lieu de 282, et à hauteur inchangée elles se lisaient comme des
           bandes couchées. Le rapport revient à 2,35. */
        .ac-root { --ac-hauteur: 11.5rem; }

        /* Le blanc qui sépare le frontispice des deux portes. ⚠️ Il vit ICI et non
           dans le style en ligne de l'enveloppe : un style en ligne bat toute règle de
           feuille sans « !important », et l'échelle de crans ne pourrait pas le
           resserrer. */
        #cartes { margin-top: clamp(26px, 4.5vh, 52px); }

        /* ── Le journal, dans l'écran, sous les noms ──────────────────────────
           Pas un carton : une simple colonne posée sur le papier. Un troisième cadre
           sous deux cartons ferait une page de cadres. */
        .accueil-journal {
          width: 100%;
          max-width: var(--accueil-mesure);
          margin: clamp(22px, 3.2vh, 38px) auto 0;
        }
        /* La rubrique à filets — un titre entre deux traits. ⚠️ Elle sert le journal
           ET la galerie des noms, d'où un nom qui ne dit plus « seuil » : le premier a
           quitté la porte le 2026-09-09 pendant une heure, et le nom lui a survécu. */
        .accueil-rubrique {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          margin: 0 0 14px;
        }
        /* ⛔ C'est un h2, non une étiquette. Les deux rubriques de l'accueil étaient
           des « span » : le plan de la page sautait du nom du site à « Un mot », et qui
           navigue par titres ne trouvait ni les auteurs ni les ajouts. Le corps ne
           change pas, la marge du titre se reprend. */
        .accueil-rubrique h2 {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; color: var(--cs-vert); white-space: nowrap;
          margin: 0;
        }
        .accueil-rubrique i { flex: 1; height: 1px; background: var(--cs-bord); font-size: 0; }

        /* ── La galerie de noms — ce que la porte CONTIENT ─────────────────────
           Les deux cartes disent des CATÉGORIES, « Bible » et « Patristique », et
           la page n'avait, hors les ajouts récents, aucun nom propre de contenu :
           ni un Père, ni une œuvre, ni un livre. Un nom est un objet qu'on peut
           vouloir, une catégorie ne l'est pas ; et un nom se BALAYE, là où un
           paragraphe se lit ou, plus probablement, ne se lit pas.
           Elle prend la grammaire des « Ajouts récents », dont elle est la SŒUR :
           celle-ci dit l'ÉTENDUE du corpus, celle-là sa FRAÎCHEUR. Deux rubriques
           à filets ne font pas une répétition, elles font un rythme. */
        .seuil-noms {
          width: 100%;
          max-width: 52rem;
          margin: clamp(22px, 3.2vh, 38px) auto 0;
          text-align: center;
        }
        /* ⚠️ « text-wrap: balance » égalise les trois lignes : sans lui la dernière
           reste courte et la bande paraît tomber. Au delà de la poignée de lignes
           qu'un navigateur accepte d'équilibrer — le cas du téléphone, où la bande
           en prend sept — il s'efface de lui-même et l'enroulement ordinaire
           reprend, sans que rien ne casse. */
        .seuil-noms p {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.8125rem;
          line-height: 1.95;
          letter-spacing: 0.015em;
          color: var(--cs-texte-second);
          text-wrap: balance;
          margin: 0;
        }
        /* ⛔ UN NOM NE SE COUPE JAMAIS EN DEUX, ET SON SÉPARATEUR RESTE AVEC LUI.
           C'est l'enveloppe qui porte les deux, non le lien. Sans l'insécabilité, la
           bande rendait « Cyrille / de Jérusalem » et « Augustin / d'Hippone ». */
        .seuil-noms-nom { white-space: nowrap; }
        /* ⛔ LE SÉPARATEUR EST COLLÉ AU NOM QUI LE PRÉCÈDE. Trois raisons, payées
           l'une après l'autre. Les noms étant insécables, une ligne dont le
           séparateur est lui aussi collé DES DEUX CÔTÉS n'a plus AUCUNE occasion de
           coupure : elle déborde d'un seul tenant hors de l'écran. La coupure se
           fait donc sur l'espace qui SUIT le séparateur. Posé au contraire sur le nom
           SUIVANT — ou sur la mention de queue — il ouvre sa ligne dès que le texte
           se replie, ce qui se voit sur un téléphone.
           ⛔ Et il vit dans l'ENVELOPPE, jamais dans le lien : un « ::after » posé
           sur le lien est peint DANS sa boîte en ligne, si bien que le filet du
           survol courait dessous et qu'on soulignait un point médian. Le point
           n'appartient pas au nom, c'est une ponctuation entre deux noms — il ne doit
           donc être ni souligné ni cliquable.
           ⚠️ Il suit AUSSI le dernier nom : la mention de queue le ferme toujours. */
        .seuil-noms-nom::after {
          content: '·';
          color: var(--cs-or-doux);
          margin-left: 0.5em;
          font-size: 0.9em;
        }
        .seuil-noms a {
          color: inherit;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          padding-bottom: 1px;
          transition: color 0.18s ease, border-color 0.18s ease;
        }
        .seuil-noms a:hover,
        .seuil-noms a:focus-visible { color: var(--cs-vert); border-bottom-color: currentColor; }
        /* La mention de queue. Elle ferme la liste sans en être.
           ⛔ C'EST L'ITALIQUE QUI LA RANGE, PLUS L'ENCRE. Elle portait --cs-texte-doux,
           qui ne rend que 2,71 sur le papier du seuil : la plus mauvaise encre de la
           page, arrivée après les passes qui avaient relevé les dates (2,61) et les
           liens légaux (2,46). Or il n'existe pas, sur ce papier, d'encre à la fois
           plus faible que --cs-texte-second — le rang des noms, 5,24 — et lisible : la
           bande entre 4,5 et 5,24 est trop étroite pour qu'un œil y voie un rang.
           Elle prend donc l'encre des noms, et son rang tient à ce qu'elle est en
           italique et qu'elle n'est pas un lien : elle ne se souligne pas au survol et
           ne porte pas de point médian à sa suite. Mesuré : 5,24 au Clair, 10,01 au
           Cuir. */
        .seuil-noms-suite { font-style: italic; color: var(--cs-texte-second); white-space: nowrap; }

        /* ── Le mot de l'auteur — HORS CADRE ─────────────────────────────────
           Il vivait dans une carte : fond clair, bordure, rayon, ombre portée. C'est
           la forme d'un objet qu'on POSE sur une page ; or ce n'est pas un objet, c'est
           un passage de la prose du site, comme les sections du colophon plus bas. Il
           se compose donc à même le papier (décision de l'auteur, 2026-08-31), et ce
           qui le tenait — le cadre — est rendu par le BLANC.
           ⛔ Il garde sa MESURE : sa prose est CENTRÉE, et centrée sur toute la
           justification l'œil perdrait le début de la ligne suivante. 32rem font 58
           signes par ligne, à un cheveu des 35rem du colophon. */
        .accueil-mot {
          width: 100%;
          max-width: 32rem;
          margin: 0 auto;
          text-align: center;
        }
        /* ⚠️ « Un mot » et « Le projet » sont les DEUX titres de section de la page,
           tous deux en h2, et ils ne se composaient pas au même rang : 19 px pour
           l'un, jusqu'à 24 pour l'autre. Deux frères sémantiques à deux corps
           différents, cela se voit sans qu'on sache pourquoi. Ils prennent la même
           mesure — le clamp du colophon — et le mot est enfin un titre, non une
           étiquette posée sur un paragraphe.
           ⛔ L'ENCRE, elle, ne s'aligne pas : le mot garde « --cs-encre-fonce », le vert
           des titres du site, quand « Le projet » prend « --cs-texte-fort » parce qu'il
           coiffe une prose qui est tout entière de cette encre. Chacun dans le ton de
           sa bande ; c'est le CORPS qui dit le rang, pas la couleur. */
        .accueil-mot h2 {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: clamp(1.1875rem, 2.8vw, 1.5rem);
          font-weight: normal;
          color: var(--cs-encre-fonce);
          line-height: 1.3;
          letter-spacing: 0.02em;
          margin: 0 0 14px;
        }

        .accueil-mot-prose { display: flex; flex-direction: column; gap: 16px; }
        /* Le pied ne « descend » plus au bas d'une carte : il n'y a plus de carte, et
           c'est le blanc qui l'en sépare. ⚠️ « Merci. » se tient juste au-dessus de la
           signature — deux lignes d'un même souffle — et le blanc s'ouvre AVANT elles. */
        .accueil-mot-merci { margin: 38px 0 2px; }
        .accueil-mot-sqdv { margin: 0 0 24px; }

        /* Ajouts récents : au survol, « Lire » remplace TOUTE la ligne auteur-titre
           (la date, elle, reste). Fondu croisé : le titre s'efface, « Lire » — en
           lettres espacées, sobre et large — apparaît à sa place. */
        /* ⛔ « LIRE » SE POSE À DROITE DU TEXTE, IL NE LE REMPLACE PLUS (décision de
           l'auteur, 2026-08-31). Le titre restait invisible pendant tout le survol :
           on désignait une ligne pour la voir disparaître, et l'on ne savait plus ce
           qu'on s'apprêtait à ouvrir.
           ⛔ ET LA LISTE NE BOUGE PAS D'UN PIXEL. Elle est en « width: fit-content »
           et centrée : une mention qui n'occuperait sa place qu'au survol élargirait
           la grille et décalerait la colonne entière à chaque passage du curseur. La
           place est donc RÉSERVÉE D'AVANCE, visible ou non — c'est le procédé du
           chevron doublé de la barre de navigation, et pour la même raison. Le blanc
           qu'elle laisse au repos ne se voit pas : le bloc est centré et son bord
           droit est déjà ragué.
           ⚠️ Elle reste dans le FIL du texte, en « inline-flex » sur la ligne de base :
           aucune position absolue n'a ainsi à deviner où le texte s'arrête, et la
           mention suit le dernier mot même quand un titre se replie sur deux lignes. */
        .ajout-item .ajout-lire {
          /* ⚠️ « center » et non « baseline » : le chevron est un inline-flex qui ne
             porte aucun texte, sa ligne de base est donc SYNTHÉTISÉE sur son bord
             inférieur, et il flottait au-dessus du mot. Centré, il retrouve la ligne
             optique de « Lire ». */
          display: inline-flex; align-items: center; gap: 5px;
          margin-left: 0.85em;
          white-space: nowrap;
          opacity: 0; transform: translateX(-5px);
          transition: opacity 0.24s ease, transform 0.34s cubic-bezier(0.22,0.61,0.36,1);
          pointer-events: none;
        }
        .ajout-item:hover .ajout-lire { opacity: 1; transform: translateX(0); }
        /* ⛔ SOUS 640 PX, LA PLACE RÉSERVÉE N'EST PLUS TENABLE, et le seuil compte
           autant que le survol. Sans survol — un doigt — la mention ne paraîtrait
           jamais ; mais même AVEC survol, dans une fenêtre étroite, ses cinquante
           pixels réservés font se replier des titres qui tiendraient sur une ligne.
           Mesuré à 375 px : les CINQ titres se repliaient, et le journal passait de
           184 à 243 px pour rien. Sous ce seuil la porte est déjà dans sa forme
           compacte, les cartes empilées en bandes : une mention de survol n'y a plus
           sa place. Même écriture que la quatrième de couverture des publications. */
        @media (hover: none), (max-width: 640px) {
          .ajout-item .ajout-lire { display: none; }
        }
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
          background: linear-gradient(to right, var(--cs-or), rgba(var(--cs-or-rgb),0.15));
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.36s cubic-bezier(0.22,0.61,0.36,1) 0.05s;
        }
        .ajout-item:hover .ajout-lire-mot::after { transform: scaleX(1); }
        .ajout-lire .fleche { color: var(--cs-or-lisible); transition: transform 0.28s cubic-bezier(0.22,0.61,0.36,1); }
        .ajout-item:hover .ajout-lire .fleche { transform: translateX(4px); }

        /* ── « Soutenir le projet » — l'or MONTE dans la pastille ─────────────
           Le bouton n'avait AUCUN état de survol, et il ne pouvait pas en avoir : il
           était composé en style EN LIGNE, où « :hover » n'existe pas. D'où cette classe.

           L'effet : un aplat d'or qui monte du bas jusqu'à remplir la pastille, pendant
           que l'encre passe au papier. C'est le geste d'un tampon qui s'encre, non un
           bouton qui s'allume, et il appartient à la page — même courbe et même durée
           que le filet doré qui se trace sous « Lire », deux blocs plus haut.

           ⛔ L'aplat est « --cs-or-lisible », jamais « --cs-or » : mesuré, le papier sur
           l'or du site ne rend que 3,66, sous le seuil, quand il rend 5,08 sur l'or
           foncé. Un bouton qu'on ne peut plus lire une fois désigné serait le comble.
           ⚠️ Il est posé en IMAGE de fond, non en couleur : c'est sa HAUTEUR qu'on
           anime (« background-size »), et une couleur ne s'anime pas en hauteur. La
           couleur de fond du repos reste dessous, dans « background-color ». */
        .cs-bouton-soutenir {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.8125rem;
          letter-spacing: 0.03em;
          color: var(--cs-or-lisible);
          text-decoration: none;
          padding: 8px 22px;
          border: 1px solid rgba(var(--cs-or-rgb), 0.55);
          border-radius: 999px;
          background-color: rgba(var(--cs-or-rgb), 0.09);
          background-image: linear-gradient(var(--cs-or-lisible), var(--cs-or-lisible));
          background-repeat: no-repeat;
          background-position: 50% 100%;
          background-size: 100% 0;
          transition: background-size 0.3s cubic-bezier(0.22,0.61,0.36,1),
                      color 0.22s ease, border-color 0.3s ease;
        }
        .cs-bouton-soutenir:hover,
        .cs-bouton-soutenir:focus-visible {
          background-size: 100% 100%;
          border-color: var(--cs-or-lisible);
          color: var(--cs-fond);
        }

        /* ══ L'ÉCHELLE DES CRANS — la porte se resserre EN HAUTEUR ═══════════════
           ⛔ CE SONT DES REQUÊTES DE HAUTEUR, ET C'EST LA SEULE FORME JUSTE. Ce qui
           manque à la porte n'est pas de la largeur mais de la HAUTEUR, et une requête
           de largeur ne le dirait qu'au hasard des proportions d'écran — un ultra-large
           court y échapperait, un carré haut s'y ferait resserrer pour rien.
           ⛔ Et elles se bornent à « min-width: 641px » : sous ce seuil la porte a déjà
           « min-height: 0 » et n'a plus rien à tenir. Resserrer un frontispice de
           téléphone ou retirer un ajout pour faire de la place à une contrainte qui ne
           s'applique plus serait le contraire d'un réglage.
           ⚠️ L'écran de l'auteur (1350 px de haut) ne déclenche AUCUN cran : ce qui va
           bien ne bouge pas. */

        /* ── Cran 1 : les BLANCS, et rien d'autre ────────────────────────────
           Il n'y a que quelques dizaines de pixels à rendre — 40 au pire, sur un
           1920×1080 comme sur un 1440×900 — et ils se prennent là où ils ne coûtent
           rien. Aucun texte ne bouge, aucune gravure ne rapetisse, aucun ajout ne
           disparaît. Les MAXIMA des clamps ne changent pas : au-dessus de ce cran, le
           dessin est celui d'avant, au pixel près. Seules la valeur préférée et la
           borne basse descendent, et c'est la borne basse qui travaille sur un écran
           bas. La hauteur des cartes cède un demi-rem, le seul objet qui n'est pas du
           blanc — 184 px à 172 à la racine 16, où le rapport de la carte reste à 2,51.
           ⚠️ 1100 et non 1000 : un 2560×1080 n'offre que 926 px utiles et il lui faut
           déjà ce cran. Un 1920×1200, qui tiendrait sans lui, s'y trouve pris — il y
           perd cinquante pixels de blanc INTERNE, que le centrage lui rend autour. */
        @media (max-height: 1100px) and (min-width: 641px) {
          .accueil-seuil { padding-top: clamp(18px, 3vh, 56px); padding-bottom: clamp(20px, 3.6vh, 64px); }
          #cartes { margin-top: clamp(20px, 3.4vh, 52px); }
          .seuil-noms, .accueil-journal { margin-top: clamp(16px, 2.4vh, 38px); }
          .ac-root { --ac-hauteur: 10.75rem; }
        }

        /* ── Cran 3 : la racine est à son PLAFOND et l'écran est court ────────
           ⚠️ 2400 px n'est pas un chiffre rond : c'est la largeur où la police racine
           atteint son maximum de 22 px (7 + 0,625vw). Au-delà, tout ce qui est en rem
           cesse de grandir, mais la porte y pèse déjà un tiers de plus qu'à la racine
           16 — et un écran ULTRA-LARGE est souvent COURT. Un 2560×1080 manque encore
           41 px après le cran 1 ; aucun autre format n'est dans ce cas.
           ⛔ Ce cran ne touche NI au journal NI à la galerie : à cette largeur, la place
           ne manque que d'un cheveu, et il n'y a aucune raison de retrancher du contenu
           là où réduire une masse suffit. */
        @media (max-height: 1040px) and (min-width: 2400px) {
          .accueil-seuil header h1 { font-size: clamp(2rem, 4.8vw, 3rem); margin-bottom: 6px; }
          .accueil-seuil header p:nth-of-type(1) { margin-bottom: 6px; }
          .hero-filet-grave { margin: 3px auto 11px; }
          .ac-root { --ac-hauteur: 9.5rem; }
        }

        /* ── Cran 2 : « débrouille-toi autrement » ───────────────────────────
           Un 1366×768 n'offre que 614 px : le cran 1 y rend 46 px, il en manque
           encore une centaine, et aucun blanc ne les porte. On touche donc au dessin,
           dans l'ordre de ce qui coûte le moins au lecteur.
           ⛔ LE JOURNAL PASSE À TROIS ENTRÉES, IL NE DISPARAÎT PAS. C'est la
           consigne : les ajouts récents sont sur la première page, et sur un petit
           écran on en montre MOINS plutôt que pas du tout. ⚠️ Les deux dernières sont
           masquées au rendu, non retirées de la donnée : « NB_AJOUTS » ne bouge pas,
           et la liste redevient entière dès qu'un écran la porte.
           ⚠️ La galerie des noms garde TOUS ses auteurs : c'est son interligne qui se
           resserre, non sa liste. Une porte qui perdrait des noms perdrait des liens.
           ⛔ Le frontispice cède le PLUS : un titre de 58 px, une gravure de 26 et
           trente pixels de blanc, pour annoncer une page qu'on voit déjà. La devise et
           le rang ne bougent pas — ce sont eux qui disent ce que le site fait.
           ⚠️ Il est écrit APRÈS le cran 3, et il le faut : les deux se rencontrent sur
           un très grand écran très court, et c'est le plus serré qui doit l'emporter. */
        @media (max-height: 720px) and (min-width: 641px) {
          .accueil-seuil header h1 { font-size: clamp(1.75rem, 4vw, 2.25rem); margin-bottom: 6px; }
          .hero-filet-grave { width: min(15rem, 45vw); margin: 2px auto 10px; }
          .accueil-seuil header p:nth-of-type(1) { margin-bottom: 6px; }
          .ac-root { --ac-hauteur: 8.75rem; }
          .seuil-noms p { line-height: 1.7; }
          .accueil-journal li:nth-child(n+4) { display: none; }
        }

        /* ⚠️ Le bandeau ne suit PAS le seuil des volets. Un volet de texte devient
           illisible bien avant qu'une tuile de chiffre ne manque de place : les cinq
           tuiles tiennent encore leur rang à 640 px, où deux colonnes de prose ne
           tiendraient plus depuis longtemps. */
        @media (max-width: 640px) {
          /* ⛔ LE PLANCHER TACTILE EST DE 44 PX, et le bouton n'en faisait que 35 :
             c'est le seul appel à l'action de la page, et le plus petit objet qu'on
             y touche. Le corps ne bouge pas, seul le rembourrage. Mesuré : 45 px. */
          .cs-bouton-soutenir { padding: 13px 26px; }
          /* ⚠️ Le mot n'a plus de cadre à rembourrer, mais il lui faut une marge sur
             un téléphone : sans elle sa prose toucherait le bord de l'écran, ce que le
             rembourrage de la carte lui évitait. */
          .accueil-mot { padding: 0 8px; }
          .accueil-mot h2 { margin-bottom: 20px; }
          .accueil-mot-merci { margin-top: 30px; }
          .colophon-pyr-desktop { display: none; }
          .colophon-pyr-mobile { display: block; }
          .colophon-pyr-mobile p { margin: 0 auto; max-width: 90vw; }
          /* Liens légaux empilés, chacun entier sur sa ligne. */
          .liens-legaux { display: flex; flex-direction: column; align-items: center; gap: 9px; }
          .liens-legaux .sep-legal { display: none; }
          .accueil-seuil { min-height: 0; padding-top: 30px; padding-bottom: 40px; }
        }

        /* ── Mouvement réduit ────────────────────────────────────────────────
           Réglage système « moins d'animations » : on garde les ÉTATS et l'on retire
           le trajet. ⛔ Ne jamais éteindre l'opacité elle-même. */
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .ajout-item .ajout-titre, .ajout-item .ajout-lire,
          .ajout-lire-mot::after, .ajout-lire .fleche { transition-duration: 0.01ms !important; }
          .ajout-item .ajout-lire { transform: none; }
          .ajout-item:hover .ajout-lire .fleche { transform: none; }
          /* ⛔ L'or MONTE toujours, il n'est que posé d'un coup : on retire le trajet,
             jamais l'état. Un bouton qui ne répondrait plus au survol serait pire
             qu'un bouton qui répond sans animation. */
          .cs-bouton-soutenir { transition-duration: 0.01ms !important; }
        }
      `)}</style>

      {/* ⛔ `<main>` COIFFE TOUTE LA PAGE, non la seule porte. Il ne tenait que le
          premier écran : le mot, le projet et les liens légaux vivaient dans des
          `<div>` nus, hors de tout repère, invisibles à qui navigue par repères. Le
          contenu est ici, le colophon final dans le `<footer>` qui suit. */}
      <main>
      {/* ══ LA PORTE ═════════════════════════════════════════════════════════ */}
      <section className="accueil-seuil">
        {/* Le frontispice tient en quatre temps : le nom, la gravure qui le ferme, la
            devise, le rang. Il en comptait sept jusqu'au 2026-08-19, puis quatre, la
            marque ouvrant la page ; elle en est retirée le 2026-08-27, la barre de
            navigation la portant déjà sur toutes les pages.
            ⚠️ La devise n'est plus une étiquette de catégorie — « Lectures bibliques et
            patristiques » décrivait un rayon — mais la THÈSE du site. La ligne de rang,
            dessous, dit de quoi le site est fait : des SOURCES, non des commentaires. */}
        <header style={{ textAlign: "center", maxWidth: "40rem" }}>
          <h1 style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            /* Bornes en rem, jamais en px : celles d'un clamp sont ABSOLUES et ne
               suivent pas la police racine fluide, si bien qu'un titre en px se fige
               pendant que le corps du texte grandit autour de lui. */
            fontSize: "clamp(2rem, 4.8vw, 3.625rem)",
            fontWeight: "normal",
            color: "var(--cs-encre-fonce)",
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            paddingLeft: "0.04em",
            margin: "0 0 10px",
          }}>
            Corpus Scriptura
          </h1>

          {/* Le filet du frontispice : la gravure elle-même, qui EST un filet.
              ⛔ En <img> et non en <Image> — elle porte une couche alpha, et
              l'optimiseur l'aplatit par intermittence sur du blanc, si bien que le
              rectangle crème reparaît (charte, « Les ornements se DÉTOURENT »).
              ⛔ MAIS ELLE GARDE SES DIMENSIONS NATIVES (2062×131). Sans elles, et avec
              `height: auto`, le navigateur ne réserve AUCUNE hauteur avant que la
              planche n'arrive : la devise et tout ce qui suit sautaient de 36 px au
              chargement, juste sous le titre. Les attributs ne donnent que le rapport
              — la taille rendue reste celle du CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/home-title-ornament.png" alt="" aria-hidden="true"
            width={2062} height={131} className="hero-filet-grave" />

          {/* La devise. ⚠️ Elle est une PHRASE, et une phrase se coupe : `text-wrap:
              balance` répartit les deux membres de part et d'autre de la virgule au lieu
              de laisser « de la Bible. » tomber seul.
              ⚠️ La coupe optique se FORCE, elle ne se devine pas : Source Serif porte
              l'axe `opsz` et le navigateur le règle sur la taille en pixels, donc sur la
              coupe de LABEUR, plus grasse et plus large. Sous un frontispice gravé, il
              faut celle de TITRAGE. ⛔ `font-variation-settings` écrase `font-weight` :
              toujours redonner « wght » dans la même déclaration. */}
          <p style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: "clamp(1rem, 1.5vw, 1.1875rem)",
            fontStyle: "italic",
            /* ⛔ PLUS DE VERT AU FRONTISPICE (décision de l'auteur, 2026-08-31). La
               devise et le rang prennent l'encre chaude du texte : l'accent vert y
               était la seule couleur de la porte, et il tirait l'œil sur deux lignes
               qui n'ont pas à appeler — le nom les surmonte déjà. */
            color: "var(--cs-texte-fort)",
            letterSpacing: "0.03em",
            lineHeight: 1.45,
            textWrap: "balance",
            fontVariationSettings: '"opsz" 26, "wght" 400',
            margin: "0 auto 10px",
            maxWidth: "34rem",
          }}>
            La Bible à la lumière des Pères, les Pères à la lumière de la Bible.
          </p>

          {/* La ligne de rang. ⛔ PAS `--cs-etiquette` ici, malgré la forme d'étiquette :
              ce jeton est un khaki doré, et il ouvrirait au frontispice une troisième
              famille de couleur. La devise et le rang se tiennent dans la MÊME encre
              chaude, à un pas d'écart, et le pas se prend sur l'échelle du texte —
              `--cs-texte-fort` puis `--cs-texte-second` — que les deux thèmes portent
              déjà. ⚠️ Mesuré : la devise rend 13,83 sur le papier et 14,4 sur le cuir, le
              rang 5,24 et 10,01 — au-dessus du seuil de 4,5 que son corps de 12 px
              lui impose.
              ⛔ Le mélange `color-mix` d'avant, calculé sur `--cs-vert`, est retiré avec
              le vert : il n'avait de sens que pour tenir la ligne dans le ton de la
              devise verte qui la précédait.
              ⚠️ Les petites capitales sont SYNTHÉTISÉES, non gravées : mesuré,
              `font-feature-settings: "smcp"` ne change rien à la largeur du mot, la
              variable de Google ne portant pas la fonte de petites capitales. La graisse
              500 compense le trait plus fin qui en résulte, et `opsz` 10 donne à ces
              capitales espacées la coupe de LABEUR, la seule qui les tienne à ce corps. */}
          <p style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: "0.75rem",
            fontVariantCaps: "small-caps",
            fontWeight: 500,
            letterSpacing: "0.16em",
            fontVariationSettings: '"opsz" 10, "wght" 500',
            color: "var(--cs-texte-second)",
            margin: 0,
          }}>
            Sources bibliques et patristiques en ligne
          </p>
        </header>

        {/* L'ancre sert la planche des illustrations, qui renvoie ici pour montrer les
            icônes de carte en place.

            ⛔ `width: 100%` N'EST PAS UN ORNEMENT : sans lui les cartes disparaissent, et
            c'est cette ancre qui les a fait disparaître le 2026-08-24. Ce conteneur est un
            enfant de flex en colonne réglé sur `align-items: center` : sa largeur se
            calcule donc sur son contenu. Or tout ce qui garnit une carte est en
            `position: absolute`, si bien que la grille ne réclame pour elle-même que ses
            bordures. Toute enveloppe posée ici doit porter une largeur. */}
        {/* ⛔ Le blanc AU-DESSUS des cartes a quitté ce style en ligne pour la feuille
            (« #cartes », plus haut). Un style en ligne bat toute règle de feuille sans
            « !important », et l'échelle de crans en hauteur d'écran ne pouvait donc pas
            le resserrer. La largeur reste ici : elle n'est pas un réglage, elle est la
            condition pour que les cartes existent (voir la note juste au-dessus). */}
        <div id="cartes" style={{ width: "100%", scrollMarginTop: "3.5rem" }}>
          <AccueilCards />
        </div>

        {/* La visite de la barre. Elle ne rend rien tant qu'elle ne s'ouvre pas, et
            rien du tout sur un écran étroit (voir le composant). */}
        <VisiteDeLAccueil />

        <GalerieAuteurs auteurs={auteurs} />

        {/* La preuve que la bibliothèque vit, DANS L'ÉCRAN D'ENTRÉE. Cinq lignes, pas de
            cadre, pas de chiffre.
            ⛔ ELLE NE DESCEND PAS DANS LA BANDE DU MOT (décision de l'auteur,
            2026-09-09). Elle y a passé une heure, et c'était un contresens : cette bande
            est le mot de celui qui établit les textes, et un journal d'ajouts n'y a pas
            sa place. Ce qui l'en avait chassée — la porte qui débordait — se corrige à
            la porte, par une échelle de crans en hauteur d'écran. */}
        <div className="accueil-journal">
          <div className="accueil-rubrique">
            <i />
            <h2>Ajouts récents</h2>
            <i />
          </div>
          <ListeAjouts recentes={recentes} />
        </div>
      </section>

      {/* ══ LA SUITE ═════════════════════════════════════════════════════════
          Le mot y est seul. La bande demeure : c'est le changement de papier qui dit
          qu'on a franchi la porte, et une bande d'un seul bloc reste une bande. */}
      <div className="accueil-suite">
        <VoletUnMot />
      </div>

      {/* ── Le projet — style colophon ────────────────────────────────────── */}
      <section id="apropos" style={{ background: "var(--cs-fond)", scrollMarginTop: "3.5rem", borderTop: "1px solid var(--cs-bord)" }}>
        {/* ⚠️ Le rembourrage du bas vaut 44 px et non 80 : le colophon FINAL est sorti
            d'ici pour devenir le pied de la page, et il emporte son propre blanc du
            bas. Les 44 px sont ceux qui séparaient la dernière section de la pyramide,
            hier une marge, aujourd'hui un rembourrage. La colonne ne bouge pas d'un
            pixel. */}
        <div style={{
          maxWidth: "35rem",
          margin: "0 auto",
          padding: "72px 32px 44px",
          textAlign: "center",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          color: "var(--cs-texte-fort)",
        }}>
          {/* En-tête colophon. ⛔ PAS DE FLEURON AU-DESSUS DU TITRE (décision de
              l'auteur, 27 août 2026) : un ornement ferme un texte, il ne l'annonce pas
              (charte, « Une gravure se pose en pied »). Le fleuron à filets qui SUIT le
              titre demeure, comme sous chaque section. */}
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

          <ColophonSection titre="Origine">
            <p style={paraStyle}><em>Corpus Scriptura</em> est né en 2026. Son objet est d’offrir un accès libre aux textes bibliques, aux œuvres patristiques et aux grands témoins de la tradition chrétienne. Il s’adresse aux chercheurs comme aux simples lecteurs, à tous ceux qui veulent entrer plus avant dans l’intelligence des Écritures.</p>
          </ColophonSection>

          <ColophonSection titre="Les textes">
            <p style={paraStyle}>Chaque source proposée dans <em>Corpus Scriptura</em> appartient au domaine public.</p>
            <p style={paraStyle}>Le corpus s’appuie notamment sur des éditions anciennes qui ont fait date, sur des ressources numériques librement accessibles et sur des ouvrages ou reproductions qu’il faut parfois acquérir pour retrouver des textes rares ou difficilement disponibles. Certaines de ces éditions restent précieuses par leur histoire et leur diffusion, même lorsque leurs traductions paraissent datées ou maladroites.</p>
            <p style={paraStyle}>Il existe, pour nombre de ces œuvres, d’excellentes éditions critiques contemporaines, fondées sur un travail philologique, historique et documentaire que <em>Corpus Scriptura</em> n’a pas vocation à remplacer dans l’immédiat. Le lecteur qui souhaite approfondir l’étude d’un texte est vivement encouragé à les consulter ou à se les procurer : leurs introductions, apparats critiques, notes et bibliographies demeurent des instruments essentiels.</p>
            <p style={paraStyle}>Le caractère public des sources ne s’étend pas nécessairement au travail éditorial réalisé pour <em>Corpus Scriptura</em>. L’océrisation et la transcription des ouvrages, la correction des erreurs de reconnaissance, la relecture et la confrontation aux sources, l’établissement et la préparation des textes, les choix de découpage et de structuration, les normalisations ou transformations éditoriales originales, les notices, notes, appareils, métadonnées, alignements et rapprochements entre textes bibliques et patristiques constituent un travail propre au projet. La base de données elle-même résulte d’un important travail de constitution, de vérification, d’organisation et de présentation.</p>
            <p style={paraStyle}>Dans un souci de partage et de circulation des textes, une œuvre océrisée par <em>Corpus Scriptura</em> peut, sur demande écrite, être mise à disposition au format Word lorsque les conditions de sa diffusion le permettent. Cette communication est examinée au cas par cas et n’emporte pas cession des droits attachés au travail éditorial propre au projet.</p>
          </ColophonSection>

          <ColophonSection titre="Méthode">
            <p style={paraStyle}>Chaque texte est rattaché à une édition ou à une source précisément identifiée. Sa préparation suit une charte éditoriale commune : fidélité au texte transmis, contrôle des corrections, respect de la structure de l’œuvre, conservation des particularités significatives et traçabilité des interventions. Les outils automatiques facilitent ce travail, mais ne dispensent jamais de revenir aux sources lorsqu’une difficulté subsiste.</p>
          </ColophonSection>

          <ColophonSection titre="L’intelligence artificielle">
            <p style={paraStyle}>L’intelligence artificielle occupe une place importante dans la constitution de <em>Corpus Scriptura</em>. Elle est employée pour transcrire et océriser des documents, repérer des erreurs, préparer et structurer les textes, assister leur découpage, effectuer des contrôles de cohérence et proposer des rapprochements entre les textes bibliques et patristiques.</p>
            <p style={paraStyle}>Son usage est encadré par une charte éditoriale et technique stricte, qui fixe les règles de fidélité aux sources, de transcription, de correction, de structuration, de citation et de vérification. L’IA ne peut notamment ni combler une lacune par conjecture, ni moderniser arbitrairement un texte, ni présenter comme certaine une lecture qui demeure douteuse.</p>
            <p style={paraStyle}>Ses résultats sont contrôlés selon la nature du travail : confrontation aux sources, vérifications automatiques, relectures ciblées, sondages et examen humain lorsque la décision l’exige. Les incertitudes sont conservées comme telles et les corrections importantes doivent pouvoir être justifiées et retracées.</p>
            <p style={paraStyle}>L’IA permet ainsi d’accomplir à grande échelle un travail qui serait difficilement réalisable par une seule personne, sans supprimer l’intervention humaine. La méthode, les choix éditoriaux, les critères de qualité et les décisions de publication restent sous responsabilité humaine.</p>
          </ColophonSection>

          <ColophonSection titre="Les rapprochements bibliques">
            <p style={paraStyle}>L’un des principaux objets de <em>Corpus Scriptura</em> est de mettre en relation les textes des Pères avec les passages bibliques qu’ils citent, commentent ou auxquels ils font écho. Ces liens ne reposent pas sur la seule ressemblance des mots : ils sont établis en tenant compte du contexte, de l’argumentation et des différentes traditions de numérotation biblique. Le degré de certitude d’un rapprochement est conservé lorsqu’il ne peut être établi avec assurance.</p>
          </ColophonSection>

          <ColophonSection titre="Contributions">
            <p style={paraStyle}>Cette bibliothèque n’est pas un monument clos, mais un chantier ouvert à ses lecteurs. Elle s’enrichit grâce à la transmission de textes patristiques du domaine public, au signalement de corrections, de références ou de lacunes, ainsi qu’au partage de documents difficiles d’accès.</p>
            <p style={paraStyle}>Les compétences en langues anciennes, philologie, théologie, histoire ou bibliographie sont particulièrement bienvenues. Les dons, prêts ou signalements d’ouvrages peuvent également contribuer à l’enrichissement du corpus.</p>
            {/* ⚠️ « Si vous êtes artiste (peintre, graveur ou illustrateur) » : l'auteur
                avait écrit l'énumération en incise entre tirets. La charte du style
                rédactionnel les proscrit dans les textes du site, et la parenthèse est
                déjà la solution que cette phrase employait. */}
            <p style={paraStyle}>Si vous êtes artiste (peintre, graveur ou illustrateur), <em>Corpus Scriptura</em> peut aussi acquérir ou commander des œuvres originales destinées à illustrer les Pères de l’Église et les textes du corpus.</p>
          </ColophonSection>

          <ColophonSection titre="Un projet indépendant">
            <p style={paraStyle}><em>Corpus Scriptura</em> est un projet indépendant, développé sans rattachement institutionnel et sans publicité. Sa constitution demande du temps, mais aussi des moyens matériels : acquisition ou reproduction d’ouvrages rares, numérisation, hébergement, outils de traitement et conservation des données. Le projet est principalement financé sur fonds propres ; les soutiens reçus permettent d’en poursuivre et d’en accélérer le développement.</p>
          </ColophonSection>

          <ColophonSection titre="Pérennité">
            <p style={paraStyle}>L’un des objectifs de <em>Corpus Scriptura</em> est aussi de remettre en circulation des textes devenus difficiles d’accès et de conserver le travail accompli sur eux sous une forme structurée et réutilisable. Les sources, les références bibliographiques et les différentes étapes de préparation sont autant que possible documentées afin que le corpus puisse continuer à être corrigé, enrichi et transmis.</p>
          </ColophonSection>

        </div>
      </section>
      </main>

      {/* ══ LE PIED ══════════════════════════════════════════════════════════
          Le colophon final : la pyramide, la marque, les liens légaux.
          ⛔ IL VIT HORS DE `<main>`, ET C'EST LA CONDITION POUR QU'IL SOIT UN PIED. Un
          `<footer>` n'est le repère `contentinfo` que si aucun `<main>`, `<section>`,
          `<article>` ni `<aside>` ne le contient : niché dans le colophon du projet, où
          il se trouvait, il n'aurait été le pied que de cette section. `.accueil` est un
          `<div>`, donc transparent à cette règle.
          ⚠️ Il reprend le papier, la mesure et la fonte du colophon qui le précède : la
          couture ne doit pas se voir. Son rembourrage du haut est nul — la section
          au-dessus porte déjà les 44 px. */}
      <footer style={{ background: "var(--cs-fond)" }}>
        <div style={{
          maxWidth: "35rem",
          margin: "0 auto",
          padding: "0 32px 80px",
          textAlign: "center",
          fontFamily: "var(--font-source-serif), Georgia, serif",
          color: "var(--cs-texte-fort)",
        }}>
          <div>
            {/* La pyramide garde un interligne PLUS LARGE que la prose : ses lignes sont
                des lignes de colophon, chacune se lisant pour elle-même. */}
            <div style={{ fontSize: "0.8125rem", lineHeight: "1.85", color: "var(--cs-texte-second)", letterSpacing: "0.01em" }}>
              <div className="colophon-pyr-desktop">
                <p style={{ maxWidth: "28.75rem", margin: "0 auto" }}>Publié pour navigateur et mobile par les soins</p>
                <p style={{ maxWidth: "23.75rem", margin: "0 auto" }}>de <em>Corpus Scriptura</em>, somme ouverte dédiée</p>
                <p style={{ maxWidth: "18.75rem", margin: "0 auto" }}>à la lecture des Saintes Écritures</p>
                <p style={{ maxWidth: "14.375rem", margin: "0 auto" }}>et des Pères de l’Église,</p>
                <p style={{ maxWidth: "10.625rem", margin: "0 auto" }}>en l’An de grâce</p>
                <p style={{ maxWidth: "6.875rem", margin: "0 auto" }}>MMXXVI.</p>
              </div>
              <div className="colophon-pyr-mobile">
                <p>Publié pour navigateur et mobile</p>
                <p>par les soins de <em>Corpus Scriptura</em>,</p>
                <p>somme ouverte dédiée</p>
                <p>à la lecture des Saintes Écritures</p>
                <p>et des Pères de l’Église,</p>
                <p>en l’An de grâce</p>
                <p>MMXXVI.</p>
              </div>
            </div>

            {/* Marque finale — voir la règle .colophon-marque. */}
            <div style={{ marginTop: "42px", lineHeight: 1 }}>
              <span className="colophon-marque" aria-hidden="true" />
            </div>

            {/* ⛔ Les liens légaux rendaient 2,46 : la plus mauvaise encre de la page
                était sur les seules lignes qui doivent être lisibles en droit.
                `--cs-original` est le jeton fait pour ce rang (5,37 sur le papier, 4,87
                sur le papier doux), et le corps monte de 10,5 à 12 px. Mesuré : 7,23. */}
            <div className="liens-legaux" style={{ marginTop: "42px", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
              <Link href="/conditions-utilisation" className="lien-legal" style={{ color: "var(--cs-original)", textDecoration: "none", borderBottom: "1px dotted var(--cs-or-doux)", whiteSpace: "nowrap" }}>
                Conditions d’utilisation
              </Link>
              <span className="sep-legal" style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/confidentialite" className="lien-legal" style={{ color: "var(--cs-original)", textDecoration: "none", borderBottom: "1px dotted var(--cs-or-doux)", whiteSpace: "nowrap" }}>
                Politique de confidentialité
              </Link>
              <span className="sep-legal" style={{ margin: "0 14px", opacity: 0.4 }}>·</span>
              <Link href="/contact" className="lien-legal" style={{ color: "var(--cs-original)", textDecoration: "none", borderBottom: "1px dotted var(--cs-or-doux)", whiteSpace: "nowrap" }}>
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Composants ──────────────────────────────────────────────────────────── */

/** ⚠️ `serre` : le même fleuron, au blanc du MOT et non à celui du colophon. Là il
 *  sépare huit sections et prend 46 px de chaque côté ; ici il ne ferme qu'un titre
 *  au-dessus de deux paragraphes, et le même blanc l'aurait détaché de ce qu'il
 *  coiffe. ⛔ Un ornement FERME un texte, il ne l'annonce pas (charte, « Une gravure
 *  se pose en pied ») : il vient donc SOUS le titre, comme sous « Le projet ». */
function OrnementsTriple({ serre = false }: { serre?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", margin: serre ? "0 auto 26px" : "46px auto", maxWidth: serre ? "13rem" : "18.75rem" }}>
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
        fontSize: "0.6875rem",
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
// les paragraphes s'y délitaient en lignes indépendantes.
// ⚠️ Le corps monte de 14 à 15 px : la prose du colophon est le texte le plus long de
// la page, et 14 px de sérif centré est petit pour un lecteur qui n'a pas vingt ans.
const paraStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  lineHeight: "1.6",
  color: "var(--cs-texte-fort)",
  margin: 0,
}

/* ── Le mot de l'auteur ───────────────────────────────────────────────────── */

// ⚠️ La prose du mot rejoint le CORPS du colophon : 15 px, interligne 1,6. Les deux
// sont la prose du même auteur, et elles se lisaient à deux corps différents parce
// que l'une était serrée dans une carte. Le resserrement de chasse qui allait avec
// (-0,004em) tombe avec le cadre : rien ne l'étrangle plus.
const motStyle: React.CSSProperties = {
  fontFamily: "var(--font-source-serif), Georgia, serif",
  fontSize: "0.9375rem",
  lineHeight: 1.6,
  color: "var(--cs-texte)",
  margin: 0,
}

function VoletUnMot() {
  return (
    <section className="accueil-mot">
      <h2>Un mot</h2>
      <OrnementsTriple serre />
      <div className="accueil-mot-prose">
        <p style={motStyle}><em>Corpus Scriptura</em> est un chantier mené seul, lentement, texte après texte. Mon intention est de rendre accessibles les Écritures et les écrits des Pères de l’Église, anciens ou difficiles d’accès, en les établissant, en les contrôlant et en les reliant entre eux.</p>
        <p style={motStyle}>L’accès au site restera gratuit. Si ce travail vous paraît utile, tout soutien, même modeste, est bienvenu : il permet de consacrer davantage de temps à la lecture, à l’édition des textes, à leur vérification et à leur mise en ordre.</p>
      </div>
      <p className="accueil-mot-merci" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.875rem", color: "var(--cs-texte)" }}>Merci.</p>
      <p className="accueil-mot-sqdv" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.875rem", color: "var(--cs-or-lisible)", letterSpacing: "0.14em" }}>SQDV</p>
      <Link href="/soutenir" className="cs-bouton-soutenir">Soutenir le projet</Link>
    </section>
  )
}

/* La galerie de noms. ⛔ L'ordre et le tri vivent dans « auteursDuCorpus », jamais
   ici : une liste de noms recomposée dans un composant dérive au premier ajout. */
function GalerieAuteurs({ auteurs }: { auteurs: AuteurDuCorpus[] }) {
  if (auteurs.length === 0) return null
  return (
    <div className="seuil-noms">
      <div className="accueil-rubrique">
        <i />
        <h2>Les auteurs du corpus</h2>
        <i />
      </div>
      {/* ⚠️ L'espace entre deux noms est une VRAIE espace, posée ici : React
          n'en insère aucune entre les éléments d'un tableau, et c'est elle
          — la seule du fil — qui autorise le retour à la ligne. */}
      <p>
        {auteurs.flatMap((a, i) => [
          i > 0 ? " " : null,
          <span key={a.id_auteur} className="seuil-noms-nom">
            <Link href={`/auteur/${a.id_auteur}`}>{a.nom}</Link>
          </span>,
        ])}{" "}
        <span className="seuil-noms-suite">et d’autres en préparation</span>
      </p>
    </div>
  )
}

function formaterDateAjout(iso: string | null): string {
  if (!iso) return ""
  // ⚠️ `T12:00:00` et non la chaîne nue : une date seule se lit en UTC, et sur un
  // serveur en fuseau négatif toute la colonne reculerait d'un jour. Midi met la
  // valeur hors d'atteinte des deux bords.
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

/* La liste des ajouts, sans son cadre.
   ⛔ La colonne des dates se mesure sur les dates PRÉSENTES (`max-content`), elle ne se
   pose pas au pire cas : elle valait 6,5rem, taillée pour « 28 septembre 2026 », or les
   mois français vont de 53,6 px à 94,3, et un août laissait donc 53,6 px de vide entre
   la date et son titre.
   ⚠️ La grille est portée par la LISTE, non par la rangée : une grille par rangée
   mesurerait sa colonne pour elle seule et les titres cesseraient de s'aligner. La
   rangée reprend les colonnes de sa liste par `subgrid`. ⛔ Pas `display: contents`,
   qui la priverait de sa boîte : c'est elle qui porte le survol. */
function ListeAjouts({ recentes }: { recentes: OeuvreRecente[] }) {
  if (recentes.length === 0) {
    return <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.8125rem", color: "var(--cs-texte-second)", fontStyle: "italic", margin: 0, textAlign: "center" }}>Aucun ajout pour l’instant.</p>
  }
  return (
    <ul style={{ listStyle: "none", margin: "0 auto", padding: 0, display: "grid", gridTemplateColumns: "max-content minmax(0, 1fr)", columnGap: "0.75rem", rowGap: "0.5rem", alignItems: "baseline", width: "fit-content", maxWidth: "100%", textAlign: "left" }}>
      {recentes.map(o => (
        <li key={o.id_oeuvre} className="ajout-item" style={{ display: "grid", gridTemplateColumns: "subgrid", gridColumn: "1 / -1", alignItems: "baseline" }}>
          {/* ⛔ La date rendait 2,61 sur le papier — la plus mauvaise encre du volet sur
              la seule information qui date l'ajout. On garde sa chaleur, on la fonce :
              `--cs-or-lisible`, et 11 px au lieu de 10,5. Mesuré : 5,14. */}
          <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.6875rem", color: "var(--cs-or-lisible)", whiteSpace: "nowrap" }}>{formaterDateAjout(o.date_mise_en_ligne)}</span>
          <Link href={`/oeuvre/${o.id_oeuvre}`} style={{ position: "relative", minWidth: 0, display: "block", textDecoration: "none", color: "inherit", fontFamily: "var(--font-source-serif), Georgia, serif" }}>
            {/* « Lire » vit DANS le titre, à la suite du texte : c'est ce qui le pose à
                sa droite quelle que soit la longueur de la ligne, et sur la même ligne
                de base, sans qu'aucune position absolue ait à deviner où le texte
                s'arrête. */}
            <span className="ajout-titre" style={{ display: "block", fontSize: "0.8125rem", color: "var(--cs-texte-fort)", lineHeight: 1.35 }}>
              {o.auteur}{o.auteur && o.titre ? ", " : ""}<em>{o.titre}</em>
              <span className="ajout-lire" aria-hidden="true">
                <span className="ajout-lire-mot">Lire</span>
                <span className="fleche" style={{ display: "inline-flex" }}><IconeChevron dir="right" size={11} strokeWidth={1.4} /></span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
