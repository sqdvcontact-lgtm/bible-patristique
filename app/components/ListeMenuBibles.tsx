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

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import IconeChevron from '@/app/components/IconeChevron'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { entreesDuMenu, type BibleDuMenu } from '@/app/lib/menuTraductionsBible'
import {
  DELAI_REPLI_MS, FOND_SURVOL_MENU, LARGEUR_SOUS_MENU_REM, STYLE_CADRE_MENU, STYLE_CHEVRON_MENU,
  TAILLE_CHEVRON_MENU, rangDeCirculation, styleLigneMenu,
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
}

export default function ListeMenuBibles({ id, libelle, traductions, traductionIndex, choisir, fermer, cadre, style }: Props) {
  const [deploye, setDeploye] = useState<{ cle: string; cote: 'droite' | 'gauche' } | null>(null)
  const lignes = useRef<(HTMLButtonElement | null)[]>([])
  const sousLignes = useRef<(HTMLButtonElement | null)[]>([])
  const repli = useRef<number | null>(null)
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
    return () => { if (minuteur.current !== null) window.clearTimeout(minuteur.current) }
  }, [])

  // La liste se referme comme tout menu du site : au clic à côté, et à la touche
  // d'échappement. Les deux écouteurs ne vivent que tant qu'elle est montée.
  useEffect(() => {
    const dehors = (e: PointerEvent) => {
      if (!cadre.current?.contains(e.target as Node)) fermer(false)
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

  // Un sous-menu s'ouvre du côté où il tient : à droite de la ligne, à gauche sinon.
  const deployer = (cle: string, ligne: HTMLElement | null) => {
    annulerRepli()
    const racine = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const droite = ligne?.getBoundingClientRect().right ?? 0
    setDeploye({ cle, cote: droite + LARGEUR_SOUS_MENU_REM * racine + 16 > window.innerWidth ? 'gauche' : 'droite' })
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
              onMouseEnter={e => { if (deploye) setDeploye(null); if (!actif) e.currentTarget.style.background = FOND_SURVOL_MENU }}
              onMouseLeave={e => { if (!actif) e.currentTarget.style.background = 'var(--cs-surface)' }}
              style={styleLigneMenu(actif, premiere, derniere)}>
              {rendreEnrichi(traductions[entree.index].label)}
            </button>
          )
        }

        // Une FAMILLE : son nom commun, un chevron, et au survol le sous-menu de ses
        // langues. ⛔ Le clic ne se perd pas dans le sous-menu : il ouvre le texte
        // d'origine, que le sous-menu met en tête. Le clavier suit — Entrée choisit,
        // la flèche droite déploie.
        const actif = entree.membres.some(m => m.index === traductionIndex)
        const ouverte = deploye?.cle === entree.cle
        const defaut = entree.membres[0]
        return (
          <div key={entree.cle} role="none" style={{ position: 'relative' }} onMouseLeave={replierBientot}>
            <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={ouverte}
              ref={el => { lignes.current[rang] = el }}
              title={`${entree.nom} : ${entree.membres.map(m => m.libelle).join(', ')}`}
              onClick={() => choisir(defaut.index)}
              onMouseEnter={e => deployer(entree.cle, e.currentTarget)}
              onKeyDown={e => {
                if (circuler(e, rang, lignes.current, entrees.length)) return
                if (e.key === 'ArrowRight') {
                  e.preventDefault()
                  deployer(entree.cle, e.currentTarget)
                  window.setTimeout(() => sousLignes.current[0]?.focus(), 0)
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault()
                  setDeploye(null)
                }
              }}
              style={{ ...styleLigneMenu(actif, premiere, derniere), ...(ouverte && !actif ? { background: FOND_SURVOL_MENU } : null) }}>
              <span style={{ flex: 1 }}>{rendreEnrichi(entree.nom)}</span>
              {/* ⚠️ Le chevron déploie SANS choisir : sur un écran tactile, la main ne
                  survole pas, et c'est lui qui donne accès aux autres langues. */}
              <span aria-hidden="true" style={STYLE_CHEVRON_MENU}
                onClick={e => {
                  e.stopPropagation()
                  if (ouverte) setDeploye(null)
                  else deployer(entree.cle, e.currentTarget.parentElement)
                }}>
                <IconeChevron dir="right" taille={TAILLE_CHEVRON_MENU} strokeWidth={1.6} />
              </span>
            </button>
            {ouverte && (
              <div role="menu" aria-label={entree.nom} onMouseEnter={annulerRepli}
                style={{
                  ...STYLE_CADRE_MENU, position: 'absolute', top: '-1px', zIndex: 1,
                  minWidth: `${LARGEUR_SOUS_MENU_REM}rem`,
                  ...(deploye.cote === 'droite' ? { left: 'calc(100% + 4px)' } : { right: 'calc(100% + 4px)' }),
                }}>
                {entree.membres.map((membre, sousRang) => {
                  const courant = membre.index === traductionIndex
                  return (
                    <button key={traductions[membre.index].code} type="button" role="menuitemradio" aria-checked={courant}
                      ref={el => { sousLignes.current[sousRang] = el }}
                      title={traductions[membre.index].label}
                      onClick={() => choisir(membre.index)}
                      onKeyDown={e => {
                        if (circuler(e, sousRang, sousLignes.current, entree.membres.length)) return
                        if (e.key === 'ArrowLeft') {
                          e.preventDefault()
                          setDeploye(null)
                          lignes.current[rang]?.focus()
                        }
                      }}
                      onMouseEnter={e => { if (!courant) e.currentTarget.style.background = FOND_SURVOL_MENU }}
                      onMouseLeave={e => { if (!courant) e.currentTarget.style.background = 'var(--cs-surface)' }}
                      style={styleLigneMenu(courant, sousRang === 0, sousRang === entree.membres.length - 1)}>
                      {rendreEnrichi(membre.libelle)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
