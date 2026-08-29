import { describe, expect, it } from 'vitest'
import { ROLES_SOUS_TITRE, rangDesSousTitres } from './bibleHierarchieSemantique'

/**
 * ⛔ Un sous-titre prend le rang du TITRE auquel il s'accroche, jamais le sien.
 *
 * La donnée le prouve : au 29 août 2026, un `section_subtitle` de rang I3 vise
 * indifféremment un titre T3, T4 ou T5. Et les deux échelles divergent dès le
 * quatrième rang — I4 est le CHAPITRE quand T4 est la SOUS-SECTION —, si bien
 * qu'aucune arithmétique ne les rapproche.
 */

const partie = { id: 'p', blockKey: 'k-partie', semanticStyle: 'titre_partie_livre' }
const sousSection = { id: 's', blockKey: 'k-sous-section', semanticStyle: 'titre_sous_section' }
const paragraphe = { id: 'g', blockKey: 'k-paragraphe', semanticStyle: 'titre_paragraphe_livre' }

describe('le rang d’un sous-titre vient de son titre', () => {
  it('suit l’ancre, et non son propre rang', () => {
    // ⚠️ Les deux sous-titres portent le MÊME rang I3 et le même rôle ; seule
    // l'ancre les sépare. C'est exactement le cas du corpus.
    const rangs = rangDesSousTitres([
      partie, sousSection,
      { id: 'a', semanticStyle: 'introduction', niveau: 'I3', roleAffichage: 'section_subtitle', ancre: 'k-partie' },
      { id: 'b', semanticStyle: 'introduction', niveau: 'I3', roleAffichage: 'section_subtitle', ancre: 'k-sous-section' },
    ])
    expect(rangs.get('a')).toBe('T2')
    expect(rangs.get('b')).toBe('T4')
  })

  it('reconnaît les deux noms hérités et le nom canonique', () => {
    expect([...ROLES_SOUS_TITRE].sort()).toEqual(['part_subtitle', 'section_subtitle', 'sous_titre'])
    const rangs = rangDesSousTitres([
      paragraphe,
      { id: 'x', semanticStyle: 'introduction', niveau: 'I3', roleAffichage: 'sous_titre', ancre: 'k-paragraphe' },
      { id: 'y', semanticStyle: 'introduction', niveau: 'I2', roleAffichage: 'part_subtitle', ancre: 'k-paragraphe' },
    ])
    expect(rangs.get('x')).toBe('T5')
    expect(rangs.get('y')).toBe('T5')
  })

  it('⛔ n’invente aucun rang quand l’ancre manque ou ne résout pas', () => {
    // Mieux vaut la composition par défaut qu'un rang deviné : c'est la règle
    // générale du rendu, qui refuse ce qu'il ne sait pas composer.
    const rangs = rangDesSousTitres([
      partie,
      { id: 'sans', semanticStyle: 'introduction', niveau: 'I3', roleAffichage: 'sous_titre' },
      { id: 'perdu', semanticStyle: 'introduction', niveau: 'I3', roleAffichage: 'sous_titre', ancre: 'k-absente' },
    ])
    expect(rangs.has('sans')).toBe(false)
    expect(rangs.has('perdu')).toBe(false)
  })

  it('⛔ n’attribue de rang qu’à un sous-titre, jamais à un bloc ordinaire', () => {
    const rangs = rangDesSousTitres([
      partie,
      { id: 'ordinaire', semanticStyle: 'commentaire', niveau: 'I5', ancre: 'k-partie' },
      { id: 'autre-role', semanticStyle: 'notice', niveau: 'I1', roleAffichage: 'critical_apparatus', ancre: 'k-partie' },
    ])
    expect(rangs.size).toBe(0)
  })

  it('⛔ une ancre qui vise un bloc d’INFORMATION ne donne pas de rang', () => {
    // Un sous-titre s'accroche à un titre. Viser un commentaire n'a pas de sens,
    // et l'on ne prête pas au sous-titre le rang I du bloc visé : les deux
    // échelles ne sont pas interchangeables.
    const rangs = rangDesSousTitres([
      { id: 'c', blockKey: 'k-comm', semanticStyle: 'commentaire', niveau: 'I5' },
      { id: 'z', semanticStyle: 'introduction', niveau: 'I3', roleAffichage: 'sous_titre', ancre: 'k-comm' },
    ])
    expect(rangs.has('z')).toBe(false)
  })
})
