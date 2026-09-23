'use client'

// ── LA LISTE D'UN MENU DE BIBLES — ce qui s'ouvre quand on clique ─────────────
//
// La page Bible (`SelecteurTraductionBible`) et le volet de droite d'une œuvre ouvrent la
// MÊME liste, et la composaient chacun à sa façon : lignes aérées en sérif et familles
// dépliées en sous-menu d'un côté ; de l'autre, des lignes serrées en sans, sans famille
// ni clavier. Décision de l'auteur, 15 septembre 2026 : « dans le menu de sélection des
// traductions bibliques du volet de droite, reprendre le menu de la page Bible classique
// (mise en forme intérieure, quand on a cliqué ; pas le bouton lui-même) ».
//
// ⛔ LE BOUTON RESTE À CHAQUE PAGE, LA LISTE EST UNE. Ce composant ne connaît ni le
// déclencheur ni sa place : il reçoit sa position (`style`), le cadre qui les contient
// tous deux (`cadre`, pour savoir ce qu'est « cliquer à côté ») et la façon de se fermer.
//
// ⛔ LES FORMES VIENNENT DE `stylesMenuBibles.ts` et la composition des familles de
// `menuTraductionsBible.ts` : ce composant ne fait que les rendre.
//
// ⚠️ La Polyglotte garde sa propre liste (`ChoixTraduction`) : elle vit dans un portail,
// grise les colonnes déjà prises et dit l'échange. Elle prend les mêmes formes.
//
// ⛔ LE SOUS-MENU D'UNE FAMILLE VIT DANS UN PORTAIL (16 septembre 2026). Posé en absolu
// contre sa ligne, il restait prisonnier de ce qui contient la liste : le volet de droite
// d'une œuvre défile (`overflow-y: auto`), et un défileur rogne tout ce dont le bloc
// conteneur vit en lui. Le sous-menu, ouvert vers le texte, s'arrêtait donc au bord du volet
// comme s'il passait SOUS le bloc central (relevé de l'auteur : « actuellement, il passe
// au-dessous »). Hors du volet, rien ne le rogne, et son rang le pose au-dessus du texte.
//
// ⛔ LE CÔTÉ SE DÉCLARE, ET LE CHEVRON LE SUIT (`cote`, même décision : « le sous-menu
// déroulant, et la flèche qui signale son existence, doivent être du côté gauche »). La page
// Bible ouvre à droite, le volet de droite d'une œuvre à gauche, vers le texte : le chevron
// passe en tête de la ligne et regarde à gauche, et les flèches du clavier s'inversent avec
// lui. Le côté déclaré cède à l'autre quand la place manque (`placerSousMenu`).

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import IconeChevron from '@/app/components/IconeChevron'
import { Z_MODALE } from '@/app/lib/empilement'
import { useSansSurvol } from '@/app/lib/useEstMobile'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { entreesDuMenu, type BibleDuMenu } from '@/app/lib/menuTraductionsBible'
import {
  DELAI_REPLI_MS, FOND_SURVOL_MENU, LARGEUR_SOUS_MENU_REM, STYLE_CADRE_MENU, STYLE_CHEVRON_MENU,
  TAILLE_CHEVRON_MENU, placerSousMenu, rangDeCirculation, styleLigneMenu,
  type CoteSousMenu, type PlacementSousMenu,
} from '@/app/lib/stylesMenuBibles'

type Props = {
  /** L'identifiant de la liste, que le bouton nomme dans `aria-controls`. */
  id: string
  /** Le nom de la liste pour une synthèse vocale : « Bibles disponibles ». */
  libelle: string
  traductions: readonly BibleDuMenu[]
  traductionIndex: number
  /** Choisir une bible : l'appelant change la traduction ET ferme. */
  choisir: (index: number) => void
  /** Fermer sans choisir. `rendreLeFoyer` vaut vrai au clavier (Échap), où le foyer doit
   *  revenir au bouton ; faux au clic à côté, où il est déjà ailleurs. */
  fermer: (rendreLeFoyer: boolean) => void
  /** Ce qui contient le bouton ET la liste : un clic dedans n'est pas un clic à côté. */
  cadre: RefObject<HTMLElement | null>
  /** La place de la liste, propre à chaque page. */
  style: CSSProperties
  /** Le côté où les familles déploient leur sous-menu, et où leur chevron se pose. */
  cote?: CoteSousMenu
  /** Ouvrir une famille EN REGARD, à partir de l'index de son texte d'origine. Absent, le
   *  sous-menu ne propose que les langues (le volet de droite d'une œuvre). */
  choisirEnRegard?: (index: number) => void
  /** La page lit-elle déjà la famille active en regard ? */
  enRegard?: boolean
}

export default function ListeMenuBibles({ id, libelle, traductions, traductionIndex, choisir, fermer, cadre, style, cote = 'droite', choisirEnRegard, enRegard = false }: Props) {
  const [deploye, setDeploye] = useState<{ cle: string; place: PlacementSousMenu } | null>(null)
  const lignes = useRef<(HTMLButtonElement | null)[]>([])
  const sousLignes = useRef<(HTMLButtonElement | null)[]>([])
  const boiteSousMenu = useRef<HTMLDivElement>(null)
  const repli = useRef<number | null>(null)
  // La mise au point différée d'un sous-menu qu'on ouvre au clavier : retirée si la liste
  // se démonte avant, ou si une autre la remplace.
  const focusDiffere = useRef<number | null>(null)
  // L'axe est la CAPACITÉ du pointeur, jamais la largeur de l'écran.
  const sansSurvol = useSansSurvol()
  // Les flèches du clavier suivent le côté : on entre dans le sous-menu par la flèche qui
  // regarde vers lui, et l'on en sort par l'autre.
  const toucheOuvrir = cote === 'gauche' ? 'ArrowLeft' : 'ArrowRight'
  const toucheFermer = cote === 'gauche' ? 'ArrowRight' : 'ArrowLeft'
  const entrees = entreesDuMenu(traductions)
  const rangActif = Math.max(0, entrees.findIndex(e =>
    e.sorte === 'bible' ? e.index === traductionIndex : e.membres.some(m => m.index === traductionIndex)))

  const annulerRepli = () => {
    if (repli.current !== null) { window.clearTimeout(repli.current); repli.current = null }
  }
  const replierBientot = () => {
    annulerRepli()
    repli.current = window.setTimeout(() => { repli.current = null; setDeploye(null) }, DELAI_REPLI_MS)
  }
  // ⚠️ Un repli en attente ne survit pas à la liste : il reposerait un état sur un
  // composant démonté.
  useEffect(() => {
    const minuteur = repli
    const miseAuPoint = focusDiffere
    return () => {
      if (minuteur.current !== null) window.clearTimeout(minuteur.current)
      if (miseAuPoint.current !== null) window.clearTimeout(miseAuPoint.current)
    }
  }, [])

  // La liste se referme comme tout menu du site : au clic à côté, et à la touche
  // d'échappement. Les deux écouteurs ne vivent que tant qu'elle est montée.
  useEffect(() => {
    const dehors = (e: PointerEvent) => {
      const cible = e.target as Node
      // ⚠️ Le sous-menu vit dans un portail, HORS du cadre : sans ce second regard, le
      // pointeur posé sur l'une de ses lignes fermait la liste avant qu'elle soit choisie.
      if (cadre.current?.contains(cible) || boiteSousMenu.current?.contains(cible)) return
      fermer(false)
    }
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer(true)
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
    }
  }, [cadre, fermer])

  // À l'ouverture, le clavier arrive sur la bible qu'on lit, ou sur sa famille : c'est le
  // point de départ naturel pour en changer. La mise au point se fait après le rendu.
  useEffect(() => {
    lignes.current[rangActif]?.focus()
  }, [rangActif])

  // ⛔ UN SOUS-MENU ANCRÉ NE SUIT PAS SA LIGNE : il est posé en coordonnées de fenêtre, et la
  // liste défile avec le volet ou avec la page. On le replie au premier défilement, et au
  // redimensionnement, comme tout menu ancré du site (`MenuVolet`). ⚠️ En CAPTURE : un
  // défilement ne remonte pas, et c'est le seul moyen d'entendre le défileur du volet.
  const sousMenuOuvert = deploye !== null
  useEffect(() => {
    if (!sousMenuOuvert) return
    const replier = () => setDeploye(null)
    window.addEventListener('scroll', replier, true)
    window.addEventListener('resize', replier)
    return () => {
      window.removeEventListener('scroll', replier, true)
      window.removeEventListener('resize', replier)
    }
  }, [sousMenuOuvert])

  // Un sous-menu s'ouvre du côté déclaré s'il y tient, de l'autre sinon, et se pose à hauteur
  // de sa ligne. ⚠️ Sa hauteur s'estime sur celle de la ligne : ses propres lignes ont la
  // même forme. ⚠️ La vue se prend SANS sa barre de défilement (`placerSousMenu`).
  const deployer = (cle: string, ligne: HTMLElement | null, membres: number) => {
    annulerRepli()
    if (!ligne) return
    const racine = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const rect = ligne.getBoundingClientRect()
    const page = document.documentElement
    setDeploye({ cle, place: placerSousMenu({
      ligne: rect, cote,
      largeur: LARGEUR_SOUS_MENU_REM * racine,
      hauteur: membres * rect.height + 2,
      vue: { largeur: page.clientWidth, hauteur: page.clientHeight },
    }) })
  }

  // Flèches, début et fin : la circulation attendue d'une liste de choix. On ne change
  // de bible qu'à la validation, le déplacement ne recharge rien.
  const circuler = (e: React.KeyboardEvent, rang: number, liste: (HTMLButtonElement | null)[], total: number) => {
    const cible = rangDeCirculation(e.key, rang, total)
    if (cible === null) return false
    e.preventDefault()
    liste[cible]?.focus()
    return true
  }

  return (
    <div id={id} role="menu" aria-label={libelle} style={{ ...STYLE_CADRE_MENU, ...style }}>
      {entrees.map((entree, rang) => {
        const premiere = rang === 0
        const derniere = rang === entrees.length - 1

        if (entree.sorte === 'bible') {
          const actif = entree.index === traductionIndex
          return (
            <button key={traductions[entree.index].code} type="button" role="menuitemradio" aria-checked={actif}
              ref={el => { lignes.current[rang] = el }}
              onClick={() => choisir(entree.index)}
              onKeyDown={e => { circuler(e, rang, lignes.current, entrees.length) }}
              onMouseEnter={() => { if (deploye) setDeploye(null) }}
              className={actif ? undefined : 'cs-ligne-menu'}
              style={styleLigneMenu(actif, premiere, derniere)}>
              {rendreEnrichi(traductions[entree.index].label)}
            </button>
          )
        }

        // Une FAMILLE : son nom commun, un chevron, et au survol le sous-menu de ses
        // langues. ⛔ Le clic ne se perd pas dans le sous-menu : il ouvre le texte
        // d'origine, que le sous-menu met en tête. Le clavier suit — Entrée choisit,
        // la flèche qui regarde vers le sous-menu le déploie.
        const actif = entree.membres.some(m => m.index === traductionIndex)
        const ouverte = deploye?.cle === entree.cle
        const defaut = entree.membres[0]
        // ⛔ LA LECTURE EN REGARD SE CHOISIT AUSSI ICI (demande de l'auteur, 2026-09-21),
        // en dernière ligne du sous-menu, après les langues : « Ancien français & Français
        // moderne ». Elle reste dans le menu « Mode de lecture » du volet de gauche.
        // ⚠️ Le libellé suit la règle du volet : la langue d'ORIGINE ouvre, la traduction suit.
        const sousLignesFamille: { cle: string; libelle: string; titre: string; courant: boolean; choisir: () => void }[] = [
          ...entree.membres.map(membre => ({
            cle: traductions[membre.index].code,
            libelle: membre.libelle,
            titre: traductions[membre.index].label,
            courant: !enRegard && membre.index === traductionIndex,
            choisir: () => choisir(membre.index),
          })),
          ...(choisirEnRegard && entree.membres.length >= 2 ? [{
            cle: `${entree.cle}:regard`,
            libelle: `${entree.membres[0].libelle} & ${entree.membres[1].libelle}`,
            titre: `${entree.nom} : les deux textes en regard`,
            courant: enRegard && actif,
            choisir: () => choisirEnRegard(defaut.index),
          }] : []),
        ]
        // ⚠️ Le chevron déploie SANS choisir. ⛔ C'est un VRAI bouton, nommé (il était un
        // `span` masqué aux lecteurs d'écran, qu'on ne pouvait viser qu'à la souris) ; et
        // comme un bouton ne se pose pas dans un bouton, il vit à côté de la ligne, par-dessus
        // la place qu'une réserve invisible lui garde dans la ligne : le dessin ne bouge pas.
        const basculer = () => {
          if (ouverte) setDeploye(null)
          else deployer(entree.cle, lignes.current[rang] ?? null, sousLignesFamille.length)
        }
        const reserveChevron = (
          <span aria-hidden="true" style={{ ...STYLE_CHEVRON_MENU, visibility: 'hidden' }}>
            <IconeChevron dir={cote === 'gauche' ? 'left' : 'right'} taille={TAILLE_CHEVRON_MENU} strokeWidth={1.6} />
          </span>
        )
        return (
          <div key={entree.cle} role="none" onMouseLeave={replierBientot} style={{ position: 'relative' }}>
            <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={ouverte}
              ref={el => { lignes.current[rang] = el }}
              title={`${entree.nom} : ${sousLignesFamille.map(l => l.libelle).join(', ')}`}
              // ⛔ AU DOIGT, TOUCHER UNE FAMILLE LA DÉPLIE (2026-09-22) : sans survol, le
              // sous-menu des langues n'était atteignable que par le chevron, et le toucher
              // choisissait d'office le texte d'origine. À la souris, le clic choisit comme
              // avant, le survol ayant déjà déplié.
              onClick={() => { if (sansSurvol) basculer(); else choisir(defaut.index) }}
              onMouseEnter={e => { if (!sansSurvol) deployer(entree.cle, e.currentTarget, sousLignesFamille.length) }}
              onKeyDown={e => {
                if (circuler(e, rang, lignes.current, entrees.length)) return
                if (e.key === toucheOuvrir) {
                  e.preventDefault()
                  deployer(entree.cle, e.currentTarget, sousLignesFamille.length)
                  if (focusDiffere.current !== null) window.clearTimeout(focusDiffere.current)
                  focusDiffere.current = window.setTimeout(() => {
                    focusDiffere.current = null
                    sousLignes.current[0]?.focus({ preventScroll: true })
                  }, 0)
                } else if (e.key === toucheFermer) {
                  e.preventDefault()
                  setDeploye(null)
                }
              }}
              style={{ ...styleLigneMenu(actif, premiere, derniere), ...(ouverte && !actif ? { background: FOND_SURVOL_MENU } : null) }}>
              {cote === 'gauche' && reserveChevron}
              <span style={{ flex: 1 }}>{rendreEnrichi(entree.nom)}</span>
              {cote === 'droite' && reserveChevron}
            </button>
            <button type="button" tabIndex={-1}
              aria-label={`${ouverte ? 'Replier' : 'Afficher'} les langues de ${entree.nom}`}
              aria-expanded={ouverte}
              onClick={e => { e.stopPropagation(); basculer() }}
              onMouseEnter={() => { if (!sansSurvol) deployer(entree.cle, lignes.current[rang] ?? null, sousLignesFamille.length) }}
              style={{
                position: 'absolute', top: 0, bottom: 0, [cote === 'gauche' ? 'left' : 'right']: 0,
                width: `calc(16px + ${TAILLE_CHEVRON_MENU} + 5px)`,
                display: 'flex', alignItems: 'center',
                justifyContent: cote === 'gauche' ? 'flex-start' : 'flex-end',
                padding: cote === 'gauche' ? '0 0 0 16px' : '0 16px 0 0',
                border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8125rem',
              }}>
              <span aria-hidden="true" style={STYLE_CHEVRON_MENU}>
                <IconeChevron dir={cote === 'gauche' ? 'left' : 'right'} taille={TAILLE_CHEVRON_MENU} strokeWidth={1.6} />
              </span>
            </button>
            {ouverte && typeof document !== 'undefined' && createPortal(
              // ⛔ Le rang est celui d'une MODALE, non d'une fenêtre de page : sur un
              // téléphone, le volet d'une œuvre est un tiroir (`Z_TIROIR`), et le sous-menu
              // s'ouvrirait derrière le tiroir qui le demande (règle de `MenuVolet`).
              <div ref={boiteSousMenu} role="menu" aria-label={entree.nom}
                onMouseEnter={annulerRepli} onMouseLeave={replierBientot}
                style={{
                  ...STYLE_CADRE_MENU, position: 'fixed', zIndex: Z_MODALE,
                  top: deploye.place.top, left: deploye.place.left, right: deploye.place.right,
                  minWidth: `${LARGEUR_SOUS_MENU_REM}rem`,
                }}>
                {sousLignesFamille.map((ligne, sousRang) => {
                  const courant = ligne.courant
                  return (
                    <button key={ligne.cle} type="button" role="menuitemradio" aria-checked={courant}
                      ref={el => { sousLignes.current[sousRang] = el }}
                      title={ligne.titre}
                      onClick={ligne.choisir}
                      onKeyDown={e => {
                        if (circuler(e, sousRang, sousLignes.current, sousLignesFamille.length)) return
                        if (e.key === toucheFermer) {
                          e.preventDefault()
                          setDeploye(null)
                          lignes.current[rang]?.focus()
                        } else if (e.key === 'Tab') {
                          // ⚠️ Le portail a sorti le sous-menu de l'ordre du document : sans ce
                          // retour à sa ligne, la tabulation filait au bout de la page au lieu
                          // de passer à la ligne suivante de la liste.
                          setDeploye(null)
                          lignes.current[rang]?.focus()
                        }
                      }}
                      className={courant ? undefined : 'cs-ligne-menu'}
                      style={styleLigneMenu(courant, sousRang === 0, sousRang === sousLignesFamille.length - 1)}>
                      {rendreEnrichi(ligne.libelle)}
                    </button>
                  )
                })}
              </div>,
              document.body,
            )}
          </div>
        )
      })}
    </div>
  )
}
