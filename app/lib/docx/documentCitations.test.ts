import { describe, expect, it } from 'vitest'
import { inflateRawSync } from 'node:zlib'
import { composerRecueilCitations } from './documentCitations'
import { construireDocx } from './ooxml'
import { lireDemandeExtraction, noticeEnSyntaxe, type DemandeExtractionCitations } from '../extractionCitations'

const DEMANDE: DemandeExtractionCitations = {
  lecteur: 'Sébastien',
  sections: [
    {
      corpus: 'biblique',
      chapeau: 'Texte de la Bible de Sacy',
      groupes: [{ titre: 'Genèse', citations: [{ reference: 'Gn 1, 1-2', texte: 'Au commencement Dieu créa le ciel et la terre.' }] }],
    },
    {
      corpus: 'patristique',
      groupes: [{
        titre: 'Augustin, *Confessions*',
        notice: '++Augustin++, *Confessions*, Paris, 1649.',
        citations: [{ reference: 'Livre I', texte: 'Tu nous as faits pour toi.' }],
      }],
    },
  ],
}

/** Lit une partie de l'archive, sans dépendance : le ZIP est écrit à la main (`zip.ts`). */
function partie(archive: Buffer, chemin: string): string {
  let i = 0
  while (i < archive.length - 4 && archive.readUInt32LE(i) === 0x04034b50) {
    const methode = archive.readUInt16LE(i + 8)
    const taille = archive.readUInt32LE(i + 18)
    const lnom = archive.readUInt16LE(i + 26)
    const lextra = archive.readUInt16LE(i + 28)
    const nom = archive.subarray(i + 30, i + 30 + lnom).toString('utf8')
    const debut = i + 30 + lnom + lextra
    const donnees = archive.subarray(debut, debut + taille)
    if (nom === chemin) return (methode === 8 ? inflateRawSync(donnees) : donnees).toString('utf8')
    i = debut + taille
  }
  throw new Error(`partie absente : ${chemin}`)
}

describe('lireDemandeExtraction', () => {
  it('lit une demande bien formée et range l’Écriture avant les Pères', () => {
    const lue = lireDemandeExtraction({ ...DEMANDE, sections: [...DEMANDE.sections].reverse() })
    expect(lue?.sections.map(s => s.corpus)).toEqual(['biblique', 'patristique'])
    expect(lue?.sections[1].groupes[0].notice).toContain('Confessions')
  })

  it('refuse ce qui n’a pas la forme attendue', () => {
    expect(lireDemandeExtraction(null)).toBeNull()
    expect(lireDemandeExtraction({ lecteur: 'x', sections: [] })).toBeNull()
    expect(lireDemandeExtraction({ lecteur: 'x', sections: [{ corpus: 'autre', groupes: [] }] })).toBeNull()
    expect(lireDemandeExtraction({
      lecteur: 'x',
      sections: [{ corpus: 'biblique', groupes: [{ titre: 'Gn', citations: [{ reference: 'Gn 1, 1', texte: '' }] }] }],
    })).toBeNull()
    // Deux sections du même corpus : on ne compose pas un recueil qui se répète.
    expect(lireDemandeExtraction({ lecteur: 'x', sections: [DEMANDE.sections[0], DEMANDE.sections[0]] })).toBeNull()
  })

  it('refuse un passage démesuré', () => {
    const long = 'a'.repeat(40_001)
    expect(lireDemandeExtraction({
      lecteur: 'x',
      sections: [{ corpus: 'biblique', groupes: [{ titre: 'Gn', citations: [{ reference: 'Gn 1, 1', texte: long }] }] }],
    })).toBeNull()
  })
})

describe('noticeEnSyntaxe', () => {
  it('réunit les fragments d’une même composition avant de les baliser', () => {
    expect(noticeEnSyntaxe([
      { champ: 'auteur', style: 'bibliographie-nom-auteur', composition: 'petites-capitales', texte: 'Augustin' },
      { champ: null, style: null, composition: 'romain', texte: ', ' },
      { champ: 'titre', style: 'bibliographie-titre-ouvrage', composition: 'italique', texte: 'Confessions' },
      { champ: null, style: null, composition: 'italique', texte: '. ' },
      { champ: 'sous_titre', style: 'bibliographie-sous-titre', composition: 'italique', texte: 'Livre I' },
    ] as never)).toBe('++Augustin++, *Confessions. Livre I*')
  })
})

describe('composerRecueilCitations', () => {
  const blocs = composerRecueilCitations(DEMANDE, '2026-09-21T10:00:00Z')

  it('compose une page de titre, un sommaire et une section par corpus', () => {
    const styles = blocs.map(b => (b.type === 'paragraphe' ? b.style : b.type))
    expect(styles.slice(0, 4)).toEqual(['Titre', 'Soustitre', 'Frontispicemention', 'Colophon'])
    expect(styles).toContain('sommaire')
    expect(styles.filter(s => s === 'Titre1')).toHaveLength(2)
    expect(styles.filter(s => s === 'Citation')).toHaveLength(2)
  })

  it('encadre chaque passage de guillemets français tenus par une fine insécable', () => {
    const citation = blocs.find(b => b.type === 'paragraphe' && b.style === 'Citation')
    const texte = citation && citation.type === 'paragraphe'
      ? citation.morceaux.map(m => ('texte' in m ? m.texte : '')).join('') : ''
    expect(texte.startsWith('« ')).toBe(true)
    expect(texte.endsWith(' »')).toBe(true)
  })

  it('rend les italiques de la notice, et un document que Word ouvre', () => {
    const notice = blocs.find(b => b.type === 'paragraphe' && b.style === 'Frontispicemention'
      && b.morceaux.some(m => 'texte' in m && m.texte.includes('Confessions')))
    expect(notice && notice.type === 'paragraphe' && notice.morceaux.some(m => 'italique' in m && m.italique)).toBe(true)

    const docx = construireDocx({ titre: 'Citations', auteur: 'Sébastien', description: 'test', dateIso: '2026-09-21T10:00:00Z', blocs })
    const xml = partie(docx, 'word/document.xml')
    expect(xml).toContain('Au commencement Dieu créa le ciel et la terre.')
    expect(xml).toContain('Recueillies par Sébastien')
  })
})
