/**
 * § 35.18 : en lecture Latin-français, l'appareil sort des colonnes mais garde la
 * MESURE de la lecture simple.
 *
 * Décision de l'auteur du 3 septembre 2026, revenant sur la pleine largeur du
 * 20 août : « toute la largeur, c'est trop, pas naturel pour un corps de texte ;
 * il faut, pour ces styles-là, réduire la largeur maximale ».
 *
 * La charte ne portait pas la règle du 20 août (elle vivait dans AGENTS.md) : on
 * n'a donc rien à remplacer, on AJOUTE une sous-section à la fin du § 35.17, avant
 * le § 35.4.3 qui le suit dans l'ordre du texte.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-appareil-regard-mesure-2026-09-03.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 35.18. L’appareil en regard garde la MESURE de la lecture simple'

// La section qui suit le § 35.17.4 dans l'ordre du texte : on insère avant elle.
const ANCRE = '\n### 35.4.3. Corps des introductions longues'

const AJOUT = `
${MARQUE}

⛔ **En lecture Latin-français, un bloc de l’appareil sort des colonnes, mais il ne prend pas toute leur largeur** (décision de l’auteur, 3 septembre 2026, revenant sur celle du 20 août : « toute la largeur, c’est trop, pas naturel pour un corps de texte ; il faut, pour ces styles-là, réduire la largeur maximale »). Le 20 août, on avait sorti introductions, commentaires et notices des colonnes pour qu’une colonne vide ne leur fasse pas face ; on les avait du même geste étalés sur les 52 rem des deux colonnes. Mesuré sur un écran de 2 560 pixels, racine 22 : le paragraphe d’introduction de la Genèse y faisait cent vingt-quatre signes par ligne, contre quatre-vingt-trois dans la lecture simple, et tout l’appareil se composait sur cette largeur, titres et gravures compris.

La règle est désormais une seule : l’appareil garde la MESURE du bloc de lecture simple, 31,25 rem, et se centre sur la colonne. Il en reprend les coupures mêmes, et une gravure y retrouve sa taille, sa part se calculant sur son conteneur. Ce qui identifie ce corps de texte n’est pas la place qu’il occupe entre les colonnes, c’est sa mesure, la même dans les deux lectures. L’enveloppe est \`.cs-bible-regard\` (\`BibleBilingue\`, \`globals.css\`) : le pendant de l’axe de texte de la lecture simple, sans sa gouttière d’actions.

⚠️ Deux colonnes de commentaire à la manière du fac-similé de Fillion ont été maquettées le même jour, sur la page réelle, et écartées : elles remplissaient la largeur, quand la largeur elle-même était le défaut. ⚠️ Sur téléphone, où les colonnes sont empilées à la largeur de l’écran, rien ne se borne.
`

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
const apres = avant.split(ANCRE).join(`${AJOUT}${ANCRE}`)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// Sauvegarde de la ligne avant écriture, comme la charte l'exige.
const cleSauvegarde = 'charte_ia_sauvegarde_20260903_avant_appareil_regard_mesure'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
