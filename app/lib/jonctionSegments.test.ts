import { describe, expect, it } from 'vitest'
import {
  JONCTIONS_SYMBOLIQUES,
  LIANT_DEFAUT,
  estJonctionSymbolique,
  liantAvantSegment,
  liantSymbolique,
  recomposerSegments,
} from './jonctionSegments'
import { normaliserEspacesOriginal } from './typographie'
import { cesurerLatin, sansCesures } from './cesuresLatines'

const FINE = ' '      // espace fine insécable, posée par `normaliserEspacesOriginal`
const INSECABLE = ' ' // espace insécable, telle qu'elle figure dans la colonne
const CESURE = '­'    // césure conditionnelle, posée par `cesurerLatin`

// Les deux segments relevés en base (`TXT_A0010O0023_LA_1895_ZYCHA`, id 619246 et
// 619247), abrégés à leur frontière. C'est là que le lecteur composait
// « gignerent?spacenon ».
const ZYCHA_FIN = 'nec aduertunt eos qui prius sunt conditi duos uel eos etiam quos genuerunt tam diu uixisse, ut multos gignerent?'
const ZYCHA_SUITE = 'non enim et Adam ipse eos solos genuit, quorum nomina leguntur, cum de illo scriptura loquens ita concludat, quod genuerit filios et filias.'

describe('vocabulaire de `join_before`', () => {
  it('ne reconnaît comme jetons que les quatre valeurs du modèle éditorial', () => {
    expect([...JONCTIONS_SYMBOLIQUES]).toEqual(['none', 'space', 'line_break', 'paragraph_break'])
    for (const jeton of JONCTIONS_SYMBOLIQUES) expect(estJonctionSymbolique(jeton)).toBe(true)
    expect(estJonctionSymbolique(' ')).toBe(false)
    expect(estJonctionSymbolique('')).toBe(false)
  })

  // Une valeur par jeton du vocabulaire, `space` compris : c'est la table dont
  // l'absence faisait imprimer le mot technique.
  it('matérialise chaque jeton, et n’en rend jamais le nom', () => {
    expect(liantSymbolique('none')).toBe('')
    expect(liantSymbolique('space')).toBe(' ')
    expect(liantSymbolique('line_break')).toBe('\n')
    expect(liantSymbolique('paragraph_break')).toBe('\n\n')
    for (const jeton of JONCTIONS_SYMBOLIQUES) expect(liantSymbolique(jeton)).not.toContain(jeton)
  })

  it('laisse passer les séparateurs LITTÉRAUX des lots anciens', () => {
    // Mirandol, Ceriziers, Jeannin : la colonne porte le séparateur lui-même.
    expect(liantAvantSegment('')).toBe('')
    expect(liantAvantSegment(' ')).toBe(' ')
    expect(liantAvantSegment('\n')).toBe('\n')
    expect(liantAvantSegment('\n\n')).toBe('\n\n')
    expect(liantAvantSegment(' — ')).toBe(' — ')
    expect(liantAvantSegment(INSECABLE)).toBe(INSECABLE)
  })

  it('retombe sur l’espace simple quand la donnée ne dit rien', () => {
    expect(liantAvantSegment(null)).toBe(LIANT_DEFAUT)
    expect(liantAvantSegment(undefined)).toBe(LIANT_DEFAUT)
    expect(LIANT_DEFAUT).toBe(' ')
  })

  it('n’imprime jamais un jeton inconnu, il l’ignore', () => {
    expect(liantAvantSegment('espace_fine')).toBe(LIANT_DEFAUT)
    expect(liantAvantSegment('SPACE')).toBe(LIANT_DEFAUT)
    expect(liantAvantSegment('espace_fine')).not.toContain('espace')
  })

  it('accepte un liant par défaut propre à la surface', () => {
    // Les vers se joignent par un saut de ligne (colonne originale du bilingue).
    expect(liantAvantSegment(null, '\n')).toBe('\n')
    // Un jeton explicite l’emporte toujours sur le défaut de la surface.
    expect(liantAvantSegment('space', '\n')).toBe(' ')
  })
})

describe('recomposition d’un paragraphe', () => {
  it('recompose la frontière signalée avec une espace, jamais avec le mot `space`', () => {
    const texte = recomposerSegments([
      { texte: 'ut multos gignerent?', joinBefore: null },
      { texte: 'non enim et Adam ipse…', joinBefore: 'space' },
    ])
    expect(texte).toBe('ut multos gignerent? non enim et Adam ipse…')
    expect(texte).not.toContain('gignerent?spacenon')
    expect(texte).not.toContain('space')
  })

  it('ne préfixe pas le premier segment, quel que soit son `join_before`', () => {
    expect(recomposerSegments([{ texte: 'Quomodo Cain', joinBefore: null }])).toBe('Quomodo Cain')
    expect(recomposerSegments([{ texte: 'Quomodo Cain', joinBefore: 'space' }])).toBe('Quomodo Cain')
    expect(recomposerSegments([{ texte: 'Quomodo Cain', joinBefore: ' — ' }])).toBe('Quomodo Cain')
  })

  it('respecte l’ordre reçu et n’applique que le liant du segment courant', () => {
    expect(recomposerSegments([
      { texte: 'un', joinBefore: null },
      { texte: 'deux', joinBefore: 'space' },
      { texte: 'trois', joinBefore: 'none' },
      { texte: 'quatre', joinBefore: 'line_break' },
      { texte: 'cinq', joinBefore: 'paragraph_break' },
    ])).toBe('un deuxtrois\nquatre\n\ncinq')
  })

  it('applique la mise en forme au texte des segments, jamais aux liants', () => {
    // ⛔ Le liant n'entre pas dans le moteur typographique : `composer` ne voit que
    // les `segment_texte`. Une métadonnée ne doit jamais pouvoir être césurée.
    const texte = recomposerSegments(
      [{ texte: 'a?', joinBefore: null }, { texte: 'b', joinBefore: 'space' }],
      { composer: t => `[${normaliserEspacesOriginal(t)}]` },
    )
    expect(texte).toBe(`[a${FINE}?] [b]`)
  })
})

describe('frontière entre deux unités-source', () => {
  // `join_before` décrit la jonction du segment avec ce qui le précède DANS SON
  // UNITÉ. Au passage d'une unité à l'autre, rien n'est hérité de l'unité
  // précédente : c'est le segment courant, et lui seul, qui commande.
  type Fixture = { texte: string; joinBefore: string | null; unite: string }

  const recomposer = (segments: readonly Fixture[]) =>
    recomposerSegments(segments.map(({ texte, joinBefore }) => ({ texte, joinBefore })))

  it('sépare deux unités par l’espace du lecteur quand la donnée ne dit rien (Zycha, Dhuoda)', () => {
    // Dhuoda de Bondurand : la phrase court de l'unité P0035 à l'unité P0036, dans
    // le même paragraphe ; le premier segment de la nouvelle unité porte `NULL`.
    expect(recomposer([
      { texte: 'Sic in hoc opusculo parvitatis meæ inveneris, et in', joinBefore: null, unite: 'DHUODA-BONDURAND-P0035' },
      { texte: 'electorum consortio, cum pueris ex igne evasis', joinBefore: null, unite: 'DHUODA-BONDURAND-P0036' },
    ])).toBe('Sic in hoc opusculo parvitatis meæ inveneris, et in electorum consortio, cum pueris ex igne evasis')
  })

  it('n’invente rien quand l’unité suivante demande la soudure (Mirandol)', () => {
    // 475 premiers segments d'unité de Mirandol portent `''` : un mot coupé d'une
    // unité à l'autre s'y recolle sans espace. Le défaut du lecteur ne doit pas
    // écraser cette instruction.
    expect(recomposer([
      { texte: 'consola-', joinBefore: null, unite: 'MIRANDOL-P0100' },
      { texte: 'tion', joinBefore: '', unite: 'MIRANDOL-P0101' },
    ])).toBe('consola-tion')
  })

  it('ne reporte jamais le jeton d’une unité sur la frontière de la suivante', () => {
    const texte = recomposer([
      { texte: 'ut multos gignerent?', joinBefore: 'space', unite: 'ZYC-B01-Q001' },
      { texte: 'Quaeri solet quomodo Mathusalam', joinBefore: null, unite: 'ZYC-B01-Q002' },
    ])
    expect(texte).toBe('ut multos gignerent? Quaeri solet quomodo Mathusalam')
    expect(texte).not.toContain('space')
  })
})

describe('non-régression du lecteur d’œuvre (TXT_A0010O0023_LA_1895_ZYCHA)', () => {
  // La chaîne EXACTE du lecteur pour une édition en langue originale :
  // `composerCorps(preparerTexteSegment(texte))`, soit
  // `cesurerLatin(normaliserEspacesOriginal(texte))` hors version `_LEGACY`.
  const composerCorps = (t: string) => cesurerLatin(normaliserEspacesOriginal(t))

  const rendu = recomposerSegments(
    [
      { texte: ZYCHA_FIN, joinBefore: null },
      { texte: ZYCHA_SUITE, joinBefore: 'space' },
    ],
    { composer: composerCorps },
  )
  const sansCesure = sansCesures(rendu)

  it('compose « gignerent ? non enim », et jamais « gignerent ?spacenon »', () => {
    expect(sansCesure).toContain(`ut multos gignerent${FINE}? non enim et Adam ipse`)
    expect(sansCesure).not.toContain(`gignerent${FINE}?spacenon`)
    expect(sansCesure).not.toContain('?spacenon')
  })

  it('ne laisse entrer aucune métadonnée dans le texte rendu', () => {
    for (const jeton of JONCTIONS_SYMBOLIQUES) expect(sansCesure).not.toContain(jeton)
  })

  it('pose les césures conditionnelles sur les mots, non sur la frontière', () => {
    // Le défaut se lisait « gi-gne-rent ?spacenon » : la césure conditionnelle et la
    // fine insécable appartiennent bien au rendu, et le liant reste une espace nue.
    expect(rendu).toContain(`gi${CESURE}gne${CESURE}rent${FINE}? non enim`)
  })
})
