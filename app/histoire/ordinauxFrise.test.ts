import { describe, expect, it } from 'vitest'
import { decouperOrdinaux } from './ordinauxFrise'

const composes = (t: string) => decouperOrdinaux(t).filter(f => f.t !== 'texte').map(f => f.v)
const rendu = (t: string) => decouperOrdinaux(t).map(f => f.t === 'ordinal' ? `^${f.v}` : f.v).join('')

describe('⛔ un mot français n’est pas un ordinal', () => {
  // Les trois cas mesurés sur le corpus : 516 « Le », 23 « De », 20 « Ce ».
  it('laisse « Le scribe Shlomo » intact', () => {
    expect(composes('Le scribe Shlomo ben Boya’a copie un codex')).toEqual([])
    expect(rendu('Le scribe Shlomo')).toBe('Le scribe Shlomo')
  })
  it('laisse « Ce », « De », « Me » intacts', () => {
    for (const mot of ['Ce concile', 'De ce fait', 'Me voici']) expect(composes(mot)).toEqual([])
  })
  it('⚠️ ne touche pas davantage « Mer », « Ver », « Der » — le motif se borne au I', () => {
    for (const mot of ['Mer Rouge', 'Ver de terre', 'Der Spiegel']) expect(composes(mot)).toEqual([])
  })
  it('laisse « Les » intact : le « s » rompt la frontière de mot', () => {
    expect(composes('Les Pères')).toEqual([])
  })
})

describe('l’ordinal d’un souverain', () => {
  it('compose « Ier » et « Ire »', () => {
    expect(composes('Albert Ier de Belgique')).toEqual(['I', 'er'])
    expect(composes('Élisabeth Ire')).toEqual(['I', 're'])
    expect(rendu('Albert Ier')).toBe('Albert I^er')
  })
  it('⛔ n’en invente pas au delà du premier : « Louis XIV » n’a pas de suffixe', () => {
    expect(composes('Louis XIV')).toEqual([])
  })
})

describe('le chiffre d’un siècle élidé', () => {
  // Les deux cas réels du corpus, où le mot « siècle » ne vient qu'au second chiffre.
  it('compose « du XIe et au début du XIIe »', () => {
    expect(composes('prennent forme à la fin du XIe et au début du XIIe')).toEqual(['XI', 'e', 'XII', 'e'])
  })
  it('compose « du XIIIe ou au début du XIVe »', () => {
    expect(composes('situé à la fin du XIIIe ou au début du XIVe')).toEqual(['XIII', 'e', 'XIV', 'e'])
  })
  it('⛔ mais PAS un chiffre d’une seule lettre : rien ne le distingue d’un article', () => {
    expect(composes('la première moitié du IIe')).toEqual(['II', 'e'])
    expect(composes('la première moitié du Ve')).toEqual([])
  })
})

describe('l’expression ne garde pas son index', () => {
  it('deux appels de suite donnent le même résultat', () => {
    const t = 'Albert Ier puis Albert Ier'
    expect(composes(t)).toEqual(composes(t))
    expect(composes(t)).toEqual(['I', 'er', 'I', 'er'])
  })
})
