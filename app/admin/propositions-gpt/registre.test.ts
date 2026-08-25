import { describe, expect, it } from 'vitest'
import {
  DIRECTIVES_VIDES, ETATS, LOTS,
  avancement, conflits, directiveDe, lireDirectives,
  type Directives,
} from './registre'

const toutes = LOTS.flatMap(l => l.propositions)

describe('le registre est une source rédigée, et il tient', () => {
  it('ne porte aucun identifiant en double', () => {
    const ids = toutes.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('nomme chaque proposition, sa rubrique et le texte de GPT', () => {
    for (const p of toutes) {
      expect(p.id.trim().length, p.id).toBeGreaterThan(0)
      expect(p.titre.trim().length, p.id).toBeGreaterThan(0)
      expect(p.rubrique.trim().length, p.id).toBeGreaterThan(0)
      expect(p.texte.trim().length, p.id).toBeGreaterThan(20)
    }
  })

  it('préfixe chaque identifiant par son lot, pour qu’une clé de stockage se lise', () => {
    for (const lot of LOTS) {
      for (const p of lot.propositions) expect(p.id.startsWith(`${lot.id}/`), p.id).toBe(true)
    }
  })

  it('cite les DEUX côtés de chaque conflit, jamais un seul', () => {
    for (const p of conflits()) {
      expect(p.conflit!.consigne.trim().length, p.id).toBeGreaterThan(20)
      expect(p.conflit!.proposition.trim().length, p.id).toBeGreaterThan(10)
    }
    // Les cinq contradictions relevées avec la consigne du 25 août.
    expect(conflits().map(p => p.id).sort()).toEqual([
      'apparat-critique/abreviations-developpees',
      'apparat-critique/crochet-masque',
      'apparat-critique/parseur',
      'apparat-critique/ponctuation-condensee',
      'apparat-critique/sigles-separes',
    ])
  })

  it('donne un avant ET un après à chaque exemple', () => {
    for (const p of toutes.filter(x => x.exemple)) {
      expect(p.exemple!.avant.trim().length, p.id).toBeGreaterThan(0)
      expect(p.exemple!.apres.length, p.id).toBeGreaterThan(0)
    }
  })
})

describe('lireDirectives — tolérante, mais jamais inventive', () => {
  it('rend un registre vierge devant une valeur absente, vide ou illisible', () => {
    for (const v of [undefined, null, '', '   ', 'pas du json', '[1,2]', '42', JSON.stringify(null)]) {
      expect(lireDirectives(v)).toEqual(DIRECTIVES_VIDES)
    }
  })

  it('relit ce qui a été écrit', () => {
    const brut = JSON.stringify({
      version: 1, majLe: '2026-08-25T10:00:00.000Z', noteGenerale: 'Fidélité d’abord.',
      parProposition: { 'apparat-critique/crochet-masque': { etat: 'refusee', note: 'On garde le crochet.' } },
    })
    const d = lireDirectives(brut)
    expect(d.noteGenerale).toBe('Fidélité d’abord.')
    expect(d.majLe).toBe('2026-08-25T10:00:00.000Z')
    expect(directiveDe(d, 'apparat-critique/crochet-masque')).toEqual({ etat: 'refusee', note: 'On garde le crochet.' })
  })

  it('ramène un état inconnu à « à arbitrer » plutôt que de le servir tel quel', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: { 'apparat-critique/parseur': { etat: 'validee_par_la_machine', note: 'x' } },
    }))
    expect(directiveDe(d, 'apparat-critique/parseur').etat).toBe('a_arbitrer')
    expect(directiveDe(d, 'apparat-critique/parseur').note).toBe('x')
  })

  it('n’invente aucune directive pour une proposition jamais arbitrée', () => {
    expect(directiveDe(DIRECTIVES_VIDES, 'apparat-critique/parseur')).toEqual({ etat: 'a_arbitrer', note: '' })
  })

  it('conserve une directive orpheline sans la faire paraître', () => {
    const d = lireDirectives(JSON.stringify({ parProposition: { 'lot-retire/vieux-point': { etat: 'retenue', note: 'n' } } }))
    expect(d.parProposition['lot-retire/vieux-point']).toEqual({ etat: 'retenue', note: 'n' })
    expect(avancement(d).arbitrees).toBe(0)
  })
})

describe('avancement', () => {
  it('compte les propositions arbitrées et annotées, jamais deux fois la même', () => {
    const d: Directives = {
      version: 1, majLe: null, noteGenerale: '',
      parProposition: {
        'apparat-critique/crochet-masque': { etat: 'refusee', note: 'non' },
        'apparat-critique/parseur': { etat: 'plus_tard', note: '' },
        'apparat-critique/lemme-texte': { etat: 'a_arbitrer', note: 'à voir' },
      },
    }
    const a = avancement(d)
    expect(a.total).toBe(toutes.length)
    expect(a.arbitrees).toBe(2)
    expect(a.annotees).toBe(2)
    expect(a.restantes).toBe(toutes.length - 2)
  })

  it('part de zéro sur un registre vierge', () => {
    const a = avancement(DIRECTIVES_VIDES)
    expect(a.arbitrees).toBe(0)
    expect(a.annotees).toBe(0)
    expect(a.restantes).toBe(a.total)
  })
})

describe('les états', () => {
  it('portent tous une teinte tokenisée, jamais une couleur en dur', () => {
    for (const e of ETATS) expect(e.teinte.startsWith('var(--cs-')).toBe(true)
    expect(ETATS[0].cle).toBe('a_arbitrer')
  })
})
