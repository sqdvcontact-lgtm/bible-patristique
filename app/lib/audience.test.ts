import { describe, expect, it } from 'vitest'
import {
  appareilDepuisUA,
  cheminNormalise,
  estCheminMesure,
  estRobot,
  hoteDuReferent,
  rubriqueDuChemin,
} from './audience'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

describe('estCheminMesure', () => {
  it('mesure les pages du site', () => {
    expect(estCheminMesure('/')).toBe(true)
    expect(estCheminMesure('/oeuvre/A0010O0002')).toBe(true)
    expect(estCheminMesure('/administration-des-choses')).toBe(true)
  })

  it("écarte l'administration, qui est l'auteur du site et non son public", () => {
    expect(estCheminMesure('/admin')).toBe(false)
    expect(estCheminMesure('/admin/audience')).toBe(false)
  })

  it('écarte les routes techniques', () => {
    expect(estCheminMesure('/api/audience/vue')).toBe(false)
    expect(estCheminMesure('/auth/callback')).toBe(false)
    expect(estCheminMesure('/_next/static/x.js')).toBe(false)
  })

  it("refuse ce qui n'est pas un chemin", () => {
    expect(estCheminMesure('https://ailleurs.fr/page')).toBe(false)
  })
})

describe('cheminNormalise', () => {
  it('retire la chaîne de requête, qui porterait les termes cherchés', () => {
    expect(cheminNormalise('/recherche?q=augustin+trinite')).toBe('/recherche')
  })

  it("retire l'ancre et la barre finale", () => {
    expect(cheminNormalise('/oeuvre/A1#segment-4')).toBe('/oeuvre/A1')
    expect(cheminNormalise('/essais/')).toBe('/essais')
  })

  it('garde la racine telle quelle', () => {
    expect(cheminNormalise('/')).toBe('/')
  })

  it('borne la longueur', () => {
    expect(cheminNormalise('/' + 'a'.repeat(500))).toHaveLength(300)
  })
})

describe('rubriqueDuChemin', () => {
  it('nomme la famille de la page', () => {
    expect(rubriqueDuChemin('/')).toBe('accueil')
    expect(rubriqueDuChemin('/oeuvre/A0010O0002')).toBe('œuvres')
    expect(rubriqueDuChemin('/pericopes/12')).toBe('péricopes')
    expect(rubriqueDuChemin('/confidentialite')).toBe('pages légales')
  })

  it('regroupe ce qui relève du compte', () => {
    expect(rubriqueDuChemin('/prelevements')).toBe('compte')
    expect(rubriqueDuChemin('/notifications')).toBe('compte')
  })

  it('range sous « autre » ce qui n’est pas répertorié', () => {
    expect(rubriqueDuChemin('/rubrique-inventee')).toBe('autre')
  })
})

describe('estRobot', () => {
  it('reconnaît les robots qui s’annoncent', () => {
    expect(estRobot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
    expect(estRobot('curl/8.4.0')).toBe(true)
    expect(estRobot('HeadlessChrome/120.0')).toBe(true)
  })

  it('laisse passer un navigateur', () => {
    expect(estRobot(CHROME)).toBe(false)
    expect(estRobot(IPHONE)).toBe(false)
  })

  it('tient pour robot ce qui n’annonce rien', () => {
    expect(estRobot(null)).toBe(true)
  })
})

describe('appareilDepuisUA', () => {
  it('distingue le téléphone de l’ordinateur', () => {
    expect(appareilDepuisUA(IPHONE)).toBe('mobile')
    expect(appareilDepuisUA(CHROME)).toBe('bureau')
    expect(appareilDepuisUA(null)).toBe('bureau')
  })
})

describe('hoteDuReferent', () => {
  it('ne garde que l’hôte, jamais la requête tapée par le visiteur', () => {
    expect(hoteDuReferent('https://www.google.com/search?q=augustin+cite+de+dieu', 'corpus-scriptura.fr'))
      .toBe('google.com')
  })

  it('écarte le référent interne, qui ne dit rien de la provenance', () => {
    expect(hoteDuReferent('https://corpus-scriptura.fr/essais', 'corpus-scriptura.fr')).toBeNull()
    expect(hoteDuReferent('https://www.corpus-scriptura.fr/essais', 'corpus-scriptura.fr')).toBeNull()
  })

  it('rend null sur une absence ou une adresse illisible', () => {
    expect(hoteDuReferent(null, 'corpus-scriptura.fr')).toBeNull()
    expect(hoteDuReferent('pas une adresse', 'corpus-scriptura.fr')).toBeNull()
  })
})
