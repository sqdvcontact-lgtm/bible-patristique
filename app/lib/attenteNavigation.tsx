'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
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
}

const ContexteAttente = createContext<Attente | null>(null)

export function ProvisionAttente({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [enAttente, demarrer] = useTransition()
  const dejaPrechargees = useRef<Set<string>>(new Set())

  const naviguer = useCallback((url: string) => {
    demarrer(() => router.push(url))
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

  const valeur = useMemo(() => ({ enAttente, naviguer, precharger }), [enAttente, naviguer, precharger])
  return <ContexteAttente.Provider value={valeur}>{children}</ContexteAttente.Provider>
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
 * La marque d'attente : un anneau qui tourne, au centre de la lecture.
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
 */
export function MarqueAttente({ enAttente }: { enAttente: boolean }) {
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
        // ⚠️ Sous la BARRE, jamais dessus : elle ne change pas, elle n'a pas à
        // s'assombrir. Le reste de l'écran est couvert, volets compris, parce
        // que c'est la page entière qui se prépare.
        position: 'fixed',
        top: HAUTEUR_NAVBAR,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Un voile assez léger pour qu'on lise à travers : la page ne disparaît
        // pas, elle attend. ⛔ Jamais un jeton d'ENCRE ici — sur le Cuir il est
        // presque blanc, et le voile deviendrait un rideau (charte).
        background: 'rgba(0,0,0,0.04)',
        zIndex: 900,
        pointerEvents: 'none',
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
  )
}
