import { describe, expect, it } from 'vitest'
import { composerDocumentOeuvre, titresDuChangement, type EntreeDocument, type SegmentExtrait } from './documentOeuvre'
import type { BlocDocx, ParagrapheDocx } from './ooxml'

const IDENTITE = {
  titre: 'Les Confessions',
  auteur: 'Augustin d’Hippone',
  adresseEnLigne: 'https://corpus-scriptura.fr/oeuvre/A0010O0001',
  dateExtraction: '7 septembre 2026',
}

function segment(partiel: Partial<SegmentExtrait> & { texte: string }): SegmentExtrait {
  return {
    segmentKey: null, nature: 'texte', joinBefore: null, paragraphe: 1, rang: 1,
    alinea: null, stropheAvant: null, numeroVerset: null, forme: null,
    texteOriginal: null, groupeOriginal: null,
    niv1: '', niv1Texte: '', niv2: '', niv2Texte: '', niv3: '', niv3Texte: '', niv4: '', niv4Texte: '',
    notes: {},
    ...partiel,
  }
}

function composer(corps: SegmentExtrait[], reglages: Partial<EntreeDocument> = {}): BlocDocx[] {
  return composerDocumentOeuvre({
    identite: IDENTITE,
    corps, apparat: [], originaux: new Map(),
    original: 'aucun', notes: true, sommaire: true,
    ...reglages,
  })
}

/** Les paragraphes seuls, frontispice et colophon écartés. */
function paragraphes(blocs: BlocDocx[]): (ParagrapheDocx & { type: 'paragraphe' })[] {
  return blocs.filter((b): b is ParagrapheDocx & { type: 'paragraphe' } => b.type === 'paragraphe')
}

/** Le texte nu d'un paragraphe, appels de note écartés. */
function nu(p: ParagrapheDocx): string {
  return p.morceaux.map(m => ('texte' in m ? m.texte : '')).join('')
}

describe('l’ossature', () => {
  it('rouvre un niveau bas dès qu’un niveau HAUT a changé', () => {
    // « Chapitre I » du livre II n'est pas celui du livre I : le taire ferait courir la
    // division précédente sous le titre suivant.
    const precedent = segment({ texte: 'a', niv1: 'Livre premier', niv2: 'Chapitre I' })
    const suivant = segment({ texte: 'b', niv1: 'Livre second', niv2: 'Chapitre I' })
    expect(titresDuChangement(precedent, suivant).map(t => t.intitule))
      .toEqual(['Livre second', 'Chapitre I'])
  })

  it('ne redit pas un niveau qui n’a pas bougé', () => {
    const precedent = segment({ texte: 'a', niv1: 'Livre premier', niv2: 'Chapitre I' })
    const suivant = segment({ texte: 'b', niv1: 'Livre premier', niv2: 'Chapitre II' })
    expect(titresDuChangement(precedent, suivant).map(t => t.intitule)).toEqual(['Chapitre II'])
  })

  it('écarte un complément qui REDIT son titre', () => {
    const titres = titresDuChangement(null, segment({ texte: 'a', niv1: 'Chapitre I', niv1Texte: 'chapitre i.' }))
    expect(titres[0].complement).toBe('')
  })

  it('n’ouvre pas un titre vide', () => {
    const titres = titresDuChangement(null, segment({ texte: 'a', niv1: 'Livre premier', niv2: '   ' }))
    expect(titres.map(t => t.intitule)).toEqual(['Livre premier'])
  })
})

describe('les paragraphes', () => {
  it('joint les segments d’un même paragraphe par leur LIANT, jamais bout à bout', () => {
    // ⛔ `join_before` se matérialise : le jeton `space` ne s'imprime pas en toutes lettres.
    const blocs = composer([
      segment({ texte: 'ut multos gignerent?', paragraphe: 1, rang: 1 }),
      segment({ texte: 'non enim et Adam ipse', paragraphe: 1, rang: 2, joinBefore: 'space' }),
    ])
    const corps = paragraphes(blocs).find(p => p.style.startsWith('Corpsdetexte'))!
    // ⚠️ Le français CONVERTIT le type d'une espace, il n'en AJOUTE aucune : « gignerent? »
    // reste collé, comme à l'écran. C'est la colonne ORIGINALE qui pose la fine.
    expect(nu(corps)).toBe('ut multos gignerent? non enim et Adam ipse')
  })

  it('soude un mot coupé quand la source le demande', () => {
    const blocs = composer([
      segment({ texte: 'in', paragraphe: 1, rang: 1 }),
      segment({ texte: 'fini', paragraphe: 1, rang: 2, joinBefore: '' }),
    ])
    expect(nu(paragraphes(blocs).find(p => p.style.startsWith('Corpsdetexte'))!)).toBe('infini')
  })

  it('range les segments par RANG dans leur paragraphe', () => {
    const blocs = composer([
      segment({ texte: 'second', paragraphe: 1, rang: 2 }),
      segment({ texte: 'premier', paragraphe: 1, rang: 1 }),
    ])
    expect(nu(paragraphes(blocs).find(p => p.style.startsWith('Corpsdetexte'))!)).toBe('premier second')
  })

  it('donne au PREMIER paragraphe d’une division un style sans alinéa', () => {
    const blocs = composer([
      segment({ texte: 'un', niv1: 'Livre premier', paragraphe: 1 }),
      segment({ texte: 'deux', niv1: 'Livre premier', paragraphe: 2 }),
    ])
    const corps = paragraphes(blocs).filter(p => p.style.startsWith('Corpsdetexte'))
    expect(corps.map(p => p.style)).toEqual(['Corpsdetextesansalinea', 'Corpsdetexte'])
  })

  it('sort une SIGNATURE du paragraphe qu’elle clôt', () => {
    // La donnée l'y range souvent ; un bloc ne peut pas être justifié d'un côté et
    // ferré de l'autre.
    const blocs = composer([
      segment({ texte: 'Approbation des docteurs.', paragraphe: 3, rang: 1 }),
      segment({ texte: 'A. Debreda Curé de S. André.', nature: 'signature', paragraphe: 3, rang: 2 }),
    ])
    expect(paragraphes(blocs).map(p => p.style)).toContain('Signature')
  })

  it('compose une citation en retrait, et un lemme au fil du texte', () => {
    const blocs = composer([
      segment({ texte: 'Une citation.', nature: 'citation', paragraphe: 1 }),
      segment({ texte: 'Un lemme.', nature: 'lemme', paragraphe: 2 }),
    ])
    const styles = paragraphes(blocs).map(p => p.style)
    expect(styles).toContain('Citation')
    expect(styles).toContain('Corpsdetexte')
  })
})

describe('les vers', () => {
  const vers = (texte: string, alinea: number, partiel: Partial<SegmentExtrait> = {}) =>
    segment({ texte, forme: 'vers', alinea, paragraphe: 1, ...partiel })

  it('rend une boîte par vers, et l’alinéa LU dans la source', () => {
    const blocs = composer([
      vers('Le bonheur, qui jadis inspirait mes accents,', 0.02, { rang: 1 }),
      vers('A fait place aux sombres alarmes ;', 0.44, { rang: 2 }),
      vers('C’est une Muse en deuil qui me dicte ces chants,', 0.02, { rang: 3 }),
    ])
    const lignes = paragraphes(blocs).filter(p => p.style === 'Vers')
    expect(lignes).toHaveLength(3)
    expect(lignes.map(p => p.retraitGauche ?? 0)).toEqual([0, lignes[1].retraitGauche, 0])
    expect(lignes[1].retraitGauche).toBeGreaterThan(0)
  })

  it('découpe un segment qui porte PLUSIEURS vers', () => {
    // 310 segments du corpus en portent plusieurs, joints par un saut de ligne.
    const blocs = composer([vers('Vitrea dudum,\nParque serenis\nUnda diebus,', 0)])
    expect(paragraphes(blocs).filter(p => p.style === 'Vers')).toHaveLength(3)
  })

  it('ouvre la strophe par un BLANC, là où la source le dit', () => {
    const blocs = composer([
      vers('premier', 0, { rang: 1, stropheAvant: false }),
      vers('second', 0, { rang: 2, stropheAvant: true }),
    ])
    const lignes = paragraphes(blocs).filter(p => p.style === 'Vers')
    expect(lignes[0].espaceAvant).toBeUndefined()
    expect(lignes[1].espaceAvant).toBeGreaterThan(0)
  })

  it('REFAIT LE POÈME par-dessus la découpe en paragraphes', () => {
    // ⛔ `niveauxAlinea` se calcule sur le poème : appliqué strophe par strophe, une
    // strophe entièrement rentrée retomberait au fer à gauche.
    const blocs = composer([
      vers('au fer', 0.02, { paragraphe: 1, rang: 1 }),
      vers('rentré', 0.44, { paragraphe: 2, rang: 1 }),
    ])
    const lignes = paragraphes(blocs).filter(p => p.style === 'Vers')
    expect(lignes).toHaveLength(2)
    expect(lignes[0].retraitGauche ?? 0).toBe(0)
    expect(lignes[1].retraitGauche).toBeGreaterThan(0)
  })

  it('ne compose en vers QUE si tout le bloc en est', () => {
    const blocs = composer([
      vers('un vers', 0, { paragraphe: 1, rang: 1 }),
      segment({ texte: 'de la prose', paragraphe: 1, rang: 2 }),
    ])
    expect(paragraphes(blocs).some(p => p.style === 'Vers')).toBe(false)
  })
})

describe('les versets', () => {
  it('pose le numéro en exposant, un verset par paragraphe', () => {
    const blocs = composer([
      segment({ texte: 'Au commencement…', nature: 'verset', numeroVerset: '1', paragraphe: 1, rang: 1 }),
      segment({ texte: 'La terre était informe…', nature: 'verset', numeroVerset: '2', paragraphe: 1, rang: 2 }),
    ])
    const versets = paragraphes(blocs).filter(p => p.style === 'Versetbiblique')
    expect(versets).toHaveLength(2)
    expect(versets[0].morceaux[0]).toEqual({ texte: '1 ', exposant: true })
  })

  it('se passe de numéro quand l’édition n’en donne pas', () => {
    const blocs = composer([segment({ texte: 'Un verset sans numéro.', nature: 'verset' })])
    const verset = paragraphes(blocs).find(p => p.style === 'Versetbiblique')!
    expect(verset.morceaux[0]).not.toHaveProperty('exposant')
  })
})

describe('les notes', () => {
  const avecNote = segment({
    texte: 'ny qui pleust davantage aux personnes de pieté[[1]].',
    notes: { 1: { blocs: [{ texte: 'Confessions, X, 3.' }] } },
  })

  it('remplace le marqueur par un appel, à sa place', () => {
    const corps = paragraphes(composer([avecNote])).find(p => p.style.startsWith('Corpsdetexte'))!
    expect(corps.morceaux.map(m => ('note' in m ? 'APPEL' : 'texte' in m ? m.texte : ''))).toEqual([
      'ny qui pleust davantage aux personnes de pieté', 'APPEL', '.',
    ])
  })

  it('efface le marqueur quand la note n’existe pas', () => {
    // ⛔ Imprimer « [[12]] » au milieu d'Augustin serait pire que l'absence de la note.
    const corps = paragraphes(composer([segment({ texte: 'un texte[[12]] suivi.' })]))
      .find(p => p.style.startsWith('Corpsdetexte'))!
    expect(nu(corps)).toBe('un texte suivi.')
  })

  it('n’en pose aucune quand le lecteur les a refusées', () => {
    const corps = paragraphes(composer([avecNote], { notes: false }))
      .find(p => p.style.startsWith('Corpsdetexte'))!
    expect(corps.morceaux.some(m => 'note' in m)).toBe(false)
    expect(nu(corps)).toBe('ny qui pleust davantage aux personnes de pieté.')
  })

  it('garde la marque du texte de part et d’autre de l’appel', () => {
    const corps = paragraphes(composer([segment({
      texte: '*avant [[1]] après*',
      notes: { 1: { blocs: [{ texte: 'Une note.' }] } },
    })])).find(p => p.style.startsWith('Corpsdetexte'))!
    const marques = corps.morceaux.map(m => ('note' in m ? 'APPEL' : 'texte' in m && m.italique === true))
    expect(marques).toEqual([true, 'APPEL', true])
  })

  it('n’italise que le LATIN d’une note, quelle que soit sa forme', () => {
    // ⛔ Charte § 13.18 : l'italique d'un bloc dit la LANGUE, jamais la forme ni la
    // nature. Un vers français reste en romain ; une citation latine en prose s'italise.
    const corps = paragraphes(composer([segment({
      texte: 'un passage[[1]].',
      notes: { 1: { blocs: [
        { texte: 'Le bonheur qui jadis inspirait mes accents,\nA fait place aux sombres alarmes…', vers: true },
        { texte: 'Necesse est multos timeat quem multi timent.', latin: true },
      ] } },
    })])).find(p => p.style.startsWith('Corpsdetexte'))!
    const note = corps.morceaux.find((m): m is { note: ParagrapheDocx[] } => 'note' in m)!.note
    expect(note.map(p => p.morceaux.some(m => 'texte' in m && m.italique === true))).toEqual([false, false, true])
  })
})

describe('le texte original', () => {
  const alignes: SegmentExtrait[] = [
    segment({ texte: 'Le français, premier morceau.', segmentKey: 'fr:1', groupeOriginal: 'g1', paragraphe: 1, rang: 1 }),
    segment({ texte: 'Le français, second morceau.', segmentKey: 'fr:2', groupeOriginal: 'g1', paragraphe: 2, rang: 1 }),
  ]
  const originaux = new Map([['g1', { texte: 'Latinum unum.', toutVers: false, notes: {} }]])

  it('ne compose l’original QU’UNE fois quand un groupe enjambe deux paragraphes', () => {
    const blocs = composer(alignes, { original: 'suite', originaux })
    expect(paragraphes(blocs).filter(p => p.style === 'Texteoriginal')).toHaveLength(1)
  })

  it('met les deux colonnes en regard dans un tableau', () => {
    const blocs = composer(alignes, { original: 'regard', originaux })
    const regard = blocs.find(b => b.type === 'regard')
    expect(regard).toBeTruthy()
    if (regard?.type !== 'regard') throw new Error('bloc en regard attendu')
    expect(regard.lignes).toHaveLength(2)
    expect(regard.lignes[0].droite).toHaveLength(1)
    // ⚠️ Le second paragraphe du même groupe garde sa ligne, colonne de droite VIDE :
    // le français ne reprend pas toute la largeur au milieu d'un empan.
    expect(regard.lignes[1].droite).toHaveLength(0)
  })

  it('retombe sur `texte_original` quand aucun alignement ne couvre', () => {
    const blocs = composer(
      [segment({ texte: 'Le français.', texteOriginal: 'Latinum.' })],
      { original: 'suite' },
    )
    expect(paragraphes(blocs).filter(p => p.style === 'Texteoriginal')).toHaveLength(1)
  })

  it('n’en compose aucun quand le lecteur ne l’a pas demandé', () => {
    const blocs = composer(alignes, { original: 'aucun', originaux })
    expect(paragraphes(blocs).some(p => p.style === 'Texteoriginal')).toBe(false)
  })
})

describe('l’assemblage', () => {
  it('ouvre sur le frontispice et ferme sur le colophon', () => {
    const blocs = composer([segment({ texte: 'Un texte.' })])
    expect(paragraphes(blocs)[0].style).toBe('Frontispiceauteur')
    expect(nu(paragraphes(blocs).at(-1)!)).toContain('Extrait le 7 septembre 2026')
  })

  it('ne pose PAS de sommaire quand rien n’est à sommer', () => {
    const blocs = composer([segment({ texte: 'Un texte sans divisions.' })])
    expect(blocs.some(b => b.type === 'sommaire')).toBe(false)
  })

  it('pose le sommaire sous un titre qui NE S’Y RANGE PAS lui-même', () => {
    const blocs = composer([segment({ texte: 'Un texte.', niv1: 'Livre premier' })])
    expect(blocs.some(b => b.type === 'sommaire')).toBe(true)
    expect(paragraphes(blocs).some(p => p.style === 'Titresommaire')).toBe(true)
  })

  it('range l’apparat en fin de volume, sous son propre titre', () => {
    const blocs = composerDocumentOeuvre({
      identite: IDENTITE,
      corps: [segment({ texte: 'Le texte.', niv1: 'Livre premier' })],
      apparat: [segment({ texte: 'Une variante.', niv1: 'Livre premier' })],
      originaux: new Map(), original: 'aucun', notes: true, sommaire: false,
    })
    const rangs = paragraphes(blocs).map(nu)
    expect(rangs).toContain('Apparat critique')
    expect(rangs.indexOf('Apparat critique')).toBeGreaterThan(rangs.indexOf('Le texte.'))
  })
})
