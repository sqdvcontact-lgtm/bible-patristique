import { describe, expect, it } from 'vitest'
import { LIVRES } from './bible'
import { analyserRechercheVolet, libellePassage, livresQuiCommencent, VERSET_MAX } from './rechercheVoletLivres'

const livres = LIVRES.map((l) => ({ code: l.code, nom: l.nom }))
const chapitres = { JHN: 21, PSA: 150, SIR: 51, '1MA': 16, GEN: 50 }

describe('analyserRechercheVolet', () => {
  it('une saisie vide ne désigne rien', () => {
    expect(analyserRechercheVolet('   ', livres, chapitres)).toEqual({ genre: 'vide' })
  })

  it.each([
    ['Jean 3', 'JHN', 3, null],
    ['Ps 23', 'PSA', 23, null],
    ['Jn 3, 16', 'JHN', 3, 16],
    ['Jn 3:16', 'JHN', 3, 16],
    ['jn 3 16', 'JHN', 3, 16],
  ])('« %s » mène au passage', (saisie, code, chapitre, verset) => {
    const r = analyserRechercheVolet(saisie, livres, chapitres)
    expect(r).toMatchObject({ genre: 'passage', code, chapitre, verset })
  })

  it('une plage mène au premier verset', () => {
    const r = analyserRechercheVolet('Jn 3, 16-18', livres, chapitres)
    expect(r).toMatchObject({ genre: 'passage', code: 'JHN', chapitre: 3, verset: 16 })
  })

  it('les abréviations deutérocanoniques du dépôt', () => {
    expect(analyserRechercheVolet('Si 24', livres, chapitres)).toMatchObject({ genre: 'passage', code: 'SIR', chapitre: 24 })
  })

  it('accents et casse ignorés', () => {
    expect(analyserRechercheVolet('GENÈSE 1', livres, chapitres)).toMatchObject({ genre: 'passage', code: 'GEN', chapitre: 1 })
    expect(analyserRechercheVolet('genese 1', livres, chapitres)).toMatchObject({ genre: 'passage', code: 'GEN', chapitre: 1 })
  })

  it('« Ps 200 » ne mène nulle part', () => {
    expect(analyserRechercheVolet('Ps 200', livres, chapitres)).toMatchObject({
      genre: 'hors-bornes', code: 'PSA', chapitre: 200, chapitresDuLivre: 150,
    })
  })

  it('un verset au-delà du plus long chapitre du canon ne mène nulle part', () => {
    expect(analyserRechercheVolet(`Ps 119, ${VERSET_MAX + 1}`, livres, chapitres)).toMatchObject({ genre: 'hors-bornes' })
  })

  it('sans l’ossature, un deutérocanonique n’est pas jugé sur ses chapitres', () => {
    expect(analyserRechercheVolet('Si 3', livres, null)).toMatchObject({ genre: 'passage', code: 'SIR', chapitre: 3 })
    // Le protocanon, lui, garde sa borne connue.
    expect(analyserRechercheVolet('Ps 200', livres, null)).toMatchObject({ genre: 'hors-bornes', chapitresDuLivre: 150 })
  })

  it('le verset se borne par le compte du chapitre quand il est connu', () => {
    const versets = (code: string, ch: number) => (code === 'JHN' && ch === 3 ? 36 : null)
    expect(analyserRechercheVolet('Jn 3, 40', livres, chapitres, versets)).toMatchObject({
      genre: 'hors-bornes', code: 'JHN', chapitre: 3, verset: 40, versetsDuChapitre: 36,
    })
    expect(analyserRechercheVolet('Jn 3, 36', livres, chapitres, versets)).toMatchObject({ genre: 'passage', verset: 36 })
    // Inconnu : on laisse passer jusqu'au plus long chapitre du canon.
    expect(analyserRechercheVolet('Jn 4, 50', livres, chapitres, versets)).toMatchObject({ genre: 'passage', verset: 50 })
  })

  it('un nom commencé rend quelques livres, jamais une avalanche', () => {
    const r = analyserRechercheVolet('Jé', livres, chapitres)
    expect(r.genre).toBe('livres')
    if (r.genre !== 'livres') return
    expect(r.codes.has('JER')).toBe(true)
    expect(r.codes.size).toBeLessThan(10)
  })

  it('un nom de livre seul rend ce livre', () => {
    const r = analyserRechercheVolet('Psaumes', livres, chapitres)
    expect(r.genre).toBe('livres')
    if (r.genre === 'livres') expect(r.codes.has('PSA')).toBe(true)
  })
})

describe('livresQuiCommencent', () => {
  it('« Ps » trouve les Psaumes, jamais l’Apocalypse', () => {
    const codes = livresQuiCommencent('Ps', livres)
    expect(codes.has('PSA')).toBe(true)
    expect(codes.has('REV')).toBe(false)
  })
})

describe('libellePassage', () => {
  it('compose chapitre, verset et plage', () => {
    expect(libellePassage('Jean', 3, null, null)).toBe('Jean 3')
    expect(libellePassage('Jean', 3, 16, null)).toBe('Jean 3, 16')
    expect(libellePassage('Jean', 3, 16, 18)).toBe('Jean 3, 16-18')
  })
})
