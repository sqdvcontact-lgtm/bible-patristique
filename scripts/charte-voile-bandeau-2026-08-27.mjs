/**
 * § 37 : l'encre du bandeau est toujours le crème, et c'est un VOILE qui la rend
 * lisible. La mesure de luminance et l'encre noire sont écartées.
 * Décision de l'auteur du 27 août 2026, qui jugeait le texte noir peu élégant.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-voile-bandeau-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Décision de l’auteur, l’essai fait : un bandeau occupe entièrement l’espace de son bloc. L’encart en portrait, lui, demeure — c’est là, et là seulement, que la notice porte une image détachée.'

const AJOUT = `

**L’encre du bandeau est TOUJOURS le crème, et c’est un VOILE qui la rend lisible.** Le bandeau mesurait auparavant la luminance de sa photo pour choisir entre une encre crème et une encre noire ; le noir revenait sur les images pâles — la Segond, son lac, son ciel. ⛔ Une encre noire cernée d’un halo blanc posée sur une peinture n’est pas une composition, c’est un pis-aller : elle est écartée, et la mesure de luminance avec elle — un décodage en canevas par notice et une dépendance au CORS en moins. C’est désormais un dégradé brun très sombre, ancré à gauche et éteint avant le milieu de l’image, qui fabrique le contraste que la peinture ne promet pas. Toutes les notices reçoivent ainsi le MÊME sol, quelle que soit la peinture qui les coiffe.

⚠️ Trois réglages tiennent avec lui. Le voile est BRUN, non noir : un noir neutre posé sur une peinture ancienne la refroidit et la fait paraître grise. L’ombre du texte se réduit à UNE couche courte, le voile portant le contraste : les trois halos de vingt pixels qui la précédaient bavaient autour des lettres et se lisaient comme une salissure. Et aucune ligne ne court au-delà du voile — la mesure du bloc de texte est bornée, si bien qu’une méta trop longue, celle de la Bible française du XIIIe siècle, se plie dans le sombre au lieu de finir sur les quadrilobes de l’enluminure. L’assombrissement général de l’image, lui, redevient léger : écrasé, il éteignait la moitié droite du tableau, qu’aucune ligne ne recouvre.

⚠️ Ces valeurs vivent dans un module partagé, non dans la page. L’aperçu de cadrage de l’administration se veut une COPIE EXACTE du bandeau public : deux jeux de constantes auraient dérivé au premier réglage, et l’administrateur aurait cadré sur un rendu qui n’existe pas.`

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
if (avant.includes('c’est un VOILE qui la rend lisible')) throw new Error('La règle du voile est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
