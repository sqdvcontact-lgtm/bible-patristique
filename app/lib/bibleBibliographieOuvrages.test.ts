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

/**
 * L'ouvrage qui portait ce rang SUR LA PAGE IMPRIMÉE.
 *
 * ⚠️ Depuis que l'ordre d'affichage se calcule, le rang imprimé et le rang dans
 * le tableau ne coïncident plus : un test qui écrit `ouvrages[0]` ne dit plus
 * de quel ouvrage il parle.
 */
function ouvrageDuRang(ordre: number): OuvrageBibliographique {
  const trouve = ouvragesDeLaPiece().find((ouvrage) => ouvrage.ordre === ordre)
  if (!trouve) throw new Error(`Aucun ouvrage au rang imprimé ${ordre}.`)
  return trouve
}

describe('la pièce et ses entrées', () => {
  it('range les quinze ouvrages par AUTEUR puis par titre, non par la page imprimée', () => {
    const pieces = grouperBibliographiesParPiece(ENTREES_DU_MEME_AUTEUR)
    expect(pieces).toHaveLength(1)
    expect(pieces[0].pieceKey).toBe('du-meme-auteur')
    expect(pieces[0].ouvrages).toHaveLength(15)
    // Un seul auteur ici : c'est donc le titre qui range, article initial ôté
    // et accent replié — « L'Idée » sous I, « Les Saints Évangiles » sous S.
    expect(pieces[0].ouvrages.map((ouvrage) => ouvrage.titre)).toEqual([
      'Atlas archéologique de la Bible',
      'Atlas d’histoire naturelle de la Bible',
      'Atlas géographique de la Bible',
      'Biblia sacra juxta Vulgatæ exemplaria et correctoria romana denuo edita',
      'Essais d’exégèse',
      'Évangile selon saint Jean',
      'Évangile selon saint Luc',
      'Évangile selon saint Marc',
      'Évangile selon saint Matthieu',
      'L’Idée centrale de la Bible',
      'Introduction générale aux Évangiles',
      'Novum Testamentum juxta Vulgatæ exemplaria et correctoria romana denuo editum',
      'Les Psaumes commentés d’après la Vulgate et l’hébreu',
      'Les Saints Évangiles',
      'Synopsis evangelica seu quatuor sancta Jesu Christi evangelia',
    ])
    // ⛔ Ce n'est PAS l'ordre de la page imprimée, qui demeure dans la donnée.
    expect(pieces[0].ouvrages.map((ouvrage) => ouvrage.ordre)).toEqual([8, 9, 10, 11, 7, 5, 4, 3, 2, 13, 1, 12, 14, 15, 6])
  })

  it('donne le MÊME ordre quel que soit l’ordre reçu', () => {
    const attendu = grouperBibliographiesParPiece(ENTREES_DU_MEME_AUTEUR)[0]
      .ouvrages.map((ouvrage) => ouvrage.id)
    const melangees = [...ENTREES_DU_MEME_AUTEUR].reverse()
    expect(grouperBibliographiesParPiece(melangees)[0].ouvrages.map((ouvrage) => ouvrage.id))
      .toEqual(attendu)
  })

  it('donne quinze identifiants d’ouvrage DISTINCTS, et c’est l’identité de l’entrée', () => {
    const ids = ouvragesDeLaPiece().map((ouvrage) => ouvrage.id)
    expect(ids).toHaveLength(15)
    expect(new Set(ids).size).toBe(15)
    // ⛔ L'identité n'est jamais le rang du tableau : la première ligne porte
    // 649, ni 1 (son rang) ni 8 (son rang sur la page imprimée).
    expect(ids[0]).toBe(649)
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
      'Évangile selon saint Jean. Introduction critique et commentaires, '
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
    // Deux champs, un seul intitulé typographique : le POINT qui les joint est
    // italique comme eux. ⚠️ Décision de l'auteur du 28 août 2026 : un
    // sous-titre se détache par un point, ⛔ ni par un deux-points (prescrit
    // le matin même) ni par une virgule (prescrite jusque-là).
    expect(segments.filter((segment) => segment.composition === 'italique').map((s) => s.texte))
      .toEqual(['Évangile selon saint Jean', '. ', 'Introduction critique et commentaires'])
    // ⛔ Et plus d'insécable : elle ne précédait que le deux-points.
    expect(texteReference(jean)).not.toContain(NBSP)
  })

  it('ne double pas le point de liaison sur un titre déjà ponctué', () => {
    // ⚠️ Le point qui détache le sous-titre ne s'ajoute pas à celui que le titre
    // porte : « … biblique ?. Réponse » serait une faute que la donnée ne
    // demande pas. La ponctuation attestée du titre détache à elle seule.
    const jean = ouvrageDuRang(5)
    const interrogatif = {
      ...jean,
      titre: 'Où en est la question biblique ?',
      sousTitre: 'Réponse à quelques objections',
      lieu: null, editeur: null, annee: null,
    }
    expect(texteReference(interrogatif, { avecAuteur: false }))
      .toBe('Où en est la question biblique ? Réponse à quelques objections.')
    // Et le sous-titre reste DANS la séquence italique, comme partout ailleurs.
    expect(segmentsReference(interrogatif).filter((s) => s.composition === 'italique').map((s) => s.texte))
      .toEqual(['Où en est la question biblique ?', ' ', 'Réponse à quelques objections'])
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
    const invente: OuvrageBibliographique = { ...ouvrageDuRang(1), editeur: 'Vve Ch. Poussielgue & Fils' }
    expect(texteReference(invente, { avecAuteur: false })).toContain('Vve Ch. Poussielgue & Fils')
  })

  it('emporte le séparateur d’un champ absent, au lieu de laisser une virgule vide', () => {
    const premier = ouvrageDuRang(1)
    expect(texteReference({ ...premier, lieu: null }, { avecAuteur: false }))
      .toBe('Introduction générale aux Évangiles, P. Lethielleux, 1889.')
    expect(texteReference({ ...premier, annee: null }, { avecAuteur: false }))
      .toBe('Introduction générale aux Évangiles, Paris, P. Lethielleux.')
    expect(texteReference({ ...premier, lieu: null, editeur: null, annee: null }, { avecAuteur: false }))
      .toBe('Introduction générale aux Évangiles.')
  })

  it('ne double pas une ponctuation finale déjà attestée par le titre', () => {
    const premier = ouvrageDuRang(1)
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
      'Évangile selon saint Jean. Introduction critique et commentaires, '
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
    const premier = ouvrageDuRang(1)
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
    const premier = ouvrageDuRang(1)
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
    const premier = ouvrageDuRang(1)
    expect(texteReference({ ...premier, auteur: null }, { avecAuteur: true }))
      .toBe('Introduction générale aux Évangiles, Paris, P. Lethielleux, 1889.')
  })
})

describe('l’ordre d’une bibliographie', () => {
  const NOTICE = ENTREES_DU_MEME_AUTEUR[0]
  /** Une liste faite de titres et d'auteurs nommés, sans autre différence. */
  const listeDe = (
    entrees: { titre: string; auteur?: [string, string | null] | null; ordre?: number }[],
  ): string[] => {
    const lignes: LigneBibliographieOuvrage[] = entrees.map((entree, rang) => ({
      ...NOTICE,
      piece_key: 'bibliographie',
      display_order: entree.ordre ?? rang + 1,
      ouvrage_id: 1000 + rang,
      titre: entree.titre,
      sous_titre: null,
      auteur_nom: entree.auteur ? [entree.auteur[1], entree.auteur[0]].filter(Boolean).join(' ') : null,
      auteur_prenom: entree.auteur ? entree.auteur[1] : null,
      auteur_nom_famille: entree.auteur ? entree.auteur[0] : null,
    }))
    return grouperBibliographiesParPiece(lignes)[0].ouvrages.map((ouvrage) => ouvrage.titre)
  }

  it('range d’abord par NOM D’AUTEUR, le titre ne départageant qu’ensuite', () => {
    expect(listeDe([
      { titre: 'Zacharie', auteur: ['Arnoldi', 'Matthias'] },
      { titre: 'Abdias', auteur: ['Van Steenkiste', 'Jean-Aloïs'] },
      { titre: 'Baruch', auteur: ['Arnoldi', 'Matthias'] },
    ])).toEqual(['Baruch', 'Zacharie', 'Abdias'])
  })

  it('départage deux homonymes par leur prénom', () => {
    expect(listeDe([
      { titre: 'Un', auteur: ['Fillion', 'Louis-Claude'] },
      { titre: 'Deux', auteur: ['Fillion', 'Amédée'] },
    ])).toEqual(['Deux', 'Un'])
  })

  it('n’entend pas l’article ni le déterminant initial', () => {
    // ⛔ Sans la règle, « Les Psaumes » se rangerait à L et « L'Idée » aussi :
    // toute la bibliographie française s'entasserait sous deux lettres.
    expect(listeDe([
      { titre: 'Les Psaumes' },
      { titre: 'L’Idée centrale' },
      { titre: 'Une histoire' },
      { titre: 'Baruch' },
      { titre: 'Ces jours-là' },
      { titre: 'Notre père' },
    ])).toEqual([
      'Baruch', 'Une histoire', 'L’Idée centrale', 'Ces jours-là', 'Notre père', 'Les Psaumes',
    ])
  })

  it('ne retire un article que s’il RESTE quelque chose', () => {
    // Un titre qui n'est que son article se range sous lui : sa clé serait
    // vide, et il remonterait en tête de la liste sans raison.
    expect(listeDe([{ titre: 'Zacharie' }, { titre: 'Les' }, { titre: 'Abdias' }]))
      .toEqual(['Abdias', 'Les', 'Zacharie'])
  })

  it('⛔ ne range pas un mot LATIN comme un article', () => {
    // `a` est l'article anglais, mais la préposition latine ; `de` et `in` sont
    // des prépositions dans les deux langues. Le latin n'a pas d'article, et il
    // est ici partout : ces titres se rangent à leur premier mot.
    expect(listeDe([
      { titre: 'Zacharie' },
      { titre: 'A solis ortus cardine' },
      { titre: 'De civitate Dei' },
      { titre: 'In Psalmos' },
    ])).toEqual(['A solis ortus cardine', 'De civitate Dei', 'In Psalmos', 'Zacharie'])
  })

  it('replie l’accent, la casse et l’apostrophe', () => {
    expect(listeDe([
      { titre: 'Évangile selon saint Jean' },
      { titre: 'Essais d’exégèse' },
      { titre: 'Atlas d’histoire naturelle' },
      { titre: 'Atlas géographique' },
    ])).toEqual([
      'Atlas d’histoire naturelle', 'Atlas géographique', 'Essais d’exégèse', 'Évangile selon saint Jean',
    ])
  })

  it('range une œuvre ANONYME à son titre, dans la même suite', () => {
    // ⛔ Pas de bloc à part en tête ni en queue : une œuvre sans auteur se file
    // à son titre, comme un catalogue le fait.
    expect(listeDe([
      { titre: 'Zacharie', auteur: ['Arnoldi', 'Matthias'] },
      { titre: 'Bible de Jérusalem', auteur: null },
      { titre: 'Abdias', auteur: ['Cyrille', null] },
    ])).toEqual(['Zacharie', 'Bible de Jérusalem', 'Abdias'])
  })

  it('⛔ n’ampute jamais le titre AFFICHÉ de son article', () => {
    const [piece] = grouperBibliographiesParPiece(ENTREES_DU_MEME_AUTEUR)
    const compose = piece.ouvrages.map((ouvrage) => texteReference(ouvrage, { avecAuteur: false }))
    expect(compose.some((ligne) => ligne.startsWith('L’Idée centrale de la Bible'))).toBe(true)
    expect(compose.some((ligne) => ligne.startsWith('Les Saints Évangiles'))).toBe(true)
  })

  it('garde le rang IMPRIMÉ comme dernier recours', () => {
    // Deux notices que rien ne départage gardent l'ordre du témoin.
    expect(listeDe([
      { titre: 'Baruch', ordre: 9 },
      { titre: 'Baruch', ordre: 4 },
    ]).length).toBe(2)
    const lignes: LigneBibliographieOuvrage[] = [9, 4].map((ordre, rang) => ({
      ...NOTICE, piece_key: 'p', display_order: ordre, ouvrage_id: 2000 + rang,
      titre: 'Baruch', sous_titre: null,
    }))
    expect(grouperBibliographiesParPiece(lignes)[0].ouvrages.map((o) => o.ordre)).toEqual([4, 9])
  })
})
