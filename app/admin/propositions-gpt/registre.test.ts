import { describe, expect, it } from 'vitest'
import { ROLE_APPARAT_CRITIQUE, texteApparatAffiche } from '@/app/lib/apparatCritique'
import {
  DIRECTIVES_VIDES, ETATS, LOTS, PLAFOND_INSTRUCTION, PLAFOND_INSTRUCTIONS,
  avancement, conflits, directiveDe, lireDirectives, lireMessages, messagesGeneraux,
  roleExemple, texteAPorterAGpt,
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

  it('donne un avant-après à CHAQUE proposition, sans exception', () => {
    for (const p of toutes) expect(p.exemple, p.id).toBeDefined()
  })

  it('appuie chaque exemple sur une entrée réelle, citée avec son numéro de note', () => {
    for (const p of toutes) {
      const src = p.exemple!.source
      expect(src.note, p.id).toBeGreaterThan(0)
      expect(src.texte.trim().length, p.id).toBeGreaterThan(10)
      expect(src.ligne, p.id).toBeGreaterThanOrEqual(0)
    }
  })

  it('ouvre l’entrée d’apparat sur sa ligne imprimée, pour que « aujourd’hui » se calcule', () => {
    for (const p of toutes) {
      const src = p.exemple!.source
      // `role: null` désigne une entrée qui n'est pas de cet apparat (autre œuvre).
      if (src.role === null || src.ligne === 0) continue
      expect(src.texte.startsWith(`${src.ligne} `), `${p.id} — ${src.texte.slice(0, 30)}`).toBe(true)
    }
  })

  it('compose l’après de fragments non vides, aux rôles connus', () => {
    const roles = new Set([undefined, 'latin', 'sigle', 'gloss'])
    for (const p of toutes) {
      const apres = p.exemple!.apres
      expect(apres.length, p.id).toBeGreaterThan(0)
      for (const ligne of apres) {
        expect(ligne.length, p.id).toBeGreaterThan(0)
        for (const f of ligne) {
          expect(f.v.length, p.id).toBeGreaterThan(0)
          expect(roles.has(f.r), `${p.id} — rôle ${f.r}`).toBe(true)
        }
      }
    }
  })

  it('nomme la provenance dès que l’entrée ne vient pas de l’apparat des Confessions', () => {
    for (const p of toutes) {
      const src = p.exemple!.source
      if (src.role === undefined) continue
      expect(src.provenance, p.id).toBeTruthy()
    }
  })

  it('rend l’apparat par défaut, et le rôle déclaré sinon', () => {
    const parseur = toutes.find(p => p.id === 'apparat-critique/parseur')!
    expect(roleExemple(parseur.exemple!)).toBe(ROLE_APPARAT_CRITIQUE)
    const autre = toutes.find(p => p.id === 'apparat-critique/renderer-reutilisable')!
    expect(roleExemple(autre.exemple!)).toBeNull()
  })
})

describe('l’état « aujourd’hui » d’un exemple est CALCULÉ, jamais recopié', () => {
  it('retire la ligne imprimée sur une entrée d’apparat', () => {
    const p = toutes.find(x => x.id === 'apparat-critique/crochet-masque')!
    const rendu = texteApparatAffiche({
      text: p.exemple!.source.texte,
      printedLine: p.exemple!.source.ligne,
      editorialRole: roleExemple(p.exemple!),
    })
    expect(rendu).toBe('uirtus (r ex s corr.) B; est] est et BPQ.')
  })

  it('ne touche pas une entrée qui n’est pas de cet apparat', () => {
    const p = toutes.find(x => x.id === 'apparat-critique/renderer-reutilisable')!
    const rendu = texteApparatAffiche({
      text: p.exemple!.source.texte,
      printedLine: p.exemple!.source.ligne,
      editorialRole: roleExemple(p.exemple!),
    })
    expect(rendu).toBe(p.exemple!.source.texte)
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
      .toEqual({ etat: 'a_arbitrer', instructions: [], reponses: [] })
  })

  it('relit les DEUX voix, et ne les mêle jamais', () => {
    const d = lireDirectives(JSON.stringify({
      instructionsGenerales: [{ texte: 'Fidélité d’abord.' }],
      reponsesGenerales: [{ texte: 'Compris.' }],
      parProposition: {
        'apparat-critique/crochet-masque': {
          etat: 'refusee',
          instructions: [{ texte: 'Le crochet reste.' }],
          reponses: [{ texte: 'Entendu, je cherche une autre marque.' }],
        },
      },
    }))
    expect(d.instructionsGenerales.map(m => m.texte)).toEqual(['Fidélité d’abord.'])
    expect(d.reponsesGenerales.map(m => m.texte)).toEqual(['Compris.'])
    expect(messagesGeneraux(d, 'instructions')).toEqual(d.instructionsGenerales)
    expect(messagesGeneraux(d, 'reponses')).toEqual(d.reponsesGenerales)

    const dir = directiveDe(d, 'apparat-critique/crochet-masque')
    expect(dir.instructions.map(m => m.texte)).toEqual(['Le crochet reste.'])
    expect(dir.reponses.map(m => m.texte)).toEqual(['Entendu, je cherche une autre marque.'])
  })

  it('rend une voix vide quand elle n’a jamais servi, sans toucher à l’autre', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: { 'apparat-critique/parseur': { etat: 'retenue', instructions: [{ texte: 'x' }] } },
    }))
    expect(directiveDe(d, 'apparat-critique/parseur').reponses).toEqual([])
    expect(directiveDe(d, 'apparat-critique/parseur').instructions).toHaveLength(1)
    expect(d.reponsesGenerales).toEqual([])
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

describe('lireMessages', () => {
  it('écarte le vide, le blanc et ce qui n’est pas du texte', () => {
    expect(lireMessages([{ texte: '   ' }, { texte: '' }, {}, null, 42, { autre: 'x' }])).toEqual([])
    expect(lireMessages(undefined)).toEqual([])
    expect(lireMessages(123)).toEqual([])
  })

  it('rogne les blancs de bord et accepte une chaîne nue', () => {
    expect(lireMessages(['   garder le crochet   ']))
      .toEqual([{ texte: 'garder le crochet', posee: null }])
  })

  it('borne la longueur d’une instruction et le nombre d’instructions', () => {
    const longue = 'x'.repeat(PLAFOND_INSTRUCTION + 500)
    expect(lireMessages([{ texte: longue }])[0].texte).toHaveLength(PLAFOND_INSTRUCTION)

    const beaucoup = Array.from({ length: PLAFOND_INSTRUCTIONS + 50 }, (_, i) => ({ texte: `numéro ${i}` }))
    expect(lireMessages(beaucoup)).toHaveLength(PLAFOND_INSTRUCTIONS)
  })

  it('ne date rien de lui-même : la date est posée par la route', () => {
    expect(lireMessages([{ texte: 'a', posee: '2026-01-01T00:00:00.000Z' }])[0].posee)
      .toBe('2026-01-01T00:00:00.000Z')
    expect(lireMessages([{ texte: 'b' }])[0].posee).toBeNull()
  })
})

describe('avancement', () => {
  it('compte les arbitrages, les propositions instruites, et le total des instructions', () => {
    const d: Directives = {
      version: 1,
      majLe: null,
      instructionsGenerales: [{ texte: 'g', posee: null }], reponsesGenerales: [],
      parProposition: {
        'apparat-critique/crochet-masque': {
          etat: 'refusee',
          instructions: [{ texte: 'a', posee: null }, { texte: 'b', posee: null }], reponses: [],
        },
        'apparat-critique/parseur': { etat: 'plus_tard', instructions: [], reponses: [{ texte: 'r', posee: null }] },
        'apparat-critique/lemme-texte': { etat: 'a_arbitrer', instructions: [{ texte: 'c', posee: null }], reponses: [] },
      },
    }
    const a = avancement(d)
    expect(a.total).toBe(toutes.length)
    expect(a.arbitrees).toBe(2)
    expect(a.annotees).toBe(2)
    expect(a.instructions).toBe(4)
    expect(a.reponses).toBe(1)
    // « crochet-masque » et « lemme-texte » sont instruits sans réponse ; « parseur »
    // a une réponse mais aucune instruction, donc il n'attend rien.
    expect(a.attendGpt).toBe(2)
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

describe('texteAPorterAGpt — le passage de main', () => {
  const point = toutes.find(p => p.id === 'apparat-critique/crochet-masque')!

  it('porte la proposition, la mesure, le conflit et l’entrée réelle', () => {
    const texte = texteAPorterAGpt(point, DIRECTIVES_VIDES.parProposition[point.id] ?? {
      etat: 'a_arbitrer', instructions: [], reponses: [],
    })
    expect(texte).toContain(point.titre)
    expect(texte).toContain(point.texte)
    expect(texte).toContain(point.mesure!)
    expect(texte).toContain(point.conflit!.consigne)
    expect(texte).toContain(point.exemple!.source.texte)
  })

  it('emporte les instructions déjà posées, numérotées', () => {
    const texte = texteAPorterAGpt(point, {
      etat: 'refusee',
      instructions: [{ texte: 'Le crochet reste.', posee: null }, { texte: 'Voir la charte.', posee: null }],
      reponses: [],
    })
    expect(texte).toContain('1. Le crochet reste.')
    expect(texte).toContain('2. Voir la charte.')
  })

  it('⛔ n’emporte JAMAIS les réponses de GPT : on ne lui relit pas ses propres mots', () => {
    const texte = texteAPorterAGpt(point, {
      etat: 'a_arbitrer', instructions: [],
      reponses: [{ texte: 'Une réponse antérieure de GPT.', posee: null }],
    })
    expect(texte).not.toContain('Une réponse antérieure de GPT.')
  })
})

describe('les états', () => {
  it('portent tous une teinte tokenisée, jamais une couleur en dur', () => {
    for (const e of ETATS) expect(e.teinte.startsWith('var(--cs-')).toBe(true)
    expect(ETATS[0].cle).toBe('a_arbitrer')
  })
})
