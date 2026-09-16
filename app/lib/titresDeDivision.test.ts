import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUCUN_TITRE_MONTRE,
  montreUnTitre,
  niveauxDuSegment,
  passagesQuiOuvrentUnTitre,
  titreEntrePassages,
  titresDuGroupe,
  type NiveauxDuPassage,
} from './titresDeDivision'

const n = (niv1 = '', niv2 = '', niv3 = '', niv4 = ''): NiveauxDuPassage => ({ niv1, niv2, niv3, niv4 })
const ordinaire = (profondeur: number) => ({ profondeur, niveau1DansLeCorps: false })
const texteEntier = (profondeur: number) => ({ profondeur, niveau1DansLeCorps: true })

describe('niveauxDuSegment', () => {
  it('dit le vide par une chaîne vide', () => {
    expect(niveauxDuSegment({ ref_niv1: 'Livre I', ref_niv2: null })).toEqual(n('Livre I'))
  })
})

describe('titresDuGroupe — la règle du rendu', () => {
  it('ne compose le niveau 1 que dans le corps du texte entier', () => {
    expect(titresDuGroupe(n('Livre I'), AUCUN_TITRE_MONTRE, ordinaire(4)).niv1).toBe(false)
    expect(titresDuGroupe(n('Livre I'), AUCUN_TITRE_MONTRE, texteEntier(1)).niv1).toBe(true)
  })

  it('⛔ ne compose rien au-delà de la profondeur de l’œuvre', () => {
    const groupe = n('Livre I', 'Chapitre 2', 'Article 3')
    expect(montreUnTitre(titresDuGroupe(groupe, n('Livre I', 'Chapitre 1', 'Article 1'), ordinaire(1)))).toBe(false)
    const deux = titresDuGroupe(groupe, n('Livre I', 'Chapitre 1', 'Article 1'), ordinaire(2))
    expect([deux.niv2, deux.niv3]).toEqual([true, false])
  })

  it('ne répète pas le titre qu’on vient de montrer, et un niveau vide ne compose rien', () => {
    const montres = n('Livre I', 'Chapitre 1')
    expect(montreUnTitre(titresDuGroupe(n('Livre I', 'Chapitre 1'), montres, texteEntier(2)))).toBe(false)
    expect(montreUnTitre(titresDuGroupe(n('Livre I', ''), montres, texteEntier(2)))).toBe(false)
  })

  it('⚠️ décide sur l’état d’AVANT, puis un titre de niveau 1 remet les suivants à zéro', () => {
    const t = titresDuGroupe(n('Livre II', 'Chapitre 1'), n('Livre I', 'Chapitre 1'), texteEntier(2))
    expect([t.niv1, t.niv2]).toEqual([true, false])
    expect(t.montres).toEqual(n('Livre II'))
  })
})

describe('passagesQuiOuvrentUnTitre — la page', () => {
  const groupes = [
    { ...n('Livre I', 'Chapitre 1'), itemIds: [1, 2] },
    { ...n('Livre I', 'Chapitre 1', 'Article 2'), itemIds: [3, 4] },
    { ...n('Livre I', 'Chapitre 2'), itemIds: [5] },
  ]

  it('rend le premier passage des groupes qui composent un titre, en tête de page compris', () => {
    expect([...passagesQuiOuvrentUnTitre(groupes, AUCUN_TITRE_MONTRE, ordinaire(2))]).toEqual([1, 5])
    expect([...passagesQuiOuvrentUnTitre(groupes, AUCUN_TITRE_MONTRE, ordinaire(3))]).toEqual([1, 3, 5])
  })

  it('saute ce que la page ne rend pas, et un groupe vide ne change rien', () => {
    const intros = new Set([1, 2, 3])
    const rendus = passagesQuiOuvrentUnTitre(groupes, AUCUN_TITRE_MONTRE, ordinaire(3), id => !intros.has(id))
    expect([...rendus]).toEqual([4, 5])
  })

  it('reprend l’état de la page précédente pour le niveau 1', () => {
    const suite = [{ ...n('Livre I', ''), itemIds: [7] }]
    expect(passagesQuiOuvrentUnTitre(suite, n('Livre I'), texteEntier(1)).size).toBe(0)
    expect(passagesQuiOuvrentUnTitre(suite, n('Préface'), texteEntier(1)).size).toBe(1)
  })
})

describe('titreEntrePassages — hors de la page', () => {
  it('⛔ ne sait rien sans la profondeur ni sans tous les maillons', () => {
    expect(titreEntrePassages([n('Livre I'), n('Livre I')], undefined)).toBeNull()
    expect(titreEntrePassages([n('Livre I'), undefined, n('Livre I')], 2)).toBeNull()
  })

  it('laisse passer deux passages d’une même division', () => {
    expect(titreEntrePassages([n('Livre I', 'Chapitre 1'), n('Livre I', 'Chapitre 1')], 2)).toBe(false)
  })

  it('⛔ coupe toujours au changement de niveau 1', () => {
    expect(titreEntrePassages([n('Livre I'), n('Livre II')], 1)).toBe(true)
    expect(titreEntrePassages([n('Livre I'), n('Livre II')], null)).toBe(true)
  })

  it('⛔ ne coupe pas à un titre que la page ne montre pas', () => {
    const chaine = [n('Livre I', 'Chapitre 1'), n('Livre I', 'Chapitre 2')]
    expect(titreEntrePassages(chaine, 1)).toBe(false)
    expect(titreEntrePassages(chaine, null)).toBe(false)
    expect(titreEntrePassages(chaine, 2)).toBe(true)
  })

  it('trouve le titre dans l’écart, non seulement aux deux bouts', () => {
    const chaine = [n('Livre I', 'Chapitre 1'), n('Livre I', 'Chapitre 2'), n('Livre I', 'Chapitre 2')]
    expect(titreEntrePassages(chaine, 2)).toBe(true)
  })

  it('ne voit pas de titre dans un niveau vide', () => {
    expect(titreEntrePassages([n('Livre I', 'Chapitre 1'), n('Livre I', '')], 2)).toBe(false)
  })
})

describe('titresDuGroupe rend exactement ce que rendait la page', () => {
  // L'écriture que la page portait EN LIGNE jusqu'au 16 septembre 2026, recopiée telle quelle.
  function ancienneEcriture(groupes: NiveauxDuPassage[], depart: string, profondeur: number, texteEntierActif: boolean) {
    let dniv1 = depart
    let dniv2 = '', dniv3 = '', dniv4 = ''
    return groupes.map(groupe => {
      const showNiv1 = texteEntierActif && profondeur >= 1 && groupe.niv1 && groupe.niv1 !== dniv1
      const showNiv2 = profondeur >= 2 && groupe.niv2 && groupe.niv2 !== dniv2
      const showNiv3 = profondeur >= 3 && groupe.niv3 && groupe.niv3 !== dniv3
      const showNiv4 = profondeur >= 4 && groupe.niv4 && groupe.niv4 !== dniv4
      if (showNiv1) {
        dniv1 = groupe.niv1
        dniv2 = ''
        dniv3 = ''
        dniv4 = ''
      }
      if (showNiv2) dniv2 = groupe.niv2
      if (showNiv3) dniv3 = groupe.niv3
      if (showNiv4) dniv4 = groupe.niv4
      return [Boolean(showNiv1), Boolean(showNiv2), Boolean(showNiv3), Boolean(showNiv4)]
    })
  }

  it('sur mille suites tirées au hasard, à toutes les profondeurs', () => {
    // ⚠️ Un générateur en entiers 32 bits (mulberry32) : une congruence calculée en
    // flottants perd ses bits bas au-delà de 2^53, et ne tirait plus que des zéros.
    let graine = 20260916
    const hasard = (n: number) => {
      graine = (graine + 0x6d2b79f5) | 0
      let t = Math.imul(graine ^ (graine >>> 15), 1 | graine)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n)
    }
    const valeurs = ['', 'A', 'B', 'C']
    for (let essai = 0; essai < 1000; essai += 1) {
      const groupes = Array.from({ length: 1 + hasard(12) }, () =>
        n(valeurs[hasard(4)], valeurs[hasard(4)], valeurs[hasard(4)], valeurs[hasard(4)]))
      const depart = valeurs[hasard(4)]
      for (const profondeur of [1, 2, 3, 4]) {
        for (const entier of [false, true]) {
          let montres: NiveauxDuPassage = { ...AUCUN_TITRE_MONTRE, niv1: depart }
          const nouvelle = groupes.map(groupe => {
            const t = titresDuGroupe(groupe, montres, { profondeur, niveau1DansLeCorps: entier })
            montres = t.montres
            return [t.niv1, t.niv2, t.niv3, t.niv4]
          })
          expect(nouvelle).toEqual(ancienneEcriture(groupes, depart, profondeur, entier))
        }
      }
    }
  })
})

describe('⛔ une seule écriture de la règle', () => {
  it('la page de lecture compose ses titres par titresDuGroupe', () => {
    const source = readFileSync('app/oeuvre/[id]/OeuvreClient.tsx', 'utf8')
    expect(source).toContain('titresDuGroupe(groupe, montres, reglageDesTitres)')
    expect(source).not.toMatch(/showNiv2 = profondeurCorps >= 2/)
  })
})
