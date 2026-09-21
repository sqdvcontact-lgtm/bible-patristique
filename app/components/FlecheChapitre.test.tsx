import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import FlecheChapitre, { clicSimple, libelleFleche, type CibleChapitre, type FlecheChapitreProps } from './FlecheChapitre'

const GN3: CibleChapitre = { livre: 'GEN', chapitre: 3, href: '/?livre=GEN&chapitre=3&trad=TR0001', nom: 'Genèse 3' }
const MC1: CibleChapitre = { livre: 'MRK', chapitre: 1, href: '/?livre=MRK&chapitre=1&trad=TR0001', nom: 'Marc 1' }

/** Le composant est sans crochet : on l'appelle comme une fonction et on lit l'élément rendu. */
function rendre(props: Partial<FlecheChapitreProps> & Pick<FlecheChapitreProps, 'cible'>) {
  const onAller = vi.fn()
  const element = FlecheChapitre({ sens: 'suivant', variante: 'entete', onAller, ...props })
  return { element, props: element.props as Record<string, unknown>, onAller }
}

/** Un événement de clic minimal : ce que `clicSimple` et le gestionnaire lisent. */
function clic(modifs: Partial<{ button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) {
  const preventDefault = vi.fn()
  return {
    evt: { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false, preventDefault, ...modifs },
    preventDefault,
  }
}

describe('une flèche active est un LIEN', () => {
  it('elle porte l’adresse du chapitre visé, lisible et ouvrable dans un autre onglet', () => {
    const { element, props } = rendre({ cible: GN3 })
    expect(element.type).toBe('a')
    expect(props.href).toBe(GN3.href)
    expect(renderToStaticMarkup(element)).toContain(`href="${GN3.href.replace(/&/g, '&amp;')}"`)
  })

  it('le clic simple passe par la provision d’attente, sans suivre le lien', () => {
    const { props, onAller } = rendre({ cible: GN3 })
    const { evt, preventDefault } = clic()
    ;(props.onClick as (e: unknown) => void)(evt)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(onAller).toHaveBeenCalledWith(GN3.href)
  })

  it('un clic du milieu ou tenu avec Ctrl, Cmd, Maj ou Alt revient au navigateur', () => {
    for (const modifs of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
      const { props, onAller } = rendre({ cible: GN3 })
      const { evt, preventDefault } = clic(modifs)
      ;(props.onClick as (e: unknown) => void)(evt)
      expect(preventDefault).not.toHaveBeenCalled()
      expect(onAller).not.toHaveBeenCalled()
    }
  })

  it('elle nomme sa cible, et l’infobulle de l’en-tête dit la touche', () => {
    const { props } = rendre({ cible: MC1 })
    expect(props['aria-label']).toBe('Chapitre suivant : Marc 1')
    expect(props.title).toBe('Chapitre suivant : Marc 1 (→)')
    const arriere = rendre({ cible: GN3, sens: 'precedent' })
    expect(arriere.props.title).toBe('Chapitre précédent : Genèse 3 (←)')
    expect(libelleFleche('precedent', GN3)).toBe('Chapitre précédent : Genèse 3')
  })

  it('sa zone de frappe vient de `.cs-fleche-chapitre`, et elle fait 2,75 rem', () => {
    const { props } = rendre({ cible: GN3 })
    expect(props.className).toBe('nav-chap-arrow cs-fleche-chapitre')
    const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
    expect(css).toMatch(/\.cs-fleche-chapitre \{ position: relative;/)
    expect(css).toMatch(/\.cs-fleche-chapitre::after \{[^}]*width: 2\.75rem; height: 2\.75rem;/)
  })
})

describe('clicSimple', () => {
  it('ne retient que le bouton principal, sans modification ni défaut déjà empêché', () => {
    expect(clicSimple(clic().evt)).toBe(true)
    expect(clicSimple({ ...clic().evt, defaultPrevented: true })).toBe(false)
    expect(clicSimple(clic({ button: 2 }).evt)).toBe(false)
  })
})

describe('flèche inerte, à une borne réelle', () => {
  it('le chevron reste rendu, grisé, sans lien ni promesse', () => {
    const { element, props, onAller } = rendre({ cible: null })
    expect(element.type).toBe('span')
    expect(props.href).toBeUndefined()
    expect(props.onClick).toBeUndefined()
    expect(props.className).toBeUndefined()
    expect(props.title).toBeUndefined()
    expect(props['aria-hidden']).toBe('true')
    expect((props.style as Record<string, unknown>).color).toBe('var(--cs-bord)')
    expect((props.style as Record<string, unknown>).cursor).toBe('default')
    expect(renderToStaticMarkup(element)).toContain('›')
    expect(onAller).not.toHaveBeenCalled()
  })
})

describe('géométrie des surfaces', () => {
  it('le bandeau mobile garde sa boîte, actif ou inerte', () => {
    const actif = rendre({ cible: GN3, variante: 'bandeau' }).props.style as Record<string, unknown>
    const inerte = rendre({ cible: null, variante: 'bandeau' }).props.style as Record<string, unknown>
    for (const style of [actif, inerte]) {
      expect(style.fontSize).toBe('1.375rem')
      expect(style.padding).toBe('0 8px')
      expect(style.lineHeight).toBe(1)
    }
    expect(actif.color).toBe('var(--cs-texte-gris)')
    expect(inerte.color).toBe('var(--cs-bord)')
    // Le bandeau se lit à l'étiquette, pas à l'infobulle.
    expect(rendre({ cible: GN3, variante: 'bandeau' }).props.title).toBeUndefined()
  })

  it('l’en-tête garde son gabarit, lecture simple comme lecture en regard', () => {
    const actif = rendre({ cible: GN3 }).props.style as Record<string, unknown>
    const inerte = rendre({ cible: null }).props.style as Record<string, unknown>
    for (const style of [actif, inerte]) {
      expect(style.fontSize).toBe('1.25rem')
      expect(style.padding).toBe(0)
      expect(style.background).toBe('none')
      expect(style.border).toBe('none')
    }
    expect(actif.color).toBe('var(--cs-texte-faible)')
  })
})
