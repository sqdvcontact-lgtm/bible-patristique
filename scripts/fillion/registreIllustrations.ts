/**
 * LE REGISTRE LISIBLE de l'audit des gravures.
 *
 * ⛔ Il est ENGENDRÉ à chaque relevé. Les arbitrages, eux, vivent dans
 *    `work/fillion/AUDIT_DECISIONS.json`, qui se tient à la main et ne se
 *    réécrit jamais : un relevé qui les recalculerait effacerait la décision au
 *    passage suivant. Même partage que l'inventaire des couleurs en dur, où
 *    l'on gèle à la main ce qu'aucun script ne doit regénérer.
 */
import { existsSync, readFileSync } from 'node:fs'

export type Gravite = 'bloquant' | 'a_revoir' | 'signale'
export type Defaut = { code: string; gravite: Gravite; detail: string; vu?: boolean }
export type Gravure = {
  cle: string
  livre: string | null
  regime: string
  affichage?: string
  defauts: Defaut[]
}

const ETATS: Record<string, string> = {
  a_traiter: 'à traiter',
  en_cours: 'en cours',
  regle: 'réglé',
  accepte: 'accepté',
}
const MARQUE: Record<Gravite, string> = { bloquant: '⛔', a_revoir: '⚠️', signale: '·' }
const RANG: Record<Gravite, number> = { bloquant: 100, a_revoir: 10, signale: 1 }

function lireDecisions(chemin: string): Record<string, { etat?: string; note?: string }> {
  if (!existsSync(chemin)) return {}
  return JSON.parse(readFileSync(chemin, 'utf8'))
}

export function rendreRegistre(
  gravures: Gravure[],
  options: { decisions: string; releve: string },
): string {
  const decisions = lireDecisions(options.decisions)
  const etatDe = (code: string, cle?: string) => {
    const d = decisions[cle ? `${code}#${cle}` : code] ?? decisions[code] ?? {}
    return { etat: ETATS[d.etat ?? 'a_traiter'] ?? d.etat ?? 'à traiter', note: d.note ?? '' }
  }

  const compte: Record<string, Record<Gravite, number>> = {}
  for (const g of gravures) {
    for (const d of g.defauts) {
      compte[d.code] ??= { bloquant: 0, a_revoir: 0, signale: 0 }
      compte[d.code][d.gravite]++
    }
  }
  const poids = (v: Record<Gravite, number>) =>
    v.bloquant * RANG.bloquant + v.a_revoir * RANG.a_revoir + v.signale * RANG.signale
  const classes = Object.entries(compte).sort((a, b) => poids(b[1]) - poids(a[1]))
  const atteintes = gravures.filter((g) => g.defauts.length).length

  const l: string[] = []
  const pousser = (...t: string[]) => l.push(...t)

  pousser('# Audit des gravures de Fillion', '')
  pousser(
    '⛔ **Ce fichier est ENGENDRÉ à chaque relevé.** Les arbitrages vivent dans',
    '`AUDIT_DECISIONS.json`, qui se tient à la main : un relevé qui les recalculerait',
    'effacerait la décision au passage suivant.',
    '',
    '```bash',
    'npx tsx --env-file=.env.local scripts/fillion/auditer-illustrations.mts',
    '```',
    '',
  )
  pousser(`Relevé du ${options.releve} · **${gravures.length} gravures**, dont **${atteintes}** portent au moins un défaut.`, '')
  pousser(
    '⚠️ **La mesure ne conclut pas : elle dit où REGARDER.** Trois mesures ont déjà',
    'accusé à tort — les coins d’un fichier rogné, la confrontation au scan, le filet',
    'd’un cadre gravé pris pour un filet de page. Un défaut marqué **vu** a été',
    'contrôlé à l’agrandissement ; les autres attendent l’œil.',
    '',
  )

  pousser('| défaut | ⛔ | ⚠️ | · | état |', '|---|---:|---:|---:|---|')
  for (const [code, v] of classes) {
    pousser(`| [\`${code}\`](#${code.replace(/_/g, '')}) | ${v.bloquant || ''} | ${v.a_revoir || ''} | ${v.signale || ''} | ${etatDe(code).etat} |`)
  }
  pousser('')

  for (const [code, v] of classes) {
    const e = etatDe(code)
    pousser(`## \`${code}\` — ${v.bloquant + v.a_revoir + v.signale} gravures · ${e.etat}`, '')
    if (e.note) pousser(`> ${e.note}`, '')
    pousser('| gravure | livre | régime | affiché | | détail |', '|---|---|---|---|---|---|')
    for (const g of gravures) {
      for (const d of g.defauts.filter((x) => x.code === code)) {
        const marque = `${MARQUE[d.gravite]}${d.vu ? ' **vu**' : ''}`
        pousser(`| \`${g.cle.replace('fillion-', '')}\` | ${g.livre ?? '—'} | ${g.regime ?? '—'} | ${g.affichage ?? '—'} | ${marque} | ${d.detail} |`)
      }
    }
    pousser('')
  }

  const saines = gravures.filter((g) => !g.defauts.length)
  pousser(`## Sans défaut relevé — ${saines.length} gravures`, '')
  pousser(saines.map((g) => `\`${g.cle.replace('fillion-', '')}\``).join(' · '), '')

  return l.join('\n')
}
