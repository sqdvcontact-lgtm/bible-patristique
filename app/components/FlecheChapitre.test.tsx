import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import FlecheChapitre, { chapitreVise, flecheChapitreDisponible, type FlecheChapitreProps } from './FlecheChapitre'

/** Le composant est sans crochet : on l'appelle comme une fonction et on lit l'élément rendu. */
function rendre(props: Partial<FlecheChapitreProps> & Pick<FlecheChapitreProps, 'chapitre' | 'sens'>) {
  const onAller = vi.fn()
  const element = FlecheChapitre({ livre: 'GEN', variante: 'entete', onAller, ...props })
  return { element, props: element.props as Record<string, unknown>, onAller }
}

describe('disponibilité des flèches de chapitre', () => {
  it('Gn 49 autorise le chapitre suivant', () => {
    expect(flecheChapitreDisponible('GEN', 49, 'suivant')).toBe(true)
    expect(chapitreVise(49, 'suivant')).toBe(50)
  })

  it('Gn 50 ne l’autorise pas', () => {
    expect(flecheChapitreDisponible('GEN', 50, 'suivant')).toBe(false)
    // La flèche arrière, elle, reste ouverte au dernier chapitre.
    expect(flecheChapitreDisponible('GEN', 50, 'precedent')).toBe(true)
  })

  it('Gn 1 ferme la flèche arrière et ouvre la flèche avant', () => {
    expect(flecheChapitreDisponible('GEN', 1, 'precedent')).toBe(false)
    expect(flecheChapitreDisponible('GEN', 1, 'suivant')).toBe(true)
    expect(chapitreVise(1, 'suivant')).toBe(2)
  })

  it('laisse les chapitres intermédiaires ouverts des deux côtés', () => {
    for (const chapitre of [2, 10, 25, 48, 49]) {
      expect(flecheChapitreDisponible('GEN', chapitre, 'precedent')).toBe(true)
      expect(flecheChapitreDisponible('GEN', chapitre, 'suivant')).toBe(true)
    }
    expect(chapitreVise(25, 'precedent')).toBe(24)
    expect(chapitreVise(25, 'suivant')).toBe(26)
  })

  it('hors du périmètre certifié, le serveur garde la main', () => {
    expect(flecheChapitreDisponible('PSA', 150, 'suivant')).toBe(true)
    expect(flecheChapitreDisponible('PSA', 1, 'precedent')).toBe(false)
  })
})

describe('flèche terminale : présente mais inerte', () => {
  it('Gn 50 : le chevron droit reste rendu, grisé et désactivé', () => {
    const { element, props } = rendre({ chapitre: 50, sens: 'suivant' })
    expect(element.type).toBe('button')
    expect(props.disabled).toBe(true)
    expect(props['aria-disabled']).toBe('true')
    expect((props.style as Record<string, unknown>).color).toBe('var(--cs-bord)')
    expect((props.style as Record<string, unknown>).cursor).toBe('default')
    const html = renderToStaticMarkup(element)
    expect(html).toContain('›')
    expect(html).toContain('disabled=""')
  })

  it('aucun clic possible sur la flèche terminale', () => {
    const { props, onAller } = rendre({ chapitre: 50, sens: 'suivant' })
    expect(props.onClick).toBeUndefined()
    // Ni classe de survol, ni infobulle : la flèche ne promet rien.
    expect(props.className).toBeUndefined()
    expect(props.title).toBeUndefined()
    // Même un appel forcé du gestionnaire ne déclenche aucune navigation.
    ;(props.onClick as undefined | (() => void))?.()
    expect(onAller).not.toHaveBeenCalled()
  })

  it('Gn 1 : le chevron gauche est inerte de la même façon', () => {
    const { props, onAller } = rendre({ chapitre: 1, sens: 'precedent' })
    expect(props.disabled).toBe(true)
    expect(props.onClick).toBeUndefined()
    expect(onAller).not.toHaveBeenCalled()
  })
})

describe('flèche active', () => {
  it('Gn 49 : le clic mène à Gn 50 et acquitte la navigation', () => {
    const { props, onAller } = rendre({ chapitre: 49, sens: 'suivant' })
    expect(props.disabled).toBeUndefined()
    expect(props.className).toBe('nav-chap-arrow')
    expect(props.title).toBe('Chapitre suivant')
    ;(props.onClick as () => void)()
    expect(onAller).toHaveBeenCalledTimes(1)
    expect(onAller).toHaveBeenCalledWith(50)
  })

  it('Gn 1 : le chevron droit mène à Gn 2', () => {
    const { props, onAller } = rendre({ chapitre: 1, sens: 'suivant' })
    ;(props.onClick as () => void)()
    expect(onAller).toHaveBeenCalledWith(2)
  })

  it('Gn 25 : les deux chevrons mènent à 24 et 26', () => {
    const arriere = rendre({ chapitre: 25, sens: 'precedent' })
    ;(arriere.props.onClick as () => void)()
    expect(arriere.onAller).toHaveBeenCalledWith(24)
    const avant = rendre({ chapitre: 25, sens: 'suivant' })
    ;(avant.props.onClick as () => void)()
    expect(avant.onAller).toHaveBeenCalledWith(26)
  })
})

describe('géométrie des surfaces', () => {
  it('le bandeau mobile garde sa boîte, actif ou inerte', () => {
    const actif = rendre({ chapitre: 49, sens: 'suivant', variante: 'bandeau' }).props.style as Record<string, unknown>
    const inerte = rendre({ chapitre: 50, sens: 'suivant', variante: 'bandeau' }).props.style as Record<string, unknown>
    for (const style of [actif, inerte]) {
      expect(style.fontSize).toBe('1.375rem')
      expect(style.padding).toBe('0 8px')
      expect(style.lineHeight).toBe(1)
    }
    expect(actif.color).toBe('var(--cs-texte-gris)')
    expect(inerte.color).toBe('var(--cs-bord)')
    // Le bandeau se lit à l'étiquette, pas à l'infobulle.
    expect(rendre({ chapitre: 49, sens: 'suivant', variante: 'bandeau' }).props.title).toBeUndefined()
  })

  it('l’en-tête garde son gabarit, lecture simple comme lecture en regard', () => {
    const actif = rendre({ chapitre: 49, sens: 'suivant' }).props.style as Record<string, unknown>
    const inerte = rendre({ chapitre: 50, sens: 'suivant' }).props.style as Record<string, unknown>
    for (const style of [actif, inerte]) {
      expect(style.fontSize).toBe('1.25rem')
      expect(style.padding).toBe(0)
      expect(style.background).toBe('none')
      expect(style.border).toBe('none')
    }
    expect(actif.color).toBe('var(--cs-texte-faible)')
  })
})
