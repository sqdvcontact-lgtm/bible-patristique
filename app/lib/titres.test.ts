import { describe, it, expect } from 'vitest'
import { cleTriTitre, complementDeTitre, memeIntitule, sansPointFinal, normaliserTitreTechnique } from './titres'

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

describe('memeIntitule', () => {
  it('reconnaît le titre d’affichage répété en titre original', () => {
    expect(memeIntitule('Confessiones', 'Confessiones')).toBe(true)
    expect(memeIntitule('Commentarius in Ionam', 'Commentarius in Ionam')).toBe(true)
  })
  it('ignore ce que la composition ignore déjà', () => {
    // Sauts de ligne éditoriaux du titre d’affichage, casse, apostrophe, point final.
    expect(memeIntitule('Annotations\nsur le livre de Job', 'Annotations sur le livre de Job')).toBe(true)
    expect(memeIntitule('DE CIVITATE DEI', 'De civitate Dei')).toBe(true)
    expect(memeIntitule('L’Évangile', "L'Évangile")).toBe(true)
    expect(memeIntitule('Confessiones.', 'Confessiones')).toBe(true)
  })
  it('ne voit pas le même intitulé sous un appel de note', () => {
    expect(memeIntitule('Confessiones [[12]]', 'Confessiones')).toBe(true)
  })
  it('distingue deux intitulés différents', () => {
    expect(memeIntitule('Les Confessions', 'Confessiones')).toBe(false)
    expect(memeIntitule('Commentarius in Ionam', 'Commentarius in Ioel')).toBe(false)
    // Les accents appartiennent au mot : ils restent distinctifs.
    expect(memeIntitule('Hexaemeron', 'Hexaéméron')).toBe(false)
  })
  it('un intitulé vide n’est le même que rien', () => {
    expect(memeIntitule('', '')).toBe(false)
    expect(memeIntitule(null, undefined)).toBe(false)
    expect(memeIntitule('   ', 'Confessiones')).toBe(false)
  })
})

describe('complementDeTitre', () => {
  it('rend le complément quand il dit autre chose', () => {
    expect(complementDeTitre('Chapitre premier', 'Le symbole, règle de foi'))
      .toBe('Le symbole, règle de foi')
    expect(complementDeTitre('Livre I', 'De la cité terrestre')).toBe('De la cité terrestre')
  })
  it('rend le vide quand il n’y a pas de complément — le cas ORDINAIRE', () => {
    // 27 156 segments portent un titre de niveau 1 sans complément (28 % au 2026-08-29) :
    // ce n’est pas un défaut, et rien ne doit se composer à la place.
    expect(complementDeTitre('Chapitre premier', null)).toBe('')
    expect(complementDeTitre('Chapitre premier', undefined)).toBe('')
    expect(complementDeTitre('Chapitre premier', '')).toBe('')
    expect(complementDeTitre('Chapitre premier', '   ')).toBe('')
  })
  it('écarte le complément qui REDIT son titre', () => {
    expect(complementDeTitre('Prologue', 'Prologue')).toBe('')
    expect(complementDeTitre('PROLOGUE', 'Prologue')).toBe('')
    expect(complementDeTitre('Question 2', 'Question  2 ')).toBe('')
    expect(complementDeTitre('L’Évangile', "L'Évangile")).toBe('')
    expect(complementDeTitre('Prologue', 'Prologue.')).toBe('')
    expect(complementDeTitre('Prologue [[3]]', 'Prologue')).toBe('')
  })
  it('garde les accents distinctifs, comme memeIntitule', () => {
    expect(complementDeTitre('Hexaemeron', 'Hexaéméron')).toBe('Hexaéméron')
  })
  it('ne s’applique pas à un titre vide : le complément reste', () => {
    // Aucun segment du corpus ne porte un complément sans titre (mesuré à zéro le
    // 2026-08-29), mais un complément orphelin ne doit pas disparaître en silence.
    expect(complementDeTitre('', 'Le symbole')).toBe('Le symbole')
    expect(complementDeTitre(null, 'Le symbole')).toBe('Le symbole')
  })
})
