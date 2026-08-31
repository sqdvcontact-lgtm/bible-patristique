import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { MESURE_COLONNE, estHabillable, estPhotogravure, largeurServie, partIllustration, regimeIllustration } from './bibleEdition'

/**
 * ⛔ LA PART DE LA COLONNE EST ÉCRITE DEUX FOIS, ET LES DEUX DOIVENT S'ACCORDER.
 *
 * La page de lecture la calcule ici ; `scripts/fillion/detourer-gravures.mjs` la
 * recalcule pour savoir à quelle largeur SERVIR le fichier. Un script `.mjs` ne
 * peut pas importer ce module TypeScript, et deux copies d'une mesure ne restent
 * égales que par accident : si elles divergent, la page compose à une taille et
 * le fichier est fabriqué pour une autre, ce qui est exactement le défaut que
 * cette part est censée corriger.
 *
 * ⛔ Et la PART n'était pas seule à être écrite deux fois : le RÉGIME l'était
 * aussi, et les deux ont divergé. La chaîne a appris à lire la légende le
 * 30 août 2026, la page ne l'a apprise que le 31 : entre les deux, dix-neuf
 * gravures larges au trait étaient fabriquées détourées et composées comme des
 * photogravures. Rien ne le disait — ni les types, ni les tests, ni la relecture
 * de l'une ou l'autre écriture, qui sont justes chacune de son côté. La garde
 * porte donc sur la RÈGLE autant que sur les bornes.
 *
 * Même garde que celle qui tient `get_niv1_texte` accordée à `NATURES_CORPS`.
 */

const SCRIPT = 'scripts/fillion/detourer-gravures.mjs'

const PHOTO = 'Nazareth. (D’après une photographie.)'

function decoupeDe(largeur: number) {
  return { normalized: [0, 0, largeur, 0.5] }
}

/** Le motif du script, tiré de sa SOURCE. ⛔ Pas recopié : c'est justement une
 *  copie qui a divergé. */
function motifEstPhotographieDuScript(): RegExp {
  const source = readFileSync(SCRIPT, 'utf8')
  const trouve = source.match(/function estPhotographie\(legende\) \{\s*return \/([^/]+)\/([a-z]*)\.test/)
  if (!trouve) throw new Error(`estPhotographie introuvable dans ${SCRIPT}`)
  return new RegExp(trouve[1], trouve[2])
}

function nombreDuScript(nom: string): number {
  const source = readFileSync(SCRIPT, 'utf8')
  const trouve = source.match(new RegExp(`^const ${nom} = ([0-9.]+)$`, 'm'))
  if (!trouve) throw new Error(`${nom} introuvable dans ${SCRIPT}`)
  return Number(trouve[1])
}

describe('la part de la colonne', () => {
  it('⛔ la chaîne d’image emploie EXACTEMENT les mêmes bornes que la page', () => {
    // On éprouve la fonction plutôt que de relire ses constantes : c'est le
    // résultat qui compte, et une borne renommée ne doit pas casser la garde.
    const PLANCHER = nombreDuScript('PLANCHER_ILLUSTRATION')
    const PLAFOND = nombreDuScript('PLAFOND_ILLUSTRATION')
    const PLAFOND_VIGNETTE = nombreDuScript('PLAFOND_VIGNETTE')
    const AU_FIL = nombreDuScript('PART_AU_FIL')
    expect(partIllustration('vignette', 0.01)).toBe(PLANCHER)
    expect(partIllustration('vignette', 0.58)).toBe(PLAFOND_VIGNETTE)
    expect(partIllustration('au-fil', 0.7)).toBe(AU_FIL)
    expect(partIllustration('hors-texte', 0.7)).toBe(PLAFOND)
    expect(nombreDuScript('MESURE_COLONNE')).toBe(MESURE_COLONNE)
  })

  it('⛔ AUCUNE illustration ne sort des deux bornes, quel que soit son régime', () => {
    const PLANCHER = nombreDuScript('PLANCHER_ILLUSTRATION')
    const PLAFOND = nombreDuScript('PLAFOND_ILLUSTRATION')
    const cas: Array<[Parameters<typeof partIllustration>[0], number | null]> = [
      ['vignette', 0.01], ['vignette', 0.198], ['vignette', 0.575], ['vignette', 0.99],
      ['vignette', null], ['au-fil', 0.689], ['au-fil', 0.847], ['hors-texte', 0.2],
    ]
    for (const [regime, largeur] of cas) {
      const part = partIllustration(regime, largeur)
      expect(part).toBeGreaterThanOrEqual(PLANCHER)
      expect(part).toBeLessThanOrEqual(PLAFOND)
    }
  })

  it('⛔ une gravure LARGE au trait garde sa proportion imprimée', () => {
    // Le plafond de la vignette suppose une gravure qui TIENT DANS UNE COLONNE.
    // Appliqué à un ivoire ou à un plan du temple qui enjambent les deux, il les
    // rendrait plus petits que la photogravure d'à côté, imprimée aussi large.
    expect(partIllustration('vignette', 0.87)).toBeCloseTo(0.87, 6)
    expect(partIllustration('vignette', 0.66)).toBeCloseTo(0.66, 6)
    expect(partIllustration('vignette', 0.61)).toBeCloseTo(0.61, 6)
    // ⚠️ Sous le seuil des deux colonnes, le plafond mord toujours.
    expect(partIllustration('vignette', 0.59)).toBe(0.56)
    expect(partIllustration('vignette', 0.99)).toBeCloseTo(0.88, 6)
  })

  it('suit la largeur imprimée entre ses deux bornes', () => {
    // Fillion imprime ses vignettes de 19,8 % à 57,5 % de sa page. ⚠️ Ce que les
    // bornes réduisent, ce sont les EXTRÊMES : entre elles, la proportion de
    // Fillion est rendue telle quelle.
    expect(partIllustration('vignette', 0.198)).toBe(0.36)
    expect(partIllustration('vignette', 0.402)).toBeCloseTo(0.402, 6)
    expect(partIllustration('vignette', 0.453)).toBeCloseTo(0.453, 6)
    expect(partIllustration('vignette', 0.575)).toBe(0.56)
  })

  it('⛔ une largeur imprimée INCONNUE retombe sur le plancher, jamais sur zéro', () => {
    // Une découpe du corpus n'a pas de bornes normalisées : elle doit rester
    // lisible, non disparaître.
    expect(partIllustration('vignette', null)).toBe(0.36)
    expect(partIllustration('vignette', undefined)).toBe(0.36)
  })

  it('une PLANCHE prend le plafond, une SCÈNE l’essentiel de la colonne', () => {
    expect(partIllustration('hors-texte', 0.2)).toBe(0.88)
    expect(partIllustration('au-fil', 0.847)).toBe(0.78)
  })

  it('⛔ l’habillage cesse au-delà du seuil, et c’est un axe DISTINCT du détourage', () => {
    expect(estHabillable(partIllustration('vignette', 0.402))).toBe(true)
    expect(estHabillable(partIllustration('vignette', 0.575))).toBe(false)
    // ⚠️ « Scène de deuil » est une gravure au TRAIT, donc détourée, et pourtant
    //    trop large pour être habillée. Les deux questions ne se confondent pas.
    expect(estHabillable(partIllustration('au-fil', 0.847))).toBe(false)
  })

  it('sert au DOUBLE de la taille d’affichage, jamais plus', () => {
    expect(largeurServie(0.36)).toBe(Math.round(2 * 0.36 * MESURE_COLONNE))
    expect(largeurServie(0.56)).toBe(560)
    expect(largeurServie(0.78)).toBe(780)
  })
})

describe('le régime de composition', () => {
  it('⛔ la chaîne d’image emploie EXACTEMENT le même seuil de largeur', () => {
    expect(nombreDuScript('LARGEUR_DEUX_COLONNES')).toBe(0.6)
    // La page passe à « au-fil » juste au-dessus du seuil, et pas en dessous.
    expect(regimeIllustration('illustration', decoupeDe(0.61), PHOTO)).toBe('au-fil')
    expect(regimeIllustration('illustration', decoupeDe(0.59), PHOTO)).toBe('vignette')
  })

  it('⛔ la chaîne d’image reconnaît une photogravure EXACTEMENT comme la page', () => {
    // On rejoue le motif du script sur les légendes RÉELLES du corpus, des deux
    // côtés du partage. Une graphie de plus dans l'un des deux motifs — et il y
    // en aura, les légendes n'étant pas normalisées — se verrait ici.
    const motif = motifEstPhotographieDuScript()
    const legendes = [
      'Nazareth. (D’après une photographie.)',
      'Le Birket Israïn… (Photographie.)',
      'Massacre des saints Innocents. (D’après un ivoire du Vᵉ siècle.)',
      'Jésus séparant les brebis et les boucs. (Ancien bas-relief.)',
      'Plan cavalier du temple d’Hérode. (D’après la reconstitution de M. de Vogüé.)',
      'Tombeaux taillés dans le roc, à Jérusalem. (Vallée du Cédron.)',
      'Modius ou boisseau romain.',
      '',
    ]
    for (const l of legendes) expect(estPhotogravure(l)).toBe(motif.test(l))
    expect(estPhotogravure(null)).toBe(false)
    expect(estPhotogravure(undefined)).toBe(false)
  })

  it('⛔ une gravure LARGE au trait reste une vignette : elle se détoure', () => {
    // Dix-neuf gravures du tome VII sont dans ce cas — un ivoire, un bas-relief,
    // un plan du temple —, et les composer comme des photogravures leur retirait
    // le thème et le tiers de leur résolution.
    expect(regimeIllustration('illustration', decoupeDe(0.87), 'Jésus séparant les brebis et les boucs. (Ancien bas-relief.)')).toBe('vignette')
    expect(regimeIllustration('illustration', decoupeDe(0.87), PHOTO)).toBe('au-fil')
  })

  it('⚠️ une gravure ÉTROITE d’après une photographie se détoure aussi', () => {
    // Huit gravures du tome VII portent la légende sans être des photogravures :
    // ce sont des bois faits d'après un cliché. La légende dit d'où vient le
    // modèle, la LARGEUR dit le procédé, et il faut les deux.
    expect(regimeIllustration('illustration', decoupeDe(0.43), PHOTO)).toBe('vignette')
  })

  it('une PLANCHE ne dépend ni de sa largeur ni de sa légende', () => {
    expect(regimeIllustration('plate', decoupeDe(0.87), PHOTO)).toBe('hors-texte')
    expect(regimeIllustration('plate', null, null)).toBe('hors-texte')
  })

  it('⚠️ une largeur imprimée INCONNUE retombe sur la vignette, qui est détourée', () => {
    expect(regimeIllustration('illustration', null, PHOTO)).toBe('vignette')
  })
})
