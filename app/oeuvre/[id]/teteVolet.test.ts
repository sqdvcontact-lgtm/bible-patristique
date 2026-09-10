import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { condenserLaRangee, pasDUneCible } from './TeteVolet'

// ── LA GARDE DE LA RANGÉE D'ACTIONS D'UN VOLET ───────────────────────────────
//
// Deux choses à tenir, et elles ne se voient ni l'une ni l'autre à la lecture.
//
// ⛔ LA MESURE EST ÉCRITE DEUX FOIS, dans la feuille et dans le code. Il le faut :
// la feuille POSE la géométrie, le code la CALCULE avant le rendu pour choisir la
// forme. Deux copies d'une même mesure divergent au premier réglage, et la rangée
// composerait alors sur une largeur que la feuille ne lui donne pas — c'est
// exactement la garde que `partIllustration.test.ts` tient entre la page et la
// chaîne d'images.
//
// ⛔ ET LE PRÉDICAT NE DOIT PAS OSCILLER. Il commande une forme qui change la
// largeur des actions, donc une de ses propres entrées : s'il n'est pas indépendant
// de l'état, la rangée bat entre ses deux formes indéfiniment. On l'éprouve donc
// sur les MÊMES mesures vues des deux états.
//
// ⚠️ TOUS LES NOMBRES CI-DESSOUS SONT RELEVÉS, jamais calculés : ils viennent de
// `tmp/mesure-tete-condensee.mjs`, une iframe par écran, qui rend la tête du volet
// avec les styles réels et lui fait mesurer ses propres boîtes. ⛔ Les recalculer de
// tête est ce qui a fait écrire, le matin même, qu'« Augustin d'Hippone » se coupait
// à 1280 px : il y tenait, d'un pixel.

const CSS = readFileSync('app/globals.css', 'utf8')

describe('la mesure d’une cible est celle de la feuille', () => {
  it('la feuille pose bien le plancher et l’écart que le code recopie', () => {
    // ⚠️ Si l'une de ces deux lignes change, c'est `pasDUneCible` qu'il faut suivre,
    // jamais ce test qu'il faut accorder.
    expect(CSS).toContain('.cs-tete-volet-actions { display: flex; align-items: center; gap: max(4px, 0.25rem); flex-shrink: 0; }')
    expect(CSS).toContain('.cs-tete-volet-actions .etoile-favori { min-width: max(24px, 1.5rem); min-height: max(24px, 1.5rem); }')
  })

  it('rend le plancher absolu en bas d’échelle et le rem au-dessus', () => {
    // Racine 16 (portable) : le plancher de WCAG l'emporte, 24 + 4.
    expect(pasDUneCible(16)).toBe(28)
    // Racine 19 (1920 px) : 1,5 rem passe devant, 28,5 + 4,75.
    expect(pasDUneCible(19)).toBeCloseTo(33.25, 5)
    // Racine 22 (le plafond de la police fluide) : 33 + 5,5.
    expect(pasDUneCible(22)).toBeCloseTo(38.5, 5)
  })

  it('s’accorde à ce que le navigateur rend vraiment', () => {
    // Écart RELEVÉ entre les deux formes de la rangée, dans le navigateur, aux trois
    // racines de l'échelle : 80 − 52, 95 − 62, 110 − 72.
    // ⚠️ À UN PIXEL PRÈS, et il le faut : `clientWidth` est un ENTIER, quand la mesure
    // ne l'est pas — trois boîtes de 33 et deux écarts de 5,5 rendent 110 tout rond, mais
    // deux boîtes et un écart rendent 71,5, que le navigateur donne pour 72. Exiger
    // l'égalité ferait échouer la garde sur un arrondi et non sur une divergence.
    for (const [racine, ecart] of [[16, 80 - 52], [19, 95 - 62], [22, 110 - 72]]) {
      expect(Math.abs(pasDUneCible(racine) - ecart)).toBeLessThanOrEqual(1)
    }
  })
})

// Mesures relevées écran par écran : la tête offre `dispo`, la rangée d'actions prend
// `deplie` avec l'étoile et `condense` sans elle.
const PORTABLE = { dispo: 207, racine: 16, deplie: 80, condense: 52 } // 1280 px, volet 239
const GRAND = { dispo: 274, racine: 19, deplie: 95, condense: 62 } // 1920 px, volet 306
const TRES_GRAND = { dispo: 347, racine: 22, deplie: 110, condense: 72 } // 2560 px, volet 379

/** Chasse relevée des noms, flèche de la fiche et son blanc compris. */
const BESOIN = {
  pseudoJean: { portable: 164, grand: 192, tresGrand: 221 },
  gregoire: { portable: 133, grand: 156 },
  augustin: { portable: 126 },
  boece: { portable: 47 },
}

const juge = (ecran: typeof PORTABLE, besoin: number) => condenserLaRangee({
  dispo: ecran.dispo, racine: ecran.racine, besoin, largeurActions: ecran.deplie, etoileDehors: true,
})

describe('la rangée condense quand le nom n’a plus la place', () => {
  it('condense sur un portable pour les noms qui s’y coupaient', () => {
    expect(juge(PORTABLE, BESOIN.gregoire.portable)).toBe(true)
    expect(juge(PORTABLE, BESOIN.pseudoJean.portable)).toBe(true)
  })

  it('ne condense pas là où le nom tenait déjà, fût-ce d’un pixel', () => {
    // 126 + 80 = 206 pour 207 offerts. ⛔ On ne condense pas « par prudence » : ce
    // serait retirer l'étoile là où rien ne l'exigeait.
    expect(juge(PORTABLE, BESOIN.augustin.portable)).toBe(false)
    expect(juge(PORTABLE, BESOIN.boece.portable)).toBe(false)
  })

  it('rend l’étoile dès que l’écran la porte', () => {
    // Le nom grandit avec la police racine, mais le volet grandit plus vite : un seuil
    // posé aurait condensé ici sans nécessité.
    expect(juge(GRAND, BESOIN.gregoire.grand)).toBe(false)
    // Le plus long nom du corpus condense encore à 1920, et tient à 2560.
    expect(juge(GRAND, BESOIN.pseudoJean.grand)).toBe(true)
    expect(juge(TRES_GRAND, BESOIN.pseudoJean.tresGrand)).toBe(false)
  })

  it('condense ce qui reste coupé, parce qu’une chance de tenir vaut mieux qu’aucune', () => {
    // « Pseudo-Jean Chrysostome » sur un portable : 164 px pour 155 une fois la rangée
    // condensée. Il reste écrêté — mais de neuf pixels au lieu de vingt-sept, et il n'y
    // a rien de plus à lui rendre.
    expect(PORTABLE.dispo - PORTABLE.condense).toBeLessThan(BESOIN.pseudoJean.portable)
    expect(PORTABLE.dispo - PORTABLE.deplie).toBeLessThan(PORTABLE.dispo - PORTABLE.condense)
  })

  it('rend la MÊME réponse vue des deux états — il ne peut donc pas osciller', () => {
    for (const ecran of [PORTABLE, GRAND, TRES_GRAND]) {
      for (const besoin of [40, 47, 126, 133, 156, 164, 192, 221, 300]) {
        const depuisDeplie = condenserLaRangee({
          dispo: ecran.dispo, racine: ecran.racine, besoin, largeurActions: ecran.deplie, etoileDehors: true,
        })
        const depuisCondense = condenserLaRangee({
          dispo: ecran.dispo, racine: ecran.racine, besoin, largeurActions: ecran.condense, etoileDehors: false,
        })
        expect(depuisCondense).toBe(depuisDeplie)
      }
    }
  })
})
