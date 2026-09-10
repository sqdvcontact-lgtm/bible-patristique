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
// rangée était SOUS lui (l'étoile faisait 17). Trois actions passent donc sous un ⋮ :
// la rangée tombe à 80 px (39 %), le nom retrouve 114 px, et la plus petite cible
// passe de 17 à 24.
//
// ⛔ ET LA COMPOSITION NE CHANGE PAS AVEC LA LARGEUR. On aurait pu ne condenser que
// dans un volet étroit, par une requête de conteneur ; c'est ce que la charte proscrit
// depuis la barre de navigation — « une entrée qui change de place selon la largeur de
// la fenêtre ne s'apprend jamais ». La rangée porte les mêmes trois cibles partout, et
// c'est leur MESURE qui suit l'écran (globals.css, « LA RANGÉE D'ACTIONS »).
//
// ⚠️ CE QUI RESTE DEHORS, ET POURQUOI. L'étoile, parce qu'elle n'est pas seulement une
// action mais un ÉTAT — pleine, elle dit que l'œuvre est rangée dans les favoris, et un
// état qu'il faut ouvrir un menu pour lire n'est plus un état. Le chevron, parce qu'il
// est le contrôle du volet lui-même et le plus employé des cinq : on ne referme pas un
// panneau en ouvrant d'abord un menu qui vit dedans.
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
  onClick: () => void
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

/** Une entrée du menu ⋮. `icone` est le MÊME glyphe que la rangée portait : le menu
 *  ne change pas les dessins, il leur ajoute leur nom. */
export type ActionVolet = {
  cle: string
  libelle: string
  icone: React.ReactNode
  onChoisir: () => void
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
              onClick={() => { setOuvert(false); a.onChoisir() }}>
              <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0, color: 'var(--cs-texte-faible)' }}>{a.icone}</span>
              {a.libelle}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
