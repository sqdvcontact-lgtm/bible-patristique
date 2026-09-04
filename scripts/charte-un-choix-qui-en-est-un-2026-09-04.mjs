/**
 * § 38.16 : un CHOIX ne s'offre que s'il en est un ; et un même geste se présente
 * de la même façon des deux côtés du site.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-un-choix-qui-en-est-un-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = '### 38.16 Un CHOIX ne s’offre que s’il en est UN'

// Ancre : la dernière phrase du § 38.15, recopiée de `parametres.charte_ia`.
const ANCRE = '⛔ On n’écrit donc pas de fine dans la donnée : elle resterait la seule table du site à en porter.'

const SECTION = `

${MARQUE}

Relevé de l’auteur sur le volet de la page Œuvre, 2026-09-04 : « Éditions de ce texte : je constate pas mal de problèmes. Souvent, on a deux fois la même édition qui s’affiche, le texte latin ou d’origine n’est pas sous la bonne édition, etc. Fais un audit. Je veux que ce choix s’affiche seulement si on a le choix entre deux éditions différentes pour une même langue. »

⛔ **DEUX MENUS POUR UNE SEULE QUESTION EN FONT UN DE TROP.** Le volet en portait deux, avec deux intitulés et deux règles : « Édition » listait les ŒUVRES SŒURS — des lignes d’\`oeuvres\` au même titre normalisé —, « Éditions de ce texte » les TEXTES de l’œuvre courante. Le lecteur, lui, ne choisit pas entre deux sortes d’identifiants : il choisit une édition. Ils n’en font plus qu’un. ⚠️ Et celui des œuvres sœurs ne s’était **jamais ouvert** : aucune œuvre publiée ne partage son titre normalisé avec une autre, la seule paire — La Cité de Dieu et son latin de Migne — ayant été dépubliée le 2026-08-26. *Un menu qu’on n’a jamais vu s’ouvrir n’est pas une réserve pour plus tard : c’est une seconde règle qui attend de contredire la première.*

⛔ **UN INSTANTANÉ DE TRAVAIL N’EST PAS UNE ÉDITION.** \`oeuvre_textes\` garde les états d’avant une reprise — \`TXT_A0010O0100_FR_1866_JOYEUX_PRE_RESEG_20260903\` à côté de \`TXT_A0010O0100_LEGACY\`, même traducteur, même millésime, même mention d’édition. Ils portent \`is_public = false\`, et le menu les offrait pourtant : la politique de lecture de la table dit \`is_admin() OR (is_public AND …)\`. ⚠️ **Le défaut était donc invisible depuis un compte de lecteur, et visible depuis le seul compte qui regarde la page tous les jours.** C’est la forme la plus coûteuse d’un défaut : celui que le propriétaire du site est seul à voir, et qu’il finit par prendre pour l’état normal des choses.

⚠️ **CE QU’ON LIT PARAÎT TOUJOURS, fût-il à l’atelier.** Un menu qui tairait la ligne courante mentirait sur l’endroit où l’on se trouve. C’est déjà la règle du menu des bibles, où le catalogue ne liste que les bibles lisibles mais liste toujours celle qu’on lit.

⛔ **DEUX EXEMPLAIRES D’UNE MÊME ÉDITION SE FONDENT EN UN.** Ce qui identifie une édition est le TRADUCTEUR, le MILLÉSIME et la MENTION D’ÉDITION — jamais l’identifiant du texte. Deux lignes qui ne diffèrent que par lui sont deux exemplaires d’une seule édition, et le lecteur qui les voit côte à côte n’a aucun moyen de choisir. Les Homélies sur l’Hexaéméron portent ainsi **deux fois le même Migne 1857** en grec. ⚠️ L’exemplaire retenu est celui qu’on LIT, sinon celui qui fait défaut, sinon celui qui est publié.

⛔ **ET LE TRI SE FAIT SUR LA LANGUE, non sur l’original.** La règle d’avant comparait « ceci EST le texte original » à « je LIS le texte original », ce qui n’est pas la même question : un texte sans traducteur dans une langue tierce tombait du mauvais côté. La langue vient du TEXTE qu’on lit, et d’abord de lui ; ⚠️ une version qui n’en déclare aucune ne se range sous aucune, et le menu se tait plutôt que de deviner.

⚠️ **APRÈS QUOI UNE SEULE ŒUVRE DU CORPUS OFFRE ENCORE CE CHOIX** : la Consolation de la philosophie, en français, entre Ceriziers 1646 et Mirandol 1861. C’est le résultat attendu et non un effet de bord — le site n’a qu’un texte par langue partout ailleurs. *Un menu qui ne paraît presque jamais n’est pas un menu inutile : c’est un menu qui dit la vérité sur ce que le corpus contient.*

⛔ **UN MÊME GESTE SE PRÉSENTE DE LA MÊME FAÇON DES DEUX CÔTÉS DU SITE** (même relevé : « mettre à jour la mise en forme de Lecture et Éditions de ce texte pour correspondre à la mise en forme qu’on trouve dans Bible classique »). Choisir comment on lit ce qu’on a sous les yeux est le même geste sur la Bible et sur une œuvre : il prend donc la même rubrique en casse ordinaire et la même option par ligne, sur la pastille verte de la liste. La page Œuvre portait encore l’étiquette en capitales espacées et les boutons encadrés d’un filet, c’est-à-dire la forme d’avant la décision du 28 août 2026, restée là parce qu’elle vivait dans un autre fichier. ⚠️ Il n’y a plus qu’une seule définition, et les deux jetons de l’ancienne sont retirés : une forme qu’on garde « au cas où » est une divergence qui attend.

⚠️ **Un seul écart demeure, et il est motivé** : la page Œuvre garde son témoin d’attente au bout de chaque ligne de « Lecture ». « Latin » y vise une AUTRE adresse, donc un rendu serveur entier, quand les axes de la Bible se règlent le plus souvent sur place.`

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

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_un_choix_qui_en_est_un'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
