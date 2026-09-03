/**
 * § 35.18, précision du soir : la mesure de l'appareil en regard se pose sur le
 * bloc lui-même, qui reste frère de ses voisins ; l'enveloppe ne sert qu'aux
 * gravures et aux notes.
 *
 * Relevé de l'auteur le 3 septembre 2026 au soir : « un peu trop d'espace » sous
 * « 1. Le premier jour (1, 3-5) » et « 2. L’œuvre des six jours (1, 3-31) ».
 * L'enveloppe posée autour de chaque bloc coupait les règles de voisinage des
 * titres, qui portent sur des frères.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-appareil-regard-bloc-frere-2026-09-03.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'La mesure se pose sur le bloc lui-même, qui reste frère de ses voisins'

const ANCRE = `L’enveloppe est \`.cs-bible-regard\` (\`BibleBilingue\`, \`globals.css\`), et les deux mesures dont elle se déduit sont nommées une seule fois (\`--regard-numero\`, \`--regard-numero-gouttiere\`), pour que les deux fers ne se séparent pas au premier réglage.`

const REMPLACEMENT = `${MARQUE} : les règles de voisinage des titres — le blanc sous un titre qui se referme, deux titres qui ne s’ouvrent pas deux fois — portent sur des frères, et une enveloppe posée autour de chaque bloc les coupait en silence (relevé de l’auteur le soir même : 1,5 rem sous un titre de péricope au lieu de 0,5, 4 rem entre deux titres au lieu de 2,25). Une gravure et la série des notes, qu’aucune règle de voisinage ne nomme, prennent une enveloppe de même mesure (\`.cs-bible-regard\`). Les deux mesures dont tout cela se déduit sont nommées une seule fois (\`--regard-numero\`, \`--regard-numero-gouttiere\`), pour que les deux fers ne se séparent pas au premier réglage. ⚠️ Une enveloppe est une surface de plus, et une règle de blanc ne la connaît pas : c’est le § 35.17.3 pris par un quatrième bout.`

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
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(REMPLACEMENT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260903_avant_appareil_regard_bloc_frere'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
