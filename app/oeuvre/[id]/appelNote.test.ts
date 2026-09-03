import { describe, it, expect } from 'vitest'
import { titreSansAppelsDeNote, notesPourTexte, preparerTitreColophon, lireSuiteAppels, detacherDernierMot, separateurAppels, rendreTexteAvecNotes } from './appelNote'

// Écrite en toutes lettres : dans un fichier de test, une espace insécable
// littérale ne se distingue pas d'une espace ordinaire à la lecture, et une
// assertion qu'on ne sait pas relire ne prouve rien.
const INSECABLE = ' '

describe('espacement typographique d’un titre', () => {
  it('pose l’espace insécable devant la ponctuation haute', () => {
    expect(preparerTitreColophon('Livre premier : la cité')).toBe(`Livre premier${INSECABLE}: la${INSECABLE}cité`)
  })

  it('resserre l’espace qui précède une virgule ou un point', () => {
    expect(preparerTitreColophon('Livre premier , la cité')).toBe(`Livre premier, la${INSECABLE}cité`)
  })

  it('garde le saut de ligne quand la seconde ligne s’ouvre sur une ponctuation haute', () => {
    expect(preparerTitreColophon('Livre premier\n: la cité de Dieu'))
      .toBe(`Livre premier\n: la${INSECABLE}cité de${INSECABLE}Dieu`)
  })

  it('garde le saut de ligne quand la seconde ligne s’ouvre sur une virgule ou un point', () => {
    expect(preparerTitreColophon('Sur la Cité de Dieu\n. Dessein de cet ouvrage'))
      .toBe(`Sur la${INSECABLE}Cité de${INSECABLE}Dieu\n. Dessein de${INSECABLE}cet ouvrage`)
  })
})

// Le gluon U+2060 se pose après tout trait d'union entre deux lettres ; l'espace qui suit
// un mot d'une ou deux lettres devient insécable. Voir `preparerTitreColophon`.
const GLUON = String.fromCharCode(0x2060)
const FINE = String.fromCharCode(0x202f)

describe('ce qu’un titre ne coupe pas', () => {
  it('interdit la coupe après le trait d’union des formes composées', () => {
    expect(preparerTitreColophon('Comment une arche a-t-elle pu être construite, c’est-à-dire par Noé'))
      .toBe(`Comment une arche a-${GLUON}t-${GLUON}elle pu être construite, c’est-${GLUON}à-${GLUON}dire par Noé`)
  })

  it('laisse le trait d’union d’un intervalle de chiffres', () => {
    expect(preparerTitreColophon('Genèse 7, 8-9')).toBe('Genèse 7, 8-9')
  })

  it('colle un mot d’une ou deux lettres au mot qui le suit, casse du mot initial comprise', () => {
    expect(preparerTitreColophon('De l’élévation de l’eau au-dessus des montagnes'))
      .toBe(`De${INSECABLE}l’élévation de${INSECABLE}l’eau au-${GLUON}dessus des montagnes`)
  })

  it('ne colle ni à un appel de note ni à une ponctuation, et ne franchit pas le saut saisi', () => {
    expect(preparerTitreColophon('Que signifie : Esprit de vie ?\nGenèse 7, 15'))
      .toBe(`Que signifie${INSECABLE}: Esprit de${INSECABLE}vie${FINE}?\nGenèse 7, 15`)
    expect(preparerTitreColophon('Sur la [[A1]] cité')).toBe('Sur la [[A1]] cité')
  })
})

describe('appels de note masqués au sommaire', () => {
  it('retire le marqueur collé à l’intitulé', () => {
    expect(titreSansAppelsDeNote('Livre cinquième[[81]]')).toBe('Livre cinquième')
  })

  it('emporte l’espace qui précède, sans laisser de blanc double', () => {
    expect(titreSansAppelsDeNote('Au roy Charles [[76]].')).toBe('Au roy Charles.')
  })

  it('ne touche pas au retour à la ligne des chapeaux sur deux lignes', () => {
    expect(titreSansAppelsDeNote('Sur la Cité de Dieu[[1]]\nDessein de cet ouvrage'))
      .toBe('Sur la Cité de Dieu\nDessein de cet ouvrage')
  })

  it('laisse intact un titre sans appel', () => {
    expect(titreSansAppelsDeNote('Livre premier')).toBe('Livre premier')
  })
})

describe('banque de notes d’un titre', () => {
  it('trouve la note ancrée plus loin dans la section, pas seulement sur le premier segment', () => {
    const premierSegment = {}
    const section = { '1': 'Commencés en l’an 413.', '2': 'Marcellin, tribun d’Afrique.' }
    expect(notesPourTexte(['Premier discours[[1]]'], [premierSegment, section]))
      .toEqual({ '1': 'Commencés en l’an 413.' })
  })

  it('donne la priorité à la note locale du groupe', () => {
    expect(notesPourTexte(['Livre cinquième[[81]]'], [{ '81': 'locale' }, { '81': 'section' }]))
      .toEqual({ '81': 'locale' })
  })

  it('ne renvoie rien quand le titre n’appelle aucune note', () => {
    expect(notesPourTexte(['Livre premier'], [{ '81': 'Ecrit en 415.' }])).toEqual({})
  })
})

// L'appel de note ne se sépare jamais de ce qu'il accompagne : le point qui le
// suit ne doit pas pouvoir tomber seul en tête de la ligne suivante.
describe('ce qui voyage avec l’appel de note', () => {
  it('emporte le point qui suit l’appel', () => {
    const suite = lireSuiteAppels('Amen[[12]]. Ainsi', 4)
    expect(suite.marqueurs).toEqual(['12'])
    expect(suite.ponctuation).toBe('.')
    expect('Amen[[12]]. Ainsi'.slice(suite.fin)).toBe(' Ainsi')
  })

  it('emporte aussi le guillemet fermant et le point qui le suit', () => {
    expect(lireSuiteAppels('paix »[[7]]».', 6).ponctuation).toBe('».')
  })

  it('ne prend rien quand l’appel est suivi d’une espace', () => {
    expect(lireSuiteAppels('Amen[[12]] ainsi', 4).ponctuation).toBe('')
  })

  it('détache le dernier mot pour qu’il parte avec l’appel', () => {
    expect(detacherDernierMot('la paix du Seigneur')).toEqual(['la paix du ', 'Seigneur'])
  })

  it('ne détache rien après une espace', () => {
    expect(detacherDernierMot('la paix ')).toEqual(['la paix ', ''])
  })
})

describe('deux notes qui se suivent', () => {
  it('groupe les appels collés', () => {
    expect(lireSuiteAppels('mot[[2]][[3]].', 3).marqueurs).toEqual(['2', '3'])
  })

  it('groupe aussi les appels séparés par une virgule ou une espace', () => {
    expect(lireSuiteAppels('mot[[2]], [[3]] suite', 3).marqueurs).toEqual(['2', '3'])
  })

  it('joint les deux numéros par une esperluette, entre insécables', () => {
    expect(separateurAppels(1, 2)).toBe(' & ')
  })

  it('au delà de deux, écrit « 2, 3 & 4 » : virgule puis esperluette', () => {
    expect(separateurAppels(1, 3)).toBe(', ')
    expect(separateurAppels(2, 3)).toBe(' & ')
  })

  it('n’avale pas un appel qu’une phrase entière sépare', () => {
    expect(lireSuiteAppels('mot[[2]]. Autre phrase[[3]]', 3).marqueurs).toEqual(['2'])
  })
})

// ── Un appel ne part jamais seul à la ligne ──────────────────────────────────
// Le mécanisme : l'appel voyage dans un `nowrap` avec le mot qui le précède. Ces tests
// gardent le cas qui l’avait mis en défaut — un appel posé après une ITALIQUE, où le
// nœud précédent est un ÉLÉMENT et non du texte, si bien qu’aucun mot n’était emmené.
//
// ⚠️ Mesuré avant de les écrire : sur 341 largeurs de colonne, l’appel après une italique
// partait seul 126 fois. Une liaison de mots (U+2060) n’y changeait RIEN ; seul un
// `nowrap` COMMUN aux deux y parvient — 0 fois sur 341.
describe('l’appel emmène toujours ce qui le précède', () => {
  const notes = { A1: 'une note' }
  const texteDe = (n: any): string => {
    if (n == null || typeof n === 'boolean') return ''
    if (typeof n === 'string' || typeof n === 'number') return String(n)
    if (Array.isArray(n)) return n.map(texteDe).join('')
    return texteDe(n.props?.children)
  }
  const noeuds = (texte: string): any[] => {
    const rendu = rendreTexteAvecNotes(texte, notes as any) as any
    const enfants = rendu?.props?.children ?? rendu
    return Array.isArray(enfants) ? enfants : [enfants]
  }
  const nowrap = (texte: string) => noeuds(texte).filter(n => n?.props?.style?.whiteSpace === 'nowrap').pop()

  it('emmène le dernier mot quand il est du texte brut', () => {
    expect(texteDe(nowrap('la gloire de Dieu[[A1]].'))).toContain('Dieu')
  })

  it('emmène le dernier mot d’une ITALIQUE avec l’appel', () => {
    const bloc = nowrap('la <i>gloire de Dieu</i>[[A1]].')
    expect(bloc).toBeTruthy()
    expect(texteDe(bloc)).toContain('Dieu')
  })

  // ⛔ Sans quoi une italique d’une phrase entière deviendrait insécable.
  it('laisse le DÉBUT de l’italique dehors, donc coupable', () => {
    const dehors = noeuds('la <i>gloire de Dieu</i>[[A1]].').filter(n => n?.props?.style?.whiteSpace !== 'nowrap')
    expect(dehors.map(texteDe).join('')).toContain('gloire de ')
    expect(dehors.map(texteDe).join('')).not.toContain('Dieu')
  })

  it('emmène l’italique entière quand elle n’a qu’un mot', () => {
    expect(texteDe(nowrap('la <i>gloire</i>[[A1]].'))).toContain('gloire')
  })
})
