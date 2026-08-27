/**
 * § 37 : le fond d'une fiche porte un ENDUIT — deux bruits fractals gris, très
 * faibles —, et le ton remonte à 94 % de clarté, l'enduit assombrissant déjà.
 * Décision de l'auteur du 27 août 2026.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-enduit-fresque-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = 'À 91 % le ton se voit sans que la fiche cesse d’être claire — la Bible de Sacy y donne un ivoire chaud, rgb(240 233 224), qui s’accorde à la terre cuite de son portrait.'

const APRES = `À 91 % le ton se voyait enfin ; il est remonté à 94 % le jour où l’enduit est venu, le gris de celui-ci assombrissant déjà le fond de son côté. La Bible de Sacy y donne un ivoire chaud, rgb(245 241 234), qui s’accorde à la terre cuite de son portrait.

**Le fond porte un ENDUIT.** Deux bruits fractals gris se posent sur le ton : un grain serré, qui donne le sable de l’enduit, et une nuée large, qui donne les inégalités de la pose. ⛔ Un seul ne suffit pas — le grain seul fait du bruit de capteur, la nuée seule fait une tache. Tous deux sont désaturés, la couleur venant de la teinte et jamais de la texture, et posés autour de cinq pour cent : au-delà, ce n’est plus une fresque, c’est du papier peint. ⚠️ Le bruit étant gris, il assombrit un fond clair et ÉCLAIRCIT un fond sombre, et il se voit deux fois plus au Cuir pour la même opacité : l’enduit y est donc dessiné à part, deux fois plus discret. Aucun fichier image n’est déposé pour cela — le motif est un SVG écrit en ligne, de deux cents octets, qui se répète sans couture.`

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
