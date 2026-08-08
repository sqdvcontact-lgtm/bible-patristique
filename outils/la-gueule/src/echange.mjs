// Export d'une page océrisée aux FORMATS D'ÉCHANGE standard : ALTO v4 et PAGE XML
// (PRImA). Coordonnées réelles du témoin + texte de ligne (couche courante) + confiance.
// Sert à ouvrir le résultat dans eScriptorium, Transkribus, Aletheia… Pur (testable).

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Texte d'une ligne pour la couche demandée, avec repli raisonnable. */
const texteLigne = (l, couche) => String(l[couche] ?? l.dip ?? l.texte ?? '').trim()

/** Lignes exportables : bbox valide + texte non vide. */
const lignesUtiles = (lignes, couche) =>
  (lignes || []).filter((l) => Array.isArray(l.bbox) && l.bbox.length === 4 && texteLigne(l, couche))

/** ALTO v4 d'une page : TextBlock unique, une String par ligne (WC = confiance si connue). */
export function altoPage({ image = 'page.png', largeur = 0, hauteur = 0, lignes = [], couche = 'dip' } = {}) {
  const util = lignesUtiles(lignes, couche)
  const tls = util.map((l, i) => {
    const [x, y, w, h] = l.bbox.map((n) => Math.round(n))
    const wc = (l.confiance != null && Number.isFinite(l.confiance)) ? ` WC="${l.confiance.toFixed(3)}"` : ''
    return `        <TextLine ID="line_${i + 1}" HPOS="${x}" VPOS="${y}" WIDTH="${w}" HEIGHT="${h}">` +
      `<String ID="s_${i + 1}" CONTENT="${esc(texteLigne(l, couche))}" HPOS="${x}" VPOS="${y}" WIDTH="${w}" HEIGHT="${h}"${wc}/>` +
      `</TextLine>`
  }).join('\n')
  const W = Math.round(largeur) || 0, H = Math.round(hauteur) || 0
  return `<?xml version="1.0" encoding="UTF-8"?>
<alto xmlns="http://www.loc.gov/standards/alto/ns-v4#">
  <Description>
    <MeasurementUnit>pixel</MeasurementUnit>
    <sourceImageInformation><fileName>${esc(image)}</fileName></sourceImageInformation>
    <OCRProcessing ID="ocr_1"><ocrProcessingStep><processingSoftware><softwareName>La Gueule</softwareName></processingSoftware></ocrProcessingStep></OCRProcessing>
  </Description>
  <Layout>
    <Page ID="page_1" PHYSICAL_IMG_NR="1" WIDTH="${W}" HEIGHT="${H}">
      <PrintSpace HPOS="0" VPOS="0" WIDTH="${W}" HEIGHT="${H}">
        <TextBlock ID="block_1">
${tls}
        </TextBlock>
      </PrintSpace>
    </Page>
  </Layout>
</alto>
`
}

/** Rectangle → polygone PAGE (points « x,y x,y … » dans le sens horaire). */
const polygone = ([x, y, w, h]) => {
  const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h)
  return `${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1}`
}

/** PAGE XML (PRImA 2019-07-15) : une TextRegion englobante, une TextLine par ligne. */
export function pageXml({ image = 'page.png', largeur = 0, hauteur = 0, lignes = [], couche = 'dip', date = null } = {}) {
  const util = lignesUtiles(lignes, couche)
  // Boîte englobante de la région = union des bbox de lignes (sinon toute la page).
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0
  for (const l of util) {
    const [x, y, w, h] = l.bbox
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h)
  }
  const W = Math.round(largeur) || 0, H = Math.round(hauteur) || 0
  const regionBbox = util.length ? [minX, minY, maxX - minX, maxY - minY] : [0, 0, W, H]
  const quand = date || '1970-01-01T00:00:00'
  const tls = util.map((l, i) =>
    `      <TextLine id="line_${i + 1}">
        <Coords points="${polygone(l.bbox)}"/>
        <TextEquiv><Unicode>${esc(texteLigne(l, couche))}</Unicode></TextEquiv>
      </TextLine>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<PcGts xmlns="http://schema.primaresearch.org/PAGE/gts/pagecontent/2019-07-15">
  <Metadata>
    <Creator>La Gueule</Creator>
    <Created>${esc(quand)}</Created>
    <LastChange>${esc(quand)}</LastChange>
  </Metadata>
  <Page imageFilename="${esc(image)}" imageWidth="${W}" imageHeight="${H}">
    <TextRegion id="region_1" type="paragraph">
      <Coords points="${polygone(regionBbox)}"/>
${tls}
    </TextRegion>
  </Page>
</PcGts>
`
}
