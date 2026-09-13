import { describe, expect, it } from 'vitest'
import { decomposerEdition, identiteEdition, intituleEdition, labelCourtVersion, libelleTraducteurVersion, libelleVersionComplet } from './versionTextuelle'

// La Doctrine des Apôtres porte trois textes : le grec, le français de Laurent et le latin
// de Funk. Une traduction qui n'est pas française se nomme par sa langue (2026-09-13).
describe('libellé d’une version dans le choix d’édition', () => {
  it('dit la langue d’une traduction qui n’est pas française', () => {
    expect(libelleVersionComplet({ traducteur: 'Franz Xaver Funk', titre: 'Doctrina duodecim apostolorum', anneeEdition: 1887, langue: 'Latin' }))
      .toBe('Traduction latine par Franz Xaver Funk, 1887')
    expect(libelleVersionComplet({ traducteur: 'Auguste Laurent', titre: 'Doctrine des Apôtres', anneeEdition: 1907, langue: 'Français' }))
      .toBe('Traduction par Auguste Laurent, 1907')
    // Sans langue connue, rien n'est supposé.
    expect(libelleVersionComplet({ traducteur: 'Auguste Laurent', titre: 'Doctrine des Apôtres', anneeEdition: 1907 }))
      .toBe('Traduction par Auguste Laurent, 1907')
    // Un texte original n'a pas de traducteur : son titre de version le désigne.
    expect(libelleVersionComplet({ traducteur: null, titre: 'Texte grec', anneeEdition: 1887, langue: 'Grec' }))
      .toBe('Texte grec, 1887')
  })
})

describe('métadonnées du texte actif', () => {
  it('sépare une mention d’édition de la publication sans identifiant spécifique', () => {
    expect(decomposerEdition(
      'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646',
      1646,
    )).toEqual({
      editionDescription: 'Cinquième édition revue par le traducteur',
      publicationLabel: 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, 1646',
      ville: 'Rouen',
      editeur: 'Jean Viret, Jacques Besongne et Clément Malassis',
      annee: '1646',
      responsable: null,
      collection: null,
    })
  })

  // ── L'ÉDITION SAVANTE ────────────────────────────────────────────────────────
  // Le nom du savant ouvre la notice et n'est ni une ville ni une maison. Sans cette
  // règle, le latin des Confessions annonçait « Lieu : Pius Knöll (éd.) ».
  it('⛔ ne prend pas le responsable scientifique pour une ville', () => {
    const knoll = decomposerEdition(
      'Pius Knöll (éd.), CSEL 33, Pragae–Vindobonae–Lipsiae, F. Tempsky–G. Freytag, 1896',
      1896,
    )
    expect(knoll.responsable).toBe('Pius Knöll')
    expect(knoll.collection).toBe('CSEL 33')
    expect(knoll.ville).toBe('Pragae–Vindobonae–Lipsiae')
    expect(knoll.editeur).toBe('F. Tempsky–G. Freytag')
    expect(knoll.annee).toBe('1896')
  })

  it('lit l’adresse d’une notice savante par la FIN : maison, puis lieu, la collection devant', () => {
    const hartel = decomposerEdition(
      'Wilhelm von Hartel (éd.), Corpus Scriptorum Ecclesiasticorum Latinorum 3/1, Vienne, Gerold, 1868',
      1868,
    )
    expect(hartel.responsable).toBe('Wilhelm von Hartel')
    expect(hartel.collection).toBe('Corpus Scriptorum Ecclesiasticorum Latinorum 3/1')
    expect(hartel.ville).toBe('Vienne')
    expect(hartel.editeur).toBe('Gerold')
  })

  it('⛔ une adresse ordinaire à deux morceaux ne se lit pas par la fin', () => {
    // Deux segments : la ville ouvre, la maison suit. Rien à ranger en collection.
    const vives = decomposerEdition('Paris, Louis Vivès, 1873', 1873)
    expect(vives.ville).toBe('Paris')
    expect(vives.editeur).toBe('Louis Vivès')
    expect(vives.collection).toBeNull()
    expect(vives.responsable).toBeNull()
  })

  it('préserve une publication simple', () => {
    const resultat = decomposerEdition('Paris, Librairie de L. Hachette et Cie, 1861', 1861)
    expect(resultat.editionDescription).toBeNull()
    expect(resultat.ville).toBe('Paris')
    expect(resultat.editeur).toBe('Librairie de L. Hachette et Cie')
    expect(resultat.annee).toBe('1861')
  })

  it('reprend la formule du titre de version et compose un libellé court', () => {
    const version = {
      titre: 'Traduction de René de Ceriziers, cinquième édition, 1646',
      traducteur: 'René de Ceriziers',
      anneeEdition: 1646,
    }
    expect(libelleTraducteurVersion(version)).toBe('Traduction de René de Ceriziers')
    expect(labelCourtVersion(version)).toBe('Ceriziers 1646')
  })

  it('⛔ ne découpe pas un patronyme dans une mention de machine', () => {
    // Dhuoda, « Manuel pour mon fils » : la colonne française du texte en regard
    // s’intitulait « Scriptura 2026 », en face de « Bondurand 1887 ».
    expect(labelCourtVersion({
      titre: 'Traduction française IA — publication progressive',
      traducteur: 'Traduction IA — Corpus Scriptura',
      anneeEdition: 2026,
    })).toBe('Traduction IA 2026')
  })
})

// ── L'identité de l'édition qu'on lit ────────────────────────────────────────
describe('identiteEdition', () => {
  const oeuvre = {
    trad_auteur: 'Traduction IA — Corpus Scriptura',
    editeur: 'Alphonse Picard',
    ville: 'Paris',
    date_publication: '1887',
    collection: 'Œuvres complètes',
  }
  const version = {
    traducteur: null as string | null,
    traducteurLabel: null as string | null,
    villeEdition: null as string | null,
    editeurEdition: null as string | null,
    dateEdition: null as string | null,
    collectionEdition: null as string | null,
    responsableEdition: null as string | null,
    isDefault: false,
  }

  it('rend l’œuvre elle-même quand aucune version n’est active', () => {
    expect(identiteEdition(oeuvre, null)).toEqual({
      traducteur: 'Traduction IA — Corpus Scriptura',
      traducteurLabel: null,
      editeur: 'Alphonse Picard',
      ville: 'Paris',
      datePublication: '1887',
      collection: 'Œuvres complètes',
      responsable: null,
    })
  })

  // ── LA COLLECTION ────────────────────────────────────────────────────────────
  // ⛔ Celle de l'ŒUVRE ne décrit que son texte PAR DÉFAUT : servie telle quelle, elle
  // rangeait le latin de Knöll dans les « Œuvres complètes de saint Augustin » de Vivès.
  it('⛔ ne prête pas la collection de l’œuvre à une autre version', () => {
    expect(identiteEdition(oeuvre, version).collection).toBeNull()
    expect(identiteEdition(oeuvre, { ...version, isDefault: true }).collection).toBe('Œuvres complètes')
  })

  it('la collection de la version l’emporte, par défaut ou non', () => {
    const knoll = { ...version, collectionEdition: 'CSEL 33', responsableEdition: 'Pius Knöll' }
    expect(identiteEdition(oeuvre, knoll).collection).toBe('CSEL 33')
    expect(identiteEdition(oeuvre, knoll).responsable).toBe('Pius Knöll')
  })

  it('⛔ n’emprunte pas un traducteur à l’œuvre : le silence d’une version est un fait', () => {
    const latin = { ...version, villeEdition: 'Paris', editeurEdition: 'Alphonse Picard', dateEdition: '1887' }
    expect(identiteEdition(oeuvre, latin).traducteur).toBeNull()
  })

  it('⛔ ne compose pas une adresse de deux éditions', () => {
    // La traduction n’a pas de ville : elle n’en prend pas une à l’édition latine.
    const francais = { ...version, traducteur: 'Traduction IA — Corpus Scriptura', isDefault: true,
      editeurEdition: 'Corpus Scriptura', dateEdition: '2026' }
    expect(identiteEdition(oeuvre, francais)).toEqual({
      traducteur: 'Traduction IA — Corpus Scriptura',
      traducteurLabel: null,
      editeur: 'Corpus Scriptura',
      ville: null,
      datePublication: '2026',
      collection: 'Œuvres complètes',
      responsable: null,
    })
  })

  it('laisse l’œuvre parler pour la version PAR DÉFAUT qui ne porte aucune adresse', () => {
    expect(identiteEdition(oeuvre, { ...version, isDefault: true }).ville).toBe('Paris')
    // Une version qui n’est pas celle que l’œuvre décrit ne lui emprunte rien.
    expect(identiteEdition(oeuvre, version).ville).toBeNull()
  })
})

// ── L'intitulé propre d'une édition ──────────────────────────────────────────
// C'est lui qui distingue à l'œil les deux volets d'une lecture bilingue, dont
// l'en-tête porte le même titre d'œuvre des deux côtés.
describe('intituleEdition', () => {
  it('rend le titre de la version quand il en dit plus que celui de l’œuvre', () => {
    expect(intituleEdition(
      { titre: 'Sancti Aureli Augustini Confessionum libri XIII' },
      'Les Confessions',
    )).toBe('Sancti Aureli Augustini Confessionum libri XIII')
  })

  it('⛔ se tait sur une étiquette de colonne : « Texte latin » n’est pas un intitulé', () => {
    expect(intituleEdition({ titre: 'Texte latin' }, 'La Cité de Dieu')).toBeNull()
    expect(intituleEdition({ titre: 'Texte français' }, 'La Cité de Dieu')).toBeNull()
    // Une désignation qui NOMME l'édition, elle, reste : elle dit qui l'a établie.
    expect(intituleEdition({ titre: 'Texte latin — édition de Joseph Zycha' }, 'Annotations'))
      .toBe('Texte latin — édition de Joseph Zycha')
  })

  it('⛔ ne redit pas le titre de l’œuvre', () => {
    expect(intituleEdition({ titre: 'Les Confessions' }, 'Les Confessions')).toBeNull()
    // `memeIntitule` ignore la casse, l’apostrophe et le point final.
    expect(intituleEdition({ titre: 'les confessions.' }, 'Les Confessions')).toBeNull()
  })

  it('se tait sans version et sans titre', () => {
    expect(intituleEdition(null, 'Les Confessions')).toBeNull()
    expect(intituleEdition({ titre: '   ' }, 'Les Confessions')).toBeNull()
  })
})
