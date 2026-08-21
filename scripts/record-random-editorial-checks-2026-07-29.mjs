import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const BACKUP_PATH = 'audit/charte_memory_before_random_editorial_checks_2026-07-29.json'
const CHARTER_SENTENCE = '**Contrôles aléatoires intermédiaires.**'
const MEMORY_SENTENCE = '- Effectuer des contrôles aléatoires pendant le chantier, et non seulement à sa clôture.'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const sha = (value) => createHash('sha256').update(value).digest('hex')

async function updateGuarded(key, updatedAt, value) {
  const { data, error } = await db.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key).eq('mis_a_jour', updatedAt).select('cle,valeur,mis_a_jour')
  if (error) throw error
  if (data.length !== 1) throw new Error(`${key} : précondition concurrente non satisfaite`)
}

async function main() {
  const { data, error } = await db.from('parametres').select('cle,valeur,mis_a_jour').in('cle', ['charte_ia', 'feedback_liens_protocole'])
  if (error) throw error
  const map = new Map(data.map((row) => [row.cle, row]))
  const charter = map.get('charte_ia')
  const memory = map.get('feedback_liens_protocole')
  if (!charter || !memory) throw new Error('Charte ou mémoire absente')
  if (charter.valeur.includes(CHARTER_SENTENCE) || memory.valeur.includes(MEMORY_SENTENCE)) throw new Error('Règle déjà présente')

  const charterNeedle = '10 bis. Relecture des liens — comparer les id_verset attachés en lien_1/lien_2 au texte réel des versets correspondants (toutes traductions disponibles), avec attention particulière aux segments portant plusieurs id_verset sur une même colonne.'
  const charterAddition = `${charterNeedle}\n\n${CHARTER_SENTENCE} Pendant la correction, la structuration, la segmentation et l’import, prélever périodiquement des passages répartis entre les divisions déjà traitées. Conserver la graine ou la liste des passages tirés. Vérifier chaque passage contre le fac-similé : fidélité de l’OCR, limites de paragraphes, rangs, titres, notes, enrichissements et recomposition. Une erreur découverte dans le sondage déclenche un contrôle élargi des pages voisines et de tous les passages traités par la même règle depuis le sondage précédent ; on ne corrige jamais seulement l’exemple tiré au sort.`
  if (!charter.valeur.includes(charterNeedle)) throw new Error('Point d’insertion de la charte introuvable')
  const charterAfter = charter.valeur.replace(charterNeedle, charterAddition)

  const memoryNeedle = '- Le chantier des liens ne commence qu’après clôture explicite de l’établissement du texte et nouvelle instruction de Sébastien.'
  const memoryAddition = `${memoryNeedle}\n${MEMORY_SENTENCE} Le sondage doit couvrir plusieurs divisions et contrôler le texte contre le fac-similé, le paragraphage, les rangs, les titres, les notes et la recomposition. Consigner les passages tirés. Toute erreur impose d’élargir immédiatement la vérification aux passages voisins et aux données produites par la même règle.`
  if (!memory.valeur.includes(memoryNeedle)) throw new Error('Point d’insertion de la mémoire introuvable')
  const memoryAfter = memory.valeur.replace(memoryNeedle, memoryAddition)

  const backup = {
    generated_at: new Date().toISOString(),
    reason: 'Ajout des contrôles aléatoires intermédiaires demandés pour les travaux éditoriaux futurs.',
    before: {
      charte_ia: { mis_a_jour: charter.mis_a_jour, sha256: sha(charter.valeur), valeur: charter.valeur },
      feedback_liens_protocole: { mis_a_jour: memory.mis_a_jour, sha256: sha(memory.valeur), valeur: memory.valeur },
    },
    after_sha256: { charte_ia: sha(charterAfter), feedback_liens_protocole: sha(memoryAfter) },
  }
  mkdirSync('audit', { recursive: true })
  const backupJson = `${JSON.stringify(backup, null, 2)}\n`
  writeFileSync(BACKUP_PATH, backupJson)
  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', backup: BACKUP_PATH, before_sha256: { charte_ia: sha(charter.valeur), feedback_liens_protocole: sha(memory.valeur) }, after_sha256: backup.after_sha256 }, null, 2))
    return
  }

  const backupSha256 = sha(backupJson)
  const { data: journal, error: journalError } = await db.from('journal_ia').insert({
    sujet: 'Charte et mémoire - contrôles aléatoires intermédiaires',
    probleme: 'Sauvegarde préalable à l’ajout de sondages périodiques pendant les travaux éditoriaux, notamment pour les Confessions.',
    reponse: JSON.stringify({ backup_path: BACKUP_PATH, backup_sha256: backupSha256, before_sha256: { charte_ia: sha(charter.valeur), feedback_liens_protocole: sha(memory.valeur) }, after_sha256: backup.after_sha256 }),
    statut: 'sauvegarde',
  }).select('id').single()
  if (journalError) throw journalError
  await updateGuarded('charte_ia', charter.mis_a_jour, charterAfter)
  await updateGuarded('feedback_liens_protocole', memory.mis_a_jour, memoryAfter)

  const { data: verified, error: verifyError } = await db.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole'])
  if (verifyError) throw verifyError
  const verifiedMap = new Map(verified.map((row) => [row.cle, row.valeur]))
  const checks = {
    charter_once: verifiedMap.get('charte_ia').split(CHARTER_SENTENCE).length - 1 === 1,
    memory_once: verifiedMap.get('feedback_liens_protocole').split(MEMORY_SENTENCE).length - 1 === 1,
    charter_hash: sha(verifiedMap.get('charte_ia')) === sha(charterAfter),
    memory_hash: sha(verifiedMap.get('feedback_liens_protocole')) === sha(memoryAfter),
  }
  if (Object.values(checks).some((value) => !value)) throw new Error(`Vérification finale échouée : ${JSON.stringify(checks)}`)
  console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, backup: BACKUP_PATH, backup_sha256: backupSha256, checks }, null, 2))
}

main().catch((error) => { console.error(error); process.exit(1) })
