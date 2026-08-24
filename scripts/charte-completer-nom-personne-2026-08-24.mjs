/**
 * Complète le §29.2 de la charte : le renvoi d'un auteur ancien vers le registre, et les
 * noms alternatifs. Décidés par l'auteur le 2026-08-24, après la pose du §29.2.
 *
 * ⛔ N'écrit que dans `parametres.charte_ia`. Le miroir se régénère ensuite par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 *
 * Usage : node scripts/charte-completer-nom-personne-2026-08-24.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const essaiSeul = process.argv.includes('--dry')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const ANCRE = "## 30. Suivi de l'avancement — le centre de contrôle"

const AJOUT = `**Un auteur ancien se désigne par un RENVOI, jamais par une chaîne.** La colonne \`ouvrage_contributeurs_scientifiques.auteur_id\` renvoie vers \`auteurs\`, comme \`auteur_valeur_id\` renvoie vers \`auteurs_valeur\` pour un chercheur. Les deux registres ne se confondent pas : un chercheur moderne est une AUTORITÉ notée, un Père est une SOURCE, et la base interdit déjà de noter le second. ⚠️ Un renvoi vers \`auteurs\` NOMME, il n’évalue pas : il n’entre pas dans le calcul de la valeur scientifique, et rattacher une ligne ne change donc aucun statut.

Le besoin s’est vu à la mesure, le 2026-08-24 : sur les 28 auteurs anciens que nomment les notices, 23 existaient déjà dans \`auteurs\`, en texte libre et sans lien. La dérive avait commencé, trois d’entre eux paraissant sous deux appellations selon l’endroit où on les lit.

**Les NOMS ALTERNATIFS résolvent un nom, ils ne l’affichent pas.** Ils se saisissent séparés par des virgules et se rangent en tableau, sur le modèle de \`editeurs.variantes\`, qui l’a fait le premier : \`auteurs.variantes\` pour une source, \`auteurs_valeur.aliases\` pour un chercheur. « Jérôme » et « Hieronymus » mènent à la fiche de Jérôme de Stridon, dont le nom continue seul de paraître. ⚠️ Rattacher une ligne dont le nom diffère de celui du registre inscrit ce nom parmi les variantes de la fiche : c’est exactement ce qu’est une variante, la forme sous laquelle on rencontre la personne.


`

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', 'charte_ia').maybeSingle()
if (error || !data) { console.error('Lecture refusée :', error?.message); process.exit(1) }
const charte = data.valeur

if (!charte.includes('## 29.2 Le nom')) { console.error('⛔ Le §29.2 n’est pas là. Poser d’abord la section.'); process.exit(1) }
if (charte.includes('auteur ancien se désigne par un RENVOI')) { console.error('⛔ Déjà complété. Rien à faire.'); process.exit(1) }
const occurrences = charte.split(ANCRE).length - 1
if (occurrences !== 1) { console.error(`⛔ L'ancre se trouve ${occurrences} fois, il en faut une. Rien écrit.`); process.exit(1) }

const nouvelle = charte.replace(ANCRE, AJOUT + ANCRE)
console.log(`Charte : ${charte.length} → ${nouvelle.length} signes (+${nouvelle.length - charte.length}).`)
if (essaiSeul) { console.log('Essai seul, rien écrit.'); process.exit(0) }

const { error: e2 } = await sb.from('parametres').update({ valeur: nouvelle }).eq('cle', 'charte_ia')
if (e2) { console.error('Écriture refusée :', e2.message); process.exit(1) }
console.log('✓ §29.2 complété. Tirer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
