/**
 * § 3.8 : le NUMÉRO du verset dans une citation posée verset par verset — où il
 * s'écrit, et dans quelle face il se rend.
 * Décision de l'auteur du 28 août 2026 : « la mise en forme doit être la même, de
 * visu, que notre mise en forme de la page bible », le numéro de verset prenant la
 * place du numéro de segment dans le bloc.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-numero-verset-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

// Fin du paragraphe posé le même jour sur la citation en versets.
const ANCRE = 'car c’est la citation qui est un paragraphe, non chacun de ses versets.'

const AJOUT = `

**Le numéro du verset s’écrit à la main, dans \`segment_metadata.biblical_verse_number\`.** ⛔ Il ne se devine pas : ni au nombre placé en tête du segment, puisqu’un verset peut commencer par un nombre — « Quarante jours et quarante nuits… » —, ni au lien biblique, qui relève d’un travail de liaison distinct et n’est pas toujours fait. Une édition qui n’imprime pas les numéros n’en reçoit pas : la case reste vide et le bloc se lit sans eux. ⚠️ La clé \`verse_number\` est déjà prise et veut dire autre chose : elle porte le rang du VERS dans son poème, chez Ceriziers. Un vers n’est pas un verset, et mêler les deux mêlerait la numérotation d’un mètre de Boèce à celle d’un chapitre d’Isaïe.

Le numéro se rend dans la **face de la page Bible** — même graisse, même teinte effacée, même rapport de corps au texte qu’il accompagne. La page Bible le pose dans une gouttière, à droite d’une colonne étroite ; dans un bloc de versets, cette gouttière se battrait avec le retrait gauche, et le numéro passe donc en **exposant**, sans changer de face pour autant. ⚠️ L’exposant se cale comme partout ailleurs sur le site, par un déport et non par \`vertical-align\`, faute de quoi il gonflerait la boîte de ligne et rouvrirait le blanc entre versets, qui est léger. Enfin, le numéro de SEGMENT s’efface dans le bloc : deux nombres en exposant sur la même ligne ne se lisent pas, et c’est le verset que le lecteur cherche.`

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
if (avant.includes('biblical_verse_number')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n\'a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
