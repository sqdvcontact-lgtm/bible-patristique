import { describe, it, expect } from 'vitest'
import { libelleTrad, enumererNoms, nomsTraducteurs, mentionTraducteurs, estReserveDAttribution, mentionCatalogueLisible } from './traducteurs'

describe('enumererNoms', () => {
  it('remplace les points-virgules du catalogue par une énumération française', () => {
    expect(enumererNoms(['A'])).toBe('A')
    expect(enumererNoms(['A', 'B'])).toBe('A et B')
    expect(enumererNoms(['A', 'B', 'C'])).toBe('A, B et C')
  })
})

describe('nomsTraducteurs — le point-virgule, et lui seul, sépare les noms', () => {
  it('rend la liste telle que le catalogue la porte', () => {
    expect(nomsTraducteurs('Henri Barreau ; Marcel Charpentier')).toEqual(['Henri Barreau', 'Marcel Charpentier'])
    // Espaces libres autour du séparateur, ligne vide en fin : sans effet.
    expect(nomsTraducteurs('Henri Barreau;Marcel Charpentier ; ')).toEqual(['Henri Barreau', 'Marcel Charpentier'])
    expect(nomsTraducteurs('')).toEqual([])
    expect(nomsTraducteurs(null)).toEqual([])
  })
  it('écarte un qualificatif dès qu’un vrai nom l’accompagne', () => {
    expect(nomsTraducteurs('M. Jeannin ; traducteurs multiples')).toEqual(['M. Jeannin'])
    expect(nomsTraducteurs('traducteurs multiples')).toEqual(['traducteurs multiples'])
  })
})

describe('mentionTraducteurs — fragment d’une ligne bibliographique', () => {
  it('énumère les noms derrière « trad. »', () => {
    expect(mentionTraducteurs('Louis Judicis de Mirandol')).toBe('trad. Louis Judicis de Mirandol')
    expect(mentionTraducteurs('H. Barreau ; M. Charpentier')).toBe('trad. H. Barreau et M. Charpentier')
    expect(mentionTraducteurs('A ; B ; C')).toBe('trad. A, B et C')
  })
  it('laisse une mention collective se présenter seule, sans « trad. »', () => {
    // Dans « Augustin, *Titre*, …, Paris, 1861 », « trad. sous la direction de » ferait
    // une phrase dans la phrase ; la formule entre telle quelle, initiale en bas de casse.
    expect(mentionTraducteurs('Sous la direction de M. Jeannin ; traducteurs multiples'))
      .toBe('sous la direction de M. Jeannin')
    expect(mentionTraducteurs('Équipe sous la direction de Michel Sot et Christiane Veyrard-Cosme'))
      .toBe('sous la direction de Michel Sot et Christiane Veyrard-Cosme')
  })
  it('ne dit rien quand le champ est vide', () => {
    expect(mentionTraducteurs('')).toBe('')
    expect(mentionTraducteurs(null)).toBe('')
    expect(mentionTraducteurs('Non établi')).toBe('')
  })
})

describe('libelleTrad — mentions de responsabilité collective', () => {
  it('ne préfixe plus « Traduction par » une mention de direction', () => {
    // Forme réelle du catalogue pour les tomes Jeannin de Jean Chrysostome. Elle
    // donnait « Traduction par Sous la direction de M. Jeannin et traducteurs
    // multiples ».
    expect(libelleTrad('Sous la direction de M. Jeannin ; traducteurs multiples'))
      .toBe('Traduction sous la direction de M. Jeannin')
  })

  it('laisse telle quelle une formule qui se suffit à elle-même', () => {
    expect(libelleTrad('Traduction collective sous la direction de Michel Rubellin'))
      .toBe('Traduction collective sous la direction de Michel Rubellin')
    expect(libelleTrad('Édition française sous la direction d’André Duval, Bernard Lauret, Hervé Legrand, Joseph Moingt et collaborateurs'))
      .toBe('Édition française sous la direction d’André Duval, Bernard Lauret, Hervé Legrand, Joseph Moingt et collaborateurs')
  })

  it('retire une tête collective que la formule rend déjà', () => {
    expect(libelleTrad('Équipe sous la direction de Michel Sot et Christiane Veyrard-Cosme'))
      .toBe('Traduction sous la direction de Michel Sot et Christiane Veyrard-Cosme')
  })

  it('ne perd pas un traducteur nommé à côté de la direction', () => {
    expect(libelleTrad('Sous la direction de M. Jeannin ; Pierre Durand'))
      .toBe('Traduction sous la direction de M. Jeannin et Pierre Durand')
  })

  it('garde le qualificatif quand il est tout ce qu’on a', () => {
    expect(libelleTrad('traducteurs multiples')).toBe('Traduction par traducteurs multiples')
  })
})

describe('libelleTrad — queues de liste (« et al. », « et collaborateurs »)', () => {
  it('ne joint pas une queue par « et », sinon « et et al. »', () => {
    // Forme réelle du catalogue (Grégoire le Grand, Sources chrétiennes).
    expect(libelleTrad('Sœur Irène Binont ; Joël Courreau ; Vincent Desprez ; Jean-Baptiste de Salvert ; et al.'))
      .toBe('Traduction : sœur Irène Binont, Joël Courreau, Vincent Desprez, Jean-Baptiste de Salvert et al.')
    expect(mentionTraducteurs('Irène Binont ; Joël Courreau ; et al.'))
      .toBe('trad. Irène Binont, Joël Courreau et al.')
  })

  it('sépare d’une virgule quand la queue est collée au dernier nom', () => {
    // « … Pierre Monat et Jérémy Delmulle et collaborateurs » bégayait.
    expect(libelleTrad('Christophe Carraud ; Christophe Calvia ; Pierre Monat ; Jérémy Delmulle et collaborateurs'))
      .toBe('Traduction par Christophe Carraud, Christophe Calvia, Pierre Monat, Jérémy Delmulle et collaborateurs')
  })

  it('laisse tranquille un nom seul suivi de sa queue', () => {
    expect(libelleTrad('Serge Lancel et collaborateurs')).toBe('Traduction par Serge Lancel et collaborateurs')
    // Un nom qui finit par « et » quelque chose d’autre n’est pas une queue.
    expect(libelleTrad('Robert Arnauld d’Andilly')).toBe('Traduction par Robert Arnauld d’Andilly')
  })

  it('ne touche pas à une formule de direction qui porte sa propre queue', () => {
    const formule = 'Édition française sous la direction d’André Duval, Bernard Lauret, Hervé Legrand, Joseph Moingt et collaborateurs'
    expect(libelleTrad(formule)).toBe(formule)
  })
})

describe('libelleTrad — cas ordinaires inchangés', () => {
  it('nomme un traducteur unique', () => {
    expect(libelleTrad('Henri Barreau')).toBe('Traduction par Henri Barreau')
    expect(libelleTrad('Bareille')).toBe('Traduction de Bareille')
  })
  it('énumère plusieurs traducteurs', () => {
    expect(libelleTrad('H. Barreau ; M. Charpentier')).toBe('Traduction par H. Barreau et M. Charpentier')
    expect(libelleTrad('Henri Barreau ; Marcel Charpentier')).toBe('Traduction par Henri Barreau et Marcel Charpentier')
    // Un titre en tête appelle le deux-points.
    expect(libelleTrad('M. Jeannin ; Bareille')).toBe('Traduction : M. Jeannin et Bareille')
  })
  it('met en minuscule un titre accentué, que `\\b` ne savait pas borner', () => {
    expect(libelleTrad('Abbé Martin')).toBe('Traduction : abbé Martin')
    expect(libelleTrad('Père Martin')).toBe('Traduction : père Martin')
    expect(libelleTrad('Dom Martin')).toBe('Traduction : dom Martin')
    // Le titre reste borné : un nom propre qui commence pareil n'est pas touché.
    expect(libelleTrad('Domitien')).toBe('Traduction de Domitien')
  })
  it('traite les cas particuliers', () => {
    expect(libelleTrad('anonyme')).toBe('Traduction anonyme')
    expect(libelleTrad('Non établi')).toBe('Traducteur non identifié')
    expect(libelleTrad('')).toBe('')
    expect(libelleTrad(null)).toBe('')
  })
  it('masque les mentions de travail gardées en base', () => {
    expect(libelleTrad('Jeannin — prénom non établi')).toBe('Traduction de Jeannin')
    expect(libelleTrad('Michel Rubellin signalé')).toBe('Traduction par Michel Rubellin')
  })
})

// ── La mention du CATALOGUE, telle qu'une notice peut la porter ──────────────
// Le champ `catalogue_notices.traducteur` est de la PROSE, écrite par le
// dépouillement des notices : il y voisine des noms, des réserves d'attribution et
// des notes d'atelier. Le moteur bibliographique en faisait « trad. Attribution non
// fixée : … » (relevé de l'auteur, 2026-09-06). Les cas ci-dessous sont RÉELS,
// recopiés de la base le même jour.
describe('mention du catalogue', () => {
  it('⛔ une RÉSERVE d’attribution ne nomme personne, et ne se compose pas', () => {
    for (const brut of [
      'Attribution non fixée : Antoine Arnauld ou Jean Segui ; Philippe Goibaud-Dubois également signalé dans certaines références',
      'Attribution discutée : Nicolas Fontaine selon la BnF ; Jean-Baptiste Morvan de Bellegarde sur l’exemplaire numérique',
      'Non établi',
      'Traducteur non établi',
    ]) {
      expect(estReserveDAttribution(brut), brut).toBe(true)
      expect(mentionCatalogueLisible(brut), brut).toBeNull()
    }
  })

  it('⛔ « Anonyme » N’EST PAS une réserve : c’est un fait éditorial', () => {
    expect(estReserveDAttribution('Anonyme')).toBe(false)
    expect(mentionCatalogueLisible('Anonyme')).toBe('Anonyme')
    expect(mentionCatalogueLisible('Traduction anonyme dans l’édition Charpentier'))
      .toBe('Traduction anonyme dans l’édition Charpentier')
  })

  it('la réserve se juge sur la TÊTE : une mention qui nomme se compose', () => {
    const nomme = 'Nicolas Fontaine — attribution retenue par la BnF ; attribution ancienne également proposée à Jean-Baptiste Morvan de Bellegarde'
    expect(estReserveDAttribution(nomme)).toBe(false)
    expect(mentionCatalogueLisible(nomme)).toBe(nomme)
  })

  it('retire la note d’atelier FINALE, jamais un crochet de tête', () => {
    expect(mentionCatalogueLisible('Nicolas Fontaine [attribution générale du recueil ; attribution analytique à contrôler]'))
      .toBe('Nicolas Fontaine')
    expect(mentionCatalogueLisible('[Traducteur du recueil]')).toBe('[Traducteur du recueil]')
  })

  it('rend null sur le vide, jamais une chaîne vide', () => {
    expect(mentionCatalogueLisible('')).toBeNull()
    expect(mentionCatalogueLisible(null)).toBeNull()
    expect(mentionCatalogueLisible('   ')).toBeNull()
  })
})
