import { describe, it, expect } from 'vitest'
import { cleTriTitre, sansPointFinal, normaliserCapitalesTitreStructurel, normaliserTitreTechnique, titreStructurelAffiche } from './titres'

describe('cleTriTitre', () => {
  it('retire l’article défini de tête', () => {
    expect(cleTriTitre('La Cité de Dieu')).toBe('cite de dieu')
    expect(cleTriTitre('Le Banquet')).toBe('banquet')
    expect(cleTriTitre('Les Confessions')).toBe('confessions')
  })
  it('retire l’élision (l’, d’) quelle que soit l’apostrophe', () => {
    expect(cleTriTitre('L’Évangile')).toBe('evangile')
    expect(cleTriTitre("L'Évangile")).toBe('evangile')
    expect(cleTriTitre('D’un cœur')).toBe('un cœur')
  })
  it('retire les déterminants (un, une, des, du, de, au, aux)', () => {
    expect(cleTriTitre('Une lettre')).toBe('lettre')
    expect(cleTriTitre('Du libre arbitre')).toBe('libre arbitre')
  })
  it('ne retire pas un mot qui commence comme un article sans espace', () => {
    expect(cleTriTitre('Lettres à Lucilius')).toBe('lettres a lucilius')
    expect(cleTriTitre('Deus caritas est')).toBe('deus caritas est')
  })
  it('sans accents et sans casse', () => {
    expect(cleTriTitre('Étymologies')).toBe('etymologies')
  })
  it('classe correctement une liste (articles ignorés)', () => {
    const titres = ['La Cité de Dieu', 'Annotations sur Job', 'Le Banquet', 'Étymologies']
    const tries = [...titres].sort((a, b) => cleTriTitre(a).localeCompare(cleTriTitre(b), 'fr'))
    expect(tries).toEqual(['Annotations sur Job', 'Le Banquet', 'La Cité de Dieu', 'Étymologies'])
  })
  it('gère null/undefined', () => {
    expect(cleTriTitre(null)).toBe('')
    expect(cleTriTitre(undefined)).toBe('')
  })
})

describe('sansPointFinal', () => {
  it('retire un point final mais préserve les points de suspension', () => {
    expect(sansPointFinal('Le Banquet.')).toBe('Le Banquet')
    expect(sansPointFinal('À suivre…')).toBe('À suivre…')
  })
})

describe('normaliserTitreTechnique', () => {
  it('convertit « mot_nombre » en « Mot N » (séparateur et zéros de tête normalisés)', () => {
    expect(normaliserTitreTechnique('caput_002')).toBe('Caput 2')
    expect(normaliserTitreTechnique('quaestio_089')).toBe('Quaestio 89')
    expect(normaliserTitreTechnique('caput 02')).toBe('Caput 2')
    expect(normaliserTitreTechnique('Caput_2')).toBe('Caput 2')
  })
  it('donne sa capitale à un mot latin isolé tout en bas de casse', () => {
    expect(normaliserTitreTechnique('prolegomena')).toBe('Prolegomena')
    expect(normaliserTitreTechnique('subscriptio')).toBe('Subscriptio')
    expect(normaliserTitreTechnique('incipit')).toBe('Incipit')
  })
  it('ne touche jamais un vrai intitulé', () => {
    expect(normaliserTitreTechnique('Homélie sur l’Hexaéméron')).toBe('Homélie sur l’Hexaéméron')
    expect(normaliserTitreTechnique('Question 2 sur la Genèse')).toBe('Question 2 sur la Genèse')
    expect(normaliserTitreTechnique('Livre premier')).toBe('Livre premier')
    expect(normaliserTitreTechnique('II')).toBe('II')
  })
  it('est idempotente', () => {
    expect(normaliserTitreTechnique(normaliserTitreTechnique('caput_002'))).toBe('Caput 2')
    expect(normaliserTitreTechnique(normaliserTitreTechnique('prolegomena'))).toBe('Prolegomena')
  })
  it('gère null/undefined/vide', () => {
    expect(normaliserTitreTechnique(null)).toBe('')
    expect(normaliserTitreTechnique(undefined)).toBe('')
    expect(normaliserTitreTechnique('')).toBe('')
  })
})

describe('normaliserCapitalesTitreStructurel', () => {
  it('compose les livres en casse française et conserve les chiffres romains', () => {
    expect(normaliserCapitalesTitreStructurel('LIVRE PREMIER')).toBe('Livre premier')
    expect(normaliserCapitalesTitreStructurel('CHAPITRE IV')).toBe('Chapitre IV')
    expect(normaliserCapitalesTitreStructurel('LIMINAIRES')).toBe('Liminaires')
    expect(normaliserCapitalesTitreStructurel('II. PROSE.')).toBe('II. Prose.')
    expect(normaliserCapitalesTitreStructurel('I. POESIE.')).toBe('I. Poesie.')
  })

  it('ne touche ni au corps ni aux titres qui peuvent contenir des noms propres', () => {
    expect(normaliserCapitalesTitreStructurel('MOY dont les premiers Vers')).toBe('MOY dont les premiers Vers')
    expect(normaliserCapitalesTitreStructurel('AU ROY CHARLES')).toBe('AU ROY CHARLES')
    expect(normaliserCapitalesTitreStructurel('Livre premier')).toBe('Livre premier')
  })
})

describe('titreStructurelAffiche', () => {
  it('compose les normalisations publiques sans modifier la clé stockée', () => {
    expect(titreStructurelAffiche('LIVRE PREMIER.')).toBe('Livre premier')
    expect(titreStructurelAffiche('II. PROSE.')).toBe('II. Prose')
    expect(titreStructurelAffiche('caput_002.')).toBe('Caput 2')
  })
})
