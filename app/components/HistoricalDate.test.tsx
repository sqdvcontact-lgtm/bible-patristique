import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HistoricalDate from './HistoricalDate'

const cas = [
  ['Seconde moitié du Ier siècle – Première moitié du IIe siècle', 'long'],
  ['Vers 329 – 379', 'long'],
  ['c. 200 – 210', 'short'],
  ['Début du IXe siècle – Après 868', 'long'],
  ['25 décembre 800', 'short'],
  ['c. 300 – 100 av. J.-C.', 'short'],
] as const

function texteRendu(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

describe('HistoricalDate', () => {
  it.each(cas)('rend la chaîne historique « %s »', (value, variant) => {
    const html = renderToStaticMarkup(<HistoricalDate value={value} variant={variant} />)
    const texte = texteRendu(html)

    expect(texte).toContain(value.replace(/\s*–\s*/g, '\u00a0–\u00a0'))
    if (value.includes('–')) expect(texte).toContain('\u00a0–\u00a0')
  })

  it('limite l’italique au seul préfixe c. de la variante courte', () => {
    const html = renderToStaticMarkup(<HistoricalDate value="c. 200 – 210" variant="short" />)

    expect(html).toContain('<em>c.</em>')
    expect(html.match(/<em>/g)).toHaveLength(1)
    expect(html).not.toMatch(/<em>[^<]*200/)
  })

  it('compose les chiffres romains en petites capitales et les ordinaux en exposant', () => {
    const html = renderToStaticMarkup(
      <HistoricalDate value="Seconde moitié du Ier siècle – Première moitié du IIe siècle" variant="long" />,
    )

    expect(html).toContain('font-variant-caps:all-small-caps')
    expect(html).toContain('font-feature-settings:&quot;smcp&quot; 1, &quot;c2sc&quot; 1')
    expect(html).toContain('<sup style="vertical-align:super;font-size:0.68em;line-height:0">er</sup>')
    expect(html).toContain('<sup style="vertical-align:super;font-size:0.68em;line-height:0">e</sup>')
  })

  it('ne crée aucun contenu pour une date absente', () => {
    expect(renderToStaticMarkup(<HistoricalDate value={null} variant="long" />)).toBe('')
  })

  it('n’emploie pas dangerouslySetInnerHTML', () => {
    const source = readFileSync(new URL('./HistoricalDate.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('dangerouslySetInnerHTML')
  })
})
