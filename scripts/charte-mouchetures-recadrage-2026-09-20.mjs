/**
 * Consigne dans la charte le § 49.24 — LES MOUCHETURES DU PAPIER ANCRENT LA BOÎTE.
 *
 * Vingt-cinq symboles livrés par l'auteur le 20 septembre 2026 pour le choix du fleuron
 * d'une œuvre. La chaîne commune a divergé sur cinq d'entre eux, et la cause n'était pas
 * dans le dessin : elle était dans les poussières du papier.
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-mouchetures-recadrage-2026-09-20.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 49.24. LES MOUCHETURES DU PAPIER ANCRENT LA BOÎTE, ET FAUSSENT LA POSE (2026-09-20)

Vingt-cinq symboles apportés par l'auteur pour le choix du fleuron d'une œuvre — six
ornements, neuf objets, dix figures. Le registre passe de vingt à quarante-cinq. Cinq
planches sur vingt-cinq ont refusé de converger, et ce qu'elles ont appris vaut pour toute
la chaîne.

⛔ **LE ROGNAGE SUR L'ALPHA NE SAIT PAS DISTINGUER UNE MOUCHETURE D'UN DESSIN.** Il ne
compte un rang que s'il porte trois pixels visibles (§ 49.5) : un seuil qui suffit à une
planche propre, jamais à une planche poussiéreuse. Mesuré sur une trompette dont le dessin
tient en 57 × 30 à l'affichage 44 : servie à l'affichage 190, elle rendait **361 × 376**,
non qu'elle eût grandi, mais parce que la réduction, moins forte, laissait passer le seuil à
des taches d'encre éparses aux quatre coins du papier. La boîte n'englobait plus le dessin,
elle englobait la planche.

⚠️ **Le symptôme trompe, parce qu'il ressemble à un réglage mal pris.** La correction en
deux passes — sonder, lire la hauteur servie, corriger l'affichage — **diverge** au lieu de
converger : chaque tour agrandit l'affichage, chaque agrandissement réveille de nouvelles
mouchetures, et la planche grossit sans jamais atteindre sa pose. On croit tourner autour
d'une valeur quand on s'en éloigne.

⛔ **ON NE DURCIT PAS LE SEUIL DU ROGNAGE POUR AUTANT.** Il est partagé avec les planches
déjà servies, dont certaines n'ont pour tout dessin que des barbes d'un pixel — les épis de
blé croisés y perdraient leurs barbes avant que la trompette y gagne sa pose. Le remède est
EN AMONT, et il tient à la seule mesure qui sépare une tache d'un trait : sa TAILLE. Les
taches se comptent en composantes connexes sur une vignette de la planche, et tout ce qui
pèse moins d'un cinquantième de la plus grosse s'en va (option \`--recadrer\` de
\`scripts/ornements-detourer.mjs\`).

⚠️ **L'option est FACULTATIVE, et c'est une règle, non une paresse.** Les planches d'avant
ont été jugées à l'œil sans elle ; les rejouer en la posant d'office changerait des fichiers
que personne n'a demandé de changer, et le jugement de l'auteur porterait alors sur un
dessin qu'il n'a pas vu. Une étape neuve de la chaîne s'offre aux planches neuves ; elle ne
se rétroagit pas.

⚠️ **UN CRITÈRE DE COMPOSANTE UNIQUE AURAIT MANGÉ LES DESSINS.** Les trois figures d'une
fournaise, les rayons d'un soleil, la goutte d'un rayon de miel ne touchent pas le corps du
motif : ils sont des composantes à part entière, et un filtre qui ne garderait que la plus
grosse les prendrait pour des poussières. C'est le rapport à la plus grosse qui décide, non
le rang.

⚠️ **Et les poses se mesurent toujours à l'œil, six reprises après le premier banc** : la
rosace, la plus dense du registre, se referme en boule sous 3 rem et se pose à 3,25 ; la
fournaise et l'ange déchu jouent leur sujet en quelques pixels et montent à 3,5 ; les ailes,
trop larges à 2,75, redescendent à 2,5 ; la trompette est le seul ornement COUCHÉ du jeu et
se pose à 2 rem, la pose la plus courte. ⛔ Six de ces figures REGARDENT quelque part —
corbeau, aigle, pélican, main, trompette, ange déchu —, ce qu'un ornement de séparation ne
fait pas : elles sont offertes comme le poisson l'a été, avec leur réserve écrite au
recensement des illustrations.
`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

/** ⛔ L'INVARIANT : on n'écrit QUE par la fin, et jamais sur ce qui est déjà là. */
function ajouter(texte, source) {
  if (texte.includes('### 49.24')) throw new Error(`[${source}] le § 49.24 y est déjà.`)
  const sortie = texte.trimEnd() + '\n' + SECTION
  if (!sortie.startsWith(texte.trimEnd())) throw new Error(`[${source}] l'ajout ne prolonge pas le texte existant.`)
  return sortie
}

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = ajouter(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = ajouter(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)

const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
if (!relue.valeur.trimEnd().endsWith(SECTION.trimEnd())) {
  throw new Error('Relecture : la charte distante ne se termine pas par le § 49.24.')
}
console.log('Les deux exemplaires portent le § 49.24, et la relecture le confirme.')
