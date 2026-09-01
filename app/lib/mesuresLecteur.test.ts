import { describe, expect, it } from 'vitest'
import { MESURES } from './hautsFaits'
import {
  DEUTEROCANONIQUES, EVANGILES, PAULINIENNES,
  heureDeParis, jourDeParis, mesurerLecteur,
  type EntreesLecteur, type MarquePrelevement,
} from './mesuresLecteur'

const LANGUES = [
  { trad_id: 'TR0001', langue: 'Français' },
  { trad_id: 'TR0004', langue: 'Latin' },
  { trad_id: 'TR0005', langue: 'Grec ancien' },
  { trad_id: 'TR0011', langue: 'Latin' },
]

function p(x: Partial<MarquePrelevement> = {}): MarquePrelevement {
  return {
    type: 'biblique', ref_livre: 'GEN', ref_chapitre: 1, ref_verset: 1,
    traduction: 'TR0001', auteur: null, titre_oeuvre: null,
    created_at: '2026-09-01T12:00:00Z', ...x,
  }
}

function entrees(x: Partial<EntreesLecteur> = {}): EntreesLecteur {
  return {
    prelevements: [], favoris: [], commentaires: [],
    signalements: 0, essaisPublies: 0, langues: LANGUES, ...x,
  }
}

describe('les mesures d’un lecteur', () => {
  // ⛔ LA GARDE CENTRALE. Une mesure déclarée dans `MESURES` mais que rien ne produit
  // ne se signale par RIEN : le haut fait qui s'y adosse reste simplement à zéro pour
  // toujours, et personne ne s'en aperçoit. C'est la leçon de `NATURES_CORPS`, payée
  // deux fois sur le corpus.
  it('produit TOUTES les mesures que le référentiel peut nommer', () => {
    const rendues = new Set(Object.keys(mesurerLecteur(entrees())))
    // ⚠️ Ces deux-là seules viennent d'ailleurs : elles demandent de connaître le
    // corpus, non les seules marques, et la route les ajoute depuis `calculerRetenu`.
    const HORS_MODULE = new Set(['peres_retenus', 'siecles_retenus'])
    const manquantes = MESURES.filter(m => !rendues.has(m) && !HORS_MODULE.has(m))
    expect(manquantes, `mesures déclarées et jamais produites : ${manquantes.join(', ')}`).toEqual([])
  })

  it('ne produit aucune mesure que le référentiel ne connaisse', () => {
    const declarees = new Set<string>(MESURES)
    const orphelines = Object.keys(mesurerLecteur(entrees())).filter(m => !declarees.has(m))
    expect(orphelines, `mesures produites et jamais déclarées : ${orphelines.join(', ')}`).toEqual([])
  })

  // ⛔ La règle de fond : rien ne se compte qui n'ait été MARQUÉ. Un lecteur qui n'a
  // rien posé est à zéro partout, quelle qu'ait été sa lecture.
  it('rend zéro partout pour qui n’a rien marqué', () => {
    const m = mesurerLecteur(entrees())
    expect(Object.values(m).every(v => v === 0)).toBe(true)
  })
})

describe('les groupes de livres', () => {
  // ⚠️ Une liste de codes qui a dérivé du canon ne se signale par rien : le haut fait
  // devient inatteignable en silence. `mesuresLecteur` lève donc à l'import ; ici on
  // vérifie les effectifs, qui sont des faits et non des choix.
  it('tient les effectifs attendus', () => {
    expect(EVANGILES.size).toBe(4)
    expect(PAULINIENNES.size).toBe(13)
    expect(DEUTEROCANONIQUES.size).toBe(7)
  })
})

describe('le tour de la Bible', () => {
  it('compte les livres distincts, les Testaments, les Évangiles et Paul', () => {
    const m = mesurerLecteur(entrees({
      prelevements: [
        p({ ref_livre: 'GEN' }), p({ ref_livre: 'GEN', ref_chapitre: 3 }),
        p({ ref_livre: 'MAT' }), p({ ref_livre: 'JHN' }),
        p({ ref_livre: 'ROM' }), p({ ref_livre: 'SIR' }),
      ],
    }))
    expect(m.livres_bibliques).toBe(5)
    expect(m.testaments_touches).toBe(2)
    expect(m.evangiles_touches).toBe(2)
    expect(m.epitres_pauliniennes).toBe(1)
    expect(m.deuterocanoniques).toBe(1)
    expect(m.genese_ouverte).toBe(1)
    expect(m.exode_et_nombres).toBe(0)
  })

  it('exige les DEUX livres pour « Par le désert »', () => {
    const exodeSeul = mesurerLecteur(entrees({ prelevements: [p({ ref_livre: 'EXO' })] }))
    expect(exodeSeul.exode_et_nombres).toBe(0)
    const deux = mesurerLecteur(entrees({ prelevements: [p({ ref_livre: 'EXO' }), p({ ref_livre: 'NUM' })] }))
    expect(deux.exode_et_nombres).toBe(1)
  })

  it('compte les psaumes par CHAPITRE, non par verset', () => {
    // ⚠️ « Tout le Psautier » vaut cent cinquante psaumes, pas cent cinquante versets :
    // dix versets du psaume 118 n'en font qu'un.
    const m = mesurerLecteur(entrees({
      prelevements: [
        p({ ref_livre: 'PSA', ref_chapitre: 118, ref_verset: 1 }),
        p({ ref_livre: 'PSA', ref_chapitre: 118, ref_verset: 2 }),
        p({ ref_livre: 'PSA', ref_chapitre: 22 }),
      ],
    }))
    expect(m.psaumes_retenus).toBe(2)
  })
})

describe('les langues', () => {
  // ⛔ Le grec et le latin se reconnaissent à la LANGUE déclarée par la table des
  // traductions, jamais à un identifiant écrit en dur : une édition nouvelle ne doit
  // rien demander à ce module.
  it('reconnaît le grec et le latin par leur langue déclarée', () => {
    const m = mesurerLecteur(entrees({
      prelevements: [
        p({ traduction: 'TR0005' }), p({ traduction: 'TR0004' }),
        p({ traduction: 'TR0011' }), p({ traduction: 'TR0001' }),
      ],
    }))
    expect(m.passages_grecs).toBe(1)
    expect(m.passages_latins).toBe(2)
    expect(m.passages_anciens).toBe(3)
    expect(m.traductions_retenues).toBe(4)
  })

  it('compte les traductions d’un MÊME verset, non le total', () => {
    const m = mesurerLecteur(entrees({
      prelevements: [
        p({ ref_livre: 'JHN', ref_chapitre: 1, ref_verset: 1, traduction: 'TR0001' }),
        p({ ref_livre: 'JHN', ref_chapitre: 1, ref_verset: 1, traduction: 'TR0004' }),
        p({ ref_livre: 'JHN', ref_chapitre: 1, ref_verset: 1, traduction: 'TR0005' }),
        p({ ref_livre: 'GEN', ref_chapitre: 1, ref_verset: 1, traduction: 'TR0011' }),
      ],
    }))
    expect(m.traductions_dun_verset).toBe(3)
  })
})

describe('les Pères', () => {
  it('compte les Pères réunis sur un MÊME verset', () => {
    const patr = (auteur: string, verset: number) =>
      p({ type: 'patristique', auteur, ref_livre: 'JHN', ref_chapitre: 1, ref_verset: verset })
    const m = mesurerLecteur(entrees({
      prelevements: [patr('Augustin', 1), patr('Jérôme', 1), patr('Origène', 1), patr('Ambroise', 3)],
    }))
    expect(m.peres_sur_un_verset).toBe(3)
    expect(m.passages_patristiques).toBe(4)
    expect(m.versets_retenus).toBe(0)
  })

  it('compte les passages d’Augustin retenus le MÊME jour', () => {
    const aug = (iso: string) => p({ type: 'patristique', auteur: 'Augustin d’Hippone', created_at: iso })
    const m = mesurerLecteur(entrees({
      prelevements: [
        aug('2026-09-01T10:00:00Z'), aug('2026-09-01T11:00:00Z'),
        aug('2026-09-02T10:00:00Z'),
        p({ type: 'patristique', auteur: 'Jérôme', created_at: '2026-09-01T12:00:00Z' }),
      ],
    }))
    expect(m.augustin_en_un_jour).toBe(2)
  })

  it('reconnaît les Confessions à leur titre', () => {
    const m = mesurerLecteur(entrees({
      prelevements: [p({ type: 'patristique', titre_oeuvre: 'Les Confessions' })],
    }))
    expect(m.confessions_ouvertes).toBe(1)
  })
})

describe('l’assiduité, à l’heure de Paris', () => {
  // ⛔ `created_at` est en temps universel. Lu tel quel, « Veilleur de nuit » tomberait
  // à des heures qui ne veulent rien dire : minuit à Paris, c'est 22 h ou 23 h UTC
  // selon la saison. La bascule d'été est le seul cas qui prouve la conversion.
  it('convertit l’heure, et suit l’heure d’été', () => {
    expect(heureDeParis('2026-01-15T23:30:00Z')).toBe(0)  // hiver : UTC+1
    expect(heureDeParis('2026-07-15T23:30:00Z')).toBe(1)  // été   : UTC+2
    expect(jourDeParis('2026-01-15T23:30:00Z')).toBe('2026-01-16')
  })

  it('range la nuit et l’aurore dans deux tranches disjointes', () => {
    const a = (h: string) => p({ created_at: `2026-01-15T${h}:00:00Z` })
    const m = mesurerLecteur(entrees({
      // En janvier, Paris est à UTC+1 : 23 h UTC = minuit, 04 h UTC = 5 h, 12 h = 13 h.
      prelevements: [a('23'), a('02'), a('04'), a('12')],
    }))
    expect(m.prelevements_nuit).toBe(2)    // minuit et 3 h
    expect(m.prelevements_aurore).toBe(1)  // 5 h
    expect(m.jours_marques).toBe(2)        // le 15 et le 16, heure de Paris
  })

  it('compte les mois de la PREMIÈRE à la DERNIÈRE marque', () => {
    // ⚠️ Non depuis l'inscription : un compte ouvert puis laissé dormir un an n'est
    // pas une année de lecture, et le haut fait dirait le contraire du vrai.
    const m = mesurerLecteur(entrees({
      prelevements: [p({ created_at: '2025-09-01T12:00:00Z' }), p({ created_at: '2026-09-01T12:00:00Z' })],
    }))
    expect(m.mois_ecoules).toBe(12)
    const seule = mesurerLecteur(entrees({ prelevements: [p()] }))
    expect(seule.mois_ecoules).toBe(0)
  })
})

describe('la communauté', () => {
  it('sépare le geste de sa validation', () => {
    const m = mesurerLecteur(entrees({
      commentaires: [
        { valide: true, reponse_a: null },
        { valide: false, reponse_a: null },
        { valide: null, reponse_a: 'abc' },
      ],
      signalements: 3,
    }))
    expect(m.commentaires_poses).toBe(3)
    expect(m.commentaires_valides).toBe(1)
    expect(m.reponses_posees).toBe(1)
    expect(m.signalements_poses).toBe(3)
  })

  it('distingue les favoris d’œuvre du total', () => {
    const m = mesurerLecteur(entrees({
      favoris: [{ type: 'oeuvre' }, { type: 'oeuvre' }, { type: 'essai' }],
    }))
    expect(m.oeuvres_bibliotheque).toBe(2)
    expect(m.favoris_poses).toBe(3)
  })
})
