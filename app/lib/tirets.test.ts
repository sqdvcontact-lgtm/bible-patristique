import { describe, it, expect } from 'vitest'
import { effacerTiretsDeBordure } from './tirets'

// Les textes ci-dessous sont ceux de Crampon, relevés tels quels.
describe('tirets d’incise au bord d’un extrait', () => {
  it('efface le tiret final d’un groupe de versets (Gn 25, 1-2)', () => {
    const gn25 = 'Abraham prit encore une femme, nommée Cétura. Et elle lui enfanta Zamran, Jecsan, Madan, Madian, Jesboc et Sué. —'
    expect(effacerTiretsDeBordure(gn25))
      .toBe('Abraham prit encore une femme, nommée Cétura. Et elle lui enfanta Zamran, Jecsan, Madan, Madian, Jesboc et Sué.')
  })

  it('efface le tiret de tête', () => {
    expect(effacerTiretsDeBordure('— car nous marchons par la foi, et non par la vue.'))
      .toBe('car nous marchons par la foi, et non par la vue.')
  })

  it('efface les deux bords à la fois (2 Co 5, 7)', () => {
    expect(effacerTiretsDeBordure('— car nous marchons par la foi, et non par la vue, —'))
      .toBe('car nous marchons par la foi, et non par la vue,')
  })

  // ⛔ Le cœur de la règle : ce qui sépare deux segments PRÉSENTS reste.
  it('garde le tiret intérieur (Gn 25, 4)', () => {
    const gn25v4 = 'Les fils de Madian furent Epha, Opher, Hénoch, Abida et Eldaa. — Ce sont là tous les fils de Cétura.'
    expect(effacerTiretsDeBordure(gn25v4)).toBe(gn25v4)
  })

  it('n’efface qu’aux bords quand il y a aussi un tiret intérieur (He 7, 19)', () => {
    expect(effacerTiretsDeBordure('— car la Loi n’a rien amené à la perfection, — mais elle a été l’introduction.'))
      .toBe('car la Loi n’a rien amené à la perfection, — mais elle a été l’introduction.')
  })

  it('emporte la fine insécable et l’insécable posées autour du tiret', () => {
    expect(effacerTiretsDeBordure('Texte. —')).toBe('Texte.')
    expect(effacerTiretsDeBordure(' — Texte.')).toBe('Texte.')
  })

  it('accepte le demi-cadratin comme le cadratin', () => {
    expect(effacerTiretsDeBordure('Texte. –')).toBe('Texte.')
  })

  it('ne touche pas au trait d’union, qui appartient aux mots', () => {
    const avecTraitUnion = 'C’est-à-dire un arc-en-ciel au-dessus de nous-mêmes-'
    expect(effacerTiretsDeBordure(avecTraitUnion)).toBe(avecTraitUnion)
  })

  it('est idempotente', () => {
    const une = effacerTiretsDeBordure('— Texte. —')
    expect(effacerTiretsDeBordure(une)).toBe(une)
  })

  it('laisse intact un extrait sans tiret', () => {
    const nu = 'Abraham prit encore une femme, nommée Cétura.'
    expect(effacerTiretsDeBordure(nu)).toBe(nu)
  })

  it('ne vide jamais un extrait qui ne serait que des tirets', () => {
    expect(effacerTiretsDeBordure('—')).toBe('—')
    expect(effacerTiretsDeBordure(' — — ')).toBe(' — — ')
  })

  it('laisse passer la chaîne vide', () => {
    expect(effacerTiretsDeBordure('')).toBe('')
  })
})
