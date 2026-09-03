/**
 * § 35.17.5 : un bloc de SUITE ne rouvre pas le blanc de son rang ; et le blanc
 * sous une sous-section vaut 0,6 rem sur les deux surfaces.
 *
 * Relevés de l'auteur du 3 septembre 2026, sur l'introduction de la Genèse lue en
 * regard : « Les sources de la Genèse : il faut plus de blanc après ce style » ;
 * « les blancs entre les paragraphes de même style sont trop importants ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-bloc-de-suite-2026-09-03.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '#### 35.17.5. Un bloc de SUITE ne rouvre pas le blanc de son rang'

// La section qui suit : on insère avant elle.
const ANCRE = '\n### 35.18. L’appareil en regard garde la MESURE de la lecture simple'

const AJOUT = `
${MARQUE}

⛔ **Deux blocs d’information de même rang et de même nature qui se suivent, le second sans intitulé, sont deux PARAGRAPHES d’un même développement, et se séparent du blanc d’un paragraphe** (relevé de l’auteur, 3 septembre 2026, sur l’introduction de la Genèse : « les blancs entre les paragraphes de même style sont trop importants »). La donnée coupe une introduction ou un commentaire en autant de blocs que de paragraphes ; chacun rouvrait le blanc de son rang, deux rem et quart en regard, près de trois en lecture simple, là où deux paragraphes composés dans un même bloc ne s’écartent que d’un quart de rem, le blanc que l’auteur a fixé le 29 août pour deux paragraphes d’un même style. Mesuré dans le corpus public : mille cinq cents paires de commentaires de péricope, cent cinquante de commentaires de verset, soixante-dix de paragraphes d’introduction. La suite se reconnaît à la donnée (\`estSuiteDuBloc\` : même rang, même nature après résolution du registre, aucun intitulé), jamais au texte, et se porte sur le bloc (\`data-suite\`) ; la feuille lui retire sa marge haute et à son prédécesseur sa marge basse, sur les trois surfaces, et il reste le blanc du dernier paragraphe. Un intitulé, une manchette, une gravure entre deux blocs rompent la suite : ils rompent déjà le développement.

⚠️ **Le blanc sous une sous-section vaut 0,6 rem, non 0,4, et la fratrie ne le donnait pas.** Sur la grille de l’axe, le titre et le bloc qui le porte reçoivent tous deux la marge basse du rang, et rien n’y fusionne ; dans la fratrie de la mesure étroite et de la lecture en regard, tout fusionne, et le blanc tombait à 0,2 rem (relevé de l’auteur sous « Les sources de la Genèse » : « il faut plus de blanc après ce style »). La fratrie reçoit désormais 0,6 rem, et les deux surfaces se valent.
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
const cleSauvegarde = 'charte_ia_sauvegarde_20260903_avant_bloc_de_suite'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
