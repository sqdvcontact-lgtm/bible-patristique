/**
 * § 35.18, seconde décision du jour : en lecture Latin-français, les versets
 * prennent la mesure de la page et l'appareil est bordé par le fer de leur texte.
 *
 * Décision de l'auteur du 3 septembre 2026, devant le premier résultat (appareil
 * à la mesure du bloc, versets à 52 rem) : « les versets dépassent trop ; élargir
 * le corps du texte, et réduire la largeur des versets bibliques, harmonieusement ».
 *
 * Le paragraphe qui posait la mesure du bloc est remplacé.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-appareil-regard-fer-2026-09-03.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'La règle est celle de la lecture simple, où le retrait désigne le verset'

const ANCRE = `La règle est désormais une seule : l’appareil garde la MESURE du bloc de lecture simple, 31,25 rem, et se centre sur la colonne. Il en reprend les coupures mêmes, et une gravure y retrouve sa taille, sa part se calculant sur son conteneur. Ce qui identifie ce corps de texte n’est pas la place qu’il occupe entre les colonnes, c’est sa mesure, la même dans les deux lectures. L’enveloppe est \`.cs-bible-regard\` (\`BibleBilingue\`, \`globals.css\`) : le pendant de l’axe de texte de la lecture simple, sans sa gouttière d’actions.`

const REMPLACEMENT = `L’appareil a d’abord pris la mesure du bloc de lecture simple, 31,25 rem, centrée sur la colonne ; devant le résultat, l’auteur a tranché le même jour : « les versets dépassent trop ; élargir le corps du texte, et réduire la largeur des versets bibliques, harmonieusement ». ${MARQUE}. Les versets prennent la mesure de la PAGE, 38,75 rem, au lieu des 52 rem des œuvres, et se posent sur l’axe du texte, celui du titre du chapitre. L’appareil est bordé par le FER DU TEXTE des versets : la mesure de la page moins, de chaque côté, la colonne du numéro et sa gouttière, soit 34,9 rem. Les numéros pendent dans la marge de l’appareil, à gauche comme à droite, et la page n’a qu’un fer. Mesuré sur un écran de 2 560 pixels : les versets passent de 1 144 à 853 pixels, l’appareil de 688 à 768, et le fer de l’appareil tombe sur celui du texte français au pixel près. Une gravure y retrouve sa taille, sa part se calculant sur son conteneur. L’enveloppe est \`.cs-bible-regard\` (\`BibleBilingue\`, \`globals.css\`), et les deux mesures dont elle se déduit sont nommées une seule fois (\`--regard-numero\`, \`--regard-numero-gouttiere\`), pour que les deux fers ne se séparent pas au premier réglage.`

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
const cleSauvegarde = 'charte_ia_sauvegarde_20260903_avant_appareil_regard_fer'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
