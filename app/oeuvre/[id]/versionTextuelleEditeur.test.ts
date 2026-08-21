import { describe, expect, it } from 'vitest'
import { construireIndexEditeurs } from '../../lib/editeursNormalisation'
import { decomposerEdition } from './versionTextuelle'

// Les maisons que les mentions d'édition du corpus nomment réellement, et les villes
// que les œuvres emploient. L'index vient de la base ; il est reproduit ici pour que
// le test dise ce qu'il éprouve.
const INDEX = construireIndexEditeurs(
  [
    { nom_complet: 'Louis Guérin', variantes: ['L. Guérin', 'L. Guérin & Cie'], ville: null },
    { nom_complet: 'Jean-Benoît Pélagaud', variantes: ['Pélagaud'], ville: 'Lyon' },
    { nom_complet: 'Éditions du Cerf', variantes: ['Cerf'], ville: null },
    { nom_complet: 'Louis Hachette', variantes: ['Librairie de L. Hachette et Cie'], ville: 'Paris' },
    { nom_complet: 'Louis Vivès', variantes: ['Librairie de Louis Vivès'], ville: null },
    { nom_complet: 'Fédéric Morel', variantes: ['Frédéric Morel'], ville: 'Paris' },
    { nom_complet: 'Juste Angé', variantes: ['J. Angé'], ville: 'Versailles' },
    { nom_complet: 'Alfred Cherest', variantes: ['A. Cherest'], ville: 'Versailles' },
  ],
  ['Bar-le-Duc', 'Paris', 'Lyon', 'Rouen', 'Vienne'],
)

describe('decomposerEdition — reconnaissance de l’éditeur', () => {
  // Le défaut d'origine, sur dix-neuf versions : la notice commence par l'éditeur, et
  // le découpage par position en faisait une ville.
  it('ne prend plus l’éditeur pour la ville quand il ouvre la notice', () => {
    const r = decomposerEdition('L. Guérin & Cie, Bar-le-Duc, 1865', 1865, INDEX)
    expect(r.editeur).toBe('Louis Guérin')
    expect(r.ville).toBe('Bar-le-Duc')
    expect(r.annee).toBe('1865')
  })

  it('lit aussi bien une notice qui commence par la ville', () => {
    const r = decomposerEdition('Lyon, Pélagaud, 1844', 1844, INDEX)
    expect(r.editeur).toBe('Jean-Benoît Pélagaud')
    expect(r.ville).toBe('Lyon')
  })

  it('rend la maison sous son nom répertorié, pas sous la forme rencontrée', () => {
    expect(decomposerEdition('Paris, Librairie de L. Hachette et Cie, 1861', 1861, INDEX).editeur)
      .toBe('Louis Hachette')
  })

  // « 1984 – 1986 » n'était pas reconnu comme une année : il partait dans l'éditeur.
  it('reconnaît une fourchette d’années', () => {
    const r = decomposerEdition('Cerf, Paris, 1984 – 1986', null, INDEX)
    expect(r.editeur).toBe('Éditions du Cerf')
    expect(r.ville).toBe('Paris')
    expect(r.annee).toBe('1984 – 1986')
  })

  it('retrouve l’éditeur au milieu d’une notice bavarde', () => {
    const r = decomposerEdition(
      'Paris, Louis Vivès, 1879, Œuvres complètes de saint Jérôme, tome VIII, p. 317-364',
      1879,
      INDEX,
    )
    expect(r.editeur).toBe('Louis Vivès')
    expect(r.ville).toBe('Paris')
  })

  it('lit une co-édition sans laisser le point-virgule du catalogue', () => {
    const r = decomposerEdition(
      'Œuvres complètes de saint Cyprien, volume 1, Paris, J. Angé ; A. Cherest, 1837',
      1837,
      INDEX,
    )
    expect(r.editeur).toBe('Juste Angé\u202f/\u202fAlfred Cherest')
    expect(r.ville).toBe('Paris')
  })

  it('garde la mention d’édition à part', () => {
    const r = decomposerEdition(
      'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646',
      1646,
      INDEX,
    )
    expect(r.editionDescription).toBe('Cinquième édition revue par le traducteur')
    // Maison non répertoriée : la notice garde sa forme, et l'ancien découpage sert.
    expect(r.editeur).toBe('Jean Viret, Jacques Besongne et Clément Malassis')
    expect(r.ville).toBe('Rouen')
  })

  // Une notice dont aucune part n'est répertoriée doit rester lisible : mieux vaut un
  // découpage approximatif qu'une notice vide.
  it('retombe sur le découpage par position faute d’éditeur reconnu', () => {
    const r = decomposerEdition('Pius Knöll, CSEL 33, Vienne, 1896', 1896, INDEX)
    expect(r.annee).toBe('1896')
    expect(r.publicationLabel).toContain('CSEL 33')
  })

  it('se comporte comme avant quand aucun index n’est fourni', () => {
    const sans = decomposerEdition('Lyon, Pélagaud, 1844', 1844)
    expect(sans.ville).toBe('Lyon')
    expect(sans.editeur).toBe('Pélagaud')
  })
})
