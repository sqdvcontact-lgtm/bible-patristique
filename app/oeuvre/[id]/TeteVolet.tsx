'use client'

// ── LA TÊTE D'UN VOLET DE LECTURE — le bouton, et le menu qui condense ────────
//
// La rangée d'actions en tête du volet d'une œuvre : la roue crantée de
// l'administrateur, l'étoile des favoris, le partage, l'extraction, le chevron qui
// replie le volet. Elle vivait dans `OeuvreClient` ; elle en sort parce que le menu
// a besoin d'un portail et d'un placement, et qu'un composant de 4 400 lignes n'est
// pas l'endroit où l'on ajoute cela.
//
// ⛔ CE QUI COÛTE LA LARGEUR EST LE NOMBRE DE CIBLES, NON LEUR TAILLE. Relevé de
// l'auteur, 2026-09-10 : « sur écran moyen, c'est trop gros, trop espacé ; à la
// limite on pourrait réduire l'ensemble sous la forme ⋮ ». Mesuré sur la planche
// (`tmp/planche-tete-volet.mjs`, une iframe par écran) : cinq boutons font 129 px
// dans une tête qui en offre 208 sur un portable, soit 62 % — et le nom de l'auteur,
// qui se coupe par la fin, n'en gardait que 65 pour les 126 qu'il demande. On ne peut
// rien reprendre sur la taille : WCAG 2.2 § 2.5.8 fixe le plancher à 24 px CSS, et la
// rangée était SOUS lui (l'étoile faisait 17).
//
// ⛔ ET LE NOM DE L'AUTEUR NE SE COUPE PAS : C'EST LA RANGÉE QUI CÈDE. Rectification de
// l'auteur le jour même, contre la première écriture de cette page : « je préférais
// qu'on ne coupe pas le nom de l'auteur, mais qu'on propose un symbole ⋮ pour regrouper
// les options favori, etc., quand l'écran est trop petit pour afficher les symboles ».
// Mesuré sur les quinze auteurs publiés et sept écrans (`tmp/mesure-tete-condensee.mjs`),
// VINGT noms se coupaient par la fin, dont quatre dès 1280 px (Grégoire de Nazianze,
// Cyrille de Jérusalem, Cyprien de Carthage, Pseudo-Jean Chrysostome).
//
// ⛔ MAIS ELLE NE CÈDE QUE QUAND LA PLACE MANQUE, ET ALORS TOUT ENTIÈRE. Seconde
// rectification, le même soir : « je t'ai demandé de regrouper partager, extraire, etc.,
// sous un bouton ⋮ ; cela ne doit être le cas que quand on manque de place à l'écran ;
// sur grand écran, pas la peine de cacher les icônes ». La forme du matin rangeait les
// trois actions sous le ⋮ EN TOUTES CIRCONSTANCES et n'en sortait que l'étoile : elle
// cachait donc des icônes là où rien ne l'exigeait. Deux formes désormais, et deux
// seulement — la rangée ENTIÈRE en icônes, ou le ⋮ et le chevron.
//
// ⛔ PAS DE REPLI PAR CRANS, une icône cédant après l'autre : c'est le parti que la
// barre de navigation a défait le matin même, « la rangée n'avait pas la même forme
// selon la largeur de la fenêtre », et une rangée qui change de forme par degrés ne
// s'apprend jamais.
//
// ⚠️ CE QUE LA MESURE DIT DE LA FORME DÉPLIÉE (`tmp/mesure-tete-rangee-entiere.mjs`,
// neuf écrans, quinze auteurs) : quatre cibles pour un LECTEUR — étoile, partage,
// extraction, chevron — et cinq pour l'ADMINISTRATEUR, dont la roue crantée. Le volet
// vaut clamp(240px, 16vw, 380px), la tête en offre 32 de moins. À 2400 px et au-delà,
// quatorze noms sur quinze portent la rangée du lecteur, dix celle de l'administrateur ;
// à 1920, dix et quatre ; sur un portable, quatre et trois. ⚠️ La roue de l'admin coûte
// donc cinq noms sur son propre écran : c'est le prix d'une cible de plus dans une tête
// de 347 px, non un défaut du prédicat.
//
// ⛔ LA CONDITION SE MESURE, ELLE NE SE POSE PAS. Ni requête de conteneur, ni seuil en
// rem : ce qui décide n'est pas la largeur du volet mais le rapport entre la place
// OFFERTE et celle que le nom DEMANDE, et cette dernière change d'une œuvre à l'autre
// — « Boèce » tient partout, « Pseudo-Jean Chrysostome » ne tient nulle part. Un seuil
// posé condenserait donc sur Boèce à 1280 sans nécessité, et laisserait Chrysostome
// coupé à 1920. C'est `useRangeeCondensee` qui juge, sur la mesure du document.
//
// ⛔ ET LE PRÉDICAT NE DÉPEND PAS DE L'ÉTAT QU'IL COMMANDE, sans quoi il oscillerait :
// on ne demande jamais « le nom est-il coupé ? » — ce qui serait vrai condensé et faux
// déplié, à l'infini — ni « la rangée déborde-t-elle ? », qui est la même question par
// l'autre bout. Le besoin se lit sur le `scrollWidth` du nom, qui vaut sa chasse réelle
// qu'il soit écrêté ou non ; et la place des actions se COMPTE (`largeurDeLaRangee`) au
// lieu de se mesurer, sur le nombre de cibles que la page sait d'avance.
//
// ⚠️ CE QUI NE BOUGE JAMAIS, ET POURQUOI. Le chevron : il est le contrôle du volet
// lui-même et le plus employé des cinq — on ne referme pas un panneau en ouvrant
// d'abord un menu qui vit dedans. Et l'étoile, sous le ⋮, y garde son ÉTAT : glyphe
// plein, encre d'or, libellé qui dit le geste inverse (« Retirer des favoris »). Un état
// qu'on ne peut plus lire sans ouvrir un menu ne serait plus un état ; nommé et peint,
// il l'est encore.
//
// ⚠️ ET UN NOM RESTE ÉCRÊTÉ, faute de mieux : « Pseudo-Jean Chrysostome » demande 221 px
// à la racine 22 quand la tête n'en offre que 347, rangée déduite. Il n'y a rien de plus
// à lui rendre — la cible est au plancher de WCAG et le chevron ne descend pas dans le
// menu.
//
// ⚠️ CE QUE LA MESURE A DÉMENTI, et qu'il ne faut pas re-supposer : à 1280 px,
// « Augustin d'Hippone » tenait DÉJÀ à côté de trois cibles, d'un seul pixel (126 pour
// 127 offerts). La note du matin lui prêtait 114 px et le disait coupé ; c'était un
// calcul, non un relevé. Les noms qui se coupaient là sont les quatre plus longs.
//
// ⚠️ ET CE QUI ENTRE Y GAGNE : sous le ⋮, les trois actions sont NOMMÉES EN TOUS
// LETTRES. Elles n'étaient que des glyphes de treize pixels dont le sens ne se lisait
// que dans un `title` — l'audit du 2026-09-06 compte ces informations-là parmi les
// « sept informations portées par le seul title, invisibles au doigt ».

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Z_MODALE } from '@/app/lib/empilement'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import {
  hauteurNavbarPx, placerFenetre, tailleRacinePx, type PlacementFenetre,
} from '@/app/lib/fenetreContextuelle'

/**
 * UN BOUTON DE LA TÊTE DU VOLET — et la SEULE forme qu'ils prennent tous.
 *
 * ⛔ Sa cible fait 24 px au moins, le plancher de WCAG 2.2 § 2.5.8, et il a fallu la
 * lui donner ICI : la rangée en portait cinq, dont quatre à 19 ou 20 px, et l'étoile
 * seule passait — parce qu'elle vient d'un composant partagé qui a reçu la passe du
 * DOIGT, quand ce qui est écrit sur place ne l'a jamais reçue.
 *
 * ⛔ Ni `.cs-cible-fine` ni `.cs-bouton-fin` ne conviennent : les boutons sont à quatre
 * pixels l'un de l'autre, et le débord de douze pixels de la première les ferait
 * s'avaler. On grandit donc la BOÎTE, ce que la charte prescrit pour un contrôle EN
 * GRAPPE.
 *
 * ⚠️ La GÉOMÉTRIE vit dans la feuille (`.cs-bouton-volet`), non ici : elle dépend de la
 * police racine, et un style en ligne battrait toute règle de feuille sans `!important`.
 * Il ne reste en ligne que ce qui ne dépend de rien — le fond, l'encre, le curseur.
 */
export function BoutonVolet({ titre, onClick, children, refBouton, ...aria }: {
  titre: string
  /** ⚠️ L'événement est passé : une action qui ouvre une fenêtre ANCRÉE a besoin du
   *  rectangle du bouton qui l'a demandée, et il ne se retrouve pas après coup. */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
  refBouton?: React.Ref<HTMLButtonElement>
  'aria-haspopup'?: 'menu'
  'aria-expanded'?: boolean
  'aria-controls'?: string
}) {
  return (
    <button ref={refBouton} type="button" onClick={onClick} title={titre} aria-label={titre}
      className="cs-bouton-volet" {...aria}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--cs-vert)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--cs-texte-faible)' }}>
      {children}
    </button>
  )
}

/**
 * LE TITRE DE L'ŒUVRE, EN TÊTE DU VOLET, ET IL OUVRE LA FICHE DE L'ÉDITION.
 *
 * ⛔ C'EST L'ŒUVRE QUI EST EN TÊTE, NON SON AUTEUR (demande de l'auteur, 2026-09-10).
 * Le chapeau empilait le nom de l'auteur, le titre, puis un lien « À propos de cette
 * édition » : trois lignes, dont la première était le seul mot coloré de l'écran, si
 * bien que l'œil tombait sur « Augustin d'Hippone » quand on venait lire *La Cité de
 * Dieu*. L'ordre est renversé et le lien a disparu : c'est le TITRE qui ouvre la fiche,
 * et l'auteur le suit en ligne de crédit (`NomVolet`, variante `credit`).
 *
 * ⚠️ IL SE COMPOSE COMME LE TITRE, non comme un lien : la serif du site, l'encre du
 * texte. Rien ne le teinte en vert. Ce qui annonce le clic est le survol, qui le
 * souligne, et l'infobulle qui nomme la destination — la règle du 2026-09-03, « un lien
 * nomme sa destination », vaut ici par le `title` puisque le libellé est le titre même.
 *
 * ⛔ ET IL NE SE COUPE PAS PLUS QUE NE SE COUPAIT LE NOM DE L'AUTEUR : c'est la RANGÉE
 * qui cède (voir la doctrine en tête de ce fichier et `useRangeeCondensee`, qui mesure
 * désormais ce titre-là). L'écrêtage par la fin ne sert que le cas extrême, où même la
 * rangée condensée ne laisse pas la place.
 *
 * ⚠️ LE TEXTE VIT DANS UN SEUL ENFANT. `useRangeeCondensee` lit `firstElementChild`
 * pour connaître la chasse réelle : un titre composé (`rendreTexteEnrichi` rend
 * plusieurs nœuds) doit donc rester enveloppé dans ce span-là.
 */
export function TitreVolet({ children, onOuvrir, titre, inactif = false }: {
  children: React.ReactNode
  onOuvrir: () => void
  titre: string
  /** Une édition dont il n'y a rien à dire n'ouvre aucune fiche : le titre se compose
   *  alors à l'identique, sans clic ni soulignement. ⛔ Il reste un `button`, car c'est
   *  sur les boutons de la rangée que la mesure de condensation compte. */
  inactif?: boolean
}) {
  const [survol, setSurvol] = useState(false)
  const allume = survol && !inactif
  return (
    <button type="button" onClick={onOuvrir} disabled={inactif} title={inactif ? undefined : titre}
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)} onBlur={() => setSurvol(false)}
      style={{
        fontFamily: 'var(--font-source-serif), Georgia, serif',
        fontSize: '0.875rem', fontWeight: 400, color: 'var(--cs-encre)',
        lineHeight: 1.3, margin: 0, padding: 0, background: 'none', border: 'none',
        textAlign: 'left', cursor: inactif ? 'default' : 'pointer',
        display: 'block', width: '100%', minWidth: 0,
      }}>
      <span style={{
        display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: allume ? 'underline' : 'none', textUnderlineOffset: '3px',
      }}>
        {children}
      </span>
    </button>
  )
}

/** Une entrée du menu ⋮. `icone` est le MÊME glyphe que la rangée portait : le menu
 *  ne change pas les dessins, il leur ajoute leur nom.
 *  ⚠️ `teinte` ne sert qu'à ce qui dit un ÉTAT — l'étoile pleine y garde son or, sans
 *  quoi une action rangée sous le ⋮ perdrait ce que sa couleur disait dehors. */
export type ActionVolet = {
  cle: string
  libelle: string
  icone: React.ReactNode
  /** ⚠️ Le rectangle du bouton qui a servi — celui de la rangée, ou le ⋮ quand elle est
   *  condensée. Une action qui ouvre une fenêtre ANCRÉE en a besoin, et l'ancre n'est pas
   *  la même selon la forme que la tête a prise. */
  onChoisir: (ancre?: DOMRect) => void
  teinte?: string
}

/**
 * LA PLACE QU'UNE CIBLE PREND DANS LA RANGÉE, ÉCART COMPRIS, en pixels.
 *
 * ⛔ Les deux mesures sont celles de `globals.css` (« LA RANGÉE D'ACTIONS ») — cible
 * `max(24px, 1.5rem)`, écart `max(4px, 0.25rem)` — et elles sont RECOPIÉES ici parce
 * qu'un calcul de place se fait AVANT le rendu, quand la feuille n'a encore rien posé
 * de la forme qu'on est en train de choisir. `teteVolet.test.ts` confronte les deux
 * écritures : deux copies d'une même mesure divergent au premier réglage, et la rangée
 * composerait alors sur une largeur que la feuille ne lui donne pas.
 */
export function coteDUneCible(racine: number): number { return Math.max(24, 1.5 * racine) }
export function ecartDeCible(racine: number): number { return Math.max(4, 0.25 * racine) }
export function pasDUneCible(racine: number): number { return coteDUneCible(racine) + ecartDeCible(racine) }

/** La place que prend une rangée de `cibles` boutons, ses écarts compris — n côtés et
 *  n−1 écarts. ⚠️ Elle se CALCULE, elle ne se mesure pas : on juge d'une forme AVANT de
 *  la rendre, et la mesurer reviendrait à demander au prédicat ce qu'il vient de décider. */
export function largeurDeLaRangee(cibles: number, racine: number): number {
  if (cibles <= 0) return 0
  return cibles * coteDUneCible(racine) + (cibles - 1) * ecartDeCible(racine)
}

/**
 * LA RÈGLE, à part du document : le nom ENTIER tiendrait-il À CÔTÉ DE LA RANGÉE ENTIÈRE ?
 *
 * ⛔ ELLE NE DEMANDE JAMAIS « le nom est-il coupé ? », qui serait vrai condensé et faux
 * déplié, à l'infini — ni « la rangée déborde-t-elle ? », qui est la même question par
 * l'autre bout. Les DEUX termes se calculent hors du document : ce que le nom demande
 * (sa chasse réelle, écrêté ou non) et ce que la rangée DÉPLIÉE prendrait (le nombre de
 * ses cibles). Le prédicat est ainsi indépendant de l'état qu'il commande, et
 * `teteVolet.test.ts` l'éprouve dans les deux sens sur les mêmes mesures.
 *
 * ⚠️ Il ne connaît pas le cas « on ne sait pas encore » : une largeur nulle se refuse
 * chez l'appelant, où l'on garde alors l'état d'avant.
 */
export function condenserLaRangee({ dispo, besoin, ciblesDepliees, racine }: {
  /** Ce que la tête du volet OFFRE. */
  dispo: number
  /** Ce que le nom le plus long DEMANDE, sa flèche de fiche comprise. */
  besoin: number
  /** Combien de boutons la rangée porterait si elle montrait TOUT — chevron compris. */
  ciblesDepliees: number
  /** La police racine en pixels : les cibles sont en rem, sous un plancher absolu. */
  racine: number
}): boolean {
  return besoin + largeurDeLaRangee(ciblesDepliees, racine) > dispo
}

// `useLayoutEffect` mesure et corrige AVANT peinture : la rangée ne doit pas se voir
// perdre puis reprendre son étoile. Il n'existe pas au rendu serveur, d'où le repli.
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * LA RANGÉE SE CONDENSE QUAND LE NOM N'A PLUS LA PLACE — et pas avant.
 *
 * Deux repères à poser : la RANGÉE (ce qui offre la place) et les NOMS (ce qui la
 * demande). Ce que la rangée d'actions DISPUTE ne se mesure pas, il se compte :
 * l'appelant dit combien de cibles la forme dépliée porterait, et `largeurDeLaRangee`
 * en donne la place. ⚠️ On n'observe donc plus les ACTIONS — les observer reviendrait à
 * mesurer ce que le prédicat vient de décider.
 *
 * ⛔ `condense` part à VRAI, et c'est le sens sûr : sur un portable, qui est le cas
 * ordinaire, c'est la réponse juste, et le rendu du serveur n'y montre donc pas une
 * étoile que la première mesure retirerait. L'inverse la ferait paraître puis
 * disparaître sur la plupart des écrans.
 *
 * ⚠️ On n'observe pas que la rangée : les noms changent de largeur quand la police
 * finit d'arriver. Reposer la même valeur ne redéclenche aucun rendu, la boucle se
 * referme donc d'elle-même.
 *
 * ⚠️ Une largeur NULLE ne se juge pas : le volet replié, le tiroir fermé et le premier
 * rendu rendent tous zéro, et conclure là-dessus condenserait une rangée qu'on ne voit
 * même pas.
 *
 * ⛔ LE SEUL ARGUMENT EST LE NOMBRE DE CIBLES DE LA FORME DÉPLIÉE, et il ne noue rien :
 * c'est une donnée de la PAGE — l'administrateur a une action de plus, un téléphone n'a
 * pas de chevron —, jamais la sortie du prédicat. Lui passer l'état qu'il décide, en
 * revanche, le ferait osciller : l'appelant calcule `!condense` pour le rendu, et le
 * crochet recevrait sa propre réponse.
 */
export function useRangeeCondensee(ciblesDepliees: number) {
  const refRangee = useRef<HTMLDivElement>(null)
  const refNoms = useRef<HTMLDivElement>(null)
  const [condense, setCondense] = useState(true)

  useMesureAvantPeinture(() => {
    const rangee = refRangee.current
    const noms = refNoms.current
    if (!rangee || !noms) return
    let vivant = true
    const mesurer = () => {
      if (!vivant) return
      const dispo = rangee.clientWidth
      if (dispo <= 0) return
      // La chasse RÉELLE du nom : `scrollWidth` la rend qu'il soit écrêté ou non, si
      // bien qu'elle ne dépend pas de l'état qu'on est en train de décider. L'écart au
      // bouton porte la flèche de la fiche et son blanc, que le nom ne cède jamais.
      let besoin = 0
      for (const bouton of Array.from(noms.querySelectorAll('button'))) {
        const texte = bouton.firstElementChild as HTMLElement | null
        if (!texte) continue
        besoin = Math.max(besoin, texte.scrollWidth + (bouton.clientWidth - texte.clientWidth))
      }
      setCondense(condenserLaRangee({ dispo, besoin, ciblesDepliees, racine: tailleRacinePx() }))
    }
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(rangee)
    ro.observe(noms)
    // La chasse d'un nom change quand la police du site arrive : mesurée avant, elle
    // est celle d'une police de secours, et la rangée se réglerait sur un nom qui n'est
    // pas celui qu'on lira.
    document.fonts?.ready.then(mesurer).catch(() => {})
    return () => { vivant = false; ro.disconnect() }
  }, [ciblesDepliees])

  return { condense, refRangee, refNoms }
}

/** Largeur de la boîte, en rem. Elle est POSÉE et non ajustée au contenu : le
 *  placement en a besoin AVANT de rendre, pour borner l'abscisse. La plus longue
 *  entrée (« Extraire en document Word ») demande 191 px, la boîte en offre 224 à la
 *  racine 16. */
const LARGEUR_REM = 14
/** Hauteur d'une entrée, en rem : 2 rem font 32 px à la racine 16, au-dessus du
 *  plancher de 24. ⚠️ Elle sert à CHOISIR le côté, jamais à sortir de la bande utile. */
const RANGEE_REM = 2
const AIR_REM = 0.5

const STYLE_ENTREE: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
  minHeight: `${RANGEE_REM}rem`, padding: '0 10px',
  background: 'none', border: 'none', cursor: 'pointer',
  font: 'inherit', fontSize: '0.75rem', color: 'var(--cs-texte)',
  textAlign: 'left', lineHeight: 1.3,
}

/**
 * LE MENU ⋮ D'UNE TÊTE DE VOLET.
 *
 * ⛔ IL VIT DANS UN PORTAIL, et ce n'est pas un rangement : le volet est en
 * `overflow-y: auto` et `overflow-x: hidden`, si bien qu'une boîte posée dedans se
 * ferait couper des deux côtés et défilerait avec la liste des divisions.
 *
 * ⛔ IL SE PLACE PAR `placerFenetre`, comme toute fenêtre ancrée du site : elle borne
 * le résultat à la bande utile — jamais sous la barre de navigation, jamais hors de
 * l'écran — et rend la hauteur au-delà de laquelle la boîte défile en dedans.
 *
 * ⛔ SON RANG EST `Z_MODALE`. Sur un téléphone, la tête du volet vit DANS le tiroir
 * (`Z_TIROIR`, 2401) : à un rang de fenêtre de page, le menu s'ouvrirait derrière le
 * tiroir qui vient de le demander. C'est le défaut relevé le 2026-09-09 sur cinq
 * fenêtres de cette page.
 */
export function MenuVolet({ titre, actions }: { titre: string; actions: ActionVolet[] }) {
  const [ouvert, setOuvert] = useState(false)
  const [placement, setPlacement] = useState<PlacementFenetre | null>(null)
  const refBouton = useRef<HTMLButtonElement>(null)
  const refBoite = useRef<HTMLDivElement>(null)
  const idMenu = useId()

  // ⚠️ La fermeture rend le foyer au déclencheur : sans cela, Échap laisse le clavier
  // au bout du document, là où le portail a posé la boîte.
  const fermer = useCallback(() => {
    setOuvert(false)
    refBouton.current?.focus()
  }, [])
  useFermerAEchap(ouvert, fermer)

  // Le placement se prend AVANT la peinture, sur le rectangle du bouton : posée puis
  // corrigée, la boîte se verrait sauter.
  // ⛔ On ne le REMET PAS à null en fermant : ce serait un état reposé dans le corps
  // d'un effet, que le linter refuse à bon droit — seule la MESURE du document y est
  // légitime. Le rendu est gardé par `ouvert`, et la mesure périmée d'une ouverture
  // précédente est corrigée par cet effet-ci avant la peinture suivante.
  useLayoutEffect(() => {
    if (!ouvert) return
    const ancre = refBouton.current?.getBoundingClientRect()
    if (!ancre) return
    const racine = tailleRacinePx()
    setPlacement(placerFenetre({
      ancre,
      largeur: LARGEUR_REM * racine,
      hauteurSouhaitee: actions.length * RANGEE_REM * racine + AIR_REM * 2 * racine,
      vue: { largeur: window.innerWidth, hauteur: window.innerHeight },
      hautNavbar: hauteurNavbarPx(),
    }))
  }, [ouvert, actions.length])

  // ⛔ Un menu ANCRÉ ne suit pas son ancre : le volet défile sous lui, et la fenêtre
  // se redimensionne. On ferme plutôt que de poursuivre — c'est ce que fait tout menu
  // du site, et poursuivre coûterait une boucle d'images pour un objet qu'on ferme
  // aussitôt qu'on a choisi. ⚠️ En CAPTURE : un défilement ne remonte pas, mais il
  // descend, et c'est le seul moyen d'entendre le défileur interne du volet.
  useEffect(() => {
    if (!ouvert) return
    const auDehors = (e: PointerEvent) => {
      const cible = e.target as Node
      if (refBoite.current?.contains(cible) || refBouton.current?.contains(cible)) return
      setOuvert(false)
    }
    const partir = () => setOuvert(false)
    document.addEventListener('pointerdown', auDehors)
    window.addEventListener('scroll', partir, true)
    window.addEventListener('resize', partir)
    return () => {
      document.removeEventListener('pointerdown', auDehors)
      window.removeEventListener('scroll', partir, true)
      window.removeEventListener('resize', partir)
    }
  }, [ouvert])

  // Le foyer entre dans la boîte à l'ouverture : un menu qu'on ouvre au clavier et
  // qu'il faut ensuite aller chercher par la tabulation n'est pas atteignable.
  useEffect(() => {
    if (ouvert && placement) refBoite.current?.querySelector('button')?.focus()
  }, [ouvert, placement])

  return (
    <>
      <BoutonVolet titre={titre} onClick={() => setOuvert(o => !o)} refBouton={refBouton}
        aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? idMenu : undefined}>
        {/* Trois points en colonne : la marque commune d'un jeu d'actions replié. */}
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.35" /><circle cx="8" cy="8" r="1.35" /><circle cx="8" cy="13" r="1.35" />
        </svg>
      </BoutonVolet>
      {ouvert && placement && typeof document !== 'undefined' && createPortal(
        <div ref={refBoite} id={idMenu} role="menu" aria-label={titre}
          style={{
            position: 'fixed', top: placement.top, left: placement.left,
            width: `${LARGEUR_REM}rem`, maxHeight: placement.hauteurMax, overflowY: 'auto',
            overscrollBehavior: 'contain', zIndex: Z_MODALE,
            background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)',
            borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)',
            padding: `${AIR_REM}rem 0`,
          }}>
          {actions.map(a => (
            <button key={a.cle} type="button" role="menuitem" className="cs-entree-menu-volet"
              style={STYLE_ENTREE}
              onClick={() => {
                // ⚠️ Le rectangle du ⋮ est PRIS AVANT la fermeture : le bouton reste en
                // place, mais l'action qui ouvre une fenêtre ancrée doit savoir d'où.
                const ancre = refBouton.current?.getBoundingClientRect()
                setOuvert(false)
                a.onChoisir(ancre)
              }}>
              <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0, color: a.teinte ?? 'var(--cs-texte-faible)' }}>{a.icone}</span>
              {a.libelle}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
