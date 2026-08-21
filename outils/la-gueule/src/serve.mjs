// Serveur local de La Gueule : sert l'interface (ui/) et expose une petite API pour
// l'orchestrateur. Sans dépendance (node:http). L'interface est identique à celle que
// Tauri emballera ; ici elle tourne dans une fenêtre via le navigateur en mode « app ».

import { createServer } from 'node:http'
import { createWriteStream } from 'node:fs'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, basename, resolve, sep } from 'node:path'

import { executer } from './runner.mjs'
import { ocrPage, rendrePage, pdfNbPages, pdfInfo, choisirFichier, runBash, annulerTaches } from './wsl.mjs'
import { parserMetadonnees, typographieProbable, normaliserCasseChamp } from './metadonnees.mjs'
import { parseAlto } from './alto.mjs'
import { sauvegarderProjet, chargerProjet, listerProjets, exporterSegments, exporterTout, exporterComparaison, exporterRapportTriage, exporterEntrainement, exporterPagesXml, exporterBanc, grouperParagraphes, joindreLignes, sauverProfil, sauverRapportGeneration } from './projet.mjs'
import { controlerDeterministe, controlerPageIA, ancrerNotesIA } from './ia/controle.mjs'
import { choisirFournisseur, appelerIA, cleCache } from './ia/fournisseur.mjs'
import { creerCacheIA, empreinteImage, viderCacheIA } from './ia/cache.mjs'
import { classerValidation } from './ia/validation.mjs'
import { rapportGeneration, etatLivraison } from './ia/generation.mjs'
import { etatFournisseur, lireConsentement, ecrireConsentement, consentementActif } from './ia/consentement.mjs'
import { cheminPngDepuisUrl, pdfPageBase64, imageFichierBase64, cropBase64, cropFichier } from './ia/crop.mjs'
import { messagesMetadonnees, consigneRelecturePage, messagesRelecturePage, consigneAncrageNotes, messagesAncrageNotes, VERSION_PROMPT_RELECTURE, consigneVerificationPage, messagesVerificationPage, consigneArbitrageCrop, messagesArbitrageCrop, consigneLectureCrop, messagesLectureCrop, VERSION_PROMPT_VERIF } from './ia/prompt.mjs'
import { trierInterventions, candidatsDepuisLignesFaibles, retirerFlagsConfirmes, verdictDepuisReponse } from './ia/verificateur.mjs'
import { mesurerTriage } from './ia/triage.mjs'
import { enrichirDepuisBase } from './ia/enrichissement.mjs'
import { detecterLangue, apparierParagraphes } from './bilingue.mjs'
import { annoterProjet } from './structure.mjs'
import { situerLignes } from './zones.mjs' // position MESURÉE de chaque ligne, transmise au modèle

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..')
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp'])
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
}
const IMG_SERVIES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'])
const EXT_DOC = new Set(['.pdf', ...IMG_EXT]) // documents téléversables (PDF + images)

/** Nom de fichier sûr, extension préservée même si le tronc est long. `basename` retire tout
 *  chemin (pas de « ../ »), on n'autorise que [\w.-], et on ôte les points de tête (pas de nom caché). */
function nomFichierSur(nom) {
  const ext = extname(nom || '').toLowerCase()
  const base = (basename(nom || 'document', extname(nom || '')).replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(0, 80)) || 'document'
  return base + ext
}

// Sécurité (outil LOCAL) : on ne sert et on ne lit QUE sous le dossier de travail (RACINE).
// Empêche la traversée de chemin (../, chemin absolu arbitraire) et impose « copier avant
// traitement » (charte §2.3). Compare des chemins absolus normalisés.
const RACINE_ABS = resolve(RACINE)
function sousRacine(p) {
  if (!p) return false
  const abs = resolve(String(p))
  return abs === RACINE_ABS || abs.startsWith(RACINE_ABS + sep)
}

// Anti DNS-rebinding / cross-origin : le serveur n'écoute que 127.0.0.1, mais une page web
// distante pourrait viser http://127.0.0.1:port. On exige un Host local et, si présent, un
// Origin local. Toute autre valeur est refusée.
const HOTES_OK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])
function hoteLocal(req) {
  const host = (req.headers.host || '').replace(/:\d+$/, '').toLowerCase()
  if (host && !HOTES_OK.has(host)) return false
  const origin = req.headers.origin
  if (origin && origin !== 'null') {
    try { if (!HOTES_OK.has(new URL(origin).hostname.toLowerCase())) return false } catch { return false }
  }
  return true
}

const MAX_TELEVERSEMENT = 400 * 1024 * 1024 // plafond d'upload : 400 Mo (gros scans tolérés)

// Cache des réponses IA (~80 s par page relue). Sur DISQUE : le serveur est relancé souvent, un
// cache en mémoire serait perdu à chaque fois. `LG_AI_CACHE=0` le désactive.
export const DIR_CACHE_IA = join(RACINE, 'controles', 'cache-ia')
// Crops découpés pour l'arbitrage visuel. Nécessaires au fournisseur LOCAL, qui lit une image par
// son chemin. Noms déterministes (page, ligne, boîte) : deux passes réutilisent le même fichier.
export const DIR_CROPS = join(RACINE, 'controles', 'crops')
// Sous ce seuil, la reconnaissance se dit elle-même peu sûre. Même valeur que la passe déterministe
// (`controlerDeterministe`) : les deux parlent des mêmes lignes.
const SEUIL_CONFIANCE_OCR = 0.8
const cacheIA = creerCacheIA({ dir: DIR_CACHE_IA, actif: process.env.LG_AI_CACHE !== '0' })

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
  // Distingue « WSL en panne » de « outil réellement manquant » : une sonde qui ÉCHOUE ou TIMEOUTE
  // (vs. une commande qui s'exécute mais ne trouve pas l'outil) signale que WSL ne répond pas — souvent
  // après une veille ou une pression mémoire. Kraken/Tesseract sont installés ; ce n'est pas un vrai manque.
  if (r.timeout || !r.ok) {
    out.wsl_incident = 'WSL ne répond pas (souvent après une mise en veille ou une pression mémoire). '
      + 'Dans PowerShell : « wsl --shutdown », puis recharge la page. Les outils sont installés — ce n’est pas un vrai manque.'
  }
  return out
}

export function demarrer({ port = 4599 } = {}) {
  const serveur = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      const p = url.pathname

      // Garde-fou réseau : refuse tout Host/Origin non local (anti DNS-rebinding, anti cross-site).
      if (!hoteLocal(req)) return json(res, 403, { erreur: 'hôte non autorisé' })

      if (p === '/api/doctor') return json(res, 200, await diagnostic())

      // « Arrêter » : tue les OCR WSL en cours (l'appel await côté OCR rejette alors avec « annulé »).
      if (p === '/api/atelier/stop' && req.method === 'POST') {
        return json(res, 200, { arretes: annulerTaches() })
      }

      // Atelier de relecture — OCR d'UNE page (manuscrit → Kraken ; imprimé → PDF+Tesseract).
      if (p === '/api/atelier/ocr' && req.method === 'POST') {
        const b = await corps(req)
        const entrant = b.pdfWin || b.imageWin
        if (entrant && !sousRacine(entrant)) return json(res, 403, { erreur: 'fichier hors du dossier de travail (copier dans incoming/ d’abord, §2.3)' })
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
        if (b.pdfWin && !sousRacine(b.pdfWin)) return json(res, 403, { erreur: 'fichier hors du dossier de travail (§2.3)' })
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
        if (b.pdfWin && !sousRacine(b.pdfWin)) return json(res, 403, { erreur: 'fichier hors du dossier de travail (§2.3)' })
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
        if (!sousRacine(chemin)) return json(res, 403, { erreur: 'hors du dossier de travail' })
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
        // Plafond de taille : refus précoce sur Content-Length, ET coupe-circuit en cours de flux.
        if (Number(req.headers['content-length'] || 0) > MAX_TELEVERSEMENT) return json(res, 413, { erreur: 'fichier trop volumineux (max 400 Mo)' })
        const dir = join(RACINE, 'incoming')
        await mkdir(dir, { recursive: true })
        const dest = join(dir, nom)
        let recu = 0, trop = false
        req.on('data', (c) => { recu += c.length; if (recu > MAX_TELEVERSEMENT && !trop) { trop = true; req.destroy(new Error('upload trop volumineux')) } })
        try { await pipeline(req, createWriteStream(dest)) }
        catch (e) { if (trop) return json(res, 413, { erreur: 'fichier trop volumineux (max 400 Mo)' }); throw e }
        return json(res, 200, { chemin: dest, nom })
      }

      // APERÇU : rend une page en image SANS OCR (affichage immédiat au dépôt / à la navigation).
      if (p === '/api/apercu' && req.method === 'POST') {
        const b = await corps(req)
        if (b.path && !sousRacine(b.path)) return json(res, 403, { erreur: 'hors du dossier de travail (§2.3)' })
        const kind = b.kind === 'manuscrit' ? 'manuscrit' : 'imprime'
        const servedDirWin = join(RACINE, 'sorties', 'atelier')
        await mkdir(servedDirWin, { recursive: true })
        try {
          const r = kind === 'manuscrit' ? { pngWin: b.path } : await rendrePage({ kind, pdfWin: b.path, page: Number(b.page) || 1, servedDirWin })
          return json(res, 200, { pngUrl: '/api/fichier?path=' + encodeURIComponent(r.pngWin) })
        } catch (e) { return json(res, 500, { erreur: String(e?.message || e) }) }
      }

      // (Le « Tri des pages par IA » a été retiré du parcours — trop lent et redondant avec la détection
      //  déterministe des pages inutiles après OCR. Endpoints /api/ia/planches et /api/ia/triage-planche
      //  supprimés le 2026-08-10.)

      // Métadonnées : pdfinfo + OCR de la page de titre → titre, date d'édition, auteur…
      if (p === '/api/metadonnees' && req.method === 'POST') {
        const b = await corps(req)
        if (b.path && !sousRacine(b.path)) return json(res, 403, { erreur: 'hors du dossier de travail (copier dans incoming/ d’abord, §2.3)' })
        const info = await pdfInfo(b.path)
        // La page de titre n'est pas toujours en 3/5 (couverture, faux-titre, planches…) :
        // on balaie les 7 premières pages utiles pour la capter. Les pages hors bornes sont ignorées.
        // Analyse LÉGÈRE au dépôt (`rapide`) : peu de pages de titre + arrêt dès qu'un titre est capté.
        // Balayage complet [1,2,3,5,7] réservé au bouton « Extraire » (b.pagesTitre absent, rapide=false).
        const rapide = !!b.rapide
        const pagesTitre = Array.isArray(b.pagesTitre) && b.pagesTitre.length ? b.pagesTitre : (rapide ? [1, 3] : [1, 2, 3, 5, 7])
        const servedDirWin = join(RACINE, 'sorties', 'atelier')
        await mkdir(servedDirWin, { recursive: true })
        const infosTitre = { pdfTitle: info.title, pdfAuthor: info.author, producer: info.producer, creationDate: info.creationDate, nomFichier: basename(b.path || '') }
        let texteTitre = '', meta = parserMetadonnees({ ...infosTitre, texteTitre })
        for (const pg of pagesTitre) {
          try {
            const r = await ocrPage({ kind: 'imprime', pdfWin: b.path, page: pg, dpi: 200, lang: 'fra', servedDirWin })
            texteTitre += '\n' + parseAlto(r.alto).lignes.map((l) => l.texte).join('\n')
          } catch { /* page hors bornes : ignorée */ }
          meta = parserMetadonnees({ ...infosTitre, texteTitre })
          if (String(meta.titre || '').trim().length >= 6) break // titre capté → on arrête le balayage
        }
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

      // Diagnostic IA — MÉTADONNÉES de la page de titre par vision (§8.1). Complète les champs que le
      // parseur déterministe rate (éditeur, ville, genre, sous-titre, titre original). Appel cloud
      // FACTURÉ : ne part que si fournisseur cloud ET consentement actif (vérifié côté serveur). Sortie
      // = CANDIDAT (jamais d'écriture active) ; l'utilisateur relit. La clé n'apparaît jamais.
      if (p === '/api/ia/metadonnees' && req.method === 'POST') {
        const b = await corps(req)
        if (b.path && !sousRacine(b.path)) return json(res, 403, { erreur: 'hors du dossier de travail (copier dans incoming/ d’abord, §2.3)' })
        const fournisseur = choisirFournisseur(process.env)
        const etat = etatFournisseur(process.env)
        const consentement = consentementActif(await lireConsentement(), etat.nom)
        if (!fournisseur.cloud || !consentement) {
          return json(res, 200, { ia_active: false, meta_ia: {}, motif: !fournisseur.cloud ? 'fournisseur local (mock) : pas d’envoi cloud' : 'consentement requis' })
        }
        if (!fournisseur.dispo) return json(res, 200, { ia_active: false, meta_ia: {}, motif: 'fournisseur indisponible (clé ou CLI absent)' })
        const page = Math.max(1, Number(b.page) || 3)
        const estImg = IMG_EXT.has(extname(b.path || '').toLowerCase())
        let sortie
        if (fournisseur.local) {
          // CLI local : il lit l'image par son CHEMIN → on rend la page de titre dans un fichier servi.
          const dir = join(RACINE, 'sorties', 'atelier')
          await mkdir(dir, { recursive: true })
          const dest = join(dir, 'titre-ia-' + Date.now() + '.png')
          const b64 = estImg ? await imageFichierBase64(b.path) : await pdfPageBase64(b.path, page)
          if (!b64) return json(res, 200, { ia_active: true, meta_ia: {}, erreur: 'image de la page de titre indisponible (rendu échoué)' })
          await writeFile(dest, Buffer.from(b64, 'base64'))
          sortie = await appelerIA(fournisseur, 'diagnostic', { image_path: dest, texte_ocr: b.texteTitre || '', cwd: dir }, { consentement })
        } else {
          // API : image en base64 dans le message.
          const image_base64 = estImg ? await imageFichierBase64(b.path) : await pdfPageBase64(b.path, page)
          if (!image_base64) return json(res, 200, { ia_active: true, meta_ia: {}, erreur: 'image de la page de titre indisponible (rendu échoué)' })
          const charge = messagesMetadonnees({ image_base64, texte_ocr: b.texteTitre || '' })
          sortie = await appelerIA(fournisseur, 'diagnostic', charge, { consentement })
        }
        // Ne conserve QUE les champs métadonnées connus, non vides ; jamais la clé, jamais d'écriture active.
        // Casse charte (filet de sécurité, même si le modèle dérape) : titres → casse de phrase + sans
        // point final ; noms/lieux → casse nominale ; le reste inchangé. Ne s'active que sur du tout-capitales.
        const TYPE_CASSE = { titre: 'titre', sous_titre: 'titre', titre_original: 'titre', auteur: 'nom', trad_auteur: 'nom', editeur: 'nom', collection: 'nom', ville: 'nom' }
        const CH = ['titre', 'sous_titre', 'titre_original', 'auteur', 'trad_auteur', 'editeur', 'collection', 'ville', 'date_publication', 'date_composition', 'genre', 'langue_originale', 'langue_trad']
        const meta_ia = {}
        if (!sortie.abstention) for (const c of CH) { const v = sortie[c]; if (v != null && String(v).trim()) meta_ia[c] = normaliserCasseChamp(String(v).trim(), TYPE_CASSE[c] || null) }
        // Enrichissement DEPUIS LA BASE (lecture seule) : nom canonique + id_auteur (auteurs), et
        // titre_original si l'œuvre est déjà cataloguée (oeuvres). « Sinon vide » — jamais inventé.
        let enrichissement = {}
        if (!sortie.abstention) { try { enrichissement = await enrichirDepuisBase({ auteur: meta_ia.auteur, titre: meta_ia.titre }) } catch { enrichissement = {} } }
        // 3e niveau (hiérarchie page > base > CONNAISSANCE du modèle) : comble ce que page + base ne donnent pas.
        const connaissance = {}
        const cn = sortie.connaissance || {}
        if (!sortie.abstention) for (const c of ['titre_original', 'langue_originale', 'date_composition', 'auteur_complet', 'genre']) { const v = cn[c]; if (v != null && String(v).trim()) connaissance[c] = String(v).trim() }
        return json(res, 200, { ia_active: true, meta_ia, enrichissement, connaissance, abstention: !!sortie.abstention, confiance: sortie.confiance ?? null, modele: sortie.modele || null, fournisseur: etat.nom, erreur: sortie.erreur || null })
      }

      // Phase B — écrit le profil de traitement du diagnostic (profils-traitement/<nom>-profil-v1.json).
      if (p === '/api/ia/profil/save' && req.method === 'POST') {
        const b = await corps(req)
        const chemin = await sauverProfil(b.nom || 'projet', b.profil || {})
        return json(res, 200, { ok: true, chemin })
      }

      // Phase D — contrôle : passe DÉTERMINISTE (toujours, sans réseau) + RELECTURE IA par PAGE (§8.3-A).
      // La relecture ne concerne QUE les pages déjà océrisées (celles de projet.pages). Le cloud ne part
      // JAMAIS sans consentement actif, vérifié CÔTÉ SERVEUR. Sortie = candidats, jamais de validation.
      if (p === '/api/ia/controle' && req.method === 'POST') {
        const b = await corps(req)
        // La passe DÉTERMINISTE porte sur tout le projet : quand l'atelier relit page par page (pour
        // afficher l'avancement), il ne la demande qu'au premier appel — sinon ses signalements
        // seraient répétés à chaque page.
        const det = b.deterministe === false
          ? { findings: [], compteurs: {} }
          : controlerDeterministe(b.projet || {})
        let findings = det.findings
        const compteurs = det.compteurs
        const fournisseur = choisirFournisseur(process.env)
        const consentement = consentementActif(await lireConsentement(), etatFournisseur(process.env).nom)
        let interventions = [], metaIA = { pages_relues: 0, erreur: null }
        // Résultats du triage automatique (vides tant que l'IA n'est pas active : sans image relue,
        // aucune décision automatique n'est possible, et c'est bien ainsi).
        let decisionsTriage = [], lignesConfirmees = [], lignesDouteuses = []
        if (fournisseur.cloud && consentement) {
          // Une relecture par page : le CLI local lit l'IMAGE de la page par son CHEMIN ; l'API reçoit
          // l'image entière en base64 (messages). La consigne porte l'OCR ligne par ligne à comparer.
          const preparerCharge = async (n, lignes) => {
            const pngWin = cheminPngDepuisUrl(b.projet?.pages?.[n]?.pngUrl)
            if (!pngWin) return null
            // On JOINT la position mesurée de chaque ligne : le modèle voit la page, mais sans ces
            // repères il ne peut pas relier une glose aperçue dans la marge à un numéro de ligne.
            const situations = situerLignes(lignes)
            const items = lignes.map((l, i) => {
              const s = situations.get(i)
              return { i, t: String(l.dip ?? l.texte ?? ''), ...(s ? { z: s.zone, c: s.corps } : {}) }
            })
            // Le RÉGIME de graphie dépend de la nature du document : imprimé → modernisation
            // glyphique (§14.3) ; manuscrit → transcription diplomatique (§14.4).
            const kind = b.projet?.kind === 'manuscrit' ? 'manuscrit' : 'imprime'
            if (fournisseur.local) return { image_path: pngWin, consigne: consigneRelecturePage(items, { kind }), cwd: dirname(pngWin) }
            const b64 = await imageFichierBase64(pngWin)
            return b64 ? messagesRelecturePage({ image_base64: b64, lignes: items, kind }) : null
          }
          // Clé de cache : tout ce qui, s'il change, doit invalider la réponse — l'IMAGE (empreinte),
          // le PROMPT (qui contient l'OCR des lignes, donc les corrections déjà appliquées), la
          // version du prompt et le MODÈLE. Une page déjà relue à l'identique n'est pas repayée.
          const cleDe = async (n, charge) => {
            const pngWin = cheminPngDepuisUrl(b.projet?.pages?.[n]?.pngUrl)
            const sha = pngWin ? empreinteImage(pngWin) : null
            if (!sha) return null // sans empreinte d'image, on ne risque pas un faux positif de cache
            const prompt = charge?.consigne || JSON.stringify(charge?.messages || '')
            return cleCache({
              tache: 'page', sha256_image: sha, prompt,
              version_prompt: VERSION_PROMPT_RELECTURE,
              modele: fournisseur.modele?.controle || fournisseur.modele?.vision || '',
            })
          }
          const r = await controlerPageIA(b.projet || {}, { fournisseur, consentement, preparerCharge, pages: Array.isArray(b.pages) ? b.pages : null, cache: cacheIA, cleDe })
          interventions = r.interventions; metaIA = r.meta
          // Passe SÉMANTIQUE des notes (§13) : rattache chaque note au passage qu'elle annote.
          // N'appelle le modèle que pour les notes SANS appel imprimé (les autres sont appariées
          // mécaniquement) et seulement sur les pages qui portent des notes.
          const chargeNotes = async (n, corps, notes) => {
            const pngWin = cheminPngDepuisUrl(b.projet?.pages?.[n]?.pngUrl)
            if (!pngWin) return null
            if (fournisseur.local) return { image_path: pngWin, consigne: consigneAncrageNotes({ corps, notes }), cwd: dirname(pngWin) }
            const b64 = await imageFichierBase64(pngWin)
            return b64 ? messagesAncrageNotes({ image_base64: b64, corps, notes }) : null
          }
          const rn = await ancrerNotesIA(b.projet || {}, { fournisseur, consentement, preparerCharge: chargeNotes, pages: Array.isArray(b.pages) ? b.pages : null })
          interventions = [...interventions, ...rn.interventions]
          metaIA = { ...metaIA, notes: rn.meta }
          if (rn.meta.erreur && !metaIA.erreur) metaIA.erreur = rn.meta.erreur

          // ── TRIAGE AUTOMATIQUE ────────────────────────────────────────────────────────────
          // Une proposition n'est plus soumise à l'humain du seul fait qu'elle existe : elle est
          // d'abord CONFRONTÉE À L'IMAGE, une fois sur la page, une seconde fois sur le crop quand
          // le cas est à risque. L'humain n'arrive qu'en dernier, sur ce que l'image n'a pas tranché.
          const pagesLot = Array.isArray(b.pages) && b.pages.length
            ? b.pages.map(Number)
            : Object.keys(b.projet?.pages || {}).map(Number)
          const zones = new Map()
          for (const n of pagesLot) {
            const lg = b.projet?.pages?.[n]?.lignes
            if (Array.isArray(lg)) zones.set(n, situerLignes(lg))
          }
          const modeleVerif = fournisseur.modele?.vision || fournisseur.modele?.controle || ''

          // Passe 1 — l'image de la PAGE, toutes ses corrections d'un coup.
          const chargeVerifPage = async (n, items) => {
            const pngWin = cheminPngDepuisUrl(b.projet?.pages?.[n]?.pngUrl)
            if (!pngWin) return null
            if (fournisseur.local) return { image_path: pngWin, consigne: consigneVerificationPage(items), cwd: dirname(pngWin), items }
            const b64 = await imageFichierBase64(pngWin)
            return b64 ? { ...messagesVerificationPage({ image_base64: b64, items }), items } : null
          }
          // Passe 2 — le CROP de la ligne, avec son voisinage. Le fournisseur local lit un fichier,
          // l'API reçoit du base64 : deux découpes, une seule question.
          const chargeVerifCrop = async (iv, o) => {
            const pngWin = cheminPngDepuisUrl(b.projet?.pages?.[iv.page]?.pngUrl)
            const bbox = Array.isArray(iv.bbox) && iv.bbox.length >= 4
              ? iv.bbox
              : b.projet?.pages?.[iv.page]?.lignes?.[iv.ligne_ids?.[0]]?.bbox
            if (!pngWin || !Array.isArray(bbox)) return null
            const opts = { a: o.a, b: o.b, avant: o.avant, apres: o.apres, zone: o.zone, structurel: o.structurel }
            if (fournisseur.local) {
              const chemin = await cropFichier(pngWin, bbox, { marge: 0.6, dossier: DIR_CROPS, nom: `p${iv.page}-l${iv.ligne_ids?.[0]}-${bbox.join('_')}` })
              return chemin ? { image_path: chemin, consigne: consigneArbitrageCrop(opts), cwd: DIR_CROPS } : null
            }
            const b64 = await cropBase64(pngWin, bbox, { marge: 0.6 })
            return b64 ? messagesArbitrageCrop({ crop_base64: b64, ...opts }) : null
          }
          const cleVerif = (tache) => async (ref, charge) => {
            const page = typeof ref === 'object' ? ref.page : ref
            const pngWin = cheminPngDepuisUrl(b.projet?.pages?.[page]?.pngUrl)
            const sha = pngWin ? empreinteImage(pngWin) : null
            if (!sha) return null
            const prompt = charge?.consigne || JSON.stringify(charge?.messages || '')
            return cleCache({ tache, sha256_image: sha, prompt, version_prompt: VERSION_PROMPT_VERIF, modele: modeleVerif })
          }
          const tri = await trierInterventions(b.projet || {}, interventions, {
            fournisseur, consentement, chargePage: chargeVerifPage, chargeCrop: chargeVerifCrop,
            cache: cacheIA, cleDe: cleVerif('verification'), cleCrop: cleVerif('verification'),
            zones, date: new Date().toISOString(),
          })
          metaIA.triage = tri.meta
          if (tri.meta.erreur && !metaIA.erreur) metaIA.erreur = tri.meta.erreur

          // ── §8 — LIGNES FAIBLES QUE PERSONNE N'A CORRIGÉES ────────────────────────────────
          // Elles ne disaient rien d'autre que « cette ligne est douteuse ». On les relit sur
          // l'image : confirmées, elles disparaissent ; relues autrement, elles deviennent un
          // candidat qui repasse au même triage.
          const dejaTraitees = new Set(interventions.filter((x) => x.ligne_ids?.length === 1).map((x) => x.page + ':' + x.ligne_ids[0]))
          const verdictsFaibles = new Map()
          for (const n of pagesLot) {
            const lg = b.projet?.pages?.[n]?.lignes
            if (!Array.isArray(lg)) continue
            for (let i = 0; i < lg.length; i++) {
              const l = lg[i]
              if (l?.confiance == null || l.confiance >= SEUIL_CONFIANCE_OCR) continue
              if (dejaTraitees.has(n + ':' + i)) continue
              const charge = await chargeVerifCrop(
                { page: n, ligne_ids: [i], bbox: l.bbox },
                { a: '', b: '', avant: String(lg[i - 1]?.dip ?? ''), apres: String(lg[i + 1]?.dip ?? ''), zone: zones.get(n)?.get(i)?.zone ?? null },
              )
              if (!charge) continue
              // Lecture NUE : on ne soumet aucune proposition, on demande ce qui est imprimé.
              const nue = fournisseur.local
                ? { ...charge, consigne: consigneLectureCrop({ avant: String(lg[i - 1]?.dip ?? ''), apres: String(lg[i + 1]?.dip ?? ''), zone: zones.get(n)?.get(i)?.zone ?? null }) }
                : charge
              const out = await appelerIA(fournisseur, 'verification', nue, { consentement, cache: cacheIA, cacheCle: await cleVerif('lecture')({ page: n }, nue) })
              metaIA.triage.appels_crop++
              if (!out || out.abstention || !Array.isArray(out.verifications) || !out.verifications.length) continue
              verdictsFaibles.set(n + ':' + i, verdictDepuisReponse(out.verifications[0], { candidatEnA: false, modele: out.modele, fournisseur: out.fournisseur }))
            }
          }
          const faibles = candidatsDepuisLignesFaibles(b.projet || {}, verdictsFaibles, { seuilConfiance: 0.9, date: new Date().toISOString() })
          if (faibles.nouveaux.length) {
            // Les candidats nés d'une ligne faible passent par le MÊME triage que les autres :
            // aucun raccourci, aucune application sans preuve.
            const tri2 = await trierInterventions(b.projet || {}, faibles.nouveaux, {
              fournisseur, consentement, chargePage: chargeVerifPage, chargeCrop: chargeVerifCrop,
              cache: cacheIA, cleDe: cleVerif('verification'), cleCrop: cleVerif('verification'),
              zones, date: new Date().toISOString(),
            })
            interventions = [...interventions, ...tri2.interventions]
            tri.decisions.push(...tri2.decisions)
          }
          lignesConfirmees = faibles.confirmees
          lignesDouteuses = faibles.douteuses
          findings = retirerFlagsConfirmes(findings, faibles.confirmees)
          decisionsTriage = tri.decisions
        }
        return json(res, 200, {
          findings: [...findings, ...interventions],
          compteurs: { ...compteurs, ia: interventions.length, pages_relues: metaIA.pages_relues || 0, depuis_cache: metaIA.depuis_cache || 0 },
          triage: { ...mesurerTriage(decisionsTriage), ...(metaIA.triage || {}), lignes_faibles_confirmees: lignesConfirmees.length, lignes_faibles_douteuses: lignesDouteuses.length },
          lignes_confirmees: lignesConfirmees,
          ia_active: fournisseur.cloud && consentement, ia_erreur: metaIA.erreur || null,
        })
      }

      // §14.6 — état du fournisseur IA (sans révéler la clé) + consentement enregistré.
      if (p === '/api/ia/etat') {
        return json(res, 200, { fournisseur: etatFournisseur(process.env), consentement: await lireConsentement() })
      }
      // §14.6 — pose / révoque le consentement cloud (lié au fournisseur courant).
      if (p === '/api/ia/consentement' && req.method === 'POST') {
        const b = await corps(req)
        const record = await ecrireConsentement({ fournisseur: etatFournisseur(process.env).nom, date: new Date().toISOString(), actif: b.actif !== false })
        return json(res, 200, { ok: true, consentement: record })
      }

      // Phase E — répartition des findings pour la validation ciblée (familles / critiques / blocages).
      if (p === '/api/ia/validation' && req.method === 'POST') {
        const b = await corps(req)
        return json(res, 200, classerValidation(b.findings || []))
      }

      // Phase F — génération : état de livraison + rapport de provenance (AUCUNE IA à cette étape).
      if (p === '/api/ia/generation' && req.method === 'POST') {
        const b = await corps(req)
        const rapport = rapportGeneration({ projet: b.projet || {}, validation: b.validation || {}, profil: b.profil || null, run_id: b.run_id || null, date: b.date || null, fichiers: b.fichiers || [], lot: b.lot || {} })
        const chemin = await sauverRapportGeneration(b.nom || 'projet', rapport)
        return json(res, 200, { etat: etatLivraison(b.validation || {}, b.lot || {}), rapport, chemin })
      }

      // Sert une image locale par chemin absolu (outil local, écoute 127.0.0.1 seulement).
      if (p === '/api/fichier') {
        const chemin = url.searchParams.get('path')
        if (!chemin) return json(res, 400, { erreur: 'préciser ?path=' })
        if (!IMG_SERVIES.has(extname(chemin).toLowerCase())) return json(res, 403, { erreur: 'type non servi' })
        if (!sousRacine(chemin)) return json(res, 403, { erreur: 'hors du dossier de travail' }) // anti-traversée
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
      // Extraction de CONTRÔLE pour GPT : OCR IA (dip) vs OCR mécanique (ocr0), ligne à ligne.
      if (p === '/api/export/comparaison' && req.method === 'POST') {
        const b = await corps(req)
        return json(res, 200, await exporterComparaison(b.nom, b.projet || {}, { date: b.date || null }))
      }
      // §10 — rapport de CONTRÔLE après triage : la file de relecture d'abord, l'audit replié.
      if (p === '/api/export/triage' && req.method === 'POST') {
        const b = await corps(req)
        return json(res, 200, await exporterRapportTriage(b.nom, b.projet || {}, b.findings || [], {
          date: b.date || null, mode: b.mode === 'audit' ? 'audit' : 'file',
          lignesFaiblesConfirmees: Number(b.lignes_faibles_confirmees) || 0,
        }))
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
      // Analyse de structure éditoriale : attache les SUGGESTIONS par ligne (préserve les
      // confirmations humaines). Ne modifie ni le texte ni les coordonnées (§8, suggestions seules).
      if (p === '/api/atelier/analyser' && req.method === 'POST') {
        const b = await corps(req)
        const projet = annoterProjet(b.projet || {})
        return json(res, 200, { pages: projet.pages })
      }
      // Export du BANC d'essai (évaluation seulement). Refuse un banc non valide_humain → 400.
      if (p === '/api/export/banc' && req.method === 'POST') {
        const b = await corps(req)
        try { return json(res, 200, await exporterBanc(b.nom, b.projet || {})) }
        catch (e) { return json(res, 400, { erreur: String(e?.message ?? e) }) }
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
