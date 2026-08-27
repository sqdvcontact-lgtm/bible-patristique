import { describe, expect, it } from 'vitest'
import { modesLectureAlternatifs, type FaitsLectureBible } from './bibleModesAlternatifs'

// La famille Fillion telle que le catalogue la décrit : le français d'abord
// (colonne de gauche), la Vulgate ensuite.
const FILLION: FaitsLectureBible['membresFamille'] = [
  { tradId: 'TR0010', langue: 'fr', role: 'translation' },
  { tradId: 'TR0011', langue: 'la', role: 'source_text' },
]

const groupes = (faits: FaitsLectureBible) =>
  modesLectureAlternatifs(faits).map(g => [g.cle, g.choix.map(c => c.label)])

const actifs = (faits: FaitsLectureBible) =>
  modesLectureAlternatifs(faits).flatMap(g => g.choix).filter(c => c.actif).map(c => c.cle)

describe('modes de lecture alternatifs de la page Bible', () => {
  it('ne propose rien à une traduction ordinaire', () => {
    expect(modesLectureAlternatifs({})).toEqual([])
    expect(modesLectureAlternatifs({ couchesDisponibles: [], membresFamille: [] })).toEqual([])
  })

  it('ouvre deux axes indépendants pour une édition commentée à deux membres', () => {
    expect(groupes({ membresFamille: FILLION, tradActive: 'TR0010', paratexteDisponible: true }))
      .toEqual([
        ['texte', ['Français', 'Latin-français', 'Latin']],
        ['commentaires', ['Avec les commentaires', 'Sans les commentaires']],
      ])
  })

  it('nomme la lecture en regard par la langue d’ORIGINE, pas par l’ordre des colonnes', () => {
    // Le français est à gauche chez Fillion, et le mode s'appelle pourtant
    // « Latin-français » : c'est le rôle des membres qui commande, si bien qu'une
    // édition grecque se nommera « Grec-français » sans qu'on y touche.
    const grec = [
      { tradId: 'TRxx', langue: 'fr', role: 'translation' },
      { tradId: 'TRyy', langue: 'grc', role: 'source_text' },
    ]
    const libelle = (m: FaitsLectureBible['membresFamille']) =>
      modesLectureAlternatifs({ membresFamille: m })[0].choix[1].label
    expect(libelle(FILLION)).toBe('Latin-français')
    expect(libelle(grec)).toBe('Grec-français')
  })

  it('désigne un seul choix actif par axe', () => {
    const base = { membresFamille: FILLION, paratexteDisponible: true } as const
    expect(actifs({ ...base, tradActive: 'TR0010' }))
      .toEqual(['membre:TR0010', 'avec-commentaires'])
    expect(actifs({ ...base, tradActive: 'TR0011', texteSeulActif: true }))
      .toEqual(['membre:TR0011', 'sans-commentaires'])
    // En regard, aucun membre n'est actif : on ne lit ni l'un ni l'autre seul.
    expect(actifs({ ...base, tradActive: 'TR0010', bilingueActif: true, texteSeulActif: true }))
      .toEqual(['bilingue', 'sans-commentaires'])
  })

  it('porte des surcharges qui laissent l’autre axe tranquille', () => {
    const parCle = new Map(
      modesLectureAlternatifs({ membresFamille: FILLION, tradActive: 'TR0010', paratexteDisponible: true })
        .flatMap(g => g.choix).map(c => [c.cle, c.cible]),
    )
    // Choisir un membre quitte la lecture en regard, et ne dit RIEN des commentaires.
    expect(parCle.get('membre:TR0011')).toEqual({ trad: 'TR0011', bilingue: false })
    expect(parCle.get('bilingue')).toEqual({ bilingue: true })
    // Et réciproquement : régler les commentaires ne dit rien du texte lu.
    expect(parCle.get('sans-commentaires')).toEqual({ texteSeul: true })
    expect(parCle.get('avec-commentaires')).toEqual({ texteSeul: false })
  })

  it('n’offre les commentaires que là où il y en a', () => {
    expect(groupes({ membresFamille: FILLION, tradActive: 'TR0010' }))
      .toEqual([['texte', ['Français', 'Latin-français', 'Latin']]])
  })

  it('n’ouvre pas un menu de graphie pour une seule graphie', () => {
    // Tant que la couche modernisée n'existe pas, un témoin à une seule couche
    // n'a rien à proposer : un menu à une entrée ne serait pas un choix.
    expect(modesLectureAlternatifs({ couchesDisponibles: ['expanded'], coucheActive: 'expanded' })).toEqual([])
  })

  it('ouvre le menu de graphie dès que les données portent deux couches', () => {
    expect(groupes({ couchesDisponibles: ['expanded', 'diplomatic'], coucheActive: 'expanded' }))
      .toEqual([['graphie', ['Développées', 'Diplomatique']]])
  })

  it('accueille la graphie modernisée le jour où elle est publiée, en tête', () => {
    const g = modesLectureAlternatifs({
      couchesDisponibles: ['diplomatic', 'expanded', 'modernized'],
      coucheActive: 'modernized',
    })
    expect(g[0].choix.map(c => c.label))
      .toEqual(['Modernisée', 'Développées', 'Diplomatique'])
    expect(g[0].choix.filter(c => c.actif).map(c => c.cle)).toEqual(['graphie:modernized'])
  })
})
