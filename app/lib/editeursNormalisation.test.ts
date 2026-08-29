import { describe, expect, it } from 'vitest'
import {
  cleEditeur,
  construireIndexEditeurs,
  editeursDuSegment,
  estVilleConnue,
  normaliserNomEditeur,
  resoudreNomEditeur,
  estCoedition,
  partiesCoedition,
  SEPARATEUR_COEDITEURS,
  variantesDepuisLignes,
} from './editeursNormalisation'

// Extrait fidèle de la table `editeurs` (les maisons que le corpus rencontre
// réellement), plus les villes employées par les œuvres.
const INDEX = construireIndexEditeurs(
  [
    { nom_complet: 'Louis Guérin', variantes: ['L. Guérin', 'L. Guérin & Cie'], ville: null },
    { nom_complet: 'Jean-Benoît Pélagaud', variantes: ['Pélagaud'], ville: 'Lyon' },
    { nom_complet: 'Éditions du Cerf', variantes: ['Cerf'], ville: null },
    { nom_complet: 'Jacques-Paul Migne', variantes: ['J.-P. Migne'], ville: null },
    { nom_complet: 'Louis Hachette', variantes: ['Librairie de L. Hachette et Cie'], ville: 'Paris' },
    { nom_complet: 'Juste Angé', variantes: ['J. Angé'], ville: 'Versailles' },
    { nom_complet: 'Alfred Cherest', variantes: ['A. Cherest'], ville: 'Versailles' },
    { nom_complet: 'Fédéric Morel', variantes: ['Frédéric Morel'], ville: 'Paris' },
  ],
  ['Bar-le-Duc', 'Paris', 'Lyon', 'Rouen', 'Vienne'],
)

describe('cleEditeur', () => {
  it('efface accents, casse et ponctuation', () => {
    expect(cleEditeur('L. Guérin & Cie')).toBe('l guerin cie')
    expect(cleEditeur('  Éditions du Cerf ')).toBe('editions du cerf')
  })

  it('rapproche deux graphies de la même maison', () => {
    expect(cleEditeur('J.-P. Migne')).toBe(cleEditeur('J. P. MIGNE'))
  })

  // ⛔ La clé SQL `public.cle_editeur` perdait ses capitales accentuées : elle
  // translittérait AVANT de passer en minuscules, et « Éditions du Cerf » se rangeait
  // sous « ditions du cerf ». Les deux écritures de la clé doivent rendre la MÊME
  // chose, faute de quoi ce que la base fusionne et ce que l'écran annonce divergent.
  it('replie une capitale accentuée comme sa minuscule', () => {
    expect(cleEditeur('Éditions du Cerf')).toBe('editions du cerf')
    expect(cleEditeur('Éditions du Cerf')).toBe(cleEditeur('Editions du Cerf'))
    expect(cleEditeur('ÉCOLE BIBLIQUE')).toBe(cleEditeur('École biblique'))
  })
})

describe('resoudreNomEditeur', () => {
  it('rend le nom répertorié depuis une variante', () => {
    expect(resoudreNomEditeur('L. Guérin & Cie', INDEX)).toBe('Louis Guérin')
    expect(resoudreNomEditeur('Cerf', INDEX)).toBe('Éditions du Cerf')
  })

  it('rend null pour une maison inconnue, jamais une approximation', () => {
    expect(resoudreNomEditeur('F. Tempsky', INDEX)).toBeNull()
  })

  it('rend null sans index plutôt que de lever', () => {
    expect(resoudreNomEditeur('Cerf', null)).toBeNull()
  })
})

describe('normaliserNomEditeur', () => {
  it('garde la forme brute d’une maison non répertoriée', () => {
    expect(normaliserNomEditeur('F. Tempsky', INDEX)).toBe('F. Tempsky')
  })

  // La barre est encadrée de FINES INSÉCABLES (U+202F) : espace légère, et la barre
  // ne passe jamais seule à la ligne.
  it('joint les co-éditeurs par une barre, jamais par le point-virgule du catalogue', () => {
    expect(normaliserNomEditeur('J. Angé ; A. Cherest', INDEX)).toBe('Juste Angé\u202f/\u202fAlfred Cherest')
  })

  it('rend la forme brute quand l’index n’est pas chargé', () => {
    expect(normaliserNomEditeur('L. Guérin & Cie', null)).toBe('L. Guérin & Cie')
  })

  it('ne rend rien d’un champ vide', () => {
    expect(normaliserNomEditeur(null, INDEX)).toBe('')
    expect(normaliserNomEditeur('   ', INDEX)).toBe('')
  })
})

describe('editeursDuSegment', () => {
  it('reconnaît un segment qui EST un éditeur', () => {
    expect(editeursDuSegment('Pélagaud', INDEX)).toBe('Jean-Benoît Pélagaud')
  })

  it('reconnaît une co-édition entière', () => {
    expect(editeursDuSegment('J. Angé ; A. Cherest', INDEX)).toBe('Juste Angé\u202f/\u202fAlfred Cherest')
  })

  // La nuance qui compte : une bribe de notice où il se trouve un éditeur n'est pas
  // un segment d'éditeur. « volume 1, Paris, J. Angé » ne doit pas être pris pour lui.
  it('refuse un segment dont une partie seulement est répertoriée', () => {
    expect(editeursDuSegment('volume 1 ; J. Angé', INDEX)).toBeNull()
  })

  it('refuse une ville', () => {
    expect(editeursDuSegment('Bar-le-Duc', INDEX)).toBeNull()
  })
})

describe('estVilleConnue', () => {
  it('reconnaît une ville de la table comme une ville des œuvres', () => {
    expect(estVilleConnue('Versailles', INDEX)).toBe(true)
    expect(estVilleConnue('Bar-le-Duc', INDEX)).toBe(true)
  })

  it('ne prend pas une maison pour une ville', () => {
    expect(estVilleConnue('Pélagaud', INDEX)).toBe(false)
  })
})
// Le cas qui a fait la règle : « Veuve Jean Camusat ; Pierre Le Petit » est UNE graphie
// de la maison, non deux maisons. Le point-virgule y sépare deux associés, comme le « et »
// de la forme retenue — et la table porte à la fois la maison entière et la veuve seule.
const CAMUSAT = construireIndexEditeurs([
  { nom_complet: 'Veuve Jean Camusat et Pierre Le Petit', variantes: ['Veuve Jean Camusat ; Pierre Le Petit'], ville: null },
  { nom_complet: 'Veuve Jean Camusat', variantes: [], ville: null },
  { nom_complet: 'Juste Angé', variantes: ['J. Angé'], ville: null },
  { nom_complet: 'Alfred Cherest', variantes: ['A. Cherest'], ville: null },
])

describe('une variante qui porte un « ; »', () => {
  it('se résout ENTIÈRE, sans être découpée en co-éditeurs', () => {
    expect(normaliserNomEditeur('Veuve Jean Camusat ; Pierre Le Petit', CAMUSAT))
      .toBe('Veuve Jean Camusat et Pierre Le Petit')
  })

  it('l’emporte sur la moitié gauche, pourtant répertoriée elle aussi', () => {
    expect(editeursDuSegment('Veuve Jean Camusat ; Pierre Le Petit', CAMUSAT))
      .toBe('Veuve Jean Camusat et Pierre Le Petit')
  })

  it('ne prive pas les vraies co-éditions de leur découpage', () => {
    expect(normaliserNomEditeur('J. Angé ; A. Cherest', CAMUSAT))
      .toBe('Juste Angé / Alfred Cherest')
    expect(editeursDuSegment('J. Angé ; A. Cherest', CAMUSAT))
      .toBe('Juste Angé / Alfred Cherest')
  })

  it('laisse la maison seule se résoudre pour son propre compte', () => {
    expect(normaliserNomEditeur('Veuve Jean Camusat', CAMUSAT)).toBe('Veuve Jean Camusat')
  })
})


// ⛔ Le « ; » du catalogue sépare deux MAISONS qui ont coédité : ce n’est jamais le nom
// d’une maison. La barre oblique, elle, appartient à de vrais noms.
const COEDITION = construireIndexEditeurs([
  { nom_complet: 'Éditions du Cerf', variantes: ['Cerf'], ville: null },
  { nom_complet: 'Abbaye Saint-Pierre de Solesmes', variantes: [], ville: null },
  // Résidu d’import : la coédition avait été rangée parmi les autorités.
  { nom_complet: 'Éditions du Cerf ; Abbaye Saint-Pierre de Solesmes', variantes: [], ville: null },
  { nom_complet: 'Centre Thomas More / CADIR', variantes: ['CADIR'], ville: null },
])

describe('coédition', () => {
  it('reconnaît le point-virgule, et lui seul', () => {
    expect(estCoedition('Éditions du Cerf ; Abbaye Saint-Pierre de Solesmes')).toBe(true)
    expect(partiesCoedition('A ; B ; C')).toEqual(['A', 'B', 'C'])
  })

  it('ne prend pas une barre oblique pour un séparateur', () => {
    expect(estCoedition('Centre Thomas More / CADIR')).toBe(false)
    expect(partiesCoedition('Centre Thomas More / CADIR')).toEqual(['Centre Thomas More / CADIR'])
  })

  // La régression du 29 août : la forme entière se résolvant d’abord, la fiche composée
  // était rendue telle quelle, point-virgule brut compris.
  it('ne rend JAMAIS une coédition telle quelle, même si la table la porte', () => {
    const attendu = 'Éditions du Cerf' + SEPARATEUR_COEDITEURS + 'Abbaye Saint-Pierre de Solesmes'
    expect(normaliserNomEditeur('Éditions du Cerf ; Abbaye Saint-Pierre de Solesmes', COEDITION)).toBe(attendu)
    expect(editeursDuSegment('Éditions du Cerf ; Abbaye Saint-Pierre de Solesmes', COEDITION)).toBe(attendu)
  })

  it('résout chaque maison par sa variante', () => {
    expect(normaliserNomEditeur('Cerf ; Abbaye Saint-Pierre de Solesmes', COEDITION))
      .toBe('Éditions du Cerf' + SEPARATEUR_COEDITEURS + 'Abbaye Saint-Pierre de Solesmes')
  })

  it('laisse entier un nom de maison qui porte une barre oblique', () => {
    expect(normaliserNomEditeur('Centre Thomas More / CADIR', COEDITION)).toBe('Centre Thomas More / CADIR')
    expect(normaliserNomEditeur('CADIR', COEDITION)).toBe('Centre Thomas More / CADIR')
  })

  it('rend le même affichage quand on le recompose une seconde fois', () => {
    const une = normaliserNomEditeur('Éditions du Cerf ; Abbaye Saint-Pierre de Solesmes', COEDITION)
    expect(normaliserNomEditeur(une, COEDITION)).toBe(une)
  })
})


// ⛔ La virgule ne peut pas séparer deux variantes : elle est DANS le nom des maisons.
// Cas réel, et déjà cassé en base avant la correction : « J.-P. Migne (Patrologia Latina,
// t. 63) » avait été enregistrée en DEUX graphies dont ni l’une ni l’autre ne veut rien dire.
describe('variantesDepuisLignes', () => {
  it('garde la virgule DANS le nom', () => {
    expect(variantesDepuisLignes('J.-P. Migne (Patrologia Latina, t. 63)'))
      .toEqual(['J.-P. Migne (Patrologia Latina, t. 63)'])
    expect(variantesDepuisLignes('Delsol, Pradel et Cie\nFirmin Didot frères, fils et Cie'))
      .toEqual(['Delsol, Pradel et Cie', 'Firmin Didot frères, fils et Cie'])
  })

  it('une graphie par ligne, sans blanc ni ligne vide', () => {
    expect(variantesDepuisLignes('  L. Guérin  \n\n L. Guérin & Cie \n'))
      .toEqual(['L. Guérin', 'L. Guérin & Cie'])
    expect(variantesDepuisLignes('')).toEqual([])
  })

  it('lit aussi bien un collage à fins de ligne Windows', () => {
    expect(variantesDepuisLignes('Cerf\r\nÉditions du Cerf')).toEqual(['Cerf', 'Éditions du Cerf'])
  })
})
