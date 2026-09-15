import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ALIGNEMENT_ACTIONS, CORPS_TITRE_VOLET_REM, COTE_CIBLE_CSS, ECART_TITRE_ACTIONS_PX, INTERLIGNE_TITRE_VOLET,
  LIGNE_TITRE_VOLET_REM, STYLE_RANGEE_TETE_VOLET, TITRE_MIN_REM,
  condenserLaRangee, coteDUneCible, ecartDeCible, largeurDeLaRangee, pasDUneCible, titreMinimal,
} from './TeteVolet'

// ── LA GARDE DE LA RANGÉE D'ACTIONS D'UN VOLET ───────────────────────────────
//
// Trois choses à tenir, et elles ne se voient pas à la lecture.
//
// ⛔ LA MESURE EST ÉCRITE DEUX FOIS, dans la feuille et dans le code. Il le faut :
// la feuille POSE la géométrie, le code la CALCULE avant le rendu pour choisir la
// forme. Deux copies d'une même mesure divergent au premier réglage, et la rangée
// composerait alors sur une largeur que la feuille ne lui donne pas — c'est
// exactement la garde que `partIllustration.test.ts` tient entre la page et la
// chaîne d'images.
//
// ⛔ LES SYMBOLES ONT LA PRIORITÉ SUR LE TITRE (décision de l'auteur, 2026-09-15). La
// rangée ne se condense plus quand le titre ENTIER cesse de tenir sur une ligne, mais
// seulement quand le titre enroulé n'a plus sa largeur minimale : son plus long mot,
// et jamais moins de `TITRE_MIN_REM`.
//
// ⛔ ET LE PRÉDICAT NE DOIT PAS OSCILLER. Il ne reçoit que ce que la page sait AVANT de
// rendre — la place offerte, la largeur minimale du titre, le NOMBRE de cibles de la
// forme dépliée —, et aucune de ces trois valeurs ne dépend de la forme retenue.
//
// ⚠️ TOUS LES NOMBRES CI-DESSOUS SONT RELEVÉS, jamais calculés. Les places offertes
// viennent de `tmp/mesure-tete-rangee-entiere.mjs` (une iframe par écran) ; les largeurs
// minimales des titres de `tmp/mesure-mots-titres.html` (2026-09-15), qui pose les
// quarante-cinq titres publiés en `width: min-content`, dans Source Serif 4 à 0,875 rem,
// aux racines 16, 19 et 22. ⛔ Les recalculer de tête est ce qui a fait écrire, le
// 2026-09-10 au matin, qu'« Augustin d'Hippone » se coupait à 1280 px : il y tenait,
// d'un pixel.

const CSS = readFileSync('app/globals.css', 'utf8')

describe('la mesure d’une cible est celle de la feuille', () => {
  it('la feuille pose bien le plancher et l’écart que le code recopie', () => {
    // ⚠️ Si l'une de ces lignes change, c'est `coteDUneCible` / `ecartDeCible` /
    // `COTE_CIBLE_CSS` qu'il faut suivre, jamais ce test qu'il faut accorder.
    expect(CSS).toContain('.cs-tete-volet-actions { display: flex; align-items: center; gap: max(4px, 0.25rem); flex-shrink: 0; }')
    expect(CSS).toContain('.cs-tete-volet-actions .etoile-favori { min-width: max(24px, 1.5rem); min-height: max(24px, 1.5rem); }')
    expect(CSS).toContain(`min-height: ${COTE_CIBLE_CSS};`)
  })

  it('rend le plancher absolu en bas d’échelle et le rem au-dessus', () => {
    // Racine 16 (portable) : le plancher de WCAG l'emporte, 24 + 4.
    expect(coteDUneCible(16)).toBe(24)
    expect(ecartDeCible(16)).toBe(4)
    expect(pasDUneCible(16)).toBe(28)
    // Racine 19 (1920 px) : 1,5 rem passe devant, 28,5 + 4,75.
    expect(pasDUneCible(19)).toBeCloseTo(33.25, 5)
    // Racine 22 (le plafond de la police fluide) : 33 + 5,5.
    expect(pasDUneCible(22)).toBeCloseTo(38.5, 5)
  })

  it('compte n côtés et n−1 écarts, et s’accorde à ce que le navigateur rend', () => {
    // Largeurs RELEVÉES dans le navigateur, aux trois racines de l'échelle : la rangée
    // à trois cibles (étoile, ⋮, chevron) puis à deux (⋮, chevron).
    // ⚠️ À UN PIXEL PRÈS, et il le faut : `clientWidth` est un ENTIER, quand la mesure ne
    // l'est pas — deux boîtes de 33 et un écart de 5,5 rendent 71,5, que le navigateur
    // donne pour 72. Exiger l'égalité ferait échouer la garde sur un arrondi.
    for (const [racine, aTrois, aDeux] of [[16, 80, 52], [19, 95, 62], [22, 110, 72]]) {
      expect(Math.abs(largeurDeLaRangee(3, racine) - aTrois)).toBeLessThanOrEqual(1)
      expect(Math.abs(largeurDeLaRangee(2, racine) - aDeux)).toBeLessThanOrEqual(1)
    }
    // ⚠️ Une rangée vide ne prend rien, et une seule cible n'a pas d'écart après elle.
    expect(largeurDeLaRangee(0, 16)).toBe(0)
    expect(largeurDeLaRangee(1, 16)).toBe(24)
  })
})

describe('les icônes accompagnent la PREMIÈRE ligne du titre', () => {
  it('la hauteur de ligne écrite est bien le corps par l’interligne', () => {
    expect(LIGNE_TITRE_VOLET_REM).toBeCloseTo(CORPS_TITRE_VOLET_REM * INTERLIGNE_TITRE_VOLET, 10)
  })

  it('décale la rangée de la moitié de ce que la cible dépasse de la ligne', () => {
    expect(ALIGNEMENT_ACTIONS).toBe('calc((1.1375rem - max(24px, 1.5rem)) / 2)')
    // Ce que le navigateur en tire : −2,9 px à la racine 16, −3,99 à la racine 22.
    const decalage = (racine: number) => (LIGNE_TITRE_VOLET_REM * racine - coteDUneCible(racine)) / 2
    expect(decalage(16)).toBeCloseTo(-2.9, 5)
    expect(decalage(22)).toBeCloseTo(-3.9875, 5)
  })

  it('la rangée s’aligne sur le haut, avec l’écart que le prédicat compte', () => {
    // ⛔ `center` centrerait les icônes sur la deuxième ligne d'un titre de trois.
    expect(STYLE_RANGEE_TETE_VOLET.alignItems).toBe('flex-start')
    expect(STYLE_RANGEE_TETE_VOLET.gap).toBe(`${ECART_TITRE_ACTIONS_PX}px`)
  })
})

// Mesures relevées écran par écran (`tmp/mesure-tete-rangee-entiere.mjs`) : le volet
// vaut clamp(240px, 16vw, 380px), et la tête en offre 32 de moins.
const PORTABLE = { dispo: 207, racine: 16 } // 1280 px, volet 239
const GRAND = { dispo: 274, racine: 19 } // 1920 px, volet 306
const TRES_GRAND = { dispo: 347, racine: 22 } // 2400 px et au-delà, volet 380

/** Largeur minimale RELEVÉE des titres (`tmp/mesure-mots-titres.html`) : le plus long mot,
 *  tel que le navigateur le compose. « Catéchèses mystagogiques » porte le plus long mot
 *  du corpus publié. */
const MOT = {
  mystagogiques: { portable: 99.13, grand: 113.98, tresGrand: 127.84 },
  ecclesiastique: { portable: 93.3, grand: 107.48, tresGrand: 120.84 },
  commentaire: { portable: 91.42, grand: 105.73, tresGrand: 119.3 },
  confessions: { portable: 80.06, grand: 92.64, tresGrand: 104.59 },
  seigneur: { portable: 59.13, grand: 68.27, tresGrand: 76.89 }, // Du corps et du sang du Seigneur
}

/** Ce que la rangée porte quand elle montre tout : les actions, plus le chevron. */
const LECTEUR = 4 // étoile, partage, extraction, chevron
const ADMIN = 5 // la roue crantée des niveaux d'affichage en plus

const juge = (ecran: typeof PORTABLE, motLePlusLong: number, ciblesDepliees = LECTEUR) =>
  condenserLaRangee({
    dispo: ecran.dispo, racine: ecran.racine, ciblesDepliees,
    titreMin: titreMinimal({ motLePlusLong, racine: ecran.racine }),
  })

describe('ce que le titre demande au moins', () => {
  it('le plancher l’emporte sur un mot court, le mot sur le plancher quand il le dépasse', () => {
    expect(TITRE_MIN_REM).toBe(5.5)
    expect(titreMinimal({ motLePlusLong: MOT.seigneur.portable, racine: 16 })).toBe(88)
    expect(titreMinimal({ motLePlusLong: MOT.mystagogiques.portable, racine: 16 })).toBe(100)
    expect(titreMinimal({ motLePlusLong: MOT.seigneur.tresGrand, racine: 22 })).toBe(121)
  })

  it('arrondit le mot au pixel supérieur : un demi-pixel de moins l’enroulerait', () => {
    expect(titreMinimal({ motLePlusLong: 120.01, racine: 16 })).toBe(121)
    expect(titreMinimal({ motLePlusLong: 120, racine: 16 })).toBe(120)
  })
})

describe('les symboles ont la priorité sur le titre, et ne cèdent que sur un petit écran', () => {
  it('montre les icônes d’un lecteur sur un portable dès que le titre garde son plancher', () => {
    // 88 de titre, 8 d'écart et 108 de cibles : 204 pour 207 offerts.
    expect(juge(PORTABLE, MOT.seigneur.portable)).toBe(false)
    expect(juge(PORTABLE, MOT.confessions.portable)).toBe(false)
  })

  it('condense sur un portable quand un mot du titre ne tient plus à côté des icônes', () => {
    // « Commentaire » demande 92 : 208 pour 207. ⛔ D'un seul pixel, et c'est pourquoi la
    // largeur minimale se mesure et ne se pose pas.
    expect(juge(PORTABLE, MOT.commentaire.portable)).toBe(true)
    expect(juge(PORTABLE, MOT.mystagogiques.portable)).toBe(true)
  })

  it('condense toujours la rangée de l’administrateur sur un portable', () => {
    // 88 + 8 + 136 = 232 pour 207 : même le plus court des titres n'y tient pas.
    expect(juge(PORTABLE, MOT.seigneur.portable, ADMIN)).toBe(true)
  })

  it('montre les icônes d’un lecteur à 1920 px, quel que soit le titre publié', () => {
    // Le plus long mot du corpus : 114 + 8 + 128,25 = 250,25 pour 274.
    expect(juge(GRAND, MOT.mystagogiques.grand)).toBe(false)
  })

  it('compte la roue de l’administrateur, qui coûte une cible de plus à 1920 px', () => {
    // À égalité, la rangée tient : 104,5 + 8 + 161,5 = 274 pour 274.
    expect(juge(GRAND, MOT.seigneur.grand, ADMIN)).toBe(false)
    expect(juge(GRAND, MOT.confessions.grand, ADMIN)).toBe(false)
    // « ecclésiastique » demande 108 : 277,5 pour 274.
    expect(juge(GRAND, MOT.ecclesiastique.grand, ADMIN)).toBe(true)
  })

  it('montre toute la rangée sur un très grand écran, administrateur compris', () => {
    // 128 + 8 + 187 = 323 pour 347 : les icônes de l'auteur du site ne cèdent plus.
    expect(juge(TRES_GRAND, MOT.mystagogiques.tresGrand, ADMIN)).toBe(false)
    expect(juge(TRES_GRAND, MOT.seigneur.tresGrand, ADMIN)).toBe(false)
  })

  it('ne reçoit RIEN de l’état qu’il commande — il ne peut donc pas osciller', () => {
    // ⛔ Le prédicat ne connaît que la place offerte, la largeur minimale du titre et le
    // nombre de cibles de la forme DÉPLIÉE : trois valeurs qu'on a toutes AVANT de rendre.
    for (const ecran of [PORTABLE, GRAND, TRES_GRAND]) {
      for (const mot of [30, 59, 80, 92, 100, 114, 128, 160]) {
        expect(juge(ecran, mot)).toBe(juge(ecran, mot))
        // Une cible de plus, ou un mot plus long, ne peut que rapprocher de la
        // condensation, jamais l'inverse.
        if (juge(ecran, mot, LECTEUR)) expect(juge(ecran, mot, ADMIN)).toBe(true)
        if (juge(ecran, mot)) expect(juge(ecran, mot + 10)).toBe(true)
      }
    }
  })
})
