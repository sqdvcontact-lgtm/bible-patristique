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
    expect(estCompteur('liens')).toBe(true)
    expect(estCompteur('bibliotheque')).toBe(false)
    expect(estCompteur(undefined)).toBe(false)
  })
})

describe('la table des entrées', () => {
  it('ne nomme deux fois ni une adresse, ni une section', () => {
    const adresses = ENTREES_ADMIN.map(entree => entree.href)
    const sections = ENTREES_ADMIN.flatMap(entree => (entree.onglet ? [entree.onglet] : []))
    expect(new Set(adresses).size).toBe(adresses.length)
    expect(new Set(sections).size).toBe(sections.length)
  })

  it('tient chaque famille d’un seul tenant, ses portes principales en tête, sans filet d’ouverture', () => {
    // Le sommaire et le menu filtrent par famille : une famille coupée en deux par une autre
    // se lirait quand même d'un bloc, mais l'ordre de la table ne dirait plus celui de l'écran.
    const familles = ENTREES_ADMIN.map(entree => entree.famille)
    const vues = familles.filter((famille, i) => familles.indexOf(famille) === i)
    for (const famille of vues) {
      const rangs = familles.flatMap((f, i) => (f === famille ? [i] : []))
      expect(rangs[rangs.length - 1] - rangs[0] + 1).toBe(rangs.length)
      const entrees = rangs.map(i => ENTREES_ADMIN[i])
      expect(entrees[0].filet).toBeFalsy()
      const principales = entrees.filter(entree => entree.principal).length
      expect(entrees.slice(0, principales).every(entree => entree.principal)).toBe(true)
    }
  })

  it('réunit les deux files de liens sous une seule entrée', () => {
    expect(section('liens').label).toBe('Liens bibliques')
    expect(ENTREES_ADMIN.some(entree => /v[ée]rifications|constituer/i.test(entree.label))).toBe(false)
    expect(ENTREES_ADMIN.some(entree => entree.href.includes('propositions-gpt'))).toBe(false)
  })
})
