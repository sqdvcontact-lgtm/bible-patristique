import { describe, it, expect } from 'vitest'
import { ordonnerAuteurs, libelleAuteurs, separateurAuteurs, grouperOeuvresParAuteur } from './auteursOeuvre'

const augustin = { id_auteur: 'A0010', nom: 'Augustin d’Hippone', rang: 1 }
const possidius = { id_auteur: 'A0500', nom: 'Possidius', rang: 2 }
const alypius = { id_auteur: 'A0600', nom: 'Alypius', rang: 3 }

describe('ordre et libellé des auteurs', () => {
  it('classe par rang, sans modifier le tableau reçu', () => {
    const donnes = [possidius, augustin]
    expect(ordonnerAuteurs(donnes).map(a => a.nom)).toEqual(['Augustin d’Hippone', 'Possidius'])
    expect(donnes[0]).toBe(possidius)
  })

  it('départage deux rangs égaux par le nom, pour un affichage stable', () => {
    const memeRang = [{ ...possidius, rang: 2 }, { ...alypius, rang: 2 }]
    expect(ordonnerAuteurs(memeRang).map(a => a.nom)).toEqual(['Alypius', 'Possidius'])
  })

  it('énumère les noms à la française', () => {
    expect(libelleAuteurs([augustin])).toBe('Augustin d’Hippone')
    expect(libelleAuteurs([possidius, augustin])).toBe('Augustin d’Hippone et Possidius')
    expect(libelleAuteurs([augustin, possidius, alypius])).toBe('Augustin d’Hippone, Possidius et Alypius')
  })

  it('donne le même découpage quand les noms sont rendus un à un', () => {
    expect(separateurAuteurs(0, 3)).toBe('')
    expect(separateurAuteurs(1, 3)).toBe(', ')
    expect(separateurAuteurs(2, 3)).toBe(' et ')
    expect(separateurAuteurs(1, 2)).toBe(' et ')
  })
})

describe('répartition des œuvres sur les étagères', () => {
  const cite = { id_oeuvre: 'A0010O0002', id_auteur: 'A0010' }
  const vie = { id_oeuvre: 'A0500O0001', id_auteur: 'A0010' }

  it('range une œuvre co-signée sous chacun de ses auteurs', () => {
    const parAuteur = grouperOeuvresParAuteur([cite, vie], {
      'A0010O0002': [augustin],
      'A0500O0001': [augustin, possidius],
    })
    expect(parAuteur.get('A0010')?.map(o => o.id_oeuvre)).toEqual(['A0010O0002', 'A0500O0001'])
    expect(parAuteur.get('A0500')?.map(o => o.id_oeuvre)).toEqual(['A0500O0001'])
  })

  it('ne dépose qu’un exemplaire par étagère', () => {
    const parAuteur = grouperOeuvresParAuteur([cite], { 'A0010O0002': [augustin] })
    expect(parAuteur.get('A0010')).toHaveLength(1)
  })

  it('retombe sur l’auteur de l’œuvre si les couples manquent, pour ne pas la faire disparaître', () => {
    const parAuteur = grouperOeuvresParAuteur([cite], {}, o => o.id_auteur)
    expect(parAuteur.get('A0010')?.map(o => o.id_oeuvre)).toEqual(['A0010O0002'])
  })

  it('laisse l’étagère vide plutôt que d’inventer un auteur, sans repli', () => {
    expect(grouperOeuvresParAuteur([cite], {}).size).toBe(0)
  })
})
