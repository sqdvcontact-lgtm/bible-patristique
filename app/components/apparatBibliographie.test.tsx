import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  CLASSE_CARACTERE_BIBLIOGRAPHIE,
  CLASSES_BIBLIOGRAPHIE,
} from '@/app/lib/apparatBibliographie'
import { bibliographieDesBlocs } from '@/app/lib/bibleBibliographieOuvrages'
import {
  BLOCS_DU_MEME_AUTEUR,
  ENTREES_DU_MEME_AUTEUR,
} from '@/app/lib/bibleBibliographieOuvrages.fixture'
import { PieceLiminaire } from './BibleEditionParatext'
import { ContenuNoteBiblique } from './NoteBibliqueFenetre'

/**
 * LE STYLE BIBLIOGRAPHIQUE COMMUN de l'apparat.
 *
 * Une seule famille compose toutes les bibliographies : la pièce « Du même
 * auteur », une pièce « Bibliographie », et tout bloc que la donnée déclare
 * `presentation.style = bibliographie`. Cette suite tient l'invariant qui le
 * garantit — ⛔ rien ne se décide sur le TEXTE d'un titre, et aucune classe ne
 * porte le nom d'une pièce, d'une édition ou d'un auteur.
 */

const CSS = readFileSync('app/globals.css', 'utf8')
const INSECABLE = String.fromCharCode(160)

function sansCommentaire(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//gu, ' ')
}

/** Les déclarations de la famille, sélecteur et corps, commentaires ôtés. */
function reglesDeLaFamille(): { selecteur: string; corps: string }[] {
  return [...sansCommentaire(CSS).matchAll(/([^{}]+)\{([^{}]*)\}/gu)]
    .map((m) => ({ selecteur: m[1].trim(), corps: m[2].trim() }))
    .filter((regle) => regle.selecteur.includes('cs-apparat-bibliographie'))
}

/** Le corps des règles qui visent une classe, concaténé. */
function corpsPour(classe: string): string {
  const corps = reglesDeLaFamille()
    .filter((regle) => regle.selecteur.includes(classe))
    .map((regle) => regle.corps)
  expect(corps.length, `aucune règle pour « ${classe} »`).toBeGreaterThan(0)
  return corps.join('\n')
}

/** La valeur d'une propriété, en em, dans un corps de règle. */
function mesureEm(corps: string, propriete: string): number {
  const declaration = corps.split(';')
    .map((morceau) => morceau.trim())
    .find((morceau) => morceau.startsWith(`${propriete}:`))
  expect(declaration, `« ${propriete} » absent de la règle`).toBeDefined()
  const valeur = declaration!.slice(propriete.length + 1).trim()
  // ⚠️ En `em`, et non en `rem` : le retrait suit le corps de la notice, qui
  //  descend lui-même d'un cran sous le texte qui l'accueille.
  expect(valeur.endsWith('em') && !valeur.endsWith('rem'), `« ${propriete} » n'est pas en em`).toBe(true)
  return Number(valeur.slice(0, -2))
}

/** La requête média étroite de la famille, entière. */
function blocMobile(): string {
  const depuis = CSS.indexOf('.cs-apparat-bibliographie__nom-auteur {')
  expect(depuis).toBeGreaterThan(-1)
  const media = CSS.indexOf('@media (max-width: 700px) {', depuis)
  expect(media, 'aucune requête média pour la famille').toBeGreaterThan(-1)
  // La requête se ferme sur une accolade en TÊTE de ligne ; celle de la règle
  // qu'elle contient est indentée, et ne peut donc pas être prise pour elle.
  const fin = CSS.indexOf('\n}', CSS.indexOf('.cs-apparat-bibliographie__entree {', media))
  expect(fin).toBeGreaterThan(media)
  return sansCommentaire(CSS.slice(media, fin + 2))
}

/** Le corps de la règle d'entrée SOUS cette requête. */
function corpsMobileDeLEntree(): string {
  const bloc = blocMobile()
  const debut = bloc.indexOf('.cs-apparat-bibliographie__entree {')
  expect(debut, 'la requête média ne reprend pas l’entrée').toBeGreaterThan(-1)
  return bloc.slice(bloc.indexOf('{', debut) + 1, bloc.indexOf('}', debut))
}

/** Toutes les classes de l'apparat portées par un rendu, dédoublonnées. */
function classesApparat(html: string): string[] {
  return [...new Set(
    [...html.matchAll(/class="([^"]*)"/gu)]
      .flatMap((m) => m[1].split(' '))
      .filter((classe) => classe.startsWith('cs-apparat-')),
  )].sort()
}

const CADRE = [
  CLASSES_BIBLIOGRAPHIE.bloc,
  CLASSES_BIBLIOGRAPHIE.liste,
  CLASSES_BIBLIOGRAPHIE.entree,
]

/** Une liste STRUCTURÉE, dont la clé de pièce établit l'auteur commun. */
function listeStructuree(titre = 'Du même auteur') {
  return renderToStaticMarkup(
    <PieceLiminaire
      titre={titre}
      portee="Bible"
      blocs={[]}
      bibliographie={bibliographieDesBlocs(ENTREES_DU_MEME_AUTEUR, BLOCS_DU_MEME_AUTEUR)}
    />,
  )
}

/** Une bibliographie ORDINAIRE : même donnée, autre pièce, l'auteur y paraît. */
function bibliographieOrdinaire(titre = 'Bibliographie') {
  return renderToStaticMarkup(
    <PieceLiminaire
      titre={titre}
      portee="Bible"
      blocs={[]}
      bibliographie={bibliographieDesBlocs(
        ENTREES_DU_MEME_AUTEUR.map((entree) => ({ ...entree, piece_key: 'bibliographie-generale' })),
        BLOCS_DU_MEME_AUTEUR,
      )}
    />,
  )
}

function bloc(id: string, texte: string, declare: boolean) {
  return {
    id,
    semanticStyleCode: 'notice_bible',
    heading: null,
    placement: 'before' as const,
    textBlocks: [{
      id: `${id}-1`,
      kind: 'commentary' as const,
      form: 'prose' as const,
      text: texte,
      language: 'fr',
      ...(declare ? { presentationStyle: 'bibliographie' as const } : {}),
    }],
  }
}

const LISTE_TEXTUELLE = [
  'Signalons, comme œuvres spéciales :',
  '- ++Jean Chrysostome++, *Homélies sur l’Évangile selon Matthieu*.',
  '- ++Van Steenkiste++ Jean-Aloïs, *Commentarius*, Bruges, 1876.',
].join('\n')

/** Une pièce que la DONNÉE déclare bibliographique, sans liste structurée. */
function bibliographieDeclaree(titre = 'Ouvrages consultés') {
  return renderToStaticMarkup(
    <PieceLiminaire
      titre={titre}
      portee="Bible"
      blocs={[bloc('declaree', LISTE_TEXTUELLE, true)]}
      bibliographie={null}
    />,
  )
}

/** La même note, lue dans la FENÊTRE d'un appel : là, le conteneur compose. */
function noteEnFenetre() {
  return renderToStaticMarkup(
    <ContenuNoteBiblique note={{ blocks: [{
      id: 'note-1',
      kind: 'commentary' as const,
      form: 'prose' as const,
      text: LISTE_TEXTUELLE,
      language: 'fr',
      presentationStyle: 'bibliographie' as const,
    }] }} />,
  )
}

describe('le style bibliographique commun de l’apparat', () => {
  it('compose « Du même auteur » dans la famille commune', () => {
    const html = listeStructuree()
    expect(html).toContain(
      `class="${CLASSES_BIBLIOGRAPHIE.bloc} ${CLASSES_BIBLIOGRAPHIE.sansHote}"`,
    )
    expect(html).toContain(`<ul class="${CLASSES_BIBLIOGRAPHIE.liste}">`)
    expect(html).toContain(`class="${CLASSES_BIBLIOGRAPHIE.entree}"`)
    // ⛔ Le titre de la pièce garde son rang : le style ne le touche pas.
    expect(html).toMatch(/<h2 class="cs-bible-title--t2"[^>]*>Du même auteur<\/h2>/u)
  })

  it('donne EXACTEMENT le même cadre à une pièce déclarée « bibliographie »', () => {
    const structuree = classesApparat(listeStructuree())
    const declaree = classesApparat(bibliographieDeclaree())
    const fenetre = classesApparat(noteEnFenetre())
    for (const classe of CADRE) {
      expect(structuree, 'liste structurée').toContain(classe)
      expect(declaree, 'pièce déclarée').toContain(classe)
      expect(fenetre, 'note en fenêtre').toContain(classe)
    }
    // ⛔ Rien hors de la famille déclarée : ni classe « du-meme-auteur », ni
    // classe « bibliographie-fillion ». Les seuls écarts admis sont la mesure
    // du corps — une pièce lue seule n'a pas de texte hôte — et les styles de
    // caractère, que seule une notice STRUCTURÉE peut porter.
    const admises = new Set<string>([
      ...CADRE,
      CLASSES_BIBLIOGRAPHIE.sansHote,
      ...Object.values(CLASSE_CARACTERE_BIBLIOGRAPHIE),
    ])
    for (const classe of [...structuree, ...declaree, ...fenetre]) {
      expect(admises).toContain(classe)
    }
    // ⚠️ Le modificateur ne se pose QUE là où aucun ancêtre ne compose : la
    // pièce lue seule et le bloc d'apparat, dont le corps est posé sur les
    // paragraphes. ⛔ Pas dans la fenêtre d'une note, qui compose sur son
    // conteneur — l'y mettre figerait un corps que la fenêtre choisit.
    expect(structuree, 'pièce lue seule').toContain(CLASSES_BIBLIOGRAPHIE.sansHote)
    expect(declaree, 'bloc d’apparat').toContain(CLASSES_BIBLIOGRAPHIE.sansHote)
    expect(fenetre, 'note en fenêtre').not.toContain(CLASSES_BIBLIOGRAPHIE.sansHote)
    // ⚠️ Base et modificateur ont EXACTEMENT la même spécificité : c'est
    // l'ordre de déclaration, et lui seul, qui fait gagner le second.
    expect(CSS.indexOf('.cs-apparat-bibliographie--sans-hote {'))
      .toBeGreaterThan(CSS.indexOf('.cs-apparat-bibliographie {'))
  })

  it('ne tire JAMAIS le style du texte du titre', () => {
    // Un intitulé qui ne dit rien de bibliographique : la donnée, elle, le dit.
    for (const titre of ['Ouvrages parus chez le même éditeur', 'Appendice', 'Notice']) {
      expect(classesApparat(listeStructuree(titre))).toContain(CLASSES_BIBLIOGRAPHIE.bloc)
      expect(classesApparat(bibliographieDeclaree(titre))).toContain(CLASSES_BIBLIOGRAPHIE.bloc)
    }
    // Et l'inverse : le titre dit « Bibliographie », la donnée ne déclare rien.
    for (const titre of ['Bibliographie', 'Du même auteur']) {
      const html = renderToStaticMarkup(
        <PieceLiminaire
          titre={titre}
          portee="Bible"
          blocs={[bloc('ordinaire', LISTE_TEXTUELLE, false)]}
          bibliographie={null}
        />,
      )
      expect(html).toContain(titre)
      expect(html).not.toContain('cs-apparat-bibliographie')
    }
    // ⛔ Le silence sur l'auteur vient de la CLÉ de la pièce, non de son titre :
    // la même liste, titrée autrement, tait toujours son auteur.
    expect(listeStructuree('Bibliographie')).not.toContain('Fillion')
    expect(bibliographieOrdinaire('Du même auteur')).toContain('Fillion')
  })

  it('n’ajoute ni puce ni tiret, dans la feuille comme au rendu', () => {
    expect(corpsPour('__liste')).toContain('list-style: none')
    // ⛔ Ce que la donnée ne porte pas, la feuille ne le fabrique pas.
    for (const { selecteur, corps } of reglesDeLaFamille()) {
      expect(selecteur, 'aucun pseudo-élément générateur').not.toMatch(/::(before|after|marker)/u)
      expect(corps, 'aucun contenu généré').not.toMatch(/\bcontent\s*:/u)
      expect(corps, 'aucun fond').not.toMatch(/\bbackground\b/u)
      expect(corps, 'aucune bordure').not.toMatch(/\bborder\b/u)
      expect(corps, 'aucune puce').not.toMatch(/list-style[^;]*:(?!\s*none)/u)
    }
    // Et au rendu : rien n'ouvre une entrée, ni signe ni marqueur de donnée.
    const MARQUEURS = ['-', String.fromCharCode(0x2013), String.fromCharCode(0x2014),
      String.fromCharCode(0x2022), String.fromCharCode(0xB7), '*']
    for (const html of [listeStructuree(), bibliographieDeclaree()]) {
      const entrees = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gu)].map((m) => m[1])
      expect(entrees.length).toBeGreaterThan(0)
      for (const entree of entrees) {
        const nu = entree.replace(/<[^>]+>/gu, '').trimStart()
        expect(MARQUEURS).not.toContain(nu[0])
      }
    }
  })

  it('pose un retrait SUSPENDU : première ligne au bord, suivantes rentrées', () => {
    const corps = corpsPour('__entree')
    const retrait = mesureEm(corps, 'padding-left')
    expect(retrait).toBeGreaterThan(0)
    // Le retrait négatif ramène la PREMIÈRE ligne au bord ; les suivantes
    // gardent la marge intérieure. ⛔ Un retrait de première ligne positif
    // ferait l'inverse — l'alinéa d'un paragraphe, non une bibliographie.
    expect(mesureEm(corps, 'text-indent')).toBe(-retrait)
  })

  it('tait l’auteur sous « Du même auteur », et l’affiche dans une bibliographie ordinaire', () => {
    expect(listeStructuree()).not.toContain('Fillion')
    const html = bibliographieOrdinaire()
    expect(html).toContain(
      `<span class="${CLASSE_CARACTERE_BIBLIOGRAPHIE['bibliographie-auteur']}" data-champ="prenom">Louis-Claude</span>`,
    )
    expect(html).toContain(
      `<span class="${CLASSE_CARACTERE_BIBLIOGRAPHIE['bibliographie-nom-auteur']}" data-champ="nom_famille">Fillion</span>`,
    )
    // ⛔ Petites capitales SÉMANTIQUES : la feuille les compose, le rendu ne
    // passe pas la chaîne en capitales.
    expect(corpsPour('__nom-auteur')).toContain('font-variant: small-caps')
    expect(corpsPour('__nom-auteur')).not.toContain('text-transform')
    expect(html).not.toContain('FILLION')
  })

  it('tient titre, deux-points et sous-titre dans UNE séquence italique', () => {
    const html = listeStructuree()
    expect(html).toContain(
      `<em class="${CLASSE_CARACTERE_BIBLIOGRAPHIE['bibliographie-titre-ouvrage']}" data-champ="titre">Évangile selon saint Jean</em>`
      + `<em>${INSECABLE}: </em>`
      + `<em class="${CLASSE_CARACTERE_BIBLIOGRAPHIE['bibliographie-sous-titre']}" data-champ="sous_titre">Introduction critique et commentaires</em>`,
    )
    // ⛔ La ponctuation n'a pas de style propre : elle hérite de la séquence où
    // elle tombe, et ne sort donc jamais de l'italique du titre.
    expect(html).not.toContain(`<span>${INSECABLE}: </span>`)
    expect(corpsPour('__titre-ouvrage')).toContain('font-style: italic')
    expect(corpsPour('__sous-titre')).toContain('font-style: italic')
  })

  it('garde la hiérarchie bibliographique sur mobile', () => {
    const mobile = corpsMobileDeLEntree()
    const retrait = mesureEm(mobile, 'padding-left')
    expect(retrait).toBeGreaterThan(0)
    expect(mesureEm(mobile, 'text-indent')).toBe(-retrait)
    // Réduit, non supprimé : la ligne respire sans perdre son retrait.
    expect(retrait).toBeLessThan(mesureEm(corpsPour('__entree'), 'padding-left'))
    // ⛔ Le corps ne rapetisse pas, et la liste ne redevient pas un paragraphe.
    const requete = blocMobile()
    expect(requete).not.toContain('font-size')
    expect(requete).not.toContain('list-style')
    expect(requete).not.toContain('display')
  })
})
