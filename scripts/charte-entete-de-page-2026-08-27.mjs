/**
 * § 36 : ce qui surmonte une barre d'onglets se compose partout de la même
 * façon — un titre, un rythme chiffré, et aucun ornement intercalé.
 * Décision de l'auteur du 27 août 2026 (retrait du losange de la Communauté).
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-entete-de-page-2026-08-27.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Deux dessins sans rapport ne partagent pas un nom de classe.'

const AJOUT = `

**Ce qui SURMONTE la barre se compose aussi partout de la même façon.** Un titre de page, puis la barre, et un rythme chiffré : vingt-deux pixels au-dessus du titre, quatorze entre le titre et la barre, quatorze sous elle. Le titre s’y compose sur un interligne de 1,1 et une chasse de 0,01 em — un interligne normal lui donnait quarante-deux pixels de haut pour vingt-huit de corps, soit onze pixels de blanc que rien ne justifiait. ⛔ Et le décalage sous la barre de navigation fixe ne se repose PAS sur la page : il est posé une seule fois pour tout le site, par \`#cs-corps\` ; le répéter le compte deux fois.

⛔ **Aucun ornement ne s’intercale entre le titre et la barre.** La Communauté portait un losange d’or sous le sien, la Bibliothèque n’en portait pas : deux pages sœurs ne s’annoncent pas de deux façons. Le losange a été retiré le 27 août 2026. ⚠️ Il tenait à lui seul l’écart entre le titre et la barre — un ornement qui sert de cale n’est plus un ornement ; l’écart est désormais une marge chiffrée, et il se lit dans le code.

⚠️ **La MESURE, elle, ne se copie pas.** La Communauté range trois couvertures de front et prend 71 rem ; la Bibliothèque n’a que du texte à ranger et en prend 56,25. C’est le rythme vertical qui est commun aux deux, non la largeur — chaque page prend la mesure de ce qu’elle contient, et sa barre la mesure de ce qu’elle commande.`

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
if (avant.includes('Ce qui SURMONTE la barre')) throw new Error('La règle est déjà posée.')
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
