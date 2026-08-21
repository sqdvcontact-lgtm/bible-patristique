import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const MASTER_PATH = 'C:\\Corpus Scriptura\\Augustin\\Confessions-Saint-Augustin-Andilly-1649-MASTER.docx'
const MASTER_SHA256 = '3F1951259DC87AD2DDAB62179F2EDEB42165EA0CF4A6075AC198F596908F92BD'
const BACKUP_PATH = 'audit/charte_memory_before_confessions_master_source_2026-07-29.json'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const sha = (value) => createHash('sha256').update(value).digest('hex')

async function guardedUpdate(key, updatedAt, value) {
  const { data, error } = await db.from('parametres').update({ valeur: value, mis_a_jour: new Date().toISOString() }).eq('cle', key).eq('mis_a_jour', updatedAt).select('cle')
  if (error) throw error
  if (data.length !== 1) throw new Error(`${key} : précondition concurrente non satisfaite`)
}

async function main() {
  if (!readFileSync(MASTER_PATH).length) throw new Error('Maître vide')
  const actualHash = createHash('sha256').update(readFileSync(MASTER_PATH)).digest('hex').toUpperCase()
  if (actualHash !== MASTER_SHA256) throw new Error(`Empreinte du maître inattendue : ${actualHash}`)
  const { data, error } = await db.from('parametres').select('cle,valeur,mis_a_jour').in('cle', ['charte_ia', 'feedback_liens_protocole'])
  if (error) throw error
  const map = new Map(data.map((row) => [row.cle, row]))
  const charter = map.get('charte_ia')
  const memory = map.get('feedback_liens_protocole')
  const charterNeedle = '**Application prévue : Augustin, *Les Confessions*, traduction d’Arnauld d’Andilly.** Repartir de la nouvelle édition à localiser et identifier.'
  const charterReplacement = '**Application prévue : Augustin, *Les Confessions*, traduction d’Arnauld d’Andilly.** L’édition source est désormais fixée : seconde édition, Paris, veuve Jean Camusat et Pierre Le Petit, 1649. Le Word maître certifié sert de point de départ matériel.'
  const memoryNeedle = '- Témoin à retrouver : nouvelle édition de la traduction d’Arnauld d’Andilly.'
  const memoryReplacement = `- Témoin fixé : seconde édition, Paris, veuve Jean Camusat et Pierre Le Petit, 1649. Word maître : \`${MASTER_PATH}\`. SHA-256 : \`${MASTER_SHA256}\`. Le maître reste intact ; toute préparation se fait sur une copie.\n- Le Word contient la page de titre originale, l’Avis au lecteur avec ses mentions marginales, l’Approbation des Docteurs, le Privilege du Roy, le transport du privilege, l’achevé d’imprimer, les treize livres complets et le colophon. La Table des chapitres a été volontairement exclue du maître.`
  if (!charter.valeur.includes(charterNeedle) || !memory.valeur.includes(memoryNeedle)) throw new Error('Point de mise à jour introuvable ou déjà modifié')
  const charterAfter = charter.valeur.replace(charterNeedle, charterReplacement)
  const memoryAfter = memory.valeur.replace(memoryNeedle, memoryReplacement)
  const backup = { generated_at: new Date().toISOString(), master: { path: MASTER_PATH, sha256: MASTER_SHA256 }, before: { charte_ia: { mis_a_jour: charter.mis_a_jour, sha256: sha(charter.valeur), valeur: charter.valeur }, feedback_liens_protocole: { mis_a_jour: memory.mis_a_jour, sha256: sha(memory.valeur), valeur: memory.valeur } }, after_sha256: { charte_ia: sha(charterAfter), feedback_liens_protocole: sha(memoryAfter) } }
  mkdirSync('audit', { recursive: true })
  const backupJson = `${JSON.stringify(backup, null, 2)}\n`
  writeFileSync(BACKUP_PATH, backupJson)
  if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', master_sha256: actualHash, backup: BACKUP_PATH, after_sha256: backup.after_sha256 }, null, 2)); return }
  const { data: journal, error: journalError } = await db.from('journal_ia').insert({ sujet: 'Confessions d’Augustin - fixation du Word maître', probleme: 'Sauvegarde préalable à l’enregistrement du témoin maître des Confessions, traduction d’Arnauld d’Andilly, édition de 1649.', reponse: JSON.stringify({ master_path: MASTER_PATH, master_sha256: MASTER_SHA256, backup_path: BACKUP_PATH, backup_sha256: sha(backupJson) }), statut: 'sauvegarde' }).select('id').single()
  if (journalError) throw journalError
  await guardedUpdate('charte_ia', charter.mis_a_jour, charterAfter)
  await guardedUpdate('feedback_liens_protocole', memory.mis_a_jour, memoryAfter)
  const { data: verified, error: verifyError } = await db.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole'])
  if (verifyError) throw verifyError
  const vm = new Map(verified.map((row) => [row.cle, row.valeur]))
  const checks = { charter_hash: sha(vm.get('charte_ia')) === sha(charterAfter), memory_hash: sha(vm.get('feedback_liens_protocole')) === sha(memoryAfter), path_recorded: vm.get('feedback_liens_protocole').includes(MASTER_PATH), checksum_recorded: vm.get('feedback_liens_protocole').includes(MASTER_SHA256) }
  if (Object.values(checks).some((value) => !value)) throw new Error(`Vérification finale échouée : ${JSON.stringify(checks)}`)
  console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, master_sha256: actualHash, backup: BACKUP_PATH, checks }, null, 2))
}

main().catch((error) => { console.error(error); process.exit(1) })
