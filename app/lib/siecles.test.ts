import { describe, expect, it } from 'vitest'
import { rangDuSiecle, siecleNormalise, SIECLE_INCONNU } from './siecles'

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
