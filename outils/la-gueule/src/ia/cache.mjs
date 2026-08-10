// CACHE des réponses IA — sur disque, pour ne pas repayer une relecture déjà faite.
//
// Une relecture de page coûte ~80 s de modèle. Sans cache, relancer un contrôle après avoir
// corrigé un détail repaie TOUT ; c'est le premier frein à l'usage réel de l'outil sur un volume.
//
// La clé (`cleCache`, fournisseur.mjs) porte déjà tout ce qui, s'il change, doit invalider :
// tâche, modèle, version du prompt, empreinte de l'image, et le prompt lui-même — lequel contient
// l'OCR des lignes. Donc : image retouchée, texte corrigé, prompt réécrit ou modèle changé
// ⇒ la clé change ⇒ le cache est ignoré. Il ne peut pas servir une réponse périmée.
//
// Le disque, et non la mémoire : le serveur est relancé souvent (node détaché), un cache en
// mémoire serait perdu à chaque fois — c'est-à-dire précisément quand on en a besoin.
//
// L'interface est SYNCHRONE (`has`/`get`/`set`) parce que `appelerIA` l'appelle ainsi. Les
// fichiers sont petits (une réponse JSON) : le coût d'un accès disque est négligeable devant les
// dizaines de secondes d'un appel au modèle.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Empreinte d'un fichier (image de page), pour que le cache suive la source. Null si illisible. */
export function empreinteImage(chemin) {
  try { return createHash('sha256').update(readFileSync(chemin)).digest('hex') } catch { return null }
}

/**
 * Cache disque. `dir` reçoit un fichier JSON par réponse, nommé par la clé. Aucune expiration :
 * une clé ne vaut que pour un couple (image, texte, prompt, modèle) donné — elle devient
 * simplement inatteignable quand l'un d'eux change. `gueule nettoyer --cache` fait le ménage.
 */
export function creerCacheIA({ dir, actif = true } = {}) {
  const stats = { lectures: 0, ecritures: 0, manques: 0 }
  if (actif) { try { mkdirSync(dir, { recursive: true }) } catch { /* le cache est un confort, jamais un blocage */ } }
  const fichier = (cle) => join(dir, String(cle).replace(/[^a-f0-9]/gi, '').slice(0, 64) + '.json')
  return {
    actif,
    stats,
    has(cle) {
      if (!actif || !cle) return false
      const ok = existsSync(fichier(cle))
      if (!ok) stats.manques++
      return ok
    },
    get(cle) {
      if (!actif || !cle) return undefined
      try {
        const v = JSON.parse(readFileSync(fichier(cle), 'utf8'))
        stats.lectures++
        // On marque la sortie : une réponse resservie ne doit pas passer pour un appel neuf.
        return { ...v, _cache: true }
      } catch { return undefined }
    },
    set(cle, valeur) {
      // On ne met JAMAIS en cache une abstention ni une erreur : ce sont des accidents
      // (CLI indisponible, quota, sortie illisible) qu'il faut pouvoir réessayer.
      if (!actif || !cle || !valeur || valeur.abstention || valeur.erreur) return
      try { writeFileSync(fichier(cle), JSON.stringify(valeur), 'utf8'); stats.ecritures++ } catch { /* confort */ }
    },
  }
}

/** Vide le cache. Renvoie le nombre d'entrées retirées et les octets libérés. */
export function viderCacheIA(dir) {
  let n = 0, octets = 0
  let noms = []
  try { noms = readdirSync(dir) } catch { return { n, octets } }
  for (const nom of noms) {
    if (!nom.endsWith('.json')) continue
    const chemin = join(dir, nom)
    try { octets += statSync(chemin).size; rmSync(chemin, { force: true }); n++ } catch { /* ignore */ }
  }
  return { n, octets }
}
