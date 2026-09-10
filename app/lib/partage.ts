// ── L'OUTIL DE PARTAGE — une ligne, et les canaux qui l'emportent ────────────
//
// ⛔ UNE SEULE LIGNE, LA MÊME PARTOUT, ET COURTE : « CS — Augustin d'Hippone, Les
// Confessions ». Demande de l'auteur, 2026-09-10 : « il faut que ce soit simple,
// peu de texte ». Elle ne dit que deux choses — d'où cela vient, et ce que c'est.
// Tout le reste (le nom du site en toutes lettres, la description, la vignette)
// est porté par l'APERÇU DU LIEN, que chaque messagerie compose elle-même depuis
// les balises Open Graph de la page (`app/lib/metadonneesSeo.ts`). Le redire dans
// le message serait l'écrire deux fois.
//
// ⛔ ET LA FORME NE CHANGE PAS D'UNE PAGE À L'AUTRE : « CS — QUI, QUOI ». L'auteur
// puis son œuvre, le livre puis son chapitre, la péricope puis sa référence. Une
// formule par genre de page ferait autant de messages différents pour un seul
// geste, et l'on ne reconnaîtrait plus la maison au premier coup d'œil.
//
// ⚠️ AUCUN GUILLEMET dans la ligne, pas même autour d'un titre d'essai : la virgule
// sépare déjà le qui du quoi, et les guillemets français demandent des fines
// insécables (charte, § typographie) qu'aucune messagerie ne garantit de rendre.
//
// Module PUR, sans navigateur : `partage.test.ts` l'éprouve.

import { NOM_SITE } from './metadonneesSeo'

/** La marque qui ouvre la ligne. Deux lettres : le nom entier est dans l'aperçu. */
export const MARQUE_PARTAGE = 'CS'

/** Le tiret du site, celui que la page d'œuvre emploie déjà entre un titre et son
 *  auteur. ⚠️ Il est encadré d'espaces ORDINAIRES : une insécable, réécrite par une
 *  messagerie qui ne la connaît pas, revient en losange. */
const TIRET = ' — '

/** Ce qu'on partage. Un genre par surface du site ; `page` est le repli des pages
 *  qui n'ont qu'un titre à donner (la Bibliothèque, la recherche, l'accueil). */
export type SujetPartage =
  | { genre: 'oeuvre'; titre: string; auteur?: string | null }
  | { genre: 'chapitre'; livre: string; chapitre: number }
  | { genre: 'verset'; reference: string }
  | { genre: 'pericope'; nom: string; reference?: string | null }
  | { genre: 'auteur'; nom: string }
  | { genre: 'essai'; titre: string; auteur?: string | null }
  | { genre: 'page'; titre: string }

/** Un champ vide, une chaîne d'espaces et `null` sont le même cas : ABSENT. */
function propre(valeur: string | null | undefined): string {
  return (valeur ?? '').replace(/\s+/g, ' ').trim()
}

/** « QUI, QUOI » — la ligne sans sa marque. */
export function sujetEnClair(sujet: SujetPartage): string {
  switch (sujet.genre) {
    case 'oeuvre':
    case 'essai': {
      const titre = propre(sujet.titre)
      const auteur = propre(sujet.auteur)
      // ⚠️ Une œuvre anonyme — la Règle du Maître, une lettre pseudépigraphe — n'a
      // pas de « qui » : la ligne commence alors au titre, sans virgule orpheline.
      return auteur && titre ? `${auteur}, ${titre}` : auteur || titre
    }
    case 'chapitre':
      return `${propre(sujet.livre)}, chapitre ${sujet.chapitre}`
    case 'verset':
      return propre(sujet.reference)
    case 'pericope': {
      const nom = propre(sujet.nom)
      const reference = propre(sujet.reference)
      // ⚠️ La référence entre PARENTHÈSES et non après une virgule : une référence
      // en porte déjà une (« Jean 2, 1-11 »), et deux virgules de sens différent
      // dans une même ligne ne se départagent plus.
      return reference && nom ? `${nom} (${reference})` : nom || reference
    }
    case 'auteur':
      return propre(sujet.nom)
    case 'page':
      return propre(sujet.titre)
  }
}

/** La ligne entière, telle qu'elle part : « CS — Augustin d'Hippone, Les Confessions ».
 *
 *  ⚠️ Un sujet vide rend le nom du site EN TOUTES LETTRES, jamais « CS — » suivi de
 *  rien : deux initiales seules ne disent rien à qui reçoit le message. */
export function ligneDePartage(sujet: SujetPartage): string {
  const clair = sujetEnClair(sujet)
  return clair ? `${MARQUE_PARTAGE}${TIRET}${clair}` : NOM_SITE
}

/** Le message complet, ligne puis adresse — ce qu'on copie, ce qu'on écrit dans un
 *  courriel, ce qu'on dépose dans une conversation. */
export function messagePartage(ligne: string, url: string): string {
  return `${ligne}\n${url}`
}

export type CleCanal = 'lien' | 'courriel' | 'whatsapp' | 'facebook' | 'x' | 'telegram' | 'natif'

/**
 * LES CANAUX, dans l'ordre où ils se montrent.
 *
 * ⛔ Le lien nu vient EN TÊTE : il est le seul qui marche partout, y compris là où
 * l'on partage vraiment — un SMS, un carnet, un courriel écrit à la main.
 * ⚠️ `natif` ne paraît que sur un appareil qui a une feuille de partage système
 * (un téléphone) : elle porte alors tout ce que cette liste ne nomme pas — Signal,
 * Messenger, Instagram, Bluesky, le presse-papiers du système.
 */
export const CANAUX: { cle: CleCanal; nom: string }[] = [
  { cle: 'lien', nom: 'Copier le lien' },
  { cle: 'courriel', nom: 'Courriel' },
  { cle: 'whatsapp', nom: 'WhatsApp' },
  { cle: 'facebook', nom: 'Facebook' },
  { cle: 'x', nom: 'X' },
  { cle: 'telegram', nom: 'Telegram' },
  { cle: 'natif', nom: 'Autres' },
]

/**
 * L'adresse qu'ouvre un canal, ou `null` quand le canal n'est pas une destination
 * (`lien` copie, `natif` appelle le système).
 *
 * ⚠️ FACEBOOK NE PREND QUE L'ADRESSE. Son partageur a cessé d'accepter un texte
 * prérempli en 2017 (politique de la plateforme) : la ligne y est donc perdue, et
 * c'est l'aperçu Open Graph qui parle seul. Rien à corriger ; c'est à savoir avant
 * de croire à un défaut.
 * ⚠️ X veut son texte et son adresse SÉPARÉS, sans quoi il compte l'adresse deux
 * fois. Même chose pour Telegram.
 */
export function adressePartage(canal: CleCanal, ligne: string, url: string): string | null {
  const texte = encodeURIComponent(ligne)
  const adresse = encodeURIComponent(url)
  switch (canal) {
    case 'courriel':
      return `mailto:?subject=${texte}&body=${encodeURIComponent(messagePartage(ligne, url))}`
    case 'whatsapp':
      // `wa.me` est la forme officielle : elle ouvre l'application sur un téléphone,
      // `web.whatsapp.com` sur un ordinateur, sans qu'on ait à distinguer les deux.
      return `https://wa.me/?text=${encodeURIComponent(messagePartage(ligne, url))}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${adresse}`
    case 'x':
      return `https://x.com/intent/post?text=${texte}&url=${adresse}`
    case 'telegram':
      return `https://t.me/share/url?url=${adresse}&text=${texte}`
    case 'lien':
    case 'natif':
      return null
  }
}
