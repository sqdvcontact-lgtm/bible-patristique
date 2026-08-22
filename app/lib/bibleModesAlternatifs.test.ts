import { describe, expect, it } from 'vitest'
import { modesLectureAlternatifs } from './bibleModesAlternatifs'

const cles = (faits: Parameters<typeof modesLectureAlternatifs>[0]) =>
  modesLectureAlternatifs(faits).map(g => [g.cle, g.choix.map(c => c.cle)])

describe('modes de lecture alternatifs de la page Bible', () => {
  it('ne propose rien à une traduction ordinaire', () => {
    expect(modesLectureAlternatifs({})).toEqual([])
    expect(modesLectureAlternatifs({ couchesDisponibles: [], bilingueDisponible: false })).toEqual([])
  })

  it('n’ouvre pas un menu de graphie pour une seule graphie', () => {
    // Tant que la couche modernisée n'existe pas, la Bible 899 n'a qu'un état de
    // texte : un menu à une entrée ne serait pas un choix.
    expect(modesLectureAlternatifs({ couchesDisponibles: ['expanded'], coucheActive: 'expanded' })).toEqual([])
  })

  it('ouvre le menu de graphie dès que les données portent deux couches', () => {
    expect(cles({ couchesDisponibles: ['expanded', 'diplomatic'], coucheActive: 'expanded' }))
      .toEqual([['graphie', ['graphie:expanded', 'graphie:diplomatic']]])
  })

  it('accueille la graphie modernisée le jour où elle est publiée, en tête', () => {
    const groupes = modesLectureAlternatifs({
      couchesDisponibles: ['diplomatic', 'expanded', 'modernized'],
      coucheActive: 'modernized',
    })
    expect(groupes[0].choix.map(c => c.label))
      .toEqual(['Graphie modernisée', 'Abréviations développées', 'Diplomatique'])
    expect(groupes[0].choix.filter(c => c.actif).map(c => c.cle)).toEqual(['graphie:modernized'])
  })

  it('offre à une édition commentée le texte nu et la lecture en regard', () => {
    expect(cles({ paratexteDisponible: true, bilingueDisponible: true }))
      .toEqual([['presentation', ['texte-commentaires', 'texte-seul', 'bilingue']]])
  })

  it('n’offre pas le texte nu là où il n’y a rien à retirer', () => {
    // Une famille à deux membres sans appareil éditorial : seule la lecture en
    // regard se distingue de la lecture ordinaire, donc pas de menu.
    expect(modesLectureAlternatifs({ paratexteDisponible: false, bilingueDisponible: true })).toEqual([])
  })

  it('désigne un seul choix actif, et le bon', () => {
    const actifs = (faits: Parameters<typeof modesLectureAlternatifs>[0]) =>
      modesLectureAlternatifs(faits).flatMap(g => g.choix).filter(c => c.actif).map(c => c.cle)
    const edition = { paratexteDisponible: true, bilingueDisponible: true }
    expect(actifs(edition)).toEqual(['texte-commentaires'])
    expect(actifs({ ...edition, texteSeulActif: true })).toEqual(['texte-seul'])
    expect(actifs({ ...edition, bilingueActif: true })).toEqual(['bilingue'])
    // La lecture en regard l'emporte : le texte nu ne s'y applique pas.
    expect(actifs({ ...edition, bilingueActif: true, texteSeulActif: true })).toEqual(['bilingue'])
  })

  it('porte dans chaque choix ce qu’il change dans l’adresse, et rien d’autre', () => {
    const parCle = new Map(
      modesLectureAlternatifs({ paratexteDisponible: true, bilingueDisponible: true, couchesDisponibles: ['expanded', 'diplomatic'] })
        .flatMap(g => g.choix).map(c => [c.cle, c.cible]),
    )
    expect(parCle.get('texte-commentaires')).toEqual({})
    expect(parCle.get('texte-seul')).toEqual({ texteSeul: true })
    expect(parCle.get('bilingue')).toEqual({ bilingue: true })
    expect(parCle.get('graphie:diplomatic')).toEqual({ couche: 'diplomatic' })
  })
})
