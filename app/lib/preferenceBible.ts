/**
 * La bible qu'on lit par défaut : une PRÉFÉRENCE, et elle se décide sur le SERVEUR.
 *
 * Elle vivait dans `localStorage`, donc après le premier rendu. Le serveur
 * composait un chapitre dans une bible, le navigateur en substituait une autre, et
 * l'effet qui s'en chargeait se rappelait lui-même : il avait dans ses dépendances
 * la valeur qu'il modifiait, si bien que deux sources — la préférence enregistrée et
 * celle du profil — se sont écrasées l'une l'autre 280 fois en 23 secondes, à raison
 * d'une requête Supabase par bascule (mesuré le 2026-08-24).
 *
 * Un cookie, lui, se lit dans `app/page.tsx` AVANT de rendre quoi que ce soit : la
 * page est juste du premier coup, il n'y a plus rien à corriger après coup, et le
 * lecteur ne voit plus passer une bible qu'il n'a pas demandée.
 *
 * ⛔ Ne pas revenir à une substitution côté client. Ce qui décide de CE QU'ON REND
 * doit être connu du rendu, sinon il faut le défaire, et défaire un rendu se paie
 * toujours deux fois.
 *
 * Module pur, testé par preferenceBible.test.ts.
 */

/** Nom du cookie. Lu par `app/page.tsx`, écrit par la page Bible et par le compte. */
export const COOKIE_TRAD_BIBLE = 'cs_trad_bible'

const UN_AN_EN_SECONDES = 60 * 60 * 24 * 365

/**
 * Un identifiant de traduction, et rien d'autre. La valeur vient du navigateur :
 * elle n'entre nulle part sans être passée par ici. Le format est celui des clés
 * de `traductions` (« TR0001 », « TR_FR_1865_JEANNIN_… »).
 */
export function codeTraductionValide(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const propre = valeur.trim()
  return /^[A-Za-z0-9_]{1,64}$/.test(propre) ? propre : null
}

/**
 * Mémorise la bible lue, pour que le prochain rendu SERVEUR la connaisse.
 * Sans effet hors du navigateur, et sans effet sur une valeur mal formée.
 */
export function memoriserTraductionBible(code: string | null | undefined): void {
  const propre = codeTraductionValide(code)
  if (!propre || typeof document === 'undefined') return
  // `Secure` seulement en https : posé sur http://localhost, le cookie serait refusé
  // et le serveur de développement ne verrait jamais la préférence.
  const sur = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_TRAD_BIBLE}=${propre}; Path=/; Max-Age=${UN_AN_EN_SECONDES}; SameSite=Lax${sur}`
}
