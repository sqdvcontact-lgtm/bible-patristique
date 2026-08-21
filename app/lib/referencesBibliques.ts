// Références bibliques — formatage CENTRALISÉ des identifiants canoniques.
//
// Les identifiants canoniques ont la forme « LIVRE.chapitre.verset » (ex. « JHN.4.1 »,
// « PSA.22.1 »). Cette fonction les transforme en référence française lisible :
//
//   JHN.4.1            → Jean 4,1
//   PSA.22.1           → Psaume 22,1
//   1CO.13.1           → 1 Corinthiens 13,1
//   JHN.4.1 / JHN.4.42 → Jean 4,1-42   (plage)
//
// Source unique des noms : `LIVRES` (app/lib/bible.ts), pour qu'un livre ajouté là soit
// nommé partout de la même façon. Seul le Psautier est mis au singulier pour la citation
// d'un psaume (« Psaume 22 », non « Psaumes 22 »).

import { LIVRES } from './bible'

const NOM_REFERENCE: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))
// Le Psautier se cite au singulier.
NOM_REFERENCE['PSA'] = 'Psaume'

/** Nom français d'un livre pour une CITATION (« Jean », « Psaume », « 1 Corinthiens »). */
export function nomLivreReference(code: string): string {
  return NOM_REFERENCE[code] ?? code
}

export type PointCanonique = { livre: string; chapitre: number | null; verset: number | null }

/** « JHN.4.1 » → { livre:'JHN', chapitre:4, verset:1 }. Tolère « JHN.4 » et « JHN ». */
export function parsePointCanonique(canon: string | null | undefined): PointCanonique | null {
  if (!canon) return null
  const parts = canon.trim().split('.')
  const livre = parts[0]
  if (!livre) return null
  const nombre = (v: string | undefined) => {
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return { livre, chapitre: nombre(parts[1]), verset: nombre(parts[2]) }
}

function pointChapitreVerset(p: PointCanonique): string {
  if (p.chapitre == null) return ''
  // Espace après la virgule, comme partout sur le site : « 3, 1 » et non « 3,1 ».
  return p.verset != null ? `${p.chapitre}, ${p.verset}` : `${p.chapitre}`
}

/**
 * Référence lisible d'un point ou d'une plage canonique. Conventions typographiques :
 * espace après la virgule chapitre/verset ; trait simple entre versets d'un même
 * chapitre ; trait entouré d'espaces pour une plage à cheval sur deux chapitres.
 *   formaterPlageCanonique('GEN.3.1', 'GEN.3.24')    → « Genèse 3, 1-24 »
 *   formaterPlageCanonique('GEN.18.16', 'GEN.19.29') → « Genèse 18, 16 - 19, 29 »
 *   formaterPlageCanonique('PSA.22.1')               → « Psaume 22, 1 »
 * Gère aussi, exceptionnellement, la plage sur deux livres (« Jean 4, 1 – Marc 1, 1 »).
 */
export function formaterPlageCanonique(debut: string, fin?: string | null): string {
  const d = parsePointCanonique(debut)
  if (!d) return debut
  const nom = nomLivreReference(d.livre)
  const debutTxt = d.chapitre != null ? `${nom} ${pointChapitreVerset(d)}` : nom

  const f = fin ? parsePointCanonique(fin) : null
  if (!f) return debutTxt
  if (f.livre === d.livre && f.chapitre === d.chapitre && f.verset === d.verset) return debutTxt

  if (f.livre === d.livre) {
    if (f.chapitre === d.chapitre) {
      // Même chapitre : « Genèse 3, 1-24 » (trait simple, sans espaces).
      return f.verset != null ? `${debutTxt}-${f.verset}` : debutTxt
    }
    // Chapitres différents : « Genèse 18, 16 - 19, 29 » (trait entouré d'espaces).
    return f.verset != null ? `${debutTxt} - ${f.chapitre}, ${f.verset}` : `${debutTxt} - ${f.chapitre}`
  }
  // Livres différents (cas rare) : « Jean 4, 1 – Marc 1, 1 ».
  const finTxt = f.chapitre != null ? `${nomLivreReference(f.livre)} ${pointChapitreVerset(f)}` : nomLivreReference(f.livre)
  return `${debutTxt} – ${finTxt}`
}
