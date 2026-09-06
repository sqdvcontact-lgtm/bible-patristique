/**
 * § 46 : la visite suit l'ordre de PRÉSENTATION de la page, et présente la
 * recherche du site. Demande de l'auteur du 6 septembre 2026, au soir.
 *
 * Trois retouches, et la troisième est une CORRECTION : la charte prescrivait
 * « deux phrases par étape, jamais trois » quand l'auteur avait demandé, le
 * matin même, de petits paragraphes divisés, un par idée. Le code suit la
 * seconde consigne depuis, et la charte était restée sur la première.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visite-ordre-recherche-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LES DEUX RECHERCHES SE DISTINGUENT DÈS LEUR PREMIÈRE PHRASE'

/** Chaque retouche : une ancre qui doit paraître UNE fois, et ce qui la remplace. */
const RETOUCHES = [
  {
    nom: 'ordre',
    ancre: '**L’ordre des étapes est celui du regard**, non celui de l’importance : sur une page à trois volets, le volet de gauche, la colonne du texte, le volet de droite. C’est le seul ordre qui n’oblige pas le lecteur à revenir sur ses pas.',
    texte: '**L’ordre des étapes est celui de la PAGE : de haut en bas, de gauche à droite** (précisé par l’auteur le 6 septembre 2026), non celui de l’importance. La barre du site vient donc en premier, puisqu’elle couronne le reste, et chaque colonne se descend ensuite tout entière. ⚠️ Les colonnes se prennent l’une après l’autre, jamais par bandes horizontales : mesuré sur la page servie, la carte de l’édition, l’en-tête du texte et le volet des Pères ouvrent tous trois leur colonne à la même hauteur, et les ranger par ordonnée ferait sauter le regard d’un bord de l’écran à l’autre trois fois de suite. C’est le seul ordre qui n’oblige pas le lecteur à revenir sur ses pas.',
  },
  {
    nom: 'paragraphes',
    ancre: '**Deux phrases par étape, jamais trois.** Une visite se lit debout, entre deux clics. Ce qui demande un paragraphe n’est pas une explication mais un mode d’emploi, et un mode d’emploi ne se lit pas.',
    texte: '**Un paragraphe par idée, deux ou trois par étape** (demande de l’auteur, 6 septembre 2026). On change de paragraphe quand on change de chose à dire : quelques petits blocs divisés se lisent d’un coup d’œil, quand un pavé de la même longueur ne se lit pas. ⛔ Jamais plus de trois : une visite se lit debout, entre deux clics, et ce qui demande un développement n’est pas une explication mais un mode d’emploi, qui ne se lit pas non plus.',
  },
  {
    nom: 'bible-classique',
    ancre: '**La visite de la Bible classique**, qui est le modèle, compte sept arrêts : l’édition qu’on lit, la recherche d’un livre, la liste des livres et la teinte de leurs cases de chapitre, le titre et le menu des bibles, le verset et le nombre d’œuvres inscrit dans sa marge, la colonne d’actions, le volet des Pères avec ses filtres et son onglet de commentaires.',
    texte: [
      '**La visite de la Bible classique**, qui est le modèle, compte huit arrêts : la recherche du site, l’édition qu’on lit, la recherche d’un livre, la liste des livres et la teinte de leurs cases de chapitre, le titre et le menu des bibles, le verset et le nombre d’œuvres inscrit dans sa marge, la colonne d’actions, le volet des Pères avec ses filtres et son onglet de commentaires.',
      '',
      '⛔ **LES DEUX RECHERCHES SE DISTINGUENT DÈS LEUR PREMIÈRE PHRASE.** Celle de la barre porte sur tout le site, celle du volet sur les seuls livres de la bible ouverte. Présentées à quelques étapes l’une de l’autre, elles se confondraient sans cela, et le lecteur croirait à un doublon.',
      '',
      '⚠️ **La recherche du site ne se montre qu’en écran large**, et son étape s’efface ailleurs : sur un téléphone la barre range sa recherche dans le menu déplié, et déplier ce menu couvrirait la page qu’on explique. ⛔ Son repère se pose sur le bloc qui porte le champ OU la loupe, jamais sur le champ : à l’étroit celui-ci se replie, et un repère posé dessus s’évanouirait au moment même où la recherche devient la plus difficile à trouver.',
      '',
      '⛔ **LE VOILE PASSE AU-DESSUS DE LA BARRE DE NAVIGATION**, et il le doit. Il passait dessous : la barre restait en pleine lumière quand tout le reste s’assombrissait, et surtout aucune case n’y pouvait paraître. Une visite voile la PAGE, et la barre est de la page. ⚠️ Deux corollaires : la case du sujet cesse de réserver la bande de la barre quand le sujet y VIT, cette réserve n’existant que pour l’empêcher de glisser dessous ; et l’on ne fait pas défiler un sujet qui est fixe, donc déjà à l’écran.',
    ].join('\n'),
  },
]

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

let apres = avant
for (const r of RETOUCHES) {
  const n = apres.split(r.ancre).length - 1
  if (n !== 1) throw new Error('ancre ' + r.nom + ' : ' + n + ' occurrence(s), 1 attendue.')
  apres = apres.split(r.ancre).join(r.texte)
}

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_visite_recherche'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
for (const r of RETOUCHES) {
  if (relu.valeur.includes(r.ancre)) throw new Error('relecture : ancre ' + r.nom + ' encore présente.')
}
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
