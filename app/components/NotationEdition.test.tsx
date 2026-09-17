import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ListeOuvragesCites } from './FicheModele'
import NotationEdition from './NotationEdition'
import { noticeDUnOuvrage } from '@/app/lib/bibleBibliographieOuvrages'

/**
 * LE RENDU d'une notice : ce que `lireNotationEdition` décide, le composant le pose.
 * ⛔ La bibliographie d'une notice se compose comme les ouvrages cités de la même fiche :
 * la même famille, les mêmes classes, et rien que le lecteur n'ait pas écrit.
 */
const BIBLIOGRAPHIE = [
  'Les recherches textuelles modernes ont distingué deux recensions.',
  '',
  '## Bibliographie',
  '+ Pierre ++Cazier++, « Lectures du livre de Job », *Graphè*, 6, 1997.',
  '+ Gerd-Dietrich ++Warns++, *Die Textvorlage von Augustins Adnotationes in Iob*, Göttingen, 2017.',
].join('\n')

/** Les classes d'un élément, telles que le balisage les porte. ⚠️ L'attribut `class` n'est
 *  pas toujours le premier : la liste des ouvrages cités pose son `id` devant. */
const classesDe = (html: string, balise: string) =>
  [...html.matchAll(new RegExp(`<${balise}(?=[\\s>])[^>]*?\\sclass="([^"]*)"`, 'g'))].map(m => m[1])

describe('la bibliographie d’une notice', () => {
  it('pose une liste de la famille bibliographique, une entrée par référence', () => {
    const html = renderToStaticMarkup(<NotationEdition texte={BIBLIOGRAPHIE} />)
    expect(classesDe(html, 'div')).toContain('cs-apparat-bibliographie cs-apparat-bibliographie--sans-hote')
    expect(classesDe(html, 'ul')).toEqual(['cs-apparat-bibliographie__liste'])
    expect(classesDe(html, 'li')).toEqual(['cs-apparat-bibliographie__entree', 'cs-apparat-bibliographie__entree'])
  })

  /** ⛔ Les mêmes classes que la liste des ouvrages cités, et dans le même ordre
   *  d'enveloppes : deux bibliographies d'une même fenêtre ne se composent pas autrement. */
  it('reprend exactement les classes des ouvrages cités de la fiche', () => {
    const notices = [noticeDUnOuvrage({
      id: 1, ordre: 1, titre: 'Graphè', sousTitre: null, lieu: null, editeur: null, annee: null, auteur: null,
    })]
    const cites = renderToStaticMarkup(<ListeOuvragesCites notices={notices} />)
    const notice = renderToStaticMarkup(<NotationEdition texte={BIBLIOGRAPHIE} />)
    expect(classesDe(notice, 'ul')).toEqual(classesDe(cites, 'ul'))
    expect(classesDe(notice, 'li')[0]).toBe(classesDe(cites, 'li')[0])
    expect(classesDe(notice, 'div')).toContain(classesDe(cites, 'div')[0])
  })

  it('n’imprime pas la marque, et compose l’italique et les petites capitales écrites', () => {
    const html = renderToStaticMarkup(<NotationEdition texte={BIBLIOGRAPHIE} />)
    expect(html).not.toMatch(/<li[^>]*>\s*\+/)
    expect(html).toContain('<em>Graphè</em>')
    expect(html).toMatch(/font-variant:small-caps[^>]*>Cazier</)
    expect(html).not.toContain('++')
  })

  it('ne laisse sous la bibliographie aucun blanc que la notation n’a pas décidé', () => {
    const html = renderToStaticMarkup(<NotationEdition texte={BIBLIOGRAPHIE} />)
    expect(html).toMatch(/class="cs-apparat-bibliographie cs-apparat-bibliographie--sans-hote" style="margin-top:4px;margin-bottom:0"/)
  })
})

describe('une notice sans marque', () => {
  /** ⛔ La notation s'applique aux notes éditoriales d'une œuvre depuis le 17 septembre
   *  2026 : une note sans marque doit se rendre comme avant, d'un seul paragraphe. */
  it('se rend en un seul paragraphe de prose, sauts compris', () => {
    const html = renderToStaticMarkup(<NotationEdition texte={'Un premier paragraphe.\n\nUn second.'} />)
    expect(html.match(/<p /g)).toHaveLength(1)
    expect(html).toContain('class="cs-notice-prose"')
    expect(html).not.toContain('<ul')
  })
})
