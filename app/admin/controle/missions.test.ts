import { describe, expect, it } from 'vitest'

import {
  ADRESSE_SYSTEME,
  CLES_RESERVEES,
  OUTILS_DU_CONTROLE,
  adresseDeMission,
  comptesDesTaches,
  composerMissions,
  type Mission,
} from './missions'

const cles = (missions: Mission[]) => missions.map((mission) => mission.cle)

describe('composerMissions', () => {
  it('range les missions de la base par leur rang, non par l’ordre des lignes rendues', () => {
    const missions = composerMissions(
      [
        { cle: 'visite', titre: 'La visite', ordre: 13 },
        { cle: 'corpus', titre: 'Corpus', ordre: 1 },
        { cle: 'qualite', titre: 'Qualité du texte', ordre: 2 },
      ],
      [],
    )
    expect(cles(missions)).toEqual(['corpus', 'qualite', 'visite'])
    expect(missions.every((mission) => mission.enBase)).toBe(true)
  })

  // ⛔ Le défaut de la page des statistiques : ses cartes étaient écrites à la main, et deux
  // missions tenues en base n'y paraissaient pas. Toute ligne de la base doit être nommée.
  it('nomme toutes les missions de la base, même celles qu’aucune page ne connaît', () => {
    const missions = composerMissions([
      { cle: 'chronologie', titre: 'Chronologie', ordre: 6 },
      { cle: 'eusebe', titre: 'Eusèbe — Histoire ecclésiastique', ordre: 7 },
      { cle: 'espace_lecteur', titre: 'Espace du lecteur — compte, page et progression', ordre: 12 },
    ])
    expect(cles(missions)).toContain('eusebe')
    expect(cles(missions)).toContain('espace_lecteur')
  })

  it('insère un outil déclaré à son rang, entre deux missions de la base', () => {
    const missions = composerMissions([
      { cle: 'chronologie', titre: 'Chronologie', ordre: 6 },
      { cle: 'eusebe', titre: 'Eusèbe', ordre: 7 },
    ])
    expect(cles(missions)).toEqual(['chronologie', 'facsimile_bible899', 'eusebe'])
    expect(missions.find((mission) => mission.cle === 'facsimile_bible899')?.enBase).toBe(false)
  })

  it('laisse la base l’emporter sur un outil de même clé, puisqu’elle porte alors une note et des tâches', () => {
    const [mission] = composerMissions([{ cle: 'facsimile_bible899', titre: 'Fac-similé', ordre: 3 }])
    expect(mission).toEqual({ cle: 'facsimile_bible899', titre: 'Fac-similé', ordre: 3, enBase: true })
  })

  it('écarte les segments que le centre de contrôle se réserve', () => {
    const missions = composerMissions(
      [...CLES_RESERVEES].map((cle, index) => ({ cle, titre: cle, ordre: index })),
      [],
    )
    expect(missions).toEqual([])
  })

  it('retombe sur la clé sans intitulé, range un rang inconnu en dernier et ignore une clé vide', () => {
    const missions = composerMissions(
      [
        { cle: 'sans_rang', titre: 'Sans rang', ordre: null },
        { cle: 'sans_titre', titre: '  ', ordre: 2 },
        { cle: '  ', titre: 'Clé vide', ordre: 1 },
        { cle: null, titre: 'Clé absente', ordre: 1 },
      ],
      [],
    )
    expect(missions.map(({ cle, titre }) => [cle, titre])).toEqual([
      ['sans_titre', 'sans_titre'],
      ['sans_rang', 'Sans rang'],
    ])
  })

  it('départage deux rangs égaux par l’intitulé, pour que l’ordre ne dépende pas des lignes', () => {
    const a = composerMissions([
      { cle: 'b', titre: 'Bibliographie', ordre: 5 },
      { cle: 'a', titre: 'Alignements', ordre: 5 },
    ], [])
    const b = composerMissions([
      { cle: 'a', titre: 'Alignements', ordre: 5 },
      { cle: 'b', titre: 'Bibliographie', ordre: 5 },
    ], [])
    expect(cles(a)).toEqual(['a', 'b'])
    expect(cles(b)).toEqual(['a', 'b'])
  })

  it('ne déclare aucun outil sous un segment réservé', () => {
    expect(OUTILS_DU_CONTROLE.filter((outil) => CLES_RESERVEES.has(outil.cle))).toEqual([])
  })
})

describe('les adresses', () => {
  it('rangent les missions et l’état du contrôle sous le même centre', () => {
    expect(adresseDeMission('qualite')).toBe('/admin/controle/qualite')
    expect(ADRESSE_SYSTEME).toBe('/admin/controle/systeme')
  })
})

describe('comptesDesTaches', () => {
  it('compte les tâches faites et celles que le journal déclare en cours', () => {
    expect(
      comptesDesTaches([
        { texte: '⏳ En cours — [A0010O0001|notes] reprise des notes', fait: false },
        { texte: 'Relire la préface', fait: false },
        { texte: '⏳ En cours — une tâche cochée ne l’est plus', fait: true },
        { texte: 'Importer le livre II', fait: true },
      ]),
    ).toEqual({ total: 4, faites: 2, enCours: 1 })
  })

  it('rend des zéros sur une liste absente', () => {
    expect(comptesDesTaches(null)).toEqual({ total: 0, faites: 0, enCours: 0 })
  })
})
