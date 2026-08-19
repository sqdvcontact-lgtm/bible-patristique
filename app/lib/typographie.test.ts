import { describe, it, expect } from 'vitest'
import { normaliserEspaces, normaliserEspacesOriginal, normaliserPonctuationCitations, normaliserSaisie, normaliserTypographieLecture } from './typographie'

const FINE = ' '   // espace fine insécable U+202F
const NBSP = ' '   // espace insécable U+00A0

describe('normaliserEspacesOriginal (latin, grec)', () => {
  it('ajoute une fine insécable avant : ; ! ? quand la ponctuation est collée', () => {
    expect(normaliserEspacesOriginal('magna virtus tua: et')).toBe(`magna virtus tua${FINE}: et`)
    expect(normaliserEspacesOriginal('quid dicam?')).toBe(`quid dicam${FINE}?`)
    expect(normaliserEspacesOriginal('o magnum!')).toBe(`o magnum${FINE}!`)
    expect(normaliserEspacesOriginal('primum; deinde')).toBe(`primum${FINE}; deinde`)
  })
  it('ramène une espace simple ou insécable existante à la fine, et reste idempotent', () => {
    expect(normaliserEspacesOriginal('tua : et')).toBe(`tua${FINE}: et`)
    expect(normaliserEspacesOriginal(`tua${NBSP}: et`)).toBe(`tua${FINE}: et`)
    expect(normaliserEspacesOriginal(`tua${FINE}: et`)).toBe(`tua${FINE}: et`)
  })
  it('espace les guillemets français internes', () => {
    expect(normaliserEspacesOriginal('dixit «verbum»')).toBe(`dixit «${FINE}verbum${FINE}»`)
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspacesOriginal('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
})

describe('normaliserEspaces (français, harmonisation du type d’espace)', () => {
  it('convertit l’insécable en fine avant ; ! ? et autour des guillemets', () => {
    expect(normaliserEspaces(`fin${NBSP}; suite`)).toBe(`fin${FINE}; suite`)
    expect(normaliserEspaces(`«${NBSP}mot${NBSP}»`)).toBe(`«${FINE}mot${FINE}»`)
  })

  // Le corpus emploie indifféremment les trois espaces autour des guillemets
  // (relevé : ~14 600 insécables, ~3 000 ordinaires, ~1 530 fines). Les trois
  // doivent aboutir à la même fine, sans quoi la page reste bigarrée.
  it('convertit aussi l’espace ORDINAIRE, majoritaire dans plusieurs lots d’import', () => {
    expect(normaliserEspaces('« mot »')).toBe(`«${FINE}mot${FINE}»`)
    expect(normaliserEspaces('vraiment ?')).toBe(`vraiment${FINE}?`)
    expect(normaliserEspaces('quel malheur !')).toBe(`quel malheur${FINE}!`)
  })

  it('est idempotent : une fine déjà posée le reste', () => {
    expect(normaliserEspaces(`«${FINE}mot${FINE}»`)).toBe(`«${FINE}mot${FINE}»`)
  })

  // La page Recherche surligne en découpant par indices : une conversion qui
  // changerait la longueur décalerait le surlignage.
  it('conserve la longueur du texte, caractère pour caractère', () => {
    const source = '« Il dit : pourquoi ? » et il partit ; voilà !'
    expect(normaliserEspaces(source)).toHaveLength(source.length)
  })

  it('ne force PAS d’espace là où il n’y en a pas (contrat historique inchangé)', () => {
    expect(normaliserEspaces('mot: suite')).toBe('mot: suite')
    expect(normaliserEspaces('mot?')).toBe('mot?')
    expect(normaliserEspaces('«mot»')).toBe('«mot»')
  })

  // Le deux-points garde l’insécable pleine chasse (Imprimerie nationale,
  // charte §3.2) : il n’entre pas dans la conversion.
  it('laisse le deux-points intact', () => {
    expect(normaliserEspaces(`mot${NBSP}: suite`)).toBe(`mot${NBSP}: suite`)
    expect(normaliserEspaces('mot : suite')).toBe('mot : suite')
  })
})

describe('ponctuation des citations au rendu — charte §3.8', () => {
  it('supprime une virgule, un point-virgule ou un deux-points avant le guillemet fermant', () => {
    expect(normaliserPonctuationCitations(`«${FINE}pères,${NBSP}»`)).toBe(`«${FINE}pères${FINE}»`)
    expect(normaliserPonctuationCitations(`«${FINE}glaive${FINE};${NBSP}»`)).toBe(`«${FINE}glaive${FINE}»`)
    expect(normaliserPonctuationCitations(`«${FINE}annonce :${NBSP}»`)).toBe(`«${FINE}annonce${FINE}»`)
  })

  it('fonctionne quand un appel de note précède la ponctuation faible', () => {
    expect(normaliserTypographieLecture('« Je suis étranger et voyageur comme tous mes pères[[20]], »'))
      .toBe(`«${FINE}Je suis étranger et voyageur comme tous mes pères[[20]]${FINE}»`)
    expect(normaliserTypographieLecture('« Il y en a qui, tout en parlant, tuent avec le glaive[[65]] ; »'))
      .toBe(`«${FINE}Il y en a qui, tout en parlant, tuent avec le glaive[[65]]${FINE}»`)
  })

  it('conserve la ponctuation forte finale', () => {
    expect(normaliserTypographieLecture('« Est-ce vrai ? »')).toBe(`«${FINE}Est-ce vrai${FINE}?${FINE}»`)
    expect(normaliserTypographieLecture('« C’est vrai ! »')).toBe(`«${FINE}C’est vrai${FINE}!${FINE}»`)
  })

  it('normalise aussi le deux-points et reste idempotent', () => {
    const attendu = `Il dit${NBSP}: «${FINE}mot${FINE}»`
    expect(normaliserTypographieLecture('Il dit : « mot »')).toBe(attendu)
    expect(normaliserTypographieLecture(attendu)).toBe(attendu)
  })
})

describe('normaliserSaisie — texte tapé par un auteur du site', () => {
  const FINE = ' '
  const INSEC = ' '

  it('pose une fine insécable avant les hautes ponctuations, collées ou espacées', () => {
    expect(normaliserSaisie('L’amour, c’est quoi ?')).toBe(`L’amour, c’est quoi${FINE}?`)
    expect(normaliserSaisie('L’amour, c’est quoi?')).toBe(`L’amour, c’est quoi${FINE}?`)
    expect(normaliserSaisie('Vraiment !')).toBe(`Vraiment${FINE}!`)
    expect(normaliserSaisie('Ici ; là')).toBe(`Ici${FINE}; là`)
  })

  // Une fine par signe écarterait les deux signes l'un de l'autre.
  it('ne pose qu’une fine devant une SUITE de hautes ponctuations', () => {
    expect(normaliserSaisie('Quoi ?!')).toBe(`Quoi${FINE}?!`)
  })

  // Règle de l'Imprimerie nationale, charte §3.2 : le deux-points fait exception.
  it('donne au deux-points l’insécable pleine chasse, non la fine', () => {
    expect(normaliserSaisie('Trois verbes : garder, méditer, retenir')).toBe(`Trois verbes${INSEC}: garder, méditer, retenir`)
  })

  it('courbe l’apostrophe et resserre les points de suspension', () => {
    expect(normaliserSaisie("l'esprit")).toBe('l’esprit')
    expect(normaliserSaisie('et puis...')).toBe('et puis…')
  })

  it('francise les guillemets droits, mais seulement par paires complètes', () => {
    expect(normaliserSaisie('il dit "bonjour" et sort')).toBe(`il dit «${FINE}bonjour${FINE}» et sort`)
    expect(normaliserSaisie('un " orphelin')).toBe('un " orphelin')
  })

  // Une normalisation qui ne serait pas idempotente ajouterait une espace à
  // chaque rendu, et la couverture bâillerait un peu plus à chaque affichage.
  it('est idempotente', () => {
    const cas = ['L’amour, c’est quoi ?', 'Trois verbes : garder', 'il dit "bonjour"', 'Quoi ?!']
    for (const t of cas) expect(normaliserSaisie(normaliserSaisie(t))).toBe(normaliserSaisie(t))
  })

  it('ne touche ni à la virgule ni au point', () => {
    expect(normaliserSaisie('Deux hommes marchent, un troisième les rejoint.')).toBe('Deux hommes marchent, un troisième les rejoint.')
  })
})
