'use client'

/**
 * LA MANCHETTE, côté document : la place qu'on mesure, la ligne de base, et les
 * renvois d'une même ligne.
 *
 * La RÈGLE vit dans `app/lib/manchetteRenvois.ts`, pure et testée ; ce crochet ne
 * fait que la jouer sur le document.
 *
 * ⛔ UN RENVOI NE QUITTE JAMAIS SA LIGNE (décision de l'auteur, 13 septembre 2026 :
 * « forcer l'alignement »). Il est posé en `position: absolute` SANS `top`, à
 * l'endroit du texte où son appel se tenait : sa position statique est la ligne qui
 * le porte, et le navigateur la tient à jour tout seul quand la colonne se recompose.
 *
 * ⚠️ AUCUN PIXEL NE SE FIGE SUR L'AXE VERTICAL. L'accord de ligne de base se pose en
 * `em` (`margin-top`), qui suit la police racine fluide sans nouvelle mesure. La passe
 * d'avant posait un `top` en pixels sur chaque renvoi : une recomposition qui ne
 * changeait aucune taille le laissait en place, et l'empilement poussait les renvois
 * voisins loin de leur appel, d'une ligne entière sur le Commentaire sur Jonas.
 *
 * ⚠️ Le bloc conteneur est la COLONNE de lecture, qui porte `position: relative`.
 * Aucun bloc du chemin de rendu n'est positionné entre les deux — vérifié le
 * 8 septembre 2026 sur `styleParagrapheLecture`, `.para-bilingue` et `.seg-inline`.
 * ⛔ Poser un `position: relative` sur un paragraphe ferait tomber toute la
 * manchette dedans, et elle sortirait par la gauche du paragraphe au lieu de la
 * colonne.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ECART_MANCHETTE_REM,
  GOUTTIERE_MANCHETTE,
  STYLE_RENVOI_MANCHETTE,
  manchetteTient,
  rangerSurLaLigne,
} from '@/app/lib/manchetteRenvois'
import { tailleRacinePx } from '@/app/lib/fenetreContextuelle'

// ⚠️ L'alias DOIT être une constante de module nommée « use… », sinon la règle des
// hooks d'ESLint ne le reconnaît pas (piège déjà consigné pour la carte d'auteur).
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * LA DROITE DE BASE d'un renvoi, celle que React pose EN LIGNE depuis
 * `STYLE_RENVOI_MANCHETTE`.
 *
 * ⛔ `style.right = ''` EFFACE cette déclaration en ligne, et le renvoi retombe dans le
 * texte, à la place de son appel : vu en ligne le 13 septembre 2026, les renvois posés
 * par-dessus la fin de leur ligne, sauf celui qu'une ligne partagée avait décalé. React ne
 * la repose pas, puisque son objet de style n'a pas changé. On revient donc à CETTE
 * valeur, jamais à rien.
 */
const DROITE_DE_BASE = String(STYLE_RENVOI_MANCHETTE.right)

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

/**
 * Dit si une TRANSFORMATION s'interpose entre le renvoi et la colonne.
 *
 * ⛔ Un `transform` fait de l'élément qui le porte le BLOC CONTENEUR de tous ses
 * descendants absolus, fussent-ils positionnés depuis bien plus haut (CSS Transforms,
 * § « Transform rendering »). Or le passage d'un texte à l'autre translate CHAQUE bloc
 * de six pixels — `cs-lecture-paraitre`, `translateY(6px)` — et la manchette, mesurée
 * pendant cette translation, se pose six pixels trop bas. ⚠️ Elle y RESTE : la
 * translation ne change aucune taille, le `ResizeObserver` ne dit rien, et la clé de
 * lecture n'a pas rechangé. Mesuré en ligne sur les Annotations sur Job, le 9 septembre
 * 2026 : la manchette passait de 1561,01 px à 1567,01, et l'écart des lignes de base
 * valait −5,99 px une fois le passage joué.
 *
 * ⚠️ La charte connaissait déjà ce piège par l'autre bout : l'ouverture d'une page ne
 * porte QUE l'opacité, « une transformation ferait de la colonne le bloc conteneur des
 * cellules d'actions posées en `fixed` ». C'est la même règle, un cran plus bas.
 *
 * ⛔ On ne mesure donc pas : on attend la fin du passage, que l'écoute d'`animationend`
 * rappelle. L'accord posé par la passe d'avant, lui, est juste et reste en place.
 */
function sousUneTransformation(entree: HTMLElement, colonne: Element): boolean {
  for (let n = entree.parentElement; n && n !== colonne; n = n.parentElement) {
    const style = getComputedStyle(n)
    if (style.transform !== 'none' || style.translate !== 'none'
      || style.scale !== 'none' || style.rotate !== 'none') return true
  }
  return false
}

/** La marque que porte un renvoi posé en manchette. */
export const CLASSE_RENVOI_MANCHETTE = 'cs-manchette-renvoi'

/**
 * Dit si la manchette a la place de paraître, et range les renvois d'une même ligne.
 *
 * ⛔ Elle se mesure sur le CONTENEUR, jamais sur la fenêtre : les deux volets de la
 * page d'œuvre s'ouvrent, se ferment et se traînent à la poignée, et la marge libre
 * change sans que la fenêtre bouge. C'est la règle déjà posée pour la carte de
 * traduction du volet de la Bible.
 *
 * ⚠️ LA PLACE COMPTE AUSSI LA LIGNE LA PLUS CHARGÉE. Deux renvois d'une même ligne se
 * rangent côte à côte, et leur rangée peut réclamer plus que la colonne de la manchette.
 * Si elle ne tient pas dans la marge libre, la manchette se retire de la page, comme
 * faute de place : un renvoi qui mordrait sur le volet ne se lirait plus. ⛔ La largeur
 * réclamée est RETENUE pour la lecture en cours, sans quoi la manchette reparaîtrait au
 * rendu suivant, pour se retirer aussitôt, et ainsi de suite.
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
   * n'avait pas rechangé et rien ne la rappelait. Mesuré en ligne sur La Cité de Dieu,
   * le 9 septembre 2026 : après un changement de division, la manchette se tenait
   * 7,78 px trop haut.
   */
  cleDeLecture: string,
): boolean {
  // ⚠️ Il part à FAUX, donc au rendu serveur : la manchette PARAÎT après la première
  // mesure. Partir à vrai la montrerait puis la retirerait là où la place manque, et
  // le texte sauterait — c'est le patron de la référence d'édition du volet de la Bible.
  const [actif, setActif] = useState(false)
  // La largeur que la ligne la plus chargée a réclamée, pour CETTE lecture.
  const reclame = useRef({ cle: '', largeur: 0 })

  useMesureAvantPeinture(() => {
    const el = colonne.current
    const hote = el?.parentElement
    if (!el || !hote) return
    if (reclame.current.cle !== cleDeLecture) reclame.current = { cle: cleDeLecture, largeur: 0 }

    const jouer = () => {
      // 1. LA PLACE. Ce qui reste à gauche de la colonne, jusqu'au bord du bloc de
      //    lecture — au delà commence le volet du sommaire.
      const libre = el.getBoundingClientRect().left - hote.getBoundingClientRect().left
      const racine = tailleRacinePx()
      const tient = manchetteTient(libre, racine) && libre >= reclame.current.largeur
      setActif(tient)
      if (!tient) return

      const entrees = Array.from(el.querySelectorAll<HTMLElement>(`.${CLASSE_RENVOI_MANCHETTE}`))
      if (entrees.length === 0) return
      // ⛔ Pas un pixel tant qu'un passage joue : sous une transformation, la colonne
      //    n'est plus le bloc conteneur, et ce qu'on mesurerait là se figerait faux.
      if (entrees.some(entree => sousUneTransformation(entree, el))) return

      // 2. LA POSITION STATIQUE. ⛔ Chaque renvoi y revient avant toute mesure : sans
      //    cela, la passe mesurerait l'accord que la précédente a posé. ⛔ Et sa droite
      //    revient à la valeur de base, JAMAIS à rien (voir `DROITE_DE_BASE`).
      for (const entree of entrees) {
        entree.style.marginTop = ''
        entree.style.right = DROITE_DE_BASE
      }
      const haut = el.getBoundingClientRect().top
      const boites = entrees.map(entree => entree.getBoundingClientRect())
      const decalages = decalagesDeLigne(entrees)
      const corps = Number.parseFloat(getComputedStyle(entrees[0]).fontSize)

      // 3. LES RENVOIS D'UNE MÊME LIGNE, côte à côte, et la place que leur rangée réclame.
      const ranges = rangerSurLaLigne(
        entrees.map((_, rang) => ({ cle: String(rang), ligne: boites[rang].top - haut, largeur: boites[rang].width })),
        ECART_MANCHETTE_REM * racine,
      )
      const gouttiere = Number.parseFloat(GOUTTIERE_MANCHETTE) * racine
      const largeur = Math.max(...ranges.map(({ cle, decalage }) => decalage + boites[Number(cle)].width)) + gouttiere
      if (largeur > libre) {
        reclame.current.largeur = largeur
        setActif(false)
        return
      }

      // 4. L'ÉCRITURE. La ligne de base en `em`, qui suit la police racine sans nouvelle
      //    mesure ; le rang sur la ligne en pixels, que la passe suivante refait si la
      //    colonne se recompose.
      for (const { cle, decalage } of ranges) {
        const rang = Number(cle)
        const entree = entrees[rang]
        entree.style.marginTop = decalages[rang] && corps ? `${(decalages[rang] / corps).toFixed(4)}em` : ''
        entree.style.right = decalage > 0
          ? `calc(100% + ${GOUTTIERE_MANCHETTE} + ${decalage.toFixed(2)}px)`
          : DROITE_DE_BASE
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
    // ⛔ UNE POLICE ARRIVÉE TARD recompose les lignes sans toujours changer une taille, et
    //    le `ResizeObserver` ne dit alors rien. La ligne de base, posée en `em`, n'en
    //    souffre pas ; le rang sur la ligne, si : deux appels peuvent changer de ligne.
    document.fonts.addEventListener('loadingdone', surReflux)
    // ⛔ La FIN d'un passage rappelle la passe, et il le faut : c'est le seul moment où
    //    la transformation s'en va, et rien d'autre ne le dit — une translation ne
    //    change aucune taille. Les deux événements sont nécessaires : `animationend`
    //    quand le passage se joue jusqu'au bout, `animationcancel` quand la classe est
    //    retirée avant. Ils remontent des blocs jusqu'à la colonne.
    el.addEventListener('animationend', surReflux)
    el.addEventListener('animationcancel', surReflux)
    return () => {
      if (demande) cancelAnimationFrame(demande)
      observateur.disconnect()
      window.removeEventListener('resize', surReflux)
      document.fonts.removeEventListener('loadingdone', surReflux)
      el.removeEventListener('animationend', surReflux)
      el.removeEventListener('animationcancel', surReflux)
    }
    // ⛔ `actif` est dans les dépendances, et il le faut : au premier rendu la
    // manchette n'existe pas encore — ce sont les appels qui sont dans le texte —,
    // si bien que la passe n'aurait rien à ranger. La mesure repose l'état, React rend
    // les repères, et l'effet rejoue une fois sur eux. Il ne boucle pas : reposer la
    // même valeur ne redéclenche aucun rendu, et la largeur retenue empêche la
    // manchette de reparaître là où sa rangée la plus chargée ne tient pas.
  }, [colonne, cleDeLecture, actif])

  return actif
}
