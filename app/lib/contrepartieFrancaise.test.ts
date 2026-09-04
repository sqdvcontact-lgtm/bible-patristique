import { describe, expect, it } from 'vitest'
import { LANGUE_FRANCAISE, texteFrancaisLePlusRecent, textesATraduire, type TexteDOeuvre } from './contrepartieFrancaise'

const t = (id_texte: string, langue: string | null, annee_edition: number | null, is_public: boolean | null = true,
  id_oeuvre = 'A0010O0002'): TexteDOeuvre => ({ id_texte, id_oeuvre, langue, annee_edition, is_public })

describe('texteFrancaisLePlusRecent', () => {
  it('retient le français', () => {
    expect(texteFrancaisLePlusRecent([t('LA', 'Latin', 1873), t('FR', LANGUE_FRANCAISE, 1873)])?.id_texte).toBe('FR')
  })

  it('retient le PLUS RÉCENT', () => {
    expect(texteFrancaisLePlusRecent([
      t('FR1', LANGUE_FRANCAISE, 1868), t('FR2', LANGUE_FRANCAISE, 1912), t('FR3', LANGUE_FRANCAISE, 1879),
    ])?.id_texte).toBe('FR2')
  })

  it('⛔ écarte ce qui n’est pas public', () => {
    expect(texteFrancaisLePlusRecent([t('FR1', LANGUE_FRANCAISE, 1990, false), t('FR2', LANGUE_FRANCAISE, 1868)])?.id_texte)
      .toBe('FR2')
  })

  it('range une année inconnue derrière une année connue', () => {
    expect(texteFrancaisLePlusRecent([t('FRX', LANGUE_FRANCAISE, null), t('FR', LANGUE_FRANCAISE, 1868)])?.id_texte)
      .toBe('FR')
  })

  it('⚠️ départage par l’identifiant : à donnée égale, le même texte à chaque visite', () => {
    const listeA = [t('FRB', LANGUE_FRANCAISE, 1868), t('FRA', LANGUE_FRANCAISE, 1868)]
    expect(texteFrancaisLePlusRecent(listeA)?.id_texte).toBe('FRA')
    expect(texteFrancaisLePlusRecent([...listeA].reverse())?.id_texte).toBe('FRA')
  })

  it('rend null quand l’œuvre n’a pas de français', () => {
    expect(texteFrancaisLePlusRecent([t('LA', 'Latin', 1841), t('GR', 'Grec', 1857)])).toBeNull()
    expect(texteFrancaisLePlusRecent([])).toBeNull()
  })
})

describe('textesATraduire', () => {
  const parOeuvre = (...textes: TexteDOeuvre[]) => {
    const m = new Map<string, TexteDOeuvre[]>()
    for (const x of textes) m.set(x.id_oeuvre, [...(m.get(x.id_oeuvre) ?? []), x])
    return m
  }

  it('ne vise que les textes en langue originale', () => {
    const la = t('LA', 'Latin', 1873)
    const fr = t('FR', LANGUE_FRANCAISE, 1873)
    const cibles = textesATraduire(new Map([['LA', la], ['FR', fr]]), parOeuvre(la, fr))
    expect([...cibles.keys()]).toEqual(['LA'])
    expect(cibles.get('LA')?.id_texte).toBe('FR')
  })

  it('⛔ ne vise rien quand l’œuvre n’a pas de français', () => {
    const la = t('LA', 'Latin', 1841, true, 'A0010O0110')
    expect(textesATraduire(new Map([['LA', la]]), parOeuvre(la)).size).toBe(0)
  })

  it('traite chaque œuvre pour son compte', () => {
    const la1 = t('LA1', 'Latin', 1873, true, 'O1')
    const fr1 = t('FR1', LANGUE_FRANCAISE, 1873, true, 'O1')
    const la2 = t('LA2', 'Latin', 1841, true, 'O2')
    const cibles = textesATraduire(new Map([['LA1', la1], ['LA2', la2]]), parOeuvre(la1, fr1, la2))
    expect([...cibles.keys()]).toEqual(['LA1'])
  })
})
