import { describe, expect, it } from 'vitest'
import { sigleTraduction, siglesTraductions } from './sigleTraduction'

// Les noms RÉELS de la table `traductions` au 2026-08-28, `est_biblique` compris. Ils sont
// le vrai cahier des charges de la règle : elle n'existe que pour eux.
const NOMS_DU_CORPUS = [
  'Bible de Sacy',
  'Bible Segond',
  'Bible Crampon',
  'Vulgate clémentine',
  'Septante de Swete',
  'Bible française du XIIIe siècle',
  'Bible Fillion',
  'Vulgate latine (Fillion)',
  'Traduction officielle liturgique (AELF)',
]

describe('sigleTraduction', () => {
  it('retient le nom du traducteur', () => {
    expect(sigleTraduction('Bible de Sacy')).toBe('Sacy')
    expect(sigleTraduction('Bible Segond')).toBe('Segond')
    expect(sigleTraduction('Bible Crampon')).toBe('Crampon')
    expect(sigleTraduction('Bible Fillion')).toBe('Fillion')
  })

  it('écarte l’adjectif qui suit, qui ne distingue rien à lui seul', () => {
    expect(sigleTraduction('Vulgate clémentine')).toBe('Vulgate')
  })

  it('s’arrête au PREMIER mot distinctif, non au dernier', () => {
    // « Swete » est l'éditeur, « Septante » est la bible : c'est celle-ci qu'on cherche.
    expect(sigleTraduction('Septante de Swete')).toBe('Septante')
  })

  it('retient le siècle quand c’est lui qui distingue', () => {
    // Le mot distinctif n'est pas toujours en tête : « française » et « du » ne
    // distinguent rien, le numéral si.
    expect(sigleTraduction('Bible française du XIIIe siècle')).toBe('XIIIe')
  })

  it('préfère un sigle en capitales entre parenthèses à tout le reste', () => {
    expect(sigleTraduction('Traduction officielle liturgique (AELF)')).toBe('AELF')
    // Une parenthèse qui n'est PAS un sigle ne l'emporte pas.
    expect(sigleTraduction('Vulgate latine (Fillion)')).toBe('Vulgate')
  })

  it('rend le nom entier plutôt qu’un sigle faux', () => {
    expect(sigleTraduction('la bible des pauvres')).toBe('la bible des pauvres')
    expect(sigleTraduction('')).toBe('')
    expect(sigleTraduction('   ')).toBe('')
  })
})

describe('siglesTraductions', () => {
  it('rend un sigle par nom, dans l’ordre reçu', () => {
    const sigles = siglesTraductions(NOMS_DU_CORPUS)
    expect(sigles).toHaveLength(NOMS_DU_CORPUS.length)
    expect(sigles[0]).toBe('Sacy')
    expect(sigles[8]).toBe('AELF')
  })

  it('⛔ ne rend JAMAIS deux fois le même sigle', () => {
    // L'invariant qui compte : un sigle ambigu désigne la mauvaise bible, ce qui est pire
    // que pas de sigle du tout.
    const sigles = siglesTraductions(NOMS_DU_CORPUS)
    expect(new Set(sigles).size).toBe(sigles.length)
  })

  it('rallonge les seuls noms qui se heurtent, et laisse les autres courts', () => {
    const sigles = siglesTraductions(NOMS_DU_CORPUS)
    // Les deux Vulgates se départagent…
    expect(sigles[3]).toBe('Vulgate clémentine')
    expect(sigles[7]).toBe('Vulgate latine')
    // …sans que les autres en pâtissent.
    expect(sigles[0]).toBe('Sacy')
    expect(sigles[6]).toBe('Fillion')
  })

  it('retombe sur le nom entier quand le rallongement ne suffit pas', () => {
    const sigles = siglesTraductions(['Vulgate clémentine', 'Vulgate clémentine de Rome'])
    expect(new Set(sigles).size).toBe(2)
    expect(sigles[1]).toBe('Vulgate clémentine de Rome')
  })

  it('tient sur une liste vide ou d’un seul nom', () => {
    expect(siglesTraductions([])).toEqual([])
    expect(siglesTraductions(['Bible de Sacy'])).toEqual(['Sacy'])
  })
})
