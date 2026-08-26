/**
 * Reprend le § 35.9 après l'audit d'aplomb : la manchette tient une COLONNE et se
 * ferre à droite. Sa largeur ne suit plus son texte — seule sa hauteur reste libre.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; `charte/CHARTE_IA.md` s'en régénère
 * (`synchroniser-charte-supabase.mjs --pull`). Refuse d'écrire si le motif ne se
 * trouve pas exactement une fois.
 *
 * Usage : node scripts/charte-manchette-colonne-2026-08-26.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = 'La boîte n’a pas de taille imposée : elle épouse son texte et ne s’arrête qu’à la colonne de manchette, si bien qu’un repère d’un mot n’ouvre aucun vide à sa droite et qu’un repère de six lignes descend d’autant.'

const APRES = 'La manchette tient une COLONNE, et sa largeur ne suit pas son texte. ⚠️ Éprouvé au fil à plomb sur trois blocs qui se suivent : quand elle le suivait, le fer du commentaire sautait d’un bloc à l’autre et la page perdait son aplomb. Sa hauteur, en revanche, reste libre — ⛔ aucune taille imposée, c’est le texte qui la donne, et un repère d’un mot n’ouvre aucun vide sous lui. Manchette de gauche, elle se ferre à DROITE, contre la gouttière : son bord net longe ainsi le fer du commentaire, et ce sont ses lignes courtes qui s’ouvrent du côté de la marge, où le blanc ne se voit pas. Ses lignes s’égalisent enfin, pour ne pas laisser une veuve d’un mot contre ce bord.'

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
const trouvees = avant.split(AVANT).length - 1
if (trouvees !== 1) throw new Error(`motif : ${trouvees} occurrence(s), 1 attendue.`)
const apres = avant.split(AVANT).join(APRES)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: erreurEcriture } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Le § 35.9 dit la colonne. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
