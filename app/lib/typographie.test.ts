import { describe, it, expect } from 'vitest'
import { normaliserEspaces, normaliserEspacesOriginal } from './typographie'

const FINE = ' '   // espace fine insécable U+202F
const NBSP = ' '   // espace insécable U+00A0

describe('normaliserEspacesOriginal (latin, grec)', () => {
  it('ajoute une fine insécable avant : ; ! ? quand la ponctuation est collée', () => {
    expect(normaliserEspacesOriginal('magna virtus tua: et')).toBe(`magna virtus tua${FINE}: et`)
    expect(normaliserEspacesOriginal('quid dicam?')).toBe(`quid dicam${FINE}?`)
    expect(normaliserEspacesOriginal('o magnum!')).toBe(`o magnum${FINE}!`)
    expect(normaliserEspacesOriginal('primum; deinde')).toBe(`primum${FINE}; deinde`)
  })
  it('ramène une espace simple ou insécable existante à la fine, et reste idempotent', () => {
    expect(normaliserEspacesOriginal('tua : et')).toBe(`tua${FINE}: et`)
    expect(normaliserEspacesOriginal(`tua${NBSP}: et`)).toBe(`tua${FINE}: et`)
    expect(normaliserEspacesOriginal(`tua${FINE}: et`)).toBe(`tua${FINE}: et`)
  })
  it('espace les guillemets français internes', () => {
    expect(normaliserEspacesOriginal('dixit «verbum»')).toBe(`dixit «${FINE}verbum${FINE}»`)
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspacesOriginal('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
})

describe('normaliserEspaces (français, couche d’affichage)', () => {
  it('ajoute une fine insécable avant : ; ! ? quand elle manque', () => {
    expect(normaliserEspaces('Maistresse: que dites-vous? Helas! enfin;')).toBe(
      `Maistresse${FINE}: que dites-vous${FINE}? Helas${FINE}! enfin${FINE};`,
    )
  })
  it('ramène espace simple, insécable et fine existantes à une fine unique', () => {
    expect(normaliserEspaces(`a ; b : c${NBSP}? d${FINE}!`)).toBe(
      `a${FINE}; b${FINE}: c${FINE}? d${FINE}!`,
    )
  })
  it('normalise les apostrophes droites internes aux mots', () => {
    expect(normaliserEspaces("D'vn costé, l'Histoire; semble-t'il vrai? C'est fait.")).toBe(
      `D’vn costé, l’Histoire${FINE}; semble-t’il vrai${FINE}? C’est fait.`,
    )
  })
  it('espace les guillemets français internes', () => {
    expect(normaliserEspaces('Il dit «mot».')).toBe(`Il dit «${FINE}mot${FINE}».`)
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
  it('préserve une URL se terminant par un point d’interrogation', () => {
    expect(normaliserEspaces('Voir https://exemple.fr/fin? puis continuer.')).toBe(
      'Voir https://exemple.fr/fin? puis continuer.',
    )
  })
  it('reste idempotent', () => {
    const texte = `(Pourquoi${FINE}? parce que${FINE}: oui${FINE}; vraiment${FINE}!)`
    expect(normaliserEspaces(normaliserEspaces(texte))).toBe(texte)
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspaces('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
})
