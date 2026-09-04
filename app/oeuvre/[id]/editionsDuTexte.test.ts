import { describe, expect, it } from 'vitest'
import { cleEdition, editionsOffertes, replierEdition, type CandidatEdition } from './editionsDuTexte'

const c = (p: Partial<CandidatEdition> & { cle: string }): CandidatEdition => ({
  langue: 'Français', traducteur: null, annee: null, mention: null,
  libelle: p.cle, url: `/${p.cle}`, actif: false, lisible: true, ...p,
})

describe('replierEdition', () => {
  it('ôte accents, casse et ponctuation', () => {
    expect(replierEdition('Bar-le-Duc, Louis Guérin, 1866')).toBe('bar le duc louis guerin 1866')
    expect(replierEdition(null)).toBe('')
  })
})

describe('cleEdition — l’identifiant du texte n’y entre pas', () => {
  it('deux exemplaires d’une même édition partagent leur clé', () => {
    const a = { traducteur: 'Abbé Joyeux', annee: 1866, mention: 'Bar-le-Duc, Louis Guérin, 1866' }
    const b = { traducteur: 'abbe joyeux', annee: 1866, mention: 'Bar-le-Duc,  Louis Guérin, 1866' }
    expect(cleEdition(a)).toBe(cleEdition(b))
  })
  it('deux éditions différentes ne la partagent pas', () => {
    expect(cleEdition({ traducteur: 'René de Ceriziers', annee: 1646, mention: 'Rouen' }))
      .not.toBe(cleEdition({ traducteur: 'Louis Judicis de Mirandol', annee: 1861, mention: 'Paris' }))
  })
})

describe('editionsOffertes', () => {
  it('⛔ ne rend RIEN quand il n’y a pas de choix', () => {
    expect(editionsOffertes([c({ cle: 'seul', actif: true, url: null })], 'Français')).toEqual([])
    expect(editionsOffertes([], 'Français')).toEqual([])
  })

  it('rend les deux éditions françaises de Boèce', () => {
    const rendu = editionsOffertes([
      c({ cle: 'ceriziers', traducteur: 'René de Ceriziers', annee: 1646, mention: 'Rouen, 1646' }),
      c({ cle: 'mirandol', traducteur: 'Louis Judicis de Mirandol', annee: 1861, mention: 'Paris, 1861', actif: true, url: null }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['ceriziers', 'mirandol'])
  })

  it('⛔ écarte les textes d’une AUTRE langue', () => {
    const rendu = editionsOffertes([
      c({ cle: 'fr1', traducteur: 'A', annee: 1861 }),
      c({ cle: 'fr2', traducteur: 'B', annee: 1646 }),
      c({ cle: 'la', langue: 'Latin', annee: 1847 }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['fr1', 'fr2'])
  })

  it('⚠️ la langue se compare repliée : « français » vaut « Français »', () => {
    const rendu = editionsOffertes([
      c({ cle: 'a', langue: 'français', traducteur: 'A', annee: 1 }),
      c({ cle: 'b', langue: 'FRANÇAIS', traducteur: 'B', annee: 2 }),
    ], 'Français')
    expect(rendu).toHaveLength(2)
  })

  it('⛔ écarte un exemplaire de TRAVAIL, et garde le texte publié', () => {
    const rendu = editionsOffertes([
      c({ cle: 'instantane', traducteur: 'Abbé Joyeux', annee: 1866, mention: 'Bar-le-Duc', lisible: false }),
      c({ cle: 'publie', traducteur: 'Abbé Joyeux', annee: 1866, mention: 'Bar-le-Duc', actif: true, url: null }),
      c({ cle: 'autre', traducteur: 'Autre', annee: 1900 }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['publie', 'autre'])
  })

  it('⛔ FOND deux exemplaires d’une même édition, tous deux publiés', () => {
    // Les Homélies sur l'Hexaéméron portent DEUX fois le Migne 1857 en grec.
    const rendu = editionsOffertes([
      c({ cle: 'migne-a', langue: 'Grec', annee: 1857, mention: 'Paris, Jacques-Paul Migne, 1857' }),
      c({ cle: 'migne-b', langue: 'Grec', annee: 1857, mention: 'Paris, Jacques-Paul Migne, 1857' }),
      c({ cle: 'akademie', langue: 'Grec', annee: 1997, mention: 'Berlin, Akademie Verlag, 1997' }),
    ], 'Grec')
    expect(rendu.map(e => e.cle)).toEqual(['migne-a', 'akademie'])
  })

  it('⚠️ un exemplaire fondu cède la place à celui qu’on LIT, sans changer de rang', () => {
    const rendu = editionsOffertes([
      c({ cle: 'premier', annee: 1857, mention: 'Migne' }),
      c({ cle: 'lu', annee: 1857, mention: 'Migne', actif: true, url: null }),
      c({ cle: 'autre', annee: 1997, mention: 'Akademie' }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['lu', 'autre'])
  })

  it('⚠️ le texte par DÉFAUT l’emporte sur un exemplaire ordinaire', () => {
    const rendu = editionsOffertes([
      c({ cle: 'ordinaire', annee: 1866, mention: 'Guérin' }),
      c({ cle: 'defaut', annee: 1866, mention: 'Guérin', prefere: true }),
      c({ cle: 'autre', annee: 1900, mention: 'Autre' }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['defaut', 'autre'])
  })

  it('⚠️ CE QU’ON LIT paraît toujours, fût-il à l’atelier', () => {
    const rendu = editionsOffertes([
      c({ cle: 'brouillon', annee: 1900, mention: 'X', lisible: false, actif: true, url: null }),
      c({ cle: 'publie', annee: 1861, mention: 'Y' }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['brouillon', 'publie'])
  })

  it('⚠️ une ligne indisponible reste une édition, elle compte dans le choix', () => {
    const rendu = editionsOffertes([
      c({ cle: 'lu', annee: 1861, mention: 'Y', actif: true, url: null }),
      c({ cle: 'attend', annee: 1646, mention: 'Z', indisponible: true, url: null }),
    ], 'Français')
    expect(rendu.map(e => e.cle)).toEqual(['lu', 'attend'])
  })

  it('⛔ une langue absente ne se range pas sous celle qu’on lit', () => {
    const rendu = editionsOffertes([
      c({ cle: 'lu', langue: 'Français', annee: 1, actif: true, url: null }),
      c({ cle: 'sans', langue: null, annee: 2 }),
    ], 'Français')
    expect(rendu).toEqual([])
  })
})
