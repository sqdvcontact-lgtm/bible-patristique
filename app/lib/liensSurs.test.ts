import { describe, expect, it } from 'vitest'
import { hrefSur } from './liensSurs'

describe('hrefSur', () => {
  it('laisse passer le web, le courriel et les adresses relatives', () => {
    expect(hrefSur('https://corpus-scriptura.fr/accueil')).toBe('https://corpus-scriptura.fr/accueil')
    expect(hrefSur('http://example.org')).toBe('http://example.org')
    expect(hrefSur('mailto:sqdv.contact@gmail.com')).toBe('mailto:sqdv.contact@gmail.com')
    expect(hrefSur('/oeuvre/A0010O0001')).toBe('/oeuvre/A0010O0001')
    expect(hrefSur('#segment-12')).toBe('#segment-12')
    expect(hrefSur('../accueil')).toBe('../accueil')
  })

  it('complète une adresse sans schéma', () => {
    expect(hrefSur('corpus-scriptura.fr/accueil')).toBe('https://corpus-scriptura.fr/accueil')
  })

  it('refuse tout schéma exécutable ou de données, quelle que soit sa casse ou son habillage', () => {
    for (const mauvaise of [
      'javascript:alert(1)', 'JavaScript:alert(1)', '  javascript:alert(1)', 'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox', 'file:///etc/passwd', 'blob:https://x',
    ]) expect(hrefSur(mauvaise), mauvaise).toBeNull()
  })

  it('ne fait rien d’une adresse vide', () => {
    expect(hrefSur('')).toBeNull()
    expect(hrefSur('   ')).toBeNull()
    expect(hrefSur(null)).toBeNull()
    expect(hrefSur(undefined)).toBeNull()
  })
})
