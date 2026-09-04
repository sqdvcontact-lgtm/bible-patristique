"use client";

import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useEstMobile, useSansSurvol } from "@/app/lib/useEstMobile";
import { lirePositionBible, type PositionBible } from '@/app/lib/repriseLecture'

// ⛔ PLUS DE TROISIÈME CARTE (décision de l'auteur, 2026-08-31). La Communauté est
// retirée de l'accueil : les portes de la page sont la Bible et les Pères, et rien
// d'autre. Elle reste dans la barre de navigation, où elle est atteignable de
// partout. ⚠️ `cs_derniere_publication` continue d'être ÉCRIT par la lecture d'un
// essai (`app/essais/[id]/EssaiClient.tsx`) ; plus personne ne le lit ici. On ne
// touche pas à l'écriture : le jour où une porte y revient, la reprise est là.
// ⛔ La forme de la reprise de lecture vit dans `app/lib/repriseLecture.ts`, avec la clé
//    et le lecteur qui la relit : elle était écrite ici et à `BibleLayout`, en deux
//    exemplaires qu'aucun mécanisme n'obligeait à rester d'accord.
type DernierBible   = PositionBible
type DerniereOeuvre = { id: string; titre: string; auteur: string }

function abregerTexte(texte?: string, max = 30) {
  const propre = (texte ?? '').trim()
  if (propre.length <= max) return propre
  return `${propre.slice(0, Math.max(0, max - 3)).trimEnd()}...`
}

// ⚠️ Les deux icônes sont AU-DESSUS DU PLI : elles portent `priority`, non le
// `loading="lazy"` que `next/image` pose par défaut. Les portes d'entrée du
// site attendaient la mise en page pour se charger, et paraissaient l'une après
// l'autre dans un carton vide.
function IconBible() {
  return <Image className="ac-icon-img ac-icon-bible" src="/icons/home-bible-book.png" width={1201} height={1310} sizes="160px" priority alt="" aria-hidden="true" />;
}

function IconPereImage() {
  return <Image className="ac-icon-img ac-icon-pere" src="/icons/home-patristique-buste.png" width={1145} height={1374} sizes="160px" priority alt="" aria-hidden="true" />;
}

function CarteAccueil({
  href,
  className,
  icon,
  titre,
  sousTitre,
  reprendreHref,
  reprendreLabel,
}: {
  href: string
  className: string
  icon: React.ReactNode
  titre: string
  /** Ce que l'on va FAIRE derrière la porte, en toutes lettres. « Bible » et
   *  « Patristique » sont des parapluies : ils nomment un rayon, non un geste, et
   *  un libellé qui ne promet rien ne se clique pas (odeur d'information faible —
   *  Pirolli et Card ; NN/g, « Reveal content through examples »). La ligne est
   *  facultative : une carte qui n'en porte pas garde son groupe centré. */
  sousTitre?: string
  reprendreHref?: string
  reprendreLabel?: string
}) {
  // ── Sans survol, le choix se prend AU TAP ──────────────────────────────────
  // Le dessin de bureau cache deux liens derrière le survol de la carte. Au doigt
  // il n'y a pas de survol : le tap suivait le lien du dessous et emmenait
  // toujours vers une lecture NEUVE, si bien que « reprendre » était non pas
  // discret mais inatteignable. Le premier tap ouvre donc la carte en deux, le
  // second choisit.
  // On n'ouvre que s'il Y A quelque chose à reprendre : sans lecture récente, la
  // moitié haute serait morte, et l'on ferait taper deux fois pour un seul choix.
  // Le critère n'est pas seulement le pointeur : c'est le moment où les cartes
  // S'EMPILENT. D'où 640 et non le 900 habituel — c'est la largeur, propre à ce
  // composant, où la grille passe à une colonne (voir sa média-query). Une carte
  // empilée se prend au clic, une carte en grille se survole, quel que soit
  // l'appareil ; et `(hover: none)` couvre en plus les tablettes larges, qui sont
  // tactiles sans être étroites.
  // Conséquence utile : un aperçu mobile de bureau, qui n'émule souvent que la
  // largeur et garde la souris, se comporte alors comme un vrai téléphone. C'est
  // ce qui rend le dessin vérifiable autrement que sur l'appareil.
  const sansSurvol = useSansSurvol()
  const empilee = useEstMobile(640)
  const [ouvert, setOuvert] = useState(false)
  const carteRef = useRef<HTMLDivElement | null>(null)
  const choixAuTap = (sansSurvol || empilee) && !!reprendreHref

  useEffect(() => {
    if (!ouvert) return
    // `pointerdown` et non `click` : la carte doit se refermer dès que le doigt
    // se pose ailleurs, y compris sur une autre carte, qui s'ouvrira ensuite.
    const ailleurs = (e: PointerEvent) => {
      if (!carteRef.current?.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('pointerdown', ailleurs)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('pointerdown', ailleurs)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  return (
    <div ref={carteRef} className={`ac-card ${className}${ouvert ? ' ac-card--ouvert' : ''}`}>
      <Link href={href} className="ac-card-main" aria-label={titre}
        aria-expanded={choixAuTap ? ouvert : undefined}
        onClick={e => { if (choixAuTap && !ouvert) { e.preventDefault(); setOuvert(true) } }}>
        {icon}
        {/* Titre et sous-titre voyagent DANS UNE MÊME BOÎTE : sur téléphone la carte
            devient une bande et le groupe passe en ligne, l'icône à gauche ; sans
            cette enveloppe, la ligne d'annonce se rangerait à côté du titre au lieu
            de se ranger dessous. */}
        <span className="ac-texte">
          <span className="ac-title">{titre}</span>
          {sousTitre ? <span className="ac-sous-titre">{sousTitre}</span> : null}
        </span>
      </Link>
      <div className="ac-hover-panel">
        {reprendreHref ? (
          <Link href={reprendreHref} className="ac-hover-choice">
            <span className="ac-hover-kicker">Reprendre la lecture</span>
            <span className="ac-hover-line" title={reprendreLabel}>{abregerTexte(reprendreLabel, 31)}</span>
          </Link>
        ) : (
          <span className="ac-hover-choice ac-hover-choice--disabled">
            <span className="ac-hover-kicker">Reprendre la lecture</span>
            <span className="ac-hover-line">Aucune lecture récente</span>
          </span>
        )}
        <Link href={href} className="ac-hover-choice">
          <span className="ac-hover-kicker">Nouvelle lecture</span>
        </Link>
      </div>
    </div>
  )
}

export default function AccueilCards() {
  const [bible, setBible]   = useState<DernierBible | null>(null)
  const [oeuvre, setOeuvre] = useState<DerniereOeuvre | null>(null)

  useEffect(() => {
    try {
      const b = lirePositionBible()
      const o = localStorage.getItem('cs_derniere_oeuvre')
      if (b) setBible(b)
      if (o) setOeuvre(JSON.parse(o))
    } catch {}
  }, [])

  return (
    <div className="ac-root">
      <div className="ac-grid">
        <CarteAccueil
          href="/?livre=GEN&chapitre=1"
          className="ac-bible"
          icon={<IconBible />}
          titre="Bible"
          sousTitre="Lire et comparer les traductions"
          reprendreHref={bible ? `/?livre=${bible.livre}&chapitre=${bible.chapitre}&trad=${bible.trad}` : undefined}
          reprendreLabel={bible ? `${bible.nomLivre} ${bible.chapitre}` : undefined}
        />

        <CarteAccueil
          href="/bibliotheque"
          className="ac-patristique"
          icon={<IconPereImage />}
          titre="Patristique"
          sousTitre="Lire les Pères de l’Église"
          reprendreHref={oeuvre ? `/oeuvre/${oeuvre.id}` : undefined}
          reprendreLabel={oeuvre ? oeuvre.titre : undefined}
        />
      </div>

      <style>{`
        .ac-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          width: 100%;
        }
        .ac-grid {
          display: grid;
          /* DEUX portes depuis le retrait de la Communauté. ⛔ La mesure ne se
             resserre PAS pour autant : elle est partagée avec les volets et le
             bandeau, et la reprendre ici redessinerait le sablier que la passe du
             27 août avait supprimé. Les cartes s'élargissent donc, et c'est leur
             HAUTEUR qui les empêche de devenir des bandes (voir --ac-hauteur). */
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          width: 100%;
          /* La mesure vient de la page d'accueil, qui donne la même à ses volets et
             à son bandeau : les trois blocs se tiennent sur une seule justification.
             ⚠️ Le commentaire vit DANS un gabarit de chaîne : nommer la propriété
             entre guillemets français, un accent grave fermerait la chaîne.
             La valeur d'avant reste en repli si ce composant servait un jour ailleurs. */
          max-width: var(--accueil-mesure, 42.5rem);
        }
        .ac-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.8125rem;
          border-radius: 8px;
          text-decoration: none;
          /* La hauteur vient de la PAGE, qui sait combien d'air elle a devant elle :
             une porte seule sur son écran ne se compose pas comme une porte suivie
             d'autre chose. La valeur d'avant reste en repli. */
          min-height: var(--ac-hauteur, 8.875rem);
          padding: 0;
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 6px 24px rgba(10,18,8,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          position: relative;
          overflow: hidden;
        }
        .ac-card-main {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-decoration: none;
          transition: opacity 0.16s ease, transform 0.18s ease;
        }
        .ac-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 45%);
          pointer-events: none;
        }
        .ac-card-main > svg,
        .ac-card-main > img,
        .ac-card-main > span { position: relative; z-index: 1; }
        /* ⛔ Les icônes partagent une BOÎTE DE MÊME HAUTEUR ; seule leur
           largeur diffère, pour que chacune garde sa taille optique. Elles avaient
           chacune la sienne (4,375 et 4,625), et comme le groupe icône-titre est
           centré dans la carte, un carton plus haut poussait son titre plus haut :
           les titres se posaient sur des lignes différentes, ce qui, dans une
           rangée de cartes, est la seule chose que l'œil voie.
           ⚠️ Le commentaire vit DANS un gabarit de chaîne : nommer la propriété
           entre guillemets français, jamais entre accents graves, qui la fermeraient.
           La règle « object-fit: contain » garantit qu'aucune n'est déformée. */
        .ac-icon-img {
          width: 4.75rem;
          height: 4.625rem;
          object-fit: contain;
          opacity: 0.86;
          mix-blend-mode: screen;
        }
        .ac-icon-bible { width: 5.375rem; }
        .ac-icon-pere { width: 4.625rem; }
        .ac-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(20,30,16,0.34), inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .ac-card:hover .ac-card-main,
        .ac-card:focus-within .ac-card-main {
          opacity: 0.12;
          transform: scale(0.99);
        }
        /* DEUX tons terreux SOBRES et coordonnés : vert sombre pour l'Écriture,
           bronze doux pour les Pères. Distincts, sans éclat.

           ⛔ Ces cartons sont des APLATS, et leurs valeurs sont LITTÉRALES, comme le
           jeu de couvertures des publications et pour la même raison : c'est une
           gamme dessinée, dont le contraste est arrêté, non une teinte d'interface
           qui se rabat sur un rôle. Ils portaient jusqu'ici des jetons d'ENCRE
           (--cs-encre, --cs-texte), lesquels s'éclaircissent sur un sol sombre :
           mesuré en Cuir, les cartons avaient inversé leurs valeurs.

           Le Cuir reçoit donc les siens, un cran PLUS CLAIRS que le sol au lieu d'être
           plus sombres que lui : sur un fond brun, un carton se détache en montant.
           Blanc mesuré dessus : 6,6 et 5,2 pour l'annonce, davantage pour le titre.

           ⛔ UNE COULEUR TIENT SA CHROMA DU HAUT EN BAS, ou ce n'est pas une couleur.
           Le carton de la Patristique valait « #52472c → #3a3530 » : mesuré, sa chroma
           tombait de 38 à 10 et sa teinte glissait de 43° à 30°, si bien que son tiers
           inférieur était un GRIS NEUTRE. Il ne se salissait pas, il se décolorait — et
           c'est ce que l'œil lisait comme un marron sale. La carte Bible, elle, va de
           19 à 16 sans bouger de teinte, et c'est pourquoi elle paraissait une couleur.

           Le maroquin rouge remplace le bronze (décision de l'auteur, 2026-08-31) : c'est
           la paire d'une bibliothèque ancienne, maroquin vert et maroquin rouge, les deux
           reliures d'un même ensemble. Chroma 52 → 39, teinte tenue. ⚠️ Il se transpose
           au Cuir SANS traduction, ce qu'un pourpre n'aurait pas permis : la charte y
           impose le monochrome, et une teinte froide y serait devenue un châtaigne, donc
           deux idées à entretenir pour un seul carton.

           Contrastes mesurés sur la teinte HAUTE, la plus claire des deux : titre 9,79
           au Clair et 7,88 au Cuir, annonce 7,16 et 5,92.

           ⚠️ CES VALEURS SONT SUIVIES AILLEURS depuis le 2026-09-04 : « --cs-peres » et
           « --cs-peres-aplat » (globals.css, § familles de corpus) portent le maroquin
           ce carton, et c'est par lui que les résultats patristiques de la recherche et
           de la barre de recherche se teintent. ⛔ Elles restent LITTÉRALES des deux
           côtés — un carton est une gamme dessinée, un jeton une teinte de rôle — mais
           reteinter ce carton sans reteinter les jetons ferait dire deux choses au même
           corpus. */
        .ac-bible {
          background: linear-gradient(160deg, #2a3d30 0%, #1e2e24 100%);
        }
        .ac-patristique {
          background: linear-gradient(160deg, #5a2a26 0%, #3e1a17 100%);
        }
        :root[data-theme="sombre"] .ac-bible {
          background: linear-gradient(160deg, #4a3d2d 0%, #3a3125 100%);
        }
        :root[data-theme="sombre"] .ac-patristique {
          background: linear-gradient(160deg, #6a3a31 0%, #4e2823 100%);
        }
        /* ⚠️ La boîte de texte réserve DEUX lignes d'annonce, même quand une seule
           est écrite. Les deux annonces n'ont pas la même longueur : « Lire les
           Pères de l'Église » tient sur une ligne à une largeur où « Lire et comparer
           les traductions » en prend deux, et le groupe centré remontait alors le
           titre de la carte la plus bavarde. Hauteur fixe, titres alignés à toute
           largeur. Le blanc en trop se range sous l'annonce, où il ne se voit pas. */
        .ac-texte {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 5px;
          min-width: 0;
          min-height: 3.9rem;
        }
        .ac-title {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 1.25rem;
          font-weight: normal;
          color: rgba(255,255,255,0.90);
          letter-spacing: 0.01em;
        }
        /* La ligne qui dit le GESTE. Elle se compose comme la mention « Lire » du
           volet des ajouts — sérif, italique, discrète — pour que les deux se
           reconnaissent comme la même voix.
           ⚠️ Le blanc à 0,74 et non 0,62 : mesuré sur le carton le plus clair
           (« Communauté » au Cuir), 0,62 tombait sous 4,5:1 à ce corps. */
        .ac-sous-titre {
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.78125rem;
          font-style: italic;
          line-height: 1.3;
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.74);
          text-align: center;
          text-wrap: balance;
          max-width: 100%;
          padding: 0 12px;
          box-sizing: border-box;
        }
        .ac-hover-panel {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 0;
          width: 100%;
          opacity: 0;
          transform: none;
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.18s ease;
        }
        .ac-card:hover .ac-hover-panel,
        .ac-card:focus-within .ac-hover-panel {
          opacity: 1;
          pointer-events: auto;
        }
        .ac-hover-choice {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          padding: 9px 16px;
          align-items: center;
          text-align: center;
          border-radius: 0;
          border: none;
          background: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.96);
          text-decoration: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
        }
        .ac-hover-choice:first-child {
          border-bottom: 1px solid rgba(255,255,255,0.22);
          border-radius: 8px 8px 0 0;
        }
        .ac-hover-choice:last-child {
          border-radius: 0 0 8px 8px;
        }
        .ac-hover-choice:hover,
        .ac-hover-choice:focus-visible {
          background: rgba(255,255,255,0.26);
          transform: none;
          outline: none;
        }
        .ac-hover-choice--disabled {
          color: rgba(255,255,255,0.52);
          pointer-events: none;
        }
        .ac-hover-kicker {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          line-height: 1.15;
          color: rgba(255,255,255,0.84);
          text-align: center;
        }
        .ac-hover-line {
          display: block;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          padding: 0 10px;
          box-sizing: border-box;
          font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.8125rem;
          font-style: italic;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
        }
        @media (max-width: 640px) {
          /* ⛔ Plus de max-width de 320 px ici : empilées, les cartes rentraient de
             quelques pixels sur les volets et le bandeau, qui prennent toute la
             colonne. Trois bords qui ne s'alignent pas à quatre pixels près ne se
             lisent pas comme un décalage voulu, seulement comme un travail mal fait.
             Les cartes tiennent désormais la même colonne que le reste de la page. */
          .ac-grid { grid-template-columns: 1fr; }
          /* Empilée sur toute la colonne, la carte devient une BANDE, et une bande
             ne se compose pas comme un carton carré : l'icône vient CONTRE le titre
             au lieu de le surmonter, et la hauteur tombe de 140 px à 100. Autrement,
             l'icône flottait au milieu de six cents pixels de vide, et les trois
             cartes prenaient à elles seules le premier écran d'un téléphone.
             ⚠️ 6,25rem n'est pas un chiffre rond : le volet de choix qui s'ouvre au
             tap partage la carte en deux, et deux cibles de 50 px sont le plancher
             de ce qu'un doigt vise sans se tromper.
             ⚠️ 7rem depuis que la bande porte DEUX lignes : à 6,25 la ligne
             d'annonce venait toucher le bord bas du carton. */
          .ac-card { min-height: 7rem; }
          /* ⛔ Le groupe n'est pas CENTRÉ dans la bande, il part du fer à gauche, et
             l'icône reçoit une boîte de largeur FIXE. Centré, chaque titre se plaçait
             selon sa propre longueur : « Bible » et « Patristique » commençaient à
             deux abscisses différentes, et les icônes aussi. Dans une pile de
             bandes, l'œil ne voit que ce désalignement. Ici, une colonne d'icônes
             et une colonne de titres. */
          .ac-card-main { flex-direction: row; justify-content: flex-start; gap: 1.125rem; padding-left: 1.75rem; padding-right: 1.25rem; }
          /* Le groupe de texte se range AU FER dans la bande, comme l'icône : la
             colonne d'icônes et la colonne de titres tiennent leur alignement, et la
             ligne d'annonce se pose sous son titre au lieu de se centrer sous lui. */
          /* ⛔ La hauteur réservée tombe : en bande, les deux annonces tiennent
             chacune sur une ligne et le blanc réservé ferait un trou sous le titre. */
          .ac-texte { align-items: flex-start; text-align: left; gap: 3px; min-height: 0; }
          .ac-sous-titre { text-align: left; padding: 0; }
          .ac-icon-img, .ac-icon-bible, .ac-icon-pere {
            width: 3.5rem; height: 3.25rem;
          }
        }

        /* ── Mouvement réduit ────────────────────────────────────────────────
           Le dessin repose sur des fondus et des glissés ; réglage système
           « moins d'animations », on garde les ÉTATS et l'on retire le trajet.
           ⛔ Ne jamais éteindre l'opacité elle-même : le volet de choix doit
           continuer de paraître, sans quoi la carte devient inutilisable. */
        @media (prefers-reduced-motion: reduce) {
          .ac-card, .ac-card-main, .ac-hover-panel, .ac-hover-choice {
            transition-duration: 0.01ms !important;
          }
          .ac-card:hover { transform: none; }
          .ac-card:hover .ac-card-main,
          .ac-card:focus-within .ac-card-main { transform: none; }
        }

        /* ── Écran tactile : on ÉTEINT le survol, on ne le laisse pas clignoter ──
           Certains navigateurs déclenchent :hover au tap, et :focus-within se
           déclenche de toute façon quand le lien prend le focus. Le volet
           paraissait donc un instant au moment même où l'on appuyait, puis la
           page changeait : un clignotement, jamais un choix. Ici le volet ne
           répond plus qu'à l'état ac-card--ouvert, posé par le premier tap.

           ⛔ LE :not() N'EST PAS UN ORNEMENT DE STYLE, il est la condition même.
           Un tap DONNE LE FOCUS au lien, donc :focus-within s'allume au moment
           précis où la carte s'ouvre. Or ce sélecteur vaut trois classes contre
           deux pour .ac-card--ouvert : sans l'exclusion, il l'emportait et
           rendait le volet à la fois invisible ET en pointer-events: none. Le
           premier tap ne montrait rien, le second traversait jusqu'au lien du
           dessous et ouvrait la page. Le dessin paraissait mort alors que son
           état, lui, était bien posé.
           Le piège se cache d'autant mieux qu'un .click() en JavaScript ne donne
           PAS le focus : un essai scripté passe, un vrai doigt échoue. */
        @media (hover: none), (max-width: 640px) {
          .ac-card:hover { transform: none; box-shadow: 0 6px 24px rgba(10,18,8,0.30), inset 0 1px 0 rgba(255,255,255,0.08); }
          .ac-card:not(.ac-card--ouvert):hover .ac-card-main,
          .ac-card:not(.ac-card--ouvert):focus-within .ac-card-main { opacity: 1; transform: none; }
          .ac-card:not(.ac-card--ouvert):hover .ac-hover-panel,
          .ac-card:not(.ac-card--ouvert):focus-within .ac-hover-panel { opacity: 0; pointer-events: none; }
        }

        /* Spécificité relevée à deux classes sur la carte, pour rester au-dessus
           des règles de survol du dessin de bureau, qui en portent autant. */
        .ac-card.ac-card--ouvert .ac-card-main { opacity: 0.12; transform: scale(0.99); }
        .ac-card.ac-card--ouvert .ac-hover-panel { opacity: 1; pointer-events: auto; }
      `}</style>
    </div>
  );
}
