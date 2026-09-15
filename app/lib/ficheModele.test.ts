import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { noticeDUnOuvrage, type OuvrageBibliographique } from './bibleBibliographieOuvrages'
import {
  identifiantsOuvrages, LIBELLE_REPLIER_OUVRAGES, libelleVoirPlus, ordonnerNotices,
  partagerOuvragesCites, SEUIL_OUVRAGES_CITES,
} from './ouvragesCitesChargement'
import { CADRES_PORTRAIT } from './photoAuteur'

// LE MODÈLE DES FICHES « À PROPOS » (2026-09-15) : une seule composition pour l'auteur,
// la traduction et l'édition, et la liste des ouvrages cités qui se replie au-delà de
// dix. Ces épreuves gardent les DÉCISIONS ; la forme vit dans globals.css.

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

function ouvrage(id: number, titre: string): OuvrageBibliographique {
  return { id, ordre: id, titre, sousTitre: null, lieu: null, editeur: null, annee: null, auteur: null }
}

describe('la liste des ouvrages cités se replie au-delà de dix', () => {
  const liste = Array.from({ length: 12 }, (_, i) => i + 1)

  it('le seuil est dix', () => {
    expect(SEUIL_OUVRAGES_CITES).toBe(10)
  })

  it('une liste de dix n’a rien à cacher', () => {
    expect(partagerOuvragesCites(liste.slice(0, 10), false))
      .toEqual({ visibles: liste.slice(0, 10), caches: 0, repliable: false })
  })

  it('onze entrées se replient sur les dix premières', () => {
    const r = partagerOuvragesCites(liste.slice(0, 11), false)
    expect(r.visibles).toEqual(liste.slice(0, 10))
    expect(r.caches).toBe(1)
    expect(r.repliable).toBe(true)
  })

  it('ouverte, la liste montre tout et reste repliable', () => {
    const r = partagerOuvragesCites(liste, true)
    expect(r.visibles).toEqual(liste)
    expect(r.caches).toBe(0)
    expect(r.repliable).toBe(true)
  })

  it('le seuil se règle', () => {
    const r = partagerOuvragesCites(liste, false, 3)
    expect(r.visibles).toEqual([1, 2, 3])
    expect(r.caches).toBe(9)
  })
})

describe('le bouton dit ce qu’il montrera', () => {
  it('en toutes lettres, et au masculin', () => {
    expect(libelleVoirPlus(1)).toBe('Afficher l’ouvrage restant')
    expect(libelleVoirPlus(2)).toBe('Afficher les deux autres ouvrages')
    // `enLettres` accorde au féminin : « vingt et une » ne se dit pas d'un ouvrage.
    expect(libelleVoirPlus(21)).toBe('Afficher les vingt et un autres ouvrages')
  })

  it('en chiffres au-delà de la table', () => {
    expect(libelleVoirPlus(54)).toBe('Afficher les 54 autres ouvrages')
  })

  it('se replie par une formule fixe', () => {
    expect(LIBELLE_REPLIER_OUVRAGES).toBe('Replier la liste')
  })
})

describe('les identifiants d’ouvrage', () => {
  it('lit les entiers et les chaînes de chiffres, sans doublon', () => {
    expect(identifiantsOuvrages([12, '12', ' 7 ', 3])).toEqual([12, 7, 3])
  })

  it('écarte ce qui n’est pas un entier positif', () => {
    expect(identifiantsOuvrages([null, undefined, 0, -4, 2.5, 'abc', '12a', '', Number.NaN])).toEqual([])
  })
})

describe('l’ordre des notices', () => {
  it('range par vedette, l’article initial écarté (charte § 47.3)', () => {
    const notices = [ouvrage(1, 'Zeta'), ouvrage(2, 'alpha'), ouvrage(3, 'Le Beta')].map(noticeDUnOuvrage)
    expect(ordonnerNotices(notices).map(n => n.titre)).toEqual(['alpha', 'Le Beta', 'Zeta'])
  })
})

describe('le portrait des fiches et le registre des cadres disent la même mesure', () => {
  const feuille = lire('../globals.css')
  const regle = (selecteur: string) => {
    const debut = feuille.indexOf(`\n${selecteur} {`)
    expect(debut).toBeGreaterThan(-1)
    return feuille.slice(debut, feuille.indexOf('}', debut))
  }

  it('la zone d’image a la largeur et le rapport du registre', () => {
    const fenetre = regle('.cs-fiche-portrait-fenetre')
    expect(fenetre).toContain(`width: ${CADRES_PORTRAIT.fiche.largeur};`)
    expect(fenetre).toContain('aspect-ratio: 2 / 3;')
    expect(parseFloat(CADRES_PORTRAIT.fiche.largeur) / parseFloat(CADRES_PORTRAIT.fiche.hauteur)).toBeCloseTo(2 / 3, 5)
  })

  it('le passe-partout a l’épaisseur du registre', () => {
    expect(regle('.cs-fiche-portrait')).toContain(`padding: ${CADRES_PORTRAIT.fiche.passePartout};`)
  })
})

describe('les trois fenêtres « À propos » prennent le modèle commun', () => {
  const fiches: Record<string, string> = {
    auteur: lire('../components/ModaleAuteur.tsx'),
    traduction: lire('../components/ModaleTraduction.tsx'),
    édition: lire('../oeuvre/[id]/FicheEdition.tsx'),
  }

  for (const [nom, source] of Object.entries(fiches)) {
    it(`la fiche de l’${nom} passe par ModaleFiche et CorpsFiche`, () => {
      expect(source).toContain('<ModaleFiche')
      expect(source).toContain('<CorpsFiche')
      // Le cadre, le verrou de défilement et la feuille ne se recomposent pas dans une fiche.
      // ⚠️ Sur l'APPEL et l'import, non sur le nom : les commentaires le citent.
      expect(source).not.toMatch(/createPortal\(|from 'react-dom'/)
      expect(source).not.toContain('verrouillerLeDefilement(')
      expect(source).not.toMatch(/<style>\{/)
    })
  }

  it('la page « Les traductions » rend le contenu de la fenêtre, avec ses données', () => {
    const page = lire('../traductions/AllerPlusLoinClient.tsx')
    expect(page).toContain('useDonneesFicheTraduction(')
    expect(page).toContain('<ContenuFicheTraduction')
    expect(page).not.toContain('dangerouslySetInnerHTML')
  })

  it('l’aperçu d’administration compose la notice comme la page', () => {
    const apercu = lire('../admin/SectionTraductions.tsx')
    expect(apercu).toContain('noticeEditorialeEnHtml(')
    expect(apercu).toContain('cs-fiche-notice')
    expect(apercu).not.toContain('trad-article')
  })

  it('la feuille ne porte plus la composition propre à la page', () => {
    const feuille = lire('../globals.css')
    expect(feuille).not.toContain('.trad-article')
    expect(feuille).not.toContain('.trad-notice')
    expect(feuille).not.toContain('.trad-fiche-encart')
  })
})
