import { describe, expect, it } from 'vitest'
import {
  NATURE_SIGNATURE, accepteLaLettrine, estBlocDeSignatures,
  styleParagrapheApparat, styleParagrapheLecture,
} from './compositionOeuvre'

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

/**
 * ⛔ La SIGNATURE se compose dans l'APPARAT, et nulle part ailleurs.
 *
 * Les onze `signature` du corpus — les quatre approbateurs du Mépris du monde, les trois
 * de Boèce, le Privilège des Confessions — portent toutes `espace_textuel =
 * 'apparat_critique'`. Le fer à droite existait pourtant dans la seule branche de la
 * LECTURE : la forme était rendue là où aucun segment ne va, et absente là où ils sont
 * tous. Corrigé le 6 septembre 2026.
 */
describe('le bloc de signatures', () => {
  it('l’apparat porte la dérogation de nature, comme la lecture', () => {
    const apparat = styleParagrapheApparat({ signature: true })
    expect(apparat.textAlign).toBe('right')
    expect(apparat.lineHeight).toBe('1.32')
    expect(apparat).toEqual(styleParagrapheLecture({ signature: true }))
  })

  it('sans forme, l’apparat compose sa prose comme la lecture', () => {
    // ⚠️ C'est le cas ordinaire, et il ne doit pas bouger : `styleParagrapheApparat`
    // n'est que `styleParagrapheLecture`, les deux surfaces composant au même corps.
    expect(styleParagrapheApparat()).toEqual(styleParagrapheLecture())
  })

  it('⛔ le blanc d’une signature est celui d’une LISTE, non d’un paragraphe', () => {
    expect(styleParagrapheLecture({ signature: true }).margin).toBe('0 0 0.3rem')
    expect(styleParagrapheLecture().margin).toBe('0 0 0.72rem')
  })

  it('un bloc n’est de signatures que si TOUTES ses lignes en sont', () => {
    // ⛔ Une signature glissée dans un paragraphe de prose ne ferre pas ce paragraphe à
    // droite : elle en sort d'abord (garde-fou de `paragraphesDe`).
    expect(estBlocDeSignatures(['signature'])).toBe(true)
    expect(estBlocDeSignatures(['signature', 'signature'])).toBe(true)
    expect(estBlocDeSignatures(['apparat_editeur', 'signature'])).toBe(false)
    expect(estBlocDeSignatures(['signature', null])).toBe(false)
  })

  it('un bloc VIDE n’est pas un bloc de signatures', () => {
    // Même contrat qu'`estBlocVersets` : `every` sur une liste vide rend vrai.
    expect(estBlocDeSignatures([])).toBe(false)
  })

  it('la nature s’écrit à un seul endroit', () => {
    expect(NATURE_SIGNATURE).toBe('signature')
  })
})
