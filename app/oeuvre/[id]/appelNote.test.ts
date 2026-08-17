import { describe, it, expect } from 'vitest'
import { titreSansAppelsDeNote, styleAppelNote } from './appelNote'

describe('titreSansAppelsDeNote', () => {
  // Cas réel : Jean Chrysostome, Discours sur la Genèse. Le sommaire affichait
  // « Livre cinquième[[81]] ».
  it('retire le marqueur ET l’espace qui le précède', () => {
    expect(titreSansAppelsDeNote('Livre cinquième [[81]]')).toBe('Livre cinquième')
    expect(titreSansAppelsDeNote('Livre cinquième[[81]]')).toBe('Livre cinquième')
  })

  it('retire plusieurs appels dans un même intitulé', () => {
    expect(titreSansAppelsDeNote('Sur la pénitence [[A]] et sur l’aumône [[B]]'))
      .toBe('Sur la pénitence et sur l’aumône')
  })

  it('accepte les marqueurs numériques comme les alphabétiques', () => {
    expect(titreSansAppelsDeNote('Homélie [[12]]')).toBe('Homélie')
    expect(titreSansAppelsDeNote('Homélie [[AB3]]')).toBe('Homélie')
  })

  it('laisse intact un intitulé sans appel', () => {
    expect(titreSansAppelsDeNote('De la vraie religion')).toBe('De la vraie religion')
    expect(titreSansAppelsDeNote('')).toBe('')
  })

  // Un crochet isolé appartient au titre : l'ajout éditorial « [sic] », les
  // restitutions « [Jean] ». On ne coupe que la forme complète.
  it('ne touche pas un crochet qui n’est pas un appel', () => {
    expect(titreSansAppelsDeNote('Lettre à [Jean]')).toBe('Lettre à [Jean]')
    expect(titreSansAppelsDeNote('Traité [[a]]')).toBe('Traité [[a]]')
  })

  it('est idempotente', () => {
    const une = titreSansAppelsDeNote('Livre cinquième [[81]]')
    expect(titreSansAppelsDeNote(une)).toBe(une)
  })

  it('préserve le saut de ligne d’un titre composé sur deux lignes', () => {
    expect(titreSansAppelsDeNote('Commentaire\nsur Joël [[3]]')).toBe('Commentaire\nsur Joël')
  })
})

describe('styleAppelNote', () => {
  it('hérite la police et l’italique du texte d’accueil', () => {
    for (const v of ['corps', 'titre'] as const) {
      expect(styleAppelNote(v).fontFamily).toBe('inherit')
      expect(styleAppelNote(v).fontStyle).toBe('inherit')
    }
  })

  // Règle d'auteur, sans exception : l'exposant et la teinte suffisent.
  it('ne pose jamais de soulignement', () => {
    for (const v of ['corps', 'titre'] as const) {
      const s = styleAppelNote(v)
      expect(s.borderBottom).toBeUndefined()
      expect(s.textDecoration).toBeUndefined()
    }
  })

  it('prend l’encre du titre, plus petit, dans un titre de haut rang', () => {
    expect(styleAppelNote('titre').color).toBe('currentColor')
    expect(styleAppelNote('corps').color).toBe('#8a6a3e')
    expect(parseFloat(String(styleAppelNote('titre').fontSize)))
      .toBeLessThan(parseFloat(String(styleAppelNote('corps').fontSize)))
  })

  it('rend la forme du corps par défaut', () => {
    expect(styleAppelNote()).toEqual(styleAppelNote('corps'))
  })
})
