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
    expect(LIBELLE_REPLIER_OUVRAGES).toBe('Afficher moins')
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

// ── LA CROIX DE FERMETURE, ET LES FILETS DU CORPS (2026-09-20) ─────────────────
// Relevé de l’auteur : « la croix de fermeture est immonde ; pas centrée » et « un trait
// passe sur la chronologie ». Les deux vivent dans le MODÈLE, donc les trois fiches en
// répondent ensemble.

describe('la croix de fermeture est un tracé, sans cercle', () => {
  const feuille = lire('../globals.css')
  const regle = feuille.slice(feuille.indexOf('.cs-fiche-fermer {'))
  const corps = regle.slice(0, regle.indexOf('}'))

  it('le modèle rend un tracé, et plus aucune fiche n’écrit le glyphe', () => {
    const modele = lire('../components/FicheModele.tsx')
    expect(modele).toContain("import IconeCroix from '@/app/components/IconeCroix'")
    expect(modele).toContain('<IconeCroix />')
    // ⛔ Le glyphe ne revient dans AUCUNE des trois fiches ni dans le modèle : il porte sa
    //    propre assise dans la police et ne se centre pas — c’est tout le motif du tracé.
    const GLYPHE = String.fromCodePoint(0x2715)
    for (const chemin of ['../components/FicheModele.tsx', '../components/ModaleAuteur.tsx',
      '../components/ModaleTraduction.tsx', '../oeuvre/[id]/FicheEdition.tsx']) {
      expect(lire(chemin).includes(GLYPHE)).toBe(false)
    }
  })

  it('ni cercle, ni filet, ni fond', () => {
    expect(corps).toContain('border: none')
    expect(corps).toContain('background: none')
    expect(corps).not.toContain('border-radius')
  })

  it('elle est verte, et son tracé se mesure en rem', () => {
    expect(corps).toContain('color: var(--cs-vert)')
    expect(feuille).toContain('.cs-fiche-fermer svg { width: 0.9375rem; height: 0.9375rem; }')
    expect(feuille).toContain('.cs-fiche-fermer:focus-visible { color: var(--cs-vert-fonce); }')
  })

  it('sa boîte reste une cible, et elle suit la police racine', () => {
    expect(corps).toContain('width: max(26px, 1.625rem)')
    expect(corps).toContain('height: max(26px, 1.625rem)')
  })
})

describe('aucun filet du corps ne traverse la colonne de droite', () => {
  // ⛔ Un bloc ORDINAIRE garde toute la mesure du corps : un flottant ne raccourcit que
  //    ses LIGNES, jamais sa boîte. Sa bordure passe donc sous le complément, et l’on voit
  //    un trait courir sur la chronologie. Tout ce qui pose un filet horizontal dans le
  //    corps d’une fiche doit faire CONTEXTE, et s’arrêter là où s’arrête le texte.
  // ⚠️ `.cs-fiche-complement` est la colonne elle-même : son seul filet horizontal vit
  //    dans la requête de média où elle reprend le flux, sous le texte. Exception NOMMÉE.
  const HORS_COLONNE = ['.cs-fiche-complement']
  const CONTEXTE = /display\s*:\s*(flow-root|flex|grid|inline-flex|inline-grid|table)/

  it('chaque filet horizontal est porté par un bloc qui fait contexte', () => {
    const feuille = lire('../globals.css')
    const regles = /([^{}]+)\{([^{}]*)\}/g
    const fautifs: string[] = []
    let m: RegExpExecArray | null
    while ((m = regles.exec(feuille))) {
      const lignes = m[1].trim().split('\n')
      const selecteur = (lignes[lignes.length - 1] ?? '').trim()
      if (!selecteur.includes('.cs-fiche-')) continue
      if (HORS_COLONNE.some(x => selecteur.includes(x))) continue
      const corps = m[2]
      if (/border-(top|bottom)\s*:\s*(?!none|0)/.test(corps) && !CONTEXTE.test(corps)) {
        fautifs.push(selecteur)
      }
    }
    expect(fautifs).toEqual([])
  })

  it('les repères de l’œuvre font contexte, une donnée par ligne', () => {
    const feuille = lire('../globals.css')
    const regle = feuille.slice(feuille.indexOf('.cs-fiche-identite {'))
    const corps = regle.slice(0, regle.indexOf('}'))
    expect(corps).toContain('display: flow-root')
    expect(corps).toContain('border-top')
  })
})

describe('les filets posés en STYLE EN LIGNE font contexte eux aussi', () => {
  // ⚠️ La feuille ne dit pas tout : trois filets horizontaux des fiches vivent dans un
  //    objet de style — la rangée « étiquette · valeur », la rangée empilée des colonnes
  //    étroites, et le pied de la fiche d’un auteur. La règle vaut pour eux comme pour
  //    les autres, et c’est ici qu’on la tient : un objet qui pose `borderTop` ou
  //    `borderBottom` pose aussi un `display` qui fait contexte.
  const FICHIERS = ['../components/FicheModele.tsx', '../components/ModaleAuteur.tsx',
    '../components/ModaleTraduction.tsx', '../oeuvre/[id]/FicheEdition.tsx']
  const CONTEXTE = /display:\s*'(flow-root|flex|grid|inline-flex|inline-grid|table)'/

  for (const chemin of FICHIERS) {
    it(`${chemin} : chaque filet horizontal en ligne fait contexte`, () => {
      const source = lire(chemin)
      const fautifs: string[] = []
      // L’objet de style qui porte le filet : on remonte à l’accolade ouvrante la plus
      // proche et l’on relit jusqu’à sa fermeture, accolades imbriquées comprises.
      const filets = /border(Top|Bottom):/g
      let m: RegExpExecArray | null
      while ((m = filets.exec(source))) {
        let debut = source.lastIndexOf('{{', m.index)
        if (debut < 0) debut = source.lastIndexOf('{', m.index)
        let profondeur = 0
        let fin = debut
        for (; fin < source.length; fin++) {
          if (source[fin] === '{') profondeur++
          else if (source[fin] === '}' && --profondeur === 0) break
        }
        const objet = source.slice(debut, fin + 1)
        if (!CONTEXTE.test(objet)) fautifs.push(objet.slice(0, 90))
      }
      expect(fautifs).toEqual([])
    })
  }
})
