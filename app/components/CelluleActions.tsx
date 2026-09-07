'use client'

// LA CELLULE D'ACTIONS — prélever · copier · signaler, et le crayon de l'administrateur.
//
// ⛔ UN SEUL OBJET POUR TOUT LE SITE. Cinq surfaces le montraient de quatre façons, et
// deux d'entre elles couvraient le texte qu'on venait de survoler :
//
//  · la Bible classique le pose dans une gouttière réservée, à droite du bloc de texte,
//    et sur un pavé flottant AU-DESSUS du verset au doigt — c'est la règle, et elle n'a
//    pas bougé ;
//  · la lecture d'une œuvre le fait flotter par `positionCellule` — la règle encore ;
//  · les traductions en regard gardaient le calcul BRIDÉ que `celluleActions.ts` donne
//    en contre-exemple depuis le 2026-08-22 : quand la droite manquait, la cellule ne se
//    déplaçait pas, elle revenait sur la fin de la ligne ;
//  · la Polyglotte et les arguments d'une œuvre la posaient EN ABSOLU dans le coin haut
//    droit du texte, c'est-à-dire par-dessus sa première ligne.
//
// ⛔ LA CELLULE SE MESURE ELLE-MÊME, et c'est ce qui permet de la placer juste sans que
// personne ait à compter ses boutons. Le gabarit (`largeurGabarit`) ne sert qu'au premier
// placement ; la mesure le corrige dans un effet de MISE EN PAGE, donc avant la peinture.
// Le lecteur ne voit jamais la position estimée.
//
// ⚠️ ELLE SUIT SON TEXTE AU DÉFILEMENT, elle ne se fige pas. Elle est en `position:
// fixed` : sans cela, une molette actionnée pendant qu'elle est ouverte la laissait sur
// place pendant que le texte glissait dessous — le défaut même qu'on corrige, sous une
// autre forme. Au doigt elle se referme, un repositionnement continu y étant saccadé.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  positionCellule, largeurGabarit, GRACE_SURVOL_MS, MARGE_CELLULE, STYLE_CELLULE,
  type EspaceCellule, type PositionCellule,
} from '@/app/lib/celluleActions'
import { hauteurNavbarPx } from '@/app/lib/fenetreContextuelle'

// La cellule se MESURE puis se replace avant la peinture : sans cela, on la verrait un
// instant à sa position estimée avant qu'elle ne saute à la bonne. `useLayoutEffect`
// n'existe pas au rendu serveur, d'où le repli — même patron que la bibliothèque.
// ⚠️ L'alias doit être une constante de MODULE nommée « use… », sinon la règle des
// hooks d'ESLint ne le reconnaît pas (charte, « un nombre de LIGNES ne s'écrit pas en dur »).
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Ce sur quoi la cellule est posée. La CLÉ identifie la cible (un segment, un verset) ;
 *  elle sert de `key` à la cellule — voir plus bas, c'est ce qui empêche l'état des
 *  boutons de passer d'une cible à la suivante. */
export type AncreCellule<K, D = undefined> = {
  cle: K
  /** L'élément survolé : la cellule s'y appuie et le suit. */
  el: HTMLElement
  /** Ce qu'il faut pour composer les boutons, quand la page ne sait pas le retrouver
   *  depuis la seule clé. ⚠️ La Polyglotte est dans ce cas : la donnée d'une cellule vit
   *  au fond de quatre boucles imbriquées (livre, ligne, colonne, verset d'origine), et
   *  la reconstruire au-dehors demanderait quatre index de plus. ⛔ La CLÉ reste
   *  comparable — c'est elle qui identifie la cible, jamais cet attirail. */
  donnees?: D
  /** L'espace où la cellule a le droit de se poser. Défaut : la fenêtre.
   *  En GRILLE — une colonne de la Polyglotte, une colonne de comparaison — c'est la
   *  colonne : à droite d'une cellule de tableau, il y a le texte du voisin. */
  borne?: HTMLElement | null
  /** Ligne au-dessus de laquelle la cellule ne monte pas. Défaut : le bas de la barre
   *  de navigation, MESURÉ — `HAUTEUR_NAVBAR` vaut 3,5 rem et la racine est fluide, si
   *  bien que la barre fait 56 px à la racine 16 et 77 à la racine 22. Une page qui
   *  porte en plus un en-tête COLLANT (la Polyglotte) passe le bas de cet en-tête. */
  sommet?: number
}

export type OptionsAncrage<D = undefined> = { borne?: HTMLElement | null; sommet?: number; donnees?: D }

/** Le survol, le tap, la grâce de sortie et la fermeture. Toute la mécanique que les
 *  surfaces réécrivaient chacune pour soi. */
export function useCelluleActions<K, D = undefined>() {
  const [ancre, setAncre] = useState<AncreCellule<K, D> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const retenir = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }, [])

  const ancrer = useCallback((el: HTMLElement, cle: K, options?: OptionsAncrage<D>) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setAncre({ cle, el, borne: options?.borne ?? null, sommet: options?.sommet, donnees: options?.donnees })
  }, [])

  /** Sortie du texte : on laisse le temps d'aller du dernier mot jusqu'aux boutons. */
  const relacher = useCallback((cle: K) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(
      () => setAncre(prev => (prev && Object.is(prev.cle, cle) ? null : prev)),
      GRACE_SURVOL_MS,
    )
  }, [])

  const fermer = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setAncre(null)
  }, [])

  /** Tap : re-taper la cible active referme, au lieu de replacer la cellule indéfiniment. */
  const basculer = useCallback((el: HTMLElement, cle: K, actif: boolean, options?: OptionsAncrage<D>) => {
    if (actif) fermer()
    else ancrer(el, cle, options)
  }, [ancrer, fermer])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { ancre, ancrer, relacher, retenir, fermer, basculer }
}

export type CelluleActionsProps<K, D = undefined> = {
  ancre: AncreCellule<K, D> | null
  /** Le curseur entre dans la cellule : on annule la fermeture en cours. */
  onRetenir: () => void
  /** Le curseur en sort : on relâche, avec le délai de grâce. */
  onRelacher: (cle: K) => void
  /** La cible a disparu, ou l'on tape ailleurs. */
  onFermer: () => void
  /** Vrai sur un écran sans survol : on referme au défilement plutôt que de suivre. */
  sansSurvol?: boolean
  /** Nombre de boutons rendus, pour le placement d'AVANT mesure. Facultatif : la cellule
   *  se mesure de toute façon, ce chiffre ne fait qu'épargner un rendu. */
  boutons?: number
  children: React.ReactNode
}

export function CelluleActions<K, D = undefined>(props: CelluleActionsProps<K, D>) {
  const { ancre } = props
  if (!ancre || typeof document === 'undefined') return null
  // ⛔ La CLÉ est la cible, et sans elle la cellule ne fait qu'un seul objet pour toute la
  // page : React réutilise l'instance quand elle se déplace d'une cible à la suivante, et
  // l'état des boutons passe avec elle — le « ✓ » de la copie, la fenêtre de signalement
  // ouverte, et le signet, dont c'était le défaut le plus coûteux (voir `BoutonsSegment`).
  // ⚠️ Elle est posée ICI et non par l'appelant : un appelant peut l'oublier.
  return <CelluleAncree key={String(ancre.cle)} {...props} ancre={ancre} />
}

function CelluleAncree<K, D>({
  ancre, onRetenir, onRelacher, onFermer, sansSurvol, boutons, children,
}: CelluleActionsProps<K, D> & { ancre: AncreCellule<K, D> }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<PositionCellule | null>(null)

  const placer = useCallback(() => {
    const el = ancre.el
    // La cible a quitté le document (une tranche rechargée, une division tournée) :
    // la cellule n'a plus rien à commander.
    if (!el.isConnected) { onFermer(); return }
    const r = el.getBoundingClientRect()
    // Sortie de l'écran par le haut ou par le bas : on ferme au lieu de laisser une
    // cellule flotter au-dessus d'un texte qu'on ne voit plus.
    if (r.bottom < 0 || r.top > window.innerHeight) { onFermer(); return }

    const espace: EspaceCellule = {
      droite: window.innerWidth,
      sommet: ancre.sommet ?? hauteurNavbarPx(),
      // ⚠️ Le PIED sert le troisième côté : quand le dessus est bouché, la cellule passe
      // dessous, mais seulement si elle y reste visible.
      pied: window.innerHeight - MARGE_CELLULE,
    }
    if (ancre.borne) {
      const b = ancre.borne.getBoundingClientRect()
      espace.droite = b.right
      espace.gauche = b.left
    }
    // ⛔ La mesure PASSE AVANT le gabarit : c'est la largeur réelle, boutons rendus, qui
    // décide si la cellule tient à droite. Le gabarit ne sert qu'au tout premier rendu,
    // où la cellule n'a pas encore de boîte à donner.
    const mesuree = ref.current?.getBoundingClientRect().width
    espace.largeur = mesuree && mesuree > 0 ? mesuree : largeurGabarit(boutons ?? 4)

    // ⛔ On passe le rectangle ENTIER : `bottom` est ce qui permet de descendre sous le
    // texte quand ni la droite ni le dessus ne sont libres.
    const p = positionCellule(r, espace)
    setPos(prev =>
      prev && prev.top === p.top && prev.left === p.left && prev.cote === p.cote ? prev : p)
  }, [ancre.el, ancre.borne, ancre.sommet, boutons, onFermer])

  // ⛔ Effet de MISE EN PAGE, non un effet ordinaire : il s'exécute après le rendu et
  // AVANT la peinture. La correction apportée par la mesure n'est donc jamais visible.
  // ⚠️ Il POSE un état dans son corps, et c'est ici l'usage même de l'outil : mesurer le
  // document est la seule chose qu'un composant ne peut pas faire pendant son rendu.
  useMesureAvantPeinture(() => { placer() }, [placer])

  // La cellule suit son texte. ⚠️ En CAPTURE : un événement de défilement ne remonte pas,
  // mais il descend — c'est la seule façon d'entendre un défileur interne (la colonne de
  // la page Bible, le corps de la Polyglotte) sans savoir lequel c'est.
  useEffect(() => {
    if (sansSurvol) {
      const fermerAuDefilement = () => onFermer()
      window.addEventListener('scroll', fermerAuDefilement, { capture: true, passive: true })
      window.addEventListener('resize', fermerAuDefilement)
      return () => {
        window.removeEventListener('scroll', fermerAuDefilement, { capture: true })
        window.removeEventListener('resize', fermerAuDefilement)
      }
    }
    let image = 0
    const suivre = () => {
      if (image) return
      image = requestAnimationFrame(() => { image = 0; placer() })
    }
    window.addEventListener('scroll', suivre, { capture: true, passive: true })
    window.addEventListener('resize', suivre)
    return () => {
      cancelAnimationFrame(image)
      window.removeEventListener('scroll', suivre, { capture: true })
      window.removeEventListener('resize', suivre)
    }
  }, [placer, sansSurvol, onFermer])

  // Au doigt, rien ne se survole : c'est un tap AILLEURS qui referme. On ne juge pas sur
  // une classe CSS — la cible est l'élément ancré lui-même, quelle que soit la surface.
  useEffect(() => {
    if (!sansSurvol) return
    const auTapDehors = (e: Event) => {
      const cible = e.target as Node | null
      if (!cible) return
      if (ref.current?.contains(cible)) return
      if (ancre.el.contains(cible)) return
      onFermer()
    }
    document.addEventListener('pointerdown', auTapDehors, true)
    return () => document.removeEventListener('pointerdown', auTapDehors, true)
  }, [sansSurvol, ancre.el, onFermer])

  return createPortal(
    <div
      ref={ref}
      data-cellule-actions=""
      onMouseEnter={onRetenir}
      onMouseLeave={() => onRelacher(ancre.cle)}
      style={{
        ...STYLE_CELLULE,
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        // Tant que la mesure n'a pas eu lieu, la cellule occupe sa place sans être peinte :
        // `useLayoutEffect` la corrige avant la peinture, donc cet état ne se voit jamais.
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
