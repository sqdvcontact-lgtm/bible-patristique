import { describe, expect, it } from 'vitest'
import {
  assemblerBibliographie,
  compterAxe,
  correspond,
  estMontrable,
  FILTRES_VIDES,
  filtrerBibliographie,
  filtresActifs,
  grouperParLettre,
  indexerRecherche,
  lettreDeVedette,
  libelleCitations,
  libelleCompte,
  libelleGenre,
  libelleLangueCode,
  ouvragePourLeTri,
  siecleDeParution,
  tableDesNoms,
  texteDeRecherche,
  type EntreeIndexee,
  type LigneOuvrage,
} from './bibliographieCatalogue'
import type { NoticeBibliographique } from './referenceBibliographique'

// L'outil bibliographique range, filtre et cherche dans les ouvrages que la charte
// permet de montrer. Ces tests figent trois choses : ce qui PARAÎT (§ 29.1), l'ORDRE
// (§ 35.6.3, par le comparateur commun) et ce qu'une recherche TROUVE.

const notice = (o: Partial<NoticeBibliographique> & { id: number; titre: string }): NoticeBibliographique => ({
  forme: null, sousTitre: null, titreHote: null, tomaison: null, pages: null, dateAffichee: null,
  annee: null, lieu: null, editeurs: [], collection: null, numeroCollection: null, contributeurs: [],
  auteursTexte: null, directeursTexte: null, traducteursTexte: null, ...o,
})

const chercheur = (nomAffiche: string, prenom: string, nomFamille: string, ordre = 1) => ({
  role: 'auteur_scientifique' as const, nature: 'chercheur' as const, ordre,
  nomAffiche, prenom, nomFamille, nomAutorite: nomAffiche,
})

const GREEN = notice({
  id: 8, titre: 'The Gospel of Luke', annee: 1997, lieu: 'Grand Rapids',
  editeurs: [{ rang: 1, role: 'editeur', nom: 'Eerdmans' }],
  collection: 'New International Commentary on the New Testament',
  contributeurs: [chercheur('Joel B. Green', 'Joel B.', 'Green')],
})
const ORIGENE = notice({
  id: 37, titre: 'Homélies sur la Genèse', annee: 2003, lieu: 'Paris',
  editeurs: [{ rang: 1, role: 'editeur', nom: 'Éditions du Cerf' }],
  collection: 'Sources chrétiennes',
  contributeurs: [
    { role: 'auteur_source', nature: 'auteur_ancien', ordre: 1, nomAffiche: 'Origène', nomAutorite: 'Origène' },
    { role: 'traducteur', nature: 'chercheur', ordre: 2, nomAffiche: 'Louis Doutreleau', prenom: 'Louis', nomFamille: 'Doutreleau', nomAutorite: 'Louis Doutreleau' },
  ],
})
const DIDACHE = notice({ id: 503, titre: 'La Doctrine des douze apôtres (Didachè)', annee: 1978, auteursTexte: 'Didachè' })
const ANONYME = notice({ id: 900, titre: 'Les Saints Évangiles', annee: 1890 })
const DEVILLERS = notice({
  id: 374, titre: 'La Fête de l’Envoyé', annee: 2002,
  contributeurs: [chercheur('Luc Devillers', 'Luc', 'Devillers')],
})

const OUVRAGES: LigneOuvrage[] = [
  { id: 8, type_ouvrage: 'commentaire_critique', statut_scientifique: 'retenu', langue_normalisee: 'en', annee: 1997 },
  { id: 37, type_ouvrage: 'edition_critique', statut_scientifique: 'retenu', langue_normalisee: 'fr', annee: 2003 },
  { id: 503, type_ouvrage: 'edition_critique', statut_scientifique: 'secondaire', langue_normalisee: 'fr', annee: 1978 },
  { id: 900, type_ouvrage: 'source_primaire', statut_scientifique: 'a_verifier', langue_normalisee: 'fr', annee: 1890 },
  { id: 374, type_ouvrage: 'monographie', statut_scientifique: 'retenu', langue_normalisee: 'fr', annee: 2002 },
  { id: 999, type_ouvrage: 'monographie', statut_scientifique: 'exclu', langue_normalisee: 'fr', annee: 2010 },
]
const NOTICES = new Map([GREEN, ORIGENE, DIDACHE, ANONYME, DEVILLERS].map(n => [n.id, n]))
const LIENS = [
  { ouvrage_id: 8, pericope_id: 'p-semeur', rubrique: 'exegese' },
  { ouvrage_id: 8, pericope_id: 'p-beatitudes', rubrique: 'exegese' },
  { ouvrage_id: 8, pericope_id: 'p-beatitudes', rubrique: 'theologie' },
  { ouvrage_id: 37, pericope_id: 'p-creation', rubrique: 'tradition' },
  { ouvrage_id: 37, pericope_id: 'p-inconnue', rubrique: 'tradition' },
]
const PERICOPES = [
  { id: 'p-semeur', nom: 'Le semeur' },
  { id: 'p-beatitudes', nom: 'Béatitudes' },
  { id: 'p-creation', nom: 'La création' },
]

// Le serveur assemble, le client indexe : les tests passent par les deux, comme la page.
const ENTREES = indexerRecherche(assemblerBibliographie(OUVRAGES, NOTICES, LIENS, PERICOPES))
const parId = (id: number): EntreeIndexee => {
  const e = ENTREES.find(x => x.id === id)
  if (!e) throw new Error(`entrée ${id} absente`)
  return e
}

describe('ce qui paraît', () => {
  it('ne montre que retenu et secondaire', () => {
    expect(estMontrable('retenu')).toBe(true)
    expect(estMontrable('secondaire')).toBe(true)
    expect(estMontrable('a_verifier')).toBe(false)
    expect(estMontrable('exclu')).toBe(false)
    expect(estMontrable(null)).toBe(false)
    expect(ENTREES.map(e => e.id).sort((a, b) => a - b)).toEqual([8, 37, 374, 503])
  })

  it('écarte un ouvrage dont la vue n’a pas rendu la notice', () => {
    const sansNotice = assemblerBibliographie(
      [{ id: 8, type_ouvrage: 'monographie', statut_scientifique: 'retenu', langue_normalisee: 'fr', annee: 2000 }],
      new Map(), [], [],
    )
    expect(sansNotice).toEqual([])
  })

  it('ne lie que vers des péricopes qu’il sait nommer, sans doublon, par nom', () => {
    expect(parId(8).pericopes).toEqual(['p-beatitudes', 'p-semeur'])
    expect(parId(37).pericopes).toEqual(['p-creation'])
    expect(parId(374).pericopes).toEqual([])
  })

  it('ne fait voyager que les noms des péricopes citées', () => {
    const noms = tableDesNoms([...PERICOPES, { id: 'p-jamais', nom: 'Jamais citée' }], ENTREES)
    expect(noms).toEqual({ 'p-semeur': 'Le semeur', 'p-beatitudes': 'Béatitudes', 'p-creation': 'La création' })
  })

  it('retient les rubriques sous lesquelles l’ouvrage est cité', () => {
    expect(parId(8).rubriques).toEqual(['exegese', 'theologie'])
    expect(parId(37).rubriques).toEqual(['tradition'])
  })
})

describe('l’ordre et la lettre', () => {
  it('range par vedette, puis par titre sans article', () => {
    // Devillers, Didachè, Green, Origène : la vedette est le nom de famille de l'auteur
    // moderne, le nom entier de l'ancien, le texte libre à défaut.
    expect(ENTREES.map(e => e.id)).toEqual([374, 503, 8, 37])
  })

  it('donne la lettre de la vedette, et le titre pour une œuvre anonyme', () => {
    expect(lettreDeVedette(GREEN)).toBe('G')
    expect(lettreDeVedette(ORIGENE)).toBe('O')
    expect(lettreDeVedette(DIDACHE)).toBe('D')
    // « Les Saints Évangiles » se range à S : l'article ne compte pas.
    expect(lettreDeVedette(ANONYME)).toBe('S')
    expect(lettreDeVedette(notice({ id: 1, titre: '1 Corinthiens' }))).toBe('#')
  })

  it('prend pour vedette le PREMIER auteur, par ordre', () => {
    const deux = notice({ id: 5, titre: 'Daniel', contributeurs: [chercheur('Adela Yarbro Collins', 'Adela', 'Yarbro Collins', 2), chercheur('John J. Collins', 'John J.', 'Collins', 1)] })
    expect(ouvragePourLeTri(deux).auteur?.nomFamille).toBe('Collins')
  })

  it('groupe les entrées par lettre dans l’ordre du tri', () => {
    expect(grouperParLettre(ENTREES).map(g => [g.lettre, g.entrees.length])).toEqual([['D', 2], ['G', 1], ['O', 1]])
  })
})

describe('la recherche', () => {
  it('trouve par nom, par titre, par collection, par maison, par année, dans n’importe quel ordre', () => {
    const green = parId(8)
    for (const q of ['green', 'GREEN luke', 'gospel', 'eerdmans', '1997', 'international commentary', 'luke green']) {
      expect(correspond(green, q), q).toBe(true)
    }
    expect(correspond(green, 'origene')).toBe(false)
  })

  it('ignore les accents, la casse et l’apostrophe', () => {
    expect(correspond(parId(37), 'genese')).toBe(true)
    expect(correspond(parId(37), 'ORIGÈNE')).toBe(true)
    expect(correspond(parId(374), "l'envoye")).toBe(true)
    expect(correspond(parId(374), 'envoyé')).toBe(true)
  })

  it('trouve un traducteur et la référence composée', () => {
    expect(correspond(parId(37), 'doutreleau')).toBe(true)
    expect(texteDeRecherche(ORIGENE)).toContain('trad')
  })
})

describe('les filtres', () => {
  it('ne filtrent rien au repos', () => {
    expect(filtresActifs(FILTRES_VIDES)).toBe(false)
    expect(filtrerBibliographie(ENTREES, FILTRES_VIDES)).toHaveLength(4)
  })

  it('croisent les axes, et un axe retient l’UNE de ses valeurs', () => {
    const f = { ...FILTRES_VIDES, genres: new Set(['edition_critique']), langues: new Set(['fr']) }
    expect(filtrerBibliographie(ENTREES, f).map(e => e.id)).toEqual([503, 37])
    const g = { ...FILTRES_VIDES, genres: new Set(['edition_critique', 'commentaire_critique']) }
    expect(filtrerBibliographie(ENTREES, g).map(e => e.id)).toEqual([503, 8, 37])
  })

  it('filtrent par siècle de parution et par rubrique', () => {
    expect(siecleDeParution(1997)).toBe(20)
    expect(siecleDeParution(2003)).toBe(21)
    expect(siecleDeParution(1900)).toBe(19)
    expect(siecleDeParution(null)).toBeNull()
    expect(filtrerBibliographie(ENTREES, { ...FILTRES_VIDES, siecles: new Set([21]) }).map(e => e.id)).toEqual([374, 37])
    expect(filtrerBibliographie(ENTREES, { ...FILTRES_VIDES, rubriques: new Set(['theologie']) }).map(e => e.id)).toEqual([8])
  })

  it('combinent la recherche et les filtres', () => {
    const f = { ...FILTRES_VIDES, q: 'sources chretiennes', langues: new Set(['en']) }
    expect(filtrerBibliographie(ENTREES, f)).toEqual([])
  })
})

describe('le volet', () => {
  it('compte chaque valeur d’un axe une fois par entrée', () => {
    expect(compterAxe(ENTREES, e => e.rubriques)).toEqual([
      { valeur: 'exegese', n: 1 }, { valeur: 'theologie', n: 1 }, { valeur: 'tradition', n: 1 },
    ])
    expect(compterAxe(ENTREES, e => (e.genre ? [e.genre] : []), ['commentaire_critique', 'edition_critique', 'monographie']))
      .toEqual([{ valeur: 'commentaire_critique', n: 1 }, { valeur: 'edition_critique', n: 2 }, { valeur: 'monographie', n: 1 }])
  })

  it('dit les libellés en français, et dit ce qu’il ne sait pas', () => {
    expect(libelleGenre('commentaire_critique')).toBe('Commentaire critique')
    expect(libelleGenre(null)).toBe('Genre non précisé')
    expect(libelleLangueCode('la')).toBe('Latin')
    expect(libelleLangueCode('xx')).toBe('xx')
    expect(libelleCompte(588, 588, false)).toBe('588 ouvrages')
    expect(libelleCompte(588, 1, true)).toBe('1 ouvrage')
    expect(libelleCompte(588, 0, true)).toBe('aucun ouvrage')
    expect(libelleCitations(0)).toBeNull()
    expect(libelleCitations(1)).toBe('Cité pour une péricope')
    expect(libelleCitations(27)).toBe('Cité pour 27 péricopes')
  })
})
