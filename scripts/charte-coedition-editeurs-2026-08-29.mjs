/**
 * § 35.6.4 : « A ; B » n’est pas une maison, c’est une COÉDITION.
 *
 * Règle donnée par l’auteur le 29 août 2026 : le point-virgule est la norme pour dire
 * que deux éditeurs différents ont travaillé au même ouvrage. Une forme composée n’est
 * donc jamais le nom d’une maison, et n’a pas sa place dans la liste des éditeurs
 * normalisés — elle se traite, maison par maison.
 *
 * ⛔ N’écrit QUE dans `parametres.charte_ia` ; le miroir s’en régénère.
 * Usage : node scripts/charte-coedition-editeurs-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Le découpage en co-éditeurs n’est donc qu’un REPLI, pour la forme composée que la table ne répertorie pas.'

const AJOUT = `

**Le « ; » sépare deux MAISONS, il n’entre jamais dans le nom de l’une.** Deux éditeurs qui ont travaillé au même ouvrage se notent « A ; B » : c’est la norme du catalogage. ⛔ Une telle forme n’est donc pas une autorité et n’a pas sa place dans la liste des éditeurs normalisés. Elle se TRAITE : on ouvre ou l’on réemploie chaque maison — celle qui est déjà répertoriée, fût-ce sous une variante, ne se crée pas une seconde fois —, puis la forme composée disparaît. ⚠️ Une partie qui n’est pas une maison — une mention de diffusion, d’impression ou de réédition — se retire de la forme AVANT de la séparer : elle ne devient pas une autorité, et l’on aurait remplacé une fiche parasite par une autre. ⚠️ Une VARIANTE composée demeure licite, et la distinction porte : « Veuve Jean Camusat ; Pierre Le Petit » est une graphie d’une maison UNIQUE, dont l’enseigne associe deux noms ; le verrou ne regarde donc que le nom.

**À l’affichage, une coédition ne se rend jamais telle quelle.** Chaque maison se résout pour son propre compte et la barre oblique les joint, que la forme composée ait été laissée dans la table par un import ou qu’elle n’y ait jamais figuré. ⚠️ La barre, elle, ne sépare rien : elle appartient à de vrais noms de maison — « Centre Thomas More / CADIR », « Leuven University Press / Peeters » — et ne décide de rien.`

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

const n = data.valeur.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre § 35.6.4 : ${n} occurrence(s), 1 attendue.`)
if (data.valeur.includes('n’entre jamais dans le nom de l’une')) {
  console.log('La règle est déjà dans la charte : rien à écrire.')
  process.exit(0)
}

const texte = data.valeur.replace(ANCRE, ANCRE + AJOUT)
console.log(JSON.stringify({ avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu, error: err2 } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (err2) throw err2
if (relu.valeur !== texte) throw new Error('la relecture ne rend pas le texte écrit.')
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
