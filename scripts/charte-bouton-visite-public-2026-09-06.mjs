/**
 * § 46 : le bouton qui rejoue la visite paraît pour TOUT LE MONDE, sur les pages
 * qui en offrent une. Décision de l'auteur du 6 septembre 2026, au soir.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-bouton-visite-public-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LE BOUTON QUI LA REJOUE EST AU LECTEUR'

const ANCRE = 'On la rejoue par le bouton « Visite » de la barre de navigation, qui ne paraît qu’à l’administration et que sur une page qui en offre une, ou par l’adresse `?visite=1`. ⛔ Ce bouton est un outil d’atelier : il suit l’affichage administrateur, et disparaît dès que celui-ci se met à voir le site en lecteur. ⚠️ Le passage se retient dans le navigateur, non dans le compte : la visite s’adresse d’abord à qui n’en a pas.'

const TEXTE = [
  'On la rejoue par le bouton « Visite » de la barre de navigation, ou par l’adresse `?visite=1`. ⚠️ Le passage se retient dans le navigateur, non dans le compte : la visite s’adresse d’abord à qui n’en a pas.',
  '',
  '⛔ **LE BOUTON QUI LA REJOUE EST AU LECTEUR, et il paraît pour tout le monde.** Il fut d’abord un outil d’atelier, réservé à l’administration ; mais une visite ne se montre qu’une FOIS, et rien ne la rendait à qui l’avait passée trop vite ou voulait la revoir — une adresse ne s’invente pas. ⚠️ Sa place est donc parmi les outils du lecteur, et non dans le bloc d’administration où il est né. ⛔ Il ne paraît QUE là où une page en offre une : un contrôle sans effet sur les trois quarts du site serait une promesse en l’air.',
].join('\n')

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(MARQUE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error('ancre : ' + n + ' occurrence(s), 1 attendue.')
const apres = avant.split(ANCRE).join(TEXTE)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_bouton_public'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
// ⚠️ Le contrôle vise la PHRASE d’avant, non les mots « outil d’atelier » : le texte
// neuf les reprend pour dire d’où le bouton vient, et un contrôle réglé dessus
// s’alarmerait de sa propre écriture.
if (relu.valeur.includes('il suit l’affichage administrateur')) throw new Error('relecture : la règle d’avant subsiste.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
