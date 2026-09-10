/**
 * Consigne dans la charte, § 18.2 : CE QUI EST FAIT POUR LE TÉLÉPHONE NE SE DONNE PAS
 * SUR UN ORDINATEUR.
 *
 * Relevé de l'auteur du 10 septembre 2026, capture à l'appui : sur son ordinateur, le
 * panneau de téléphone se dépliait sous une barre qui portait déjà ses menus déroulants.
 * « Ce qu'on voit là, ça devrait être sur téléphone seulement ! il faudrait un menu
 * déroulant comme sur grand écran. »
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-panneau-du-telephone-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 18.2 Ce qui est fait pour le TÉLÉPHONE ne se donne pas sur un ORDINATEUR

Relevé de l'auteur, le 10 septembre 2026, capture à l'appui : « le menu, sur mon petit
ordinateur, ne convient pas ; ce qu'on voit là, ça devrait être sur téléphone seulement !
il faudrait un menu déroulant comme sur grand écran. »

⛔ **DEUX NAVIGATIONS À LA FOIS NE SONT PAS UN CHOIX, C'EST UN DÉFAUT.** La barre portait
ses cinq onglets et leurs menus déroulants, ET le bouton du panneau de téléphone à côté
d'eux ; le panneau déplié couvrait la page entière d'une liste verticale de vingt rangées
pour dire ce que les menus disaient déjà en survolant. ⛔ Le panneau et son bouton
n'existent que là où la navigation de bureau est MASQUÉE, et nulle part ailleurs.

⛔ **LA CAUSE EST LE PIÈGE DU STYLE EN LIGNE, PAYÉ UNE SIXIÈME FOIS.** Les deux éléments
portaient bien la classe qui les masque au-dessus du seuil de la barre — elle était écrite
depuis l'origine — et ils posaient LEUR PROPRE \`display\` en style en ligne. Un style en
ligne bat toute règle de feuille sans \`!important\` : la classe était donc MORTE, à toutes
les largeurs, et rien ne le disait. Le bouton s'offrait sur tous les écrans, et le panneau
s'ouvrait dès qu'on le demandait.

⛔ **LE REMÈDE N'EST PAS DE CRIER, C'EST DE RENDRE LA PROPRIÉTÉ À LA FEUILLE.** Un
\`!important\` aurait fait taire le symptôme en laissant deux autorités se disputer une
seule propriété. Le \`display\` quitte le style en ligne pour une classe utilitaire, et la
variante de seuil la bat ensuite par l'ordre du fichier : une propriété, une autorité.
⚠️ C'est la même règle que pour un état de SURVOL, qu'un fond posé en ligne rend
inatteignable — et c'est la même qui vaut pour la police, la teinte et le fond.

⛔ **ET LA MESURE SE PREND SUR LA FEUILLE SERVIE, non sur celle du dépôt.** Une classe
utilitaire n'existe que si la chaîne l'a produite, et deux utilitaires de même force se
départagent par leur ORDRE dans le fichier construit. Relevé sur la feuille en ligne, deux
largeurs en cadres : à 1280 px, le bouton et le panneau rendaient \`inline-flex\` et
\`flex\` — donc offerts — et rendent \`none\` après ; à 900 px, rien ne bouge.

⚠️ **UN AXE SANS GARDE DÉRIVE, et celui-ci n'en avait pas.** Une garde parcourt désormais
les balises de \`app/\` et refuse qu'une même balise porte une classe de masquage et un
\`display\` en ligne. Elle a été éprouvée dans les DEUX sens : rouge sur les deux éléments
fautifs — les seuls du site —, verte une fois la propriété rendue à la feuille.

⚠️ **Et le défaut ne se lisait NI dans le composant, NI dans la feuille**, chacun étant
juste de son côté : il naît de leur rencontre, et il ne se voit qu'à la mesure ou à
l'écran. C'est pourquoi une capture de l'auteur vaut ici toutes les relectures.
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
  if (texte.includes('### 18.2 ')) throw new Error(`[${source}] le § 18.2 y est déjà.`)
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 18.2.')
}
console.log('Les deux exemplaires portent le § 18.2, et la relecture le confirme.')
