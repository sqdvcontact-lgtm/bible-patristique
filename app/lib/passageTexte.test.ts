import { afterEach, describe, expect, it } from 'vitest'
import {
  PEREMPTION_POSITION_MS,
  adresseAvecPosition,
  adresseCourante,
  annoncerBascule,
  basculeEnAttente,
  inscrireNiv1DansLAdresse,
  lirePositionRetenue,
  positionAppliquable,
  reprendreBascule,
  retenirLaPosition,
} from './passageTexte'

describe('adresseAvecPosition', () => {
  it('emporte le niveau et le groupe, en gardant ce que l’adresse portait', () => {
    expect(adresseAvecPosition('/oeuvre/A0010O0001?texte=A0010O0001T0001&mt=la', {
      niv1: 'Livre premier', groupe: 'A0010O0001-CSEL33-AL-0012', cle: 'LEGACY:533731',
    })).toBe('/oeuvre/A0010O0001?texte=A0010O0001T0001&mt=la&niv1=Livre+premier&groupe=A0010O0001-CSEL33-AL-0012')
  })

  it('ne pose la clé qu’à défaut de groupe', () => {
    expect(adresseAvecPosition('/oeuvre/A0010O0001', { niv1: null, groupe: null, cle: 'A0010O0102:12' }))
      .toBe('/oeuvre/A0010O0001?cle=A0010O0102%3A12')
  })

  it('rend l’adresse telle quelle quand rien n’est su', () => {
    expect(adresseAvecPosition('/oeuvre/A0064O0001', { niv1: null, groupe: null, cle: null })).toBe('/oeuvre/A0064O0001')
    expect(adresseAvecPosition('/oeuvre/A0064O0001?mt=bilingue', { niv1: '', groupe: '', cle: '' })).toBe('/oeuvre/A0064O0001?mt=bilingue')
  })

  it('garde le sentinelle des liminaires, que le serveur reconnaît', () => {
    expect(adresseAvecPosition('/oeuvre/X', { niv1: '__LIMINAIRES__', groupe: null, cle: null })).toBe('/oeuvre/X?niv1=__LIMINAIRES__')
  })
})

describe('la bascule annoncée au départ et reprise à l’arrivée', () => {
  it('se reprend une seule fois', () => {
    annoncerBascule({ defilement: 1200, hauteurTete: 96 }, 1_000)
    expect(basculeEnAttente(1_050)).toBe(true)
    expect(basculeEnAttente(1_050)).toBe(true)
    expect(reprendreBascule(1_100)).toEqual({ defilement: 1200, hauteurTete: 96, instant: 1_000 })
    expect(basculeEnAttente(1_100)).toBe(false)
    expect(reprendreBascule(1_100)).toBeNull()
  })

  it('se périme : une navigation interrompue ne s’applique pas au montage suivant', () => {
    annoncerBascule({ defilement: 300, hauteurTete: null }, 1_000)
    expect(basculeEnAttente(1_000 + 19_999)).toBe(true)
    expect(basculeEnAttente(1_000 + 20_000)).toBe(false)
    expect(reprendreBascule(1_000 + 20_000)).toBeNull()
  })
})

/**
 * LA REPRISE APRÈS UN RECHARGEMENT SUBI.
 *
 * ⚠️ Pas de jsdom, qui n'est pas installé : `window` est feint sur trois lignes, ce
 * qui suffit — le module ne lit que `location`, `history` et `sessionStorage`.
 */
type FenetreFeinte = {
  location: { pathname: string; search: string }
  history: { replaceState: (etat: null, titre: string, url: string) => void }
  sessionStorage: { getItem: (c: string) => string | null; setItem: (c: string, v: string) => void }
}

let fenetre: FenetreFeinte
let magasin: Record<string, string>

function poserLaFenetre(adresse: string) {
  const [pathname, search] = adresse.split('?')
  magasin = {}
  fenetre = {
    location: { pathname, search: search ? `?${search}` : '' },
    history: {
      replaceState: (_etat, _titre, url) => {
        const [chemin, requete] = url.split('?')
        fenetre.location.pathname = chemin
        fenetre.location.search = requete ? `?${requete}` : ''
      },
    },
    sessionStorage: {
      getItem: cle => (cle in magasin ? magasin[cle] : null),
      setItem: (cle, valeur) => { magasin[cle] = valeur },
    },
  }
  ;(globalThis as { window?: unknown }).window = fenetre
}

afterEach(() => { delete (globalThis as { window?: unknown }).window })

describe('la division dans la barre d’adresse', () => {
  it('pose « niv1 » sans toucher au reste de l’adresse', () => {
    poserLaFenetre('/oeuvre/A0010O0001?texte=A0010O0001T0002&mt=bilingue')
    inscrireNiv1DansLAdresse('Livre second')
    expect(adresseCourante()).toBe('/oeuvre/A0010O0001?texte=A0010O0001T0002&mt=bilingue&niv1=Livre+second')
  })

  it('remplace la division précédente au lieu d’en ajouter une seconde', () => {
    poserLaFenetre('/oeuvre/A0010O0001?niv1=Livre+premier')
    inscrireNiv1DansLAdresse('Livre second')
    expect(adresseCourante()).toBe('/oeuvre/A0010O0001?niv1=Livre+second')
  })

  // ⛔ Le serveur préfère un passage précis à la division : les garder ferait retomber
  // un rechargement là d’où l’on vient de partir.
  it('retire le passage visé, qui ne vaut que pour l’arrivée', () => {
    poserLaFenetre('/oeuvre/A0010O0001?groupe=AL-0012&cle=LEGACY%3A533731&segment=42&mt=la')
    inscrireNiv1DansLAdresse('Livre troisième')
    expect(adresseCourante()).toBe('/oeuvre/A0010O0001?mt=la&niv1=Livre+troisi%C3%A8me')
  })

  it('n’écrit rien quand l’adresse ne changerait pas', () => {
    poserLaFenetre('/oeuvre/X?niv1=I')
    let ecritures = 0
    const vraie = fenetre.history.replaceState
    fenetre.history.replaceState = (e, t, u) => { ecritures++; vraie(e, t, u) }
    inscrireNiv1DansLAdresse('I')
    expect(ecritures).toBe(0)
  })

  it('ne casse rien sans fenêtre (rendu serveur)', () => {
    expect(adresseCourante()).toBe('')
    expect(() => inscrireNiv1DansLAdresse('I')).not.toThrow()
    expect(() => retenirLaPosition(0, 100)).not.toThrow()
    expect(lirePositionRetenue()).toBeNull()
  })
})

describe('positionAppliquable', () => {
  const retenue = { adresse: '/oeuvre/X?niv1=I', page: 0, defilement: 1200, instant: 1_000 }

  it('rend la position quand l’adresse et la fraîcheur concordent', () => {
    expect(positionAppliquable(retenue, '/oeuvre/X?niv1=I', 1, 1_000 + 2_000)).toEqual(retenue)
  })

  // ⛔ C’est la garde qui empêche la reprise de devenir une reprise de lecture : on
  // rouvre une page une minute plus tard, on attend le haut.
  it('se périme en trente secondes', () => {
    expect(positionAppliquable(retenue, '/oeuvre/X?niv1=I', 1, 1_000 + PEREMPTION_POSITION_MS - 1)).not.toBeNull()
    expect(positionAppliquable(retenue, '/oeuvre/X?niv1=I', 1, 1_000 + PEREMPTION_POSITION_MS)).toBeNull()
  })

  it('refuse une horloge qui a reculé', () => {
    expect(positionAppliquable(retenue, '/oeuvre/X?niv1=I', 1, 999)).toBeNull()
  })

  it('exige l’adresse EXACTE : une autre division n’est pas la même page', () => {
    expect(positionAppliquable(retenue, '/oeuvre/X?niv1=II', 1, 1_000)).toBeNull()
    expect(positionAppliquable(retenue, '/oeuvre/Y?niv1=I', 1, 1_000)).toBeNull()
    expect(positionAppliquable(retenue, '/oeuvre/X', 1, 1_000)).toBeNull()
  })

  // ⚠️ Une division partiellement chargée compte moins de pages qu’au départ : le
  // défilement retenu ne veut alors plus rien dire.
  it('refuse une page de pagination hors liste', () => {
    const p3 = { ...retenue, page: 3 }
    expect(positionAppliquable(p3, '/oeuvre/X?niv1=I', 4, 1_000)).toEqual(p3)
    expect(positionAppliquable(p3, '/oeuvre/X?niv1=I', 3, 1_000)).toBeNull()
    expect(positionAppliquable(p3, '/oeuvre/X?niv1=I', 0, 1_000)).toBeNull()
  })

  it('ne rend rien pour un haut de page : il n’y a rien à reprendre', () => {
    expect(positionAppliquable({ ...retenue, defilement: 0 }, '/oeuvre/X?niv1=I', 1, 1_000)).toBeNull()
    expect(positionAppliquable({ ...retenue, defilement: -5 }, '/oeuvre/X?niv1=I', 1, 1_000)).toBeNull()
    expect(positionAppliquable(null, '/oeuvre/X?niv1=I', 1, 1_000)).toBeNull()
  })
})

describe('la position retenue au fil du défilement', () => {
  it('se relit telle qu’elle a été écrite, adresse comprise', () => {
    poserLaFenetre('/oeuvre/X?niv1=I')
    retenirLaPosition(2, 3400, 5_000)
    expect(lirePositionRetenue()).toEqual({ adresse: '/oeuvre/X?niv1=I', page: 2, defilement: 3400, instant: 5_000 })
  })

  it('rend null sur un magasin vide ou corrompu, sans lever', () => {
    poserLaFenetre('/oeuvre/X')
    expect(lirePositionRetenue()).toBeNull()
    magasin['cs-position-lecture'] = 'ceci n’est pas du JSON'
    expect(lirePositionRetenue()).toBeNull()
    magasin['cs-position-lecture'] = '{"adresse":"/oeuvre/X"}'
    expect(lirePositionRetenue()).toBeNull()
  })

  it('ne lève pas quand le magasin refuse d’écrire', () => {
    poserLaFenetre('/oeuvre/X')
    fenetre.sessionStorage.setItem = () => { throw new Error('quota') }
    expect(() => retenirLaPosition(0, 100)).not.toThrow()
  })
})
