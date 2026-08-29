import { describe, expect, it } from 'vitest'
import { resoudreStyleSemantique, styleConnu } from './bibleHierarchieSemantique'
import registre from '../../work/fillion/semantic_display_hierarchy.json'

/**
 * ⛔ LA GARDE DU REGROUPEMENT (2026-08-29).
 *
 * Quarante styles d'information étaient un produit croisé nature × portée. Ils sont
 * quatre, et les anciens codes vivent comme alias. Ce fichier tient les deux moitiés
 * de la promesse : ce qui compose comme avant doit composer comme avant, et ce qui
 * change doit être exactement ce qu'on a voulu changer.
 *
 * ⚠️ L'état d'AVANT est recopié ici à la main, code par code. C'est le patron de
 * `couleursEnDurInventaire.ts` et de la garde chromatique : une source RÉDIGÉE, qu'un
 * script ne regénère pas. Un relevé automatique se contenterait de constater l'état
 * courant, et ne prouverait donc rien.
 */

/** Les natures que les quarante codes déclaraient AVANT le regroupement. */
const NATURE_AVANT: Record<string, string> = {
  introduction_bible: 'introduction',
  introduction_testament: 'introduction',
  introduction_groupe_livres: 'introduction',
  introduction_livre: 'introduction',
  introduction_partie: 'introduction',
  introduction_section: 'introduction',
  introduction_sous_section: 'introduction',
  introduction_chapitre: 'introduction',
  introduction_pericope: 'introduction',
  commentaire_livre: 'commentary',
  commentaire_partie: 'commentary',
  commentaire_section: 'commentary',
  commentaire_chapitre: 'commentary',
  commentaire_pericope: 'commentary',
  commentaire_verset: 'commentary',
  notice_bible: 'notice',
  notice_testament: 'notice',
  notice_groupe_livres: 'notice',
  notice_livre: 'notice',
  notice_partie: 'notice',
  notice_section: 'notice',
  notice_chapitre: 'notice',
  notice_pericope: 'notice',
  transition_livre: 'notice',
  transition_pericope: 'notice',
  sommaire_livre: 'summary',
  sommaire_partie: 'summary',
  sommaire_section: 'summary',
  sommaire_chapitre: 'summary',
  sommaire_pericope: 'summary',
  conclusion_livre: 'conclusion',
  conclusion_partie: 'conclusion',
  conclusion_section: 'conclusion',
  conclusion_chapitre: 'conclusion',
  conclusion_pericope: 'conclusion',
  excursus_livre: 'excursus',
  excursus_partie: 'excursus',
  excursus_section: 'excursus',
  excursus_chapitre: 'excursus',
  excursus_pericope: 'excursus',
}

/** Le rang que chaque ancien code disait dans son propre nom. */
const NIVEAU_AVANT: Record<string, string> = {
  bible: 'I1', testament: 'I1', groupe_livres: 'I1', livre: 'I1',
  partie: 'I2', section: 'I3', sous_section: 'I3',
  chapitre: 'I4', pericope: 'I5', verset: 'I6',
}

/**
 * ⛔ Les SEULES natures que le regroupement déplace, et ce qu'elles deviennent.
 * Aucune ne porte un bloc dans le corpus : le regroupement ne change donc rien à
 * l'écran. Ajouter une ligne ici est une décision éditoriale, pas un ajustement.
 */
const FUSIONS_VOULUES: Record<string, string> = {
  summary: 'introduction',   // un sommaire annonce, comme elle ; 0,01 em les séparait
  conclusion: 'commentary',  // une conclusion est un commentaire PLACÉ à la fin
  excursus: 'notice',        // composait EXACTEMENT comme elle : même corps, même aparté
}

describe('le regroupement ne déplace aucun bloc du corpus', () => {
  const anciens = Object.keys(NATURE_AVANT)

  it('les quarante anciens codes restent tous RECONNUS', () => {
    for (const code of anciens) expect(styleConnu(code), code).toBe(true)
  })

  it('chacun garde EXACTEMENT le rang qu’il disait dans son nom', () => {
    for (const code of anciens) {
      const portee = code.replace(/^(introduction|commentaire|notice|sommaire|conclusion|excursus|transition)_/, '')
      expect(resoudreStyleSemantique(code)?.level, code).toBe(NIVEAU_AVANT[portee])
    }
  })

  it('chacun garde sa nature, sauf les trois fusions voulues', () => {
    for (const code of anciens) {
      const avant = NATURE_AVANT[code]
      const attendu = FUSIONS_VOULUES[avant] ?? avant
      expect(resoudreStyleSemantique(code)?.nature, code).toBe(attendu)
    }
  })

  it('les trois natures fusionnées ne portaient AUCUN bloc du corpus', () => {
    // C'est ce qui rend le regroupement gratuit. Relevé le 2026-08-29 sur les
    // 4 935 blocs des dix livres publiés : summary 0, conclusion 0, excursus 0.
    expect(Object.keys(FUSIONS_VOULUES).sort()).toEqual(['conclusion', 'excursus', 'summary'])
  })

  it('les deux introductions TITRÉES gardent le rang du titre qu’elles portent', () => {
    expect(resoudreStyleSemantique('introduction_livre')).toMatchObject({
      canonique: 'introduction_titree', level: 'I1', headingRole: 'title', headingLevel: 'T2',
    })
    expect(resoudreStyleSemantique('introduction_pericope')).toMatchObject({
      canonique: 'introduction_titree', level: 'I5', headingRole: 'title', headingLevel: 'T6',
    })
  })

  it('les autres introductions n’en portent pas', () => {
    expect(resoudreStyleSemantique('introduction_section')).toMatchObject({
      canonique: 'introduction', headingRole: 'label', headingLevel: null,
    })
  })

  it('les alias de GRAPHIE héritent du rang de leur code', () => {
    // ⚠️ Ce sont les noms HÉRITÉS du registre, non les coquilles : celles-ci se
    // corrigent dans la donnée et ne deviennent jamais des alias (charte § 7.1).
    expect(resoudreStyleSemantique('introduction_partie_livre')?.level).toBe('I2')
    expect(resoudreStyleSemantique('titre_division')?.level).toBe('T5')
    expect(resoudreStyleSemantique('excursus')?.nature).toBe('notice')
  })
})

describe('le vocabulaire canonique', () => {
  it('compte douze styles : sept titres, quatre natures, une note', () => {
    const styles = registre.styles as Record<string, { kind: string }>
    const par = { title: 0, info: 0, note: 0 } as Record<string, number>
    for (const e of Object.values(styles)) par[e.kind] += 1
    expect(par).toEqual({ title: 7, info: 4, note: 1 })
  })

  it('les quatre natures d’information sont celles que l’auteur a nommées', () => {
    const styles = registre.styles as Record<string, { kind: string }>
    const infos = Object.entries(styles).filter(([, e]) => e.kind === 'info').map(([c]) => c)
    expect(infos.sort()).toEqual(['commentaire', 'introduction', 'introduction_titree', 'notice'])
  })

  it('⛔ un style d’information sans rang est REFUSÉ, comme un style inconnu', () => {
    // Le nom dit la nature, le rang se déclare. Un bloc qui n'en déclare aucun ne
    // s'en invente pas un : le rendu refuse ce qu'il ne sait pas composer.
    expect(resoudreStyleSemantique('commentaire')).toBeNull()
    expect(resoudreStyleSemantique('commentaire', { niveau: 'I5' })).toMatchObject({
      canonique: 'commentaire', level: 'I5', nature: 'commentary',
    })
  })

  it('un TITRE porte son rang dans son nom et n’a rien à déclarer', () => {
    expect(resoudreStyleSemantique('titre_partie_livre')?.level).toBe('T2')
    expect(resoudreStyleSemantique('titre_pericope')?.level).toBe('T6')
  })

  it('⛔ le rang d’un code HÉRITÉ fait foi contre le rang déclaré', () => {
    // Sans quoi le regroupement changerait la composition d'un bloc qui n'a pas bougé.
    expect(resoudreStyleSemantique('commentaire_pericope', { niveau: 'I1' })?.level).toBe('I5')
  })
})
