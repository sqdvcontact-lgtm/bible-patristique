import { describe, expect, it } from 'vitest'
import {
  cheminDeLecture, graphiesDuTemoin, lecturesDisponibles, rangDeLaLecture,
  type FaitsDesBibles,
} from './bibleLecturesDisponibles'
import { entreesDuMenu } from './menuTraductionsBible'

// L'état du corpus au 2026-09-16, tel que la page l'observe : cinq bibles en colonnes
// de la vue large, deux familles au catalogue, et un témoin à deux graphies.
const FAITS: FaitsDesBibles = {
  traductions: [
    { code: 'TR0001', label: 'Bible de Sacy' },
    { code: 'TR0002', label: 'Bible Segond' },
    { code: 'TR0004', label: 'Vulgate clémentine' },
    { code: 'TR0009', label: 'Bible du XIIIe siècle – Ancien français' },
    { code: 'TR0010', label: 'Bible Fillion – Français' },
    { code: 'TR0011', label: 'Bible Fillion – Latin (Vulgate)' },
    { code: 'TR0012', label: 'Traduction officielle liturgique (AELF)' },
    { code: 'TR0013', label: 'Bible du XIIIe siècle – Français moderne' },
  ],
  colonnesVersetsLecture: ['TR0001', 'TR0002', 'TR0004'],
  catalogue: [
    { tradId: 'TR0013', familleId: 'f899', role: 'translation', rang: 1, sourceId: 's899m' },
    { tradId: 'TR0009', familleId: 'f899', role: 'source_text', rang: 2, sourceId: 's899' },
    { tradId: 'TR0010', familleId: 'fillion', role: 'translation', rang: 1, sourceId: 'sfr1' },
    { tradId: 'TR0010', familleId: 'fillion', role: 'translation', rang: 1, sourceId: 'sfr2' },
    { tradId: 'TR0011', familleId: 'fillion', role: 'source_text', rang: 2, sourceId: 'sla1' },
  ],
  lisiblesEditorialement: new Set(['TR0009', 'TR0010', 'TR0011']),
  lisiblesParLeCanon: new Set(['TR0013']),
  couches899: ['diplomatic', 'expanded'],
}

describe('le chemin par lequel une bible se lit', () => {
  it('prend la vue large quand elle y est, sans rien demander de plus', () => {
    expect(cheminDeLecture('TR0001', FAITS)).toBe('canonique')
  })

  // ⛔ Le témoin passe par SA VUE, non par les tables éditoriales dont elle sort :
  // elle seule rend les suppressions du manuscrit comme la page Bible les rend.
  it('lit le témoin 899 par sa vue de recomposition', () => {
    expect(cheminDeLecture('TR0009', FAITS)).toBe('temoin899')
  })

  it('lit une édition segmentée par ses tables', () => {
    expect(cheminDeLecture('TR0010', FAITS)).toBe('editoriale')
    expect(cheminDeLecture('TR0011', FAITS)).toBe('editoriale')
  })

  it('lit par le canon ce que le catalogue annonce sans savoir le segmenter', () => {
    expect(cheminDeLecture('TR0013', FAITS)).toBe('v2')
  })

  // ⛔ Une bible que RIEN ne sait lire ne se propose pas : c'est la règle posée le
  // 15 septembre, quand le menu montrait le nom d'une bible au-dessus du texte d'une
  // autre. L'AELF n'a ni colonne, ni segmentation, ni entrée au catalogue.
  it('ne trouve aucun chemin pour une bible que le volet ne sait pas lire', () => {
    expect(cheminDeLecture('TR0012', FAITS)).toBeNull()
  })
})

describe('les graphies d’un témoin', () => {
  it('ne se proposent qu’à partir de deux : une seule n’est pas un choix', () => {
    expect(graphiesDuTemoin(['expanded'])).toEqual([])
    expect(graphiesDuTemoin([])).toEqual([])
  })

  it('mettent la lecture ordinaire en tête', () => {
    expect(graphiesDuTemoin(['diplomatic', 'expanded'])).toEqual(['expanded', 'diplomatic'])
  })

  // La couche modernisée, le jour où elle paraîtra, devient le défaut (`coucheDefaut899`).
  it('cèdent la tête à la graphie modernisée dès qu’elle existe', () => {
    expect(graphiesDuTemoin(['diplomatic', 'expanded', 'modernized']))
      .toEqual(['modernized', 'expanded', 'diplomatic'])
  })
})

describe('les lectures offertes par le volet', () => {
  const lectures = lecturesDisponibles(FAITS)

  it('écartent ce qu’aucun chemin ne porte', () => {
    expect(lectures.map(l => l.code)).not.toContain('TR0012')
  })

  it('doublent le témoin d’une entrée par graphie, la lecture ordinaire d’abord', () => {
    expect(lectures.filter(l => l.tradId === 'TR0009').map(l => [l.code, l.label, l.couche]))
      .toEqual([
        ['TR0009', 'Bible du XIIIe siècle – Ancien français', 'expanded'],
        ['TR0009:diplomatic', 'Bible du XIIIe siècle – Ancien français, graphie diplomatique', 'diplomatic'],
      ])
  })

  it('rassemblent les sources d’un membre, sans doublon', () => {
    expect(lectures.find(l => l.code === 'TR0010')?.sourceIds).toEqual(['sfr1', 'sfr2'])
    expect(lectures.find(l => l.code === 'TR0001')?.sourceIds).toEqual([])
  })

  // ⛔ Le regroupement reste celui de la page Bible : ce module ne fait que poser les
  // appartenances, `entreesDuMenu` les réunit.
  it('se replient en familles comme sur la page Bible', () => {
    const entrees = entreesDuMenu(lectures)
    expect(entrees.map(e => (e.sorte === 'bible' ? lectures[e.index].code : e.nom)))
      .toEqual(['TR0001', 'TR0002', 'TR0004', 'Bible du XIIIe siècle', 'Bible Fillion'])
  })

  // ⚠️ Les deux graphies d'un même texte se suivent : le rang de famille est multiplié
  // par dix avant qu'on y ajoute celui de la graphie, si bien qu'aucune ne vient
  // s'intercaler entre deux membres.
  it('gardent les graphies d’un même texte côte à côte dans le sous-menu', () => {
    const entrees = entreesDuMenu(lectures)
    const famille = entrees.find(e => e.sorte === 'famille' && e.nom === 'Bible du XIIIe siècle')
    if (famille?.sorte !== 'famille') throw new Error('la famille du témoin est attendue')
    expect(famille.membres.map(m => lectures[m.index].code))
      .toEqual(['TR0009', 'TR0009:diplomatic', 'TR0013'])
    expect(famille.membres.map(m => m.libelle))
      .toEqual(['Ancien français', 'Ancien français, graphie diplomatique', 'Français moderne'])
  })

  it('ouvrent la famille de Fillion sur son texte d’origine', () => {
    const entrees = entreesDuMenu(lectures)
    const famille = entrees.find(e => e.sorte === 'famille' && e.nom === 'Bible Fillion')
    if (famille?.sorte !== 'famille') throw new Error('la famille de Fillion est attendue')
    expect(famille.membres.map(m => lectures[m.index].code)).toEqual(['TR0011', 'TR0010'])
  })
})

describe('la lecture qu’une préférence enregistrée désigne', () => {
  const lectures = lecturesDisponibles(FAITS)

  it('retombe sur la lecture ordinaire d’une traduction, jamais sur une graphie', () => {
    expect(lectures[rangDeLaLecture(lectures, 'TR0009')].code).toBe('TR0009')
  })

  it('reconnaît une lecture nommée en entier', () => {
    expect(lectures[rangDeLaLecture(lectures, 'TR0009:diplomatic')].couche).toBe('diplomatic')
  })

  it('ne désigne rien quand la bible n’est pas offerte', () => {
    expect(rangDeLaLecture(lectures, 'TR0012')).toBe(-1)
    expect(rangDeLaLecture(lectures, null)).toBe(-1)
  })
})
