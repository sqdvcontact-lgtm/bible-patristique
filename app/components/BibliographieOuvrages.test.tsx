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

// ⚠️ La FORME commune — famille de classes, absence de puce, retrait suspendu,
// rendu mobile — est éprouvée dans `apparatBibliographie.test.tsx`, qui la tient
// pour toutes les bibliographies à la fois. Ici, on éprouve le CONTENU de la
// liste structurée : ce que chaque notice compose, et depuis quels champs.

describe('la pièce « Du même auteur »', () => {
  it('rend une ligne par ouvrage, quinze fois, dans l’ordre CALCULÉ', () => {
    const lignes = [...rendreDuMemeAuteur().matchAll(/data-ouvrage-id="(\d+)"/g)].map((m) => m[1])
    expect(lignes).toHaveLength(15)
    expect(new Set(lignes).size).toBe(15)
    // ⚠️ L'ordre est celui du CLASSEMENT — auteur, puis titre sans son
    // article —, ⛔ non celui de la page imprimée : « Atlas archéologique »
    // ouvre la liste, « Synopsis evangelica » la ferme. La règle vit dans
    // `comparerOuvrages`, module pur, et s'y éprouve.
    expect(lignes[0]).toBe('649')
    expect(lignes[14]).toBe('639')
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
    expect(html).toContain('<ul class="cs-apparat-bibliographie__liste">')
    // Aucun marqueur d'entrée en tête de ligne, dans le texte comme dans la forme.
    expect(html).not.toMatch(/<li[^>]*>\s*(<[^>]+>)?\s*[-–—•·*]/u)
    expect(html).not.toContain('•')
  })

  it('compose titre et sous-titre en italique, joints par un deux-points insécable', () => {
    const html = rendreDuMemeAuteur()
    expect(html).toContain(
      '<em class="cs-apparat-bibliographie__titre-ouvrage" data-champ="titre">Évangile selon saint Jean</em>'
      + `<em>${String.fromCharCode(160)}: </em>`
      + '<em class="cs-apparat-bibliographie__sous-titre" data-champ="sous_titre">Introduction critique et commentaires</em>',
    )
  })

  it('prend le lieu, l’éditeur normalisé et l’année dans leurs champs', () => {
    const html = rendreDuMemeAuteur()
    const donnees = 'class="cs-apparat-bibliographie__donnees"'
    expect(html).toContain(`<span ${donnees} data-champ="lieu">Paris</span>`)
    expect(html).toContain(`<span ${donnees} data-champ="editeur">P. Lethielleux</span>`)
    expect(html).toContain(`<span ${donnees} data-champ="editeur">Delhomme et Briguet</span>`)
    expect(html).toContain(`<span ${donnees} data-champ="annee">1887</span>`)
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
    expect(html).not.toContain('cs-apparat-bibliographie')
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
    expect(html).toContain(
      '<span class="cs-apparat-bibliographie__auteur" data-champ="prenom">Louis-Claude</span>',
    )
    // ⛔ Les petites capitales sont SÉMANTIQUES : une classe que la feuille
    // compose, jamais une chaîne passée en capitales par le rendu.
    expect(html).toContain(
      '<span class="cs-apparat-bibliographie__nom-auteur" data-champ="nom_famille">Fillion</span>',
    )
    expect(html).not.toContain('FILLION')
  })
})
