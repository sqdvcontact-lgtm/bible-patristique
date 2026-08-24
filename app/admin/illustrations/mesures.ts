// ── Mesure des illustrations ─────────────────────────────────────────────────
//
// Séparé de la page, et pas seulement par propreté : le parsage des en-têtes PNG
// et le parcours des seaux Supabase n'ont rien à faire dans un fichier que Next
// contraint à n'exporter qu'un composant et ses métadonnées.

import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { FAMILLES, ICONES_ONGLET, ILLUSTRATIONS, type Famille } from './inventaire'
import type { EchantillonFamille, Mesure } from './PlancheIllustrations'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!

// ── Mesure des fichiers ──────────────────────────────────────────────────────
//
// Le poids se lit sur le disque, les dimensions dans l'en-tête du fichier. Les
// dimensions pourraient se prendre au chargement dans le navigateur, mais elles
// arriveraient alors image par image, et la planche danserait pendant qu'on la
// regarde. Trois formats suffisent : PNG, JPEG et SVG.

/** PNG : la largeur et la hauteur sont les deux entiers de 4 octets qui ouvrent
 *  le bloc IHDR, toujours premier, toujours au même endroit. */
function dimensionsPng(buf: Buffer): { l: number; h: number } | null {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null
  return { l: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

/** JPEG : il faut parcourir les segments jusqu'à un marqueur SOF (C0 à CF, sauf
 *  C4, C8 et CC qui disent autre chose). La taille y est en hauteur puis largeur. */
function dimensionsJpeg(buf: Buffer): { l: number; h: number } | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue }
    const marqueur = buf[i + 1]
    if (marqueur >= 0xc0 && marqueur <= 0xcf && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), l: buf.readUInt16BE(i + 7) }
    }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return null
}

/** SVG : pas de pixels, mais un `viewBox` qui donne le rapport de forme. */
function dimensionsSvg(buf: Buffer): { l: number; h: number } | null {
  const tete = buf.subarray(0, 2048).toString('utf8')
  const vb = tete.match(/viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/)
  if (vb) return { l: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) }
  const l = tete.match(/\swidth\s*=\s*["'](\d+)/)
  const h = tete.match(/\sheight\s*=\s*["'](\d+)/)
  return l && h ? { l: Number(l[1]), h: Number(h[1]) } : null
}

/** Mesure un fichier du dépôt. Renvoie `null` sans bruit si le fichier manque :
 *  en production, `public/` n'est pas forcément embarqué dans la fonction qui
 *  rend cette page (voir `outputFileTracingIncludes` dans next.config.ts). La
 *  planche s'affiche alors sans les chiffres, plutôt que de tomber en panne. */
async function mesurer(cheminRelatif: string): Promise<Mesure | null> {
  try {
    const abs = path.join(process.cwd(), cheminRelatif)
    const { size } = await stat(abs)
    // 64 ko d'en-tête : de quoi couvrir le SOF d'un JPEG chargé d'EXIF.
    const tete = await readFile(abs).then(b => b.subarray(0, 65536))
    const dim = cheminRelatif.endsWith('.svg') ? dimensionsSvg(tete)
      : cheminRelatif.endsWith('.jpg') || cheminRelatif.endsWith('.jpeg') ? dimensionsJpeg(tete)
        : dimensionsPng(tete)
    return { octets: size, largeur: dim?.l ?? null, hauteur: dim?.h ?? null }
  } catch {
    return null
  }
}

// ── Familles nombreuses ──────────────────────────────────────────────────────

/** Parcourt un seau Supabase en descendant dans ses dossiers. Deux garde-fous :
 *  la profondeur et le nombre d'appels. Sans eux, le seau des fac-similés, qui
 *  porte quinze cents objets, tiendrait la page en otage. */
async function parcourirSeau(seau: string, budget = 24): Promise<{ noms: string[]; complet: boolean }> {
  const noms: string[] = []
  const aVisiter: string[] = ['']
  let appels = 0
  while (aVisiter.length && appels < budget) {
    const prefixe = aVisiter.shift()!
    appels++
    const { data, error } = await supabaseAdmin.storage.from(seau).list(prefixe, { limit: 1000 })
    if (error || !data) continue
    for (const entree of data) {
      if (entree.name === '.emptyFolderPlaceholder') continue
      const complet = prefixe ? `${prefixe}/${entree.name}` : entree.name
      // Un dossier n'a pas d'identifiant : c'est ainsi que l'API les distingue.
      if (entree.id === null) aVisiter.push(complet)
      else noms.push(complet)
    }
  }
  return { noms: noms.sort(), complet: aVisiter.length === 0 }
}

async function parcourirDossier(relatif: string): Promise<{ noms: string[]; complet: boolean }> {
  try {
    const noms = await readdir(path.join(process.cwd(), 'public', relatif))
    return { noms: noms.filter(n => /\.(png|jpe?g|webp|svg|avif)$/i.test(n)).sort(), complet: true }
  } catch {
    return { noms: [], complet: false }
  }
}

const TAILLE_ECHANTILLON = 10

async function releverFamille(famille: Famille): Promise<EchantillonFamille> {
  const seau = 'seau' in famille.source ? famille.source.seau : null
  const { noms, complet } = seau
    ? await parcourirSeau(seau)
    : await parcourirDossier((famille.source as { dossier: string }).dossier)

  // L'échantillon est PRIS AU LARGE, non pris en tête : dix premiers fichiers
  // d'un dossier trié, ce sont dix voisins, et l'on ne verrait qu'un coin de la
  // famille. Un pas régulier montre son étendue.
  const pas = Math.max(1, Math.floor(noms.length / TAILLE_ECHANTILLON))
  const choisis = noms.filter((_, i) => i % pas === 0).slice(0, TAILLE_ECHANTILLON)
  const urlDe = (nom: string) => seau
    ? `${URL_SUPABASE}/storage/v1/object/public/${seau}/${nom}`
    : `/${(famille.source as { dossier: string }).dossier}/${nom}`

  return {
    cle: famille.cle,
    nom: famille.nom,
    emploi: famille.emploi,
    lieu: famille.lieu ?? null,
    origine: seau ? `Seau Supabase « ${seau} »` : `public/${(famille.source as { dossier: string }).dossier}`,
    nombre: noms.length,
    complet,
    echantillon: choisis.map(nom => ({ nom, url: urlDe(nom) })),
  }
}


/** Tout ce que la planche demande au serveur : le poids et la définition de chaque
 *  illustration recensée, et le relevé des familles trop nombreuses pour y figurer. */
export async function releverIllustrations(): Promise<{ mesures: Record<string, Mesure>; familles: EchantillonFamille[] }> {
  const [mesures, mesuresOnglet, familles] = await Promise.all([
    Promise.all(ILLUSTRATIONS.map(i => mesurer(path.join('public', i.chemin)))),
    Promise.all(ICONES_ONGLET.map(i => mesurer(i.fichier))),
    Promise.all(FAMILLES.map(releverFamille)),
  ])

  const parChemin: Record<string, Mesure> = {}
  ILLUSTRATIONS.forEach((i, n) => { if (mesures[n]) parChemin[i.chemin] = mesures[n]! })
  ICONES_ONGLET.forEach((i, n) => { if (mesuresOnglet[n]) parChemin[i.route] = mesuresOnglet[n]! })

  return { mesures: parChemin, familles }
}
