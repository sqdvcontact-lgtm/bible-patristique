import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const KEY = 'feedback_liens_protocole'
const MARKER = '### 2026-07-30 — Eucher, *Du mépris du monde* — A0418O0003'
const BACKUP_PATH = 'audit/memory_before_eucher_links_lessons_2026-07-30.json'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const sha = value => createHash('sha256').update(value).digest('hex')
const block = `

${MARKER}

- Profil : traité bref de 547 segments corporels, 60 articles et 22 notes ; 14 citations entre guillemets et aucune référence parenthétique dans le corps. Les diagnostics mécaniques ont produit zéro lien. La lecture intégrale a donc été la méthode principale.
- Résultat : 40 liens après lecture et comparaison avec les témoins de \`versets_lecture\` ; 18 types 1, 19 types 2, 2 types 3 et 1 type 4. Trente-sept liens sont vérifiés ; trois restent douteux avec arbitrage requis.
- Les notes marginales du fac-similé ont été conservées à l’identique, même lorsqu’elles sont fautives. La cible du lien suit le contenu : \`Gen. 2, 21\` a conduit à \`GEN.3.19\`, \`Luc. 1, 17\` à \`JAS.1.17\`, \`Ps. 38, 10\` à \`PSA.38.7\`, \`Ps. 115, 3\` à \`PSA.115.12\` et \`1 Co. 10, 12\` à \`1CO.10.11\`.
- Cas non résolus avec certitude : les deux références de la note 4, 2 Co 5, 20 et Ep 6, 10, ne subsistent que faiblement dans la traduction française ; la citation de l’article 27 est donnée comme Mal 3, 1 par l’édition française, tandis qu’un autre témoin éditorial la rattache à Is 28, 25. Ces trois liens restent déclarés douteux et visibles à l’arbitrage.
- La lecture a retrouvé plusieurs reprises absentes des notes : 1 Co 2, 7 ; Mt 11, 30 ; Mt 7, 14 ; Mt 11, 12 ; 1 Tm 6, 15 ; Rm 15, 19 ; 1 Tm 3, 16 ; Mt 22, 39 ; Mt 5, 44-45 ; Lc 12, 33 et 1 Co 10, 31.
- Contrôles : sondage aléatoire de 15 liens, rappel exhaustif des 40, zéro cible morte, zéro doublon, zéro motif vide, 547 segments marqués \`IA-lecture\`, empreinte du texte inchangée. Rapport : \`tmp/eucher-links-2026-07-30/post-links-audit.json\`.
- Amélioration d’outil : \`scripts/liens-controle.mjs\` doit charger les natures \`texte\` et \`citation\`. Son ancien filtre limité à \`texte\` rendait les citations invisibles au sondage.
`

const { data: row, error } = await db.from('parametres').select('cle,valeur,mis_a_jour').eq('cle', KEY).single()
if (error) throw error
if (row.valeur.includes(MARKER)) throw new Error('Le retour d’expérience d’Eucher est déjà consigné')
const after = `${row.valeur.trimEnd()}${block}\n`
const backup = {
  generated_at: new Date().toISOString(),
  key: KEY,
  before_updated_at: row.mis_a_jour,
  before_sha256: sha(row.valeur),
  after_sha256: sha(after),
  before_value: row.valeur,
}
mkdirSync('audit', { recursive: true })
writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry', backup: BACKUP_PATH, before_sha256: backup.before_sha256, after_sha256: backup.after_sha256, added_chars: after.length - row.valeur.length }, null, 2))
if (!APPLY) process.exit(0)

const { data: updated, error: updateError } = await db.from('parametres')
  .update({ valeur: after, mis_a_jour: new Date().toISOString() })
  .eq('cle', KEY).eq('mis_a_jour', row.mis_a_jour).select('cle,valeur,mis_a_jour')
if (updateError) throw updateError
if (updated.length !== 1) throw new Error('Précondition concurrente non satisfaite')
const subject = 'Mémoire liens bibliques : Eucher, Du mépris du monde'
const { data: recent, error: recentError } = await db.from('journal_ia').select('id,sujet').order('id', { ascending: false }).limit(50)
if (recentError) throw recentError
let journal = recent.find(item => item.sujet === subject)
if (!journal) {
  const { data: inserted, error: journalError } = await db.from('journal_ia').insert({
    sujet: subject,
    probleme: 'Consignation du bilan de constitution des liens et des références marginales fautives confirmées au fac-similé.',
    reponse: JSON.stringify({ backup_path: BACKUP_PATH, before_sha256: backup.before_sha256, after_sha256: backup.after_sha256, report: 'tmp/eucher-links-2026-07-30/post-links-audit.json' }),
    statut: 'sauvegarde',
  }).select('id').single()
  if (journalError) throw journalError
  journal = inserted
}
const { data: verify, error: verifyError } = await db.from('parametres').select('valeur').eq('cle', KEY).single()
if (verifyError) throw verifyError
const checks = { marker_once: verify.valeur.split(MARKER).length - 1 === 1, hash: sha(verify.valeur) === sha(after) }
if (!checks.marker_once || !checks.hash) throw new Error(`Vérification échouée : ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, checks }, null, 2))
