import { describe, expect, it } from 'vitest'
import { ENTREES_ADMIN } from '../lib/adminNavigation'
import {
  basculeSurPlace, dansLeCentreDeControle, entreeOuverte, estCompteur, ongletDemande, vueDuCentre,
} from './sommaireAdmin'

const section = (onglet: string) => ENTREES_ADMIN.find(entree => entree.onglet === onglet)!
const page = (href: string) => ENTREES_ADMIN.find(entree => entree.href === href)!

describe('la section demandée par l’adresse', () => {
  it('lit une clé connue', () => {
    expect(ongletDemande('traductions')).toBe('traductions')
  })

  it('retombe sur la Bibliothèque sans clé, ou sur une clé inconnue', () => {
    expect(ongletDemande(null)).toBe('bibliotheque')
    expect(ongletDemande('')).toBe('bibliotheque')
    expect(ongletDemande('inconnu')).toBe('bibliotheque')
  })
})

describe('l’entrée ouverte', () => {
  it('lit la section sur /admin, barre finale comprise', () => {
    expect(entreeOuverte('/admin', 'traductions')).toBe(section('traductions'))
    expect(entreeOuverte('/admin/', 'moderation')).toBe(section('moderation'))
    expect(entreeOuverte('/admin', null)).toBe(section('bibliotheque'))
  })

  it('désigne une page autonome, et les pages qu’elle porte', () => {
    // La clé `onglet` d'une autre page ne dit rien au sommaire : l'audience a ses propres onglets.
    expect(entreeOuverte('/admin/audience', 'visites')).toBe(page('/admin/audience'))
    expect(entreeOuverte('/admin/illustrations/fillion', null)).toBe(page('/admin/illustrations'))
    expect(entreeOuverte('/admin/controle/qualite', null)).toBe(page('/admin/controle'))
  })

  it('ne prend pas un préfixe qui ne s’arrête pas à une barre', () => {
    expect(entreeOuverte('/admin/illustrationsx', null)).toBeNull()
    expect(entreeOuverte('/admin/taches', null)).toBeNull()
  })

  it('retrouve CHAQUE entrée de la table à son adresse', () => {
    // La table grandit : une entrée qu'aucune adresse n'ouvre serait un lien que le sommaire
    // ne saurait jamais désigner.
    for (const entree of ENTREES_ADMIN) {
      if (entree.onglet) expect(entreeOuverte('/admin', entree.onglet)).toBe(entree)
      else if (entree.href.startsWith('/admin/')) expect(entreeOuverte(entree.href, null)).toBe(entree)
    }
  })
})

describe('ce qui se bascule sur place', () => {
  it('une section de /admin, quand on y est', () => {
    expect(basculeSurPlace('/admin', section('courrier'))).toBe(true)
  })

  it('jamais depuis une autre page, ni pour une page autonome', () => {
    expect(basculeSurPlace('/admin/audience', section('courrier'))).toBe(false)
    expect(basculeSurPlace('/admin', page('/admin/audience'))).toBe(false)
  })
})

describe('le centre de contrôle', () => {
  it('se reconnaît à son adresse', () => {
    expect(dansLeCentreDeControle('/admin/controle')).toBe(true)
    expect(dansLeCentreDeControle('/admin/controle/systeme')).toBe(true)
    expect(dansLeCentreDeControle('/admin/controleur')).toBe(false)
    expect(dansLeCentreDeControle('/admin')).toBe(false)
  })

  it('nomme la vue ouverte', () => {
    expect(vueDuCentre('/admin/controle')).toBeNull()
    expect(vueDuCentre('/admin/controle/qualite')).toBe('qualite')
    expect(vueDuCentre('/admin/controle/systeme/')).toBe('systeme')
    expect(vueDuCentre('/admin/controle/espace%20lecteur')).toBe('espace lecteur')
    expect(vueDuCentre('/admin/audience')).toBeNull()
  })
})

describe('les compteurs', () => {
  it('ne se posent que sur les sections qui attendent une réponse', () => {
    expect(estCompteur('moderation')).toBe(true)
    expect(estCompteur('courrier')).toBe(true)
    expect(estCompteur('bibliotheque')).toBe(false)
    expect(estCompteur(undefined)).toBe(false)
  })
})
