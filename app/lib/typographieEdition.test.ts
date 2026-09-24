import { describe, expect, it } from 'vitest'
import {
  composerLignesImport,
  lireRegimeTypographique,
  normaliserTypographieEdition,
} from './typographieEdition'

// Par point de code, jamais par littéral : ces espaces se ressemblent toutes à l'écran.
const FINE = String.fromCharCode(0x202f)
const NBSP = String.fromCharCode(0x00a0)

describe('normaliserTypographieEdition (charte § 3.2, au stockage)', () => {
  it('compose les ponctuations hautes et les guillemets, collés ou non', () => {
    expect(normaliserTypographieEdition('Qui es-tu? Il dit: « Je suis ; »'))
      .toBe(`Qui es-tu${FINE}? Il dit${NBSP}: «${FINE}Je suis${FINE};${FINE}»`)
    expect(normaliserTypographieEdition('«Viens!»')).toBe(`«${FINE}Viens${FINE}!${FINE}»`)
  })

  it('ramène toute espace existante au bon point de code', () => {
    expect(normaliserTypographieEdition(`mot${NBSP}; mot ${FINE}: suite`))
      .toBe(`mot${FINE}; mot${NBSP}: suite`)
  })

  it('une suite de hautes ponctuations ne prend qu’une fine', () => {
    expect(normaliserTypographieEdition('Quoi ?!')).toBe(`Quoi${FINE}?!`)
  })

  it('laisse les heures, les références et les marques d’éditeur', () => {
    expect(normaliserTypographieEdition('à 10:30, Jn 3:16')).toBe('à 10:30, Jn 3:16')
    expect(normaliserTypographieEdition('le mot (?) et [!]')).toBe('le mot (?) et [!]')
  })

  it('ne touche ni aux adresses, ni aux entités, ni aux balises', () => {
    const texte = 'Voir https://exemple.org/a?b=1;c et &amp; puis <span style="color: red;">x</span>'
    expect(normaliserTypographieEdition(texte)).toBe(texte)
  })

  it('compose aussi autour d’une balise et d’un appel de note', () => {
    expect(normaliserTypographieEdition('<i>Deus</i>; glaive[[65]] ;'))
      .toBe(`<i>Deus</i>${FINE}; glaive[[65]]${FINE};`)
  })

  it('apostrophe, s long, ligatures, espaces doubles et bords', () => {
    expect(normaliserTypographieEdition('  l\'ame  ſe ﬁe  '))
      .toBe('l’ame se fie')
  })

  it('ne modernise jamais la langue', () => {
    expect(normaliserTypographieEdition('il avoit dit')).toBe('il avoit dit')
  })

  it('garde les sauts de ligne de l’édition', () => {
    expect(normaliserTypographieEdition('vers un\nvers deux')).toBe('vers un\nvers deux')
  })

  it('est idempotente', () => {
    const une = normaliserTypographieEdition('« Est-ce vrai ? » dit-il: oui; non! l\'ami')
    expect(normaliserTypographieEdition(une)).toBe(une)
  })
})

describe('composerLignesImport : l’utilitaire d’écriture des importeurs', () => {
  const lignes = [
    { segment_numero: 1, segment_texte: 'Il dit: « viens »', ref_niv1_texte: 'Livre I', lien_1: 'Jn 3:16' },
    { segment_numero: 2, segment_texte: null, ref_niv1_texte: null, lien_1: null },
  ]

  it('une édition déclarée entre composée, sur les seuls champs nommés', () => {
    const [une, deux] = composerLignesImport(lignes, ['segment_texte', 'ref_niv1_texte'], 'edition')
    expect(une.segment_texte).toBe(`Il dit${NBSP}: «${FINE}viens${FINE}»`)
    expect(une.lien_1).toBe('Jn 3:16')
    expect(deux.segment_texte).toBeNull()
    expect(lignes[0].segment_texte).toBe('Il dit: « viens »')
  })

  it('une édition diplomatique entre telle quelle', () => {
    const [une] = composerLignesImport(lignes, ['segment_texte'], 'diplomatique')
    expect(une.segment_texte).toBe('Il dit: « viens »')
  })

  it('un régime non déclaré est refusé : jamais de composition par défaut', () => {
    expect(lireRegimeTypographique(undefined)).toBeNull()
    expect(lireRegimeTypographique('moderne')).toBeNull()
    expect(() => composerLignesImport(lignes, ['segment_texte'], undefined as never)).toThrow()
  })
})
