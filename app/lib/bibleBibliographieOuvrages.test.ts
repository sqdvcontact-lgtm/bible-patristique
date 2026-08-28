import { describe, expect, it } from 'vitest'

import {
  auteurPorteParLeTitreDeLaPiece,
  bibliographieDesBlocs,
  grouperBibliographiesParPiece,
  segmentsReference,
  texteReference,
  type LigneBibliographieOuvrage,
  type OuvrageBibliographique,
} from './bibleBibliographieOuvrages'
import {
  BLOCS_DU_MEME_AUTEUR,
  ENTREES_DU_MEME_AUTEUR,
  blocSourceDuRang,
} from './bibleBibliographieOuvrages.fixture'

// ⚠️ L'insécable en ÉCHAPPEMENT : tapée telle quelle, elle ne se distingue pas
// d'une espace ordinaire, et un test qui ne dit pas ce qu'il éprouve ment.
const NBSP = '\u00A0'

function ouvragesDeLaPiece(): OuvrageBibliographique[] {
  const piece = bibliographieDesBlocs(ENTREES_DU_MEME_AUTEUR, BLOCS_DU_MEME_AUTEUR)
  if (!piece) throw new Error('La pièce témoin devrait être reconnue.')
  return piece.ouvrages
}

describe('la pièce et ses entrées', () => {
  it('groupe les quinze ouvrages dans l’ordre de la page imprimée', () => {
    const pieces = grouperBibliographiesParPiece(ENTREES_DU_MEME_AUTEUR)
    expect(pieces).toHaveLength(1)
    expect(pieces[0].pieceKey).toBe('du-meme-auteur')
    expect(pieces[0].ouvrages).toHaveLength(15)
    expect(pieces[0].ouvrages.map((ouvrage) => ouvrage.ordre))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(pieces[0].ouvrages[0].titre).toBe('Introduction générale aux Évangiles')
    expect(pieces[0].ouvrages[14].titre).toBe('Les Saints Évangiles')
  })

  it('range par `display_order`, quel que soit l’ordre reçu', () => {
    const melangees = [...ENTREES_DU_MEME_AUTEUR].reverse()
    const [piece] = grouperBibliographiesParPiece(melangees)
    expect(piece.ouvrages.map((ouvrage) => ouvrage.ordre))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('donne quinze identifiants d’ouvrage DISTINCTS, et c’est l’identité de l’entrée', () => {
    const ids = ouvragesDeLaPiece().map((ouvrage) => ouvrage.id)
    expect(ids).toHaveLength(15)
    expect(new Set(ids).size).toBe(15)
    // ⛔ L'identité n'est jamais le rang du tableau : le premier ouvrage porte
    // 645, non 1.
    expect(ids[0]).toBe(645)
  })

  it('reconnaît la pièce par ses BLOCS, non par son titre translittéré', () => {
    const piece = bibliographieDesBlocs(ENTREES_DU_MEME_AUTEUR, [blocSourceDuRang(7)])
    expect(piece?.pieceKey).toBe('du-meme-auteur')
    // Un seul bloc suffit à désigner la pièce, mais la pièce rend TOUTES ses
    // entrées : une liste tronquée serait pire qu'une liste absente.
    expect(piece?.ouvrages).toHaveLength(15)
  })

  it('ne reconnaît aucune pièce quand aucun bloc ne porte d’entrée', () => {
    expect(bibliographieDesBlocs(ENTREES_DU_MEME_AUTEUR, ['t01-lim-p0001-title-01'])).toBeNull()
    expect(bibliographieDesBlocs([], BLOCS_DU_MEME_AUTEUR)).toBeNull()
  })

  it('ne cite pas deux fois un même ouvrage, et écarte une entrée sans titre', () => {
    const doublon: LigneBibliographieOuvrage = { ...ENTREES_DU_MEME_AUTEUR[0], display_order: 16 }
    const sansTitre: LigneBibliographieOuvrage = {
      ...ENTREES_DU_MEME_AUTEUR[1], display_order: 17, ouvrage_id: 999, titre: '   ',
    }
    const [piece] = grouperBibliographiesParPiece([...ENTREES_DU_MEME_AUTEUR, doublon, sansTitre])
    expect(piece.ouvrages).toHaveLength(15)
  })

  it('sait quelle pièce porte déjà son auteur dans son titre', () => {
    expect(auteurPorteParLeTitreDeLaPiece('du-meme-auteur')).toBe(true)
    expect(auteurPorteParLeTitreDeLaPiece('bibliographie-generale')).toBe(false)
  })
})

describe('la composition d’une référence', () => {
  it('compose la forme attendue à partir des champs séparés', () => {
    const jean = ouvragesDeLaPiece().find((ouvrage) => ouvrage.ordre === 5)!
    expect(texteReference(jean, { avecAuteur: false })).toBe(
      `Évangile selon saint Jean${NBSP}: Introduction critique et commentaires, `
      + 'Paris, P. Lethielleux, 1887.',
    )
  })

  it('sépare le titre du sous-titre, et compose les deux en italique', () => {
    const jean = ouvragesDeLaPiece().find((ouvrage) => ouvrage.ordre === 5)!
    const segments = segmentsReference(jean, { avecAuteur: false })
    const titre = segments.find((segment) => segment.champ === 'titre')
    const sousTitre = segments.find((segment) => segment.champ === 'sous_titre')
    expect(titre?.texte).toBe('Évangile selon saint Jean')
    expect(sousTitre?.texte).toBe('Introduction critique et commentaires')
    // Deux champs, un seul intitulé typographique : le deux-points qui les joint
    // est italique comme eux.
    expect(segments.filter((segment) => segment.composition === 'italique').map((s) => s.texte))
      .toEqual(['Évangile selon saint Jean', `${NBSP}: `, 'Introduction critique et commentaires'])
  })

  it('n’ouvre pas de liaison de sous-titre quand l’ouvrage n’en a pas', () => {
    const idee = ouvragesDeLaPiece().find((ouvrage) => ouvrage.ordre === 13)!
    expect(texteReference(idee, { avecAuteur: false }))
      .toBe('L’Idée centrale de la Bible, Lyon, Delhomme et Briguet, 1888.')
    expect(segmentsReference(idee).some((segment) => segment.champ === 'sous_titre')).toBe(false)
  })

  it('reprend l’éditeur tel que l’autorité le nomme, sans le recoder', () => {
    const ouvrages = ouvragesDeLaPiece()
    expect(ouvrages.map((ouvrage) => ouvrage.editeur)).toContain('Delhomme et Briguet')
    expect(ouvrages.map((ouvrage) => ouvrage.editeur)).toContain('Berche et Tralin')
    // Une forme d'autorité que le code ne connaît pas se compose telle quelle :
    // ⛔ aucun dictionnaire d'éditeurs, aucune expression régulière.
    const invente: OuvrageBibliographique = { ...ouvrages[0], editeur: 'Vve Ch. Poussielgue & Fils' }
    expect(texteReference(invente, { avecAuteur: false })).toContain('Vve Ch. Poussielgue & Fils')
  })

  it('emporte le séparateur d’un champ absent, au lieu de laisser une virgule vide', () => {
    const [premier] = ouvragesDeLaPiece()
    expect(texteReference({ ...premier, lieu: null }, { avecAuteur: false }))
      .toBe('Introduction générale aux Évangiles, P. Lethielleux, 1889.')
    expect(texteReference({ ...premier, annee: null }, { avecAuteur: false }))
      .toBe('Introduction générale aux Évangiles, Paris, P. Lethielleux.')
    expect(texteReference({ ...premier, lieu: null, editeur: null, annee: null }, { avecAuteur: false }))
      .toBe('Introduction générale aux Évangiles.')
  })

  it('ne double pas une ponctuation finale déjà attestée par le titre', () => {
    const [premier] = ouvragesDeLaPiece()
    const abrege = { ...premier, titre: 'Où en est la question biblique ?', lieu: null, editeur: null, annee: null }
    expect(texteReference(abrege, { avecAuteur: false })).toBe('Où en est la question biblique ?')
  })

  it('n’affiche AUCUNE donnée matérielle', () => {
    const compose = ouvragesDeLaPiece().map((ouvrage) => texteReference(ouvrage)).join(' ')
    for (const materiel of [/in-\d/i, /in-8/i, /\bp\.\b/, /\bpl\.\b/, /\bfig\.\b/, /\bplanches?\b/i, /\bpagination\b/i]) {
      expect(compose).not.toMatch(materiel)
    }
  })

  it('ne lit RIEN d’un `reading_text` hérité, même s’il accompagne la ligne', () => {
    const ancien = {
      ...ENTREES_DU_MEME_AUTEUR[4],
      reading_text: 'Évangile selon saint Jean, introduction critique et commentaires. '
        + 'Paris, P. Lethielleux, 1887, in-8° de VIII-500 pages, avec 4 planches.',
    } as LigneBibliographieOuvrage
    const [piece] = grouperBibliographiesParPiece([ancien])
    const compose = texteReference(piece.ouvrages[0], { avecAuteur: false })
    expect(compose).not.toContain('in-8')
    expect(compose).not.toContain('planches')
    expect(compose).toBe(
      `Évangile selon saint Jean${NBSP}: Introduction critique et commentaires, `
      + 'Paris, P. Lethielleux, 1887.',
    )
  })
})

describe('le nom de l’auteur', () => {
  it('ne paraît pas quand l’appelant ne le demande pas', () => {
    const compose = ouvragesDeLaPiece().map((o) => texteReference(o, { avecAuteur: false })).join(' ')
    expect(compose).not.toContain('Fillion')
  })

  it('compose le nom de famille en petites capitales DEPUIS la donnée', () => {
    const [premier] = ouvragesDeLaPiece()
    const segments = segmentsReference(premier, { avecAuteur: true })
    // ⚠️ Chaque fragment porte le nom SÉMANTIQUE de sa fonction, dans le
    // vocabulaire clos de l'apparat : c'est lui que la feuille compose.
    expect(segments[0]).toEqual({
      champ: 'prenom', style: 'bibliographie-auteur', composition: 'romain', texte: 'Louis-Claude',
    })
    expect(segments[2]).toEqual({
      champ: 'nom_famille', style: 'bibliographie-nom-auteur',
      composition: 'petites-capitales', texte: 'Fillion',
    })
    expect(texteReference(premier, { avecAuteur: true }))
      .toBe('Louis-Claude Fillion, Introduction générale aux Évangiles, Paris, P. Lethielleux, 1889.')
  })

  it('compose entière une autorité que le couple prénom/nom ne décrit pas', () => {
    const [premier] = ouvragesDeLaPiece()
    const ancien: OuvrageBibliographique = {
      ...premier,
      auteur: { nom: 'Cyrille de Jérusalem', prenom: null, nomFamille: null },
    }
    const segments = segmentsReference(ancien, { avecAuteur: true })
    expect(segments[0]).toEqual({
      champ: 'nom_famille', style: 'bibliographie-nom-auteur',
      composition: 'petites-capitales', texte: 'Cyrille de Jérusalem',
    })
    // ⛔ Rien n'a été coupé à la première espace : la chaîne entière est le nom.
    expect(segments.some((segment) => segment.champ === 'prenom')).toBe(false)
  })

  it('se tait quand la donnée ne porte aucun auteur', () => {
    const [premier] = ouvragesDeLaPiece()
    expect(texteReference({ ...premier, auteur: null }, { avecAuteur: true }))
      .toBe('Introduction générale aux Évangiles, Paris, P. Lethielleux, 1889.')
  })
})
