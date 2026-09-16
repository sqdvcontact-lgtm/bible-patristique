'use client'

// Le cadre de TOUTES les pages de l'administration : le sommaire en volet à gauche, la page à
// sa droite (demande de l'auteur, 14 septembre 2026 : « uniformiser toutes les pages de
// l'administration pour qu'elles portent le sommaire en volet gauche »).
//
// Le volet vivait dans la seule page /admin, et le centre de contrôle portait le sien, fait
// d'autre chose. Les pages autonomes (Audience, Illustrations et sa revue des gravures de
// Fillion, Planche des styles) n'en avaient aucun : on n'en sortait que par le menu du haut.
// Il vit désormais dans `app/admin/layout.tsx`, et une page d'administration créée demain le
// porte sans que personne ait à y penser.
//
// ⚠️ Les sections de /admin se BASCULENT SUR PLACE : l'adresse change par l'API d'historique
// du navigateur, que le routeur de Next suit, et la page lit sa section dans l'adresse. Rien
// ne se recharge, et l'adresse d'une section se partage et se rouvre.
// ⚠️ Le layout ne se rend pas de nouveau d'une page à l'autre : c'est ce qui garde le volet en
// place, et c'est pourquoi l'entrée ouverte se lit ici, dans l'adresse, et non dans le layout.
// ⛔ `prefetch={false}` sur chaque lien : une trentaine d'entrées préchargées à l'ouverture
// feraient autant de rendus serveur, et le temps de calcul des fonctions est le budget le plus
// disputé du site.

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type CSSProperties, type MouseEvent, type ReactNode,
} from 'react'
import { supabase } from '@/app/lib/supabase'
import { ENTREES_ADMIN, FAMILLES_ADMIN, type EntreeAdmin } from '@/app/lib/adminNavigation'
import { ADRESSE_SYSTEME, SEGMENT_SYSTEME, adresseDeMission } from './controle/missions'
import {
  CHEMIN_CENTRE, basculeSurPlace, compterCeQuiAttend, dansLeCentreDeControle, entreeOuverte, estCompteur, vueDuCentre,
  type CleCompteur, type CompteursAdmin,
} from './sommaireAdmin'

export type MissionDuSommaire = { cle: string; titre: string }

type ValeurCadre = {
  compteurs: CompteursAdmin
  /** Pose le compte d'une section, relevé par la section elle-même. */
  poserCompteur: (cle: CleCompteur, n: number) => void
  /** Retire une unité, quand la section vient de traiter un élément de sa file. */
  retirerUn: (cle: CleCompteur) => void
}

const SANS_EFFET = () => {}

const ContexteCadre = createContext<ValeurCadre>({
  compteurs: { essais: null, liens: null, moderation: null, courrier: null },
  poserCompteur: SANS_EFFET,
  retirerUn: SANS_EFFET,
})

/** Les compteurs du sommaire. Hors du cadre (une page chargée dans un cadre, un essai), les
 *  gestes restent sans effet : une page n'a pas à savoir si un sommaire la porte. */
export function useCompteursAdmin(): ValeurCadre {
  return useContext(ContexteCadre)
}

/** Le recomptage court toutes les trente secondes, et seulement si la page est à l'écran. */
const RECOMPTE_MS = 30_000

export default function CadreAdministration({ compteursInitiaux, missions, erreurMissions, children }: {
  compteursInitiaux: CompteursAdmin
  missions: readonly MissionDuSommaire[]
  erreurMissions: string | null
  children: ReactNode
}) {
  const chemin = usePathname() ?? '/admin'
  const onglet = useSearchParams().get('onglet')
  const router = useRouter()
  const [compteurs, setCompteurs] = useState<CompteursAdmin>(compteursInitiaux)

  useEffect(() => {
    let fini = false
    const recompter = async () => {
      try {
        const attente = await compterCeQuiAttend(supabase)
        if (fini) return
        // Un compte qui échoue garde le dernier connu : une pastille éteinte sur une panne
        // dirait que la file est vide.
        setCompteurs(avant => ({
          ...avant,
          moderation: attente.moderation ?? avant.moderation,
          essais: attente.essais ?? avant.essais,
        }))
      } catch (erreur) {
        console.error('[administration] recomptage du sommaire :', erreur)
      }
    }
    const intervalle = window.setInterval(() => { if (!document.hidden) void recompter() }, RECOMPTE_MS)
    const auRetour = () => { if (!document.hidden) void recompter() }
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      fini = true
      window.clearInterval(intervalle)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])

  const poserCompteur = useCallback((cle: CleCompteur, n: number) => {
    setCompteurs(avant => (avant[cle] === n ? avant : { ...avant, [cle]: n }))
  }, [])
  const retirerUn = useCallback((cle: CleCompteur) => {
    setCompteurs(avant => {
      const actuel = avant[cle]
      return actuel === null ? avant : { ...avant, [cle]: Math.max(0, actuel - 1) }
    })
  }, [])
  const valeur = useMemo(() => ({ compteurs, poserCompteur, retirerUn }), [compteurs, poserCompteur, retirerUn])

  const ouverte = entreeOuverte(chemin, onglet)
  const dansLeCentre = dansLeCentreDeControle(chemin)
  const vue = vueDuCentre(chemin)

  const aller = useCallback((adresse: string, entree: EntreeAdmin | undefined) => {
    if (entree && basculeSurPlace(chemin, entree)) {
      window.history.pushState(null, '', adresse)
      window.scrollTo({ top: 0 })
    } else {
      router.push(adresse)
    }
  }, [chemin, router])

  const suivre = (evenement: MouseEvent<HTMLAnchorElement>, entree: EntreeAdmin) => {
    // Un clic modifié (nouvel onglet, nouvelle fenêtre) garde le comportement du navigateur.
    if (evenement.button !== 0 || evenement.metaKey || evenement.ctrlKey || evenement.shiftKey || evenement.altKey) return
    if (!basculeSurPlace(chemin, entree)) return
    evenement.preventDefault()
    aller(entree.href, entree)
  }

  const compteDe = (entree: EntreeAdmin): number | null =>
    estCompteur(entree.onglet) ? compteurs[entree.onglet] : null

  // Le choix d'un écran étroit dit la VUE ouverte : une mission quand on est dans le centre.
  const adresseDeLaVue = vue === SEGMENT_SYSTEME ? ADRESSE_SYSTEME
    : vue && missions.some(mission => mission.cle === vue) ? adresseDeMission(vue)
    : null
  const valeurChoix = (dansLeCentre && adresseDeLaVue) || ouverte?.href || ''

  return (
    <ContexteCadre.Provider value={valeur}>
      <div className="adm-cadre">
        <a href="#adm-page" className="cs-lien-evitement">Aller à la page</a>

        <nav className="adm-sommaire cs-defilement-discret" aria-label="Sommaire de l’administration">
          {FAMILLES_ADMIN.map(famille => {
            const idTitre = `adm-famille-${famille.cle}`
            return (
              <div key={famille.cle} className="adm-famille" style={{ '--adm-teinte': famille.couleur } as CSSProperties}>
                <p id={idTitre} className="adm-famille-titre">{famille.label}</p>
                <ul aria-labelledby={idTitre}>
                  {ENTREES_ADMIN.filter(entree => entree.famille === famille.cle).map(entree => {
                    const avecVues = entree.href === CHEMIN_CENTRE && dansLeCentre
                    const n = compteDe(entree)
                    return (
                      <li key={entree.href}>
                        {entree.filet && <div aria-hidden="true" className="adm-filet" />}
                        <Link
                          href={entree.href}
                          prefetch={false}
                          className="adm-lien"
                          aria-current={ouverte === entree ? (avecVues && vue ? 'true' : 'page') : undefined}
                          onClick={evenement => suivre(evenement, entree)}
                        >
                          {entree.label}
                          {n ? (
                            <span className="adm-pastille">
                              <span className="cs-hors-ecran">, en attente : </span>{n}
                            </span>
                          ) : null}
                        </Link>
                        {avecVues && (
                          <ul className="adm-sous" aria-label="Vues du centre de contrôle">
                            {erreurMissions && (
                              <li><p className="adm-sous-erreur">La liste des missions n’a pas pu être lue : {erreurMissions}</p></li>
                            )}
                            {missions.map(mission => (
                              <li key={mission.cle}>
                                <Link href={adresseDeMission(mission.cle)} prefetch={false} className="adm-sous-lien"
                                  aria-current={vue === mission.cle ? 'page' : undefined}>
                                  {mission.titre}
                                </Link>
                              </li>
                            ))}
                            <li aria-hidden="true"><div className="adm-sous-filet" /></li>
                            <li>
                              <Link href={ADRESSE_SYSTEME} prefetch={false} className="adm-sous-lien"
                                aria-current={vue === SEGMENT_SYSTEME ? 'page' : undefined}>
                                État du contrôle v2
                              </Link>
                            </li>
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="adm-choix">
          <select aria-label="Page d’administration" value={valeurChoix}
            onChange={evenement => aller(evenement.target.value, ENTREES_ADMIN.find(entree => entree.href === evenement.target.value))}>
            {!valeurChoix && <option value="" disabled>Choisir une page</option>}
            {FAMILLES_ADMIN.map(famille => (
              <optgroup key={famille.cle} label={famille.label}>
                {ENTREES_ADMIN.filter(entree => entree.famille === famille.cle).map(entree => {
                  const n = compteDe(entree)
                  return <option key={entree.href} value={entree.href}>{entree.label}{n ? ` (${n})` : ''}</option>
                })}
              </optgroup>
            ))}
            {dansLeCentre && (
              <optgroup label="Centre de contrôle">
                {missions.map(mission => (
                  <option key={mission.cle} value={adresseDeMission(mission.cle)}>{mission.titre}</option>
                ))}
                <option value={ADRESSE_SYSTEME}>État du contrôle v2</option>
              </optgroup>
            )}
          </select>
        </div>

        <div id="adm-page" tabIndex={-1} className="adm-colonne">{children}</div>
      </div>
    </ContexteCadre.Provider>
  )
}
