import { describe, expect, it } from 'vitest'
import {
  MARQUE_ENTREE,
  MARQUE_RUBRIQUE,
  RETRAIT_ENTREE,
  SEPARATEURS_TETE,
  SEPARATEUR_RENDU,
  STYLE_ENTREE_NOTATION,
  STYLE_LISTE_NOTATION,
  STYLE_NOTATION,
  STYLE_RUBRIQUE_NOTATION,
  STYLE_TETE_NOTATION,
  BLANC_BLOC,
  BLANC_COUTURE,
  BLANC_GROUPE,
  blancAuDessus,
  lireNotationEdition,
  porteUneNotation,
} from './notationEdition'
import type { BlocNotation } from './notationEdition'

/**
 * Le TÉMOIN est la notice réelle de l'édition Bondurand 1887 du *Manuel pour mon fils*,
 * telle que l'auteur l'a écrite le 12 septembre 2026, reprise ici dans la notation.
 * ⛔ Ne pas l'abréger : c'est le seul document qui porte les quatre cas à la fois — une
 * prose de chapeau, deux rubriques, des sigles d'une lettre, et une remarque dont la
 * tête est une phrase.
 */
const BONDURAND = [
  "Transmission et sigles de l'édition Bondurand (1887).",
  '',
  '## Témoins',
  '- P — Paris, Bibliothèque nationale de France, latin 12293 : copie du XVIIe siècle dérivée du manuscrit aujourd’hui perdu qui avait appartenu à Pierre de Marca.',
  '- N — Nîmes, Bibliothèque Carré d’Art, ms. 393 : fragments anciens du Manuel.',
  '- b. l. — bonne leçon.',
  '- m. l. — mauvaise leçon.',
  '',
  '## Remarques',
  "- Chapitre XLII — Bondurand indique que ce chapitre n'est conservé ni par P ni par N, bien que son titre soit transmis par les tables des chapitres.",
  '- Témoin découvert après Bondurand — B : Barcelona, Biblioteca de Catalunya, ms. 569 (XIVe siècle).',
].join('\n')

describe('la notation d’une notice d’édition', () => {
  it('lit la notice de Bondurand dans l’ordre, et n’invente aucun bloc', () => {
    const blocs = lireNotationEdition(BONDURAND)
    expect(blocs.map(b => b.type)).toEqual(['prose', 'rubrique', 'liste', 'rubrique', 'liste'])
  })

  it('coupe un sigle de sa désignation', () => {
    const blocs = lireNotationEdition(BONDURAND)
    const temoins = blocs[2]
    if (temoins.type !== 'liste') throw new Error('le bloc des témoins devrait être une liste')
    expect(temoins.entrees.map(e => e.tete)).toEqual(['P', 'N', 'b. l.', 'm. l.'])
    expect(temoins.entrees[2].corps).toBe('bonne leçon.')
  })

  it('accepte une tête qui est une phrase entière', () => {
    const blocs = lireNotationEdition(BONDURAND)
    const remarques = blocs[4]
    if (remarques.type !== 'liste') throw new Error('le bloc des remarques devrait être une liste')
    expect(remarques.entrees[0].tete).toBe('Chapitre XLII')
    expect(remarques.entrees[1].tete).toBe('Témoin découvert après Bondurand')
    expect(remarques.entrees[1].corps).toMatch(/^B : Barcelona/)
  })

  it('nomme librement ses rubriques', () => {
    const blocs = lireNotationEdition('## Conventions de transcription\n- j — noté i.')
    expect(blocs[0]).toEqual({ type: 'rubrique', texte: 'Conventions de transcription' })
  })
})

describe('ce qui reste de la PROSE', () => {
  /** ⛔ La rétro-compatibilité, et c'est ce qui permet de poser la notation sans
   *  migration : une notice déjà écrite continue de se rendre comme avant. */
  it('rend une notice sans marque en un seul bloc de prose', () => {
    const brut = 'Première phrase.\nSeconde phrase.'
    expect(lireNotationEdition(brut)).toEqual([{ type: 'prose', texte: brut }])
    expect(porteUneNotation(brut)).toBe(false)
  })

  it('garde les sauts de ligne d’un même bloc de prose', () => {
    const blocs = lireNotationEdition('Une ligne.\nUne autre.')
    expect(blocs).toHaveLength(1)
    expect(blocs[0]).toHaveProperty('texte', 'Une ligne.\nUne autre.')
  })

  /** ⛔ LA RÉTRO-COMPATIBILITÉ EST EXACTE, et c'est ce qui se vérifie ici : une notice
   *  sans marque rend UN bloc dont le texte est le sien, ligne vide comprise. Fermer le
   *  bloc sur une ligne vide la remplacerait par le blanc du conteneur, et la notice se
   *  resserrerait le jour où l'on pose la notation — « à peu près comme avant » n'est pas
   *  « comme avant ». */
  it('garde les lignes vides de la prose, et ne rend qu’un bloc', () => {
    const brut = 'Un.\n\nDeux.'
    expect(lireNotationEdition(brut)).toEqual([{ type: 'prose', texte: brut }])
  })

  it('laisse tomber les lignes vides de tête et de queue', () => {
    expect(lireNotationEdition('\n\nUn.\n\n')).toEqual([{ type: 'prose', texte: 'Un.' }])
  })

  it('sépare la prose de ce qui porte une marque', () => {
    expect(lireNotationEdition('Un.\n\n## Témoins\n- P — Paris.\n\nDeux.').map(b => b.type))
      .toEqual(['prose', 'rubrique', 'liste', 'prose'])
  })

  it('ne rend rien sur un texte vide ou absent', () => {
    expect(lireNotationEdition(null)).toEqual([])
    expect(lireNotationEdition(undefined)).toEqual([])
    expect(lireNotationEdition('   \n  \n')).toEqual([])
  })

  it('lit indifféremment les fins de ligne du dépôt', () => {
    const lf = lireNotationEdition('## Témoins\n- P — Paris.')
    const crlf = lireNotationEdition('## Témoins\r\n- P — Paris.')
    expect(crlf).toEqual(lf)
  })
})

describe('la tête d’une entrée', () => {
  it('accepte le cadratin comme le demi-cadratin', () => {
    for (const sep of SEPARATEURS_TETE) {
      const blocs = lireNotationEdition(`${MARQUE_ENTREE}S${sep}Sessorianus.`)
      expect(blocs[0]).toEqual({ type: 'liste', entrees: [{ tete: 'S', corps: 'Sessorianus.' }] })
    }
  })

  it('coupe au PREMIER tiret, et laisse les suivants au corps', () => {
    const blocs = lireNotationEdition('- P — Paris, BnF — copie du XVIIe siècle.')
    expect(blocs[0]).toEqual({
      type: 'liste',
      entrees: [{ tete: 'P', corps: 'Paris, BnF — copie du XVIIe siècle.' }],
    })
  })

  it('laisse entière une entrée qui ne déclare aucune tête', () => {
    const blocs = lireNotationEdition('- Une remarque sans sigle.')
    expect(blocs[0]).toEqual({
      type: 'liste',
      entrees: [{ tete: null, corps: 'Une remarque sans sigle.' }],
    })
  })

  it('ne coupe pas sur un trait d’union, qui ouvre déjà la ligne', () => {
    const blocs = lireNotationEdition('- P - Paris.')
    expect(blocs[0]).toEqual({ type: 'liste', entrees: [{ tete: null, corps: 'P - Paris.' }] })
  })

  it('refuse une coupe qui laisserait une moitié vide', () => {
    expect(lireNotationEdition('- — Paris.')[0]).toEqual({
      type: 'liste',
      entrees: [{ tete: null, corps: '— Paris.' }],
    })
    expect(lireNotationEdition('- P —')[0]).toEqual({
      type: 'liste',
      entrees: [{ tete: null, corps: 'P —' }],
    })
  })
})

describe('ce que la notation REFUSE de deviner', () => {
  /** ⚠️ La ligne vide ne ferme QUE la liste : sans cela, deux groupes que rien ne sépare
   *  n'en feraient qu'un, et la ligne vide ne ferait rien du tout. */
  it('réunit les entrées consécutives en UNE liste, et les sépare sur une ligne vide', () => {
    expect(lireNotationEdition('- A — un.\n- B — deux.')).toHaveLength(1)
    expect(lireNotationEdition('- A — un.\n\n- B — deux.')).toHaveLength(2)
  })

  it('ne pose ni rubrique sans nom ni entrée sans texte', () => {
    expect(lireNotationEdition(`${MARQUE_RUBRIQUE.trim()}\n- P — Paris.`).map(b => b.type))
      .toEqual(['liste'])
    expect(lireNotationEdition(`${MARQUE_ENTREE.trim()}\n## Témoins`).map(b => b.type))
      .toEqual(['rubrique'])
  })

  it('ne prend un dièse pour une marque que s’il est suivi d’une espace', () => {
    expect(lireNotationEdition('##Témoins')).toEqual([{ type: 'prose', texte: '##Témoins' }])
    expect(lireNotationEdition('-P — Paris.')).toEqual([
      { type: 'prose', texte: '-P — Paris.' },
    ])
  })

  it('dit si une notice porte une marque', () => {
    expect(porteUneNotation('## Témoins')).toBe(true)
    expect(porteUneNotation('- P — Paris.')).toBe(true)
    expect(porteUneNotation('De la prose seule.')).toBe(false)
    expect(porteUneNotation(null)).toBe(false)
  })
})

describe('la composition', () => {
  it('compose le retrait suspendu par deux valeurs opposées', () => {
    expect(STYLE_ENTREE_NOTATION.paddingLeft).toBe(RETRAIT_ENTREE)
    expect(STYLE_ENTREE_NOTATION.textIndent).toBe(`-${RETRAIT_ENTREE}`)
  })

  it('ne justifie ni ne césure une entrée', () => {
    expect(STYLE_ENTREE_NOTATION.textAlign).toBe('left')
    expect(STYLE_ENTREE_NOTATION.hyphens).toBe('none')
  })

  it('monte l’encre de la rubrique d’un rang, et garde le rang du volet', () => {
    expect(STYLE_RUBRIQUE_NOTATION.color).toBe('var(--cs-texte-second)')
    expect(STYLE_RUBRIQUE_NOTATION.fontSize).toBe('0.59375rem')
    expect(STYLE_RUBRIQUE_NOTATION.letterSpacing).toBe('0.06em')
  })

  /** ⛔ Un raccourci `margin` écrirait la même marge deux fois dans le même objet, et la
   *  composition ne tiendrait que par l'ordre des clés. */
  it('n’écrit aucune marge en raccourci', () => {
    expect(STYLE_RUBRIQUE_NOTATION).not.toHaveProperty('margin')
    expect(STYLE_LISTE_NOTATION).not.toHaveProperty('margin')
  })

  /** ⛔ Le conteneur ne pose AUCUN écart : deux écritures du même blanc s'ajouteraient
   *  sans qu'aucune des deux ne le sache. */
  it('laisse le blanc au voisinage, et non au conteneur', () => {
    expect(STYLE_NOTATION).not.toHaveProperty('gap')
    expect(STYLE_RUBRIQUE_NOTATION.marginTop).toBe('0')
    expect(STYLE_LISTE_NOTATION.marginTop).toBe(0)
  })

  /** ⚠️ Une rubrique nomme ce qui la SUIT : elle en est cousue, et prend son air au-dessus.
   *  Mesuré sur la composition servie avant cette règle : 12 px au-dessus et 11 en dessous,
   *  si bien qu'elle n'appartenait à aucune des deux listes qu'elle séparait. */
  it('coud la rubrique à ce qu’elle nomme', () => {
    const prose = { type: 'prose', texte: 'Un.' } satisfies BlocNotation
    const rubrique = { type: 'rubrique', texte: 'Témoins' } satisfies BlocNotation
    const liste = { type: 'liste', entrees: [] } satisfies BlocNotation
    expect(blancAuDessus(null, prose)).toBe('0')
    expect(blancAuDessus(prose, rubrique)).toBe(BLANC_GROUPE)
    expect(blancAuDessus(liste, rubrique)).toBe(BLANC_GROUPE)
    expect(blancAuDessus(rubrique, liste)).toBe(BLANC_COUTURE)
    expect(blancAuDessus(prose, liste)).toBe(BLANC_BLOC)
    expect(blancAuDessus(liste, prose)).toBe(BLANC_BLOC)
    expect(parseFloat(BLANC_GROUPE)).toBeGreaterThan(parseFloat(BLANC_BLOC))
    expect(parseFloat(BLANC_COUTURE)).toBeLessThan(parseFloat(BLANC_BLOC))
  })

  it('pose la tête en relief sans lui donner un rang de titre', () => {
    expect(STYLE_TETE_NOTATION.fontWeight).toBe(500)
  })

  // ⛔ L'INSÉCABLE S'ÉCRIT EN POINT DE CODE : tapée, elle ne se distingue pas d'une
  // espace ordinaire à la lecture, et le dépôt a déjà perdu des fines de cette façon.
  it('repose le tiret avec une insécable devant', () => {
    const insecable = String.fromCharCode(0x00a0)
    const cadratin = String.fromCharCode(0x2014)
    expect(SEPARATEUR_RENDU).toBe(insecable + cadratin + ' ')
  })
})
