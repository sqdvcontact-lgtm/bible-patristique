/**
 * § 46 : l'étape de la barre sort des trois visites, celle de la pagination sort de
 * la Bibliothèque. Décision de l'auteur du 6 septembre 2026, au soir — « présenter
 * la recherche » visait le champ du VOLET, non celui de la barre.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visite-sans-barre-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UNE VISITE MONTRE LA PAGE QU’ON VIENT D’OUVRIR'

const RETOUCHES = [
  {
    nom: 'ordre',
    ancre: 'non celui de l’importance. La barre du site vient donc en premier, puisqu’elle couronne le reste, et chaque colonne se descend ensuite tout entière.',
    texte: 'non celui de l’importance. Chaque colonne se descend tout entière avant qu’on passe à la suivante.',
  },
  {
    nom: 'polyglotte',
    ancre: '**La visite de la Polyglotte** compte huit arrêts : la recherche du site, le nombre de colonnes,',
    texte: '**La visite de la Polyglotte** compte sept arrêts : le nombre de colonnes,',
  },
  {
    nom: 'bibliotheque',
    ancre: 'compte sept arrêts : la recherche du site, les trois sections, ce qui restreint la liste, une carte d’auteur, ce qu’elle déplie, ce qu’une ligne d’édition offre, et la façon de tourner les pages.',
    texte: 'compte cinq arrêts : les trois sections, ce qui restreint la liste, une carte d’auteur, ce qu’elle déplie, et ce qu’une ligne d’édition offre.',
  },
  {
    nom: 'bible',
    ancre: 'compte huit arrêts : la recherche du site, l’édition qu’on lit,',
    texte: 'compte sept arrêts : l’édition qu’on lit,',
  },
  {
    nom: 'les-trois-paragraphes',
    ancre: [
      '⛔ **LES DEUX RECHERCHES SE DISTINGUENT DÈS LEUR PREMIÈRE PHRASE.** Celle de la barre porte sur tout le site, celle du volet sur les seuls livres de la bible ouverte. Présentées à quelques étapes l’une de l’autre, elles se confondraient sans cela, et le lecteur croirait à un doublon.',
      '',
      '⚠️ **La recherche du site ne se montre qu’en écran large**, et son étape s’efface ailleurs : sur un téléphone la barre range sa recherche dans le menu déplié, et déplier ce menu couvrirait la page qu’on explique. ⛔ Son repère se pose sur le bloc qui porte le champ OU la loupe, jamais sur le champ : à l’étroit celui-ci se replie, et un repère posé dessus s’évanouirait au moment même où la recherche devient la plus difficile à trouver.',
      '',
      '⛔ **L’ARRÊT DE LA BARRE EST PARTAGÉ PAR TOUTES LES VISITES, et il ne se recopie pas.** La barre est la seule chose qui ne change pas d’une page à l’autre : son étape s’écrit une fois et chaque scénario l’ouvre en tête. Deux exemplaires d’une même explication divergeraient au premier ajustement, et le lecteur qui ferait deux visites lirait deux fois la même chose de deux façons. ⚠️ Elle ne se répète pas pour autant : chaque page ne montre la sienne qu’une fois, et rien ne dit qu’un lecteur passera par la Bible classique avant d’ouvrir la Polyglotte.',
      '',
      '⛔ **LE VOILE PASSE AU-DESSUS DE LA BARRE DE NAVIGATION**, et il le doit. Il passait dessous : la barre restait en pleine lumière quand tout le reste s’assombrissait, et surtout aucune case n’y pouvait paraître. Une visite voile la PAGE, et la barre est de la page. ⚠️ Deux corollaires : la case du sujet cesse de réserver la bande de la barre quand le sujet y VIT, cette réserve n’existant que pour l’empêcher de glisser dessous ; et l’on ne fait pas défiler un sujet qui est fixe, donc déjà à l’écran.',
    ].join('\n'),
    texte: [
      '⛔ **UNE VISITE MONTRE LA PAGE QU’ON VIENT D’OUVRIR, et la barre de navigation n’est d’aucune page en particulier.** Les trois visites ont porté un arrêt sur sa recherche le 6 septembre 2026 ; l’auteur l’a retiré le soir même, sa demande de « présenter la recherche » ayant visé le champ du VOLET. La barre ne s’explique donc nulle part, et le voile de la visite repasse SOUS elle, qui garde sa lumière.',
      '',
      '⚠️ **Ce qu’une étape sur la barre coûterait, si l’on y revenait.** Il a fallu faire passer le voile par-dessus elle, faute de quoi aucun cadre ne pouvait s’y poser — et la barre s’assombrissait alors à chaque étape de chaque visite. Il a fallu de surcroît deux gardes de géométrie, dont l’une s’est révélée fausse à son premier essai : écrite sur le seul bord haut du sujet, elle écartait aussi tout sujet passé AU-DESSUS de la fenêtre, si bien qu’un retour en arrière après avoir descendu la page laissait le cadre échoué en haut de l’écran. ⛔ Les trois sont retirées avec l’étape : on ne garde pas une garde que plus rien n’exerce.',
      '',
      '⛔ **ON N’EXPLIQUE PAS CE QUI S’ÉCRIT DÉJÀ.** L’étape de la pagination de la Bibliothèque est retirée le même soir : le pied de la liste porte « Page 1 sur 2 » en toutes lettres. ⚠️ Elle coûtait en outre la descente de toute la liste pour remonter ensuite, le plus long défilement qu’une visite du site ait demandé.',
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

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_retrait_barre'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
if (relu.valeur.includes('la recherche du site,')) throw new Error('relecture : une étape de barre subsiste.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
