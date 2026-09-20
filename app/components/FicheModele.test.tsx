import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { noticeDUnOuvrage } from '@/app/lib/bibleBibliographieOuvrages'
import { CorpsFiche, EnTeteFiche, ListeOuvragesCites, ModaleFiche } from './FicheModele'

const notices = (n: number) => Array.from({ length: n }, (_, i) => noticeDUnOuvrage({
  id: i + 1, ordre: i + 1, titre: `Ouvrage ${i + 1}`,
  sousTitre: null, lieu: null, editeur: null, annee: null, auteur: null,
}))

describe('la liste des ouvrages cités', () => {
  it('au-delà de dix, montre les dix premiers et un bouton qui dit le reste', () => {
    const html = renderToStaticMarkup(<ListeOuvragesCites notices={notices(12)} />)
    expect(html.match(/<li /g)).toHaveLength(10)
    expect(html).toContain('Afficher les deux autres ouvrages')
    expect(html).toContain('aria-expanded="false"')
  })

  it('à dix, ne pose aucun bouton', () => {
    const html = renderToStaticMarkup(<ListeOuvragesCites notices={notices(10)} />)
    expect(html.match(/<li /g)).toHaveLength(10)
    expect(html).not.toContain('<button')
  })

  it('vide, ne rend rien', () => {
    expect(renderToStaticMarkup(<ListeOuvragesCites notices={[]} />)).toBe('')
  })
})

describe('le corps d’une fiche', () => {
  it('pose la réserve avant le texte, et le complément après lui', () => {
    const html = renderToStaticMarkup(
      <CorpsFiche entete={<p>En-tête</p>} complement={<p>Chronologie</p>} suite={<p>Rubrique</p>}>
        <p>Notice</p>
      </CorpsFiche>,
    )
    const reserve = html.indexOf('data-fiche-reserve')
    const notice = html.indexOf('Notice')
    const complement = html.indexOf('data-fiche-complement')
    const suite = html.indexOf('Rubrique')
    expect(reserve).toBeGreaterThan(-1)
    // ⛔ L'ordre du document est l'ordre de lecture : le texte, puis ce qui le documente.
    expect(reserve).toBeLessThan(notice)
    expect(notice).toBeLessThan(complement)
    expect(complement).toBeLessThan(suite)
  })

  it('sans complément, ne pose ni réserve ni colonne', () => {
    const html = renderToStaticMarkup(<CorpsFiche><p>Notice</p></CorpsFiche>)
    expect(html).not.toContain('data-fiche-reserve')
    expect(html).not.toContain('data-fiche-complement')
  })
})

describe('l’en-tête et le cadre', () => {
  it('un en-tête sans rien à dire ne rend rien', () => {
    expect(renderToStaticMarkup(<EnTeteFiche />)).toBe('')
  })

  it('le titre porte l’identifiant qui nomme la fenêtre', () => {
    const html = renderToStaticMarkup(<EnTeteFiche titre="Augustin" titreId="fiche-titre" sousTitre="Aurelius Augustinus" />)
    expect(html).toContain('<h2 id="fiche-titre" class="cs-fiche-titre">Augustin</h2>')
    // ⛔ Le nom OUVRE la fiche : plus de surtitre au-dessus de lui (2026-09-20).
    expect(html.indexOf('Augustin<')).toBeLessThan(html.indexOf('Aurelius'))
  })

  it('le cadre ne se rend pas hors du navigateur', () => {
    expect(renderToStaticMarkup(<ModaleFiche titreId="t" onFermer={() => {}}><p>Fiche</p></ModaleFiche>)).toBe('')
  })
})
