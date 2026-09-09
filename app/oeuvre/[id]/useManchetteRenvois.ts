'use client'

/**
 * LA MANCHETTE, côté document : la place qu'on mesure, et l'empilement.
 *
 * La RÈGLE vit dans `app/lib/manchetteRenvois.ts`, pure et testée ; ce crochet ne
 * fait que la jouer sur le document.
 *
 * ⛔ Le PLACEMENT ordinaire ne se calcule pas : un renvoi est posé en
 * `position: absolute` SANS `top`, à l'endroit du texte où son appel se tenait. Sa
 * position statique est donc, par construction, la ligne qui le porte — le
 * navigateur la connaît, et il la tient à jour tout seul quand la colonne se
 * recompose. Ce qui se calcule ici est le seul cas où deux renvois se heurtent, et
 * la mesure a dit que c'est un couple sur cinq, soit environ 3 % des renvois.
 *
 * ⚠️ Le bloc conteneur est la COLONNE de lecture, qui porte `position: relative`.
 * Aucun bloc du chemin de rendu n'est positionné entre les deux — vérifié le
 * 8 septembre 2026 sur `styleParagrapheLecture`, `.para-bilingue` et `.seg-inline`.
 * ⛔ Poser un `position: relative` sur un paragraphe ferait tomber toute la
 * manchette dedans, et elle sortirait par la gauche du paragraphe au lieu de la
 * colonne.
 */
import { useEffect, useLayoutEffect, useState } from 'react'
import { manchetteTient, placerManchette } from '@/app/lib/manchetteRenvois'
import { tailleRacinePx } from '@/app/lib/fenetreContextuelle'

// ⚠️ L'alias DOIT être une constante de module nommée « use… », sinon la règle des
// hooks d'ESLint ne le reconnaît pas (piège déjà consigné pour la carte d'auteur).
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * UNE SONDE DE LIGNE DE BASE : une boîte de hauteur nulle alignée sur la ligne de
 * base, dont le bord BAS s'y pose exactement.
 *
 * ⛔ On ne peut pas la calculer : elle dépend des métriques de la police, que le CSS
 * n'expose pas. Et l'on ne peut pas s'en passer — la position statique d'un bloc
 * absolu est le haut de sa LIGNE, non sa ligne de base, si bien qu'un renvoi de
 * 0,625 rem posé contre un texte de 0,8125 rem se pose SIX PIXELS TROP HAUT (mesuré
 * le 8 septembre 2026). Un renvoi en marge qui ne s'aligne pas sur sa ligne ne
 * désigne plus rien.
 *
 * ⚠️ MESURÉE plutôt qu'écrite en constante : les deux corps sont en rem, la police
 * racine est fluide, et un nombre de pixels serait juste à une seule taille d'écran.
 * C'est la leçon déjà payée sur la marge de référence de la Polyglotte.
 */
function poserSonde(hote: Element, avant: Node | null): HTMLSpanElement {
  const sonde = document.createElement('span')
  sonde.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  hote.insertBefore(sonde, avant)
  return sonde
}

/**
 * L'écart entre la ligne de base du TEXTE et celle du renvoi, POUR CHAQUE ENTRÉE.
 *
 * ⛔ IL SE MESURE PAR ENTRÉE, et ce fichier a dit le contraire jusqu'au 9 septembre
 * 2026 : « les métriques sont les mêmes pour toutes les entrées ». Elles ne le sont
 * pas. L'écart vaut « demi-approche + ascendante du TEXTE » moins la même chose du
 * RENVOI ; le second terme est constant, le premier dépend du corps et de
 * l'interligne de la ligne qui porte l'appel, et une colonne de lecture en mêle
 * plusieurs. Mesuré en ligne sur La Cité de Dieu : trois renvois de prose à 0,00 px,
 * et celui qui tombe dans une CITATION SORTIE (0,95 em) à **−2,22 px**.
 *
 * ⚠️ La portée est étroite et elle est mesurée : aucun renvoi du corpus ne tombe sur
 * un vers, un verset, un exergue ni une signature. Le seul cas réel est la citation
 * sortie — 1 246 segments de plus de 400 signes en portent un dans le latin de la
 * Cité de Dieu, 1 118 dans son français, 593 dans le Commentaire sur les Psaumes.
 *
 * ⚠️ UNE SEULE MISE EN PAGE, et c'est ce qui rend la mesure par entrée gratuite : on
 * pose TOUTES les sondes, on lit TOUS les rectangles, puis on les retire. Les poser
 * et les lire une par une en coûterait deux par entrée.
 */
function decalagesDeLigne(entrees: readonly HTMLElement[]): number[] {
  const sondes = entrees.map(entree => {
    const marque = entree.parentElement
    const premier = entree.firstElementChild ?? entree
    if (!marque?.parentElement || !premier.firstChild) return null
    return {
      texte: poserSonde(marque.parentElement, marque),
      renvoi: poserSonde(premier, premier.firstChild),
    }
  })
  const ecarts = sondes.map(sonde => sonde
    ? sonde.texte.getBoundingClientRect().bottom - sonde.renvoi.getBoundingClientRect().bottom
    : 0)
  for (const sonde of sondes) { sonde?.texte.remove(); sonde?.renvoi.remove() }
  return ecarts
}

/** La marque que porte un renvoi posé en manchette. */
export const CLASSE_RENVOI_MANCHETTE = 'cs-manchette-renvoi'

/**
 * Dit si la manchette a la place de paraître, et empile ce qui se heurte.
 *
 * ⛔ Elle se mesure sur le CONTENEUR, jamais sur la fenêtre : les deux volets de la
 * page d'œuvre s'ouvrent, se ferment et se traînent à la poignée, et la marge libre
 * change sans que la fenêtre bouge. C'est la règle déjà posée pour la carte de
 * traduction du volet de la Bible.
 */
export function useManchetteRenvois(
  colonne: React.RefObject<HTMLElement | null>,
  /**
   * Ce qui, en changeant, refait la lecture — et il faut y compter CE QUI EST RENDU,
   * non seulement où l'on se trouve.
   *
   * ⛔ La clé ne portait que la division, la page et le mode. Or une division se charge
   * APRÈS que `niv1Actif` a changé : la passe se rejouait donc sur une colonne encore
   * vide, n'y trouvait aucun renvoi et sortait ; quand les segments arrivaient, la clé
   * n'avait pas rechangé et rien ne la rappelait. Le placement ne tenait plus qu'au
   * `ResizeObserver`, c'est-à-dire à un effet de bord — et il ne le tenait qu'après
   * coup. Mesuré en ligne sur La Cité de Dieu, le 9 septembre 2026 : à l'arrivée
   * `style.top` est posé et l'écart vaut 0,00 px ; après un changement de division il
   * est VIDE, et la manchette se tient 7,78 px trop haut.
   */
  cleDeLecture: string,
): boolean {
  // ⚠️ Il part à FAUX, donc au rendu serveur : la manchette PARAÎT après la première
  // mesure. Partir à vrai la montrerait puis la retirerait là où la place manque, et
  // le texte sauterait — c'est le patron de la référence d'édition du volet de la Bible.
  const [actif, setActif] = useState(false)

  useMesureAvantPeinture(() => {
    const el = colonne.current
    const hote = el?.parentElement
    if (!el || !hote) return

    const jouer = () => {
      // 1. LA PLACE. Ce qui reste à gauche de la colonne, jusqu'au bord du bloc de
      //    lecture — au delà commence le volet du sommaire.
      const libre = el.getBoundingClientRect().left - hote.getBoundingClientRect().left
      const tient = manchetteTient(libre, tailleRacinePx())
      setActif(tient)
      if (!tient) return

      // 2. LA LIGNE, puis l'EMPILEMENT. ⛔ On rend d'abord chaque renvoi à sa position
      //    STATIQUE : sans cela, la passe suivante mesurerait le décalage que la
      //    précédente a posé, et la manchette descendrait un peu plus à chaque reflux.
      const entrees = Array.from(el.querySelectorAll<HTMLElement>(`.${CLASSE_RENVOI_MANCHETTE}`))
      if (entrees.length === 0) return
      for (const entree of entrees) entree.style.top = ''
      const haut = el.getBoundingClientRect().top
      const boites = entrees.map(entree => entree.getBoundingClientRect())
      const decalages = decalagesDeLigne(entrees)
      const aPlacer = entrees.map((entree, rang) => ({
        cle: String(rang),
        ancre: boites[rang].top - haut + decalages[rang],
        hauteur: boites[rang].height,
      }))
      // ⚠️ On pose `top` sur TOUTES les entrées, non sur les seules poussées : la
      //    correction de ligne de base vaut pour chacune, et la position statique ne
      //    la porte pas.
      for (const place of placerManchette(aPlacer)) {
        const entree = entrees[Number(place.cle)]
        entree.style.top = `${place.top}px`
        entree.toggleAttribute('data-pousse', place.pousse)
      }
    }

    jouer()

    // Une image par reflux, pas davantage : la colonne se recompose au chargement
    // des polices, au redimensionnement, et à chaque traînée de poignée de volet.
    let demande = 0
    const surReflux = () => {
      if (demande) return
      demande = requestAnimationFrame(() => { demande = 0; jouer() })
    }
    const observateur = new ResizeObserver(surReflux)
    observateur.observe(el)
    observateur.observe(hote)
    window.addEventListener('resize', surReflux)
    return () => {
      if (demande) cancelAnimationFrame(demande)
      observateur.disconnect()
      window.removeEventListener('resize', surReflux)
    }
    // ⛔ `actif` est dans les dépendances, et il le faut : au premier rendu la
    // manchette n'existe pas encore — ce sont les appels qui sont dans le texte —,
    // si bien que la passe d'empilement n'aurait rien à empiler. La mesure repose
    // l'état, React rend les repères, et l'effet rejoue une fois sur eux. Il ne
    // boucle pas : reposer la même valeur ne redéclenche aucun rendu.
  }, [colonne, cleDeLecture, actif])

  return actif
}
