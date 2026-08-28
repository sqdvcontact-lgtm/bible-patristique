import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { bibliographieDesBlocs } from '@/app/lib/bibleBibliographieOuvrages'
import {
  BLOCS_DU_MEME_AUTEUR,
  ENTREES_DU_MEME_AUTEUR,
} from '@/app/lib/bibleBibliographieOuvrages.fixture'
import { PieceLiminaire } from './BibleEditionParatext'

const BIBLIOGRAPHIE = bibliographieDesBlocs(ENTREES_DU_MEME_AUTEUR, BLOCS_DU_MEME_AUTEUR)

/**
 * Les quinze blocs matériels, tels que la pièce les portait avant la reprise :
 * une notice précomposée par ouvrage, description matérielle comprise. Ils
 * restent en base pour la provenance, et ce sont eux que le repli compose.
 */
const BLOCS_MATERIELS = ENTREES_DU_MEME_AUTEUR.map((entree, rang) => ({
  id: `bloc-${rang + 1}`,
  semanticStyleCode: 'notice_bible',
  noticeSubtype: 'bibliography' as const,
  heading: rang === 0 ? 'Du même auteur' : `Du même auteur — notice ${rang + 1}`,
  placement: 'before' as const,
  textBlocks: [{
    id: `bloc-${rang + 1}-1`,
    kind: 'commentary' as const,
    form: 'prose' as const,
    text: `${entree.titre}, ${entree.lieu}, ${entree.editeur}, ${entree.annee}, in-8° de 500 pages.`,
    language: 'fr',
  }],
}))

function rendreDuMemeAuteur() {
  return renderToStaticMarkup(
    <PieceLiminaire
      titre="Du même auteur"
      portee="Bible"
      blocs={BLOCS_MATERIELS}
      bibliographie={BIBLIOGRAPHIE}
    />,
  )
}

/** La déclaration de la liste dans la feuille du site, accolades comprises. */
function regleDeLaListe(): string {
  const css = readFileSync('app/globals.css', 'utf8')
  const debut = css.indexOf('.cs-bibliographie-ouvrages {')
  expect(debut).toBeGreaterThan(-1)
  return css.slice(debut, css.indexOf('}', debut) + 1)
}

describe('la pièce « Du même auteur »', () => {
  it('rend une ligne par ouvrage, quinze fois, dans l’ordre', () => {
    const lignes = [...rendreDuMemeAuteur().matchAll(/data-ouvrage-id="(\d+)"/g)].map((m) => m[1])
    expect(lignes).toHaveLength(15)
    expect(new Set(lignes).size).toBe(15)
    expect(lignes[0]).toBe('645')
    expect(lignes[14]).toBe('651')
  })

  it('ancre chaque ligne sur son `ouvrage_id`, jamais sur son rang', () => {
    const html = rendreDuMemeAuteur()
    expect(html).toContain('id="ouvrage-645"')
    expect(html).toContain('id="ouvrage-641"')
    expect(html).not.toContain('id="ouvrage-1"')
  })

  it('n’écrit le titre de la pièce QU’UNE fois', () => {
    const html = rendreDuMemeAuteur()
    expect(html.match(/Du même auteur/g)).toHaveLength(1)
    expect(html).toMatch(/<h2 class="cs-bible-title--t2"[^>]*>Du même auteur<\/h2>/)
  })

  it('compose une vraie liste, sans puce ni tiret visible', () => {
    const html = rendreDuMemeAuteur()
    expect(html).toContain('<ul class="cs-bibliographie-ouvrages">')
    // Aucun marqueur d'entrée en tête de ligne, dans le texte comme dans la forme.
    expect(html).not.toMatch(/<li[^>]*>\s*(<[^>]+>)?\s*[-–—•·*]/u)
    expect(html).not.toContain('•')
    const regle = regleDeLaListe()
    expect(regle).toContain('list-style: none')
    expect(regle).not.toContain('border')
    expect(regle).not.toContain('background')
  })

  it('compose titre et sous-titre en italique, joints par un deux-points insécable', () => {
    const html = rendreDuMemeAuteur()
    expect(html).toContain(
      '<em data-champ="titre">Évangile selon saint Jean</em>'
      + `<em>${String.fromCharCode(160)}: </em>`
      + '<em data-champ="sous_titre">Introduction critique et commentaires</em>',
    )
  })

  it('prend le lieu, l’éditeur normalisé et l’année dans leurs champs', () => {
    const html = rendreDuMemeAuteur()
    expect(html).toContain('<span data-champ="lieu">Paris</span>')
    expect(html).toContain('<span data-champ="editeur">P. Lethielleux</span>')
    expect(html).toContain('<span data-champ="editeur">Delhomme et Briguet</span>')
    expect(html).toContain('<span data-champ="annee">1887</span>')
  })

  it('ne répète pas l’auteur, que le titre de la pièce établit déjà', () => {
    expect(rendreDuMemeAuteur()).not.toContain('Fillion')
  })

  it('n’affiche aucune description matérielle, ni rien des anciens blocs', () => {
    const html = rendreDuMemeAuteur()
    expect(html).not.toContain('in-8')
    expect(html).not.toContain('500 pages')
    // ⛔ Le texte des blocs matériels n'est plus la source de l'affichage.
    expect(html).not.toContain('notice 2')
  })

  it('retombe sur les blocs matériels quand la liste structurée est ABSENTE', () => {
    const html = renderToStaticMarkup(
      <PieceLiminaire titre="Du même auteur" portee="Bible" blocs={BLOCS_MATERIELS} bibliographie={null} />,
    )
    expect(html).toContain('in-8')
    // ⛔ Et jamais un mélange : aucune entrée structurée dans ce rendu.
    expect(html).not.toContain('cs-bibliographie-ouvrages')
    expect(html).not.toContain('data-ouvrage-id')
  })
})

describe('une autre liste d’ouvrages', () => {
  it('rend le nom de famille en petites capitales, depuis la donnée', () => {
    const autre = bibliographieDesBlocs(
      ENTREES_DU_MEME_AUTEUR.map((entree) => ({ ...entree, piece_key: 'bibliographie-generale' })),
      BLOCS_DU_MEME_AUTEUR,
    )
    const html = renderToStaticMarkup(
      <PieceLiminaire titre="Bibliographie" portee="Bible" blocs={[]} bibliographie={autre} />,
    )
    expect(html).toContain('<span data-champ="prenom">Louis-Claude</span>')
    expect(html).toMatch(/<span data-champ="nom_famille" style="font-variant:small-caps[^"]*">Fillion<\/span>/)
  })
})
