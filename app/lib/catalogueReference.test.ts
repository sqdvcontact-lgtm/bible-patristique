import { describe, expect, it, vi } from 'vitest'

import {
  dateSelonReference,
  EXCEPTIONS_REFERENCE_CATALOGUE,
  mentionsEditionCatalogue,
  motifDException,
  noticeDuCatalogueSelonReference,
  ouvrageDeLaLigne,
  ouvragesPartages,
  referencesParNotice,
  SELECTION_REFERENCE_CATALOGUE,
  SELECTION_REFERENCE_LISTE,
  signalerRepliCatalogue,
} from './catalogueReference'
import { noticeDuCatalogue } from './noticeOeuvre'
import { noticeDepuisVue, type LigneVueReference, type NoticeBibliographique } from './referenceBibliographique'

function ligne(partiel: Partial<LigneVueReference> = {}): LigneVueReference {
  return {
    ouvrage_id: 12756,
    forme_notice: null,
    titre: 'Les deux livres de S. Augustin De la prédestination des saints',
    sous_titre: null,
    titre_hote: null,
    tomaison: null,
    pages: null,
    date_affichee: null,
    annee: 1676,
    lieu: 'Paris',
    collection: 'Sources chrétiennes',
    numero_collection: '321',
    auteurs_texte: 'Augustin d’Hippone',
    directeurs_texte: null,
    traducteurs_texte: 'Pierre Périchon ; Pierre Maraval',
    editeur: 'Éditions du Cerf',
    editeurs_lies: [],
    contributeurs: [],
    ...partiel,
  }
}

const reference = (partiel: Partial<LigneVueReference> = {}): NoticeBibliographique => noticeDepuisVue(ligne(partiel))

const annexe = {
  titre_edition: 'Traduction du livre de S. Augustin',
  traducteur: 'Pierre Périchon et Pierre Maraval',
  editeur: 'Cerf',
  annee_edition: 1676,
  date_edition_affichage_courte: '1676',
  date_edition_precision_affichage: 'achevé d’imprimer',
  siecle_edition_affichage: 'XVIIe siècle',
}

describe('referencesParNotice', () => {
  it('range les références par identifiant de NOTICE, et écarte une ligne sans référence', () => {
    const table = referencesParNotice([
      { id: 7, reference: ligne() },
      { id: 8, reference: ligne() },
      { id: 9, reference: null },
    ])
    expect([...table.keys()]).toEqual([7, 8])
    expect(table.get(7)?.id).toBe(12756)
  })
  it('accepte la référence rendue en tableau, comme l’annonce un client sans types', () => {
    const table = referencesParNotice([{ id: 7, reference: [ligne()] }, { id: 8, reference: [] }, { id: 9, reference: 'x' }])
    expect([...table.keys()]).toEqual([7])
  })
})

describe('dateSelonReference', () => {
  it('prend la forme rédigée de l’annexe quand les deux années s’accordent', () => {
    expect(dateSelonReference(reference({ annee: 1952 }), { texte: '1952-1958', annee: 1952 }))
      .toEqual({ texte: '1952-1958', deLAnnexe: true })
  })
  it('l’année de la référence l’emporte quand elles divergent', () => {
    expect(dateSelonReference(reference({ annee: 1844 }), { texte: '1846', annee: 1846 }))
      .toEqual({ texte: '1844', deLAnnexe: false })
  })
  it('une date affichée par la référence passe devant tout', () => {
    expect(dateSelonReference(reference({ date_affichee: '1975' }), { texte: 'vers 1970', annee: 1970 }).texte).toBe('1975')
  })
  it('sans année de référence, l’annexe parle ; sans rien, rien', () => {
    expect(dateSelonReference(reference({ annee: null }), { texte: 'XVIIe siècle', annee: null }).texte).toBe('XVIIe siècle')
    expect(dateSelonReference(reference({ annee: null }), { texte: null, annee: null }).texte).toBeNull()
  })
})

describe('noticeDuCatalogueSelonReference', () => {
  const edition = {
    id: 42, titreStable: 'De la prédestination des saints', traducteur: 'X',
    collection: 'Ancienne collection', lieu: 'Rouen', editeur: 'Ancien éditeur', dateAffichee: '1676', annee: 1676,
  }

  it('garde le TITRE DE L’ŒUVRE (l’annexe) et prend tout le reste à la référence', () => {
    const notice = noticeDuCatalogueSelonReference(edition, reference())
    expect(notice.id).toBe(42)
    expect(notice.titre).toBe('De la prédestination des saints')
    expect(notice.forme).toBe('monographie')
    expect(notice.lieu).toBe('Paris')
    expect(notice.collection).toBe('Sources chrétiennes')
    expect(notice.numeroCollection).toBe('321')
    expect(notice.editeurs.map(e => e.nom)).toEqual(['Éditions du Cerf'])
    expect(notice.traducteursTexte).toBe('Pierre Périchon ; Pierre Maraval')
    expect(notice.dateAffichee).toBe('1676')
  })

  it('sans référence, rend exactement la notice de l’annexe (repli)', () => {
    expect(noticeDuCatalogueSelonReference(edition, null)).toEqual(noticeDuCatalogue(edition))
    expect(noticeDuCatalogueSelonReference(edition, undefined)).toEqual(noticeDuCatalogue(edition))
  })

  it('une réserve d’attribution de la référence ne se compose pas en « trad. »', () => {
    expect(noticeDuCatalogueSelonReference(edition, reference({ traducteurs_texte: 'Traducteur non identifié' })).traducteursTexte)
      .toBeNull()
  })
})

describe('mentionsEditionCatalogue', () => {
  it('lit traducteurs, éditeurs et titre de la référence', () => {
    const m = mentionsEditionCatalogue(annexe, reference())
    expect(m).toMatchObject({
      traducteur: 'Pierre Périchon ; Pierre Maraval',
      editeur: 'Éditions du Cerf',
      date: '1676',
      precisionDate: 'achevé d’imprimer',
      repli: false,
    })
    expect(m.titreEdition).toMatch(/^Les deux livres/)
  })

  it('les éditeurs liés passent devant l’éditeur en texte, dans leur rang, sans diffuseur', () => {
    const m = mentionsEditionCatalogue(annexe, reference({
      editeurs_lies: [
        { nom: 'Brepols', rang: 2, role: 'coediteur' },
        { nom: 'Diffuseur', rang: 3, role: 'diffuseur' },
        { nom: 'Cerf', rang: 1, role: 'editeur' },
      ],
    }))
    expect(m.editeur).toBe('Cerf ; Brepols')
  })

  it('la précision de l’annexe ne suit pas une année qui n’est pas la sienne', () => {
    const m = mentionsEditionCatalogue({ ...annexe, annee_edition: 1680 }, reference({ annee: 1676 }))
    expect(m.date).toBe('1676')
    expect(m.precisionDate).toBeNull()
  })

  it('sans référence, l’annexe parle seule et le repli se dit', () => {
    const m = mentionsEditionCatalogue(annexe, undefined)
    expect(m).toEqual({
      traducteur: annexe.traducteur, editeur: annexe.editeur, date: '1676',
      precisionDate: annexe.date_edition_precision_affichage, titreEdition: annexe.titre_edition, repli: true,
    })
  })

  it('une référence silencieuse fait taire l’annexe : la référence fait foi', () => {
    const m = mentionsEditionCatalogue(annexe, reference({ traducteurs_texte: null, editeur: null }))
    expect(m.traducteur).toBeNull()
    expect(m.editeur).toBeNull()
  })
})

describe('les sélections PostgREST', () => {
  it('joignent la vue du moteur à la notice', () => {
    expect(SELECTION_REFERENCE_CATALOGUE).toMatch(/^id, reference:v_references_bibliographiques\(/)
    expect(SELECTION_REFERENCE_LISTE).toMatch(/^id, reference:v_references_bibliographiques\(ouvrage_id,/)
  })
})

describe('signalerRepliCatalogue', () => {
  it('se tait sans repli, parle à la console sinon', () => {
    const espion = vi.spyOn(console, 'warn').mockImplementation(() => {})
    signalerRepliCatalogue('catalogue', [])
    expect(espion).not.toHaveBeenCalled()
    signalerRepliCatalogue('catalogue', [1, 2])
    expect(espion).toHaveBeenCalledTimes(1)
    espion.mockRestore()
  })
})

describe('la référence partagée (un volume, plusieurs œuvres)', () => {
  it('se reconnaît au compte des notices qui la portent', () => {
    expect([...ouvragesPartages([1, 2, 1, null, 3, 3, 3])].sort()).toEqual([1, 3])
    expect(ouvrageDeLaLigne({ id: 7, reference: [ligne({ ouvrage_id: 12 })] })).toBe(12)
    const table = referencesParNotice([
      { id: 7, reference: ligne({ ouvrage_id: 12 }) },
      { id: 8, reference: ligne({ ouvrage_id: 12 }) },
      { id: 9, reference: ligne({ ouvrage_id: 13 }) },
    ])
    expect(table.get(7)?.partagee).toBe(true)
    expect(table.get(9)?.partagee).toBeUndefined()
  })
  it('se dit du dehors quand la liste chargée ne suffit pas', () => {
    const table = referencesParNotice([{ id: 7, reference: ligne({ ouvrage_id: 12 }) }], { partagees: new Set([12]) })
    expect(table.get(7)?.partagee).toBe(true)
  })
  it('garde le traducteur PROPRE à l’œuvre, celui de l’annexe, et tait ceux du volume', () => {
    const volume = { ...reference({
      contributeurs: [{ role: 'traducteur', ordre: 1, nature: 'chercheur', nom_affiche: 'Michel Corbin' }],
    }), partagee: true }
    expect(mentionsEditionCatalogue({ ...annexe, traducteur: 'Alain Galonnier' }, volume).traducteur).toBe('Alain Galonnier')
    const notice = noticeDuCatalogueSelonReference({ id: 42, titreStable: 'Le Grammairien', traducteur: 'Alain Galonnier' }, volume)
    expect(notice.traducteursTexte).toBe('Alain Galonnier')
    expect(notice.contributeurs.some(c => c.role === 'traducteur')).toBe(false)
    expect('partagee' in notice).toBe(false)
  })
  it('sans traducteur dans l’annexe, le volume parle', () => {
    const volume = { ...reference(), partagee: true }
    expect(mentionsEditionCatalogue({ ...annexe, traducteur: null }, volume).traducteur).toBe('Pierre Périchon ; Pierre Maraval')
  })
})

describe('les traducteurs structurés de la référence', () => {
  it('parlent quand son texte se tait', () => {
    const ref = reference({
      traducteurs_texte: null,
      contributeurs: [
        { role: 'auteur_source', ordre: 1, nature: 'auteur_ancien', nom_affiche: 'Ambroise de Milan' },
        { role: 'traducteur', ordre: 3, nature: 'chercheur', nom_affiche: 'Marius Cordier' },
      ],
    })
    expect(mentionsEditionCatalogue(annexe, ref).traducteur).toBe('Marius Cordier')
    expect(noticeDuCatalogueSelonReference({ id: 1, titreStable: 'X' }, ref).traducteursTexte).toBe('Marius Cordier')
  })
})

describe('les notices d’exception', () => {
  it('forment une liste bornée, sans doublon', () => {
    const ids = Object.values(EXCEPTIONS_REFERENCE_CATALOGUE).flat()
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeLessThan(80)
    expect(motifDException(2355)).toBe('coediteurs_manquants')
    expect(motifDException(1)).toBeNull()
  })
  it('retombent sur leurs propres champs, et leur repli ne se dit pas', () => {
    const table = referencesParNotice([{ id: 2355, reference: ligne() }, { id: 1, reference: ligne() }])
    expect(table.has(2355)).toBe(false)
    expect(table.has(1)).toBe(true)
    expect(referencesParNotice([{ id: 2355, reference: ligne() }], { avecExceptions: true }).has(2355)).toBe(true)
    const espion = vi.spyOn(console, 'warn').mockImplementation(() => {})
    signalerRepliCatalogue('catalogue', [2355])
    expect(espion).not.toHaveBeenCalled()
    espion.mockRestore()
  })
})

describe('la sélection de la liste', () => {
  it('porte les contributeurs, pour les traducteurs structurés', () => {
    expect(SELECTION_REFERENCE_LISTE).toMatch(/contributeurs\)$/)
  })
})
