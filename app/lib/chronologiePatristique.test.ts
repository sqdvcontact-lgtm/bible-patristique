import { describe, it, expect } from 'vitest'
import {
  anneeDeMention,
  anneeDeSiecle,
  anneeChronologique,
  comparerChronologie,
  type ClefChronologique,
} from './chronologiePatristique'

// ⚠️ Les valeurs de ce fichier ne sont pas inventées : ce sont les TRENTE-DEUX dates de
// composition distinctes du corpus au 2026-08-23, et les dates de mort et siècles des
// quinze auteurs publiés. Le relevé EST le test. Une valeur nouvelle en base qui ne
// tomberait pas juste ici doit être ajoutée, pas contournée dans le composant.

describe('anneeDeMention — années en chiffres', () => {
  it('rend l’année seule', () => {
    expect(anneeDeMention('197')).toBe(197)
    expect(anneeDeMention('351')).toBe(351)
    expect(anneeDeMention('403')).toBe(403)
    expect(anneeDeMention('406')).toBe(406)
  })

  it('rend la borne BASSE d’une fourchette', () => {
    expect(anneeDeMention('1265-1273')).toBe(1265)
    expect(anneeDeMention('396-397')).toBe(396)
    expect(anneeDeMention('419-420')).toBe(419)
    expect(anneeDeMention('413-426')).toBe(413)
  })

  it('accepte le tiret long et les espaces autour', () => {
    expect(anneeDeMention('413 – 426')).toBe(413)
  })

  it('traverse « vers », « c. » et « Carême »', () => {
    expect(anneeDeMention('Vers 248')).toBe(248)
    expect(anneeDeMention('Vers 378')).toBe(378)
    expect(anneeDeMention('Vers 386')).toBe(386)
    expect(anneeDeMention('Vers 524')).toBe(524)
    expect(anneeDeMention('Vers 348-350')).toBe(348)
    expect(anneeDeMention('Vers 397-401')).toBe(397)
    expect(anneeDeMention('Vers 428-430')).toBe(428)
    expect(anneeDeMention('Vers 843-850')).toBe(843)
    expect(anneeDeMention('c. 371-398')).toBe(371)
    expect(anneeDeMention('c. 386-403')).toBe(386)
    expect(anneeDeMention('Carême 387')).toBe(387)
  })

  it('traverse la prose qui suit ou qui précède', () => {
    expect(anneeDeMention('Entre 396 et 399')).toBe(396)
    expect(anneeDeMention('Entre 392 et 430, date précise inconnue')).toBe(392)
    expect(anneeDeMention('Vers 300-325 (Eusèbe) ; vers 402 (version et continuation de Rufin)')).toBe(300)
  })

  // ⛔ Le piège du corpus : le QUANTIÈME passerait pour l’année, et Noël 380 se
  // rangerait au Ier siècle, devant la Didachè.
  it('ne prend pas le quantième d’une date en toutes lettres', () => {
    expect(anneeDeMention('25 décembre 380')).toBe(380)
    expect(anneeDeMention('30 novembre 841-2 février 843')).toBe(841)
    expect(anneeDeMention('1er janvier 379')).toBe(379)
    expect(anneeDeMention('28 août 430')).toBe(430)
    expect(anneeDeMention('14 septembre 258')).toBe(258)
    expect(anneeDeMention('7 mars 1274')).toBe(1274)
    expect(anneeDeMention('30 septembre 420')).toBe(420)
  })

  it('lit « après » et « vers » des dates de mort', () => {
    expect(anneeDeMention('Après 220')).toBe(220)
    expect(anneeDeMention('Après 868')).toBe(868)
    expect(anneeDeMention('Vers 339-340')).toBe(339)
    expect(anneeDeMention('Vers 449')).toBe(449)
    expect(anneeDeMention('524')).toBe(524)
  })

  it('renonce quand la mention ne nomme aucune date', () => {
    expect(anneeDeMention('Antiquité tardive')).toBeNull()
    expect(anneeDeMention('Date non établie')).toBeNull()
    expect(anneeDeMention('Vendredi saint, année non établie')).toBeNull()
    expect(anneeDeMention('')).toBeNull()
    expect(anneeDeMention(null)).toBeNull()
    expect(anneeDeMention(undefined)).toBeNull()
  })
})

describe('anneeDeSiecle', () => {
  it('place un siècle en son milieu', () => {
    expect(anneeDeSiecle('IVe siècle')).toBe(350)
    expect(anneeDeSiecle('IIIe siècle')).toBe(250)
    expect(anneeDeSiecle('Ve siècle')).toBe(450)
    expect(anneeDeSiecle('IXe siècle')).toBe(850)
    expect(anneeDeSiecle('XIIIe siècle')).toBe(1250)
  })

  it('retient le PREMIER siècle d’un empan', () => {
    expect(anneeDeSiecle('IVe siècle-Ve siècle')).toBe(350)
    expect(anneeDeSiecle('Ier siècle-IIe siècle')).toBe(50)
    expect(anneeDeSiecle('IIe siècle-IIIe siècle')).toBe(150)
    expect(anneeDeSiecle('IIIe siècle-IVe siècle')).toBe(250)
    expect(anneeDeSiecle('Ve siècle-VIe siècle')).toBe(450)
    expect(anneeDeSiecle('Formation composite du IVe au VIIIe siècle ; attribution à Jean Chrysostome discutée')).toBe(350)
  })

  it('déplace le repère d’un quart de siècle selon le qualificatif', () => {
    expect(anneeDeSiecle('Fin du IVe siècle')).toBe(375)
    expect(anneeDeSiecle('Seconde moitié du Ier siècle-Première moitié du IIe siècle')).toBe(75)
    expect(anneeDeSiecle('Début du Ve siècle')).toBe(425)
    expect(anneeDeSiecle('Première moitié du IIIe siècle')).toBe(225)
  })

  // ⛔ Sans la casse imposée sur le chiffre romain, le « c » de « ce siècle » vaudrait
  // cent, et la mention se rangerait au centième siècle.
  it('ne prend pas un mot ordinaire pour un chiffre romain', () => {
    expect(anneeDeSiecle('un texte de ce siècle')).toBeNull()
    expect(anneeDeSiecle('Antiquité tardive')).toBeNull()
  })
})

describe('anneeChronologique — la cascade', () => {
  it('prend la date de l’œuvre quand elle se lit', () => {
    expect(anneeChronologique({
      dateComposition: 'Vers 397-401',
      auteurDateMort: '28 août 430',
      auteurSiecle: 'IVe siècle-Ve siècle',
    })).toBe(397)
  })

  it('retombe sur la mort de l’auteur quand l’œuvre n’est pas datée', () => {
    expect(anneeChronologique({
      dateComposition: 'Date non établie',
      auteurDateMort: '14 septembre 407',
      auteurSiecle: 'IVe siècle-Ve siècle',
    })).toBe(407)
    expect(anneeChronologique({
      dateComposition: 'Antiquité tardive',
      auteurDateMort: 'Vers 386',
      auteurSiecle: 'IVe siècle',
    })).toBe(386)
  })

  it('retombe sur le siècle de l’auteur en dernier recours', () => {
    expect(anneeChronologique({
      dateComposition: 'Vendredi saint, année non établie',
      auteurDateMort: null,
      auteurSiecle: 'IXe siècle',
    })).toBe(850)
  })

  it('rend null quand rien n’est datable', () => {
    expect(anneeChronologique({ dateComposition: 'Antiquité tardive' })).toBeNull()
    expect(anneeChronologique({})).toBeNull()
  })
})

describe('comparerChronologie', () => {
  const clef = (annee: number | null, auteur = 'A', oeuvre = 'O', numero = 1): ClefChronologique =>
    ({ annee, auteur, oeuvre, numero })

  it('range du plus ancien au plus récent', () => {
    const rendus = [clef(1265), clef(197), clef(430), clef(75)]
      .sort(comparerChronologie).map(c => c.annee)
    expect(rendus).toEqual([75, 197, 430, 1265])
  })

  it('ferme la marche sur une année inconnue', () => {
    const rendus = [clef(null), clef(1265), clef(197)]
      .sort(comparerChronologie).map(c => c.annee)
    expect(rendus).toEqual([197, 1265, null])
  })

  it('départage par auteur, sans se laisser prendre aux accents', () => {
    const rendus = [clef(400, 'Zosime'), clef(400, 'Élie'), clef(400, 'Basile')]
      .sort(comparerChronologie).map(c => c.auteur)
    expect(rendus).toEqual(['Basile', 'Élie', 'Zosime'])
  })

  it('puis par œuvre', () => {
    const rendus = [clef(400, 'A', 'Sermons'), clef(400, 'A', 'Homélies')]
      .sort(comparerChronologie).map(c => c.oeuvre)
    expect(rendus).toEqual(['Homélies', 'Sermons'])
  })

  it('puis par apparition dans l’œuvre', () => {
    const rendus = [clef(400, 'A', 'O', 42), clef(400, 'A', 'O', 7), clef(400, 'A', 'O', 19)]
      .sort(comparerChronologie).map(c => c.numero)
    expect(rendus).toEqual([7, 19, 42])
  })

  // C’est la raison d’être des deux rangs intermédiaires : sans eux, deux œuvres de la
  // même année s’entrelaceraient et la fusion des segments consécutifs perdrait ses paires.
  it('garde CONTIGUS les extraits d’une même œuvre à année égale', () => {
    const rendus = [
      clef(400, 'Jérôme', 'Commentaire sur Joël', 12),
      clef(400, 'Augustin', 'Les Confessions', 3),
      clef(400, 'Jérôme', 'Commentaire sur Joël', 4),
      clef(400, 'Augustin', 'Les Confessions', 9),
    ].sort(comparerChronologie).map(c => `${c.auteur}/${c.numero}`)
    expect(rendus).toEqual(['Augustin/3', 'Augustin/9', 'Jérôme/4', 'Jérôme/12'])
  })
})
