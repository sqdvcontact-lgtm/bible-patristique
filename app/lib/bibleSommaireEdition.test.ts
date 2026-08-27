import { describe, expect, it } from 'vitest'
import {
  estPieceGenerale,
  grouperPiecesLiminaires,
  intituleDansPiece,
  nomDePiece,
  pieceParCle,
  type BlocSommaire,
} from './bibleSommaireEdition'

/** Les liminaires réels du tome I de Fillion, dans leur ordre matériel. */
function bloc(
  blockKey: string,
  heading: string | null,
  scopeKind: string,
  materialOrder: number,
  nature = 'notice',
  pageImprimee: string | null = null,
  scopeLabel: string | null = 'Bible',
): BlocSommaire {
  return { id: blockKey, blockKey, heading, scopeKind, scopeLabel, nature, pageImprimee, materialOrder }
}

describe('sommaire d’une édition biblique commentée', () => {
  it('ne retient que ce qui dépasse le livre', () => {
    expect(estPieceGenerale('bible')).toBe(true)
    expect(estPieceGenerale('testament')).toBe(true)
    expect(estPieceGenerale('book_group')).toBe(true)
    // ⛔ L'introduction d'un LIVRE ouvre son livre : elle s'y lit, pas au sommaire.
    expect(estPieceGenerale('book')).toBe(false)
    expect(estPieceGenerale('pericope')).toBe(false)
    expect(estPieceGenerale('chapter')).toBe(false)
  })

  it('nomme la pièce sans sa pagination', () => {
    expect(nomDePiece('Avant-propos — page X')).toBe('Avant-propos')
    expect(nomDePiece('Du même auteur — notice 12')).toBe('Du même auteur')
    expect(nomDePiece('Dédicace à F.-M. Vigouroux — page VI')).toBe('Dédicace à F.-M. Vigouroux')
    expect(nomDePiece('Page de titre')).toBe('Page de titre')
    expect(nomDePiece(null)).toBeNull()
    // Un tiret collé appartient au mot.
    expect(nomDePiece('Jésus-Christ, centre de la Bible')).toBe('Jésus-Christ, centre de la Bible')
  })

  it('réunit les quinze notices « Du même auteur » en UNE pièce', () => {
    const blocs = Array.from({ length: 15 }, (_, i) => bloc(
      `t01-lim-p0002-bibliography-${i + 1}`, `Du même auteur — notice ${i + 1}`, 'bible', 1020 + i * 10,
    ))
    const pieces = grouperPiecesLiminaires(blocs)
    expect(pieces).toHaveLength(1)
    expect(pieces[0].titre).toBe('Du même auteur')
    expect(pieces[0].blocs).toHaveLength(15)
    expect(pieces[0].cle).toBe('t01-lim-p0002-bibliography-1')
  })

  it('rattache l’apparat de bas de page à la page qu’il annote', () => {
    // ⛔ Trente-trois « Apparat de la page N » pour dix pages d'introduction
    // générale : sans cette règle, le sommaire en compterait autant d'entrées.
    const pieces = grouperPiecesLiminaires([
      bloc('p11-intro', 'Introduction générale — § I. Ce qu’est la Bible', 'bible', 1270, 'introduction', '1'),
      bloc('p11-app', 'Apparat de la page 1', 'bible', 1280, 'notice', '1'),
      bloc('p12-intro', 'Introduction générale — § II. Jésus-Christ, centre de la Bible', 'bible', 1290, 'introduction', '2'),
      bloc('p12-app', 'Apparat de la page 2', 'bible', 1300, 'notice', '2'),
    ])
    expect(pieces).toHaveLength(1)
    expect(pieces[0].titre).toBe('Introduction générale')
    expect(pieces[0].blocs.map((b) => b.blockKey)).toEqual(['p11-intro', 'p11-app', 'p12-intro', 'p12-app'])
  })

  it('garde DEUX pièces pour deux imprimatur que tout sépare', () => {
    // Même nom, mais seize ans et tout l'avant-propos entre eux.
    const pieces = grouperPiecesLiminaires([
      bloc('p3', 'Imprimatur — Lyon, 20 février 1888', 'bible', 1170),
      bloc('p7', 'Avant-propos — page IX', 'bible', 1210, 'introduction'),
      bloc('p10', 'Imprimatur — Paris, 1er mars 1904', 'bible', 1240),
    ])
    expect(pieces.map((p) => p.titre)).toEqual(['Imprimatur', 'Avant-propos', 'Imprimatur'])
    expect(pieces[0].cle).not.toBe(pieces[2].cle)
  })

  it('ne fond pas deux portées, même sous le même nom', () => {
    const pieces = grouperPiecesLiminaires([
      bloc('t-01', 'Ancien Testament — I. Son rapport avec le Nouveau', 'testament', 1470, 'introduction', '11', 'Ancien Testament'),
      bloc('t-01-app', 'Apparat de la page 11', 'testament', 1480, 'notice', '11', 'Ancien Testament'),
      bloc('g-01', 'Le Pentateuque — noms et division', 'book_group', 1550, 'introduction', '15', 'Pentateuque'),
    ])
    expect(pieces.map((p) => [p.titre, p.portee])).toEqual([
      ['Ancien Testament', 'Ancien Testament'],
      ['Le Pentateuque', 'Pentateuque'],
    ])
  })

  it('écarte ce qui appartient à un livre, à un chapitre ou à une péricope', () => {
    const pieces = grouperPiecesLiminaires([
      bloc('mat-intro', 'Évangile selon saint Matthieu — Introduction', 'book', 10010, 'introduction', null, null),
      bloc('titre', 'Page de titre', 'bible', 1010),
      bloc('peri', '14. Fureur des pharisiens', 'pericope', 20000, 'commentary', null, null),
    ])
    expect(pieces.map((p) => p.titre)).toEqual(['Page de titre'])
  })

  it('range les pièces dans l’ordre matériel, quel que soit celui de la requête', () => {
    const pieces = grouperPiecesLiminaires([
      bloc('b', 'Principales abréviations', 'bible', 1260),
      bloc('a', 'Page de titre', 'bible', 1010),
    ])
    expect(pieces.map((p) => p.titre)).toEqual(['Page de titre', 'Principales abréviations'])
  })

  it('n’écrit pas trois fois le nom d’une pièce qui tient sur trois pages', () => {
    // La pagination de l'imprimé ne dit rien au lecteur : le titre de la pièce
    // est déjà au-dessus, et les trois pages ne font qu'un texte.
    expect(intituleDansPiece('Avant-propos — page IX', 'Avant-propos')).toBeNull()
    expect(intituleDansPiece('Du même auteur — notice 12', 'Du même auteur')).toBeNull()
    expect(intituleDansPiece('Dédicace à F.-M. Vigouroux — page VI', 'Dédicace à F.-M. Vigouroux')).toBeNull()
    // ⚠️ Une queue qui TITRE reste : elle porte la matière, non la pagination.
    expect(intituleDansPiece('Introduction générale — § I. Ce qu’est la Bible', 'Introduction générale'))
      .toBe('§ I. Ce qu’est la Bible')
    // Un intitulé qui ne redit pas le nom de la pièce n'est pas touché.
    expect(intituleDansPiece('Apparat de la page 1', 'Introduction générale')).toBe('Apparat de la page 1')
    // ⚠️ Et un bloc unique, dont l'intitulé EST le nom de la pièce, ne l'écrit pas
    // deux fois de suite.
    expect(intituleDansPiece('Page de titre', 'Page de titre')).toBeNull()
    expect(intituleDansPiece(null, 'Avant-propos')).toBeNull()
  })

  it('retrouve une pièce par sa clé, et rien sur une clé inconnue', () => {
    const pieces = grouperPiecesLiminaires([bloc('a', 'Page de titre', 'bible', 1010)])
    expect(pieceParCle(pieces, 'a')?.titre).toBe('Page de titre')
    expect(pieceParCle(pieces, 'zzz')).toBeNull()
    expect(pieceParCle(pieces, null)).toBeNull()
  })
})
