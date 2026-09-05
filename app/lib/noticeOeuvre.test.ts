import { describe, it, expect } from 'vitest'

import {
  construireIndexEditeurs,
  SEPARATEUR_COEDITEURS,
  type IndexEditeurs,
} from './editeursNormalisation'
import { noticeDUneOeuvre, resserrerTiretsAnnees } from './noticeOeuvre'
import {
  fragmentsReference,
  GUILLEMET_FERMANT,
  GUILLEMET_OUVRANT,
  texteReference,
} from './referenceBibliographique'

// ⚠️ Les FINES insécables des guillemets et de la barre à fines se prennent aux
// constantes qui les portent : tapées, elles ne se distinguent pas d'une espace
// ordinaire, et le dépôt en a déjà perdu ainsi (charte § 3.2).

/** Le texte que le moteur rend d’une œuvre du catalogue. */
const compose = (oeuvre: Parameters<typeof noticeDUneOeuvre>[0], index: IndexEditeurs | null = null) =>
  texteReference(noticeDUneOeuvre(oeuvre, index))

describe('resserrerTiretsAnnees', () => {
  it('resserre une fourchette de millésimes', () => {
    expect(resserrerTiretsAnnees('1870 – 1873')).toBe('1870-1873')
    expect(resserrerTiretsAnnees('1984 — 1986')).toBe('1984-1986')
    expect(resserrerTiretsAnnees('1984 - 1986')).toBe('1984-1986')
  })
  it('laisse « Vers 396 – Vers 399 » intact : ce n’est pas chiffre-tiret-chiffre', () => {
    expect(resserrerTiretsAnnees('Vers 396 – Vers 399')).toBe('Vers 396 – Vers 399')
  })
})

describe('noticeDUneOeuvre', () => {
  it('compose dans l’ordre du moteur : titre, trad., collection, lieu, éditeur, date', () => {
    expect(compose({
      auteur: 'Augustin d’Hippone',
      titre: 'La Cité de Dieu',
      tradAuteur: 'H. Barreau ; M. Charpentier',
      editeur: 'Louis Vivès',
      collection: 'Œuvres complètes de saint Augustin, tomes XXIII–XXV',
      ville: 'Paris',
      datePublication: '1870 – 1873',
    })).toBe(
      'Augustin d’Hippone, La Cité de Dieu, trad. H. Barreau et M. Charpentier, '
      + 'coll. ' + GUILLEMET_OUVRANT + 'Œuvres complètes de saint Augustin, tomes XXIII–XXV' + GUILLEMET_FERMANT + ', '
      + 'Paris, Louis Vivès, 1870-1873.',
    )
  })

  it('compose l’auteur en PETITES CAPITALES : c’est une forme d’autorité, non un texte libre', () => {
    const [tete] = fragmentsReference(noticeDUneOeuvre({ auteur: 'Augustin d’Hippone', titre: 'Les Confessions' }))
    expect(tete.composition).toBe('petites-capitales')
    expect(tete.style).toBe('bibliographie-nom-auteur')
    expect(tete.texte).toBe('Augustin d’Hippone')
  })

  it('nettoie les noms de traducteurs sans les composer : la civilité passe en bas de casse', () => {
    expect(compose({ titre: 'Questions sur l’Heptateuque', tradAuteur: 'Abbé Pognon' }))
      .toBe('Questions sur l’Heptateuque, trad. abbé Pognon.')
  })

  it('joint deux maisons par la barre à fines, jamais par le point-virgule du catalogue', () => {
    expect(compose({ titre: 'Les Confessions', editeur: 'Veuve Jean Camusat ; Pierre Le Petit' }))
      .toBe('Les Confessions, Veuve Jean Camusat' + SEPARATEUR_COEDITEURS + 'Pierre Le Petit.')
  })

  it('remplace une forme rencontrée par le nom répertorié, quand l’index est fourni', () => {
    const index = construireIndexEditeurs([
      { nom_complet: 'Louis Guérin', variantes: ['L. Guérin'], ville: 'Bar-le-Duc' },
    ])
    expect(compose({ titre: 'Du symbole', editeur: 'L. Guérin' }, index))
      .toBe('Du symbole, Louis Guérin.')
  })

  it('joint le sous-titre par un POINT, et n’en pose pas un second après une ponctuation forte', () => {
    expect(compose({ titre: 'Du symbole', sousTitre: 'Discours adressé aux catéchumènes' }))
      .toBe('Du symbole. Discours adressé aux catéchumènes.')
    expect(compose({ titre: 'Où en est la question biblique ?', sousTitre: 'Réponse à quelques objections' }))
      .toBe('Où en est la question biblique ? Réponse à quelques objections.')
  })

  it('emporte le séparateur d’un champ absent', () => {
    expect(compose({ titre: 'Apologétique', editeur: 'Bloud et Gay', datePublication: '1914' }))
      .toBe('Apologétique, Bloud et Gay, 1914.')
  })

  it('rend une date rédigée telle que la base l’écrit', () => {
    expect(compose({ titre: 'Histoire ecclésiastique', datePublication: '21 octobre 1532' }))
      .toBe('Histoire ecclésiastique, 21 octobre 1532.')
  })

  it('⛔ sans titre, il n’y a pas de référence', () => {
    expect(fragmentsReference(noticeDUneOeuvre({ auteur: 'Augustin d’Hippone', ville: 'Paris' }))).toEqual([])
  })
})
