import { describe, expect, it } from 'vitest'
import {
  PROFONDEUR_MAX_RENVOIS,
  cleDuRenvoi,
  cleIdentiteNote,
  etatDuDeploiement,
  lireModeRenvoi,
  morceauxDeMention,
  morceauxDeTete,
  morceauxEnTexte,
  positionsDesRenvois,
  texteAvecRenvoisEnClair,
  verbeDuRenvoi,
  type RenvoiNoteData,
  type TeteRenvoi,
} from './renvoisNotes'

// ── LES RENVOIS DE NOTE À NOTE : ce qui se décide sans rien lire ni rien rendre ──
//
// ⚠️ Les citations et les clés viennent des Catéchèses baptismales de Faivre (1844),
// abrégées. Le cas de référence est la note B de la Seconde catéchèse,
// `A0044O0003TFR-V11:note:00070`, `note_number` 73, dixième note de sa division.

const INSECABLE = String.fromCharCode(0xa0)
/** « note 10 », l'insécable comprise. ⚠️ Composée par une aide : un gabarit qui colle deux
 *  chiffres à une interpolation se lit, pour la garde des formes, comme un alpha de teinte. */
const noteNo = (numero: number) => ['note', String(numero)].join(INSECABLE)
const T = 'A0044O0003TFR-V11'
const note = (numero: string) => ({ idTexte: T, noteKey: `${T}:note:${numero}` })
const CIBLE_B = note('00070')

function renvoi(champs: Partial<RenvoiNoteData> & { citation: string }): RenvoiNoteData {
  return { blocId: 'b1', rang: 1, mode: 'note_preview', source: note('00466'), cible: CIBLE_B, ...champs }
}

const resolu = (numero: number, titre = 'Seconde catéchèse'): TeteRenvoi => ({ etat: 'resolu', numero, titre })
const nu = (titre: string) => titre

describe('positionsDesRenvois', () => {
  it('trouve la citation imprimée telle quelle', () => {
    const texte = 'Sur les Anges, voir la note B de la Seconde catéchèse, 4.'
    const groupes = positionsDesRenvois(texte, [renvoi({ citation: 'voir la note B de la Seconde catéchèse, 4.' })])
    expect(groupes).toHaveLength(1)
    expect(texte.slice(groupes![0].debut, groupes![0].fin)).toBe('voir la note B de la Seconde catéchèse, 4.')
  })

  it('rend plusieurs renvois d’un même bloc dans l’ordre de lecture, quel que soit l’ordre reçu', () => {
    const texte = 'sont identiquement les mêmes ; voir la note B de la Douzième catéchèse, 5, et la note D de la Dixième catéchèse, 6.'
    const groupes = positionsDesRenvois(texte, [
      renvoi({ rang: 2, citation: 'la note D de la Dixième catéchèse, 6.', cible: note('00585') }),
      renvoi({ rang: 1, citation: 'voir la note B de la Douzième catéchèse, 5', cible: note('00789') }),
    ])
    expect(groupes!.map(g => g.renvois.map(r => r.cible.noteKey))).toEqual([[`${T}:note:00789`], [`${T}:note:00585`]])
    expect(groupes![0].fin).toBeLessThanOrEqual(groupes![1].debut)
  })

  it('réunit deux renvois qui partagent une citation (« les notes V et X »)', () => {
    const citation = 'voir les notes V et X de la Seizième catéchèse, 19.'
    const groupes = positionsDesRenvois(`une possession réelle ; ${citation}`, [
      renvoi({ rang: 1, citation, cible: note('01512') }),
      renvoi({ rang: 2, citation, cible: note('01513') }),
    ])
    expect(groupes).toHaveLength(1)
    expect(groupes![0].renvois.map(r => r.rang)).toEqual([1, 2])
  })

  it('cherche une citation répétée APRÈS la précédente', () => {
    const texte = 'voir la note L, et plus loin encore voir la note L.'
    const groupes = positionsDesRenvois(texte, [
      renvoi({ rang: 1, citation: 'voir la note L' }),
      renvoi({ rang: 2, citation: 'encore', cible: note('00001') }),
      renvoi({ rang: 3, citation: 'voir la note L', cible: note('00002') }),
    ])
    expect(groupes!.map(g => g.debut)).toEqual([0, texte.indexOf('encore'), texte.lastIndexOf('voir la note L')])
  })

  it('rend null quand une citation manque : le contrat de la relation est rompu', () => {
    expect(positionsDesRenvois('Texte repris depuis.', [renvoi({ citation: 'voir la note B de la Seconde catéchèse, 4.' })])).toBeNull()
    expect(positionsDesRenvois('voir la note B', [renvoi({ citation: '' })])).toBeNull()
  })
})

describe('la tête d’un renvoi', () => {
  it('dit « Voir note {numéro affiché} de {titre} : », insécables comprises', () => {
    const morceaux = morceauxDeTete(resolu(10), 'Voir')
    expect(morceaux).toEqual({ avantTitre: `Voir ${noteNo(10)} de `, titre: 'Seconde catéchèse', apresTitre: `${INSECABLE}:` })
    expect(morceauxEnTexte(morceaux, nu)).toBe(`Voir ${noteNo(10)} de Seconde catéchèse${INSECABLE}:`)
  })

  it('élide « de » devant une voyelle, jamais devant « onz- » ni un « h » aspiré', () => {
    expect(morceauxDeTete(resolu(3, 'Avant-propos'), 'voir').avantTitre).toBe(`voir ${noteNo(3)} d’`)
    expect(morceauxDeTete(resolu(3, 'Onzième catéchèse'), 'voir').avantTitre).toBe(`voir ${noteNo(3)} de `)
    expect(morceauxDeTete(resolu(3, 'Huitième catéchèse'), 'voir').avantTitre).toBe(`voir ${noteNo(3)} de `)
  })

  it('dit l’ambiguïté au lieu de choisir une division', () => {
    const morceaux = morceauxDeTete({ etat: 'ambigu', numero: 4, titres: ['Première catéchèse', 'Seconde catéchèse'] }, 'Voir')
    expect(morceaux.titre).toBeNull()
    expect(morceauxEnTexte(morceaux, nu)).toBe(`Voir ${noteNo(4)} (division ambiguë)${INSECABLE}:`)
  })

  it('garde un numéro sans titre, et ne fabrique rien pour une note introuvable', () => {
    expect(morceauxEnTexte(morceauxDeTete({ etat: 'sans_titre', numero: 7 }, 'voir'), nu)).toBe(`voir ${noteNo(7)}${INSECABLE}:`)
    expect(morceauxEnTexte(morceauxDeTete({ etat: 'introuvable' }, 'Voir'), nu)).toBe('Note visée introuvable')
    expect(morceauxEnTexte(morceauxDeTete({ etat: 'erreur' }, 'voir'), nu)).toBe(`voir la note visée${INSECABLE}:`)
    expect(morceauxEnTexte(morceauxDeTete(undefined, 'Voir', false), nu)).toBe('Voir la note visée')
  })

  it('prend la capitale en tête de bloc, sinon la casse de la citation, sinon celle de la phrase', () => {
    expect(verbeDuRenvoi('voir Catéchèse XIV, note N.', 0, 'voir Catéchèse XIV, note N.')).toBe('Voir')
    expect(verbeDuRenvoi('… 7. Voir la note P', 5, 'Voir la note P')).toBe('Voir')
    expect(verbeDuRenvoi('pélagianisme ; voir la note F', 16, 'voir la note F')).toBe('voir')
    expect(verbeDuRenvoi('la note F de la Seconde catéchèse', 0, 'la note F de la Seconde catéchèse')).toBe('Voir')
    expect(verbeDuRenvoi('Il le dit. la note F', 11, 'la note F')).toBe('Voir')
    expect(verbeDuRenvoi('et la Catéchèse XVI, 23 ; et la note F', 30, 'la note F')).toBe('voir')
  })

  it('compose la mention d’un inline_mention sans verbe ni deux-points', () => {
    expect(morceauxEnTexte(morceauxDeMention(resolu(21, 'Sixième catéchèse')), nu)).toBe(`${noteNo(21)} de Sixième catéchèse`)
    expect(morceauxEnTexte(morceauxDeMention(undefined), nu)).toBe('note visée')
  })
})

describe('les boucles', () => {
  const A = note('00100')
  const B = note('00200')
  it('laisse ouvrir une note que rien au-dessus ne porte', () => {
    expect(etatDuDeploiement([], { source: A, cible: B })).toBe('libre')
  })
  it('refuse A → A, la note source comptant parmi les notes ouvertes', () => {
    expect(etatDuDeploiement([], { source: A, cible: A })).toBe('cycle')
  })
  it('reconnaît A → B → A dès le second renvoi', () => {
    // A est ouverte au sommet ; B s'y déplie, et son renvoi vise A.
    expect(etatDuDeploiement([cleIdentiteNote(A)], { source: B, cible: A })).toBe('cycle')
  })
  it('arrête une chaîne trop longue, sans que la profondeur tienne lieu de garde', () => {
    const chaine = Array.from({ length: PROFONDEUR_MAX_RENVOIS }, (_, i) => cleIdentiteNote(note(`0090${i}`)))
    expect(etatDuDeploiement(chaine, { source: A, cible: B })).toBe('profondeur')
    // Le cycle se reconnaît avant la profondeur : c'est lui la garde.
    expect(etatDuDeploiement([...chaine, cleIdentiteNote(B)], { source: A, cible: B })).toBe('cycle')
  })
})

describe('texteAvecRenvoisEnClair', () => {
  it('remplace la citation par la tête actuelle, sans rien laisser de la forme imprimée', () => {
    const texte = 'Sur les Anges, voir la note B de la Seconde catéchèse, 4.'
    const sortie = texteAvecRenvoisEnClair(texte, [renvoi({ citation: 'voir la note B de la Seconde catéchèse, 4.', tete: resolu(10) })], nu)
    expect(sortie).toBe(`Sur les Anges, voir ${noteNo(10)} de Seconde catéchèse`)
    expect(sortie).not.toContain('note B')
  })

  it('suit la note visée quand elle est renumérotée, sans que la relation change', () => {
    const relation = renvoi({ citation: 'voir la note B de la Seconde catéchèse, 4.' })
    const avant = structuredClone(relation)
    const texte = 'Sur les Anges, voir la note B de la Seconde catéchèse, 4.'
    // `note_number` 73 → 74 (une note insérée avant) puis → 72 (une note retirée) :
    // seule la tête résolue change, jamais la cible.
    for (const [numero, attendu] of [[10, '10'], [11, '11'], [9, '9']] as const) {
      const sortie = texteAvecRenvoisEnClair(texte, [{ ...relation, tete: resolu(numero) }], nu)
      expect(sortie).toContain(`note${INSECABLE}${attendu} de Seconde catéchèse`)
    }
    expect(relation).toEqual(avant)
    expect(relation.cible).toEqual({ idTexte: T, noteKey: `${T}:note:00070` })
  })

  it('suit le titre de niveau 1 quand il est corrigé', () => {
    const texte = 'voir la note B de la Seconde catéchèse, 4.'
    const sortie = texteAvecRenvoisEnClair(texte, [renvoi({ citation: texte, tete: resolu(10, 'Deuxième catéchèse') })], nu)
    // ⚠️ En tête de bloc, la capitale, quoi que la transcription ait gardé.
    expect(sortie).toBe(`Voir ${noteNo(10)} de Deuxième catéchèse`)
  })

  it('garde la phrase d’un inline_mention, avec sa mention dynamique', () => {
    const texte = 'Nous avons vu dans la note JJ de la Catéchèse VI que le nom de Manès…'
    const sortie = texteAvecRenvoisEnClair(texte, [renvoi({ mode: 'inline_mention', citation: 'note JJ de la Catéchèse VI', tete: resolu(21, 'Sixième catéchèse') })], nu)
    expect(sortie).toBe(`Nous avons vu dans la ${noteNo(21)} de Sixième catéchèse que le nom de Manès…`)
  })

  it('rend deux renvois d’une même citation par deux injonctions', () => {
    const citation = 'voir les notes V et X de la Seizième catéchèse, 19.'
    const sortie = texteAvecRenvoisEnClair(`possession réelle ; ${citation}`, [
      renvoi({ rang: 1, citation, tete: resolu(16, 'Seizième catéchèse') }),
      renvoi({ rang: 2, citation, tete: resolu(17, 'Seizième catéchèse') }),
    ], nu)
    expect(sortie).toBe(`possession réelle ; voir ${noteNo(16)} de Seizième catéchèse ; voir ${noteNo(17)} de Seizième catéchèse`)
  })

  it('rend le texte source intact quand une citation manque', () => {
    const texte = 'Texte repris depuis la relation.'
    expect(texteAvecRenvoisEnClair(texte, [renvoi({ citation: 'voir la note B', tete: resolu(10) })], nu)).toBe(texte)
    expect(texteAvecRenvoisEnClair(texte, undefined, nu)).toBe(texte)
  })
})

describe('les identités', () => {
  it('distingue deux renvois de même rang dans deux blocs d’une même note', () => {
    const a = renvoi({ citation: 'x', blocId: 'noteblock_a:p001' })
    const b = renvoi({ citation: 'x', blocId: 'noteblock_a:p002' })
    expect(cleDuRenvoi(a)).not.toBe(cleDuRenvoi(b))
  })
  it('lit le mode, note_preview par défaut', () => {
    expect(lireModeRenvoi('inline_mention')).toBe('inline_mention')
    expect(lireModeRenvoi('autre')).toBe('note_preview')
  })
})
