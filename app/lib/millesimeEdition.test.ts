import { describe, it, expect } from 'vitest'
import { anneeDuMillesime, comparerParMillesime, millesimeEdition } from './millesimeEdition'

/**
 * ⚠️ Les notices sont recopiées de `traductions.source_edition`, telles quelles : c'est
 * sur la prose RÉELLE que la dérivation se vérifie, non sur un jeu d'essai qui prouverait
 * seulement qu'on sait lire ce qu'on a écrit.
 */
const NOTICES: Record<string, string> = {
  sacy: 'La Sainte Bible, contenant l’Ancien et le Nouveau Testament, traduite en françois sur la Vulgate, par monsieur Le Maistre de Saci. Divisée en dix tomes, Paris, Guillaume Desprez et Jean Desessartz, 1730, 10 vol.',
  segond: 'Louis Segond, La Sainte Bible, qui comprend l’Ancien et le Nouveau Testament traduits sur les textes originaux hébreu et grec, nouvelle édition revue avec parallèles, Paris, Société biblique britannique et étrangère, 1910.',
  crampon: 'La Sainte Bible, traduction d’après les textes originaux par l’abbé A. Crampon, édition révisée par des Pères de la Compagnie de Jésus avec la collaboration de professeurs de Saint-Sulpice, Société de Saint-Jean l’Évangéliste, Desclée et Cie, Paris–Tournai–Rome, 1923.',
  vulgate: 'Biblia sacra iuxta Vulgatam Clementinam, nova editio, éd. Alberto Colunga O.P. et Lorenzo Turrado, Madrid, Biblioteca de Autores Cristianos, 1946 ; transcription numérique du Clementine Vulgate Project / CrossWire.',
  swete: 'Henry Barclay Swete (éd.), The Old Testament in Greek according to the Septuagint, Cambridge, Cambridge University Press : vol. I, 4e éd., 1909 ; vol. II, 3e éd., 1907 ; vol. III, 4e éd., 1912 ; transcription numérique nathans/lxx-swete dérivée de First1KGreek / Open Greek and Latin Project.',
  bible899: 'Paris, Bibliothèque nationale de France, Département des manuscrits, Français 899 (ancienne cote Regius 7268.2.2), manuscrit sur vélin, 372 feuillets, Paris, XIIIe siècle (vers 1260).',
  fillion: 'Louis-Claude Fillion, La Sainte Bible (texte latin et traduction française), commentée d’après la Vulgate et les textes originaux, à l’usage des séminaires et du clergé, Paris, Letouzey et Ané, 8 vol. ; exemplaires utilisés : t. I, 2e éd., 1894 ; t. II-III, 7e éd., 1922 ; t. IV et VI-VII, 8e éd., 1924 ; t. V, 6e éd., 1922 ; t. VIII, 9e éd., 1925.',
  vulgateFillion: 'Texte latin en regard dans Louis-Claude Fillion, La Sainte Bible (texte latin et traduction française), commentée d’après la Vulgate et les textes originaux, à l’usage des séminaires et du clergé, Paris, Letouzey et Ané ; témoins utilisés : t. I (1894), t. II-III et V (1922), t. IV et VI-VII (1924), t. VIII (1925).',
  moderne899: 'Traduction critique moderne établie sur Paris, BnF, Département des manuscrits, Français 899.',
  aelf: 'La Bible : traduction officielle liturgique, texte intégral publié par les évêques catholiques francophones, Paris, Mame, 2013 ; texte en ligne diffusé par l’AELF.',
}

describe('millesimeEdition — le millésime lu dans la notice', () => {
  it('prend le DERNIER millésime de la notice, celui de l’adresse', () => {
    expect(millesimeEdition({ source_edition: NOTICES.sacy })).toBe('1730')
    expect(millesimeEdition({ source_edition: NOTICES.fillion })).toBe('1925')
    expect(millesimeEdition({ source_edition: NOTICES.vulgateFillion })).toBe('1925')
    expect(millesimeEdition({ source_edition: NOTICES.swete })).toBe('1912')
  })

  it('⚠️ garde le « vers » ACCOLÉ au millésime', () => {
    // Le manuscrit Français 899 est daté par approximation ; « 1260 » tout court lui
    // prêterait la précision d’un colophon.
    expect(millesimeEdition({ source_edition: NOTICES.bible899 })).toBe('vers 1260')
  })

  it('⛔ ne prend pas un nombre qui n’est pas une date', () => {
    // La cote « Regius 7268.2.2 » et les 372 feuillets ne sont pas des millésimes ;
    // ils ne sont jamais en queue de notice.
    expect(millesimeEdition({ source_edition: NOTICES.bible899 })).not.toContain('7268')
  })

  it('retombe sur la fin de publication quand la notice ne date rien', () => {
    expect(millesimeEdition({ source_edition: NOTICES.moderne899 })).toBeNull()
    expect(millesimeEdition({ source_edition: NOTICES.moderne899, publication_fin_annee: 2026 })).toBe('2026')
    expect(millesimeEdition({ publication_fin_annee: 1904 })).toBe('1904')
    expect(millesimeEdition({})).toBeNull()
  })

  it('lit les dix notices du corpus sans en manquer une', () => {
    const attendu = {
      sacy: '1730', segond: '1910', crampon: '1923', vulgate: '1946', swete: '1912',
      bible899: 'vers 1260', fillion: '1925', vulgateFillion: '1925', moderne899: null, aelf: '2013',
    }
    for (const [cle, valeur] of Object.entries(attendu)) {
      expect(millesimeEdition({ source_edition: NOTICES[cle] }), cle).toBe(valeur)
    }
  })
})

describe('anneeDuMillesime', () => {
  it('rend le nombre, « vers » compris', () => {
    expect(anneeDuMillesime('vers 1260')).toBe(1260)
    expect(anneeDuMillesime('1730')).toBe(1730)
    expect(anneeDuMillesime(null)).toBeNull()
    expect(anneeDuMillesime('')).toBeNull()
  })
})

describe('comparerParMillesime — l’ordre du menu', () => {
  const e = (millesime: string | null, ordre: number | null = null) => ({ millesime, ordre })

  it('range par millésime croissant', () => {
    const liste = [e('1946', 4), e('vers 1260', 6), e('1730', 1), e('1923', 3)]
    expect([...liste].sort(comparerParMillesime).map(x => x.millesime))
      .toEqual(['vers 1260', '1730', '1923', '1946'])
  })

  it('⛔ met à la FIN ce qui n’a pas de date', () => {
    const liste = [e(null, 99), e('1910', 2), e(null, 5), e('1730', 1)]
    expect([...liste].sort(comparerParMillesime).map(x => x.millesime))
      .toEqual(['1730', '1910', null, null])
  })

  it('départage deux mêmes millésimes par le rang de la base', () => {
    // La Vulgate de Fillion et son français portent tous deux 1925.
    const liste = [e('1925', 8), e('1925', 7)]
    expect([...liste].sort(comparerParMillesime).map(x => x.ordre)).toEqual([7, 8])
  })

  it('range les entrées sans date entre elles par leur rang', () => {
    expect([e(null, 9), e(null, 2)].sort(comparerParMillesime).map(x => x.ordre)).toEqual([2, 9])
  })
})
