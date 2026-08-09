// Extraction des métadonnées bibliographiques d'un document, au vocabulaire EXACT de la table
// `oeuvres` du site : auteur (→ id_auteur), titre, sous_titre, titre_original, langue_originale,
// langue_trad, trad_auteur, editeur, collection, ville, date_publication, date_composition, genre.
// Sources : les infos internes du PDF (pdfinfo Title/Author) ET le texte OCRisé de la PAGE DE
// TITRE (pour la date, la ville, l'éditeur — jamais la date de numérisation). Premier jet :
// l'utilisateur relit et complète dans la colonne « Métadonnées » de l'atelier.

// Villes d'impression. On liste aussi des graphies anciennes (u↔v : « Roven » = Rouen ; « Douay ») et
// on les rabat sur la forme moderne via VILLE_CANON pour la sortie.
const VILLES = 'Paris|Lyon|Rouen|Roven|Rouan|Tours|Bar-le-Duc|Bruxelles|Lille|Rome|Louvain|Arras|Besançon|Avignon|Marseille|Toulouse|Poitiers|Reims|Nancy|Bruges|Namur|Liège|Genève|Vienne|Milan|Douai|Douay|Anvers|Cologne|Strasbourg|Caen|Orléans'
const VILLE_CANON = { roven: 'Rouen', rouan: 'Rouen', douay: 'Douai' }

const echapper = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Lit un MILLÉSIME en chiffres ROMAINS sur la page de titre (« M.DC.XXXXVI » → 1646). Tolère les points
 * et espaces internes, ET la forme additive ancienne (XXXX = 40, pas seulement XL). Ne retient qu'un
 * résultat plausible (1450–1900) ; renvoie un nombre ou null. Nécessaire car beaucoup d'éditions
 * anciennes ne portent PAS de date en chiffres arabes.
 */
export function anneeRomaine(texte) {
  const V = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  const cands = String(texte || '').toUpperCase().match(/[MDCLXVI][MDCLXVI.\s]{2,}[MDCLXVI]/g) || []
  let best = null
  for (const raw of cands) {
    const s = raw.replace(/[.\s]/g, '')
    if (s.length < 4 || !/^[MDCLXVI]+$/.test(s)) continue
    let n = 0
    for (let i = 0; i < s.length; i++) { const a = V[s[i]], b = V[s[i + 1]] || 0; n += (a < b ? -a : a) }
    if (n >= 1450 && n <= 1900 && (best == null || n > best)) best = n
  }
  return best
}

/**
 * Retire du titre la mention d'auteur (« … de saint Basile », « Saint Basile — … »), ancrée
 * sur l'auteur DÉTECTÉ pour ne pas amputer un titre qui parle d'un saint (« … sur saint Matthieu »).
 */
export function titreSansAuteur(titre, auteur) {
  let t = (titre || '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (auteur) {
    const nom = auteur.replace(/^[Ss]aint[e]?\s+/, '').trim()
    const cle = echapper((nom.split(/[\s-]/)[0] || '').trim()) // 1er élément du nom (« Basile »)
    if (cle) {
      // « … (de|d'|par) (saint) Basile… » en FIN de titre.
      t = t.replace(new RegExp('\\s*[,;:]?\\s*(?:de |d[\'’] ?|par )?(?:[Ss]aint[e]? )?' + cle + '[^,;]*$'), '').trim()
      // « Saint Basile[ …] — » / « : » en TÊTE de titre.
      t = t.replace(new RegExp('^(?:[Ss]aint[e]? )?' + cle + '[^,;—:]*\\s*[—:–-]\\s*'), '').trim()
    }
  }
  t = t.replace(/^[\s,;:–—-]+/, '').replace(/[\s,;:–—-]+$/, '').trim()
  return t || null
}

export function parserMetadonnees({ pdfTitle = '', pdfAuthor = '', producer = '', creationDate = '', texteTitre = '', nomFichier = '' } = {}) {
  const meta = {
    auteur: null, titre: null, sous_titre: null, titre_original: null,
    langue_originale: null, langue_trad: null, trad_auteur: null,
    editeur: null, collection: null, ville: null,
    date_publication: null, date_composition: null, genre: null, source: null,
  }
  const src = [pdfTitle, texteTitre, nomFichier.replace(/[_-]+/g, ' ')].filter(Boolean).join('\n')

  // Auteur (→ id_auteur à la reprise) : « Saint X » (nom propre), sinon l'auteur du PDF.
  let m = /\b[Ss]aint[e]?\s+([A-ZÀ-Þ][A-Za-zÀ-ÿ'’.-]+(?:[ -][A-ZÀ-Þ][A-Za-zÀ-ÿ'’.-]+){0,2})/.exec(src)
  if (m) meta.auteur = 'Saint ' + m[1].replace(/\s+/g, ' ').trim()
  else if (pdfAuthor) meta.auteur = pdfAuthor.replace(/\s+/g, ' ').trim()

  // Titre : celui du PDF s'il existe ; sinon la MEILLEURE ligne de la page de titre OCRisée
  // (une ligne « à mots » avec des minuscules plutôt qu'une bannière tout en capitales, la plus
  // longue) — PUIS on en retire la mention d'auteur (le titre du site ne porte pas l'auteur).
  let titreBrut = (pdfTitle || '').replace(/\s+/g, ' ').trim()
  if (!titreBrut) {
    const cands = texteTitre.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length >= 12 && l.length <= 110)
    const avecMin = cands.filter((l) => /[a-zà-ÿ]/.test(l))
    titreBrut = (avecMin.length ? avecMin : cands).sort((a, b) => b.length - a.length)[0] || ''
  }
  meta.titre = titreSansAuteur(titreBrut, meta.auteur)

  // Traducteur → trad_auteur : « traduit/traduicte … par … » ou « Par le P./Sieur/M. … ». On franchit
  // les retours de ligne (s) et les virgules internes ; on élague les particules de tête.
  m = /\btradu\w*[\s\S]{0,90}?\bpar\s+([^\n,;]{2,80})/i.exec(src)
  if (!m) m = /\bpar\s+(le\s+(?:P\.|R\.\s*P\.|Sieur|Père)\s+[^\n,;]{2,60})/i.exec(src)
  if (m) meta.trad_auteur = m[1].replace(/\s+/g, ' ').trim()

  // Langues : ces éditions sont des traductions FRANÇAISES ; langue originale = latin/grec si citée.
  if (/\blatin\b/i.test(src)) meta.langue_originale = 'latin'
  else if (/\bgrec/i.test(src)) meta.langue_originale = 'grec'
  meta.langue_trad = 'français'

  // Date de PUBLICATION (texte, comme la colonne) : millésime ANCIEN de la page de titre, jamais la date
  // de numérisation. On lit les chiffres ARABES et, à défaut, les chiffres ROMAINS (« M.DC.XXXXVI »).
  const annees = [...String(texteTitre).matchAll(/\b(1[4-9]\d\d|20[0-2]\d)\b/g)].map((x) => Number(x[1]))
  const anciennes = annees.filter((a) => a <= 1960)
  const romaine = anneeRomaine(texteTitre)
  if (anciennes.length) meta.date_publication = String(Math.max(...anciennes))
  else if (romaine) meta.date_publication = String(romaine)
  else if (annees.length) meta.date_publication = String(annees[annees.length - 1])

  // Ville + éditeur. La ville : « A ROUEN, » / « PARIS. » (u↔v ancien géré par VILLES + VILLE_CANON).
  m = new RegExp(`\\b(?:A\\s+)?(${VILLES})\\b`, 'i').exec(texteTitre || '')
  if (m) {
    meta.ville = VILLE_CANON[m[1].toLowerCase()] || m[1].replace(/^./, (c) => c.toUpperCase())
    // Éditeur : après la ville, dans l'ordre de fiabilité — « … Imprimeur » (imprimeur nommé, anciennes
    // éditions), « chez X » (le libraire), « Librairie/Imprimerie/Éditions X » (19ᵉ), ou « — X »
    // (« PARIS. — LIBRAIRIE VICTOR PALMÉ »).
    const apres = String(texteTitre).slice(m.index + m[0].length, m.index + m[0].length + 300).replace(/\n+/g, ' ')
    let e = /([A-ZÀ-Þ][A-Za-zÀ-ÿ'’.\s-]{2,40}?)\s*,?\s+Imprimeur/i.exec(apres)
    if (!e) e = /\bchez\s+([A-ZÀ-Þ][^\n,]{2,40})/i.exec(apres)
    if (!e) e = /\b((?:Librairie|Imprimerie|Éditions?|Édit\.|Vve|Veuve)\s+[^\n,;.]{2,50})/i.exec(apres)
    if (!e) e = /^[\s.,;—–-]+([A-ZÀ-Þ][^\n,;]{2,50})/.exec(apres) // « … — Nom de l'éditeur »
    if (e) meta.editeur = e[1].replace(/[—.,\s-]+$/, '').replace(/\s+/g, ' ').trim() || null
  }

  meta.source = producer ? `PDF — ${producer}${creationDate ? ' (numérisé ' + creationDate + ')' : ''}` : 'PDF'
  return meta
}

/**
 * Devine si l'imprimé est ANCIEN (s long ſ, ligatures) — donc à océriser avec Kraken/CATMuS-Print
 * plutôt qu'avec Tesseract. `texteCorps` = OCR (Tesseract) d'une page de CORPS ; c'est là que se
 * lit le signal, pas sur la page de titre (souvent en CAPITALES, où le S est normal).
 * Signaux : 1) la date (le s long disparaît de l'imprimé français vers 1780-1800) ;
 * 2) les digrammes « f + t/p/c/ç/m » (eft, refte, jufte, fçav, cinquiefme) que l'OCR moderne
 * produit à partir du ſ — quasi inexistants avec un vrai « f » en français.
 * Renvoie { ancien:boolean, raison:string }.
 */
export function typographieProbable({ texteTitre = '', texteCorps = '', date_publication = null } = {}) {
  const an = parseInt(date_publication, 10)
  if (Number.isFinite(an)) {
    if (an >= 1400 && an < 1800) return { ancien: true, raison: `édition de ${an} (avant ~1800, s long courant)` }
    if (an >= 1820) return { ancien: false, raison: `édition de ${an} (postérieure au s long)` }
  }
  // Corps de texte : digrammes « f devant t/p/c/ç/m » (le ſ lu « f »). Rares avec un vrai « f ».
  const anomalies = (String(texteCorps || '').match(/[fſ][tpcçm]/gi) || []).length
  if (anomalies >= 3) return { ancien: true, raison: `s long fréquent dans le texte (${anomalies} indices)` }
  // Marqueurs nominatifs (si un sous-titre / colophon en minuscules en porte).
  const marqueurs = [/con[fſ]olation/i, /philo[fſ]oph/i, /\bIe[fſ]us\b/i, /\be[fſ]tre?\b/i, /[fſ]çav/i, /\bau[fſ]li\b/i, /cinqui[fſ]?e[fſ]me/i]
  const src = texteTitre + '\n' + texteCorps
  const n = marqueurs.reduce((c, re) => c + (re.test(src) ? 1 : 0), 0)
  if (n >= 2) return { ancien: true, raison: 's long repéré' }
  return { ancien: false, raison: Number.isFinite(an) ? `édition de ${an}` : 'typographie moderne présumée' }
}
