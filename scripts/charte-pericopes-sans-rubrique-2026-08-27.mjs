/**
 * § 36 : la liste qu'une barre de filtres commande ne redit pas ce que la barre
 * dit. Retrait de la rubrique de Testament du catalogue des péricopes.
 * Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-pericopes-sans-rubrique-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Le dessin est le même, l’annonce ne l’est pas.'

const AJOUT = `

⛔ **Et la liste qu’une telle barre filtre ne REDIT pas ce que la barre dit.** Le catalogue des péricopes portait, sous « Tout », une rubrique « Ancien Testament » puis « Nouveau Testament », en capitales espacées et suivies d’un filet, qui coupait en deux la course des livres. Elle ne paraissait déjà plus lorsqu’un seul testament était à l’écran — l’onglet le nommant — ; elle est maintenant retirée aussi de « Tout ». La liste court d’une seule venue, de la Genèse à l’Apocalypse. L’ordre des livres marque le passage à qui le cherche, les onglets l’isolent à qui le veut, et une barre de titre au milieu de la course n’ajoutait qu’une halte.

⚠️ Le volet « Aller à un livre » garde, lui, ses deux intitulés. Là, ils ne coupent rien : ils rangent une grille d’abréviations sur quatre colonnes, où l’ordre seul ne suffirait pas à s’orienter. Une rubrique qui ORIENTE n’est pas une rubrique qui SÉPARE.`

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
if (avant.includes('ne REDIT pas ce que la barre dit')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
