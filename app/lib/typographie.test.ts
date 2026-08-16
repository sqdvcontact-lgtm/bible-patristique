import { describe, it, expect } from 'vitest'
import { normaliserEspaces, normaliserEspacesOriginal, normaliserGlyphesEdition, normaliserTypographieEdition } from './typographie'

const FINE = ' '
const NBSP = ' '

describe('normaliserEspacesOriginal (latin, grec)', () => {
  it('applique NBSP avant : et FINE avant ; ! ?', () => {
    expect(normaliserEspacesOriginal('magna virtus tua: et')).toBe(`magna virtus tua${NBSP}: et`)
    expect(normaliserEspacesOriginal('quid dicam?')).toBe(`quid dicam${FINE}?`)
    expect(normaliserEspacesOriginal('o magnum!')).toBe(`o magnum${FINE}!`)
    expect(normaliserEspacesOriginal('primum; deinde')).toBe(`primum${FINE}; deinde`)
  })
  it('normalise les espaces existantes et reste idempotent', () => {
    expect(normaliserEspacesOriginal('tua : et')).toBe(`tua${NBSP}: et`)
    expect(normaliserEspacesOriginal(`tua${FINE}: et`)).toBe(`tua${NBSP}: et`)
    expect(normaliserEspacesOriginal(`quid${NBSP}?`)).toBe(`quid${FINE}?`)
  })
  it('emploie NBSP à l’intérieur des guillemets français', () => {
    expect(normaliserEspacesOriginal('dixit «verbum»')).toBe(`dixit «${NBSP}verbum${NBSP}»`)
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspacesOriginal('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
})

describe('normaliserEspaces (français)', () => {
  it('applique NBSP avant : et FINE avant ; ! ?', () => {
    expect(normaliserEspaces('Maistresse: que dites-vous? Helas! enfin;')).toBe(
      `Maistresse${NBSP}: que dites-vous${FINE}? Helas${FINE}! enfin${FINE};`,
    )
  })
  it('normalise les apostrophes droites internes aux mots', () => {
    expect(normaliserEspaces("D'vn costé, l'Histoire; semble-t'il vrai? C'est fait.")).toBe(
      `D’vn costé, l’Histoire${FINE}; semble-t’il vrai${FINE}? C’est fait.`,
    )
  })
  it('emploie NBSP à l’intérieur des guillemets français', () => {
    expect(normaliserEspaces('Il dit «mot».')).toBe(`Il dit «${NBSP}mot${NBSP}».`)
  })
  it('supprime les espaces immédiatement à l’intérieur des parenthèses', () => {
    expect(normaliserEspaces('( repris-ie)')).toBe('(repris-ie)')
    expect(normaliserEspaces(`(${NBSP}ma chere Maistresse${FINE})`)).toBe('(ma chere Maistresse)')
  })
  it('préserve heures, références numériques et URL', () => {
    const texte = 'Rendez-vous 10:30; Jn 3:16; https://exemple.fr/a:b?x=1; fin.'
    expect(normaliserEspaces(texte)).toBe(
      `Rendez-vous 10:30${FINE}; Jn 3:16${FINE}; https://exemple.fr/a:b?x=1${FINE}; fin.`,
    )
  })
  it('préserve une URL qui se termine par ?', () => {
    expect(normaliserEspaces('Voir https://example.com/page?')).toBe('Voir https://example.com/page?')
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspaces('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
  it('reste idempotent', () => {
    const texte = `(Pourquoi${FINE}? parce que${NBSP}: oui${FINE}; vraiment${FINE}!)`
    expect(normaliserEspaces(normaliserEspaces(texte))).toBe(texte)
  })
})

describe('normalisation glyphique non médiévale', () => {
  it('modernise les glyphes sans moderniser la langue', () => {
    expect(normaliserGlyphesEdition('il ſçavoit ﬁdèlement')).toBe('il sçavoit fidèlement')
    expect(normaliserTypographieEdition('il ſçavoit: oui;')).toBe(`il sçavoit${NBSP}: oui${FINE};`)
  })
  it('ne développe pas les ligatures orthographiques œ et æ', () => {
    expect(normaliserGlyphesEdition('cœur æternel')).toBe('cœur æternel')
  })
})
