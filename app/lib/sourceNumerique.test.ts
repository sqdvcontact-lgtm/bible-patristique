import { describe, expect, it } from 'vitest'
import { hoteDeLAdresse, libelleSourceNumerique, nomDuSite } from './sourceNumerique'

// Les sept sources numériques du corpus au 2026-09-05, recopiées d'`editions_sources`.
const SOURCES: [string, string, string][] = [
  ['Gallica, Bibliothèque nationale de France — texte océrisé', 'https://gallica.bnf.fr/ark:/12148/bpt6k6532271m', 'Gallica, Bibliothèque nationale de France'],
  ['eBible.org — corpus BibleNLP, édition fra-fraLSG', 'https://github.com/BibleNLP/ebible', 'eBible.org'],
  ['Dépôt scrollmapper/bible_databases — texte FreCrampon', 'https://github.com/scrollmapper/bible_databases', 'Dépôt scrollmapper/bible_databases'],
  ['Clementine Vulgate Project — module CrossWire VulgClementine 2.0.1', 'https://ftp.crosswire.org/sword/modules/ModInfo.jsp?modName=VulgClementine', 'Clementine Vulgate Project'],
  ['Dépôt lxx-swete, d’après First1KGreek (Open Greek and Latin Project)', 'https://github.com/nathans/lxx-swete', 'Dépôt lxx-swete'],
  ['Gallica, Bibliothèque nationale de France — manuscrit Français 899', 'https://gallica.bnf.fr/ark:/12148/btv1b90068265', 'Gallica, Bibliothèque nationale de France'],
  ['AELF — texte biblique en ligne', 'https://www.aelf.org/bible', 'AELF'],
]

describe('nom du site d’une source numérique', () => {
  it.each(SOURCES)('%s', (nom, _url, attendu) => {
    expect(nomDuSite(nom)).toBe(attendu)
  })

  // ⛔ La virgule d’un nom propre n’est pas un séparateur : « Gallica, Bibliothèque
  //    nationale de France » se coupe au tiret, jamais à sa virgule.
  it('ne coupe pas à la virgule d’un nom', () => {
    expect(nomDuSite('Gallica, Bibliothèque nationale de France')).toBe('Gallica, Bibliothèque nationale de France')
  })

  it('accepte le demi-cadratin comme le cadratin', () => {
    expect(nomDuSite('AELF – texte biblique')).toBe('AELF')
  })

  // ⚠️ Un tiret COLLÉ appartient au nom : « Dépôt lxx-swete » n’a pas à se couper.
  it('ne coupe pas un tiret collé', () => {
    expect(nomDuSite('Dépôt lxx-swete')).toBe('Dépôt lxx-swete')
  })

  it('rend une chaîne vide sur rien', () => {
    expect(nomDuSite(null)).toBe('')
    expect(nomDuSite('   ')).toBe('')
  })

  it('rend la phrase entière plutôt que rien si la coupe ne laisse rien', () => {
    expect(nomDuSite('— texte océrisé')).toBe('— texte océrisé')
  })
})

describe('hôte d’une adresse', () => {
  it('retire le www', () => {
    expect(hoteDeLAdresse('https://www.aelf.org/bible')).toBe('aelf.org')
  })
  it('rend une chaîne vide sur une adresse qui n’en est pas une', () => {
    expect(hoteDeLAdresse('pas une adresse')).toBe('')
    expect(hoteDeLAdresse(null)).toBe('')
  })
})

describe('libellé de la rangée « Source numérique »', () => {
  // ⛔ L’hôte ne remplace jamais le nom : trois sources sur sept sont hébergées sur
  //    github.com, et le lecteur n’y reconnaîtrait aucun des trois sites.
  it('préfère le nom du site à l’hôte', () => {
    expect(libelleSourceNumerique('eBible.org — corpus BibleNLP, édition fra-fraLSG', 'https://github.com/BibleNLP/ebible')).toBe('eBible.org')
  })
  it('retombe sur l’hôte quand aucun nom n’est écrit', () => {
    expect(libelleSourceNumerique(null, 'https://gallica.bnf.fr/ark:/12148/x')).toBe('gallica.bnf.fr')
  })
  it('ne rend rien quand il n’y a ni nom ni adresse', () => {
    expect(libelleSourceNumerique(null, null)).toBe('')
  })
})
