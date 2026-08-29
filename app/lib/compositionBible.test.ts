import { describe, expect, it } from 'vitest'
import { compositionSousTitre } from './compositionBible'

/**
 * ⛔ Un SOUS-TITRE se compose comme SON titre.
 *
 * Il en est le chapeau, tombé dans un bloc voisin par l'ordre matériel de la page
 * imprimée : centré sous un titre centré, au fer sous un titre au fer, dans son
 * encre et un cran sous son corps.
 *
 * ⚠️ Tout est en style EN LIGNE, et ce n'est pas un choix de confort : le paragraphe
 * d'apparat pose déjà son corps et son encre en ligne, si bien qu'une règle de
 * feuille serait morte. Essayé le 29 août 2026, et repris aussitôt.
 */
describe('la composition d’un sous-titre suit le rang de SON titre', () => {
  it('les rangs hauts se centrent, dans l’encre foncée de leur titre', () => {
    for (const rang of ['T1', 'T2']) {
      expect(compositionSousTitre(rang)).toMatchObject({
        textAlign: 'center', fontSize: '0.9375rem', color: 'var(--cs-encre-fonce)',
      })
    }
  })

  it('T3 se centre encore, mais prend l’encre de son titre', () => {
    // ⚠️ Le titre de section est en `--cs-encre`, non en `--cs-encre-fonce` : le
    // sous-titre le suit. Une encre plus claire ferait de lui un commentaire du
    // titre, quand il en est la suite.
    expect(compositionSousTitre('T3')).toMatchObject({
      textAlign: 'center', fontSize: '0.9375rem', color: 'var(--cs-encre)',
    })
  })

  it('⛔ la sous-section et la péricope se posent AU FER, comme leurs titres', () => {
    // C'est la correction du 29 août 2026 : 149 sous-titres sur 201 se composaient
    // centrés sous un titre lui-même au fer.
    for (const rang of ['T4', 'T6']) {
      expect(compositionSousTitre(rang)).toMatchObject({
        textAlign: 'left', fontSize: '0.875rem', color: 'var(--cs-encre)',
      })
    }
  })

  it('T5 se centre : son titre n’est qu’une désignation, et l’objet est ICI', () => {
    // Les 32 paragraphes de la Genèse dont l'objet tombe dans un bloc voisin :
    // « § I », puis « Abraham dans la terre de Chanaan et en Égypte ». Au fer, la
    // désignation pendait au bord gauche et son objet se lisait comme une légende
    // (relevé de l'auteur, 2026-08-29). ⚠️ Dans l'encre de son titre, comme T3 :
    // le paragraphe est en `--cs-encre`, non en `--cs-encre-fonce`.
    expect(compositionSousTitre('T5')).toMatchObject({
      textAlign: 'center', fontSize: '0.9375rem', color: 'var(--cs-encre)',
    })
  })

  it('sans rang connu, garde la composition des rangs hauts', () => {
    // On ne dégrade pas ce qu'on ne sait pas : c'est la composition que les 201
    // sous-titres du corpus recevaient tous avant la correction.
    expect(compositionSousTitre(null)).toMatchObject({ textAlign: 'center' })
    expect(compositionSousTitre(undefined)).toMatchObject({ textAlign: 'center' })
  })

  it('est toujours en italique, à tous les rangs', () => {
    for (const rang of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', null]) {
      expect(compositionSousTitre(rang).fontStyle).toBe('italic')
    }
  })
})
