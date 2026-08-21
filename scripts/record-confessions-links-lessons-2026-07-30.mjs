import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const BACKUP_PATH = 'audit/charte_memory_before_confessions_links_lessons_2026-07-30.json'
const CHARTER_MARKER = '### 12.3 — Constitution de liens sur une œuvre longue et fortement scripturaire'
const MEMORY_MARKER = '### 2026-07-30 — Augustin, *Les Confessions* — liens bibliques achevés'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const sha = value => createHash('sha256').update(value).digest('hex')

const charterBlock = `${CHARTER_MARKER}

Pour une œuvre longue où l’Écriture est citée, paraphrasée et réinterprétée de façon continue, aucun index secondaire ne remplace la lecture intégrale.

1. **Dossier par division.** Exporter le texte complet par livre ou division stable, avec identifiants de segments, rangs, paragraphes, texte original éventuel et rappels secondaires. La division entière doit être lue avant écriture.
2. **Sources secondaires = candidats seulement.** Un index, une édition en ligne ou des notes éditoriales peuvent omettre des citations, proposer une référence erronée ou accumuler par défaut les références des divisions précédentes. Chaque candidat doit être retrouvé dans le texte local et confronté au verset local.
3. **Numérotation biblique locale.** Les Psaumes sont particulièrement exposés aux décalages entre numérotation hébraïque moderne et Vulgate. La cible est déterminée d’après le libellé du verset dans \`versets_lecture\`, jamais par transposition mécanique du numéro fourni par une source extérieure.
4. **Unité de décision.** Le lien est attaché au segment qui porte effectivement le motif. Une citation répartie sur plusieurs segments peut recevoir plusieurs liens seulement si chaque segment contient une portion identifiable du verset. Une répétition effective dans le texte demeure une occurrence distincte.
5. **Ambiguïté honnête.** Quand une formule identique appartient à plusieurs loci et que le contexte ne les départage pas, conserver un arbitrage sans cible plutôt que choisir artificiellement. Un lien manquant est préférable à un faux lien.
6. **Écriture sous préconditions.** Avant chaque lot, vérifier le nombre de segments, les bornes, l’absence de liens déjà constitués et l’empreinte du texte. Après écriture, relire depuis la base et confirmer que l’empreinte du texte est inchangée.
7. **Pagination obligatoire.** Toute lecture Supabase susceptible de dépasser 1 000 lignes doit utiliser une pagination explicite et vérifier le compte final. La limite implicite de l’API ne doit jamais être interprétée comme la fin d’une œuvre ou d’un livre.
8. **Contrôles continus.** Après chaque grande division, exécuter un audit structurel et un sondage aléatoire. À la clôture, effectuer un sondage global, un contrôle ciblé des divisions insuffisamment échantillonnées, et vérifier cibles mortes, doublons, motifs vides, fiabilités, arbitrages et empreinte du texte.

`

const memoryBlock = `

${MEMORY_MARKER}

- Œuvre : \`A0010O0001\`, treize livres, 10 211 segments corporels, tous marqués relus.
- Résultat : 968 liens ; 526 types 1, 360 types 2, 47 types 3 et 35 types 4. 954 liens ont une cible vérifiée ; 14 arbitrages anciens restent volontairement sans cible parce que plusieurs loci identiques ne peuvent être départagés.
- Méthode : lecture intégrale des treize livres, manifestes par livre, simulation avant écriture, contrôle après chaque livre, sondages aléatoires réguliers, sondage final de 50 liens et contrôle ciblé de 12 liens du livre VIII.
- Les index CCEL et autres rappels secondaires ont été utiles pour le rappel, mais ils ont aussi contenu des omissions, des erreurs de référence et une accumulation parasite de toutes les références précédentes dans la dernière section. Le texte français, le latin associé et la Vulgate locale ont toujours arbitré.
- Les Psaumes ont exigé une recherche par libellé : les numéros modernes ont souvent dû être abaissés d’une unité pour rejoindre la numérotation locale de la Vulgate. Exemples contrôlés : Ps 114/115 → \`PSA.113.24\`, Ps 36 → \`PSA.35.7\` ou \`PSA.35.10\`, Ps 42/43 → \`PSA.41.*\` ou \`PSA.42.*\`.
- Une limite silencieuse de 1 000 lignes dans les lectures Supabase a tronqué une première lecture du livre X (1 480 segments). Le script générique a été corrigé pour paginer par tranches de 1 000 et vérifier le compte attendu. Cette pagination est désormais obligatoire pour toute œuvre longue.
- Contrôle final : zéro cible canonique morte, zéro doublon, zéro motif vide, 10 211/10 211 segments relus ; appels et définitions de notes concordants (7/7) ; texte inchangé, empreinte \`FEC108C539A7D3615BD405ADEC7476FBAE36BCF2241CEF1CCEE4B252171AB27D\`.
- Dossiers de preuve : \`tmp/confessions-links-2026-07-30/full-reading/\`, \`tmp/confessions-links-2026-07-30/review-dossiers/\` et manifestes \`book-01\` à \`book-13\`.
`

const { data, error } = await db.from('parametres').select('cle,valeur,mis_a_jour')
  .in('cle', ['charte_ia', 'feedback_liens_protocole'])
if (error) throw error
const map = new Map(data.map(row => [row.cle, row]))
const charter = map.get('charte_ia')
const memory = map.get('feedback_liens_protocole')
if (!charter || !memory) throw new Error('Charte ou mémoire absente')
if (charter.valeur.includes(CHARTER_MARKER) || memory.valeur.includes(MEMORY_MARKER)) throw new Error('Retour d’expérience déjà consigné')
const needle = '**Ordre recommandé des passes :**'
if (!charter.valeur.includes(needle)) throw new Error('Point d’insertion de la charte introuvable')
const charterAfter = charter.valeur
  .replace(/Mise à jour : \d{1,2} juillet 2026/, 'Mise à jour : 30 juillet 2026')
  .replace(needle, `${charterBlock}${needle}`)
const memoryAfter = `${memory.valeur.trimEnd()}${memoryBlock}\n`
const backup = {
  generated_at: new Date().toISOString(),
  reason: 'Retour d’expérience de la constitution intégrale des liens bibliques des Confessions.',
  before: {
    charte_ia: { mis_a_jour: charter.mis_a_jour, sha256: sha(charter.valeur), valeur: charter.valeur },
    feedback_liens_protocole: { mis_a_jour: memory.mis_a_jour, sha256: sha(memory.valeur), valeur: memory.valeur },
  },
  after_sha256: { charte_ia: sha(charterAfter), feedback_liens_protocole: sha(memoryAfter) },
}
mkdirSync('audit', { recursive: true })
writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  mode: APPLY ? 'apply' : 'dry', backup: BACKUP_PATH,
  before_sha256: Object.fromEntries(Object.entries(backup.before).map(([k, v]) => [k, v.sha256])),
  after_sha256: backup.after_sha256,
}, null, 2))
if (APPLY) {
async function guardedUpdate(row, value) {
  const { data: updated, error: updateError } = await db.from('parametres')
    .update({ valeur: value, mis_a_jour: new Date().toISOString() })
    .eq('cle', row.cle).eq('mis_a_jour', row.mis_a_jour).select('cle,valeur,mis_a_jour')
  if (updateError) throw updateError
  if (updated.length !== 1) throw new Error(`${row.cle} : précondition concurrente non satisfaite`)
}
await guardedUpdate(charter, charterAfter)
await guardedUpdate(memory, memoryAfter)

const subject = 'Charte et mémoire : liens bibliques des Confessions'
const { data: recent, error: recentError } = await db.from('journal_ia').select('id,sujet').order('id', { ascending: false }).limit(50)
if (recentError) throw recentError
let journal = recent.find(item => item.sujet === subject)
if (!journal) {
  const { data: inserted, error: journalError } = await db.from('journal_ia').insert({
    sujet: subject,
    probleme: 'Consignation des garde-fous et du bilan final de la constitution des liens bibliques des Confessions.',
    reponse: JSON.stringify({ backup_path: BACKUP_PATH, after_sha256: backup.after_sha256, links: 968, reviewed_segments: 10211 }),
    statut: 'sauvegarde',
  }).select('id').single()
  if (journalError) throw journalError
  journal = inserted
}
const { data: verified, error: verifyError } = await db.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole'])
if (verifyError) throw verifyError
const verifiedMap = new Map(verified.map(row => [row.cle, row.valeur]))
const checks = {
  charter_marker_once: verifiedMap.get('charte_ia').split(CHARTER_MARKER).length - 1 === 1,
  memory_marker_once: verifiedMap.get('feedback_liens_protocole').split(MEMORY_MARKER).length - 1 === 1,
  charter_hash: sha(verifiedMap.get('charte_ia')) === sha(charterAfter),
  memory_hash: sha(verifiedMap.get('feedback_liens_protocole')) === sha(memoryAfter),
}
if (Object.values(checks).some(value => !value)) throw new Error(`Vérification échouée : ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, checks }, null, 2))
}
