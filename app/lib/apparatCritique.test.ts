import { describe, expect, it } from 'vitest'
import {
  ROLE_APPARAT_CRITIQUE,
  estBlocApparatCritique,
  estNoteApparatCritique,
  lireMetadonneesBlocNote,
  retirerLigneImprimee,
  texteApparatAffiche,
} from './apparatCritique'

const apparat = (text: string, printedLine: number | null) => ({
  text, printedLine, editorialRole: ROLE_APPARAT_CRITIQUE,
})

describe('retirerLigneImprimee', () => {
  it('retire le numéro de ligne quand il est exactement celui de printed_line', () => {
    expect(retirerLigneImprimee('3 uirtus (r ex s corr.) B; est] est et BPQ.', 3))
      .toBe('uirtus (r ex s corr.) B; est] est et BPQ.')
  })

  it('retire un numéro à deux ou trois chiffres', () => {
    expect(retirerLigneImprimee('12 aliut S sic semper; nesciens] nesciens te BM2PQ edd.', 12))
      .toBe('aliut S sic semper; nesciens] nesciens te BM2PQ edd.')
    expect(retirerLigneImprimee('104 quaeram] eram F.', 104)).toBe('quaeram] eram F.')
  })

  it('accepte l’insécable et la fine insécable comme séparateurs', () => {
    expect(retirerLigneImprimee('6 superbis ds II.', 6)).toBe('superbis ds II.')
    expect(retirerLigneImprimee('6 superbis ds II.', 6)).toBe('superbis ds II.')
  })

  it('NE retire RIEN quand le nombre initial ne correspond pas à printed_line', () => {
    expect(retirerLigneImprimee('13 uirtus B.', 3)).toBe('13 uirtus B.')
    expect(retirerLigneImprimee('3 uirtus B.', 13)).toBe('3 uirtus B.')
    expect(retirerLigneImprimee('30 uirtus B.', 3)).toBe('30 uirtus B.')
    expect(retirerLigneImprimee('03 uirtus B.', 3)).toBe('03 uirtus B.')
  })

  it('NE retire RIEN sans séparateur, ni quand le reste serait vide ou ouvert sur un blanc', () => {
    expect(retirerLigneImprimee('3uirtus B.', 3)).toBe('3uirtus B.')
    expect(retirerLigneImprimee('3', 3)).toBe('3')
    expect(retirerLigneImprimee('3 ', 3)).toBe('3 ')
    expect(retirerLigneImprimee('3  uirtus B.', 3)).toBe('3  uirtus B.')
  })

  it('NE retire RIEN quand printed_line est absent ou aberrant', () => {
    expect(retirerLigneImprimee('3 uirtus B.', null)).toBe('3 uirtus B.')
    expect(retirerLigneImprimee('3 uirtus B.', undefined)).toBe('3 uirtus B.')
    expect(retirerLigneImprimee('0 uirtus B.', 0)).toBe('0 uirtus B.')
    expect(retirerLigneImprimee('3 uirtus B.', 3.5)).toBe('3 uirtus B.')
  })

  it('laisse intacte l’entrée qui ne s’ouvre pas sur sa ligne (souscription de livre)', () => {
    const souscription = 'EXPLIC LIB II CONFESSIONŪ. INCIPIT LIBER TERTIVS EIVSDEM S; om. F'
    expect(retirerLigneImprimee(souscription, 14)).toBe(souscription)
  })
})

describe('texteApparatAffiche', () => {
  it('retire la ligne imprimée d’un bloc d’apparat', () => {
    expect(texteApparatAffiche(apparat('3 uirtus (r ex s corr.) B; est] est et BPQ.', 3)))
      .toBe('uirtus (r ex s corr.) B; est] est et BPQ.')
  })

  it('NE touche PAS une note ordinaire, même si elle commence par son printed_line', () => {
    expect(texteApparatAffiche({ text: '3 mars 1649, sur la copie de Port-Royal.', printedLine: 3, editorialRole: null }))
      .toBe('3 mars 1649, sur la copie de Port-Royal.')
    expect(texteApparatAffiche({ text: '3 mars 1649.', printedLine: 3, editorialRole: 'editorial_note' }))
      .toBe('3 mars 1649.')
    expect(texteApparatAffiche({ text: '3 mars 1649.', printedLine: 3 }))
      .toBe('3 mars 1649.')
  })

  it('conserve sigles, crochets, astérisques, rasurae et abréviations sans y toucher', () => {
    const cas: ReadonlyArray<readonly [string, number, string]> = [
      ['5 quaeram] **eram F; et] ut M2 supra lin.', 5, 'quaeram] **eram F; et] ut M2 supra lin.'],
      ['2 Magnus es — tua et sapi|| minio depicta S.', 2, 'Magnus es — tua et sapi|| minio depicta S.'],
      [
        '11 et scire—sit supra lin. add. S; an inuocare te] om. S; fort. erant addita in mg.', 11,
        'et scire—sit supra lin. add. S; an inuocare te] om. S; fort. erant addita in mg.',
      ],
      [
        '7 indiflnite (ras.) B1; terminfls *** s. l. W’b; trinid tas P¹Q.', 7,
        'indiflnite (ras.) B1; terminfls *** s. l. W’b; trinid tas P¹Q.',
      ],
    ]
    for (const [texte, ligne, attendu] of cas) {
      expect(texteApparatAffiche(apparat(texte, ligne))).toBe(attendu)
    }
  })

  it('ne recompose AUCUNE ponctuation : ni fine insécable devant « ; », ni point final ajouté', () => {
    expect(texteApparatAffiche(apparat('4 inuenient BCFMO2PQW edd', 4))).toBe('inuenient BCFMO2PQW edd')

    const rendu = texteApparatAffiche(apparat('8 quia] qui C; a te QV1: uide adn.', 8))
    expect(rendu).toBe('quia] qui C; a te QV1: uide adn.')
    expect(rendu).not.toContain(' ')
    expect(rendu).not.toContain(' ')
  })
})

describe('estBlocApparatCritique / estNoteApparatCritique', () => {
  it('reconnaît l’apparat par editorial_role, et non par kind', () => {
    expect(estBlocApparatCritique({ editorialRole: ROLE_APPARAT_CRITIQUE })).toBe(true)
    expect(estBlocApparatCritique({ editorialRole: 'critical_apparatus' })).toBe(true)
    expect(estBlocApparatCritique({ editorialRole: null })).toBe(false)
    expect(estBlocApparatCritique({ editorialRole: 'commentary' })).toBe(false)
    expect(estBlocApparatCritique({})).toBe(false)
  })

  it('n’enrôle une note que si TOUS ses blocs relèvent de l’apparat', () => {
    const bloc = (role: string | null) => ({ editorialRole: role })
    expect(estNoteApparatCritique({ blocks: [bloc(ROLE_APPARAT_CRITIQUE)] })).toBe(true)
    expect(estNoteApparatCritique({ blocks: [bloc(ROLE_APPARAT_CRITIQUE), bloc(ROLE_APPARAT_CRITIQUE)] })).toBe(true)
    expect(estNoteApparatCritique({ blocks: [bloc(ROLE_APPARAT_CRITIQUE), bloc(null)] })).toBe(false)
    expect(estNoteApparatCritique({ blocks: [bloc(null)] })).toBe(false)
    expect(estNoteApparatCritique({ blocks: [] })).toBe(false)
  })
})

describe('lireMetadonneesBlocNote', () => {
  it('projette les quatre champs lus par l’affichage', () => {
    expect(lireMetadonneesBlocNote({
      pdf_page: 41, printed_line: 3, printed_page: 1,
      editorial_role: 'critical_apparatus', human_validated: false, apparatus_editor: 'Pius Knöll',
    })).toEqual({
      editorialRole: 'critical_apparatus', printedLine: 3,
      visualReviewReason: null, humanValidated: false,
    })
  })

  it('retombe sur des nulls devant une métadonnée absente, vide ou mal typée', () => {
    const vide = { editorialRole: null, printedLine: null, visualReviewReason: null, humanValidated: null }
    expect(lireMetadonneesBlocNote({})).toEqual(vide)
    expect(lireMetadonneesBlocNote(null)).toEqual(vide)
    expect(lireMetadonneesBlocNote(undefined)).toEqual(vide)
    expect(lireMetadonneesBlocNote('critical_apparatus')).toEqual(vide)
    expect(lireMetadonneesBlocNote([1, 2])).toEqual(vide)
    expect(lireMetadonneesBlocNote({ printed_line: '3', editorial_role: 12 })).toEqual(vide)
    expect(lireMetadonneesBlocNote({ printed_line: 0 })).toEqual(vide)
    expect(lireMetadonneesBlocNote({ printed_line: 2.5 })).toEqual(vide)
  })

  it('relève la raison de contrôle visuel', () => {
    const raison = 'abréviation « ds » à contrôler sur le fac-similé'
    expect(lireMetadonneesBlocNote({ visual_review_reason: raison }).visualReviewReason).toBe(raison)
  })
})
