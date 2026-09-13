import { describe, expect, it } from 'vitest'
import {
  appliquerDecisions,
  bilanRevue,
  calculerOuvragesFillionEnAttente,
  chapitreDepuisCanon,
  cleApresDecision,
  cleVoisine,
  decisionLocale,
  decisionsNonConfirmees,
  FILTRES_INITIAUX,
  filtrerIllustrations,
  INVENTAIRE_FILLION_A_COMPLETER,
  modeComparaisonEffectif,
  rangCanoniqueLivre,
  referenceIllustration,
  urlLectureFillion,
  type IllustrationFillionEnRevue,
} from './modele'

function illustration(surcharge: Partial<IllustrationFillionEnRevue> = {}): IllustrationFillionEnRevue {
  return {
    id: 'id-modius',
    cle: 'fillion-t07-mrk-p0219-i01',
    livre: 'MRK',
    pageSource: 219,
    pageImprimee: '203',
    canonDebut: 'MRK.4.21',
    canonFin: 'MRK.4.21',
    placement: 'after',
    blocEditorialCle: null,
    blocEditorialTitre: null,
    regime: 'vignette',
    partColonne: 0.4,
    legende: 'Modius ou boisseau romain',
    description: 'Un boisseau de bois cerclé',
    url: 'https://exemple.test/modius.webp?v=0123456789ab',
    largeur: 400,
    hauteur: 520,
    poids: 42000,
    demandeRelecture: true,
    temoin: null,
    traitementRevision: null,
    noteRevision: null,
    instructionRelecture: null,
    verrouilleeParAuteur: false,
    ...surcharge,
  }
}

const MODIUS = illustration()
const CREATION = illustration({
  id: 'id-creation',
  cle: 'fillion-t01-gen-p0012-i01',
  livre: 'GEN',
  canonDebut: 'GEN.2.7',
  canonFin: 'GEN.2.7',
  regime: 'hors-texte',
  legende: 'La création de l’homme',
  description: 'Planche gravée',
  demandeRelecture: false,
  verrouilleeParAuteur: true,
})

describe('revue des illustrations Fillion', () => {
  it('porte l’inventaire réconcilié des ouvrages publiés encore incomplets', () => {
    expect(INVENTAIRE_FILLION_A_COMPLETER).toHaveLength(23)
    expect(INVENTAIRE_FILLION_A_COMPLETER.reduce((somme, ouvrage) => somme + ouvrage.illustrations, 0)).toBe(500)
  })

  it('retire automatiquement de la file les lots déjà publiés', () => {
    const publiees = Array.from({ length: 8 }, () => ({ livre: 'TOB' }))
    const attente = calculerOuvragesFillionEnAttente(publiees)

    expect(attente).toHaveLength(22)
    expect(attente.some((ouvrage) => ouvrage.livre === 'TOB')).toBe(false)
    expect(attente.reduce((somme, ouvrage) => somme + ouvrage.illustrations, 0)).toBe(492)
  })

  it('retrouve le chapitre depuis une ancre canonique', () => {
    expect(chapitreDepuisCanon('EXO.12.3')).toBe(12)
    expect(chapitreDepuisCanon(null)).toBeNull()
    expect(chapitreDepuisCanon('matiere-liminaire')).toBeNull()
  })

  it('construit une adresse de lecture pointant exactement la figure', () => {
    expect(urlLectureFillion({ cle: 'fillion-t01-p0283-i01', livre: 'EXO', canonDebut: 'EXO.12.3' }))
      .toBe('/?livre=EXO&chapitre=12&trad=TR0010#illustration-fillion-t01-p0283-i01')
  })
})

describe('la liste de la revue', () => {
  it('nomme chaque image par sa référence lisible, et à défaut par son livre', () => {
    expect(referenceIllustration(MODIUS)).toBe('Marc 4, 21')
    expect(referenceIllustration({ livre: 'MRK', canonDebut: 'MRK.4.21', canonFin: 'MRK.4.25' })).toBe('Marc 4, 21-25')
    expect(referenceIllustration({ livre: 'MRK', canonDebut: null, canonFin: null })).toBe('Marc')
    expect(referenceIllustration({ livre: 'GEN', canonDebut: 'matiere-liminaire', canonFin: null })).toBe('Genèse')
  })

  it('range les livres dans l’ordre du canon, un code inconnu en dernier', () => {
    expect(rangCanoniqueLivre('GEN')).toBe(0)
    expect(rangCanoniqueLivre('1SA')).toBeLessThan(rangCanoniqueLivre('AMO'))
    expect(rangCanoniqueLivre('AMO')).toBeLessThan(rangCanoniqueLivre('MRK'))
    expect(rangCanoniqueLivre('XYZ')).toBe(Number.MAX_SAFE_INTEGER)
    expect(rangCanoniqueLivre(null)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('filtre par état, par livre et par régime', () => {
    const toutes = [MODIUS, CREATION]
    expect(filtrerIllustrations(toutes, FILTRES_INITIAUX)).toEqual([MODIUS])
    expect(filtrerIllustrations(toutes, { ...FILTRES_INITIAUX, statut: 'valide' })).toEqual([CREATION])
    expect(filtrerIllustrations(toutes, { ...FILTRES_INITIAUX, statut: 'tous' })).toEqual(toutes)
    expect(filtrerIllustrations(toutes, { ...FILTRES_INITIAUX, statut: 'tous', livre: 'GEN' })).toEqual([CREATION])
    expect(filtrerIllustrations(toutes, { ...FILTRES_INITIAUX, statut: 'tous', regime: 'vignette' })).toEqual([MODIUS])
  })

  it('cherche sans accents ni casse, jusque dans la référence lisible', () => {
    const toutes = [MODIUS, CREATION]
    const chercher = (recherche: string) => filtrerIllustrations(toutes, { ...FILTRES_INITIAUX, statut: 'tous', recherche })
    expect(chercher('CREATION')).toEqual([CREATION])
    expect(chercher('cerclé')).toEqual([MODIUS])
    expect(chercher('marc 4')).toEqual([MODIUS])
    expect(chercher('p0012')).toEqual([CREATION])
    expect(chercher('   ')).toEqual(toutes)
  })

  it('tient le bilan de la revue', () => {
    expect(bilanRevue([MODIUS, CREATION])).toEqual({ total: 2, aValider: 1, validees: 1, livres: 2 })
  })
})

describe('la circulation dans la revue', () => {
  const liste = [{ cle: 'a' }, { cle: 'b' }, { cle: 'c' }]

  it('passe à la voisine, et s’arrête aux bords', () => {
    expect(cleVoisine(liste, 'b', 1)).toBe('c')
    expect(cleVoisine(liste, 'b', -1)).toBe('a')
    expect(cleVoisine(liste, 'c', 1)).toBeNull()
    expect(cleVoisine(liste, 'a', -1)).toBeNull()
    expect(cleVoisine(liste, 'disparue', 1)).toBe('a')
    expect(cleVoisine([], 'a', 1)).toBeNull()
  })

  it('va à la suivante après une décision, à la précédente au bout de la liste', () => {
    expect(cleApresDecision(liste, 'b')).toBe('c')
    expect(cleApresDecision(liste, 'c')).toBe('b')
    expect(cleApresDecision([{ cle: 'seule' }], 'seule')).toBeNull()
    expect(cleApresDecision(liste, 'disparue')).toBeNull()
  })
})

describe('les décisions prises dans la revue', () => {
  it('écrit localement ce que la route écrit en base', () => {
    expect(decisionLocale('validated', 'ignorée')).toEqual({ demandeRelecture: false, instructionRelecture: null, verrouilleeParAuteur: true })
    expect(decisionLocale('review', '  Redresser la planche  ')).toEqual({ demandeRelecture: true, instructionRelecture: 'Redresser la planche', verrouilleeParAuteur: false })
  })

  it('montre la décision tout de suite, et rend la liste reçue quand il n’y en a pas', () => {
    const toutes = [MODIUS, CREATION]
    expect(appliquerDecisions(toutes, {})).toBe(toutes)
    const vues = appliquerDecisions(toutes, { [MODIUS.id]: decisionLocale('validated', null) })
    expect(vues[0].demandeRelecture).toBe(false)
    expect(vues[0].verrouilleeParAuteur).toBe(true)
    expect(vues[1]).toBe(CREATION)
  })

  it('oublie une décision dès que le serveur la confirme', () => {
    const decisions = {
      [MODIUS.id]: decisionLocale('validated', null),
      [CREATION.id]: decisionLocale('review', 'Reprendre le cadrage'),
      'id-inconnu': decisionLocale('validated', null),
    }
    const confirmee = { ...MODIUS, demandeRelecture: false, verrouilleeParAuteur: true }
    expect(decisionsNonConfirmees(decisions, [confirmee, CREATION])).toEqual({
      [CREATION.id]: decisionLocale('review', 'Reprendre le cadrage'),
    })
  })

  it('ne met rien en regard d’une image sans témoin', () => {
    expect(modeComparaisonEffectif('cote-a-cote', false)).toBe('apres')
    expect(modeComparaisonEffectif('avant', true)).toBe('avant')
  })
})
