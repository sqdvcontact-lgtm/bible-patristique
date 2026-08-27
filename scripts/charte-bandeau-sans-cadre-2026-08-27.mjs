/**
 * § 37 : le cadre du bandeau est écarté. Le bandeau prend TOUT son bloc, ouvert
 * comme fermé. L'encart en portrait, lui, reste. Décision de l'auteur du
 * 27 août 2026, prise après essai.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-bandeau-sans-cadre-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const AVANT = '**Le bandeau prend son cadre en s’ouvrant.** Fermé, il tient toute la carte, bord à bord. Déplié, il recule de dix pixels sur ses quatre côtés : le fond de la carte passe derrière lui et lui tient lieu de passe-partout, un filet le borde, une ombre courte le décolle. La carte gagne alors exactement ces vingt pixels de haut, si bien que l’IMAGE ne change pas de taille — elle recule, elle ne rétrécit pas. ⚠️ Le titre et le chevron entrent avec elle : laissés à leur place ancienne, ils se seraient trouvés à cheval sur le passe-partout, moitié sur l’image, moitié sur le fond de la carte. Et le voile dégradé qui porte le titre vit DANS le cadre : posé par-dessus toute la carte, il grisait aussi le passe-partout, et le cadre se perdait dans une tache au lieu de se détacher.'

const APRES = '**Le bandeau prend TOUT son bloc, ouvert comme fermé.** Il tient la carte bord à bord, sans marge ni filet, et le titre s’écrit sur l’image même, non sur une marge. ⛔ Le cadre a été essayé puis écarté le 27 août 2026 : déplié, le bandeau reculait de dix pixels sur ses quatre côtés, le fond de la carte lui tenant lieu de passe-partout, un filet le bordant et le titre entrant avec lui. Décision de l’auteur, l’essai fait : un bandeau occupe entièrement l’espace de son bloc. L’encart en portrait, lui, demeure — c’est là, et là seulement, que la notice porte une image détachée.'

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
