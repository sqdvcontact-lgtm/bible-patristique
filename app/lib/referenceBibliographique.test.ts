import { describe, expect, it } from 'vitest'

import { SEPARATEUR_COEDITEURS } from './editeursNormalisation'
import {
  GUILLEMET_FERMANT,
  GUILLEMET_OUVRANT,
  formeDeLaNotice,
  fragmentsReference,
  identifiantOuvrage,
  noticeDepuisChampsLibres,
  noticeDepuisVue,
  pagesLisibles,
  texteReference,
  type ContributeurNotice,
  type NoticeBibliographique,
} from './referenceBibliographique'

// Écrits par leur point de code : tapés, ils ne se distinguent pas d'une espace.
const OUV = GUILLEMET_OUVRANT
const FER = GUILLEMET_FERMANT
const NBSP = String.fromCharCode(0x00a0)
const TIRET = String.fromCharCode(0x2013)

function vide(id: number, titre: string): NoticeBibliographique {
  return {
    id, forme: null, titre, sousTitre: null, titreHote: null, tomaison: null, pages: null,
    dateAffichee: null, annee: null, lieu: null, editeurs: [], collection: null,
    numeroCollection: null, contributeurs: [], auteursTexte: null, directeursTexte: null,
    traducteursTexte: null,
  }
}

function chercheur(
  role: ContributeurNotice['role'], ordre: number, prenom: string, nomFamille: string,
): ContributeurNotice {
  return { role, nature: 'chercheur', ordre, nomAffiche: `${prenom} ${nomFamille}`, prenom, nomFamille, nomAutorite: `${prenom} ${nomFamille}` }
}

const maison = (nom: string, rang = 1, role = 'editeur') => ({ rang, role, nom })

// ── Les six notices de Boèce, les cas de la mission du 5 septembre 2026 ──────

const BAUR: NoticeBibliographique = {
  ...vide(863, 'De Anicio Manlio Severino Boëthio, christianae doctrinae assertore : disputatio theologica'),
  lieu: 'Darmstadt', editeurs: [maison('E. Bekker')], annee: 1841,
  contributeurs: [chercheur('auteur_scientifique', 1, 'Gustav Adolf Ludwig', 'Baur')],
}
const TRITHEME: NoticeBibliographique = {
  ...vide(945, 'De scriptoribus ecclesiasticis'),
  lieu: 'Bâle', editeurs: [maison('Johannes Amerbach')], annee: 1494,
  contributeurs: [
    chercheur('auteur_scientifique', 1, 'Johannes', 'Trithemius'),
    chercheur('editeur_scientifique', 2, 'Johannes', 'Heynlin'),
  ],
}
const EUGIPPE: NoticeBibliographique = {
  ...vide(963, 'Historia ab Eugippio ante annos circiter MC. scripta'),
  lieu: 'Augsbourg', editeurs: [maison('Ad insigne Pinus')], annee: 1595,
  contributeurs: [
    { role: 'auteur_source', nature: 'auteur_ancien', ordre: 1, nomAffiche: 'Eugippe', nomAutorite: 'Eugippe' },
    chercheur('editeur_scientifique', 2, 'Marcus', 'Welser'),
  ],
}
const HAND: NoticeBibliographique = {
  ...vide(899, 'Boethius (Anicius Manlius Torquatus Severinus)'),
  forme: 'entree_dictionnaire',
  titreHote: 'Allgemeine Encyclopädie der Wissenschaften und Künste',
  tomaison: '1re section, t. XI', pages: '282-292',
  lieu: 'Leipzig', editeurs: [maison('Johann Friedrich Gleditsch')], annee: 1823,
  contributeurs: [chercheur('auteur_scientifique', 1, 'Ferdinand Gotthelf', 'Hand')],
}
const HAUREAU: NoticeBibliographique = {
  ...vide(901, 'Histoire de la philosophie scolastique au IXe siècle'),
  forme: 'article_periodique', titreHote: 'Revue du Nord', dateAffichee: 'juin 1837', annee: 1837,
  contributeurs: [chercheur('auteur_scientifique', 1, 'Barthélemy', 'Hauréau')],
}
const JOURDAIN: NoticeBibliographique = {
  ...vide(909, 'De l’origine des traditions sur le christianisme de Boèce'),
  forme: 'article_periodique',
  titreHote: 'Mémoires présentés par divers savants à l’Académie des inscriptions et belles-lettres de l’Institut de France',
  tomaison: '1re série, t. VI, 1re partie', pages: '330-360', annee: 1860,
  contributeurs: [chercheur('auteur_scientifique', 1, 'Charles', 'Jourdain')],
}

describe('les six notices de Boèce', () => {
  it('Baur — monographie : prénom en romain, nom en petites capitales, titre en italique', () => {
    expect(texteReference(BAUR)).toBe(
      'Gustav Adolf Ludwig Baur, De Anicio Manlio Severino Boëthio, christianae doctrinae assertore : '
      + 'disputatio theologica, Darmstadt, E. Bekker, 1841.',
    )
    const fragments = fragmentsReference(BAUR)
    expect(fragments[0]).toEqual({ champ: 'prenom', style: 'bibliographie-auteur', composition: 'romain', texte: 'Gustav Adolf Ludwig' })
    expect(fragments[2]).toEqual({ champ: 'nom_famille', style: 'bibliographie-nom-auteur', composition: 'petites-capitales', texte: 'Baur' })
    expect(fragments.find(f => f.champ === 'titre')?.composition).toBe('italique')
  })

  it('Trithème — édition de texte : « éd. » introduit l’éditeur scientifique, l’imprimeur tient la place de l’éditeur', () => {
    expect(texteReference(TRITHEME)).toBe(
      'Johannes Trithemius, De scriptoribus ecclesiasticis, éd. Johannes Heynlin, Bâle, Johannes Amerbach, 1494.',
    )
    // L'éditeur scientifique n'est PAS un auteur : il ne prend pas les petites capitales.
    const heynlin = fragmentsReference(TRITHEME).find(f => f.champ === 'editeur_scientifique')
    expect(heynlin).toEqual({ champ: 'editeur_scientifique', style: 'bibliographie-donnees', composition: 'romain', texte: 'Johannes Heynlin' })
  })

  it('Eugippe — auteur ancien : la forme canonique ENTIÈRE en petites capitales, sans nom de famille inventé', () => {
    expect(texteReference(EUGIPPE)).toBe(
      'Eugippe, Historia ab Eugippio ante annos circiter MC. scripta, éd. Marcus Welser, Augsbourg, Ad insigne Pinus, 1595.',
    )
    const fragments = fragmentsReference(EUGIPPE)
    expect(fragments[0]).toEqual({ champ: 'nom_famille', style: 'bibliographie-nom-auteur', composition: 'petites-capitales', texte: 'Eugippe' })
    expect(fragments.some(f => f.champ === 'prenom')).toBe(false)
  })

  it('Hand — entrée d’encyclopédie : titre entre guillemets, « dans », hôte en italique, tomaison, pages', () => {
    expect(texteReference(HAND)).toBe(
      `Ferdinand Gotthelf Hand, ${OUV}Boethius (Anicius Manlius Torquatus Severinus)${FER}, `
      + `dans Allgemeine Encyclopädie der Wissenschaften und Künste, 1re section, t. XI, `
      + `Leipzig, Johann Friedrich Gleditsch, 1823, p.${NBSP}282${TIRET}292.`,
    )
    const fragments = fragmentsReference(HAND)
    expect(fragments.find(f => f.champ === 'titre')).toEqual({
      champ: 'titre', style: 'bibliographie-titre-article', composition: 'romain',
      texte: 'Boethius (Anicius Manlius Torquatus Severinus)',
    })
    expect(fragments.find(f => f.champ === 'titre_hote')?.composition).toBe('italique')
    expect(fragments.find(f => f.champ === 'titre_hote')?.style).toBe('bibliographie-titre-hote')
  })

  it('Hauréau — article de périodique : pas de « dans », la date affichée remplace l’année, aucune adresse inventée', () => {
    expect(texteReference(HAUREAU)).toBe(
      `Barthélemy Hauréau, ${OUV}Histoire de la philosophie scolastique au IXe siècle${FER}, Revue du Nord, juin 1837.`,
    )
    expect(texteReference(HAUREAU)).not.toContain('dans ')
    expect(texteReference(HAUREAU)).not.toContain('1837,')
  })

  it('Jourdain — contribution à un recueil savant', () => {
    expect(texteReference(JOURDAIN)).toBe(
      `Charles Jourdain, ${OUV}` + `De l’origine des traditions sur le christianisme de Boèce${FER}, `
      + 'Mémoires présentés par divers savants à l’Académie des inscriptions et belles-lettres de l’Institut de France, '
      + `1re série, t. VI, 1re partie, 1860, p.${NBSP}330${TIRET}360.`,
    )
  })
})

describe('les règles générales', () => {
  it('sans auteur structuré, le texte libre paraît en ROMAIN — jamais de petites capitales heuristiques', () => {
    const notice = { ...vide(1, 'Titre'), auteursTexte: 'Gustav Adolf Ludwig Baur', annee: 1841 }
    const [tete] = fragmentsReference(notice)
    expect(tete).toEqual({ champ: 'auteurs', style: 'bibliographie-auteur', composition: 'romain', texte: 'Gustav Adolf Ludwig Baur' })
    expect(texteReference(notice)).toBe('Gustav Adolf Ludwig Baur, Titre, 1841.')
  })

  it('une autorité sans rubriques se compose entière, un collectif en romain', () => {
    const fiche: ContributeurNotice = { role: 'auteur_scientifique', nature: 'chercheur', ordre: 1, nomAffiche: 'Cyrille de Jérusalem', nomAutorite: 'Cyrille de Jérusalem' }
    expect(fragmentsReference({ ...vide(1, 'T'), contributeurs: [fiche] })[0])
      .toEqual({ champ: 'nom_famille', style: 'bibliographie-nom-auteur', composition: 'petites-capitales', texte: 'Cyrille de Jérusalem' })
    const collectif: ContributeurNotice = { role: 'auteur_source', nature: 'collectif', ordre: 1, nomAffiche: 'Académie des inscriptions' }
    expect(fragmentsReference({ ...vide(1, 'T'), contributeurs: [collectif] })[0])
      .toEqual({ champ: 'auteurs', style: 'bibliographie-auteur', composition: 'romain', texte: 'Académie des inscriptions' })
  })

  it('énumère plusieurs auteurs à la française, dans l’ordre de la notice', () => {
    const notice = {
      ...vide(1, 'Titre'),
      contributeurs: [
        chercheur('auteur_scientifique', 2, 'Pierre', 'Dupont'),
        chercheur('auteur_scientifique', 1, 'Anne', 'Martin'),
        chercheur('auteur_scientifique', 3, 'Louis', 'Petit'),
      ],
    }
    expect(texteReference(notice)).toBe('Anne Martin, Pierre Dupont et Louis Petit, Titre.')
  })

  it('tait l’auteur quand la pièce l’établit déjà', () => {
    expect(texteReference(BAUR, { avecAuteur: false })).toBe(
      'De Anicio Manlio Severino Boëthio, christianae doctrinae assertore : disputatio theologica, Darmstadt, E. Bekker, 1841.',
    )
  })

  it('ouvre un collectif sans auteur sur sa direction, et ne la répète pas', () => {
    const notice = { ...vide(1, 'Dictionnaire'), directeursTexte: 'Jean Dupont ; Marie Durand', annee: 1990 }
    expect(texteReference(notice)).toBe('dir. Jean Dupont et Marie Durand, Dictionnaire, 1990.')
  })

  it('joint titre et sous-titre par un point, dans l’italique, sans doubler une ponctuation forte', () => {
    expect(texteReference({ ...vide(1, 'Titre'), sousTitre: 'Sous-titre' })).toBe('Titre. Sous-titre.')
    expect(texteReference({ ...vide(1, 'Où en est la question ?'), sousTitre: 'Réponse' })).toBe('Où en est la question ? Réponse.')
    const italiques = fragmentsReference({ ...vide(1, 'Titre'), sousTitre: 'Sous-titre' }).filter(f => f.composition === 'italique').map(f => f.texte)
    expect(italiques).toEqual(['Titre', '. ', 'Sous-titre'])
  })

  it('met « trad. » et « dir. » depuis le texte libre quand rien n’est structuré', () => {
    const notice = { ...vide(1, 'Confessions'), traducteursTexte: 'Arnauld d’Andilly', lieu: 'Paris', editeurs: [maison('Camusat')], annee: 1649 }
    expect(texteReference(notice)).toBe('Confessions, trad. Arnauld d’Andilly, Paris, Camusat, 1649.')
  })

  it('joint les coéditeurs par la barre à fines de la charte, jamais par un point-virgule', () => {
    const notice = { ...vide(1, 'Titre'), lieu: 'Paris', editeurs: [maison('Peeters', 2, 'coediteur'), maison('Cerf', 1)], annee: 1990 }
    expect(texteReference(notice)).toBe(`Titre, Paris, Cerf${SEPARATEUR_COEDITEURS}Peeters, 1990.`)
    // Un diffuseur n'édite pas.
    expect(texteReference({ ...notice, editeurs: [maison('Cerf'), maison('Diffusion X', 2, 'diffuseur')] }))
      .toBe('Titre, Paris, Cerf, 1990.')
  })

  it('compose la collection à la manière du site, avant l’adresse', () => {
    const notice = { ...vide(1, 'Titre'), collection: 'Sources chrétiennes', numeroCollection: '123', lieu: 'Paris', editeurs: [maison('Cerf')], annee: 1990 }
    expect(texteReference(notice)).toBe(`Titre, coll. ${OUV}Sources chrétiennes${FER}, 123, Paris, Cerf, 1990.`)
  })

  it('emporte le séparateur d’un champ absent, et n’invente rien', () => {
    expect(texteReference({ ...vide(1, 'Titre'), editeurs: [maison('Cerf')], annee: 1990 })).toBe('Titre, Cerf, 1990.')
    expect(texteReference({ ...vide(1, 'Titre'), lieu: 'Paris' })).toBe('Titre, Paris.')
    expect(texteReference(vide(1, 'Titre'))).toBe('Titre.')
    expect(texteReference(vide(1, 'Titre ?'))).toBe('Titre ?')
    expect(fragmentsReference(vide(1, '   '))).toEqual([])
  })

  it('écrit les pages avec un tiret demi-cadratin, et « p. » suivi d’une insécable', () => {
    expect(pagesLisibles('330-360')).toBe(`330${TIRET}360`)
    expect(pagesLisibles('330 – 360')).toBe(`330${TIRET}360`)
    expect(pagesLisibles('12')).toBe('12')
    expect(pagesLisibles(null)).toBeNull()
    expect(texteReference({ ...vide(1, 'Article'), forme: 'article_periodique', titreHote: 'Revue', pages: '12' }))
      .toBe(`${OUV}Article${FER}, Revue, p.${NBSP}` + `12.`)
  })

  it('déduit la forme des champs quand elle n’est pas déclarée', () => {
    expect(formeDeLaNotice({ forme: null, titreHote: null })).toBe('monographie')
    expect(formeDeLaNotice({ forme: null, titreHote: 'Revue' })).toBe('article_periodique')
    expect(formeDeLaNotice({ forme: 'contribution_collectif', titreHote: null })).toBe('contribution_collectif')
    expect(texteReference({ ...vide(1, 'Art'), titreHote: 'Revue', annee: 1900 })).toBe(`${OUV}Art${FER}, Revue, 1900.`)
    expect(texteReference({ ...vide(1, 'Art'), forme: 'contribution_collectif', titreHote: 'Recueil', annee: 1900 }))
      .toBe(`${OUV}Art${FER}, dans Recueil, 1900.`)
  })

  it('n’affiche aucune description matérielle', () => {
    const compose = [BAUR, TRITHEME, EUGIPPE, HAND, HAUREAU, JOURDAIN].map(n => texteReference(n)).join(' ')
    expect(compose).not.toMatch(/in-[0-9]/u)
    expect(compose).not.toContain('planche')
  })
})

describe('depuis la vue', () => {
  const LIGNE = {
    ouvrage_id: 863, type_ouvrage: 'histoire_reception', forme_notice: null,
    titre: ' De Anicio  Manlio ', sous_titre: null, titre_hote: null, tomaison: null, pages: null,
    date_affichee: null, annee: 1841, lieu: 'Darmstadt', collection: null, numero_collection: null,
    langue: 'la', auteurs_texte: 'Gustav Adolf Ludwig Baur', directeurs_texte: null, traducteurs_texte: null,
    editeur: 'E. Bekker',
    editeurs_lies: [{ rang: 1, role: 'editeur', nom: 'Typ. E. Bekkeri' }],
    contributeurs: [
      { ordre: 1, role: 'auteur_scientifique', nature: 'chercheur', nom_affiche: 'Gustav Adolf Ludwig Baur', prenom: 'Gustav Adolf Ludwig', nom_famille: 'Baur', pseudonyme: null, nom_autorite: 'Gustav Adolf Ludwig Baur', auteur_id: null },
      { ordre: 2, role: 'role_inconnu', nature: 'chercheur', nom_affiche: 'Personne', prenom: null, nom_famille: null, pseudonyme: null, nom_autorite: null, auteur_id: null },
    ],
  }

  it('lit les tableaux JSON, écarte un rôle inconnu et préfère les maisons LIÉES à l’éditeur de la notice', () => {
    const notice = noticeDepuisVue(LIGNE)
    expect(notice.titre).toBe('De Anicio Manlio')
    expect(notice.contributeurs).toHaveLength(1)
    expect(notice.contributeurs[0].nomFamille).toBe('Baur')
    expect(notice.editeurs).toEqual([{ rang: 1, role: 'editeur', nom: 'Typ. E. Bekkeri' }])
    expect(texteReference(notice)).toBe('Gustav Adolf Ludwig Baur, De Anicio Manlio, Darmstadt, Typ. E. Bekkeri, 1841.')
  })

  it('retombe sur l’éditeur de la notice quand aucune maison n’est liée, et lit un JSON encore en chaîne', () => {
    const notice = noticeDepuisVue({ ...LIGNE, editeurs_lies: '[]', contributeurs: '[]' })
    expect(notice.editeurs).toEqual([{ rang: 1, role: 'editeur', nom: 'E. Bekker' }])
    // Sans contributeur, le texte libre sert de tête, en romain.
    expect(texteReference(notice)).toBe('Gustav Adolf Ludwig Baur, De Anicio Manlio, Darmstadt, E. Bekker, 1841.')
  })

  it('ne garde une forme que si le vocabulaire la connaît', () => {
    expect(noticeDepuisVue({ ...LIGNE, forme_notice: 'article_periodique' }).forme).toBe('article_periodique')
    expect(noticeDepuisVue({ ...LIGNE, forme_notice: 'fantaisie' }).forme).toBeNull()
  })

  it('compose une notice depuis des champs libres — le formulaire d’un ouvrage en cours de saisie', () => {
    const notice = noticeDepuisChampsLibres({ id: 5, titre: 'Titre', auteurs: 'A. Auteur', lieu: 'Lyon', editeur: 'Vitte', annee: 1900, collection: 'Coll.' })
    expect(texteReference(notice)).toBe(`A. Auteur, Titre, coll. ${OUV}Coll.${FER}, Lyon, Vitte, 1900.`)
  })

  it('lit l’identifiant d’ouvrage d’une métadonnée, servie en texte', () => {
    expect(identifiantOuvrage('863')).toBe(863)
    expect(identifiantOuvrage(863)).toBe(863)
    expect(identifiantOuvrage('')).toBeNull()
    expect(identifiantOuvrage('abc')).toBeNull()
    expect(identifiantOuvrage(null)).toBeNull()
    expect(identifiantOuvrage(0)).toBeNull()
  })
})

describe('une collection qui redit l’hôte ne se compose pas', () => {
  it('tait la « collection » qui n’est que le titre hôte rangé dans la mauvaise colonne', () => {
    const notice = noticeDepuisChampsLibres({
      forme_notice: 'article_periodique', titre: 'Histoire de la philosophie scolastique au IXe siècle',
      titre_hote: 'Revue du Nord', collection: 'revue du Nord', date_affichee: 'juin 1837',
    })
    expect(texteReference(notice)).toBe(OUV + 'Histoire de la philosophie scolastique au IXe siècle' + FER + ', Revue du Nord, juin 1837.')
  })

  it('garde une collection qui dit autre chose que l’hôte', () => {
    const notice = noticeDepuisChampsLibres({
      forme_notice: 'contribution_collectif', titre: 'Article', titre_hote: 'Mélanges',
      collection: 'Studia patristica', numero_collection: '12', annee: 1990,
    })
    expect(texteReference(notice)).toContain(', coll. ' + OUV + 'Studia patristica' + FER + ', 12, 1990.')
  })
})
