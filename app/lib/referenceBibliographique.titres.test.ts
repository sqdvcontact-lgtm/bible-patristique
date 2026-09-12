import { describe, expect, it } from 'vitest'

import { fragmentsReference, texteReference, type NoticeBibliographique } from './referenceBibliographique'

function notice(): NoticeBibliographique {
  return {
    id: 851,
    forme: 'monographie',
    titre: 'Histoire de Théodoric le Grand, roi d’Italie',
    sousTitre: null,
    titreHote: null,
    tomaison: null,
    pages: null,
    dateAffichee: '1846',
    annee: 1846,
    lieu: 'Paris',
    editeurs: [],
    collection: null,
    numeroCollection: null,
    contributeurs: [{
      role: 'auteur_scientifique',
      nature: 'chercheur',
      ordre: 1,
      nomAffiche: 'Auguste François Louis Scipion de Grimoard-Beauvoir (marquis du Roure)',
      prenom: 'Auguste François Louis Scipion',
      nomFamille: 'de Grimoard-Beauvoir',
      titre: 'marquis du Roure',
      nomAutorite: 'Auguste François Louis Scipion de Grimoard-Beauvoir (marquis du Roure)',
    }],
    auteursTexte: null,
    directeursTexte: null,
    traducteursTexte: null,
  }
}

describe('titres personnels dans une référence bibliographique', () => {
  it('place le titre entre parenthèses après le nom, hors petites capitales', () => {
    const fragments = fragmentsReference(notice())
    expect(texteReference(notice())).toContain('Auguste François Louis Scipion de Grimoard-Beauvoir (marquis du Roure),')

    const nom = fragments.find(fragment => fragment.champ === 'nom_famille')
    const titre = fragments.find(fragment => fragment.champ === 'titre_personne')
    expect(nom).toMatchObject({ texte: 'de Grimoard-Beauvoir', composition: 'petites-capitales' })
    expect(titre).toMatchObject({ texte: 'marquis du Roure', composition: 'romain' })
  })
})
