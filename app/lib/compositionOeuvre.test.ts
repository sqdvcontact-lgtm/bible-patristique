import { describe, expect, it } from 'vitest'
import { accepteLaLettrine } from './compositionOeuvre'

/**
 * ⛔ La LETTRINE ouvre la parole de l'AUTEUR, et rien d'autre.
 *
 * Une division ne commence pas toujours par elle : sur les 8 223 divisions du corpus,
 * 159 s'ouvrent sur autre chose — 60 sur un lemme, 55 sur une citation, 41 sur une
 * rubrique, 2 sur un verset, 1 sur une lacune. Toutes recevaient la capitale ornée.
 * Chez Chrysostome, où chaque psaume s'ouvre sur le verset commenté, elle ornait
 * « 1. « Nations, louez le Seigneur… » » et emportait dans son flottant le numéro de
 * verset et le guillemet, en petit corps collé à sa gauche.
 */
describe('ce qui peut porter la lettrine', () => {
  it('la prose de l’auteur la porte, sous ses quatre natures', () => {
    for (const nature of ['texte', 'dialogue', 'introduction', 'apparat_auteur']) {
      expect(accepteLaLettrine({ nature })).toBe(true)
    }
  })

  it('⛔ la parole d’un AUTRE ne la porte pas', () => {
    // La citation et le lemme sont le texte que l'auteur commente. L'orner ferait
    // commencer l'œuvre sur ce qui n'est pas d'elle.
    for (const nature of ['citation', 'lemme', 'verset']) {
      expect(accepteLaLettrine({ nature })).toBe(false)
    }
  })

  it('⛔ ce qui n’est pas du texte suivi ne la porte pas', () => {
    // Une rubrique est un intertitre centré en italique ; une capitale ornée y
    // pendrait au bord d'un titre. Les trois autres ne sont pas de la prose.
    for (const nature of ['rubrique', 'signature', 'separateur', 'texte absent']) {
      expect(accepteLaLettrine({ nature })).toBe(false)
    }
  })

  it('⛔ un VERS ne la porte pas, quelle que soit sa nature', () => {
    // La raison est mécanique et déjà consignée : le flottant, posé dans la boîte
    // d'une ligne, déborde sur les suivantes, qui sont des boîtes sœurs.
    expect(accepteLaLettrine({ nature: 'texte', forme: 'vers' })).toBe(false)
    expect(accepteLaLettrine({ nature: 'dialogue', forme: 'vers' })).toBe(false)
  })

  it('un segment sans nature déclarée est de la prose, et la porte', () => {
    // ⛔ C'est le cas ordinaire : refuser l'ornement par défaut le ferait
    // disparaître de tout le corpus.
    expect(accepteLaLettrine({})).toBe(true)
    expect(accepteLaLettrine({ nature: null })).toBe(true)
  })

  it('un segment absent ne la porte pas', () => {
    // La recherche du premier segment ornable interroge une table : une clé sans
    // entrée ne doit pas passer pour de la prose.
    expect(accepteLaLettrine(null)).toBe(false)
    expect(accepteLaLettrine(undefined)).toBe(false)
  })

  it('⛔ une nature INCONNUE ne la porte pas : la liste est close', () => {
    // Une nature nouvelle n'attrapera pas l'ornement par distraction.
    expect(accepteLaLettrine({ nature: 'colophon' })).toBe(false)
  })
})
