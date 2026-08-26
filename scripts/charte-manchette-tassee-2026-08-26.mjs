/**
 * Reprend le § 35.9 : la manchette ne se justifie pas. Mesuré espace par espace,
 * le justifié étirait jusqu'à 1,609 em là où le quart de cadratin est la limite.
 * Elle se ferre à droite, sa césure resserrée remplit les lignes, et ses espaces
 * gardent leur chasse.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-manchette-tassee-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = 'Elle se compose en PAVÉ : justifiée comme le commentaire qu’elle ouvre, sa dernière ligne ferrée à droite pour que son bord longe le fer du texte, et d’une conduite serrée, plus courte que celle du commentaire, qui la fait tenir en bloc au lieu de s’étaler. Ce sont alors ses lignes courtes qui s’ouvrent du côté de la marge, où le blanc ne se voit pas. ⚠️ La césure entre ici pour la raison même qui la faisait refuser ailleurs : sur dix-sept signes, c’est elle qui rend ce justifié tenable, là où elle hacherait un repère ferré.'

const APRES = [
  'Elle se compose en PAVÉ TASSÉ : ferrée à droite, contre la gouttière, et d’une conduite serrée, plus courte que celle du commentaire, qui la fait tenir en bloc au lieu de s’étaler. Ce sont ses lignes courtes qui s’ouvrent du côté de la marge, où le blanc ne se voit pas.',
  '',
  '⛔ Elle ne se justifie PAS, et aucune manchette ne se justifiera. La règle vient de la mesure, prise espace par espace avec un intervalle posé sur chacune : justifiée dans une colonne de sept rem, la plus large atteignait **1,609 em**, six fois le quart de cadratin, et 96 % des espaces du commentaire qui la longe dépassaient ce quart. ⚠️ Aucune propriété CSS ne borne cet étirement : c’est la mécanique même du justifié, qui répartit le manque sur les espaces d’une ligne. Une colonne étroite n’en a pas assez pour l’absorber.',
  '',
  'La césure fait alors le travail que la justification faisait : elle REMPLIT les lignes, si bien que le bord libre reste presque droit sans qu’une seule espace ait été étirée. Elle est resserrée pour tasser davantage — un mot de cinq lettres est coupable, trois lettres de part et d’autre. L’espace de la Source Sans chassant 0,279 em, un retrait de 0,03 em la ramène au QUART DE CADRATIN. ⛔ Ne pas serrer en deçà : sous le quart, les mots se soudent.',
].join('\n')

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
const n = avant.split(AVANT).length - 1
if (n !== 1) throw new Error(`motif : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(AVANT).join(APRES)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Le § 35.9 dit le pavé tassé. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
