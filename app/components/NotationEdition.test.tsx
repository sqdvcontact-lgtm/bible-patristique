import { readFileSync } from 'node:fs'
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

  it('ne pose ni titre ni blanc que la notation n’a pas décidé', () => {
    const html = renderToStaticMarkup(<NotationEdition texte={BIBLIOGRAPHIE} />)
    expect(html).not.toContain('Bibliographie')
    expect(html).toMatch(/class="cs-apparat-bibliographie cs-apparat-bibliographie--sans-hote" style="margin-top:1.125rem;margin-bottom:0"/)
  })

  /** ⛔ Le CONTEXTE de la règle de corps : sans ce conteneur, la bibliographie d'une notice
   *  reprendrait le corps des ouvrages cités. */
  it('pose le conteneur de la notation', () => {
    const html = renderToStaticMarkup(<NotationEdition texte={BIBLIOGRAPHIE} />)
    expect(html.startsWith('<div class="cs-notation"')).toBe(true)
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

  it('resserre les paragraphes dans une fiche qui le demande explicitement', () => {
    const html = renderToStaticMarkup(
      <NotationEdition texte={'Un premier paragraphe.\n\nUn second.'} resserre />,
    )
    expect(html.match(/<p /g)).toHaveLength(2)
    expect(html).toContain('margin-top:5px')
  })
})

describe('le corps de la bibliographie d’une notice, dans la feuille', () => {
  const CSS = readFileSync('app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//gu, ' ')
  const regles = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/gu)]
    .map(m => ({ selecteurs: m[1].split(',').map(s => s.trim()), corps: m[2] }))

  /** ⛔ Même cran que le pied d'une fiche d'auteur, et dans la MÊME règle : deux écritures
   *  d'un même cran divergent au premier réglage. */
  it('prend le corps du pied d’une fiche d’auteur, dans la même règle', () => {
    const regle = regles.find(r => r.selecteurs.includes('.cs-notation .cs-apparat-bibliographie'))
    expect(regle, 'aucune règle de corps pour la bibliographie d’une notice').toBeDefined()
    expect(regle!.selecteurs).toContain('.pied-biblio.cs-apparat-bibliographie')
    expect(regle!.corps).toMatch(/font-size:\s*0\.6875rem/)
    const entree = regles.find(r => r.selecteurs.includes('.cs-notation .cs-apparat-bibliographie__entree'))
    expect(entree?.selecteurs).toContain('.pied-biblio .cs-apparat-bibliographie__entree')
  })

  /** ⚠️ La règle d'entrée (0,2,0) l'emporte sur le `:last-child` de la famille : sans celle-ci,
   *  la dernière référence poserait un blanc au pied de la notice. */
  it('ne pose aucun blanc sous la dernière référence', () => {
    const derniere = regles.find(r => r.selecteurs.includes('.cs-notation .cs-apparat-bibliographie__entree:last-child'))
    expect(derniere?.corps).toMatch(/margin-bottom:\s*0\s*;/)
  })

  /** Le blanc qui sépare la bibliographie de la prose vaut une LIGNE VIDE de cette prose. */
  it('se détache de la prose par une ligne vide de la prose', async () => {
    const { BLANC_BIBLIOGRAPHIE } = await import('@/app/lib/notationEdition')
    const prose = regles.find(r => r.selecteurs.includes('.cs-notice-prose'))
    const corps = Number(/font-size:\s*([\d.]+)rem/.exec(prose!.corps)![1])
    const interligne = Number(/line-height:\s*([\d.]+)\s*;/.exec(prose!.corps)![1])
    expect(`${corps * interligne}rem`).toBe(BLANC_BIBLIOGRAPHIE)
  })
})
