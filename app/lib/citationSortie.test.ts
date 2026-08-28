import { describe, it, expect } from 'vitest'
import {
  citationStructurelleEstLongue,
  detecterCitationSortie,
  guillemetsInternesEnFrancais,
  regrouperCitationsStructurelles,
  SEUIL_CITATION_SORTIE,
  textesCitationStructurelleSansEncadrement,
} from './citationSortie'

// Écrite en toutes lettres : dans un test, une fine insécable ne se distingue pas
// d'une espace ordinaire à la lecture (voir le piège consigné dans AGENTS.md).
const FINE = ' '

const longue = (n = SEUIL_CITATION_SORTIE + 20) => 'a'.repeat(n)

describe('guillemets internes rendus au français', () => {
  // La forme française du site porte une fine insécable au dedans des guillemets
  // (charte §3.2) : on la pose directement, plutôt que de compter sur le rendu.
  it('rend les guillemets anglais au premier niveau, fine insécable comprise', () => {
    expect(guillemetsInternesEnFrancais('il dit “oui” puis partit'))
      .toBe(`il dit «${FINE}oui${FINE}» puis partit`)
  })

  it('laisse un texte sans guillemets internes intact', () => {
    expect(guillemetsInternesEnFrancais('rien à changer')).toBe('rien à changer')
  })
})

describe('détection d’une citation à sortir', () => {
  it('sort une citation longue, isolée et terminale', () => {
    const r = detecterCitationSortie(`Augustin écrit : « ${longue()} »`)
    expect(r).not.toBeNull()
    expect(r!.avant).toBe('Augustin écrit :')
    expect(r!.citation).toBe(longue())
  })

  it('garde l’appel de note à la suite du texte cité', () => {
    const r = detecterCitationSortie(`Augustin écrit : « ${longue()} » [[15]]`)
    expect(r!.citation.endsWith('[[15]]')).toBe(true)
  })

  it('francise les guillemets internes de la citation sortie', () => {
    const r = detecterCitationSortie(`Il rapporte : « ${longue()} “ainsi soit-il”. »`)
    expect(r!.citation).toContain(`«${FINE}ainsi soit-il${FINE}»`)
    expect(r!.citation).not.toContain('“')
  })
})

describe('conditions non remplies : la citation reste au fil du texte', () => {
  it('trop courte', () => {
    expect(detecterCitationSortie('Augustin écrit : « trois mots seulement. »')).toBeNull()
  })

  it('pas isolée : aucun deux-points ne l’annonce', () => {
    expect(detecterCitationSortie(`on peut considérer que « ${longue()} »`)).toBeNull()
  })

  it('pas terminale : la phrase se poursuit après le guillemet fermant', () => {
    expect(detecterCitationSortie(`Augustin écrit : « ${longue()} », puis il se tut.`)).toBeNull()
  })

  it('sans annonce : le deux-points ouvre le segment', () => {
    expect(detecterCitationSortie(`: « ${longue()} »`)).toBeNull()
  })

  // Une citation courte qui précède ne fait pas obstacle : elle appartient à
  // l'annonce, et c'est la longue, terminale, qui se détache.
  it('laisse dans l’annonce une citation courte qui précède', () => {
    const r = detecterCitationSortie(`Il écrit : « court » puis : « ${longue()} »`)
    expect(r!.avant).toBe('Il écrit : « court » puis :')
    expect(r!.citation).toBe(longue())
  })

  it('refuse une citation dont le contenu porte lui-même une paire de guillemets français', () => {
    expect(detecterCitationSortie(`Il écrit : « ${longue()} « imbriquée » fin. »`)).toBeNull()
  })
})

// Le segment EST la citation : il ouvre sur le guillemet, et le deux-points qui
// l'annonçait appartient au texte cité. Cas relevé par l'auteur le 2026-08-20 sur
// les « Questions sur l'Heptateuque » (segment 2152), que le motif d'origine
// laissait passer puisqu'il exige de la prose avant le guillemet ouvrant.
describe('segment entièrement cité (option sansAnnonce)', () => {
  it('ne sort rien sans l’option, l’annonce manquant', () => {
    expect(detecterCitationSortie(`« ${longue()} »`)).toBeNull()
  })

  it('sort la citation entière quand l’option est ouverte, l’annonce restant vide', () => {
    const r = detecterCitationSortie(`« ${longue()} »`, { sansAnnonce: true })
    expect(r!.avant).toBe('')
    expect(r!.citation).toBe(longue())
  })

  it('tolère un deux-points AU DEDANS de la citation', () => {
    const r = detecterCitationSortie(`« Le Seigneur dit à Moïse : ${longue()} »`, { sansAnnonce: true })
    expect(r!.avant).toBe('')
    expect(r!.citation).toBe(`Le Seigneur dit à Moïse : ${longue()}`)
  })

  it('garde l’appel de note terminal', () => {
    const r = detecterCitationSortie(`« ${longue()} » [[27]]`, { sansAnnonce: true })
    expect(r!.citation).toBe(`${longue()}[[27]]`)
  })

  it('francise les guillemets internes comme dans le cas annoncé', () => {
    const r = detecterCitationSortie(`« ${longue()} “ainsi soit-il”. »`, { sansAnnonce: true })
    expect(r!.citation).toContain(`«${FINE}ainsi soit-il${FINE}»`)
  })

  it('refuse une citation trop courte', () => {
    expect(detecterCitationSortie('« trois mots seulement. »', { sansAnnonce: true })).toBeNull()
  })

  it('refuse un segment qui reprend la prose après le guillemet fermant', () => {
    expect(detecterCitationSortie(`« ${longue()} », puis il se tut.`, { sansAnnonce: true })).toBeNull()
  })

  it('laisse le cas annoncé se comporter comme avant, l’option fût-elle ouverte', () => {
    const r = detecterCitationSortie(`Augustin écrit : « ${longue()} »`, { sansAnnonce: true })
    expect(r!.avant).toBe('Augustin écrit :')
    expect(r!.citation).toBe(longue())
  })
})

describe('citation balisée sur plusieurs segments', () => {
  it('réunit une suite de citations sans absorber la prose qui l’annonce ou la suit', () => {
    const segments = [
      { id: 12, nature: 'texte' },
      { id: 13, nature: 'citation' },
      { id: 14, nature: 'citation' },
      { id: 15, nature: 'citation' },
      { id: 16, nature: 'texte' },
    ]
    expect(regrouperCitationsStructurelles(segments, s => s.nature === 'citation'))
      .toEqual([
        { citation: false, elements: [segments[0]] },
        { citation: true, elements: segments.slice(1, 4) },
        { citation: false, elements: [segments[4]] },
      ])
  })

  it('mesure la longueur cumulée de la citation, pas celle de chaque segment', () => {
    expect(citationStructurelleEstLongue(['a'.repeat(135), 'b'.repeat(265)]))
      .toBe(true)
    expect(citationStructurelleEstLongue(['a'.repeat(135), 'b'.repeat(264)]))
      .toBe(false)
  })

  it('rend le seuil paramétrable pour les contrôles unitaires', () => {
    expect(citationStructurelleEstLongue(['abc', 'def'], 6)).toBe(true)
    expect(citationStructurelleEstLongue(['abc', 'de'], 6)).toBe(false)
  })

  it('retire l’encadrement ancien réparti sur plusieurs segments', () => {
    expect(textesCitationStructurelleSansEncadrement([
      `«${FINE}Premier “mot”`,
      `suite.${FINE}»`,
    ])).toEqual([
      `Premier «${FINE}mot${FINE}»`,
      'suite.',
    ])
  })

  it('laisse intacte la forme éditoriale déjà privée de guillemets extérieurs', () => {
    expect(textesCitationStructurelleSansEncadrement([
      'Premier segment.',
      `Il dit «${FINE}oui${FINE}».`,
    ])).toEqual([
      'Premier segment.',
      `Il dit «${FINE}oui${FINE}».`,
    ])
  })

  it('ne retire pas un guillemet isolé qui appartient au contenu', () => {
    expect(textesCitationStructurelleSansEncadrement([
      `«${FINE}Parole intérieure${FINE}» puis commentaire.`,
    ])).toEqual([
      `«${FINE}Parole intérieure${FINE}» puis commentaire.`,
    ])
  })
})
