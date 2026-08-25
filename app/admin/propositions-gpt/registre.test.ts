import { describe, expect, it } from 'vitest'
import {
  DIRECTIVES_VIDES, ETATS, LOTS, PLAFOND_INSTRUCTION, PLAFOND_INSTRUCTIONS,
  avancement, conflits, directiveDe, lireDirectives, lireInstructions,
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

  it('relit les instructions posées, générales et par proposition', () => {
    const brut = JSON.stringify({
      version: 1,
      majLe: '2026-08-25T10:00:00.000Z',
      instructionsGenerales: [{ texte: 'Fidélité d’abord.', posee: '2026-08-25T10:00:00.000Z' }],
      parProposition: {
        'apparat-critique/crochet-masque': {
          etat: 'refusee',
          instructions: [
            { texte: 'On garde le crochet.', posee: '2026-08-25T10:01:00.000Z' },
            { texte: 'Voir la charte, §3.', posee: '2026-08-25T10:02:00.000Z' },
          ],
        },
      },
    })
    const d = lireDirectives(brut)
    expect(d.majLe).toBe('2026-08-25T10:00:00.000Z')
    expect(d.instructionsGenerales).toHaveLength(1)
    expect(d.instructionsGenerales[0].texte).toBe('Fidélité d’abord.')

    const dir = directiveDe(d, 'apparat-critique/crochet-masque')
    expect(dir.etat).toBe('refusee')
    expect(dir.instructions.map(i => i.texte)).toEqual(['On garde le crochet.', 'Voir la charte, §3.'])
  })

  it('ramène un état inconnu à « à arbitrer » sans perdre les instructions', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: {
        'apparat-critique/parseur': { etat: 'validee_par_la_machine', instructions: [{ texte: 'x' }] },
      },
    }))
    expect(directiveDe(d, 'apparat-critique/parseur').etat).toBe('a_arbitrer')
    expect(directiveDe(d, 'apparat-critique/parseur').instructions).toEqual([{ texte: 'x', posee: null }])
  })

  it('reprend la forme héritée à note unique plutôt que de la perdre', () => {
    const d = lireDirectives(JSON.stringify({
      noteGenerale: 'Ancienne note générale.',
      parProposition: {
        'apparat-critique/lemme-texte': { etat: 'retenue', note: 'Ancienne note.' },
      },
    }))
    expect(d.instructionsGenerales).toEqual([{ texte: 'Ancienne note générale.', posee: null }])
    expect(directiveDe(d, 'apparat-critique/lemme-texte').instructions)
      .toEqual([{ texte: 'Ancienne note.', posee: null }])
  })

  it('n’invente aucune directive pour une proposition jamais arbitrée', () => {
    expect(directiveDe(DIRECTIVES_VIDES, 'apparat-critique/parseur'))
      .toEqual({ etat: 'a_arbitrer', instructions: [] })
  })

  it('conserve une directive orpheline sans la faire paraître', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: { 'lot-retire/vieux-point': { etat: 'retenue', instructions: [{ texte: 'n' }] } },
    }))
    expect(d.parProposition['lot-retire/vieux-point'].instructions).toHaveLength(1)
    expect(avancement(d).arbitrees).toBe(0)
    expect(avancement(d).instructions).toBe(0)
  })
})

describe('lireInstructions', () => {
  it('écarte le vide, le blanc et ce qui n’est pas du texte', () => {
    expect(lireInstructions([{ texte: '   ' }, { texte: '' }, {}, null, 42, { autre: 'x' }])).toEqual([])
    expect(lireInstructions(undefined)).toEqual([])
    expect(lireInstructions(123)).toEqual([])
  })

  it('rogne les blancs de bord et accepte une chaîne nue', () => {
    expect(lireInstructions(['   garder le crochet   ']))
      .toEqual([{ texte: 'garder le crochet', posee: null }])
  })

  it('borne la longueur d’une instruction et le nombre d’instructions', () => {
    const longue = 'x'.repeat(PLAFOND_INSTRUCTION + 500)
    expect(lireInstructions([{ texte: longue }])[0].texte).toHaveLength(PLAFOND_INSTRUCTION)

    const beaucoup = Array.from({ length: PLAFOND_INSTRUCTIONS + 50 }, (_, i) => ({ texte: `numéro ${i}` }))
    expect(lireInstructions(beaucoup)).toHaveLength(PLAFOND_INSTRUCTIONS)
  })

  it('ne date rien de lui-même : la date est posée par la route', () => {
    expect(lireInstructions([{ texte: 'a', posee: '2026-01-01T00:00:00.000Z' }])[0].posee)
      .toBe('2026-01-01T00:00:00.000Z')
    expect(lireInstructions([{ texte: 'b' }])[0].posee).toBeNull()
  })
})

describe('avancement', () => {
  it('compte les arbitrages, les propositions instruites, et le total des instructions', () => {
    const d: Directives = {
      version: 1,
      majLe: null,
      instructionsGenerales: [{ texte: 'g', posee: null }],
      parProposition: {
        'apparat-critique/crochet-masque': {
          etat: 'refusee',
          instructions: [{ texte: 'a', posee: null }, { texte: 'b', posee: null }],
        },
        'apparat-critique/parseur': { etat: 'plus_tard', instructions: [] },
        'apparat-critique/lemme-texte': { etat: 'a_arbitrer', instructions: [{ texte: 'c', posee: null }] },
      },
    }
    const a = avancement(d)
    expect(a.total).toBe(toutes.length)
    expect(a.arbitrees).toBe(2)
    expect(a.annotees).toBe(2)
    expect(a.instructions).toBe(4)
    expect(a.restantes).toBe(toutes.length - 2)
  })

  it('part de zéro sur un registre vierge', () => {
    const a = avancement(DIRECTIVES_VIDES)
    expect(a.arbitrees).toBe(0)
    expect(a.annotees).toBe(0)
    expect(a.instructions).toBe(0)
    expect(a.restantes).toBe(a.total)
  })
})

describe('les états', () => {
  it('portent tous une teinte tokenisée, jamais une couleur en dur', () => {
    for (const e of ETATS) expect(e.teinte.startsWith('var(--cs-')).toBe(true)
    expect(ETATS[0].cle).toBe('a_arbitrer')
  })
})
