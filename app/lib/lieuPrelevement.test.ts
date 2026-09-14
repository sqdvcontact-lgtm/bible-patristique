import { describe, expect, it } from 'vitest'
import { LONGUEUR_REPERE, intituleNet, lieuDuPrelevement, repereDeNiveau } from './lieuPrelevement'

// Les intitulés viennent du corpus (14 septembre 2026), sauf les copies qui éprouvent un
// repli ; le sommaire en est un extrait.
const SOMMAIRE =
  'Quant à ce que dit l’écrivain sacré que « Dieu se reposa le septième jour », cela n’implique aucune contradiction avec cette parole de Jésus-Christ.'
const INSECABLE = String.fromCharCode(0xa0)

describe('lieuDuPrelevement', () => {
  it('joint les deux niveaux du segment', () => {
    expect(lieuDuPrelevement({ n1: 'Livre premier', n2: 'Chapitre IV' })).toBe('Livre premier, Chapitre IV')
    expect(lieuDuPrelevement({ n1: 'Prima Pars', n2: 'Question 107' })).toBe('Prima Pars, Question 107')
  })

  it('prend la copie quand le segment manque', () => {
    expect(lieuDuPrelevement(undefined, { n1: 'Prima Pars', n2: 'Question 45' })).toBe('Prima Pars, Question 45')
    expect(lieuDuPrelevement(null, { n1: 'Prima Pars', n2: 'Question 45' })).toBe('Prima Pars, Question 45')
  })

  it('préfère le segment à la copie', () => {
    expect(lieuDuPrelevement({ n1: 'Prima Pars', n2: 'Question 107' }, { n1: 'Prima Pars', n2: 'Question 106' }))
      .toBe('Prima Pars, Question 107')
  })

  it('garde entier un niveau 1, qui nomme toujours une division', () => {
    const division = 'Explication des mots liturgiques qui se trouvent dans cette traduction'
    expect(division.length).toBeGreaterThan(LONGUEUR_REPERE)
    expect(lieuDuPrelevement({ n1: division, n2: null })).toBe(division)
  })

  it('écarte un niveau 2 qui ne tient plus en manchette, et reprend alors celui de la copie', () => {
    expect(lieuDuPrelevement({ n1: 'Dixième homélie', n2: SOMMAIRE }, { n1: 'Dixième homélie', n2: '7' }))
      .toBe('Dixième homélie, 7')
    expect(lieuDuPrelevement({ n1: 'Dixième homélie', n2: SOMMAIRE })).toBe('Dixième homélie')
  })

  it('ne reprend pas à la copie un niveau que le segment ne porte pas', () => {
    expect(lieuDuPrelevement({ n1: 'Avis au lecteur', n2: null }, { n1: 'Avis au lecteur', n2: '3' }))
      .toBe('Avis au lecteur')
  })

  it('rend une chaîne vide quand rien ne localise', () => {
    expect(lieuDuPrelevement(undefined)).toBe('')
    expect(lieuDuPrelevement({ n1: '', n2: null }, {})).toBe('')
    expect(lieuDuPrelevement(undefined, { n2: SOMMAIRE })).toBe('')
  })
})

describe('repereDeNiveau', () => {
  it('retire les appels de note et resserre les blancs', () => {
    expect(repereDeNiveau('Livre  cinquième[[81]]')).toBe('Livre cinquième')
    expect(repereDeNiveau('Des mauvaises pensées.\n Récapitulation.')).toBe('Des mauvaises pensées. Récapitulation.')
  })

  it('borne un repère à LONGUEUR_REPERE signes', () => {
    expect(repereDeNiveau('x'.repeat(LONGUEUR_REPERE))).toBe('x'.repeat(LONGUEUR_REPERE))
    expect(repereDeNiveau('x'.repeat(LONGUEUR_REPERE + 1))).toBeNull()
  })

  it('garde une insécable, qui dit quelque chose', () => {
    // ⚠️ Composé par jonction, non par gabarit : la garde des formes lit une interpolation
    // suivie de deux chiffres comme un alpha hexadécimal collé à une teinte.
    const paragraphe = ['§', '11'].join(INSECABLE)
    expect(repereDeNiveau(paragraphe)).toBe(paragraphe)
    expect(intituleNet(paragraphe)).toBe(paragraphe)
  })
})
