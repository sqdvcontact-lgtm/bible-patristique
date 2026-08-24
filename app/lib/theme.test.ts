import { describe, expect, it } from 'vitest'
import { CLE_THEME, SCRIPT_THEME, THEMES_RECONNUS, THEME_DEFAUT, themeValide } from './theme'

describe('thème de lecture', () => {
  it('reconnaît les deux thèmes servis', () => {
    expect(themeValide('clair')).toBe('clair')
    expect(themeValide('sombre')).toBe('sombre')
    expect(THEMES_RECONNUS).toEqual(['clair', 'sombre'])
  })

  it('tolère les blancs d’une valeur relue', () => {
    expect(themeValide(' sombre ')).toBe('sombre')
  })

  it('refuse un thème retiré ou inconnu', () => {
    // Le Sépia est sorti le 2026-08-23. Une préférence qui le nomme encore, en base
    // comme dans un navigateur, doit retomber sur le Clair sans rien casser.
    for (const inconnu of ['sepia', 'dark', 'Clair', '', ' ', 'null']) {
      expect(themeValide(inconnu)).toBeNull()
    }
    expect(themeValide(null)).toBeNull()
    expect(themeValide(undefined)).toBeNull()
  })

  it('sert le clair par défaut, et c’est ce que le serveur écrit', () => {
    expect(THEME_DEFAUT).toBe('clair')
  })

  it('le script d’avant-peinture reste synchrone et borné au miroir local', () => {
    // Il s'exécute pendant l'analyse du document : ni requête, ni await, ni fonction
    // fléchée hors ES5. Et il efface toute valeur qui ne désigne plus un thème.
    expect(SCRIPT_THEME).toContain(CLE_THEME)
    expect(SCRIPT_THEME).toContain('removeItem')
    expect(SCRIPT_THEME).not.toMatch(/await|fetch|=>/)
  })
})
