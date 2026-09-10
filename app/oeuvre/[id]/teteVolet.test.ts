import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { condenserLaRangee, ecartDeCible, coteDUneCible, largeurDeLaRangee, pasDUneCible } from './TeteVolet'

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
// ⛔ ET LE PRÉDICAT NE DOIT PAS OSCILLER. Il commande une forme qui change la largeur
// des actions : s'il la MESURAIT, il recevrait sa propre réponse et la rangée battrait
// entre ses deux formes indéfiniment. Il ne reçoit donc que ce que la page sait AVANT
// de rendre — la place offerte, la chasse du nom, et le NOMBRE de cibles de la forme
// dépliée.
//
// ⚠️ TOUS LES NOMBRES CI-DESSOUS SONT RELEVÉS, jamais calculés : ils viennent de
// `tmp/mesure-tete-condensee.mjs` puis de `tmp/mesure-tete-rangee-entiere.mjs`, une
// iframe par écran, qui rendent la tête du volet avec les styles réels et lui font
// mesurer ses propres boîtes. ⛔ Les recalculer de tête est ce qui a fait écrire, le
// 2026-09-10 au matin, qu'« Augustin d'Hippone » se coupait à 1280 px : il y tenait,
// d'un pixel.

const CSS = readFileSync('app/globals.css', 'utf8')

describe('la mesure d’une cible est celle de la feuille', () => {
  it('la feuille pose bien le plancher et l’écart que le code recopie', () => {
    // ⚠️ Si l'une de ces deux lignes change, c'est `coteDUneCible` / `ecartDeCible`
    // qu'il faut suivre, jamais ce test qu'il faut accorder.
    expect(CSS).toContain('.cs-tete-volet-actions { display: flex; align-items: center; gap: max(4px, 0.25rem); flex-shrink: 0; }')
    expect(CSS).toContain('.cs-tete-volet-actions .etoile-favori { min-width: max(24px, 1.5rem); min-height: max(24px, 1.5rem); }')
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

// Mesures relevées écran par écran (`tmp/mesure-tete-rangee-entiere.mjs`) : le volet
// vaut clamp(240px, 16vw, 380px), et la tête en offre 32 de moins.
const PORTABLE = { dispo: 207, racine: 16 } // 1280 px, volet 239
const GRAND = { dispo: 274, racine: 19 } // 1920 px, volet 306
const TRES_GRAND = { dispo: 347, racine: 22 } // 2400 px et au-delà, volet 380

/** Chasse relevée des noms, flèche de la fiche et son blanc compris. */
const BESOIN = {
  pseudoJean: { portable: 164, grand: 192, tresGrand: 221 },
  gregoire: { portable: 133, grand: 156, tresGrand: 178 },
  augustin: { portable: 126, tresGrand: 168 },
  eusebe: { tresGrand: 159 },
  boece: { portable: 47, tresGrand: 60 },
}

/** Ce que la rangée porte quand elle montre tout : les actions, plus le chevron. */
const LECTEUR = 4 // étoile, partage, extraction, chevron
const ADMIN = 5 // la roue crantée des niveaux d'affichage en plus

const juge = (ecran: typeof PORTABLE, besoin: number, ciblesDepliees = LECTEUR) =>
  condenserLaRangee({ dispo: ecran.dispo, racine: ecran.racine, besoin, ciblesDepliees })

describe('la rangée montre tout, et ne cède que quand le nom n’a plus la place', () => {
  it('condense sur un portable, où cinq cibles prennent les deux tiers de la tête', () => {
    // 126 + 108 = 234 pour 207 offerts : même le plus commun des noms n'y tient pas.
    expect(juge(PORTABLE, BESOIN.augustin.portable)).toBe(true)
    expect(juge(PORTABLE, BESOIN.gregoire.portable)).toBe(true)
    expect(juge(PORTABLE, BESOIN.pseudoJean.portable)).toBe(true)
  })

  it('montre la rangée entière dès qu’un nom court la porte, fût-ce sur un portable', () => {
    // ⛔ On ne condense pas « par prudence » : ce serait cacher des icônes là où rien
    // ne l'exigeait, c'est-à-dire le défaut que la rectification du soir corrige.
    expect(juge(PORTABLE, BESOIN.boece.portable)).toBe(false)
  })

  it('rend les icônes dès que l’écran les porte', () => {
    // Le nom grandit avec la police racine, mais le volet grandit plus vite.
    expect(juge(TRES_GRAND, BESOIN.augustin.tresGrand)).toBe(false)
    expect(juge(TRES_GRAND, BESOIN.gregoire.tresGrand)).toBe(false)
    expect(juge(GRAND, BESOIN.gregoire.grand)).toBe(true)
  })

  it('condense encore le plus long nom du corpus, à tout écran', () => {
    // « Pseudo-Jean Chrysostome » demande 221 px quand la tête n'en offre que 198 une
    // fois la rangée posée. Il reste écrêté — et il n'y a rien de plus à lui rendre.
    expect(juge(TRES_GRAND, BESOIN.pseudoJean.tresGrand)).toBe(true)
    expect(juge(GRAND, BESOIN.pseudoJean.grand)).toBe(true)
    expect(juge(PORTABLE, BESOIN.pseudoJean.portable)).toBe(true)
  })

  it('compte la roue de l’administrateur, qui coûte une cible de plus', () => {
    // ⚠️ C'est le cas de l'auteur du site, et il se paie : sur un très grand écran,
    // « Augustin d'Hippone » porte la rangée entière en lecteur et la condense en
    // administrateur — 168 + 148,5 tient dans 347, 168 + 187 non.
    expect(juge(TRES_GRAND, BESOIN.augustin.tresGrand, LECTEUR)).toBe(false)
    expect(juge(TRES_GRAND, BESOIN.augustin.tresGrand, ADMIN)).toBe(true)
    // ⚠️ « Eusèbe de Césarée » la porte des DEUX côtés, et d'un seul pixel : 159 + 187
    // rend 346 pour 347 offerts. ⛔ C'est pourquoi le seuil se mesure et ne se pose pas.
    expect(juge(TRES_GRAND, BESOIN.eusebe.tresGrand, ADMIN)).toBe(false)
    expect(juge(TRES_GRAND, BESOIN.boece.tresGrand, ADMIN)).toBe(false)
  })

  it('ne reçoit RIEN de l’état qu’il commande — il ne peut donc pas osciller', () => {
    // ⛔ Le prédicat ne connaît que la place offerte, la chasse du nom et le nombre de
    // cibles de la forme DÉPLIÉE : trois valeurs qu'on a toutes AVANT de rendre. Aucune
    // ne dépend de la forme retenue, et la même demande rend donc toujours la même
    // réponse — c'est ce qui remplace l'ancienne épreuve « vu des deux états ».
    for (const ecran of [PORTABLE, GRAND, TRES_GRAND]) {
      for (const besoin of [40, 47, 126, 133, 156, 164, 192, 221, 300]) {
        expect(juge(ecran, besoin)).toBe(juge(ecran, besoin))
        // Une cible de plus ne peut que rapprocher de la condensation, jamais l'inverse.
        if (juge(ecran, besoin, LECTEUR)) expect(juge(ecran, besoin, ADMIN)).toBe(true)
      }
    }
  })
})
