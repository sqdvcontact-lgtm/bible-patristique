import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SEUIL_CITATION_SORTIE } from '@/app/lib/citationSortie'
import { figuresDeLaNote } from './BibleEditionParatext'
import { ContenuNoteBiblique } from './NoteBibliqueFenetre'

describe('citations sorties dans l’apparat biblique', () => {
  const rendreCitation = (text: string) => renderToStaticMarkup(
    <ContenuNoteBiblique note={{
      blocks: [{
        id: 'citation',
        kind: 'quotation',
        form: 'prose',
        text,
        language: 'fr',
      }],
    } as never} />,
  )

  it('garde une citation courte dans le fil de la note', () => {
    const html = rendreCitation('« Ignoratio Scripturarum ignoratio Christi est. »')
    expect(html).not.toContain('class="citation-sortie"')
  })

  it('applique le style commun à une citation qui atteint le seuil', () => {
    const html = rendreCitation('a'.repeat(SEUIL_CITATION_SORTIE))
    expect(html).toContain('class="citation-sortie"')
  })
})

// ⛔ LA FENÊTRE EST LE SEUL LIEU D'UNE NOTE DE VERSET (décision de l'auteur, 13 septembre
// 2026) : ce que la série du bas de chapitre composait — la liste bibliographique, les
// gravures —, c'est désormais la fenêtre qui le compose.
describe('la fenêtre d’une note de verset', () => {
  const bibliographie = [
    'Signalons, comme œuvres spéciales :',
    '- ++Jean Chrysostome++, *Homélies sur l’Évangile selon Matthieu*.',
    '- ++Van Steenkiste++ Jean-Aloïs, *Commentarius*, Bruges, 1876.',
  ].join('\n')
  const noteBibliographique = (declaree: boolean) => ({
    blocks: [{
      id: 'note-biblio-1',
      kind: 'commentary' as const,
      form: 'prose' as const,
      text: bibliographie,
      language: 'fr',
      ...(declaree ? { presentationStyle: 'bibliographie' as const } : {}),
    }],
  })

  it('compose en liste la note que la donnée déclare bibliographique', () => {
    const html = renderToStaticMarkup(<ContenuNoteBiblique note={noteBibliographique(true)} />)
    // La MÊME famille que les listes structurées. La fenêtre pose la composition sur son
    // conteneur : la liste n'a pas à la poser elle-même, d'où l'absence de `--sans-hote`.
    expect(html).toContain('class="cs-apparat-bibliographie"')
    expect(html).toContain('<li class="cs-apparat-bibliographie__entree">')
    // ⛔ Le marqueur de la donnée ne s'imprime pas.
    expect(html).not.toContain('>- ')
    expect(html).toContain('Van Steenkiste')
  })

  it('laisse en paragraphe suivi la même note sans sa déclaration', () => {
    const html = renderToStaticMarkup(<ContenuNoteBiblique note={noteBibliographique(false)} />)
    expect(html).not.toContain('cs-apparat-bibliographie')
  })

  it('porte les gravures de la note : avant son texte ce que la donnée place avant, après le reste', () => {
    const GRAVURE = {
      assetKind: 'illustration', url: 'https://exemple.test/gravure.webp', width: 300, height: 200,
      altText: 'Gravure', caption: null, printedPage: null, canonIdStart: null, canonIdEnd: null,
      bodyBlockId: null, noteId: 'n1', materialOrder: 1, regime: 'vignette' as const, part: 0.36,
    }
    const html = renderToStaticMarkup(
      <ContenuNoteBiblique
        note={{ blocks: [{ id: 'n1:1', kind: 'commentary', form: 'prose', text: 'Texte de la note.' }] }}
        figures={figuresDeLaNote([
          { ...GRAVURE, id: 'apres', assetKey: 'apres', placement: 'inline' },
          { ...GRAVURE, id: 'avant', assetKey: 'avant', placement: 'before' },
        ])}
      />,
    )
    const texte = html.indexOf('Texte de la note.')
    expect(html.indexOf('data-asset-key="avant"')).toBeGreaterThan(-1)
    expect(html.indexOf('data-asset-key="avant"')).toBeLessThan(texte)
    expect(html.indexOf('data-asset-key="apres"')).toBeGreaterThan(texte)
    // Une note sans gravure n'en compose aucune.
    expect(figuresDeLaNote([])).toBeUndefined()
    expect(figuresDeLaNote(undefined)).toBeUndefined()
  })
})

// ⛔ CE QU'ON TRAVERSE SE LIT EN DISCRET, et la FAMILLE du bloc en décide (charte § 13.21) :
// les renvois internes de l'apparat de Fillion se composaient en propos.
describe('les renvois d’une note biblique', () => {
  const rendre = (kind: string) => renderToStaticMarkup(
    <ContenuNoteBiblique note={{
      blocks: [{ id: 'b1', kind, form: 'prose', text: 'Voyez la note précédente.' }],
    } as never} />,
  )

  it('le renvoi interne se lit en discret, comme le renvoi et l’attribution', () => {
    for (const kind of ['internal_cross_reference', 'reference', 'attribution']) {
      expect(rendre(kind), kind).toContain('color:var(--cs-texte-second)')
    }
  })

  it('le propos garde sa teinte', () => {
    expect(rendre('commentary')).toContain('color:var(--cs-texte-fort)')
  })
})
