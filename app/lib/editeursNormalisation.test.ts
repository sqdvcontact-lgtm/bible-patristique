import { describe, expect, it } from 'vitest'
import {
  cleEditeur,
  construireIndexEditeurs,
  editeursDuSegment,
  estVilleConnue,
  normaliserNomEditeur,
  resoudreNomEditeur,
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
