import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  colonneDesDates, comparerOeuvresAuteur, libelleDeDate, ordonnerOeuvresAuteur, type OeuvreDatee,
} from './listeOeuvresAuteur'

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

function oeuvre(titre: string, annee: number | null, libelle: string | null): OeuvreDatee {
  return { titre, composition_debut_annee: annee, date_composition_affichage_courte: libelle }
}

// Les vingt et une œuvres de Jean Chrysostome telles que `v_oeuvres_dates` les rend
// (relevé du 15 septembre 2026), dans un ordre quelconque.
const CHRYSOSTOME: OeuvreDatee[] = [
  oeuvre('Homélies sur la Genèse', null, 'IVe siècle'),
  oeuvre('Homélie contre les jeux du cirque et du théâtre', null, 'Vendredi saint, année non établie'),
  oeuvre('Six homélies sur Ozias ou les Séraphins', null, 'IVe siècle'),
  oeuvre('Commentaire sur les Psaumes', 371, 'Vers 371-398'),
  oeuvre('Homélie sur la parfaite charité', null, 'IVe siècle'),
  oeuvre('Homélies sur Anne', 386, 'Vers 386-403'),
  oeuvre('Commentaire sur Isaïe', null, 'IVe siècle'),
  oeuvre('Homélie sur Melchisédech', null, 'IVe siècle'),
  oeuvre('Discours sur la Genèse', 386, 'Vers 386'),
  oeuvre('Deux homélies sur l’obscurité des prophéties', null, 'IVe siècle'),
  oeuvre('Homélie pour la Nativité de Notre-Seigneur Jésus-Christ', null, 'IVe siècle'),
  oeuvre('La Divine Liturgie de saint Jean Chrysostome', 350, 'c. 350-800'),
  oeuvre('Deux homélies sur le Psaume 48', null, 'IVe siècle'),
  oeuvre('Homélie sur 2 Timothée 3, 1', null, 'IVe siècle'),
  oeuvre('Homélies au peuple d’Antioche', 387, '387'),
  oeuvre('Deux sermons sur la consolation de la mort', null, 'IVe siècle'),
  oeuvre('Homélie : Le Fils ne fait rien de lui-même', null, 'IVe siècle'),
  oeuvre('Homélie sur Isaïe 45, 7', null, 'IVe siècle'),
  oeuvre('Homélie sur Jérémie 10, 23', null, 'IVe siècle'),
  oeuvre('Homélie sur Joseph et la continence', null, 'IVe siècle'),
  oeuvre('Homélie sur la Grande Semaine', null, 'IVe siècle'),
]

describe('l’ordre de la liste des œuvres', () => {
  const ordre = ordonnerOeuvresAuteur(CHRYSOSTOME)

  it('les œuvres datées d’une année l’ouvrent, dans l’ordre des années', () => {
    expect(ordre.slice(0, 5).map(libelleDeDate)).toEqual(['c. 350-800', 'Vers 371-398', 'Vers 386', 'Vers 386-403', '387'])
  })

  it('une période suit, d’un seul tenant, et la mention qu’on ne sait pas dater vient après', () => {
    const libelles = ordre.map(libelleDeDate)
    expect(libelles.slice(5, 20)).toEqual(Array(15).fill('IVe siècle'))
    expect(libelles[20]).toBe('Vendredi saint, année non établie')
  })

  it('les œuvres d’une même période se rangent par titre', () => {
    const titres = ordre.slice(5, 20).map(o => o.titre)
    expect(titres[0]).toBe('Commentaire sur Isaïe')
    expect(titres[14]).toBe('Six homélies sur Ozias ou les Séraphins')
    expect(titres.indexOf('Homélie sur Melchisédech')).toBeLessThan(titres.indexOf('Homélies sur la Genèse'))
  })

  it('une période se range à sa place chronologique, les mentions sans repère après elle', () => {
    const cyrille = [
      oeuvre('E', null, 'Antiquité tardive'),
      oeuvre('D', null, 'Fin du IVe siècle'),
      oeuvre('C', null, 'IVe siècle'),
      oeuvre('B', 351, '351'),
      oeuvre('A', 348, 'Vers 348-350'),
    ]
    expect(ordonnerOeuvresAuteur(cyrille).map(libelleDeDate))
      .toEqual(['Vers 348-350', '351', 'IVe siècle', 'Fin du IVe siècle', 'Antiquité tardive'])
    expect(ordonnerOeuvresAuteur([oeuvre('x', null, 'IVe siècle'), oeuvre('y', null, 'Première moitié du IIIe siècle')]).map(libelleDeDate))
      .toEqual(['Première moitié du IIIe siècle', 'IVe siècle'])
  })

  it('une œuvre sans date ferme la liste', () => {
    const liste = [oeuvre('Sans date', null, null), oeuvre('Tardive', null, 'Antiquité tardive'), oeuvre('Datée', 400, '400')]
    expect(ordonnerOeuvresAuteur(liste).map(o => o.titre)).toEqual(['Datée', 'Tardive', 'Sans date'])
  })

  it('à année égale, le libellé départage avant le titre', () => {
    expect(comparerOeuvresAuteur(oeuvre('Z', 386, 'Vers 386'), oeuvre('A', 386, 'Vers 386-403'))).toBeLessThan(0)
    expect(comparerOeuvresAuteur(oeuvre('A', 406, '406'), oeuvre('B', 406, '406'))).toBeLessThan(0)
  })

  it('la liste reçue n’est pas touchée', () => {
    const copie = [...CHRYSOSTOME]
    ordonnerOeuvresAuteur(CHRYSOSTOME)
    expect(CHRYSOSTOME).toEqual(copie)
  })
})

describe('la colonne des dates', () => {
  it('une date qui redit la précédente se tait', () => {
    const colonne = colonneDesDates(ordonnerOeuvresAuteur(CHRYSOSTOME))
    const siecle = colonne.filter(c => c.libelle === 'IVe siècle')
    expect(siecle).toHaveLength(15)
    expect(siecle.filter(c => !c.repete)).toHaveLength(1)
    expect(colonne[5]).toEqual({ libelle: 'IVe siècle', repete: false })
    expect(colonne[20]).toEqual({ libelle: 'Vendredi saint, année non établie', repete: false })
  })

  it('la première rangée parle toujours', () => {
    expect(colonneDesDates([oeuvre('A', null, null)])).toEqual([{ libelle: '', repete: false }])
  })

  it('deux œuvres sans date qui se suivent ne redisent pas leur absence', () => {
    expect(colonneDesDates([oeuvre('A', null, null), oeuvre('B', null, '  ')]).map(c => c.repete)).toEqual([false, true])
  })

  it('le libellé se compare blancs resserrés', () => {
    expect(libelleDeDate(oeuvre('A', null, '  IVe   siècle '))).toBe('IVe siècle')
    expect(colonneDesDates([oeuvre('A', null, 'IVe siècle'), oeuvre('B', null, 'IVe  siècle')])[1].repete).toBe(true)
  })
})

describe('la fiche d’auteur passe par ce module', () => {
  const fiche = lire('../components/ModaleAuteur.tsx')

  it('elle ordonne et compose la colonne par lui, sans tri à elle', () => {
    expect(fiche).toContain('ordonnerOeuvresAuteur(')
    expect(fiche).toContain('colonneDesDates(')
    expect(fiche).not.toMatch(/\.sort\(parDate\)/)
  })

  it('une date tue reste dite à la synthèse vocale', () => {
    expect(fiche).toMatch(/repete\s*\?\s*<span className="cs-hors-ecran">/)
  })
})

describe('la colonne des dates dans la feuille', () => {
  const feuille = lire('../globals.css')
  const debut = feuille.indexOf('\n.cs-fiche-rangee-colonne > [data-fiche-colonne] {')
  const regle = feuille.slice(debut, feuille.indexOf('}', debut))

  it('une mention en prose passe sur deux lignes au lieu d’élargir la colonne', () => {
    expect(debut).toBeGreaterThan(-1)
    // 8,75 em : la plus longue mention du corpus en demande 8,7 pour tenir sur deux lignes.
    expect(regle).toContain('max-width: 8.75em;')
    expect(regle).toContain('text-wrap: balance;')
    expect(regle).not.toContain('white-space: nowrap')
  })
})
