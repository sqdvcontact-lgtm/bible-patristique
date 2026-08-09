// Pont Node → WSL : fait tourner Kraken / Tesseract / poppler dans Ubuntu depuis La Gueule.
//
// Leçon durement apprise : les ESPACES et ANTISLASHS d'un chemin Windows ne survivent pas
// au passage `wsl.exe -e bash -c "…"` (quoting massacré). Solution robuste : on passe chaque
// chemin Windows en VARIABLE D'ENVIRONNEMENT, et on liste ces variables dans `WSLENV` avec le
// drapeau `/p` — WSL les traduit alors AUTOMATIQUEMENT en /mnt/<lettre>/… (espaces compris).
// Dans le script bash, on ne référence que `"$PDF"`, `"$IMG"`, `"$SERVED"` (jamais un chemin en dur).
//
// `/mnt/c` est lent (9p) → les moteurs travaillent en natif /tmp ; l'ALTO revient par stdout.

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

// Modèle HTR médiéval installé dans Ubuntu (voir scripts/installer-wsl.sh + `kraken get`).
export const MODELE_CATMUS = '/root/.local/share/htrmopo/70c4f766-f8c7-5c2d-8b47-ab2a72b43565/CATMUS%20Medieval%201.0.0.mlmodel'

// Modèle IMPRIMÉ ANCIEN (CATMuS-Print, `kraken get 10.5281/zenodo.10602357`) : lit correctement
// le s long (ſ), les ligatures et les abréviations des imprimés XVIᵉ-XVIIIᵉ, là où Tesseract `fra`
// prend le ſ pour un f. À utiliser pour les éditions d'Ancien Régime (Ceriziers, Du Fresne…).
export const MODELE_CATMUS_PRINT = '/root/.local/share/htrmopo/d96caf7a-122e-5576-ab2b-a246c4e64221/catmus-print-fondue-large.mlmodel'

// Langues Tesseract autorisées (installées : voir scripts/installer-wsl.sh). Liste blanche :
// `lang` est interpolé dans la ligne de commande, on ne laisse donc passer que du connu.
const LANGUES_OCR = new Set(['fra', 'lat', 'eng', 'grc', 'ita', 'deu', 'spa', 'fra+lat', 'lat+fra'])

/** Chemin de modèle Kraken plausible (.mlmodel), sans métacaractères shell. */
const MODELE_OK = /^[\w./%+-]+\.mlmodel$/

/** Entier positif borné, ou lève : `page`, `dpi`, `offset` finissent dans un script bash. */
function entier(v, { min, max, nom }) {
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${nom} invalide : ${JSON.stringify(v)} (attendu entier ${min}..${max})`)
  }
  return n
}

/** Nom de PNG propre à un document + une page : évite qu'un autre PDF écrase l'image servie. */
function nomPng(cle, page) {
  const empreinte = createHash('sha1').update(String(cle)).digest('hex').slice(0, 10)
  return `${empreinte}-p${page}.png`
}

// Kraken sur GPU (CUDA) avec REPLI CPU automatique : le GPU accélère la reconnaissance ; s'il
// échoue (driver/mémoire), on retombe sur le CPU sans casser l'OCR. Benchmark : ~14 % de gain
// (le coût par page est surtout le démarrage du process + la segmentation, pas la reconnaissance).
const krakenAvecRepli = (inPng, outXml, modele) =>
  `( kraken -d cuda:0 -a -i ${inPng} ${outXml} segment -bl ocr -m ${modele} 2>/dev/null ` +
  `|| kraken -a -i ${inPng} ${outXml} segment -bl ocr -m ${modele} )`

// Chaque OCR travaille dans un dossier temporaire UNIQUE (mktemp), nettoyé à la sortie (trap) :
// plus aucun nom fixe /tmp/pg.png ni /tmp/o.xml → pas de collision, exécution simultanée possible.
const dansTmp = (corps) => `D=$(mktemp -d /tmp/lg.XXXXXX); trap 'rm -rf "$D"' EXIT; ${corps}`

// Prétraitement d'image EXPÉRIMENTAL (OFF par défaut). On ne mappe que des DRAPEAUX connus vers des
// options ImageMagick fixes → aucune valeur libre interpolée, donc pas d'injection. Ordre pensé :
// demi-page → gris → contraste → débruitage → redressement → binarisation locale → rognage.
// Renvoie une chaîne d'options `convert` (vide si rien n'est demandé = aucun prétraitement).
export function argsPretraitement(pre) {
  pre = pre || {} // ⚠️ défaut `= {}` ne couvre QUE undefined ; l'atelier envoie `pretraitement:null`
  const a = []
  if (pre.demiPage === 'gauche') a.push('-gravity West -crop 50%x100%+0+0 +repage')
  else if (pre.demiPage === 'droite') a.push('-gravity East -crop 50%x100%+0+0 +repage')
  if (pre.gris) a.push('-colorspace Gray')
  if (pre.contraste) a.push('-normalize')
  if (pre.debruiter) a.push('-despeckle')
  if (pre.deskew) a.push('-deskew 40% +repage')
  if (pre.binariser) a.push('-colorspace Gray -lat 25x25+10%') // binarisation locale (type Sauvola)
  if (pre.rogner) a.push('-fuzz 15% -trim +repage')
  return a.join(' ')
}

// Enfants WSL en cours (pour pouvoir les tuer sur « arrêter »). Un OCR bloquait tout le
// serveur en `spawnSync` ; en `spawn` asynchrone, le serveur reste réactif et annulable.
const enfantsActifs = new Set()
const MAX_SORTIE = 128 * 1024 * 1024 // garde-fou mémoire pour la sortie (l'ALTO fait quelques Mo)

/**
 * Exécute un script bash dans WSL, SANS bloquer la boucle d'événements (spawn asynchrone).
 * `chemins` = { VAR: cheminWindows } : chaque entrée est exportée en variable d'environnement
 * et TRADUITE Win→WSL par WSLENV (/p). Robuste aux espaces. Résout toujours (jamais de rejet)
 * avec { ok, code, stdout, stderr, annule, timeout }. `timeoutMs` > 0 tue l'enfant au-delà du
 * délai (0 = pas de limite ; l'OCR, long, n'en met pas).
 */
export function runBash(script, chemins = {}, { timeoutMs = 0 } = {}) {
  const env = { ...process.env, WSL_UTF8: '1', ...chemins }
  const aTraduire = Object.keys(chemins).map((k) => `${k}/p`)
  if (aTraduire.length) {
    env.WSLENV = (process.env.WSLENV ? process.env.WSLENV + ':' : '') + aTraduire.join(':')
  }
  return new Promise((resolve) => {
    let proc
    try {
      proc = spawn('wsl.exe', ['-e', 'bash', '-c', script], { env, windowsHide: true })
    } catch (e) {
      resolve({ ok: false, code: -1, stdout: '', stderr: String(e?.message ?? e), annule: false, timeout: false })
      return
    }
    enfantsActifs.add(proc)
    const bouts = []          // on collecte des Buffers et on décode À LA FIN : pas de
    let taille = 0            // caractère UTF-8 coupé à la frontière d'un chunk (ALTO propre).
    let stderr = ''
    let parDelai = false
    const minuteur = timeoutMs > 0 ? setTimeout(() => { parDelai = true; try { proc.kill() } catch { /* déjà mort */ } }, timeoutMs) : null
    proc.stdout?.on('data', (d) => { if (taille < MAX_SORTIE) { bouts.push(d); taille += d.length } })
    proc.stderr?.setEncoding('utf8')
    proc.stderr?.on('data', (d) => { stderr += d })
    const fini = (base) => { if (minuteur) clearTimeout(minuteur); enfantsActifs.delete(proc); resolve({ stdout: Buffer.concat(bouts).toString('utf8'), stderr, timeout: parDelai, ...base }) }
    proc.on('error', (e) => fini({ ok: false, code: -1, stderr: String(e?.message ?? e), annule: !!proc.killed && !parDelai }))
    proc.on('close', (code) => fini({ ok: code === 0, code, annule: !!proc.killed && !parDelai }))
  })
}

/** Tue tous les enfants WSL en cours (« arrêter »). Renvoie combien ont été arrêtés. */
export function annulerTaches() {
  let n = 0
  for (const p of enfantsActifs) { try { p.kill(); n++ } catch { /* déjà mort */ } }
  enfantsActifs.clear()
  return n
}

/** WSL est-il disponible et une distribution installée ? */
export async function wslDispo() {
  return (await runBash('true')).ok
}

/** Nombre de pages d'un PDF (poppler). */
export async function pdfNbPages(pdfWin) {
  const r = await runBash("pdfinfo \"$PDF\" | awk '/^Pages:/{print $2}'", { PDF: pdfWin })
  const n = parseInt((r.stdout || '').trim(), 10)
  return Number.isFinite(n) ? n : null
}

/** Métadonnées internes d'un PDF (poppler pdfinfo). */
export async function pdfInfo(pdfWin) {
  const r = await runBash('pdfinfo "$PDF"', { PDF: pdfWin })
  // [ \t]* et non \s* : \s engloberait le retour-ligne et capturerait la ligne SUIVANTE.
  const get = (k) => { const m = new RegExp('^' + k + ':[ \\t]*(.*)$', 'm').exec(r.stdout); const v = m ? m[1].trim() : ''; return v || null }
  return { title: get('Title'), author: get('Author'), creationDate: get('CreationDate'), producer: get('Producer'), pages: Number(get('Pages')) || null }
}

/** Boîte de dialogue Windows « Ouvrir un fichier ». Renvoie le chemin choisi, ou null. */
export function choisirFichier() {
  const ps = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$d = New-Object System.Windows.Forms.OpenFileDialog',
    '$d.Filter = "Documents (*.pdf;*.png;*.jpg;*.jpeg;*.tif;*.tiff)|*.pdf;*.png;*.jpg;*.jpeg;*.tif;*.tiff|Tous (*.*)|*.*"',
    '$d.Title = "La Gueule — choisir un document"',
    'if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.FileName) }',
  ].join('; ')
  const r = spawnSync('powershell', ['-STA', '-NoProfile', '-Command', ps], { encoding: 'utf8' })
  return (r.stdout || '').trim() || null
}

/**
 * Prépare une page pour l'atelier : renvoie l'ALTO (texte + coordonnées) et le PNG à afficher.
 * Manuscrit → Kraken/CATMuS sur l'image. Imprimé → poppler rastérise la page, puis Tesseract.
 * `servedDirWin` (Windows) reçoit le PNG à servir au navigateur.
 */
export async function ocrPage(params) {
  const { kind, servedDirWin } = params

  if (kind === 'imprime') {
    const { pdfWin } = params
    // Ces valeurs sont interpolées dans le script bash : on les coerce en entiers bornés.
    // (Validation synchrone : ocrPage rejette immédiatement sur entrée invalide.)
    const page = entier(params.page, { min: 1, max: 100000, nom: 'page' })
    const dpi = entier(params.dpi ?? 300, { min: 72, max: 1200, nom: 'dpi' })
    const pre = argsPretraitement(params.pretraitement) // '' si aucun prétraitement (défaut)
    const nom = nomPng(pdfWin + '|' + pre, page)  // pre inclus → image originale ≠ prétraitée (comparaison)
    // Étape optionnelle : rasterisation → (prétraitement ImageMagick) → "$D/img.png" servi + océrisé.
    const prep = pre ? `convert "$D/pg.png" ${pre} "$D/img.png"` : `cp "$D/pg.png" "$D/img.png"`
    const provPre = params.pretraitement && pre ? params.pretraitement : null

    // Imprimé ANCIEN (s long ſ, ligatures) → Kraken + CATMuS-Print ; sinon Tesseract (moderne, rapide).
    if (params.moteur === 'kraken-print') {
      const script = dansTmp(
        `pdftoppm -f ${page} -l ${page} -r ${dpi} -png -singlefile "$PDF" "$D/pg" && ${prep} && ` +
        `cp "$D/img.png" "$SERVED/${nom}" && ` +
        `${krakenAvecRepli('"$D/img.png"', '"$D/o.xml"', MODELE_CATMUS_PRINT)} && cat "$D/o.xml"`)
      const r = await runBash(script, { PDF: pdfWin, SERVED: servedDirWin })
      if (r.annule) throw new Error('OCR annulé')
      if (!r.ok) throw new Error(`OCR imprimé ancien (page ${page}) : ${r.stderr.slice(0, 400)}`)
      return { alto: r.stdout, pngWin: join(servedDirWin, nom), ocr: { moteur: 'kraken-catmus-print', modele: 'catmus-print-fondue-large', dpi, page, pretraitement: provPre } }
    }

    const lang = params.lang ?? 'fra'
    if (!LANGUES_OCR.has(lang)) throw new Error(`langue OCR non autorisée : ${JSON.stringify(lang)}`)
    const script = dansTmp(
      `pdftoppm -f ${page} -l ${page} -r ${dpi} -png -singlefile "$PDF" "$D/pg" && ${prep} && ` +
      `cp "$D/img.png" "$SERVED/${nom}" && ` +
      `tesseract "$D/img.png" "$D/o" -l ${lang} alto && cat "$D/o.xml"`)
    const r = await runBash(script, { PDF: pdfWin, SERVED: servedDirWin })
    if (r.annule) throw new Error('OCR annulé')
    if (!r.ok) throw new Error(`OCR imprimé (page ${page}) : ${r.stderr.slice(0, 400)}`)
    return { alto: r.stdout, pngWin: join(servedDirWin, nom), ocr: { moteur: 'tesseract', langue: lang, dpi, page, pretraitement: provPre } }
  }

  // Manuscrit : Kraken sur l'image (segmentation baseline obligatoire, sinon « not bi-level »).
  const { imageWin, modele = MODELE_CATMUS } = params
  if (!MODELE_OK.test(modele)) throw new Error(`modèle Kraken invalide : ${JSON.stringify(modele)}`)
  const script = dansTmp(
    `cp "$IMG" "$D/in.png" && ` +
    `${krakenAvecRepli('"$D/in.png"', '"$D/o.xml"', modele)} && cat "$D/o.xml"`)
  const r = await runBash(script, { IMG: imageWin })
  if (r.annule) throw new Error('HTR annulé')
  if (!r.ok) throw new Error(`HTR manuscrit : ${r.stderr.slice(0, 400)}`)
  return { alto: r.stdout, pngWin: imageWin, ocr: { moteur: 'kraken', modele } }
}

/**
 * APERÇU : rend UNE page de PDF en PNG servi, SANS OCR (pour l'affichage immédiat au dépôt et à la
 * navigation). Le manuscrit est déjà une image → on la sert telle quelle. Léger (150 DPI par défaut).
 */
export async function rendrePage(params) {
  const { kind, servedDirWin } = params
  if (kind !== 'imprime') return { pngWin: params.imageWin } // manuscrit : l'image est déjà là
  const { pdfWin } = params
  const page = entier(params.page, { min: 1, max: 100000, nom: 'page' })
  // Aperçu = affichage seulement (jamais océrisé) → basse résolution pour un rendu RAPIDE. L'OCR, lui,
  // reste à 300 DPI. 100 DPI suffit largement pour naviguer et identifier une page de titre.
  const dpi = entier(params.dpi ?? 100, { min: 60, max: 400, nom: 'dpi' })
  const nom = nomPng(pdfWin + '|apercu', page)
  const script = dansTmp(
    `pdftoppm -f ${page} -l ${page} -r ${dpi} -png -singlefile "$PDF" "$D/pg" && cp "$D/pg.png" "$SERVED/${nom}"`)
  const r = await runBash(script, { PDF: pdfWin, SERVED: servedDirWin }, { timeoutMs: 60000 })
  if (r.annule) throw new Error('aperçu annulé')
  if (!r.ok) throw new Error(`aperçu page ${page} : ${r.stderr.slice(0, 300)}`)
  return { pngWin: join(servedDirWin, nom) }
}

/**
 * TRI DE STRUCTURE : rend TOUTES les pages en vignettes basse résolution, montées en PLANCHES
 * numérotées (contact sheets). Une seule rasterisation pdftoppm pour tout le document, puis un montage
 * par lot. Chaque vignette porte son numéro de page (label) pour que l'IA classe sans se tromper de
 * cellule. Renvoie [{pages:[...], pngWin}]. Léger (40 DPI) : sert à classer, jamais à océriser.
 */
export async function rendrePlanches(params) {
  const { pdfWin, servedDirWin } = params
  const total = entier(params.total, { min: 1, max: 100000, nom: 'total' })
  const lot = entier(params.parLot ?? 12, { min: 1, max: 40, nom: 'parLot' })
  const cols = entier(params.colonnes ?? 4, { min: 1, max: 8, nom: 'colonnes' })
  const dpi = entier(params.dpi ?? 40, { min: 25, max: 150, nom: 'dpi' })
  const emp = createHash('sha1').update(pdfWin + '|planches').digest('hex').slice(0, 10)
  const planches = []
  // pdftoppm pade le n° de page de façon peu prévisible → on renomme en p<page>.png (sans zéros) pour
  // que la montage retrouve chaque vignette par un nom simple (10# force la base 10, évite l'octal).
  const renomme = 'for f in "$D"/v-*.png; do b=$(basename "$f" .png); n=$((10#${b#v-})); mv "$f" "$D/p$n.png"; done'
  let cmds = `pdftoppm -r ${dpi} -png "$PDF" "$D/v" && ${renomme} && `
  for (let start = 1; start <= total; start += lot) {
    const end = Math.min(start + lot - 1, total)
    const pages = []; let args = ''
    for (let p = start; p <= end; p++) { args += ` -label ${p} "$D/p${p}.png"`; pages.push(p) }
    const nom = `planche-${emp}-${start}.png`
    cmds += `montage${args} -tile ${cols}x -geometry 190x250+4+4 -background white -fill black -pointsize 20 "$SERVED/${nom}" && `
    planches.push({ pages, nom })
  }
  const r = await runBash(dansTmp(cmds + 'true'), { PDF: pdfWin, SERVED: servedDirWin }, { timeoutMs: 300000 })
  if (r.annule) throw new Error('planches annulées')
  if (!r.ok) throw new Error('rendu des planches : ' + r.stderr.slice(0, 300))
  return planches.map((pl) => ({ ...pl, pngWin: join(servedDirWin, pl.nom) }))
}
