// Serveur local de La Gueule : sert l'interface (ui/) et expose une petite API pour
// l'orchestrateur. Sans dépendance (node:http). L'interface est identique à celle que
// Tauri emballera ; ici elle tourne dans une fenêtre via le navigateur en mode « app ».

import { createServer } from 'node:http'
import { createWriteStream } from 'node:fs'
import { readFile, mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, basename } from 'node:path'

import { executer } from './runner.mjs'
import { ocrPage, pdfNbPages, pdfInfo, choisirFichier, runBash, annulerTaches } from './wsl.mjs'
import { parserMetadonnees, typographieProbable } from './metadonnees.mjs'
import { parseAlto } from './alto.mjs'
import { sauvegarderProjet, chargerProjet, listerProjets, exporterSegments, exporterTout, exporterEntrainement, exporterPagesXml, grouperParagraphes, joindreLignes } from './projet.mjs'
import { detecterLangue, apparierParagraphes } from './bilingue.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..')
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'])
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
}
const IMG_SERVIES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'])
const EXT_DOC = new Set(['.pdf', ...IMG_EXT]) // documents téléversables (PDF + images)

/** Nom de fichier sûr, extension préservée même si le tronc est long. */
function nomFichierSur(nom) {
  const ext = extname(nom || '').toLowerCase()
  const base = (basename(nom || 'document', extname(nom || '')).replace(/[^\w.-]+/g, '_').slice(0, 80)) || 'document'
  return base + ext
}

function json(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

async function corps(req) {
  const morceaux = []
  for await (const c of req) morceaux.push(c)
  const t = Buffer.concat(morceaux).toString('utf8')
  return t ? JSON.parse(t) : {}
}

export async function diagnostic() {
  const out = { node: process.version, outils: {} }
  // WSL et Docker sont des outils Windows : on les sonde sur l'hôte.
  for (const [nom, cmd, argv] of [['wsl', 'wsl.exe', ['-l', '-q']], ['docker', 'docker', ['--version']]]) {
    const r = await executer(cmd, argv)
    out.outils[nom] = { present: r.ok, detail: (r.stdout || r.stderr || '').replace(/\0/g, '').split('\n')[0].trim().slice(0, 60) }
  }
  // Kraken et Tesseract vivent DANS WSL : on teste leur PRÉSENCE (`command -v`), en UN seul appel.
  // ⚠️ NE PAS lancer `kraken --version` : il importe PyTorch (~3,5 s) et faisait exploser /api/doctor
  // (mesuré à ~15 s → dépassait les timeouts). `command -v` est instantané. Délai de sûreté 8 s.
  const r = await runBash('for c in kraken tesseract; do printf "%s\\t%s\\n" "$c" "$(command -v "$c" 2>/dev/null)"; done', {}, { timeoutMs: 8000 })
  for (const nom of ['kraken', 'tesseract']) {
    const m = new RegExp('^' + nom + '\\t(.*)$', 'm').exec(r.stdout || '')
    const chemin = m ? m[1].trim() : ''
    out.outils[nom] = { present: !!chemin, detail: chemin || (r.timeout ? 'délai WSL dépassé' : 'introuvable dans WSL') }
  }
  return out
}

export function demarrer({ port = 4599 } = {}) {
  const serveur = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const p = url.pathname

      if (p === '/api/doctor') return json(res, 200, await diagnostic())

      // « Arrêter » : tue les OCR WSL en cours (l'appel await côté OCR rejette alors avec « annulé »).
      if (p === '/api/atelier/stop' && req.method === 'POST') {
        return json(res, 200, { arretes: annulerTaches() })
      }

      // Atelier de relecture — OCR d'UNE page (manuscrit → Kraken ; imprimé → PDF+Tesseract).
      if (p === '/api/atelier/ocr' && req.method === 'POST') {
        const b = await corps(req)
        const servedDirWin = join(RACINE, 'sorties', 'atelier')
        await mkdir(servedDirWin, { recursive: true })
        const { alto, pngWin, ocr } = await ocrPage({ ...b, servedDirWin })
        const page = parseAlto(alto)
        return json(res, 200, {
          pngUrl: '/api/fichier?path=' + encodeURIComponent(pngWin),
          largeur: page.largeur, hauteur: page.hauteur, lignes: page.lignes, ocr,
        })
      }

      // Comparaison A/B : océrise la MÊME page sans puis avec prétraitement, renvoie les deux
      // (texte + confiance moyenne + image) pour juger si le prétraitement améliore vraiment.
      if (p === '/api/atelier/comparer' && req.method === 'POST') {
        const b = await corps(req)
        const servedDirWin = join(RACINE, 'sorties', 'atelier')
        await mkdir(servedDirWin, { recursive: true })
        const commun = { kind: 'imprime', pdfWin: b.pdfWin, page: b.page, dpi: b.dpi || 300, lang: b.lang || 'fra', moteur: b.moteur, servedDirWin }
        const resume = (r) => {
          const pg = parseAlto(r.alto); const wc = pg.lignes.filter((l) => l.confiance != null)
          return {
            nbLignes: pg.lignes.length,
            confMoy: wc.length ? Math.round((wc.reduce((s, l) => s + l.confiance, 0) / wc.length) * 1000) / 1000 : null,
            texte: pg.lignes.map((l) => l.texte).join('\n'),
            pngUrl: '/api/fichier?path=' + encodeURIComponent(r.pngWin),
          }
        }
        const original = resume(await ocrPage({ ...commun }))                                   // sans prétraitement
        const pretraite = resume(await ocrPage({ ...commun, pretraitement: b.pretraitement }))  // avec
        return json(res, 200, { original, pretraite, args: b.pretraitement })
      }

      // Bilingue « pages en regard » : OCR de la page française (fra) et de la page latine
      // en vis-à-vis (lat), regroupement en paragraphes, appariement → colonnes alignées.
      if (p === '/api/atelier/ocr-bilingue' && req.method === 'POST') {
        const b = await corps(req)
        const servedDirWin = join(RACINE, 'sorties', 'atelier')
        await mkdir(servedDirWin, { recursive: true })
        const dpi = b.dpi || 300
        const page = Number(b.page)             // coercition explicite : évite « "5" + -1 » = "5-1"
        const offset = Number(b.offset ?? -1)   // page latine = page française + offset (en regard : -1 par défaut)
        const fr = await ocrPage({ kind: 'imprime', pdfWin: b.pdfWin, page, dpi, lang: 'fra', servedDirWin })
        const la = await ocrPage({ kind: 'imprime', pdfWin: b.pdfWin, page: page + offset, dpi, lang: 'lat', servedDirWin })
        const pageFr = parseAlto(fr.alto)
        const pageLa = parseAlto(la.alto)
        const parasFr = grouperParagraphes(pageFr.lignes).map((g) => joindreLignes(g, 'texte'))
        const parasLa = grouperParagraphes(pageLa.lignes).map((g) => joindreLignes(g, 'texte'))
        return json(res, 200, {
          pngUrl: '/api/fichier?path=' + encodeURIComponent(fr.pngWin),
          largeur: pageFr.largeur, hauteur: pageFr.hauteur, lignesFr: pageFr.lignes,
          langueFr: detecterLangue(parasFr.join(' ')), langueLa: detecterLangue(parasLa.join(' ')),
          paires: apparierParagraphes(parasLa, parasFr),
          ocr: { moteur: 'tesseract', bilingue: true, dpi, pageFr: page, pageLa: page + offset, langues: ['fra', 'lat'] },
        })
      }

      if (p === '/api/pdf-info') {
        const chemin = url.searchParams.get('path')
        if (!chemin) return json(res, 400, { erreur: 'préciser ?path=' })
        return json(res, 200, { pages: await pdfNbPages(chemin) })
      }

      // Explorateur de fichiers Windows (boîte « Ouvrir »). Bloque jusqu'au choix.
      // Peu fiable : exige une session interactive. L'UI privilégie /api/televerser.
      if (p === '/api/choisir-fichier') {
        return json(res, 200, { chemin: choisirFichier() })
      }

      // Téléversement : le NAVIGATEUR fournit le fichier (sélecteur natif ou glisser-déposer),
      // on l'enregistre dans incoming/ et on renvoie son chemin. Fiable (session du navigateur),
      // non bloquant (flux vers le disque), et conforme à « copier avant traitement » (charte §2.3).
      if (p === '/api/televerser' && req.method === 'POST') {
        const nom = nomFichierSur(url.searchParams.get('nom') || 'document')
        const ext = extname(nom).toLowerCase()
        if (!EXT_DOC.has(ext)) return json(res, 400, { erreur: `type non accepté : ${ext || '(sans extension)'}` })
        const dir = join(RACINE, 'incoming')
        await mkdir(dir, { recursive: true })
        const dest = join(dir, nom)
        await pipeline(req, createWriteStream(dest))
        return json(res, 200, { chemin: dest, nom })
      }

      // Métadonnées : pdfinfo + OCR de la page de titre → titre, date d'édition, auteur…
      if (p === '/api/metadonnees' && req.method === 'POST') {
        const b = await corps(req)
        const info = await pdfInfo(b.path)
        // La page de titre n'est pas toujours en 3/5 (couverture, faux-titre, planches…) :
        // on balaie les 7 premières pages utiles pour la capter. Les pages hors bornes sont ignorées.
        const pagesTitre = Array.isArray(b.pagesTitre) && b.pagesTitre.length ? b.pagesTitre : [1, 2, 3, 5, 7]
        const servedDirWin = join(RACINE, 'sorties', 'atelier')
        await mkdir(servedDirWin, { recursive: true })
        let texteTitre = ''
        for (const pg of pagesTitre) {
          try {
            const r = await ocrPage({ kind: 'imprime', pdfWin: b.path, page: pg, dpi: 200, lang: 'fra', servedDirWin })
            texteTitre += '\n' + parseAlto(r.alto).lignes.map((l) => l.texte).join('\n')
          } catch { /* page hors bornes : ignorée */ }
        }
        const meta = parserMetadonnees({
          pdfTitle: info.title, pdfAuthor: info.author, producer: info.producer, creationDate: info.creationDate,
          texteTitre, nomFichier: basename(b.path || ''),
        })
        // Choix du moteur OCR le mieux adapté à CE livre : le signal du s long est dans le CORPS
        // (minuscules), pas sur la page de titre (capitales). On sonde une page de corps à bas DPI.
        let texteCorps = ''
        const nbP = info.pages || 0
        const pageCorps = nbP > 12 ? Math.round(nbP * 0.4) : Math.min(nbP || 10, 10)
        try {
          const rc = await ocrPage({ kind: 'imprime', pdfWin: b.path, page: pageCorps, dpi: 150, lang: 'fra', servedDirWin })
          texteCorps = parseAlto(rc.alto).lignes.map((l) => l.texte).join('\n')
        } catch { /* page hors bornes : ignorée */ }
        const typographie = typographieProbable({ texteTitre, texteCorps, date_publication: meta.date_publication })
        return json(res, 200, { meta, pdf: info, brut: texteTitre.slice(0, 1500), typographie })
      }

      // Sert une image locale par chemin absolu (outil local, écoute 127.0.0.1 seulement).
      if (p === '/api/fichier') {
        const chemin = url.searchParams.get('path')
        if (!chemin) return json(res, 400, { erreur: 'préciser ?path=' })
        if (!IMG_SERVIES.has(extname(chemin).toLowerCase())) return json(res, 403, { erreur: 'type non servi' })
        const data = await readFile(chemin)
        res.writeHead(200, { 'content-type': MIME[extname(chemin).toLowerCase()] || 'application/octet-stream' })
        res.end(data)
        return
      }

      // Persistance de la relecture + export au format segments (candidat).
      if (p === '/api/projet/save' && req.method === 'POST') {
        const b = await corps(req)
        const chemin = await sauvegarderProjet(b.nom, b.projet || {})
        return json(res, 200, { ok: true, chemin })
      }
      if (p === '/api/projet/load') {
        const nom = url.searchParams.get('nom')
        if (!nom) return json(res, 400, { erreur: 'préciser ?nom=' })
        try { return json(res, 200, { projet: await chargerProjet(nom) }) }
        catch { return json(res, 404, { erreur: 'projet introuvable' }) }
      }
      if (p === '/api/projet/list') {
        return json(res, 200, { projets: await listerProjets() })
      }
      if (p === '/api/export/segments' && req.method === 'POST') {
        const b = await corps(req)
        const r = await exporterSegments(b.nom, b.projet || {}, { id_oeuvre: b.id_oeuvre || null, couche: b.couche || 'dip', recenserNotes: b.recenserNotes !== false })
        return json(res, 200, r)
      }
      // Export TRIPLE : JSON candidat + DOCX propre + SQL prêt pour Supabase.
      if (p === '/api/export' && req.method === 'POST') {
        const b = await corps(req)
        const r = await exporterTout(b.nom, b.projet || {}, { id_oeuvre: b.id_oeuvre || null, couche: b.couche || 'dip', recenserNotes: b.recenserNotes !== false })
        return json(res, 200, r)
      }
      // Export des CORRECTIONS des pages validées en jeu d'entraînement Kraken (ALTO + images + JSONL).
      if (p === '/api/export/entrainement' && req.method === 'POST') {
        const b = await corps(req)
        return json(res, 200, await exporterEntrainement(b.nom, b.projet || {}))
      }
      // Export d'échange ALTO v4 + PAGE XML (une paire par page océrisée, avec l'image).
      if (p === '/api/export/xml' && req.method === 'POST') {
        const b = await corps(req)
        return json(res, 200, await exporterPagesXml(b.nom, b.projet || {}, { couche: b.couche || 'dip' }))
      }

      // Statique : l'interface.
      const rel = p === '/' ? '/index.html' : p
      const fichier = join(ICI, '..', 'ui', rel.replace(/^\/+/, ''))
      if (!fichier.startsWith(join(ICI, '..', 'ui'))) return json(res, 403, { erreur: 'interdit' })
      const data = await readFile(fichier)
      res.writeHead(200, { 'content-type': MIME[extname(fichier)] || 'application/octet-stream' })
      res.end(data)
    } catch (e) {
      if (e?.code === 'ENOENT') return json(res, 404, { erreur: 'introuvable' })
      json(res, 500, { erreur: String(e?.message ?? e) })
    }
  })
  return new Promise((resolve, reject) => {
    // Double-lancement (raccourci cliqué deux fois) : le port est déjà pris par une
    // instance en cours. On ne plante pas : on signale « déjà en écoute » et on laisse
    // l'appelant ouvrir la fenêtre sur l'instance existante.
    serveur.once('error', (e) => {
      if (e.code === 'EADDRINUSE') resolve({ serveur: null, port, url: `http://127.0.0.1:${port}/`, dejaEnEcoute: true })
      else reject(e)
    })
    serveur.listen(port, '127.0.0.1', () => {
      // Réveille la distro WSL en avance (le 1er appel ne paie pas le démarrage à froid) ET
      // balaie les dossiers temporaires laissés par un OCR tué/planté (au cas où le trap a manqué).
      runBash('rm -rf /tmp/lg.* 2>/dev/null; true', {}, { timeoutMs: 20000 })
      resolve({ serveur, port, url: `http://127.0.0.1:${port}/`, dejaEnEcoute: false })
    })
  })
}
