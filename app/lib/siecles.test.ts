import { describe, expect, it } from 'vitest'
import { decouperSiecles, rangDuSiecle, siecleNormalise, sieclesEnHtml, SIECLE_INCONNU } from './siecles'

// La garde du CLASSEMENT par siècle. Elle ne juge pas la composition typographique
// des siècles, qui a la sienne ; elle tient la lecture du champ libre
// `auteurs.siecle`, dont dépend l'ordre de la carte du lecteur.

describe('lire un siècle dans un champ libre', () => {
  it('lit un siècle seul', () => {
    expect(rangDuSiecle('IVe siècle')).toBe(4)
    expect(rangDuSiecle('IXe siècle')).toBe(9)
    expect(rangDuSiecle('XIIIe siècle')).toBe(13)
  })

  it('retient le PREMIER siècle d’une fourchette', () => {
    // Un Père né au IVe et mort au Ve appartient au IVe : c'est là qu'on le cherche.
    // Ce sont les valeurs réellement portées par la table au 1er septembre 2026.
    expect(rangDuSiecle('IVe siècle-Ve siècle')).toBe(4)
    expect(rangDuSiecle('IIe siècle-IIIe siècle')).toBe(2)
    expect(rangDuSiecle('Ier siècle-IIe siècle')).toBe(1)
    expect(rangDuSiecle('Ve siècle-VIe siècle')).toBe(5)
  })

  it('range en dernier ce qu’il ne sait pas lire, sans jamais échouer', () => {
    for (const illisible of [null, undefined, '', 'inconnu', 'vers 400']) {
      expect(rangDuSiecle(illisible)).toBe(SIECLE_INCONNU)
    }
  })

  it('rend le même rang à chaque appel', () => {
    // ⚠️ L'expression employée porte le drapeau `g`, donc un `lastIndex` qui survit
    // d'un appel à l'autre : sans remise à zéro, un appel sur deux repartirait du
    // milieu du champ et rendrait un rang différent pour la même valeur.
    expect(rangDuSiecle('IVe siècle-Ve siècle')).toBe(4)
    expect(rangDuSiecle('IVe siècle-Ve siècle')).toBe(4)
    expect(rangDuSiecle('IVe siècle-Ve siècle')).toBe(4)
  })

  it('classe dans l’ordre du temps, et non dans celui de l’alphabet', () => {
    // ⛔ Le piège que cette fonction existe pour éviter. ⚠️ L'échantillon compte :
    // sur « IIe, IVe, IXe, XIIIe », les deux ordres coïncident par hasard et le test
    // ne prouverait rien. Il faut un « Ve » face à un « IXe ».
    const champs = ['IXe siècle', 'Ve siècle', 'IIe siècle', 'XIIIe siècle']
    const parLeTemps = [...champs].sort((a, b) => rangDuSiecle(a) - rangDuSiecle(b))
    expect(parLeTemps).toEqual(['IIe siècle', 'Ve siècle', 'IXe siècle', 'XIIIe siècle'])
    expect([...champs].sort()).toEqual(['IIe siècle', 'IXe siècle', 'Ve siècle', 'XIIIe siècle'])
  })
})

describe('nommer le siècle d’un auteur', () => {
  it('normalise une fourchette en un seul siècle', () => {
    expect(siecleNormalise('IVe siècle-Ve siècle')).toBe('IVe siècle')
    expect(siecleNormalise('Ier siècle-IIe siècle')).toBe('Ier siècle')
  })

  it('nomme l’indéterminé plutôt que de rendre un blanc ou un siècle inventé', () => {
    // ⛔ Sans ce garde-fou, le rang de secours (99) se composerait en « XCIXe siècle ».
    expect(siecleNormalise(null)).toBe('Siècle indéterminé')
    expect(siecleNormalise('vers 400')).toBe('Siècle indéterminé')
  })
})

// ── L'abréviation de « numéro » (2026-09-06) ──────────────────────────────────
// Relevé de l'auteur sur une notice de Sources chrétiennes : « le "o" de "no" doit
// être en exposant ». C'est le même geste que l'ordinal d'un siècle, et il vit donc
// dans le même découpage.

describe('composer l’abréviation de numéro', () => {
  const morceaux = (t: string) => decouperSiecles(t).map(f => `${f.t}:${f.v}`)

  it('met le « o » en exposant devant un chiffre', () => {
    expect(morceaux('Sources chrétiennes, no 618')).toEqual([
      'texte:Sources chrétiennes, ', 'texte:n', 'ordinal:o', 'texte: 618',
    ])
    // Sans espace, la forme reste reconnue.
    expect(morceaux('no27')).toEqual(['texte:n', 'ordinal:o', 'texte:27'])
  })

  it('⛔ ne touche NI le possessif « nos », NI un « no » à l’intérieur d’un mot', () => {
    for (const intact of ['nos 27 lettres', 'Bruno 27', 'Arno 12', 'no lettres', 'canon 27']) {
      expect(morceaux(intact), intact).toEqual([`texte:${intact}`])
    }
  })

  it('⛔ laisse « n° », qui est une autre écriture', () => {
    expect(morceaux('édition n° 21')).toEqual(['texte:édition n° 21'])
  })

  it('compose un siècle ET un numéro dans la même chaîne', () => {
    expect(morceaux('Sources chrétiennes, no 27, XIIe siècle')).toEqual([
      'texte:Sources chrétiennes, ', 'texte:n', 'ordinal:o', 'texte: 27, ',
      'romain:XII', 'ordinal:e', 'texte: siècle',
    ])
  })

  it('rend la chaîne INTACTE quand elle ne porte rien à composer', () => {
    expect(decouperSiecles('Paris, Éditions du Cerf, 2021'))
      .toEqual([{ t: 'texte', v: 'Paris, Éditions du Cerf, 2021' }])
  })

  it('compose aussi dans du HTML déjà écrit, sans doubler un exposant', () => {
    expect(sieclesEnHtml('coll. Sources chrétiennes, no 618')).toContain('n<sup')
    expect(sieclesEnHtml('n<sup>o</sup> 618')).not.toContain('<sup><sup>')
  })
})
