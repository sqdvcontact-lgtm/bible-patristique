import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import {
  AIR_MARQUE_DENSITE_REM, CORPS_GLOSE, CORPS_LECTURE_BIBLE, RAPPORT_ORIGINAL_EN_REGARD, ECART_MARQUE_DENSITE_REM, LARGEUR_MARQUE_DENSITE_REM, LIBELLE_GLOSE,
  compositionSousTitre, marqueDensiteTient, styleDensiteVerset, styleTexteVerset,
  AIR_SIGNET_VERSET_REM, DEBORD_BLOC_VERSET_REM, EMPIETEMENT_BLOC_VERSET_REM, GOUTTIERE_NUMERO_VERSET_REM, NUMERO_VERSET_REM,
  RETRAIT_ACTIONS_VERSET, STYLE_NUMERO_VERSET, styleBlocVerset,
  BLANC_TITRE_MENU, GOUTTIERE_ACTIONS_VERSET, INTERLIGNE_TITRE_CHAPITRE, styleAxeTexte, styleGrilleRangee,
} from './compositionBible'
import { rangLePlusProche } from './echelleTypographique'

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
/**
 * ⛔ Le bloc sélectionné déborde le texte autant à droite qu'à gauche (décision de l'auteur,
 * 14 septembre 2026 : « ça colle trop “Booz” »), et la piste de texte n'en bouge pas.
 */
describe('le bloc sélectionné d’un verset déborde le texte des deux côtés', () => {
  it('le débord droit vaut la colonne du numéro et sa gouttière, qui font le débord gauche', () => {
    expect(DEBORD_BLOC_VERSET_REM).toBe(NUMERO_VERSET_REM + GOUTTIERE_NUMERO_VERSET_REM + AIR_SIGNET_VERSET_REM)
    expect(STYLE_NUMERO_VERSET.minWidth).toBe(`${NUMERO_VERSET_REM}rem`)
    const bloc = styleBlocVerset()
    expect(bloc.columnGap).toBe(`${GOUTTIERE_NUMERO_VERSET_REM}rem`)
    expect(bloc.padding).toBe(`0.0625rem ${DEBORD_BLOC_VERSET_REM}rem 0.0625rem ${AIR_SIGNET_VERSET_REM}rem`)
  })

  it('⛔ la piste de texte ne bouge pas : la marge négative rend ce que le rembourrage prend', () => {
    const debordDAvant = 0.25
    expect(EMPIETEMENT_BLOC_VERSET_REM).toBe(DEBORD_BLOC_VERSET_REM - debordDAvant)
    expect(Number.parseFloat(String(styleBlocVerset().marginRight))).toBe(-EMPIETEMENT_BLOC_VERSET_REM)
  })

  it('les actions reculent de ce que le vert prend sur leur gouttière', () => {
    expect(RETRAIT_ACTIONS_VERSET).toBe(`${0.5 + EMPIETEMENT_BLOC_VERSET_REM}rem`)
    expect(RETRAIT_ACTIONS_VERSET).toBe('2.5rem')
    const page = readFileSync(join(process.cwd(), 'app/components/TexteBible.tsx'), 'utf8')
    expect(page).toContain('paddingLeft: RETRAIT_ACTIONS_VERSET')
    expect(page).toContain('styleBlocVerset({ actif: actif || dansPlage, mobile })')
  })

  it('au doigt, rien ne change : les actions sortent de la grille', () => {
    const bloc = styleBlocVerset({ mobile: true })
    expect(bloc.padding).toBe('0.0625rem 0.25rem 0.0625rem 0')
    expect(bloc.marginRight).toBeUndefined()
  })

  it('la lecture en regard suit, colonnes côte à côte seulement', () => {
    const feuille = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
    expect(feuille).toMatch(/\.cs-regard-rangee\.cs-regard-rangee--symetrique \{\s*margin-right: calc\(-1 \* \(0\.25rem \+ var\(--regard-numero\) \+ var\(--regard-numero-gouttiere\)\)\);\s*padding-right: calc\(0\.25rem \+ var\(--regard-numero\) \+ var\(--regard-numero-gouttiere\)\);/)
    const bilingue = readFileSync(join(process.cwd(), 'app/components/BibleBilingue.tsx'), 'utf8')
    expect(bilingue).toContain("${mobile ? '' : ' cs-regard-rangee--symetrique'}")
  })

  it('le titre du chapitre et le menu des bibles se tiennent, dans les deux lectures', () => {
    // ⚠️ Rectifié le soir même (« très légèrement plus éloignés ») : l'interligne du titre reste
    // serré, et la marge remonte d'un huitième à cinq seizièmes de rem.
    expect(INTERLIGNE_TITRE_CHAPITRE).toBe(1.15)
    expect(BLANC_TITRE_MENU).toBe('0.3125rem')
    for (const fichier of ['app/components/TexteBible.tsx', 'app/components/LectureBilingueBible.tsx']) {
      const source = readFileSync(join(process.cwd(), fichier), 'utf8')
      expect(source).toContain('lineHeight: INTERLIGNE_TITRE_CHAPITRE')
      expect(source).toContain('${BLANC_TITRE_MENU} auto 0')
      expect(source).not.toContain("margin: '0.5rem auto 0'")
    }
  })

  it('⛔ la gouttière d’actions ne s’écrit qu’une fois, et l’anneau d’attente la retranche', () => {
    // Relevé de l'auteur (14 septembre 2026) : l'anneau, centré sur le bloc entier, tombait une
    // demi-gouttière à droite du titre du chapitre, qui se centre sur la première colonne.
    expect(GOUTTIERE_ACTIONS_VERSET).toBe('2.375rem')
    const grille = `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`
    expect(styleAxeTexte().gridTemplateColumns).toBe(grille)
    expect(styleGrilleRangee().gridTemplateColumns).toBe(grille)
    for (const fichier of ['app/components/TexteBible.tsx', 'app/components/LectureBilingueBible.tsx']) {
      const source = readFileSync(join(process.cwd(), fichier), 'utf8')
      expect(source).not.toContain('2.375rem')
      expect(source).toContain('${GOUTTIERE_ACTIONS_VERSET}')
    }
    const page = readFileSync(join(process.cwd(), 'app/components/BibleLayout.tsx'), 'utf8')
    expect(page).toContain('gouttiere={mobile ? undefined : GOUTTIERE_ACTIONS_VERSET}')
    const marque = readFileSync(join(process.cwd(), 'app/lib/attenteNavigation.tsx'), 'utf8')
    expect(marque).toContain('paddingRight: gouttiere')
  })
})

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

  it('⛔ SEULE la péricope se pose AU FER, comme son titre', () => {
    // C'est la correction du 29 août 2026 : 149 sous-titres sur 201 se composaient
    // centrés sous un titre lui-même au fer. ⚠️ T4 en est sorti le 30, son titre
    // s'étant recentré ; T6 est désormais le seul rang au fer.
    expect(compositionSousTitre('T6')).toMatchObject({
      textAlign: 'left', fontSize: '0.875rem', color: 'var(--cs-encre-apparat)',
    })
  })

  it('T4 et T5 se centrent : leur titre n’est qu’une désignation, et l’objet est ICI', () => {
    // « § I », puis « Abraham dans la terre de Chanaan et en Égypte » ; « II », puis
    // « Quelques récits relatifs à l'enfance… ». Au fer, la désignation pendait au
    // bord gauche et son objet se lisait comme une légende.
    // ⚠️ Le CORPS diffère : celui de T4 monte à seize pixels, comme son chapeau, pour
    // ne pas passer sous le titre de péricope qu'il domine.
    expect(compositionSousTitre('T4')).toMatchObject({
      textAlign: 'center', fontSize: '1rem', color: 'var(--cs-encre-apparat)',
    })
    expect(compositionSousTitre('T5')).toMatchObject({
      textAlign: 'center', fontSize: '0.9375rem', color: 'var(--cs-encre-apparat)',
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

/**
 * ⛔ Une GLOSE se compose en italique, un point sous le texte qu'elle accompagne
 * (décision de l'auteur, 2026-09-11).
 *
 * Le point est une mesure absolue, l'échelle du site une grille : la glose prend le rang
 * le plus proche de « un point de moins ». ⚠️ La lecture simple l'écrit dans une feuille,
 * la lecture en regard en ligne : c'est ici que les deux écritures se confrontent.
 */
describe('le corps d’une glose : un point sous son texte', () => {
  const UN_POINT = 4 / 3

  // Le corps du verset est une VARIABLE (--cs-lecture-corps, trois crans) : on éprouve
  // les rapports au cran normal, 15 px, et aux deux autres, 14 et 17.
  const CRANS = [14, 15, 17]
  const rapport = (calc: string) => Number(calc.match(/\*\s*([0-9.]+)\)/)?.[1])

  it('le verset lit la variable du réglage, au cran normal 15 px', () => {
    expect(String(styleTexteVerset().fontSize)).toBe(CORPS_LECTURE_BIBLE)
    expect(CORPS_LECTURE_BIBLE).toBe('var(--cs-lecture-corps, 0.9375rem)')
  })

  it('sous un verset, le rang le plus proche d’un point de moins, à chaque cran', () => {
    // ⚠️ Un rapport unique ne peut tomber sur le même RANG à chaque cran : on exige un
    // écart de moins d'un demi-pixel au point de moins, et le rang juste au cran normal.
    for (const verset of CRANS) {
      expect(Math.abs(verset * rapport(CORPS_GLOSE.sousVerset) - (verset - UN_POINT))).toBeLessThan(0.5)
    }
    expect(rangLePlusProche(15 * rapport(CORPS_GLOSE.sousVerset))).toBe(rangLePlusProche(15 - UN_POINT))
  })

  it('sous la colonne originale de la lecture en regard, de même', () => {
    for (const verset of CRANS) {
      const original = verset * RAPPORT_ORIGINAL_EN_REGARD
      expect(Math.abs(verset * rapport(CORPS_GLOSE.sousOriginal) - (original - UN_POINT))).toBeLessThan(0.5)
    }
  })

  it('la lecture simple lit le même corps, et l’italique, dans sa feuille', () => {
    const feuille = readFileSync(join(process.cwd(), 'app', 'glosses899.css'), 'utf8')
    const regle = feuille.slice(feuille.indexOf('[data-verse-text] {'))
    expect(regle).toContain(`font-size: ${CORPS_GLOSE.sousVerset} !important`)
    expect(regle).toContain('font-style: italic')
  })

  it('la lecture simple écrit le même libellé que la lecture en regard et la Polyglotte', () => {
    const feuille = readFileSync(join(process.cwd(), 'app', 'glosses899.css'), 'utf8')
    expect(feuille).toContain(`content: "${LIBELLE_GLOSE}";`)
  })
})

/**
 * ⛔ La marque de densité ne paraît qu'au SURVOL, à droite des actions, et seulement si
 * elle y TIENT (décision de l'auteur, 2026-09-13).
 */
describe('la marque de densité se rend quand elle tient à droite des actions', () => {
  const demandeA = (racine: number) =>
    (ECART_MARQUE_DENSITE_REM + LARGEUR_MARQUE_DENSITE_REM + AIR_MARQUE_DENSITE_REM) * racine

  it('tient quand la zone lui laisse sa place, et pas un pixel de moins', () => {
    const finDesActions = 800
    expect(marqueDensiteTient({ finDesActions, bordDeLaZone: finDesActions + demandeA(16), racine: 16 })).toBe(true)
    expect(marqueDensiteTient({ finDesActions, bordDeLaZone: finDesActions + demandeA(16) - 1, racine: 16 })).toBe(false)
  })

  it('la demande suit la police racine : ce qui tient à 16 px ne tient plus forcément à 22', () => {
    const bordDeLaZone = 800 + demandeA(16)
    expect(marqueDensiteTient({ finDesActions: 800, bordDeLaZone, racine: 16 })).toBe(true)
    expect(marqueDensiteTient({ finDesActions: 800, bordDeLaZone, racine: 22 })).toBe(false)
  })

  it('⛔ une mesure absente ne fait jamais paraître la marque', () => {
    expect(marqueDensiteTient({ finDesActions: Number.NaN, bordDeLaZone: 1000, racine: 16 })).toBe(false)
    expect(marqueDensiteTient({ finDesActions: 100, bordDeLaZone: Number.POSITIVE_INFINITY, racine: 16 })).toBe(false)
    expect(marqueDensiteTient({ finDesActions: 100, bordDeLaZone: 1000, racine: 0 })).toBe(false)
  })

  it('elle vit dans le flux de la gouttière, sans opacité écrite en ligne', () => {
    const style = styleDensiteVerset()
    // ⛔ En absolu, elle couvrait les boutons ; en ligne, l'opacité battrait la règle du survol.
    expect(style.position).toBeUndefined()
    expect(style.opacity).toBeUndefined()
    expect(style.marginLeft).toBe(ECART_MARQUE_DENSITE_REM + 'rem')
  })

  it('⛔ sa marge haute se déduit du rembourrage de la gouttière, pour centrer le chiffre sur la capitale', () => {
    // 0,375 rem sous le haut de la gouttière, dont le rembourrage porte 0,28125. Posé sur la
    // ligne de base du verset (0,4375), le chiffre paraissait bas (relevé de l'auteur, 2026-09-13).
    const page = readFileSync(join(process.cwd(), 'app', 'components', 'TexteBible.tsx'), 'utf8')
    expect(page).toContain("paddingTop: '0.28125rem'")
    expect(Number.parseFloat(String(styleDensiteVerset().marginTop)) + 0.28125).toBe(0.375)
  })
})
