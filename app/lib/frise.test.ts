import { describe, expect, it } from 'vitest'
import {
  cleTypeAffichage, coulType, LIB_TYPE,
  passeMode, passeTraditions, modeDepuisUrl,
  liensDesEvenements, placesDansSeries, decouperEnPeriodes,
} from './frise'

/**
 * ⚠️ Les valeurs sont recopiées des DEUX vues du site, telles qu'elles en
 * sortent : `v_chronologie_auteurs` écrit ses types sans accents, et
 * `v_chronologie_traductions` accentue « édition » et « réception ». C'est
 * précisément cet écart qui laissait deux brins sur trois sans couleur.
 */
const GRIS = 'var(--cs-texte-gris)'

describe('cleTypeAffichage — les deux vues ne parlent pas la même langue', () => {
  it('ôte les accents de la vue des traductions', () => {
    expect(cleTypeAffichage('édition')).toBe('edition')
    expect(cleTypeAffichage('réception')).toBe('reception')
    expect(cleTypeAffichage('formation')).toBe('formation')
  })

  it('⚠️ garde l’œ ligaturé, qui n’est pas un accent', () => {
    expect(cleTypeAffichage('œuvre')).toBe('œuvre')
    expect(LIB_TYPE[cleTypeAffichage('œuvre')]).toBe('Œuvre')
  })

  it('rend une chaîne vide sur une valeur absente', () => {
    expect(cleTypeAffichage(null)).toBe('')
    expect(cleTypeAffichage(undefined)).toBe('')
  })
})

describe('coulType — un brin nommé a sa couleur, accents ou non', () => {
  it('donne aux trois brins d’une TRADUCTION leur couleur', () => {
    // Avant le repli des clés, « édition » et « réception » tombaient sur le gris.
    expect(coulType('édition')).not.toBe(GRIS)
    expect(coulType('réception')).not.toBe(GRIS)
    expect(coulType('formation')).not.toBe(GRIS)
    expect(coulType('contexte')).not.toBe(GRIS)
  })

  it('donne aux trois brins d’un AUTEUR la leur, sans rien changer', () => {
    expect(coulType('vie')).toBe('var(--cs-vert)')
    expect(coulType('œuvre')).not.toBe(GRIS)
    expect(coulType('contexte')).not.toBe(GRIS)
  })

  it('⛔ les trois brins d’une traduction se distinguent l’un de l’autre', () => {
    const brins = ['formation', 'édition', 'réception'].map(coulType)
    expect(new Set(brins).size).toBe(3)
  })

  it('retombe sur le gris pour un type inconnu ou absent', () => {
    expect(coulType('galimatias')).toBe(GRIS)
    expect(coulType(null)).toBe(GRIS)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// LES CINQ GREFFES (2026-09-06). Les valeurs sont RÉELLES, relevées dans
// v_frise_generale, v_evenements_relations et v_series_evenements le jour même.
// ══════════════════════════════════════════════════════════════════════════════

type Ev = Parameters<typeof passeMode>[0] & { traditions: string[] | null }
const ev = (e: Partial<Ev>): Ev => ({
  afficher_mode_essentiel: false, afficher_mode_reperes: false,
  afficher_mode_monde_chretien: false, traditions: null, ...e,
})

describe('le mode de lecture est éditorial', () => {
  it('⛔ lit les booléens de la vue, il ne rabat plus une importance', () => {
    const nicee = ev({ afficher_mode_essentiel: true, afficher_mode_reperes: true, afficher_mode_monde_chretien: true })
    const mineur = ev({ afficher_mode_monde_chretien: true })
    for (const m of ['essentiel', 'reperes', 'monde_chretien', 'tout'] as const) {
      expect(passeMode(nicee, m), m).toBe(true)
    }
    expect(passeMode(mineur, 'essentiel')).toBe(false)
    expect(passeMode(mineur, 'reperes')).toBe(false)
    expect(passeMode(mineur, 'monde_chretien')).toBe(true)
  })

  it('« tout » ne filtre RIEN, même sans un seul booléen', () => {
    expect(passeMode(ev({}), 'tout')).toBe(true)
  })

  it('une ANCIENNE adresse continue de dire ce qu’elle disait', () => {
    expect(modeDepuisUrl(null, 'essentiel')).toBe('essentiel')
    expect(modeDepuisUrl(null, 'etendu')).toBe('reperes')
    expect(modeDepuisUrl(null, 'complet')).toBe('tout')
    expect(modeDepuisUrl(null, null)).toBe('reperes')
    expect(modeDepuisUrl('monde_chretien', 'essentiel')).toBe('monde_chretien')
    expect(modeDepuisUrl('galimatias', null)).toBe('reperes')
  })
})

describe('les traditions en filtre', () => {
  it('aucune tradition cochée ne filtre rien', () => {
    expect(passeTraditions(ev({ traditions: ['latine'] }), new Set())).toBe(true)
    expect(passeTraditions(ev({ traditions: null }), new Set())).toBe(true)
  })
  it('un événement passe dès qu’UNE de ses traditions est retenue', () => {
    const e = ev({ traditions: ['latine', 'grecque'] })
    expect(passeTraditions(e, new Set(['grecque']))).toBe(true)
    expect(passeTraditions(e, new Set(['syriaque']))).toBe(false)
    expect(passeTraditions(ev({ traditions: null }), new Set(['latine']))).toBe(false)
  })
})

describe('les relations, dans les deux sens', () => {
  const relations = [
    {
      evenement_source_id: 'EVT000031', source_titre: 'Début de la controverse arienne', source_date_debut: 318,
      type_relation: 'provoque',
      evenement_cible_id: 'EVT000033', cible_titre: 'Premier concile œcuménique de Nicée', cible_date_debut: 325,
    },
    {
      evenement_source_id: 'EVT000042', source_titre: 'Premier concile de Constantinople', source_date_debut: 381,
      type_relation: 'prolonge',
      evenement_cible_id: 'EVT000033', cible_titre: 'Premier concile œcuménique de Nicée', cible_date_debut: 325,
    },
  ]

  it('range chaque relation aux DEUX bouts, avec la phrase qui convient', () => {
    const par = liensDesEvenements(relations)
    expect(par.get('EVT000031')?.map(l => l.libelle)).toEqual(['Provoque'])
    expect(par.get('EVT000042')?.map(l => l.libelle)).toEqual(['Prolonge'])
    expect(par.get('EVT000033')?.map(l => l.libelle)).toEqual(['Provoqué par', 'Prolongé par'])
    expect(par.get('EVT000033')?.[0].autreTitre).toBe('Début de la controverse arienne')
  })

  it('⛔ un type hors du vocabulaire ne se compose PAS', () => {
    const par = liensDesEvenements([{ ...relations[0], type_relation: 'inspire' }])
    expect(par.size).toBe(0)
  })

  it('une relation sans titre à l’autre bout ne se compose pas non plus', () => {
    const par = liensDesEvenements([{ ...relations[0], cible_titre: null, source_titre: null }])
    expect(par.size).toBe(0)
  })
})

describe('la série comme fil', () => {
  // La série ARIANISME telle que la vue la rend : l'ordre est celui de l'ÉDITEUR, et il
  // ne suit pas les dates — le principal (325) ouvre, l'origine (318) le suit.
  const series = [{
    code: 'ARIANISME', titre: 'Controverse arienne et Nicée', typeSerie: 'doctrinale',
    membres: [
      { id: 'EVT000033', ordre: 0, role: 'principal' },
      { id: 'EVT000031', ordre: 10, role: 'origine' },
      { id: 'EVT001145', ordre: 20, role: 'étape' },
      { id: 'EVT000042', ordre: 40, role: 'prolongement' },
    ],
  }]

  it('dit le rang, le total, le rôle et les deux voisins', () => {
    const [pl] = placesDansSeries(series, 'EVT000031')
    expect(pl.titre).toBe('Controverse arienne et Nicée')
    expect(pl.rang).toBe(2)
    expect(pl.total).toBe(4)
    expect(pl.role).toBe('origine')
    expect(pl.precedentId).toBe('EVT000033')
    expect(pl.suivantId).toBe('EVT001145')
  })

  it('aux deux bouts du fil, un seul voisin', () => {
    expect(placesDansSeries(series, 'EVT000033')[0].precedentId).toBeNull()
    expect(placesDansSeries(series, 'EVT000042')[0].suivantId).toBeNull()
  })

  it('un événement hors de toute série n’en porte aucune', () => {
    expect(placesDansSeries(series, 'EVT999999')).toEqual([])
  })
})

describe('les périodes en séparateurs', () => {
  const p = (code: string | null, nom: string | null) => ({ periode_code: code, periode: nom })

  it('coupe au CHANGEMENT, jamais par table de hachage', () => {
    const t = decouperEnPeriodes([
      p('ANTIQ', 'Antiquité chrétienne'), p('ANTIQ', 'Antiquité chrétienne'),
      p('MEDI', 'Moyen Âge'), p('ANTIQ', 'Antiquité chrétienne'),
    ])
    // ⚠️ Quatre événements, TROIS tranches : la période qui revient rouvre une tranche.
    // C'est ce qui permet au repère de dire où l'on est dans CETTE liste.
    expect(t.map(x => x.code)).toEqual(['ANTIQ', 'MEDI', 'ANTIQ'])
    expect(t.map(x => x.items.length)).toEqual([2, 1, 1])
  })

  it('une période absente fait sa propre tranche, sans nom', () => {
    const t = decouperEnPeriodes([p(null, null), p('ANTIQ', 'Antiquité chrétienne')])
    expect(t[0].nom).toBeNull()
    expect(t).toHaveLength(2)
  })

  it('rend une liste vide sur une liste vide', () => {
    expect(decouperEnPeriodes([])).toEqual([])
  })
})
