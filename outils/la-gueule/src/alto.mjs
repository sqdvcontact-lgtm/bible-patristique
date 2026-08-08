// Analyse d'un ALTO (produit par Kraken ou Tesseract) → structure exploitable :
// dimensions de la page et lignes avec leurs coordonnées réelles (pour l'alignement
// image ⇄ texte de l'atelier de relecture). On EXCLUT les <Glyph> (niveau caractère)
// pour ne garder que le texte de ligne — sinon chaque lettre serait comptée en double.

function decode(t) {
  return t
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export function parseAlto(xml) {
  const num = (re, s) => { const m = re.exec(s); return m ? Number(m[1]) : null }
  const largeur = num(/<Page\b[^>]*\bWIDTH="([\d.]+)"/, xml)
  const hauteur = num(/<Page\b[^>]*\bHEIGHT="([\d.]+)"/, xml)

  const lignes = []
  const reLigne = /<TextLine\b([^>]*)>([\s\S]*?)<\/TextLine>/g
  let m, n = 0
  while ((m = reLigne.exec(xml))) {
    n++
    const attrs = m[1]
    const hpos = num(/\bHPOS="([\d.]+)"/, attrs)
    const vpos = num(/\bVPOS="([\d.]+)"/, attrs)
    const w = num(/\bWIDTH="([\d.]+)"/, attrs)
    const h = num(/\bHEIGHT="([\d.]+)"/, attrs)
    const corps = m[2].replace(/<Glyph\b[\s\S]*?<\/Glyph>/g, '').replace(/<Glyph\b[^>]*\/>/g, '')
    // Chaque <String> porte son texte (CONTENT) et, souvent, une confiance (WC, 0..1).
    const chaines = [...corps.matchAll(/<String\b([^>]*)>/g)].map((x) => x[1])
    const mots = chaines.map((a) => { const c = /\bCONTENT="([^"]*)"/.exec(a); return c ? decode(c[1]) : '' }).filter(Boolean)
    const wcs = chaines.map((a) => { const wc = /\bWC="([\d.]+)"/.exec(a); return wc ? Number(wc[1]) : null }).filter((v) => v != null)
    const texte = mots.join(' ').replace(/\s+/g, ' ').trim()
    lignes.push({
      id: `l${n}`,
      bbox: (hpos != null && vpos != null && w != null && h != null) ? [hpos, vpos, w, h] : null,
      texte,
      confiance: wcs.length ? wcs.reduce((s, v) => s + v, 0) / wcs.length : null, // moyenne WC, ou null
    })
  }
  return { largeur, hauteur, lignes }
}
