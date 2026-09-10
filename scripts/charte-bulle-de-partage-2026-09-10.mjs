/**
 * Consigne dans la charte, § 51.8.1 : LA BULLE DE PARTAGE — rien que les logos.
 *
 * Troisième rectification de l'auteur du 10 septembre 2026, le soir : « pour l'onglet de
 * partage, revoir un peu la mise en forme : faire plutôt une petite bulle qui s'ouvre
 * proprement sur le côté ; ne pas faire des blocs ; se contenter des logos ».
 *
 * ⛔ Elle DÉFAIT deux énoncés du § 51.8, et il faut le dire : les canaux n'y sont plus
 * « nommés en toutes lettres », et la fenêtre ne montre plus « ce qu'elle va envoyer ».
 * Ce qui demeure entier : la LIGNE, les canaux offerts, le lien nu en tête, les marques
 * au trait jugées rastérisées.
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-bulle-de-partage-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
#### 51.8.1 La BULLE — rien que les logos, et le glyphe porte seul

Troisième rectification de l'auteur, le soir du 10 septembre 2026 : « pour l'onglet de
partage, revoir un peu la mise en forme : faire plutôt une petite bulle qui s'ouvre
proprement sur le côté ; ne pas faire des blocs ; se contenter des logos. »

⛔ **UN GESTE D'UNE SECONDE NE PREND PAS LE MILIEU DE L'ÉCRAN.** La première écriture était
une FENÊTRE centrée de 24 rem, avec son titre, la ligne qu'elle allait envoyer, l'adresse,
et six tuiles nommées : une cérémonie posée sur toute la page pour un choix qu'on fait sans
regarder. Elle cède à une BULLE ancrée sur le bouton qui l'a demandée, haute d'un seul rang
de logos, et le reste de la page ne bouge pas.

⛔ **DEUX ÉNONCÉS DU § 51.8 TOMBENT AVEC ELLE, ET IL FAUT LE DIRE PLUTÔT QUE DE LES LAISSER
SE CONTREDIRE.** Les canaux ne sont plus « nommés en toutes lettres » : le nom vit dans
\`title\` et \`aria-label\`, il se lit au survol et se dit à la synthèse vocale, mais il ne
s'écrit plus. Et la bulle ne montre plus « ce qu'elle va envoyer » : ni la ligne, ni
l'adresse. ⚠️ Ce qui reste entier du § 51.8 : la LIGNE elle-même, les canaux offerts, le
lien nu en première place, l'adresse partagée qui est celle qu'on lit, et la règle qui veut
qu'une marque se juge rastérisée.

⚠️ **CE QUE LE RETRAIT COÛTE EST RÉEL, et l'arbitrage est assumé** : un lecteur qui ne
reconnaît pas un logo doit désormais s'y arrêter pour lire son infobulle, et sur un écran
tactile il n'y a pas d'infobulle du tout. Le prix est payé par la brièveté du geste — sept
marques que tout le monde a déjà vues mille fois — et par le fait que la bulle n'engage
rien : on en sort d'un clic ou d'Échap.

⛔ **CONSÉQUENCE, ET ELLE COMMANDE LE DESSIN : LA RECONNAISSANCE NE REPOSE PLUS QUE SUR LE
GLYPHE.** Le § 51.8 admettait le trait parce que le mot le secondait ; le mot parti, chaque
marque doit se reconnaître seule. Elle se juge donc rastérisée à sa taille servie, agrandie
au plus proche voisin, ET SUR LES DEUX SOLS — une encre qui tient sur le papier peut se
noyer sur le cuir.

⛔ **ET CE QUI S'ACCORDE ENTRE VOISINES EST L'ÉTENDUE D'ENCRE, NON LA BOÎTE DÉCLARÉE.**
C'est la règle de la rangée d'outils de la barre, prise sur un autre objet, et la mesure
l'a démentie deux fois à l'œil. Relevé à 21 px sur les sept marques : le maillon du lien
n'occupait que 15,6 de sa boîte de 24 quand ses voisines en occupent 18,4 à 19,7, et il
posait 11,9 % d'encre contre 17 à 21,5 — le plus petit et le plus pâle du rang, sur le
geste qu'on fait le plus souvent ; les trois nœuds du partage natif, eux, montaient à 21 de
haut. Le premier est étendu d'un cinquième, le second resserré du huitième, et le TRAIT ne
bouge ni sur l'un ni sur l'autre : l'étendue s'accorde par la géométrie, jamais par la
graisse. Après : boîtes de 16,6 à 19,7, encre de 14,4 à 21,5.

⚠️ **La croix de X reste l'exception qui confirme la mesure** : c'est la marque la plus
LÉGÈRE en boîte (16,6) et la plus PLEINE en encre franche (15,6 % contre 3,9 à 9,5), parce
que ses bouts coupés et sa graisse la distinguent d'une croix de fermeture. Son encre
totale, elle, tombe au milieu du rang.

⛔ **LA GÉOMÉTRIE DE LA BULLE S'ÉCRIT DEUX FOIS, ET UNE GARDE LES CONFRONTE.** La feuille
POSE la cible, l'écart et le rembourrage ; le code les CALCULE avant le rendu, pour placer
la bulle et la borner à l'écran — un placement ne peut pas attendre que la feuille ait
peint. Deux copies d'une même mesure divergent au premier réglage, et la bulle se placerait
alors sur une largeur qu'elle n'a pas. C'est la garde que la rangée d'actions du volet tient
déjà entre son prédicat et sa feuille.

⚠️ **La mesure tient aux deux bouts de la police fluide**, et elle a été relevée sur la
composition servie : 248 × 44 pour sept logos à la racine 16, 340 × 60 à la racine 22, un
seul rang dans les deux cas, cible de 30 puis 41 px — très au-dessus du plancher de 24 de
WCAG 2.2 § 2.5.8, qu'un logo sans libellé a besoin de dépasser pour se lire. Sept logos
tiennent dans la bande utile d'un téléphone de 375 px, marges du placement comprises.

⛔ **TOUT CE QUI EST HORS DE LA BULLE LA FERME, LE DÉCLENCHEUR COMPRIS**, et c'est
délibéré : le ⋮ l'ouvre sur son propre rectangle, et s'il ne la fermait pas, le cliquer une
seconde fois déplierait son menu PAR-DESSUS elle. Le prix est qu'un second clic sur le logo
de partage la referme puis la rouvre dans le même souffle — un aller-retour qui ne se voit
pas. Elle ferme aussi au défilement et au redimensionnement : une bulle ancrée ne poursuit
pas son ancre, elle s'efface.

⚠️ **L'ACCUSÉ DE COPIE SE DIT, ET NE S'ÉCRIT QUE SUR UN ÉCHEC.** La coche verte ne se voit
pas d'une synthèse vocale : une région vivante hors de l'écran l'annonce. Une ERREUR de
presse-papiers, elle, prend un rang à elle sous la rangée — une erreur qui ne se dit nulle
part est pire qu'une bulle qui s'allonge d'une ligne, et le cas est rare.

⚠️ **Et le seuil de 4,5 du § 51.8 n'a plus d'objet sur cette surface** : l'adresse n'y est
plus montrée. La règle demeure entière partout où une mention porte SEULE son information.
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
  if (texte.includes('#### 51.8.1 ')) throw new Error(`[${source}] le § 51.8.1 y est déjà.`)
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 51.8.1.')
}
console.log('Les deux exemplaires portent le § 51.8.1, et la relecture le confirme.')
