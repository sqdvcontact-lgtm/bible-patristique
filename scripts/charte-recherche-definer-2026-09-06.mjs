/**
 * § 43.4, complément du soir : une politique de lecture change le plan.
 *
 * Mesuré en ligne une heure après la mise en ligne du § 43.4 : la répartition des Pères
 * pour « dieu » coûtait 5 371 ms sous le rôle du lecteur, 310 sous celui de
 * l'administration. Les fonctions des passages passent en `security definer`, la garde
 * de publication écrite en clair.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-recherche-definer-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UNE POLITIQUE DE LECTURE CHANGE LE PLAN'

const ANCRE = 'Les motifs entrent donc dans la requête en constantes, à chaque appel, et le plan se fait sur eux.'

const SECTION = ANCRE + `

⚠️ **Seconde trouvaille, le soir même : UNE POLITIQUE DE LECTURE CHANGE LE PLAN.** Mesurée sous le rôle de l’administration, la même recherche rendait en trois dixièmes de seconde ; en ligne, sous le rôle du lecteur, elle en coûtait cinq. La politique qui garde les segments s’évalue ligne à ligne, et le planificateur, plutôt que l’index trigramme, relit les soixante-dix-sept mille segments des textes publics en la vérifiant sur chacun. Les fonctions des passages s’exécutent donc avec les droits de leur propriétaire et écrivent elles-mêmes la garde de publication, œuvre publique et texte public : la recherche ne montre que le corpus public, à l’administrateur compris, ce qui est son office. Une recherche s’éprouve sous le rôle du lecteur, jamais sous celui de l’administration seule, dont le canal contourne la politique.`

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
const apres = avant.split(ANCRE).join(SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_recherche_definer'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
