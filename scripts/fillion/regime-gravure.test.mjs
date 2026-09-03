import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  LARGEUR_DEUX_COLONNES, MESURE_COLONNE, PLAFOND_ILLUSTRATION, PLAFOND_VIGNETTE, PLANCHER_ILLUSTRATION,
  estPhotographie, largeurAServir, largeurImprimee, partColonne, regimeDuProfil, regimeEtPart, regimeGravure,
} from './regime-gravure.mjs'

/**
 * ⛔ CE MODULE EST LE SEUL ENDROIT OÙ LE RÉGIME ET LA PART SE DÉCIDENT.
 *
 * La page de lecture les LIT dans `bible_edition_assets.regime` et
 * `.part_colonne`, que la chaîne écrit. Jusqu'au 3 septembre 2026, la page les
 * dérivait elle-même, avec une copie de ces bornes dans `app/lib/bibleEdition.ts`
 * et un test qui tenait les deux copies accordées. Les deux ont divergé une fois
 * (du 30 au 31 août : dix-neuf gravures fabriquées détourées et composées comme
 * des photogravures), puis un lot rempli autrement a mis la dérivation en défaut.
 * Il n'y a plus de seconde copie : ces tests éprouvent la règle, et la base
 * refuse tout ce qui n'en sort pas.
 */

const PHOTO = 'Nazareth. (D’après une photographie.)'
const decoupeDe = (largeur) => ({ normalized: [0, 0, largeur, 0.5] })

describe('la largeur imprimée', () => {
  it('se lit sur la boîte normalisée, puis sur les bornes absolues, puis sur les métadonnées de 1 Samuel', () => {
    expect(largeurImprimee({ normalized: [0.1, 0, 0.5, 1] })).toBeCloseTo(0.4, 6)
    expect(largeurImprimee({ left: 900, right: 1720, page_width_px: 1976 })).toBeCloseTo(820 / 1976, 6)
    // Le lot de 1 Samuel n'a ni boîte normalisée ni largeur de page dans sa
    // découpe : sa chaîne a rangé le rapport dans les métadonnées.
    expect(largeurImprimee({ left: 960, top: 1620, right: 1350, bottom: 2008 }, { source: { crop_width_ratio_of_page: 0.197368 } })).toBeCloseTo(0.197368, 6)
    expect(largeurImprimee({ left: 1, right: 2 }, { source: { crop_box_normalized: [0.2, 0, 0.5, 1] } })).toBeCloseTo(0.3, 6)
  })

  it('⛔ faute de toute mesure, vaut null — jamais zéro', () => {
    expect(largeurImprimee(null)).toBeNull()
    expect(largeurImprimee({ left: 1, right: 2 })).toBeNull()
    expect(largeurImprimee({}, {})).toBeNull()
  })
})

describe('le régime d’un actif qu’on inscrit', () => {
  it('⛔ passe à « au-fil » juste au-dessus du seuil des deux colonnes, et pas en dessous', () => {
    expect(LARGEUR_DEUX_COLONNES).toBe(0.6)
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.61), legende: PHOTO })).toBe('au-fil')
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.59), legende: PHOTO })).toBe('vignette')
  })

  it('reconnaît une photogravure à la légende de Fillion, sur les légendes RÉELLES du corpus', () => {
    expect(estPhotographie('Nazareth. (D’après une photographie.)')).toBe(true)
    expect(estPhotographie('Le Birket Israïn… (Photographie.)')).toBe(true)
    expect(estPhotographie('Massacre des saints Innocents. (D’après un ivoire du Vᵉ siècle.)')).toBe(false)
    expect(estPhotographie('Jésus séparant les brebis et les boucs. (Ancien bas-relief.)')).toBe(false)
    expect(estPhotographie('Modius ou boisseau romain.')).toBe(false)
    expect(estPhotographie('')).toBe(false)
    expect(estPhotographie(null)).toBe(false)
  })

  it('⛔ une gravure LARGE au trait reste une vignette : elle se détoure', () => {
    // Un ivoire, un bas-relief, le plan du temple d'Hérode enjambent les deux
    // colonnes et sont des dessins : les cadrer leur laisserait un rectangle de
    // papier gris là où la page attend de l'encre sur le sien.
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.87), legende: 'Jésus séparant les brebis et les boucs. (Ancien bas-relief.)' })).toBe('vignette')
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.87), legende: PHOTO })).toBe('au-fil')
  })

  it('⚠️ une gravure ÉTROITE d’après une photographie se détoure aussi', () => {
    // Un bois fait d'après un cliché : la légende dit d'où vient le modèle, la
    // largeur dit le procédé, et il faut les deux.
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.43), legende: PHOTO })).toBe('vignette')
  })

  it('une PLANCHE ne dépend ni de sa largeur ni de sa légende', () => {
    expect(regimeGravure({ assetKind: 'plate', decoupe: decoupeDe(0.87), legende: PHOTO })).toBe('hors-texte')
    expect(regimeGravure({ assetKind: 'plate', decoupe: null, legende: null })).toBe('hors-texte')
  })

  it('se force par la donnée, et une valeur inconnue est ignorée', () => {
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.7), legende: 'Cour d’une maison de l’Orient.', metadata: { regime: 'au-fil' } })).toBe('au-fil')
    expect(regimeGravure({ assetKind: 'illustration', decoupe: decoupeDe(0.7), legende: 'Cour d’une maison de l’Orient.', metadata: { regime: 'grande' } })).toBe('vignette')
  })

  it('⚠️ une largeur imprimée INCONNUE retombe sur la vignette, qui est détourée', () => {
    expect(regimeGravure({ assetKind: 'illustration', decoupe: null, legende: PHOTO })).toBe('vignette')
  })
})

describe('le régime que le fichier servi réalise', () => {
  it('se lit sur le profil de traitement, quelle que soit la chaîne qui l’a produit', () => {
    expect(regimeDuProfil('fillion-illustration-detouree')).toBe('vignette')
    expect(regimeDuProfil('fillion-illustration-detouree-composantes-preservees')).toBe('vignette')
    expect(regimeDuProfil('fillion-illustration-detouree-poussieres-isolees')).toBe('vignette')
    expect(regimeDuProfil('fillion-illustration-cadree')).toBe('au-fil')
    expect(regimeDuProfil('fillion-photogravure-cadree-ton-continu')).toBe('au-fil')
    expect(regimeDuProfil('fillion-planche-hors-texte')).toBe('hors-texte')
    expect(regimeDuProfil('fillion-illustration')).toBeNull()
    expect(regimeDuProfil(null)).toBeNull()
  })
})

describe('la part de la colonne', () => {
  it('⛔ AUCUNE illustration ne sort des deux bornes, quel que soit son régime', () => {
    const cas = [
      ['vignette', 0.01], ['vignette', 0.198], ['vignette', 0.575], ['vignette', 0.99],
      ['vignette', null], ['au-fil', 0.689], ['au-fil', 0.847], ['au-fil', 0.3], ['hors-texte', 0.2],
    ]
    for (const [regime, largeur] of cas) {
      const part = partColonne(regime, largeur)
      expect(part).toBeGreaterThanOrEqual(PLANCHER_ILLUSTRATION)
      expect(part).toBeLessThanOrEqual(PLAFOND_ILLUSTRATION)
    }
  })

  it('suit la largeur imprimée entre ses deux bornes', () => {
    // Fillion imprime ses vignettes de 19,8 % à 57,5 % de sa page. Ce que les
    // bornes réduisent, ce sont les EXTRÊMES : entre elles, la proportion de
    // Fillion est rendue telle quelle.
    expect(partColonne('vignette', 0.198)).toBe(PLANCHER_ILLUSTRATION)
    expect(partColonne('vignette', 0.402)).toBe(0.402)
    expect(partColonne('vignette', 0.453)).toBe(0.453)
    expect(partColonne('vignette', 0.575)).toBe(PLAFOND_VIGNETTE)
  })

  it('⛔ une gravure LARGE au trait garde sa proportion imprimée', () => {
    expect(partColonne('vignette', 0.87)).toBe(0.87)
    expect(partColonne('vignette', 0.61)).toBe(0.61)
    expect(partColonne('vignette', 0.59)).toBe(PLAFOND_VIGNETTE)
    expect(partColonne('vignette', 0.99)).toBe(PLAFOND_ILLUSTRATION)
  })

  it('⛔ une PLANCHE prend le plafond ; une scène suit sa largeur imprimée', () => {
    expect(partColonne('hors-texte', 0.2)).toBe(PLAFOND_ILLUSTRATION)
    expect(partColonne('au-fil', 0.847)).toBe(0.847)
    expect(partColonne('au-fil', 0.69)).toBe(0.69)
    expect(partColonne('au-fil', 0.9)).toBe(PLAFOND_ILLUSTRATION)
  })

  it('⛔ une largeur imprimée INCONNUE retombe sur le plancher, jamais sur zéro', () => {
    expect(partColonne('vignette', null)).toBe(PLANCHER_ILLUSTRATION)
    expect(partColonne('vignette', undefined)).toBe(PLANCHER_ILLUSTRATION)
  })

  it('est arrondie au millième, ce que la colonne porte', () => {
    expect(partColonne('vignette', 0.4021234)).toBe(0.402)
    expect(partColonne('au-fil', 820 / 1976 + 0.3)).toBe(0.715)
  })

  it('⛔ la MESURE de la colonne est la même ici et dans la page', () => {
    // La page en a besoin pour composer l'habillage (hauteur du flottant), la
    // chaîne pour servir au double : deux copies d'une mesure ne restent égales
    // que par accident, et celle-ci est la seule qui subsiste des deux côtés.
    const page = readFileSync('app/lib/bibleEdition.ts', 'utf8')
    const trouve = page.match(/^export const MESURE_COLONNE = ([0-9]+)$/m)
    if (!trouve) throw new Error('MESURE_COLONNE introuvable dans app/lib/bibleEdition.ts')
    expect(Number(trouve[1])).toBe(MESURE_COLONNE)
  })

  it('sert au DOUBLE de la taille d’affichage, jamais plus', () => {
    expect(MESURE_COLONNE).toBe(500)
    expect(largeurAServir(0.36)).toBe(360)
    expect(largeurAServir(0.56)).toBe(560)
    expect(largeurAServir(0.847)).toBe(847)
  })
})

describe('les deux valeurs à inscrire', () => {
  it('se calculent d’un seul geste pour un actif nouveau', () => {
    expect(regimeEtPart({ assetKind: 'illustration', decoupe: decoupeDe(0.402), legende: 'Médecin pansant un blessé.' }))
      .toEqual({ regime: 'vignette', part_colonne: 0.402 })
    expect(regimeEtPart({ assetKind: 'illustration', decoupe: decoupeDe(0.847), legende: PHOTO }))
      .toEqual({ regime: 'au-fil', part_colonne: 0.847 })
    expect(regimeEtPart({ assetKind: 'plate', decoupe: decoupeDe(0.92), legende: null }))
      .toEqual({ regime: 'hors-texte', part_colonne: 0.88 })
    // Le lot de 1 Samuel : la découpe est muette, les métadonnées parlent.
    expect(regimeEtPart({ assetKind: 'illustration', decoupe: { left: 960, top: 1620, right: 1350, bottom: 2008 }, legende: 'Lyre sur une monnaie hébraïque.', metadata: { source: { crop_width_ratio_of_page: 0.197368 } } }))
      .toEqual({ regime: 'vignette', part_colonne: 0.36 })
  })
})
