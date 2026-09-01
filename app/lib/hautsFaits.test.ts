import { describe, expect, it } from 'vitest'
import {
  etatDesSeries, libelleRestant, mesureConnue, obtentionsNouvelles,
  serieLaPlusProche, seuilEffectif, casesDuTableau, score, palierAtteint, libellePalier,
  libelleProgression, type Compteurs, type Corpus, type HautFait,
} from './hautsFaits'

// La garde des HAUTS FAITS. Elle tient trois règles qui ont chacune une raison mesurée
// derrière elles, et qu'un réglage du référentiel pourrait défaire sans qu'on le voie.

const CORPUS: Corpus = { auteurs: 15, siecles: 7 }

const VIDE: Compteurs = {
  passages_retenus: 0, oeuvres_bibliotheque: 0, peres_retenus: 0,
  siecles_retenus: 0, commentaires_valides: 0, essais_publies: 0,
}

function hf(p: Partial<HautFait> & Pick<HautFait, 'code' | 'serie' | 'degre' | 'mesure'>): HautFait {
  return {
    serie_nom: p.serie, nom: p.code, notice: '', seuil: null, seuil_part: null, ordre: 0,
    points: 0, famille: 'ecriture', ...p,
  }
}

const REFERENTIEL: HautFait[] = [
  hf({ code: 'glane-1', serie: 'glane', degre: 1, mesure: 'passages_retenus', seuil: 1, ordre: 10 }),
  hf({ code: 'glane-2', serie: 'glane', degre: 2, mesure: 'passages_retenus', seuil: 10, ordre: 11 }),
  hf({ code: 'livres-1', serie: 'livres', degre: 1, mesure: 'oeuvres_bibliotheque', seuil: 1, ordre: 20 }),
  hf({ code: 'livres-2', serie: 'livres', degre: 2, mesure: 'oeuvres_bibliotheque', seuil: 5, ordre: 21 }),
  hf({ code: 'peres-4', serie: 'peres', degre: 4, mesure: 'peres_retenus', seuil_part: 0.75, ordre: 33 }),
]

describe('un seuil exprimé en part du corpus', () => {
  it('se recalcule sur le corpus du jour, arrondi vers le haut', () => {
    // ⛔ « Les trois quarts de quinze » font onze, non dix : arrondir vers le bas
    // rendrait le dernier degré plus facile que ce que le référentiel annonce.
    const dernier = REFERENTIEL.find(h => h.code === 'peres-4')!
    expect(seuilEffectif(dernier, CORPUS)).toBe(12)
    expect(seuilEffectif(dernier, { ...CORPUS, auteurs: 40 })).toBe(30)
    // ⚠️ C'est ce qui empêche un haut fait de devenir IMPOSSIBLE. Un palier écrit
    // « cinquante Pères » serait hors d'atteinte tant que le corpus n'en donne que
    // quinze, et un haut fait hors d'atteinte est un défaut, non un défi.
    expect(seuilEffectif(dernier, { ...CORPUS, auteurs: 2 })).toBe(2)
  })

  it('refuse de deviner plutôt que de poser un but faux', () => {
    // Une part sans total auquel se rapporter, ou un corpus vide.
    expect(seuilEffectif(hf({ code: 'x', serie: 's', degre: 1, mesure: 'essais_publies', seuil_part: 0.5 }), CORPUS)).toBeNull()
    expect(seuilEffectif(REFERENTIEL[4], { auteurs: 0, siecles: 0 })).toBeNull()
  })
})

describe('l’état des séries', () => {
  it('écarte une mesure que le code ne sait pas compter', () => {
    // Le référentiel se corrige librement en base : il ne doit pas pouvoir inventer
    // un compteur, ni faire tomber la page en en nommant un qui n'existe pas.
    expect(mesureConnue('passages_retenus')).toBe(true)
    expect(mesureConnue('pages_tournees')).toBe(false)
    const avecInconnue = [...REFERENTIEL, hf({ code: 'z-1', serie: 'z', degre: 1, mesure: 'pages_tournees', seuil: 1 })]
    expect(etatDesSeries(avecInconnue, VIDE, CORPUS, new Map()).map(s => s.serie)).not.toContain('z')
  })

  it('garde un degré obtenu même si le compteur redescend', () => {
    // ⛔ Le journal fait foi, jamais le compteur du jour : un lecteur qui supprime un
    // prélèvement ne perd pas ce qu'il avait acquis. Une perte démotive plus qu'un
    // gain ne motive.
    const journal = new Map([['glane-1', '2026-09-01T10:00:00Z']])
    const series = etatDesSeries(REFERENTIEL, VIDE, CORPUS, journal)
    const glane = series.find(s => s.serie === 'glane')!
    expect(glane.degres[0].obtenu).toBe(true)
    expect(glane.degres[0].obtenuLe).toBe('2026-09-01T10:00:00Z')
    expect(glane.prochain?.code).toBe('glane-2')
  })

  it('signale ce qui vient d’être atteint et que le journal ignore encore', () => {
    const compteurs = { ...VIDE, passages_retenus: 12 }
    const series = etatDesSeries(REFERENTIEL, compteurs, CORPUS, new Map())
    expect(obtentionsNouvelles(series, new Map()).sort()).toEqual(['glane-1', 'glane-2'])
    // Rien de neuf une fois le journal à jour.
    const journal = new Map([['glane-1', 'x'], ['glane-2', 'x']])
    expect(obtentionsNouvelles(etatDesSeries(REFERENTIEL, compteurs, CORPUS, journal), journal)).toEqual([])
  })
})

describe('la série mise en avant', () => {
  it('est celle dont le degré suivant est le PLUS PROCHE, toutes séries confondues', () => {
    // ⛔ C'est tout le mécanisme, et la réponse à l'effondrement mesuré par Anderson
    // et al. sur Stack Overflow : après une obtention, ce n'est pas le degré supérieur
    // de la même série qui reprend la main — il est loin —, c'est la série VOISINE.
    const compteurs = { ...VIDE, passages_retenus: 1, oeuvres_bibliotheque: 4 }
    const series = etatDesSeries(REFERENTIEL, compteurs, CORPUS, new Map())
    const glane = series.find(s => s.serie === 'glane')!
    const livres = series.find(s => s.serie === 'livres')!
    expect(glane.restant).toBe(9)   // le premier glané est acquis, dix sont loin
    expect(livres.restant).toBe(1)  // il ne manque qu'une œuvre
    expect(serieLaPlusProche(series)?.serie).toBe('livres')
  })

  it('ne met rien en avant quand toutes les séries sont achevées', () => {
    const tout = { ...VIDE, passages_retenus: 999, oeuvres_bibliotheque: 999, peres_retenus: 999 }
    expect(serieLaPlusProche(etatDesSeries(REFERENTIEL, tout, CORPUS, new Map()))).toBeNull()
  })
})

describe('ce qu’on annonce', () => {
  it('dit le reste, et non le chemin parcouru', () => {
    // ⚠️ Ici, contrairement au parcours d'entrée, le lecteur est déjà engagé : c'est
    // le petit reste qui porte (Koo et Fishbach), pas le compte de ce qui est fait.
    const series = etatDesSeries(REFERENTIEL, { ...VIDE, oeuvres_bibliotheque: 4 }, CORPUS, new Map())
    expect(libelleRestant(series.find(s => s.serie === 'livres')!)).toBe('Encore un.')
    const series2 = etatDesSeries(REFERENTIEL, { ...VIDE, oeuvres_bibliotheque: 2 }, CORPUS, new Map())
    expect(libelleRestant(series2.find(s => s.serie === 'livres')!)).toBe('Encore 3.')
  })
})

describe('le tableau de cases', () => {
  const AVEC_POINTS: HautFait[] = [
    hf({ code: 'g-1', serie: 'glane', degre: 1, mesure: 'passages_retenus', seuil: 1, points: 5, ordre: 10 }),
    hf({ code: 'g-2', serie: 'glane', degre: 2, mesure: 'passages_retenus', seuil: 10, points: 10, ordre: 11 }),
    hf({ code: 'g-3', serie: 'glane', degre: 3, mesure: 'passages_retenus', seuil: 50, points: 25, ordre: 12 }),
  ]

  it('porte un indice de progression sur chaque case non acquise', () => {
    // C'est ce que l'auteur demande : « 55 versets commentés sur 100 ». Une case terne
    // qui ne dit pas où l'on en est ne tracte rien.
    const [serie] = etatDesSeries(AVEC_POINTS, { ...VIDE, passages_retenus: 31 }, CORPUS, new Map())
    const cases = casesDuTableau([serie])
    expect(cases.map(c => libelleProgression(c))).toEqual(['1 passage sur 1', '10 passages sur 10', '31 passages sur 50'])
    expect(cases.map(c => c.obtenu)).toEqual([true, true, false])
  })

  it('dit le BUT seul tant que le compteur est à zéro', () => {
    // ⛔ « 0 passage sur 1 » est un constat d'échec, et un nouveau venu le lirait sur
    // ses vingt et une cases. On annonce ce qu'il y a à faire.
    const [serie] = etatDesSeries(AVEC_POINTS, VIDE, CORPUS, new Map())
    expect(casesDuTableau([serie]).map(c => libelleProgression(c)))
      .toEqual(['1 passage', '10 passages', '50 passages'])
  })

  it('borne la valeur au seuil, et garde pleine une case acquise', () => {
    // ⚠️ Sans bornage, une case obtenue afficherait « 200 / 50 » ; et une case dont le
    // compteur a redescendu afficherait « 3 / 50 » alors qu'elle est acquise à jamais.
    const [large] = etatDesSeries(AVEC_POINTS, { ...VIDE, passages_retenus: 200 }, CORPUS, new Map())
    expect(large.degres.map(c => c.valeur)).toEqual([1, 10, 50])

    const journal = new Map([['g-3', '2026-09-01T00:00:00Z']])
    const [redescendu] = etatDesSeries(AVEC_POINTS, { ...VIDE, passages_retenus: 3 }, CORPUS, journal)
    const troisieme = redescendu.degres.find(c => c.code === 'g-3')!
    expect(troisieme.obtenu).toBe(true)
    expect(libelleProgression(troisieme)).toBe('50 passages sur 50')
  })

  it('compte les points des seules cases acquises', () => {
    // ⛔ Le score ne s'échange contre rien : c'est une mesure, jamais une monnaie.
    const [serie] = etatDesSeries(AVEC_POINTS, { ...VIDE, passages_retenus: 31 }, CORPUS, new Map())
    expect(score([serie])).toEqual({ obtenus: 15, possibles: 40, cases: 2, total: 3 })
  })
})

describe('les paliers de progression', () => {
  const caseA = (seuil: number, valeur: number, journal = new Map<string, string>()) =>
    etatDesSeries(
      [hf({ code: 'x-1', serie: 'x', degre: 1, mesure: 'passages_retenus', seuil })],
      { ...VIDE, passages_retenus: valeur }, CORPUS, journal,
    )[0].degres[0]

  it('annonce le dernier pas, et la moitié du chemin', () => {
    expect(palierAtteint(caseA(10, 9))).toBe('dernier-pas')
    expect(palierAtteint(caseA(10, 5))).toBe('moitie')
    expect(libellePalier(caseA(10, 9), 'dernier-pas')).toBe('Plus qu’un pas avant « x-1 ».')
    expect(libellePalier(caseA(10, 5), 'moitie')).toBe('À mi-chemin de « x-1 » — 5 sur 10.')
  })

  it('ne dit RIEN tant qu’il n’y a rien à apprendre', () => {
    // ⛔ Une vignette à chaque geste serait insupportable, et une notification qu'on
    // subit cesse d'être lue.
    expect(palierAtteint(caseA(10, 1))).toBeNull()   // trop tôt
    expect(palierAtteint(caseA(10, 4))).toBeNull()   // pas encore la moitié
    expect(palierAtteint(caseA(1, 0))).toBeNull()    // « plus qu'un pas » dirait qu'on n'a rien fait
    expect(palierAtteint(caseA(2, 1))).toBe('dernier-pas')
  })

  it('sous quatre, la moitié ne se dit pas : elle tombe au premier geste', () => {
    // Sur un seuil de 3, la moitié est atteinte à 2, c'est-à-dire au dernier pas, et
    // les deux paliers se diraient coup sur coup.
    expect(palierAtteint(caseA(3, 2))).toBe('dernier-pas')
    expect(palierAtteint(caseA(4, 2))).toBe('moitie')
  })

  it('une case ACQUISE n’a plus de palier : elle a sa propre notification', () => {
    expect(palierAtteint(caseA(10, 10))).toBeNull()
  })
})
