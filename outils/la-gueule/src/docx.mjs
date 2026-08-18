// Génère un .docx PROPRE (Word / OOXML) à partir des segments d'un projet : styles nommés
// (Titre, Sous-titre, Titre1..5, Normal, Original, Apparat, Note) et niveaux de titre réels
// (outlineLvl → volet de navigation Word). Sans dépendance : XML à la main + ZIP maison.

import { creerZip } from './zip.mjs'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Un paragraphe Word : style optionnel, sauts de ligne internes préservés. */
function paragraphe(texte, style) {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  const lignes = String(texte ?? '').split('\n')
  const runs = lignes.map((l, i) => (i ? '<w:br/>' : '') + `<w:t xml:space="preserve">${esc(l)}</w:t>`).join('')
  return `<w:p>${pPr}<w:r>${runs}</w:r></w:p>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="595959"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="120"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="120"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="140" w:after="120"/><w:outlineLvl w:val="4"/></w:pPr><w:rPr><w:i/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Original"><w:name w:val="Original"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Apparat"><w:name w:val="Apparat"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="7F7F7F"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>`

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

/** Corps du document : en-tête bibliographique, puis segments (titres de niveau + textes). */
function corpsDocument({ meta = {}, segments = [] }) {
  const p = []
  if (meta.auteur) p.push(paragraphe(meta.auteur, 'Subtitle'))
  if (meta.titre) p.push(paragraphe(meta.titre, 'Title'))
  if (meta.sous_titre) p.push(paragraphe(meta.sous_titre, 'Subtitle'))
  if (meta.trad_auteur) p.push(paragraphe('Traduction : ' + meta.trad_auteur, 'Note'))

  // Titres de niveau : on n'émet un Titre N que lorsque sa valeur CHANGE (structure propre).
  const dernier = [null, null, null, null, null]
  const notes = []
  for (const s of segments) {
    for (let k = 1; k <= 5; k++) {
      const t = s[`ref_niv${k}_texte`]
      if (t && t !== dernier[k - 1]) {
        p.push(paragraphe(t, 'Heading' + k))
        dernier[k - 1] = t
        for (let j = k; j < 5; j++) dernier[j] = null // un titre supérieur réinitialise les sous-niveaux
      }
    }
    const style = s.nature === 'apparat_critique' ? 'Apparat' : 'Normal'
    if (s.segment_texte) p.push(paragraphe(s.segment_texte, style))
    if (s.texte_original) p.push(paragraphe(s.texte_original, 'Original'))
    if (s.notes) notes.push(s.notes)
  }
  if (notes.length) {
    p.push(paragraphe('Notes', 'Heading1'))
    for (const bloc of notes) for (const ligne of String(bloc).split('\n')) if (ligne.trim()) p.push(paragraphe(ligne, 'Note'))
  }
  return p.join('')
}

/** Construit le .docx (Buffer) à partir de { meta, segments }. */
export function construireDocx({ meta = {}, segments = [] } = {}) {
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpsDocument({ meta, segments })}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417"/></w:sectPr></w:body></w:document>`
  return creerZip([
    { nom: '[Content_Types].xml', data: CONTENT_TYPES },
    { nom: '_rels/.rels', data: RELS },
    { nom: 'word/document.xml', data: document },
    { nom: 'word/styles.xml', data: STYLES },
    { nom: 'word/_rels/document.xml.rels', data: DOC_RELS },
  ])
}
