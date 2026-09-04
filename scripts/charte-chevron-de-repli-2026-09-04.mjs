/**
 * § 38.5, suite : le chevron de repli se pose dans le coin INTÉRIEUR du volet, et
 * « Responsable de l'édition » quitte la fiche.
 *
 * Deux demandes de l'auteur du 4 septembre 2026, au soir.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-chevron-de-repli-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UN CONTRÔLE NE SE RANGE PAS DANS UN OBJET QUI EN PORTE DÉJÀ'

// Ancre : la dernière phrase du § 38.5, recopiée de `parametres.charte_ia`.
const ANCRE = 'un contrôle qui change de bout d’écran ne s’apprend jamais.'

const SECTION = `

⛔ **${MARQUE}.** La flèche qui replie le volet de gauche vivait au bout du CHAMP DE RECHERCHE, et l'auteur l'a cherchée sans la voir : à cet endroit, un chevron de quatorze pixels se lit comme une marque du champ — une croix d'effacement, une loupe —, non comme un contrôle du volet. Elle se pose dans le COIN INTÉRIEUR du volet, au bout de la ligne du nom, là où celui de la Polyglotte se tient depuis toujours et où le volet de droite porte le sien : le nom à gauche, le repli à sa droite, et il pointe vers le bord où le volet va se ranger. ⚠️ Il ne se confond pas avec la flèche qui annonce une fiche : celle-là suit le TEXTE, à l'intérieur du lien ; celui-ci se tient au BORD de la carte.

⚠️ **ET UN CONTRÔLE DE QUATORZE PIXELS NE PREND PAS L'ENCRE LA PLUS TÉNUE DE L'ÉCHELLE.** Un rang au-dessus, et l'accent au survol, qui dit qu'on peut le toucher. ⛔ La couleur se déclare dans la FEUILLE : posée en style en ligne, elle battrait la règle de survol — le piège est payé quatre fois dans ce dépôt.

⛔ **UNE RUBRIQUE NE REDIT PAS CE QUE LA FICHE PORTE EN TÊTE.** « Responsable de l'édition » quitte « Édition et état du texte » (« fait un peu tache ; supprimer ») : il portait le plus souvent le nom déjà écrit deux centimètres plus haut — « Louis-Claude Fillion ; édition numérique : Corpus Scriptura » sous « Traduction de Louis-Claude Fillion ». ⚠️ Le champ reste LU : il nomme le responsable d'une ÉDITION CRITIQUE dans l'intitulé qui suit le nom, là où il apprend quelque chose.`

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
const apres = avant.split(ANCRE).join(ANCRE + SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_chevron_repli'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
