// ORCHESTRATEUR DES PASSES AUTOMATIQUES (charte §9.0) — lance TOUJOURS toutes les
// passes, dans l'ordre, sans en sauter aucune. Une passe qui ne rend rien n'est
// pas une erreur : elle est lancée quand même. Les passes 4-5 (lecture) restent
// humaines et ne figurent pas ici.
//
//   node scripts/liens-passes.mjs A0013O0002 --dry            (simulation, rien écrit)
//   node scripts/liens-passes.mjs A0013O0002                 (écriture)
//   node scripts/liens-passes.mjs A0013O0002 --partie="Prima Pars"
//   node scripts/liens-passes.mjs A0013O0002 --sans-p6       (tout sauf le nettoyage du corps)
import { spawnSync } from 'node:child_process'

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
const PARTIE = process.argv.find(a => a.startsWith('--partie=')) || null
const SANS_P6 = process.argv.includes('--sans-p6')
if (!OEUVRE) { console.error('usage : node scripts/liens-passes.mjs <id_oeuvre> [--dry] [--partie="..."] [--sans-p6]'); process.exit(1) }

const commun = [OEUVRE, ...(DRY ? ['--dry'] : []), ...(PARTIE ? [PARTIE] : [])]

// L'ORDRE EST FIXE. Ne pas réordonner, ne pas retirer (sauf P6 destructive via option).
const PASSES = [
  { n: '1', titre: 'références de l’éditeur',   script: 'liens-references-editoriales.mjs', args: commun },
  { n: '2', titre: 'citations marquées sans réf', script: 'liens-citations-introduites.mjs', args: [...commun, '--sans-flags'] },
  { n: '3', titre: 'termes consacrés',           script: 'liens-termes-consacres.mjs',      args: commun },
  // P6 nettoie le CORPS (destructif) : toujours en dernier, après extraction.
  ...(SANS_P6 ? [] : [{ n: '6', titre: 'nettoyage du corps', script: 'liens-nettoyage-corps.mjs', args: commun }]),
]

console.log(`\n╔══ CONSTITUTION DES LIENS — ${OEUVRE}${PARTIE ? ' · ' + PARTIE.slice(9) : ''}${DRY ? ' · SIMULATION' : ''}`)
console.log('║  Passe 0 — diagnostic : le rendement de chaque passe ci-dessous EST le diagnostic.')

for (const p of PASSES) {
  console.log(`\n╔═════ PASSE ${p.n} — ${p.titre} ═════`)
  const r = spawnSync('node', [`scripts/${p.script}`, ...p.args], { stdio: 'inherit' })
  if (r.status !== 0) { console.error(`\n✗ Passe ${p.n} a échoué (code ${r.status}) — arrêt.`); process.exit(1) }
}

console.log(`\n╚══ Passes automatiques terminées. Restent les passes 4-5 (LECTURE), à la main.`)
