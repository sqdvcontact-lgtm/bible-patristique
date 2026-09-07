import { inflateRawSync } from 'node:zlib'
import { XMLValidator, XMLParser } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import { crc32 } from './zip'
import { construireDocx, echapperXml, type BlocDocx, type DocumentDocx } from './ooxml'

/**
 * LA GARDE DU DOCUMENT — un `.docx` écrit à la main ne se relit pas à l'œil.
 *
 * ⛔ Deux choses ne peuvent PAS être vérifiées par une relecture, et ce sont les deux qui
 * rendent le fichier illisible sans rien dire : l'archive (compteurs, décalages, sommes de
 * contrôle) et la bonne formation de l'XML. Ce test DÉBALLE ce qu'on vient d'empaqueter et
 * repasse chaque partie à un analyseur. Sans lui, la seule épreuve serait d'ouvrir Word.
 */

// ── Un lecteur de ZIP, pour relire ce que l'écrivain a écrit ──────────────────

const SIGNATURE_FIN = 0x06054b50
const SIGNATURE_CENTRALE = 0x02014b50
const SIGNATURE_ENTREE = 0x04034b50

/** Déballe une archive et rend ses fichiers, en vérifiant les sommes de contrôle. */
function deballer(archive: Buffer): Map<string, Buffer> {
  const finIndex = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  expect(finIndex, 'fin de répertoire central introuvable').toBeGreaterThan(-1)
  expect(archive.readUInt32LE(finIndex)).toBe(SIGNATURE_FIN)
  const nombre = archive.readUInt16LE(finIndex + 10)
  const tailleRepertoire = archive.readUInt32LE(finIndex + 12)
  const debutRepertoire = archive.readUInt32LE(finIndex + 16)
  expect(debutRepertoire + tailleRepertoire).toBe(finIndex)

  const fichiers = new Map<string, Buffer>()
  let curseur = debutRepertoire
  for (let i = 0; i < nombre; i++) {
    expect(archive.readUInt32LE(curseur)).toBe(SIGNATURE_CENTRALE)
    const methode = archive.readUInt16LE(curseur + 10)
    const somme = archive.readUInt32LE(curseur + 16)
    const tailleComprimee = archive.readUInt32LE(curseur + 20)
    const tailleBrute = archive.readUInt32LE(curseur + 24)
    const longueurNom = archive.readUInt16LE(curseur + 28)
    const longueurExtra = archive.readUInt16LE(curseur + 30)
    const longueurCommentaire = archive.readUInt16LE(curseur + 32)
    const decalage = archive.readUInt32LE(curseur + 42)
    const nom = archive.subarray(curseur + 46, curseur + 46 + longueurNom).toString('utf8')

    expect(archive.readUInt32LE(decalage), `en-tête local de ${nom}`).toBe(SIGNATURE_ENTREE)
    const nomLocal = archive.readUInt16LE(decalage + 26)
    const extraLocal = archive.readUInt16LE(decalage + 28)
    const debutDonnees = decalage + 30 + nomLocal + extraLocal
    const donnees = archive.subarray(debutDonnees, debutDonnees + tailleComprimee)
    const brut = methode === 0 ? Buffer.from(donnees) : inflateRawSync(donnees)

    expect(brut.length, `taille de ${nom}`).toBe(tailleBrute)
    expect(crc32(brut), `somme de contrôle de ${nom}`).toBe(somme)
    fichiers.set(nom, brut)
    curseur += 46 + longueurNom + longueurExtra + longueurCommentaire
  }
  return fichiers
}

// ── Un document de contrôle ───────────────────────────────────────────────────

const DOCUMENT: DocumentDocx = {
  titre: 'Les Confessions',
  auteur: 'Augustin d’Hippone',
  description: 'Un document de contrôle « avec » des <balises> & des esperluettes.',
  dateIso: '2026-09-07T12:00:00Z',
  blocs: [
    { type: 'paragraphe', style: 'Titre', morceaux: [{ texte: 'Les Confessions' }] },
    { type: 'paragraphe', style: 'Titre1', morceaux: [{ texte: 'Livre premier' }] },
    { type: 'sommaire', profondeur: 3 },
    {
      type: 'paragraphe', style: 'Corpsdetextesansalinea',
      morceaux: [
        { texte: 'Tu es grand, ' },
        { texte: 'Seigneur', italique: true },
        { note: [{ style: 'Notedebasdepage', morceaux: [{ texte: 'Ps 144, 3.' }] }] },
        { texte: ', et digne de toute louange.' },
      ],
    },
    { type: 'paragraphe', style: 'Vers', retraitGauche: 283, espaceAvant: 255, morceaux: [{ texte: 'Un vers rentré' }] },
    {
      type: 'regard',
      lignes: [{
        gauche: [{ style: 'Corpsdetextesansalinea', morceaux: [{ texte: 'Le français' }] }],
        droite: [{ style: 'Texteoriginal', morceaux: [{ texte: 'Latinum' }] }],
      }],
    },
    {
      type: 'paragraphe', style: 'Colophon',
      morceaux: [{ texte: 'corpus-scriptura.fr', lien: 'https://corpus-scriptura.fr' }],
    },
  ],
}

const PARTIES_ATTENDUES = [
  '[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels',
  'word/styles.xml', 'word/settings.xml', 'word/footnotes.xml', 'word/fontTable.xml',
  'word/footer1.xml', 'docProps/core.xml', 'docProps/app.xml',
]

describe('le paquet .docx', () => {
  const archive = construireDocx(DOCUMENT)
  const parties = deballer(archive)

  it('porte toutes ses parties, et [Content_Types].xml en tête', () => {
    expect([...parties.keys()]).toEqual(PARTIES_ATTENDUES)
  })

  it('rend un XML BIEN FORMÉ dans chaque partie', () => {
    for (const [nom, contenu] of parties) {
      const verdict = XMLValidator.validate(contenu.toString('utf8'))
      expect(verdict, `${nom} : ${JSON.stringify(verdict)}`).toBe(true)
    }
  })

  it('déclare chaque partie dans les types de contenu', () => {
    const types = parties.get('[Content_Types].xml')!.toString('utf8')
    for (const nom of PARTIES_ATTENDUES) {
      if (nom === '[Content_Types].xml' || nom.endsWith('.rels')) continue
      expect(types, nom).toContain(`PartName="/${nom}"`)
    }
  })

  it('déclare une relation pour chaque partie que le document appelle', () => {
    const relations = parties.get('word/_rels/document.xml.rels')!.toString('utf8')
    for (const cible of ['styles.xml', 'settings.xml', 'footnotes.xml', 'fontTable.xml', 'footer1.xml']) {
      expect(relations, cible).toContain(`Target="${cible}"`)
    }
  })

  it('range chaque hyperlien dans une relation EXTERNE, et le document la vise', () => {
    const document = parties.get('word/document.xml')!.toString('utf8')
    const relations = parties.get('word/_rels/document.xml.rels')!.toString('utf8')
    const identifiant = document.match(/<w:hyperlink r:id="(rId\d+)">/)?.[1]
    expect(identifiant, 'aucun hyperlien dans le document').toBeTruthy()
    expect(relations).toContain(`Id="${identifiant}"`)
    expect(relations).toContain('TargetMode="External"')
    expect(relations).toContain('Target="https://corpus-scriptura.fr"')
  })

  it('numérote les notes à partir de 1, et les filets à part', () => {
    const document = parties.get('word/document.xml')!.toString('utf8')
    const notes = parties.get('word/footnotes.xml')!.toString('utf8')
    expect(document).toContain('<w:footnoteReference w:id="1"/>')
    expect(notes).toContain('w:type="separator" w:id="-1"')
    expect(notes).toContain('w:type="continuationSeparator" w:id="0"')
    expect(notes).toContain('<w:footnote w:id="1">')
    expect(notes).toContain('Ps 144, 3.')
  })

  it('ne pose que des styles que la feuille déclare', () => {
    const document = parties.get('word/document.xml')!.toString('utf8')
    const styles = parties.get('word/styles.xml')!.toString('utf8')
    const declares = new Set([...styles.matchAll(/w:styleId="([^"]+)"/g)].map(m => m[1]))
    for (const employe of new Set([...document.matchAll(/<w:pStyle w:val="([^"]+)"\/>/g)].map(m => m[1]))) {
      expect(declares, `style ${employe}`).toContain(employe)
    }
    for (const course of new Set([...document.matchAll(/<w:rStyle w:val="([^"]+)"\/>/g)].map(m => m[1]))) {
      expect(declares, `style de course ${course}`).toContain(course)
    }
  })

  it('ferme le corps sur un paragraphe qui porte la section', () => {
    const document = parties.get('word/document.xml')!.toString('utf8')
    // ⚠️ Word exige un paragraphe après un tableau en fin de corps, et c'est là que
    // vivent la taille de page et le pied. Ne pas le retirer en croyant nettoyer.
    expect(document).toMatch(/<w:sectPr>[\s\S]*<\/w:sectPr><\/w:pPr><\/w:p><\/w:body><\/w:document>$/)
  })

  it('compose le tableau en regard à deux colonnes, chacune avec un paragraphe', () => {
    const document = parties.get('word/document.xml')!.toString('utf8')
    const tableau = document.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)?.[0] ?? ''
    expect(tableau).toContain('<w:tblGrid>')
    expect(tableau.match(/<w:gridCol /g)).toHaveLength(2)
    expect(tableau.match(/<w:tc>/g)).toHaveLength(2)
    // ⛔ Une cellule sans `w:p` rend le document illisible pour Word.
    for (const cellule of tableau.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []) {
      expect(cellule).toContain('<w:p>')
    }
  })

  it('respecte l’ordre des propriétés de paragraphe imposé par le schéma', () => {
    const document = parties.get('word/document.xml')!.toString('utf8')
    const vers = document.match(/<w:pPr><w:pStyle w:val="Vers"\/>[\s\S]*?<\/w:pPr>/)?.[0] ?? ''
    const rangs = ['<w:pStyle', '<w:spacing', '<w:ind', '<w:contextualSpacing']
      .map(balise => vers.indexOf(balise))
    expect(rangs.every(rang => rang >= 0), vers).toBe(true)
    expect([...rangs].sort((a, b) => a - b)).toEqual(rangs)
  })

  it('écrit les propriétés du document', () => {
    const noyau = parties.get('docProps/core.xml')!.toString('utf8')
    const parse = new XMLParser({ ignoreAttributes: false })
    const lu = parse.parse(noyau)['cp:coreProperties']
    expect(lu['dc:title']).toBe('Les Confessions')
    expect(lu['dc:creator']).toBe('Augustin d’Hippone')
    expect(lu['dcterms:created']['#text']).toBe('2026-09-07T12:00:00Z')
  })

  it('rend le même octet pour la même entrée', () => {
    // L'horodatage de l'archive est figé : deux extractions du même texte ne peuvent
    // différer que par le TEXTE.
    expect(construireDocx(DOCUMENT).equals(archive)).toBe(true)
  })
})

describe('l’échappement', () => {
  it('protège les cinq caractères que l’XML se réserve', () => {
    expect(echapperXml('a & b < c > d " e')).toBe('a &amp; b &lt; c &gt; d &quot; e')
  })

  it('RETIRE les caractères de commande, que l’XML interdit jusqu’en référence', () => {
    // Un seul suffit à rendre le document illisible, et Word ne dit pas où.
    const sale = `avant${String.fromCharCode(0)}${String.fromCharCode(11)}${String.fromCharCode(31)}après`
    expect(echapperXml(sale)).toBe('avantaprès')
  })

  it('garde la tabulation, le saut de ligne et le retour chariot', () => {
    expect(echapperXml('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  it('survit à un texte que le corpus porte vraiment', () => {
    const texte = 'Tu es grand, Seigneur — « laudare te vult homo » — & digne de louange.'
    const document = construireDocx({ ...DOCUMENT, blocs: [{ type: 'paragraphe', style: 'Corpsdetexte', morceaux: [{ texte }] } as BlocDocx] })
    const parties = deballer(document)
    expect(XMLValidator.validate(parties.get('word/document.xml')!.toString('utf8'))).toBe(true)
  })
})
