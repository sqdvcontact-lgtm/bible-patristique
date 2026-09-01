import { describe, expect, it } from 'vitest'
import { etapesParcours, libelleAvancement, parcoursAcheve, type EtatLecteur } from './parcoursLecteur'

// La garde du PARCOURS D'ENTRÉE. Elle tient trois règles que rien d'autre ne vérifie,
// et dont deux ont une raison mesurée derrière elles.

const VIERGE: EtatLecteur = {
  marques: { versets: 0, peres: 0, oeuvres: 0, commentaires: 0, essais: 0 },
  aUnPortrait: false,
  aUneBio: false,
}

const TOUT: EtatLecteur = {
  marques: { versets: 1, peres: 1, oeuvres: 1, commentaires: 1, essais: 1 },
  aUnPortrait: true,
  aUneBio: true,
}

describe('les dix gestes', () => {
  it('en compte dix, et trois déjà acquis à l’arrivée', () => {
    // ⚠️ L'avance n'est pas décorative : Nunes et Drèze mesurent 34 % de complétion
    // sur une carte de dix cases dont deux sont pré-cochées, contre 19 % sur une carte
    // de huit cases vierges — à effort rigoureusement égal. Retirer ces trois lignes
    // reviendrait à proposer la carte de huit cases.
    const etapes = etapesParcours(VIERGE)
    expect(etapes).toHaveLength(10)
    expect(etapes.filter(e => e.acquise)).toHaveLength(3)
    expect(etapes.filter(e => e.fait)).toHaveLength(3)
    expect(etapes.slice(0, 3).every(e => e.acquise && e.fait)).toBe(true)
  })

  it('donne à chaque geste restant une glose et un endroit où le faire', () => {
    // Une étape sans glose est un ordre ; une étape sans lien est un reproche.
    for (const etape of etapesParcours(VIERGE).filter(e => !e.acquise)) {
      expect(etape.glose.length, etape.cle).toBeGreaterThan(20)
      expect(etape.href, etape.cle).toBeTruthy()
    }
  })

  it('coche chaque geste sur la marque qui lui correspond, et sur elle seule', () => {
    const cochees = (etat: EtatLecteur) => etapesParcours(etat).filter(e => e.fait).map(e => e.cle)
    expect(cochees(VIERGE)).toEqual(['compte', 'pseudo', 'accueil'])
    expect(cochees({ ...VIERGE, aUnPortrait: true })).toContain('portrait')
    expect(cochees({ ...VIERGE, aUneBio: true })).toContain('bio')
    // ⛔ Le verset et le Père sont DEUX gestes, sur deux types de prélèvement : c'est
    // la distinction que le parcours enseigne, et la confondre les cocherait ensemble.
    expect(cochees({ ...VIERGE, marques: { ...VIERGE.marques, versets: 3 } })).toContain('verset')
    expect(cochees({ ...VIERGE, marques: { ...VIERGE.marques, versets: 3 } })).not.toContain('pere')
    expect(cochees({ ...VIERGE, marques: { ...VIERGE.marques, peres: 1 } })).toContain('pere')
    expect(cochees(TOUT)).toHaveLength(10)
  })

  it('se termine, et ne revient jamais', () => {
    expect(parcoursAcheve(etapesParcours(VIERGE))).toBe(false)
    expect(parcoursAcheve(etapesParcours(TOUT))).toBe(true)
  })
})

describe('ce qu’on annonce en tête', () => {
  // ⚠️ La règle de Koo et Fishbach (« small-area hypothesis ») : on met en avant le
  // PLUS PETIT des deux nombres. Au début, ce qui est fait ; près du but, ce qui reste.
  const avecFaites = (n: number) => libelleAvancement(
    Array.from({ length: 10 }, (_, i) => ({ cle: `e${i}`, fait: i < n, libelle: '', glose: '', href: null })),
  )

  it('montre ce qui est ACCOMPLI tant qu’on est loin du bout', () => {
    expect(avecFaites(3)).toBe('3 sur 10.')
    expect(avecFaites(5)).toBe('5 sur 10.')
  })

  it('montre ce qui RESTE dès qu’on approche', () => {
    // C'est le moment où le lecteur décide d'aller au bout : « il vous en reste deux »
    // dit ce que « 8 sur 10 » ne dit pas.
    expect(avecFaites(8)).toBe('Il vous en reste 2.')
    expect(avecFaites(9)).toBe('Il vous en reste un.')
  })

  it('ne laisse pas le parcours achevé se dire en nombres', () => {
    expect(avecFaites(10)).toBe('Vous les avez tous faits.')
  })
})
