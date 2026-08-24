import { describe, expect, it } from 'vitest'
import { codeTraductionValide, COOKIE_TRAD_BIBLE } from './preferenceBible'

describe('code de traduction reçu du navigateur', () => {
  it('accepte les identifiants du catalogue', () => {
    expect(codeTraductionValide('TR0001')).toBe('TR0001')
    expect(codeTraductionValide('TR_FR_1837_GUILLON_QUOD_IDOLA')).toBe('TR_FR_1837_GUILLON_QUOD_IDOLA')
  })

  it('tolère les blancs qui ENTOURENT la valeur', () => {
    // Ce ne sont que des blancs de bordure, retirés avant l'examen — y compris le
    // saut de ligne final d'un cookie recopié à la main.
    expect(codeTraductionValide(' TR0003 ')).toBe('TR0003')
    expect(codeTraductionValide('TR0003\n')).toBe('TR0003')
  })

  it('refuse ce qui n’est pas un identifiant', () => {
    // La valeur vient du navigateur : elle sert à composer un accès au catalogue et
    // ne doit donc porter ni ponctuation, ni blanc INTERNE, ni longueur déraisonnable.
    for (const tordu of ['', ' ', 'TR0001; drop', 'TR 0001', '../TR0001', 'TR\n0001', 'x'.repeat(65)]) {
      expect(codeTraductionValide(tordu)).toBeNull()
    }
  })

  it('refuse l’absence de valeur', () => {
    expect(codeTraductionValide(null)).toBeNull()
    expect(codeTraductionValide(undefined)).toBeNull()
  })

  it('nomme le cookie que lit le rendu serveur', () => {
    // `app/page.tsx` lit cette clé avant de composer quoi que ce soit : la renommer
    // sans la renommer là-bas ferait silencieusement retomber tout le monde sur la
    // première bible de la liste.
    expect(COOKIE_TRAD_BIBLE).toBe('cs_trad_bible')
  })
})
