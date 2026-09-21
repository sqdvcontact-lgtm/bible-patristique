import { describe, expect, it } from 'vitest'
import {
  adresseOeuvreRecente,
  dedoublonner,
  editionAMontrer,
  listeApresConsultation,
  MAX_OEUVRES_RECENTES,
  quandConsultee,
  titresAmbigus,
  type OeuvreRecente,
} from './oeuvresRecentes'

const cite = (id: string, edition: string | null = null, texte: string | null = null): OeuvreRecente =>
  ({ id, titre: 'La Cité de Dieu', auteur: 'Augustin d’Hippone', edition, texte })

describe('listeApresConsultation', () => {
  it('met la consultation en tête et retire la précédente de la même édition', () => {
    const liste = [cite('A'), { id: 'B', titre: 'Du mépris du monde', auteur: 'Eucher de Lyon' }]
    const apres = listeApresConsultation(liste, { ...cite('A'), vu: 5 })
    expect(apres.map(o => o.id)).toEqual(['A', 'B'])
    expect(apres[0].vu).toBe(5)
  })

  it('garde deux éditions de la même œuvre', () => {
    const liste = [cite('A', 'Texte latin, 1870', 'T-LA')]
    const apres = listeApresConsultation(liste, cite('A', 'Traduction par L. Moreau, 1846'))
    expect(apres).toHaveLength(2)
  })

  it('borne la liste', () => {
    const liste = Array.from({ length: 20 }, (_, i) => ({ id: `X${i}`, titre: `T${i}`, auteur: '' }))
    expect(listeApresConsultation(liste, { id: 'N', titre: 'Neuf', auteur: '' })).toHaveLength(MAX_OEUVRES_RECENTES)
  })
})

describe('dedoublonner', () => {
  it('fond les entrées que rien ne distingue à l’écran, la plus récente l’emporte', () => {
    const r = dedoublonner([cite('A'), cite('B'), cite('C')])
    expect(r.map(o => o.id)).toEqual(['A'])
  })
  it('garde deux éditions distinctes', () => {
    expect(dedoublonner([cite('A', 'Texte latin'), cite('A', 'Traduction')])).toHaveLength(2)
  })
})

describe('édition à montrer', () => {
  it('ne se dit que pour un titre porté deux fois', () => {
    const liste = [cite('A', 'Texte latin'), cite('A', 'Traduction'), { id: 'B', titre: 'Autre', auteur: '', edition: 'Éd.' }]
    const ambigus = titresAmbigus(liste)
    expect(editionAMontrer(liste[0], ambigus)).toBe('Texte latin')
    expect(editionAMontrer(liste[2], ambigus)).toBeNull()
  })
})

describe('adresseOeuvreRecente', () => {
  it('rouvre l’édition lue', () => {
    expect(adresseOeuvreRecente({ id: 'A0010O0002' })).toBe('/oeuvre/A0010O0002')
    expect(adresseOeuvreRecente({ id: 'A0010O0002', texte: 'T 1' })).toBe('/oeuvre/A0010O0002?texte=T%201')
  })
})

describe('quandConsultee', () => {
  const maintenant = new Date(2026, 8, 21, 15, 0).getTime()
  it('dit le jour comme on le dit', () => {
    expect(quandConsultee(new Date(2026, 8, 21, 9, 0).getTime(), maintenant)).toBe('aujourd’hui')
    expect(quandConsultee(new Date(2026, 8, 20, 23, 0).getTime(), maintenant)).toBe('hier')
    expect(quandConsultee(new Date(2026, 8, 17, 12, 0).getTime(), maintenant)).toBe('jeudi')
    expect(quandConsultee(new Date(2026, 8, 1, 12, 0).getTime(), maintenant)).toBe('1er sept.')
    expect(quandConsultee(new Date(2025, 11, 3, 12, 0).getTime(), maintenant)).toBe('3 déc. 2025')
  })
  it('se tait sans date', () => {
    expect(quandConsultee(undefined, maintenant)).toBeNull()
  })
})
