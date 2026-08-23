import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HistoricalDate from './HistoricalDate'

// Le séparateur d'un intervalle : un trait d'union entre deux espaces insécables.
// Insécables parce qu'un trait d'union autorise le retour à la ligne juste après
// lui : sans elles, on lirait « 354 - » en fin de ligne et « 430 » à la suivante.
const INSECABLE = '\u00a0'
const SEP = `${INSECABLE}-${INSECABLE}`

// Entrée telle qu'elle est en base (le trait d'union y est nu, ou demi-cadratin
// selon l'époque de la saisie), puis le texte attendu à l'écran.
const cas = [
  ['354-430', `354${SEP}430`, 'long'],
  ['Vers 329-379', `Vers 329${SEP}379`, 'long'],
  ['Vers 803-après 843', `Vers 803${SEP}après 843`, 'long'],
  ['Seconde moitié du Ier siècle – Première moitié du IIe siècle', `Seconde moitié du Ier siècle${SEP}Première moitié du IIe siècle`, 'long'],
  ['Début du IXe siècle-Après 868', `Début du IXe siècle${SEP}Après 868`, 'long'],
  ['c. 200 – 210', `c. 200${SEP}210`, 'short'],
  ['1870 – 1873', `1870${SEP}1873`, 'short'],
  ['25 décembre 800', '25 décembre 800', 'short'],
  // Le trait d'union de « J.-C. » n'est pas un intervalle : il ne prend pas d'espaces.
  ['c. 300 – 100 av. J.-C.', `c. 300${SEP}100 av. J.-C.`, 'short'],
] as const

function texteRendu(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

describe('HistoricalDate', () => {
  it.each(cas)('rend la chaîne historique « %s »', (value, attendu, variant) => {
    const html = renderToStaticMarkup(<HistoricalDate value={value} variant={variant} />)

    expect(texteRendu(html)).toBe(attendu)
  })

  it('n’emploie ni demi-cadratin ni tiret collé entre deux bornes', () => {
    const html = renderToStaticMarkup(<HistoricalDate value="354-430" variant="long" />)
    const texte = texteRendu(html)

    expect(texte).not.toContain('–')
    expect(texte).not.toContain('354-430')
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
    expect(html).toContain('<sup style="font-size:0.68em;line-height:0;vertical-align:baseline;position:relative;top:-0.5em">er</sup>')
    expect(html).toContain('<sup style="font-size:0.68em;line-height:0;vertical-align:baseline;position:relative;top:-0.5em">e</sup>')
  })

  it('ne crée aucun contenu pour une date absente', () => {
    expect(renderToStaticMarkup(<HistoricalDate value={null} variant="long" />)).toBe('')
  })

  it('n’emploie pas dangerouslySetInnerHTML', () => {
    const source = readFileSync(new URL('./HistoricalDate.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('dangerouslySetInnerHTML')
  })
})
