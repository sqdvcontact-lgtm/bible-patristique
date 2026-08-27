/**
 * § 34 : le monogramme du frontispice est posé en MASQUE — une seule planche
 * pour les deux thèmes —, et son encre descend d'un cran, du fonce au normal.
 * Décision de l'auteur du 27 août 2026 : « une couleur légèrement plus douce ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-monogramme-masque-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = 'La planche du monogramme seul est le logo. Son détourage ne sert que la couche de transparence : la couleur, on la repose. Le monogramme prend donc l’encre du titre là où il paraît sur le papier, et le crème là où il paraît sur la barre verte. L’encre de la planche est un noir franc qui jurerait avec le vert d’encre des lettres.'

const APRES = `La planche du monogramme seul est le logo. Son détourage ne sert que la couche de transparence : la couleur, on la repose. Le monogramme prend donc l’encre du titre là où il paraît sur le papier, et le crème là où il paraît sur la barre verte. L’encre de la planche est un noir franc qui jurerait avec le vert d’encre des lettres.

⛔ **« On la repose » se prend au pied de la lettre : la planche est posée en MASQUE, et c’est le fond de l’élément qui peint.** Le frontispice de l’accueil superposait deux planches, l’une en vert d’encre pour le Clair, l’autre en crème pour le Cuir, le thème n’en montrant qu’une — pour éviter qu’un choix en JavaScript ne la fasse paraître après la peinture. Leurs canaux alpha sont rigoureusement identiques, vérifié pixel à pixel, aucun écart : une seule suffit donc, et la couleur devient une valeur qu’on règle au lieu d’une image qu’il faut redessiner. Le Cuir garde exactement sa teinte, écrite en valeur littérale, et l’on économise une requête. ⚠️ Ce qui vaut pour le frontispice ne vaut pas pour la barre de navigation, où la planche crème reste une image : elle y est peinte sur un aplat vert, et non sur le papier.

⚠️ **L’encre du monogramme se tient UN CRAN au-dessus de celle du titre qu’il surmonte.** Elle valait exactement la même — le noir vert le plus sombre de la palette —, et le trait d’une lettre ornée étant plus épais que celui d’un titre, la marque pesait davantage que ce qu’elle annonce. Un cran plus doux la remet à sa place d’enseigne.`

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
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
