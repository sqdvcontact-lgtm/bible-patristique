'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

/**
 * Le clic est ACQUITTÉ.
 *
 * Une page servie par le serveur ne change pas d'écran tant qu'elle n'est pas
 * prête : le routeur garde l'ancienne, et rien ne bouge. Sur la Bible commentée,
 * cela dure de sept à neuf dixièmes de seconde — le temps de croire qu'on a mal
 * cliqué, de cliquer encore, et de partir. Le `loading.tsx` de la route n'y
 * paraît pas : seule la requête d'adresse change.
 *
 * ⛔ La réponse n'est PAS un squelette de page. Il remplacerait tout, volets
 * compris, à chaque changement de chapitre : un clignotement pire que l'attente.
 * C'est une marque d'attente posée SUR la lecture, qui reste lisible dessous.
 *
 * Ce module tient l'attente pour toute une page : `ProvisionAttente` l'ouvre,
 * `useNaviguer` remplace `router.push` là où l'on navigue, et `useEnAttente`
 * dit à la marque quand paraître. ⚠️ Hors provision, `useNaviguer` rend une
 * navigation ordinaire : un composant partagé (le volet des livres sert aussi
 * la Polyglotte) n'a pas à savoir s'il est sous provision.
 */
type Attente = {
  enAttente: boolean
  naviguer: (url: string) => void
  /** Demande la page AVANT le clic, au survol. Une fois par adresse. */
  precharger: (url: string) => void
  /** Ce que la page fait AU DÉPART, avant que l'adresse ne change : retenir où
   *  l'on en était, commencer l'effacement. Posé par `useAvantDeNaviguer`. */
  surDepart: MutableRefObject<((url: string) => void) | null>
}

const ContexteAttente = createContext<Attente | null>(null)

export function ProvisionAttente({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [enAttente, demarrer] = useTransition()
  const dejaPrechargees = useRef<Set<string>>(new Set())
  const surDepart = useRef<((url: string) => void) | null>(null)

  const naviguer = useCallback((url: string) => {
    surDepart.current?.(url)
    // `scroll: false` : c'est la page qui décide de son défilement à l'arrivée
    // (voir `BibleLayout`), pas le routeur, qui remonterait tout en haut.
    demarrer(() => router.push(url, { scroll: false }))
  }, [router])

  const precharger = useCallback((url: string) => {
    if (dejaPrechargees.current.has(url)) return
    dejaPrechargees.current.add(url)
    // ⚠️ `kind: 'full'` n'est pas un ornement : un préchargement ordinaire
    // s'arrête au `loading.tsx` de la route et ne rapporte donc rien de ce qui
    // coûte. La valeur est publique et stable ; l'énumération qui la nomme vit
    // dans les entrailles de Next, et on ne l'importe pas pour autant.
    router.prefetch(url, { kind: 'full' } as Parameters<typeof router.prefetch>[1])
  }, [router])

  const valeur = useMemo(() => ({ enAttente, naviguer, precharger, surDepart }), [enAttente, naviguer, precharger])
  return <ContexteAttente.Provider value={valeur}>{children}</ContexteAttente.Provider>
}

/** Pose ce que la page fait au départ de TOUTE navigation passée par la provision,
 *  d'où qu'elle vienne (volet des livres, flèches de chapitre, menus). La fonction
 *  est reprise à chaque rendu, pour lire l'état courant. Hors provision : rien. */
export function useAvantDeNaviguer(fn: (url: string) => void) {
  const contexte = useContext(ContexteAttente)
  useEffect(() => {
    if (!contexte) return
    contexte.surDepart.current = fn
    return () => { contexte.surDepart.current = null }
  })
}

export function useNaviguer(): (url: string) => void {
  const contexte = useContext(ContexteAttente)
  const router = useRouter()
  return contexte?.naviguer ?? ((url: string) => router.push(url))
}

export function usePrecharger(): (url: string) => void {
  const contexte = useContext(ContexteAttente)
  return contexte?.precharger ?? (() => {})
}

export function useEnAttente(): boolean {
  return useContext(ContexteAttente)?.enAttente ?? false
}

/**
 * La marque d'attente : un anneau qui tourne, au centre du BLOC DE TEXTE.
 *
 * ⚠️ Elle ne paraît qu'au bout d'un DEMI-INSTANT (160 ms). Une navigation déjà
 * préchargée revient en moins de temps qu'il n'en faut pour la voir, et une
 * marque qui apparaît et disparaît dans le même souffle se lit comme un défaut,
 * non comme une réponse. Passé ce délai, elle paraît d'un coup : c'est une
 * réponse au clic, elle n'a pas à se faire attendre elle-même.
 *
 * ⛔ Elle ne masque pas la page : le texte reste lisible dessous, à peine voilé.
 * On sait alors deux choses au lieu d'une — que le clic a porté, et ce qu'on
 * était en train de lire.
 *
 * ⛔ Elle se pose DANS le bloc de lecture, jamais sur l'écran entier (demande de
 * l'auteur, 2026-09-03) : elle couvrait tout ce qui est sous la barre, volets
 * compris, et l'anneau tombait au milieu de l'écran, à côté du texte qu'il
 * concernait. Elle couvre donc son PARENT (`position: absolute; inset: 0`), qui
 * doit porter `position: relative` : la colonne de lecture de la Bible, le
 * `<main>` de l'œuvre, le corps du tableau de la Polyglotte.
 *
 * ⚠️ L'anneau se centre dans la part VISIBLE du bloc, non dans sa hauteur
 * entière. Un bloc qui défile avec la page (l'œuvre, la Polyglotte) peut faire
 * dix écrans, et un anneau centré sur dix écrans tombe hors de vue. D'où l'enfant
 * COLLANT (`position: sticky`), haut d'un écran au plus, qui suit le défilement ;
 * dans un bloc qui tient à l'écran (la colonne de la Bible), il remplit le bloc
 * et ne bouge pas.
 */
/**
 * LA MARQUE D'ATTENTE D'UN VOLET : l'anneau seul, sans voile.
 *
 * Demande de l'auteur du 4 septembre 2026 : « quand je change de segment, au moment du
 * chargement, supprimer immédiatement (de façon smooth) les références déjà affichées ;
 * afficher un petit symbole de chargement ». Le volet de droite gardait les références
 * du passage PRÉCÉDENT jusqu'à l'arrivée des suivantes, sous un mot « Chargement… » :
 * on lisait donc, pendant une seconde, l'apparat d'un verset qu'on venait de quitter.
 *
 * ⛔ Pas de voile ici, à la différence de `MarqueAttente` : un volet de trois cents
 * pixels assombri d'un bord à l'autre se lit comme un rideau, non comme une attente. Et
 * l'anneau y descend d'un tiers — celui de la page fait 2,25 rem, ce qui, dans une
 * colonne étroite, est un objet et non un signe.
 *
 * ⚠️ Le même délai de cent soixante millisecondes : une réponse plus prompte que lui
 * n'allume rien, et un anneau qui s'allume et s'éteint dans le même souffle se lit comme
 * un défaut.
 */
export function MarqueAttenteVolet({ enAttente }: { enAttente: boolean }) {
  const [allume, setAllume] = useState(false)
  useEffect(() => {
    if (!enAttente) return
    const minuteur = setTimeout(() => setAllume(true), 160)
    return () => { clearTimeout(minuteur); setAllume(false) }
  }, [enAttente])
  if (!enAttente || !allume) return null
  return (
    <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', padding: '22px 0' }}>
      <span
        style={{
          display: 'block',
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '50%',
          border: '2px solid var(--cs-bord)',
          borderTopColor: 'var(--cs-vert)',
          animation: 'spin 0.7s linear infinite',
        }}
      />
    </div>
  )
}

export function MarqueAttente({ enAttente, sommet = HAUTEUR_NAVBAR }: {
  enAttente: boolean
  /**
   * Le HAUT du bloc qu'on couvre, quand ce n'est pas le bas de la barre de navigation.
   *
   * ⛔ L'anneau se centre sur la part VISIBLE du bloc, et cette part ne commence pas
   * toujours sous la barre : la Polyglotte pose au-dessus de son tableau un en-tête
   * collant de soixante pixels, sous lequel rien ne se lit. Mesuré sur la page servie,
   * l'anneau tombait trente-cinq pixels trop haut, à cheval sur cet en-tête (demande de
   * l'auteur, 2026-09-04 : « le symbole de chargement doit être centré dans le bloc
   * dédié au tableau, au centre, en hauteur comme en largeur »).
   * ⚠️ La LARGEUR, elle, n'a jamais eu besoin de réglage : le voile couvre son parent
   * positionné, donc exactement le bloc, et l'anneau s'y centre.
   */
  sommet?: string
}) {
  const [allume, setAllume] = useState(false)
  // ⚠️ Un EFFET ici, et non le recalage pendant le rendu employé ailleurs dans le
  // dépôt : ce qu'on règle est un MINUTEUR, c'est-à-dire un système extérieur, et
  // c'est le cas pour lequel l'effet est fait. Le nettoyage annule le compte à
  // rebours, si bien qu'une navigation plus courte que le délai n'allume rien.
  // ⛔ Rien ne s'éteint DANS le corps de l'effet : un `setState` synchrone y
  // déclencherait un rendu en cascade. L'extinction se lit sur `enAttente`, qui
  // retombe seul, et le nettoyage rembobine le témoin pour la fois suivante.
  useEffect(() => {
    if (!enAttente) return
    const minuteur = setTimeout(() => setAllume(true), 160)
    return () => { clearTimeout(minuteur); setAllume(false) }
  }, [enAttente])
  if (!enAttente || !allume) return null

  return (
    <div
      aria-hidden="true"
      style={{
        // Le voile couvre le BLOC, et lui seul : les volets, qui ne changent
        // pas, n'ont pas à s'assombrir.
        position: 'absolute',
        inset: 0,
        // Un voile assez léger pour qu'on lise à travers : la page ne disparaît
        // pas, elle attend. ⛔ Jamais un jeton d'ENCRE ici — sur le Cuir il est
        // presque blanc, et le voile deviendrait un rideau (charte).
        background: 'rgba(0,0,0,0.04)',
        zIndex: 900,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          // ⚠️ Sous la BARRE, qui est fixe : un bloc qui défile avec la page passe
          // dessous, l'anneau ne doit pas y passer avec lui.
          position: 'sticky',
          top: sommet,
          height: `min(100%, calc(100dvh - ${sommet}))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '50%',
            border: '2px solid var(--cs-bord)',
            borderTopColor: 'var(--cs-vert)',
            animation: 'spin 0.7s linear infinite',
            background: 'var(--cs-surface)',
            boxShadow: 'var(--cs-ombre-flottante)',
          }}
        />
      </div>
    </div>
  )
}
