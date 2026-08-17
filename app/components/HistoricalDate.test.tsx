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
    expect(html).toContain('<sup')
    expect(html).toContain('>er</sup>')
    expect(html).toContain('>e</sup>')
  })

  // ⛔ Ce test épinglait auparavant la chaîne exacte `vertical-align:super`,
  // et pinçait donc le défaut en place : `super` relève l'ordinal du double de
  // ce qu'il faut, si bien que le « e » de « IXe siècle » flottait au-dessus du
  // chiffre. On épingle désormais la RÈGLE et non la sérialisation.
  it('relève l’ordinal explicitement, jamais par vertical-align: super', () => {
    const html = renderToStaticMarkup(<HistoricalDate value="IXe siècle" variant="long" />)
    expect(html).not.toContain('vertical-align:super')
    expect(html).toContain('top:-0.33em')
    // `line-height: 0` : l'exposant ne doit pas gonfler la boîte de ligne.
    expect(html).toContain('line-height:0')
  })

  it('ne crée aucun contenu pour une date absente', () => {
    expect(renderToStaticMarkup(<HistoricalDate value={null} variant="long" />)).toBe('')
  })

  it('n’emploie pas dangerouslySetInnerHTML', () => {
    const source = readFileSync(new URL('./HistoricalDate.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('dangerouslySetInnerHTML')
  })
})
