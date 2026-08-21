import { describe, it, expect } from 'vitest'
import { bornerGuillemets, franciserGuillemetsOrphelins } from './guillemets'

// Écrite en toutes lettres : dans un test, une fine insécable ne se distingue pas
// d'une espace ordinaire à la lecture (piège consigné dans AGENTS.md).
const FINE = ' '

describe('citation qui ouvre sans fermer', () => {
  // Cas réel : Crampon, 1 Ch 11, 1. La citation se poursuit au verset suivant.
  it('ferme la citation à la fin', () => {
    const v = 'Tout Israël s’assembla, en disant : « Voici que nous sommes tes os et ta chair.'
    expect(bornerGuillemets(v)).toBe(v + FINE + '»')
  })

  it('ferme autant de fois qu’il le faut', () => {
    expect(bornerGuillemets('« un « deux')).toBe(`«${FINE}un «${FINE}deux${FINE}»${FINE}»`)
  })
})

describe('citation qui ferme sans ouvrir', () => {
  // Cas réel : Crampon, 1 Ch 13, 3. La citation avait commencé plus haut.
  it('ouvre la citation en tête', () => {
    const v = 'et que nous ramenions l’arche, car nous ne nous en sommes pas occupés. »'
    expect(bornerGuillemets(v)).toBe('«' + FINE + v)
  })
})

describe('citation déjà bornée', () => {
  it('ne touche pas une citation complète', () => {
    const v = 'Alors Saül dit : « Tire ton épée. » L’écuyer refusa.'
    expect(bornerGuillemets(v)).toBe(v)
  })

  it('ne touche pas un texte sans guillemets', () => {
    expect(bornerGuillemets('Au commencement Dieu créa le ciel et la terre.'))
      .toBe('Au commencement Dieu créa le ciel et la terre.')
  })

  it('est idempotente', () => {
    const une = bornerGuillemets('en disant : « Voici.')
    expect(bornerGuillemets(une)).toBe(une)
  })

  it('laisse un texte vide tel quel', () => {
    expect(bornerGuillemets('')).toBe('')
    expect(bornerGuillemets('   ')).toBe('   ')
  })
})

describe('guillemets anglais', () => {
  // Une paire anglaise complète est la convention d'imbrication du site : elle reste.
  it('garde une paire anglaise imbriquée', () => {
    const v = 'Il dit : « Le mot “grâce” est ici décisif. »'
    expect(franciserGuillemetsOrphelins(v)).toBe(v)
    expect(bornerGuillemets(v)).toBe(v)
  })

  it('francise un ouvrant anglais orphelin', () => {
    expect(franciserGuillemetsOrphelins('Il dit : “Voici le jour')).toBe(`Il dit : «${FINE}Voici le jour`)
  })

  it('francise un fermant anglais orphelin', () => {
    expect(franciserGuillemetsOrphelins('voici le jour.”')).toBe(`voici le jour.${FINE}»`)
  })

  // Francisé PUIS borné : l'orphelin anglais devient un guillemet français, qui
  // réclame alors son pendant.
  it('francise puis borne', () => {
    expect(bornerGuillemets('Il dit : “Voici le jour')).toBe(`Il dit : «${FINE}Voici le jour${FINE}»`)
  })
})
