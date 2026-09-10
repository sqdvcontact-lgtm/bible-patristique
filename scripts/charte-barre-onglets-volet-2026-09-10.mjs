/**
 * Consigne dans la charte le § 38.28 — LA PREMIÈRE LIGNE DU VOLET PATRISTIQUE.
 *
 * Deux demandes de l'auteur du 10 septembre 2026, dans la soirée, et la seconde
 * rectifie ce que la première venait de servir :
 *   « la ligne tout en haut, avec la flèche pour rabattre le volet, n'est pas
 *     nécessaire ; on peut très bien placer cette flèche dans la ligne d'au-dessous »
 *   « ah non, il faut que la ligne soit de couleur uniforme (légèrement verte) ! »
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-barre-onglets-volet-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 38.28 La PREMIÈRE LIGNE du volet patristique porte la flèche, et son fond est UNIFORME

Deux demandes de l'auteur du 10 septembre 2026, dans la soirée, la seconde rectifiant ce que
la première venait de servir : « la ligne tout en haut, avec la flèche pour rabattre le volet,
n'est pas nécessaire ; on peut très bien placer cette flèche dans la ligne d'au-dessous », puis
« ah non, il faut que la ligne soit de couleur uniforme (légèrement verte) ! »

⛔ **UNE BANDE QUI NE PORTE PLUS QU'UN CONTRÔLE N'EST PLUS UNE LIGNE, C'EST UNE MARGE.**
L'en-tête du volet avait été dessiné pour nommer le passage lu ; depuis que plus aucun appelant
ne lui passe cette référence, il ne portait QUE la flèche de repli — trente-huit pixels et son
filet pour un chevron de quatorze. La flèche descend donc dans la barre d'onglets, qui est la
première ligne que le volet porte vraiment, et le bloc reste, prêt à reprendre la référence le
jour où le volet se lirait ailleurs qu'à côté du texte.

⛔ **UN FOND APPARTIENT À LA BARRE, JAMAIS À L'ONGLET RETENU.** L'aplat vert vivait sur le seul
bouton actif : la flèche et la cale restaient au sol du volet, et la ligne se lisait verte au
milieu et neutre aux deux bouts. Tant que la barre n'était faite que d'onglets à parts égales,
personne ne le voyait ; il a suffi d'y poser un objet d'une autre nature pour que la couture
paraisse. **Un aplat posé sur une PARTIE d'une rangée n'est un fond que par accident : il le
devient pour de bon le jour où la rangée cesse d'être homogène.**

⚠️ **La teinte NE CHANGE PAS, elle change de porteur.** C'est celle que l'auteur a vue et
nommée « légèrement verte » ; rien de ce qui était déjà teinté ne fonce, ce sont les deux bouts
neutres qui se remplissent. ⛔ On ne PROFITE pas d'un déplacement pour hausser une dose : le
geste demandé serait alors mêlé à un geste qu'on ne demandait pas, et l'on ne saurait plus
lequel des deux l'auteur juge.

⛔ **L'ONGLET RETENU SE DISTINGUE ALORS COMME DANS LE MODÈLE PARTAGÉ**, qui ne pose aucun
fond : par son trait, sa graisse et son encre. Trois axes, là où la règle des rangs voisins en
demande deux. La barre uniforme n'a donc rien coûté à la lisibilité de l'onglet actif — mesuré,
son libellé rend 10,98 au Clair et 8,06 en Cuir.

⚠️ **Une teinte translucide se relit sur son NOUVEAU sol.** Passée du bouton à la barre, elle
ne compose plus contre la même chose : ce qui se mesure est l'écart de la barre au sol du volet
(1,057 au Clair, 1,079 en Cuir) et ce qu'elle prend aux encres qu'elle porte. Ici elle prend
cinq et demi pour cent au libellé de l'onglet INACTIF, qui tombe de 3,79 à 3,58.

⚠️ **ET CE LIBELLÉ ÉTAIT DÉJÀ SOUS LE SEUIL, sur tout le site.** Le rang que le modèle partagé
donne à un onglet inactif ne rend pas les 4,5 qu'un texte de dix pixels et demi réclame, et
cela ne tient pas à cette barre-ci : c'est une dette du modèle, à reprendre sur le modèle. ⛔ On
ne la corrige pas dans un coin, sous peine de faire diverger une barre de ses cinq sœurs — et
l'on ne la tait pas non plus.

⚠️ **La flèche du repli reste sous son seuil elle aussi** : quatorze pixels dans l'encre la plus
ténue de l'échelle, 2,66 sur la barre teintée quand un indicateur non textuel en demande 3.
Elle est partagée avec le volet de la Bible, où elle vaut 2,98 : la corriger est une passe sur
la flèche, non un effet de bord d'une passe sur le fond.
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
  if (texte.includes('### 38.28 ')) throw new Error(`[${source}] le § 38.28 y est déjà.`)
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 38.28.')
}
console.log('Les deux exemplaires portent le § 38.28, et la relecture le confirme.')
