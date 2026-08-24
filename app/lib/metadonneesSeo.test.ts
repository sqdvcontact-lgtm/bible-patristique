import { describe, it, expect } from 'vitest'
import {
  avecNomDuSite,
  couperDescription,
  datesEnIncise,
  deNom,
  descriptionAuteur,
  descriptionChapitreBible,
  descriptionOeuvre,
  enTetesPartage,
  languesOrdonnees,
  naturePatristique,
  titreAuteur,
  titreChapitreBible,
  titreOeuvre,
} from './metadonneesSeo'

describe('nature d’un rapport patristique', () => {
  it('retient la plus forte des natures présentes', () => {
    expect(naturePatristique([1, 3, 4])).toBe('commentaire')
    expect(naturePatristique([1, 4])).toBe('citation')
    expect(naturePatristique([2])).toBe('citation')
    expect(naturePatristique([4])).toBe('echo')
  })

  it('ne conclut rien d’une absence', () => {
    expect(naturePatristique([])).toBeNull()
  })
})

describe('titre d’un passage biblique', () => {
  it('annonce les commentaires quand le chapitre est commenté', () => {
    expect(titreChapitreBible('Jean 1', 'commentaire'))
      .toBe('Jean 1 — Commentaires des Pères de l’Église')
  })

  it('n’annonce PAS de commentaire là où il n’y a que des citations', () => {
    expect(titreChapitreBible('Jean 1', 'citation'))
      .toBe('Jean 1 — Citations des Pères de l’Église')
    expect(titreChapitreBible('Nombres 7', 'echo'))
      .toBe('Nombres 7 — Échos chez les Pères de l’Église')
  })

  it('se replie sur le texte seul quand rien ne s’y rattache', () => {
    expect(titreChapitreBible('Genèse 50', null))
      .toBe('Genèse 50 — Texte biblique et traductions')
  })

  it('ne nomme le site que par la fonction prévue pour cela', () => {
    expect(titreChapitreBible('Jean 1', null)).not.toContain('Corpus Scriptura')
    expect(avecNomDuSite('Jean 1')).toBe('Jean 1 · Corpus Scriptura')
  })
})

describe('description d’un passage biblique', () => {
  const trois = ['Jean Chrysostome', 'Augustin d’Hippone', 'Origène']

  it('nomme les auteurs réellement liés, trois au plus', () => {
    expect(descriptionChapitreBible('Jean 1', 'commentaire', trois))
      .toBe('Jean 1 : le texte biblique et les commentaires de Jean Chrysostome, Augustin d’Hippone et Origène.')
  })

  it('compte le reste en toutes lettres plutôt que de tout énumérer', () => {
    const neuf = [...trois, 'Basile', 'Cyprien', 'Eusèbe', 'Jérôme', 'Tertullien', 'Boèce']
    expect(descriptionChapitreBible('Jean 1', 'commentaire', neuf))
      .toBe('Jean 1 : le texte biblique et les commentaires de Jean Chrysostome, Augustin d’Hippone et Origène, et de six autres auteurs.')
  })

  it('nomme le quatrième auteur plutôt que d’en compter un seul', () => {
    // « et de un autres auteurs » : la faute qu'un compteur sans accord produisait.
    const quatre = [...trois, 'Basile de Césarée']
    const phrase = descriptionChapitreBible('Psaume 22', 'commentaire', quatre)
    expect(phrase).toContain('Basile de Césarée.')
    expect(phrase).not.toMatch(/un autres|de un\b/)
  })

  it('accorde la tournure à la nature du rapport', () => {
    expect(descriptionChapitreBible('Jean 1', 'citation', ['Origène']))
      .toBe('Jean 1 : le texte biblique, cité par Origène.')
    expect(descriptionChapitreBible('Jean 1', 'echo', ['Origène']))
      .toBe('Jean 1 : le texte biblique et ses échos chez Origène.')
  })

  it('ne prétend rien quand la page ne porte aucun texte patristique', () => {
    const sans = descriptionChapitreBible('Genèse 50', null, [])
    expect(sans).toBe('Genèse 50 : le texte du chapitre dans les traductions éditées sur Corpus Scriptura.')
    expect(sans).not.toMatch(/commentaire|Père/i)
  })

  it('ne nomme personne si la liste est vide, même annoncée commentée', () => {
    expect(descriptionChapitreBible('Jean 1', 'commentaire', [])).not.toMatch(/commentaires de\s*\./)
  })
})

describe('titre d’un auteur', () => {
  it('distingue les trois états de la fiche', () => {
    expect(titreAuteur('Augustin d’Hippone', { nbOeuvres: 6, aLiensBibliques: true }))
      .toBe('Augustin d’Hippone — Œuvres et commentaires bibliques')
    expect(titreAuteur('Cyrille de Jérusalem', { nbOeuvres: 5, aLiensBibliques: false }))
      .toBe('Cyrille de Jérusalem — Œuvres éditées')
    expect(titreAuteur('Grégoire de Nysse', { nbOeuvres: 0, aLiensBibliques: false }))
      .toBe('Grégoire de Nysse — Notice biographique')
  })

  it('ne promet pas de commentaires bibliques sans œuvre pour les porter', () => {
    expect(titreAuteur('X', { nbOeuvres: 0, aLiensBibliques: true })).toBe('X — Notice biographique')
  })
})

describe('description d’un auteur', () => {
  it('préfère la notice, qui est propre à la page', () => {
    expect(descriptionAuteur('Boèce', { nbOeuvres: 1, aLiensBibliques: true }, {
      notice: 'Dernier des Romains et premier des scolastiques, Boèce traduit Aristote avant d’être exécuté.',
    })).toBe('Dernier des Romains et premier des scolastiques, Boèce traduit Aristote avant d’être exécuté.')
  })

  it('compose à partir des faits quand la notice manque', () => {
    expect(descriptionAuteur('Jean Chrysostome', { nbOeuvres: 22, aLiensBibliques: true }, { dates: 'Vers 347-407' }))
      .toBe('Jean Chrysostome (vers 347-407) : notice, œuvres éditées et commentaires de l’Écriture sur Corpus Scriptura.')
    expect(descriptionAuteur('Cyrille de Jérusalem', { nbOeuvres: 5, aLiensBibliques: false }, { dates: '313-386' }))
      .toBe('Cyrille de Jérusalem (313-386) : notice et œuvres éditées sur Corpus Scriptura.')
    expect(descriptionAuteur('Anonyme', { nbOeuvres: 0, aLiensBibliques: false }))
      .toBe('Anonyme : notice biographique sur Corpus Scriptura.')
  })
})

describe('titre et description d’une œuvre', () => {
  const confessions = {
    auteur: 'Augustin d’Hippone',
    langues: ['Français', 'Latin'],
    traducteur: 'Joseph Trabucco',
    aLiensBibliques: true,
  }

  it('ne nomme les langues qu’à partir de deux, l’original d’abord', () => {
    expect(titreOeuvre('Les Confessions', confessions))
      .toBe('Les Confessions — Augustin d’Hippone : texte latin et français')
    expect(titreOeuvre('Consolation de la philosophie', { auteur: 'Boèce', langues: ['Français'] }))
      .toBe('Consolation de la philosophie — Boèce')
  })

  it('tient debout sans auteur ni langue', () => {
    expect(titreOeuvre('Didachè', { langues: [] })).toBe('Didachè')
  })

  it('compose une phrase, non une fiche à points-virgules', () => {
    expect(descriptionOeuvre('Les Confessions', confessions))
      .toBe('Les Confessions d’Augustin d’Hippone : le texte intégral en latin et en français, traduit par Joseph Trabucco, avec ses références bibliques.')
  })

  it('ne mentionne ni traducteur ni références absents', () => {
    const description = descriptionOeuvre('La Cité de Dieu', {
      auteur: 'Augustin d’Hippone', langues: ['Latin', 'Français'], aLiensBibliques: false,
    })
    expect(description).toBe('La Cité de Dieu d’Augustin d’Hippone : le texte intégral en latin et en français.')
    expect(description).not.toContain('traduit par')
    expect(description).not.toContain('références')
  })

  it('retire un complément entier plutôt que de couper la phrase', () => {
    // Titre de 55 signes + « M. Horiot » : la phrase entière passait 160 signes et
    // se trouvait coupée à « traduit par M. », qui se lit comme un nom.
    const description = descriptionOeuvre('Homélie pour la Nativité de Notre-Seigneur Jésus-Christ', {
      auteur: 'Jean Chrysostome', langues: ['Français'], traducteur: 'M. Horiot', aLiensBibliques: true,
    })
    expect(description).toBe('Homélie pour la Nativité de Notre-Seigneur Jésus-Christ de Jean Chrysostome : le texte intégral en français, traduit par M. Horiot.')
    expect(description.endsWith('.')).toBe(true)
    expect(description).not.toMatch(/par M\.$/)
  })

  it('ne promet aucun texte à une œuvre qui n’en publie pas', () => {
    const description = descriptionOeuvre('Commentaire sur Jonas', {
      auteur: 'Jérôme de Stridon', langues: [], aTexte: false,
    })
    expect(description).toBe('Commentaire sur Jonas de Jérôme de Stridon : œuvre répertoriée sur Corpus Scriptura, dont le texte n’est pas encore édité.')
    expect(description).not.toContain('texte intégral')
  })

  it('range les langues sans dépendre de l’ordre reçu', () => {
    expect(languesOrdonnees(['Français', 'Latin'])).toEqual(['latin', 'français'])
    expect(languesOrdonnees(['Latin', 'Français'])).toEqual(['latin', 'français'])
    expect(languesOrdonnees(['Grec', 'Français', 'Grec'])).toEqual(['grec', 'français'])
  })
})

describe('menus détails de composition', () => {
  it('élide la préposition devant une voyelle', () => {
    expect(deNom('Augustin d’Hippone')).toBe('d’Augustin d’Hippone')
    expect(deNom('Hilaire de Poitiers')).toBe('d’Hilaire de Poitiers')
    expect(deNom('Boèce')).toBe('de Boèce')
    expect(deNom('Tertullien')).toBe('de Tertullien')
  })

  it('met les dates en incise sans leur capitale d’étiquette', () => {
    expect(datesEnIncise('Vers 347-407')).toBe('vers 347-407')
    expect(datesEnIncise('354-430')).toBe('354-430')
    expect(datesEnIncise(null)).toBe('')
  })

  it('coupe une description sur une phrase ou un mot, jamais au milieu d’un mot', () => {
    const long = 'Évêque d’Hippone et docteur de l’Église, il est l’un des quatre Pères de l’Église latine. Sa pensée irrigue tout l’Occident chrétien pendant mille ans et davantage.'
    const coupe = couperDescription(long)
    expect(coupe.length).toBeLessThanOrEqual(160)
    expect(coupe).toBe('Évêque d’Hippone et docteur de l’Église, il est l’un des quatre Pères de l’Église latine.')
    expect(long.startsWith(coupe.replace(/…$/, ''))).toBe(true)
  })

  it('laisse une description courte intacte', () => {
    expect(couperDescription('  Deux  mots. ')).toBe('Deux mots.')
  })

  it('ne prend pas une initiale pour une fin de phrase', () => {
    const avecInitiale = 'Homélie pour la Nativité de Notre-Seigneur Jésus-Christ de Jean Chrysostome : le texte intégral en français, traduit par M. Horiot, avec ses références bibliques.'
    const coupe = couperDescription(avecInitiale)
    expect(coupe).not.toMatch(/par M\.$/)
    expect(coupe.endsWith('…')).toBe(true)
  })
})

describe('en-têtes de partage', () => {
  it('repose l’image et le nom du site, que la page remplace en entier', () => {
    const { openGraph, twitter } = enTetesPartage('Jean 1', 'Une description.')
    expect(openGraph.title).toBe('Jean 1')
    expect(openGraph.siteName).toBe('Corpus Scriptura')
    expect(openGraph.images[0].url).toBe('/og-image.png')
    expect(twitter.description).toBe('Une description.')
  })
})
