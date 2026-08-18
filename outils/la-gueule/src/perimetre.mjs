// Phase 2 (plan d'action 2026-08-09) — PÉRIMÈTRE DE TRAVAIL. Spec pure et testable de la complétude
// d'un LOT : « OCR local » est terminé quand toutes les pages DU LOT sont océrisées, en erreur, ou
// exclues (tri) — jamais mesuré sur les 589 pages du PDF. L'atelier (ui/atelier.html) en garde un miroir
// inline (comme corrigerLettrineClient / pageAnormaleClient). L'état du DOCUMENT reste distinct du lot.

/**
 * Complétude d'un lot. `lot` = liste de numéros de pages engagées ; `etats` = map n → {faite, erreur,
 * exclue}. Une page compte une seule fois (priorité faite > erreur > exclue). Une page en erreur ne
 * bloque pas (« terminé avec erreurs »), seules les pages ni faites/ni en erreur/ni exclues restent
 * « manquantes ». Pur / testable.
 */
export function completudeLot(lot = [], etats = {}) {
  let faites = 0, erreurs = 0, exclues = 0
  for (const n of (Array.isArray(lot) ? lot : [])) {
    const e = etats[n] || {}
    if (e.faite) faites++
    else if (e.erreur) erreurs++
    else if (e.exclue) exclues++
  }
  const total = (Array.isArray(lot) ? lot : []).length
  const manquantes = Math.max(0, total - faites - erreurs - exclues)
  return { total, faites, erreurs, exclues, manquantes, termine: manquantes === 0, avecErreurs: erreurs > 0 }
}
