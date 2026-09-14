import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CompteEnAttente from './CompteEnAttente'
import { LETTRE_DE_DEPART } from '../lib/lettresGrecques'

describe('ce qui tient la place d’un compte pendant qu’il se charge', () => {
  it('écrit au premier rendu UNE lettre FIXE, la même que le serveur', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    expect(html).toContain(`>${LETTRE_DE_DEPART}</span>`)
    expect(renderToStaticMarkup(<CompteEnAttente />)).toBe(html)
  })

  it('⛔ ne pose qu’une lettre, dans une case de largeur fixe', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    expect(html.match(/display:inline-block;width:0\.62em/g)).toHaveLength(1)
    expect(html.match(/lang="el"/g)).toHaveLength(1)
  })

  it('tait la lettre à la synthèse vocale, et lui dit « chargement »', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('lang="el"')
    expect(html).toContain('class="cs-hors-ecran">chargement</span>')
  })

  it('ne pose ni corps ni encre : il prend ceux de la ligne qui le porte', () => {
    const html = renderToStaticMarkup(<CompteEnAttente />)
    expect(html).not.toMatch(/font-size|color:/)
  })

  it('change de lettre deux fois plus vite qu’au premier jet, et plus lentement sous le mouvement réduit', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/CompteEnAttente.tsx'), 'utf8')
    const cadence = Number(source.match(/const CADENCE_MS = (\d+)/)?.[1])
    const calme = Number(source.match(/const CADENCE_CALME_MS = (\d+)/)?.[1])
    expect(cadence).toBeLessThanOrEqual(45)
    expect(calme).toBeGreaterThan(10 * cadence)
    expect(source).toContain('tirerAutreLettre(precedente)')
  })
})
