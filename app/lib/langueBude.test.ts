import { describe, expect, it } from 'vitest'
import { serieDeLAuteur, serieDeLaNotice } from './langueBude'

describe('serieDeLaNotice', () => {
  it('reconnaît les deux séries, quelle que soit la casse ou l’accentuation', () => {
    expect(serieDeLaNotice('latin')).toBe('latin')
    expect(serieDeLaNotice('Latin')).toBe('latin')
    expect(serieDeLaNotice('grec')).toBe('grec')
    expect(serieDeLaNotice('grec ancien')).toBe('grec')
  })

  it('⚠️ prend la PREMIÈRE langue nommée : l’original ouvre la phrase', () => {
    // Valeurs réelles du catalogue.
    expect(serieDeLaNotice('grec ; version latine de Rufin')).toBe('grec')
    expect(serieDeLaNotice('grec perdu ; version syriaque conservée')).toBe('grec')
    expect(serieDeLaNotice('grec ; témoins coptes akhmîmique et sahidique')).toBe('grec')
    expect(serieDeLaNotice('grec/latin/syriaque/copte')).toBe('grec')
  })

  it('⛔ ne cherche pas la langue AILLEURS que dans la tête', () => {
    expect(serieDeLaNotice('ancien français')).toBeNull()
    expect(serieDeLaNotice('chinois classique')).toBeNull()
  })

  it('rend null sur ce que le Budé ne relie pas', () => {
    for (const l of ['syriaque', 'arménien', 'arabe', 'copte', 'variable', 'à préciser', '', null, undefined]) {
      expect(serieDeLaNotice(l), String(l)).toBeNull()
    }
  })
})

describe('serieDeLAuteur', () => {
  it('range un auteur d’une seule série', () => {
    expect(serieDeLAuteur(['latin', 'latin', 'latin'])).toBe('latin')
    expect(serieDeLAuteur(['grec', 'grec ancien'])).toBe('grec')
  })

  it('⛔ ne range PAS un corpus que les deux séries se disputent', () => {
    // « Actes de martyrs anciens » : 15 notices latines, 16 grecques.
    expect(serieDeLAuteur(['latin', 'grec'])).toBeNull()
  })

  it('⚠️ une langue TIERCE ne conteste rien', () => {
    expect(serieDeLAuteur(['latin', 'syriaque', 'copte'])).toBe('latin')
    expect(serieDeLAuteur(['grec', 'arménien'])).toBe('grec')
  })

  it('ne range rien quand aucune des deux séries ne paraît', () => {
    expect(serieDeLAuteur(['syriaque', 'arabe'])).toBeNull()
    expect(serieDeLAuteur([])).toBeNull()
  })
})
