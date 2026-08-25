import { describe, expect, it } from 'vitest'
import { ROLE_APPARAT_CRITIQUE, texteApparatAffiche } from '@/app/lib/apparatCritique'
import {
  DIRECTIVES_VIDES, ETATS, LOTS, PLAFOND_INSTRUCTION, PLAFOND_INSTRUCTIONS, REPRISES,
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
      for (const h of p.heurts!) {
        expect(h.consigne.trim().length, p.id).toBeGreaterThan(20)
        expect(h.proposition.trim().length, p.id).toBeGreaterThan(10)
      }
    }
    // Trois points portent des heurts depuis le regroupement ; la recomposition
    // en porte trois à elle seule, et n'en a perdu aucun.
    expect(conflits().map(p => p.id).sort()).toEqual([
      'apparat-critique/abreviations',
      'apparat-critique/recomposition',
      'apparat-critique/sigles',
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
    const parseur = toutes.find(p => p.id === 'apparat-critique/recomposition')!
    expect(roleExemple(parseur.exemple!)).toBe(ROLE_APPARAT_CRITIQUE)
    const autre = toutes.find(p => p.id === 'apparat-critique/acquis')!
    expect(roleExemple(autre.exemple!)).toBeNull()
  })
})

describe('l’état « aujourd’hui » d’un exemple est CALCULÉ, jamais recopié', () => {
  it('retire la ligne imprimée sur une entrée d’apparat', () => {
    const p = toutes.find(x => x.id === 'apparat-critique/recomposition')!
    const rendu = texteApparatAffiche({
      text: p.exemple!.source.texte,
      printedLine: p.exemple!.source.ligne,
      editorialRole: roleExemple(p.exemple!),
    })
    expect(rendu).toBe('eum inuocabo Q; et] ut V; quo] in quo F; ueniad F sic saepe, uenat M; in me] M2 s. l.')
  })

  it('ne touche pas une entrée qui n’est pas de cet apparat', () => {
    const p = toutes.find(x => x.id === 'apparat-critique/acquis')!
    const rendu = texteApparatAffiche({
      text: p.exemple!.source.texte,
      printedLine: p.exemple!.source.ligne,
      editorialRole: roleExemple(p.exemple!),
    })
    expect(rendu).toBe(p.exemple!.source.texte)
  })
})

describe('la reprise des identifiants — rien de ce qui a été écrit ne se perd', () => {
  const ids = new Set(toutes.map(p => p.id))

  it('vise toujours un point qui existe', () => {
    for (const [ancien, neuf] of Object.entries(REPRISES)) {
      expect(ids.has(neuf), `${ancien} → ${neuf}`).toBe(true)
    }
  })

  it('ne reprend jamais un identifiant encore en service, qui s’effacerait lui-même', () => {
    for (const ancien of Object.keys(REPRISES)) {
      expect(ids.has(ancien), ancien).toBe(false)
    }
  })

  it('⛔ reporte les instructions RÉELLEMENT posées avant le regroupement', () => {
    // L'état du paramètre au 2026-08-25, avant que dix-huit points ne deviennent sept.
    const avant = JSON.stringify({
      version: 1,
      majLe: '2026-08-25T09:35:05.426Z',
      instructionsGenerales: [],
      parProposition: {
        'apparat-critique/ligne-imprimee': {
          etat: 'a_arbitrer',
          instructions: [{ texte: 'Oui. Mais pas "Correspond exactement" ; simplement quand il y correspond.', posee: '2026-08-25T09:08:07.309Z' }],
        },
        'apparat-critique/crochet-masque': { etat: 'a_arbitrer', instructions: [] },
        'apparat-critique/lemme-texte': {
          etat: 'a_arbitrer',
          instructions: [
            { texte: "conserver un exposant n'est pas en fabriquer un - oui, il faut conserver les exposants", posee: '2026-08-25T09:26:25.782Z' },
            { texte: 'Que signifie M2 ?', posee: '2026-08-25T09:26:46.096Z' },
          ],
        },
        'apparat-critique/ligne-par-variante': {
          etat: 'a_arbitrer',
          instructions: [{ texte: 'que signifient ces lettres ? V F V P M ?', posee: '2026-08-25T09:28:05.359Z' }],
        },
        'apparat-critique/ponctuation-condensee': {
          etat: 'a_arbitrer',
          instructions: [{ texte: 'Revoir en effet en fonction de "Six points-virgules…"', posee: '2026-08-25T09:29:11.982Z' }],
        },
      },
    })
    const d = lireDirectives(avant)

    // Les quatre instructions sont toujours là, et aucune n'a été inventée.
    expect(avancement(d).instructions).toBe(5)

    // Celle qui portait sur le numéro de ligne rejoint « ce qui est déjà tenu ».
    expect(directiveDe(d, 'apparat-critique/acquis').instructions.map(m => m.texte))
      .toEqual(['Oui. Mais pas "Correspond exactement" ; simplement quand il y correspond.'])

    // Les quatre autres rejoignent la recomposition, DANS L'ORDRE où elles ont été écrites.
    expect(directiveDe(d, 'apparat-critique/recomposition').instructions.map(m => m.texte)).toEqual([
      "conserver un exposant n'est pas en fabriquer un - oui, il faut conserver les exposants",
      'Que signifie M2 ?',
      'que signifient ces lettres ? V F V P M ?',
      'Revoir en effet en fonction de "Six points-virgules…"',
    ])
  })

  it('garde l’état déjà tranché quand deux points fondus n’en portaient qu’un', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: {
        'apparat-critique/sigles-separes': { etat: 'a_arbitrer', instructions: [] },
        'apparat-critique/sigles-non-developpes': { etat: 'refusee', instructions: [] },
      },
    }))
    expect(directiveDe(d, 'apparat-critique/sigles').etat).toBe('refusee')
  })

  it('fond aussi les réponses de GPT, sans les mêler aux instructions', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: {
        'apparat-critique/couleur-secondaire': {
          etat: 'a_arbitrer',
          instructions: [{ texte: 'i1', posee: '2026-08-25T10:00:00.000Z' }],
          reponses: [{ texte: 'r1', posee: '2026-08-25T10:01:00.000Z' }],
        },
        'apparat-critique/lisible-sans-couleur': {
          etat: 'a_arbitrer',
          instructions: [{ texte: 'i2', posee: '2026-08-25T10:02:00.000Z' }],
          reponses: [{ texte: 'r2', posee: '2026-08-25T10:03:00.000Z' }],
        },
      },
    }))
    const dir = directiveDe(d, 'apparat-critique/couleur')
    expect(dir.instructions.map(m => m.texte)).toEqual(['i1', 'i2'])
    expect(dir.reponses.map(m => m.texte)).toEqual(['r1', 'r2'])
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
        'apparat-critique/recomposition': {
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

    const dir = directiveDe(d, 'apparat-critique/recomposition')
    expect(dir.etat).toBe('refusee')
    expect(dir.instructions.map(i => i.texte)).toEqual(['On garde le crochet.', 'Voir la charte, §3.'])
  })

  it('ramène un état inconnu à « à arbitrer » sans perdre les instructions', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: {
        'apparat-critique/parseur': { etat: 'validee_par_la_machine', instructions: [{ texte: 'x' }] },
      },
    }))
    expect(directiveDe(d, 'apparat-critique/recomposition').etat).toBe('a_arbitrer')
    expect(directiveDe(d, 'apparat-critique/recomposition').instructions).toEqual([{ texte: 'x', posee: null }])
  })

  it('reprend la forme héritée à note unique plutôt que de la perdre', () => {
    const d = lireDirectives(JSON.stringify({
      noteGenerale: 'Ancienne note générale.',
      parProposition: {
        'apparat-critique/lemme-texte': { etat: 'retenue', note: 'Ancienne note.' },
      },
    }))
    expect(d.instructionsGenerales).toEqual([{ texte: 'Ancienne note générale.', posee: null }])
    expect(directiveDe(d, 'apparat-critique/recomposition').instructions)
      .toEqual([{ texte: 'Ancienne note.', posee: null }])
  })

  it('n’invente aucune directive pour une proposition jamais arbitrée', () => {
    expect(directiveDe(DIRECTIVES_VIDES, 'apparat-critique/recomposition'))
      .toEqual({ etat: 'a_arbitrer', instructions: [], reponses: [] })
  })

  it('relit les DEUX voix, et ne les mêle jamais', () => {
    const d = lireDirectives(JSON.stringify({
      instructionsGenerales: [{ texte: 'Fidélité d’abord.' }],
      reponsesGenerales: [{ texte: 'Compris.' }],
      parProposition: {
        'apparat-critique/recomposition': {
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

    const dir = directiveDe(d, 'apparat-critique/recomposition')
    expect(dir.instructions.map(m => m.texte)).toEqual(['Le crochet reste.'])
    expect(dir.reponses.map(m => m.texte)).toEqual(['Entendu, je cherche une autre marque.'])
  })

  it('rend une voix vide quand elle n’a jamais servi, sans toucher à l’autre', () => {
    const d = lireDirectives(JSON.stringify({
      parProposition: { 'apparat-critique/parseur': { etat: 'retenue', instructions: [{ texte: 'x' }] } },
    }))
    expect(directiveDe(d, 'apparat-critique/recomposition').reponses).toEqual([])
    expect(directiveDe(d, 'apparat-critique/recomposition').instructions).toHaveLength(1)
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
        'apparat-critique/recomposition': {
          etat: 'refusee',
          instructions: [{ texte: 'a', posee: null }, { texte: 'b', posee: null }], reponses: [],
        },
        'apparat-critique/sigles': { etat: 'plus_tard', instructions: [], reponses: [{ texte: 'r', posee: null }] },
        'apparat-critique/couleur': { etat: 'a_arbitrer', instructions: [{ texte: 'c', posee: null }], reponses: [] },
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
  const point = toutes.find(p => p.id === 'apparat-critique/recomposition')!

  it('porte la proposition, la mesure, le conflit et l’entrée réelle', () => {
    const texte = texteAPorterAGpt(point, DIRECTIVES_VIDES.parProposition[point.id] ?? {
      etat: 'a_arbitrer', instructions: [], reponses: [],
    })
    expect(texte).toContain(point.titre)
    expect(texte).toContain(point.texte)
    expect(texte).toContain(point.mesure!)
    expect(texte).toContain(point.heurts![0].consigne)
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
