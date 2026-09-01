import { describe, expect, it } from 'vitest'
import { calculerRang, couleurRang, DEGRES, NOMS_DEGRES, seuilDuDegre } from './classement'

// La garde du RANG. Il mesure la LECTURE depuis le 1er septembre 2026 : combien
// d'auteurs le lecteur a marqués, sur combien la bibliothèque en donne à lire.

const CORPUS = 15 // les auteurs lisibles au 1er septembre 2026

describe('les degrés', () => {
  it('en compte six, du premier au dernier', () => {
    // ⚠️ SIX et non trois : les anciens seuils laissaient un désert de 250 points
    // entre Disciple et Docteur, où le gradient ne joue plus.
    expect(NOMS_DEGRES).toEqual(['Catéchumène', 'Auditeur', 'Disciple', 'Familier', 'Lettré', 'Docteur'])
  })

  it('n’emprunte rien aux ordres sacrés, ni au mot que le site donne à tous', () => {
    // ⛔ Ce sont des états d'étude, non des degrés de cléricature. « Lecteur » est
    // écarté aussi : le site appelle déjà tout le monde ainsi (« Lecteur depuis 2026 »).
    for (const interdit of ['Lecteur', 'Acolyte', 'Sous-diacre', 'Diacre', 'Prêtre', 'Exorciste', 'Portier']) {
      expect(NOMS_DEGRES).not.toContain(interdit)
    }
  })

  it('tombe sur des paliers rapprochés, jamais plus de quatre pas', () => {
    // C'est la condition pour que le gradient de Kivetz joue : on n'accélère qu'à
    // l'approche, et un but à deux cent cinquante pas n'est pas une approche.
    const seuils = DEGRES.map(d => seuilDuDegre(d, CORPUS))
    expect(seuils).toEqual([0, 1, 3, 5, 8, 12])
    for (let i = 1; i < seuils.length; i++) {
      expect(seuils[i] - seuils[i - 1], `de ${DEGRES[i - 1].rang} à ${DEGRES[i].rang}`).toBeLessThanOrEqual(4)
    }
  })

  it('monte avec le corpus, et ne vieillit donc pas', () => {
    // ⛔ Un rang exprimé en nombre fixe deviendrait trivial à mesure que la
    // bibliothèque grandit. Exprimé en part, il garde la même exigence relative.
    expect(DEGRES.map(d => seuilDuDegre(d, 60))).toEqual([0, 1, 9, 18, 30, 45])
  })

  it('compte le premier pas en auteurs, non en pourcentage', () => {
    // Sans ce minimum, il faudrait déjà trois auteurs pour quitter le premier degré,
    // et le premier pas serait le plus long de tous.
    expect(seuilDuDegre(DEGRES[1], CORPUS)).toBe(1)
    expect(seuilDuDegre(DEGRES[1], 200)).toBe(1)
  })
})

describe('le rang d’un lecteur', () => {
  const rang = (n: number) => calculerRang(n, CORPUS).rang

  it('suit ce qu’il a retenu', () => {
    expect(rang(0)).toBe('Catéchumène')
    expect(rang(1)).toBe('Auditeur')
    expect(rang(2)).toBe('Auditeur')
    expect(rang(3)).toBe('Disciple')
    expect(rang(5)).toBe('Familier')
    expect(rang(8)).toBe('Lettré')
    expect(rang(12)).toBe('Docteur')
    expect(rang(15)).toBe('Docteur')
  })

  it('annonce le degré suivant et ce qu’il demande', () => {
    expect(calculerRang(0, CORPUS)).toMatchObject({ rangSuivant: 'Auditeur', seuilSuivant: 1, seuilPrecedent: 0 })
    expect(calculerRang(3, CORPUS)).toMatchObject({ rang: 'Disciple', rangSuivant: 'Familier', seuilSuivant: 5 })
    expect(calculerRang(12, CORPUS)).toMatchObject({ rang: 'Docteur', rangSuivant: null, seuilSuivant: null })
  })

  it('ne casse pas sur un corpus vide ou inconnu', () => {
    // ⚠️ Mieux vaut un rang modeste qu'une division par zéro sous un commentaire.
    for (const total of [0, -1, Number.NaN]) {
      expect(calculerRang(5, total).rang).toBe('Catéchumène')
      expect(calculerRang(5, total).rangSuivant).toBeNull()
    }
  })
})

describe('les couleurs', () => {
  it('donne une paire à chacun des six, sans teinte écrite en dur', () => {
    for (const nom of NOMS_DEGRES) {
      const c = couleurRang(nom)
      expect(c.fond, nom).toMatch(/var\(--cs-/)
      expect(c.texte, nom).toMatch(/^var\(--cs-/)
    }
  })
})
