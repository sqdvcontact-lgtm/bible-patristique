/**
 * Charte — § 50.6 : deux décalages de la Vulgate, corrigés.
 *
 * ⛔ La doctrine vit dans Supabase `parametres.charte_ia`, et nulle part ailleurs.
 * `charte/CHARTE_IA.md` n'en est qu'un miroir, régénéré par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 *
 * Ce script AJOUTE une section à la fin. Il ne réécrit rien : les quatre garde-fous du
 * script de synchronisation sont repris ici, et il refuse d'écrire si l'un cède.
 *
 *   node --env-file=.env.local scripts/charte-realignement-vulgate-2026-09-07.mjs [--ecrire]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ECRIRE = process.argv.includes('--ecrire')
const CLE = 'charte_ia'
const SAUVEGARDE = 'charte_ia_sauvegarde_20260907_realign_vulgate'

// La prose de la charte vit dans un FICHIER, non dans un gabarit de chaine.
// Un accent grave y ferme le gabarit, et cette doctrine en cite douze : le piege
// que la charte elle-meme consigne depuis le 2026-08-28, paye une fois de plus ici.
const SECTION = readFileSync(new URL('./charte-38-30-realignement-vulgate.md', import.meta.url), 'utf8')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !service) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
const db = createClient(url, service, { auth: { persistSession: false } })

const { data: avant, error: erLecture } = await db
  .from('parametres').select('valeur, mis_a_jour').eq('cle', CLE).single()
if (erLecture) throw erLecture

const distant = avant.valeur
const attendu = distant.trimEnd() + '\n' + SECTION

// Garde 1 — la section ne doit pas déjà être là.
if (distant.includes('### 38.30 Deux décalages de la Vulgate')) {
  console.log('⚠️  La section § 50.6 est déjà dans la charte : rien à faire.')
  process.exit(0)
}
// Garde 2 — le texte nouveau PROLONGE le distant, il ne le réécrit pas.
if (!attendu.startsWith(distant.trimEnd())) throw new Error('le texte ne prolonge pas le distant')
// Garde 3 — on n'ajoute que ce qu'on a écrit.
const ajoute = attendu.length - distant.trimEnd().length
if (ajoute !== SECTION.length + 1) throw new Error(`ajout inattendu : ${ajoute} signes`)

console.log(`charte : ${distant.length} signes, mise à jour le ${avant.mis_a_jour}`)
console.log(`ajout  : ${SECTION.length} signes (§ 50.6)`)
if (!ECRIRE) { console.log('\n(simulation — relancer avec --ecrire)'); process.exit(0) }

// Sauvegarde de la ligne AVANT toute écriture.
const { error: erSauve } = await db.from('parametres')
  .upsert({ cle: SAUVEGARDE, valeur: distant }, { onConflict: 'cle' })
if (erSauve) throw erSauve

// Verrou optimiste : on n'écrit que si la ligne n'a pas bougé entre-temps.
const { data: ecrit, error: erEcriture } = await db.from('parametres')
  .update({ valeur: attendu })
  .eq('cle', CLE).eq('mis_a_jour', avant.mis_a_jour)
  .select('cle')
if (erEcriture) throw erEcriture
if (!ecrit?.length) throw new Error('la charte a changé entre la lecture et l’écriture : rien n’a été écrit')

// Double relecture.
const { data: apres, error: erRelecture } = await db
  .from('parametres').select('valeur').eq('cle', CLE).single()
if (erRelecture) throw erRelecture
if (apres.valeur !== attendu) throw new Error('relecture : le texte écrit ne correspond pas')
console.log(`✅ charte écrite : ${apres.valeur.length} signes. Sauvegarde : ${SAUVEGARDE}`)
console.log('   Tirer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
