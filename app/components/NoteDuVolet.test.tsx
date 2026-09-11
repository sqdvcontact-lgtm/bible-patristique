import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { AppelDuVolet, NoteDuVolet } from './NoteDuVolet'
import { DANS_LE_FLUX, EncartNote } from './EncartNote'
import { STYLE_CADRE_ENCART_DANS_LE_FLUX, styleCadreEncart } from '../lib/compositionNote'

// ── LA NOTE DU VOLET PATRISTIQUE ─────────────────────────────────────────────
//
// ⚠️ Sans DOM (le dépôt n'a pas jsdom) : le rendu se lit en HTML statique, et les
// gestes s'éprouvent en appelant les gestionnaires de l'élément que le composant rend —
// `AppelDuVolet` et `EncartNote` ne portent aucun crochet, on peut donc les appeler.

type Props = Record<string, unknown>
const propsDe = (element: unknown) => (element as ReactElement<Props>).props

describe('AppelDuVolet', () => {
  const base = { numero: 12, libelle: 'Note', controle: 'note-1', onBasculer: () => {} }

  it('est l’exposant de toutes les notes du site, et dit son état', () => {
    const ferme = renderToStaticMarkup(<AppelDuVolet {...base} ouverte={false} />)
    expect(ferme).toContain('role="button"')
    expect(ferme).toContain('aria-expanded="false"')
    expect(ferme).toContain('aria-label="Note 12"')
    expect(ferme).toContain('class="cs-appel-cible"')
    // ⚠️ `aria-controls` ne désigne jamais un bloc absent du document.
    expect(ferme).not.toContain('aria-controls')
    const ouvert = renderToStaticMarkup(<AppelDuVolet {...base} ouverte />)
    expect(ouvert).toContain('aria-expanded="true"')
    expect(ouvert).toContain('aria-controls="note-1"')
    expect(ouvert).toContain('background:var(--cs-vert-pale)')
  })

  it('bascule au clic, et dit s’il a été actionné au clavier', () => {
    const onBasculer = vi.fn()
    const appel = {} as HTMLElement
    const props = propsDe(AppelDuVolet({ ...base, ouverte: false, onBasculer }))
    ;(props.onClick as (e: unknown) => void)({ stopPropagation() {}, currentTarget: appel })
    expect(onBasculer).toHaveBeenLastCalledWith(false, appel)
    const touche = (key: string) => ({ key, preventDefault: vi.fn(), stopPropagation() {}, currentTarget: appel })
    ;(props.onKeyDown as (e: unknown) => void)(touche('Enter'))
    expect(onBasculer).toHaveBeenLastCalledWith(true, appel)
    ;(props.onKeyDown as (e: unknown) => void)(touche(' '))
    expect(onBasculer).toHaveBeenCalledTimes(3)
    ;(props.onKeyDown as (e: unknown) => void)(touche('a'))
    expect(onBasculer).toHaveBeenCalledTimes(3)
  })
})

describe('NoteDuVolet', () => {
  const base = {
    id: 'note-1', numero: 12, intitule: null, etiquette: 'Note 12', signes: 40,
    enAttente: false, auClavier: false, onFermer: () => {},
  }

  it('se pose DANS LE FLUX, comme une région nommée qu’on peut atteindre', () => {
    const html = renderToStaticMarkup(<NoteDuVolet {...base}>Voir Jean 1, 1.</NoteDuVolet>)
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-label="Note 12"')
    expect(html).toContain('id="note-1"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('data-note-volet=""')
    expect(html).toContain('Voir Jean 1, 1.')
    // ⛔ Ni position fixe ni hauteur plafonnée : la note se lit ENTIÈRE.
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain('max-height')
    expect(html).toContain('position:relative')
    expect(html).toContain('aria-label="Fermer la note"')
  })

  it('dit qu’elle attend son contenu, plutôt que « Note indisponible »', () => {
    const html = renderToStaticMarkup(<NoteDuVolet {...base} enAttente>contenu</NoteDuVolet>)
    expect(html).toContain('Chargement')
    expect(html).not.toContain('contenu')
  })

  it('nomme son type quand la note en déclare un', () => {
    const html = renderToStaticMarkup(<NoteDuVolet {...base} intitule="Note du traducteur">x</NoteDuVolet>)
    expect(html).toContain('Note du traducteur')
  })
})

describe('EncartNote dans le flux', () => {
  it('transmet ce que la surface lui confie, et quitte la géométrie flottante', () => {
    const onKeyDown = vi.fn()
    const props = propsDe(EncartNote({
      numero: 3, placement: DANS_LE_FLUX, signes: 10, id: 'n', etiquette: 'Note 3', onKeyDown, children: 'x',
    }))
    expect(props.onKeyDown).toBe(onKeyDown)
    expect(props.role).toBe('region')
    expect(props.tabIndex).toBe(-1)
    const style = props.style as Record<string, unknown>
    expect(style.position).toBe('relative')
    expect(style.zIndex).toBeUndefined()
    expect(style.maxHeight).toBeUndefined()
  })

  it('un encart flottant ne devient pas une région', () => {
    const props = propsDe(EncartNote({
      numero: 3, placement: { left: 0, top: 0, hauteurMax: 300 }, signes: 10, children: 'x',
    }))
    expect(props.role).toBeUndefined()
    expect(props.tabIndex).toBeUndefined()
    expect((props.style as Record<string, unknown>).position).toBe('fixed')
  })

  it('garde le fond, le filet et le rayon de l’encart, sans son ombre ni son rang', () => {
    const flottant = styleCadreEncart({ left: 0, top: 0, hauteurMax: 100 })
    for (const cle of ['background', 'border', 'borderRadius'] as const) {
      expect(STYLE_CADRE_ENCART_DANS_LE_FLUX[cle]).toBe(flottant[cle])
    }
    expect(STYLE_CADRE_ENCART_DANS_LE_FLUX.boxShadow).toBeUndefined()
    expect(STYLE_CADRE_ENCART_DANS_LE_FLUX.zIndex).toBeUndefined()
    expect(STYLE_CADRE_ENCART_DANS_LE_FLUX.width).toBe('100%')
  })
})
