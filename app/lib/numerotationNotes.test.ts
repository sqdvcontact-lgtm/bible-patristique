import { describe, expect, it } from 'vitest'
import { numerosAffiches, type NoteANumeroter } from './numerotationNotes'

function note(noteKey: string, division: string, apparat = false): NoteANumeroter {
  return { noteKey, division, apparat }
}

describe('numerosAffiches', () => {
  it('repart à 1 à chaque division de niveau 1', () => {
    const numeros = numerosAffiches([
      note('n1', 'Livre I'), note('n2', 'Livre I'), note('n3', 'Livre I'),
      note('n4', 'Livre II'), note('n5', 'Livre II'),
      note('n6', 'Livre III'),
    ])
    expect([...numeros.values()]).toEqual([1, 2, 3, 1, 2, 1])
  })

  it('tient l’apparat critique en série SÉPARÉE, dans la même division', () => {
    // C'est la mesure qui a commandé la règle : mêlé aux notes de lecture, l'apparat
    // de Knöll porte les Confessions à 1 039 ; séparé, chaque appareil reste sous
    // cent par livre.
    const numeros = numerosAffiches([
      note('a1', 'Livre I', true),
      note('l1', 'Livre I'),
      note('a2', 'Livre I', true),
      note('l2', 'Livre I'),
      note('a3', 'Livre I', true),
    ])
    expect(numeros.get('a1')).toBe(1)
    expect(numeros.get('l1')).toBe(1)
    expect(numeros.get('a2')).toBe(2)
    expect(numeros.get('l2')).toBe(2)
    expect(numeros.get('a3')).toBe(3)
  })

  it('remet les DEUX séries à 1 au changement de division', () => {
    const numeros = numerosAffiches([
      note('a1', 'Livre I', true), note('l1', 'Livre I'),
      note('a2', 'Livre II', true), note('l2', 'Livre II'),
    ])
    expect(numeros.get('a2')).toBe(1)
    expect(numeros.get('l2')).toBe(1)
  })

  it('donne une série aux notes sans division, plutôt que de les laisser sans numéro', () => {
    // Les liminaires, et les 747 notes du corpus dont l'ancre ne porte pas de niveau 1.
    const numeros = numerosAffiches([note('n1', ''), note('n2', ''), note('n3', 'Livre I')])
    expect(numeros.get('n1')).toBe(1)
    expect(numeros.get('n2')).toBe(2)
    expect(numeros.get('n3')).toBe(1)
  })

  it('garde son premier numéro à une note rappelée deux fois', () => {
    const numeros = numerosAffiches([
      note('n1', 'Livre I'), note('n2', 'Livre I'), note('n1', 'Livre I'), note('n3', 'Livre I'),
    ])
    expect(numeros.get('n1')).toBe(1)
    expect(numeros.get('n2')).toBe(2)
    // Le rappel de n1 ne consomme pas de numéro : n3 suit n2.
    expect(numeros.get('n3')).toBe(3)
    expect(numeros.size).toBe(3)
  })

  it('ne repart pas d’une division déjà servie si l’ordre revient en arrière', () => {
    // Un texte mal ordonné ne doit pas produire deux notes « 1 » dans la même division.
    const numeros = numerosAffiches([
      note('n1', 'Livre I'), note('n2', 'Livre II'), note('n3', 'Livre I'),
    ])
    expect(numeros.get('n1')).toBe(1)
    expect(numeros.get('n2')).toBe(1)
    expect(numeros.get('n3')).toBe(2)
  })

  it('rend une table vide sur une entrée vide', () => {
    expect(numerosAffiches([]).size).toBe(0)
  })
})
