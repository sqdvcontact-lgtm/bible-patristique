/**
 * Inscrit dans la charte la consigne particulière que sa propre règle appelait.
 *
 * La charte conserve la ponctuation attestée d'un titre, et n'admet une normalisation
 * différente « que lorsqu'une consigne éditoriale particulière l'ordonne explicitement
 * pour un périmètre défini ». Le code retirait pourtant le point final PARTOUT, sans
 * qu'aucune consigne ne le prévoie : conflit relevé le 2026-08-24, tranché par l'auteur
 * — « sansPointFinal n'est valable que pour la page de titre, plus pour le reste des
 * titres ». On écrit donc le périmètre, et il est le seul.
 *
 * ⛔ Écrit dans SUPABASE, qui est l'unique boîte à règles. Le miroir se tire ensuite
 * par `node scripts/synchroniser-charte-supabase.mjs --pull`.
 *
 * Usage : node scripts/charte-point-final-page-de-titre-2026-08-24.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Une normalisation différente n’est admise que lorsqu’une consigne éditoriale particulière l’ordonne explicitement pour un périmètre défini.'
const AJOUT = [
  ANCRE,
  'Ce périmètre est défini, et il est le seul : la **page de titre**. Le frontispice d’une œuvre est une composition, et son titre, son sous-titre et son commentaire de traduction n’y portent pas de point final. Partout ailleurs — titres de niveau du corps, fiche d’auteur, recherche, listes — la ponctuation attestée est conservée telle quelle.',
].join(' ')

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur

if (avant.includes('Ce périmètre est défini, et il est le seul')) throw new Error('La consigne est déjà inscrite.')
const trouvees = avant.split(ANCRE).length - 1
if (trouvees !== 1) throw new Error(`L’ancre se trouve ${trouvees} fois, 1 attendue.`)

const apres = avant.split(ANCRE).join(AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Charte Supabase écrite. Tirer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
process.exit(0)
