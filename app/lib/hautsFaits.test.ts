import { describe, expect, it } from 'vitest'
import {
  etatDesSeries, libelleRestant, mesureConnue, obtentionsNouvelles,
  serieLaPlusProche, seuilEffectif, type Compteurs, type Corpus, type HautFait,
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
    serie_nom: p.serie, nom: p.code, notice: '', seuil: null, seuil_part: null, ordre: 0, ...p,
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
