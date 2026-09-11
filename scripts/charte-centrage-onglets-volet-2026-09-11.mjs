/**
 * Consigne dans la charte le § 38.29.1 — LE LIBELLÉ SE CENTRE SUR L'ONGLET ENTIER.
 *
 * Relevé de l'auteur du 11 septembre 2026, le soir même du § 38.29 : « c'est un peu
 * mieux, mais le texte paraît pas centré verticalement ». Le § 38.29 voulait le
 * rembourrage symétrique ; c'était l'erreur.
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-centrage-onglets-volet-2026-09-11.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 38.29.1 Le libellé se centre sur l'onglet ENTIER, et le rembourrage suit le corps

Relevé de l'auteur le soir même du § 38.29 : « c'est un peu mieux, mais le texte paraît pas
centré verticalement ».

⛔ **LE § 38.29 SE TROMPAIT EN VOULANT LE REMBOURRAGE SYMÉTRIQUE.** Deux choses tirent le
libellé vers le haut. Le trait vert de l'onglet retenu est pris DANS la hauteur de l'onglet,
comme la bordure transparente des autres onglets ; et la descente de la police reste vide sous
des mots qui n'ont pas de jambages, et grandit avec eux. À six pixels dessus et six dessous, le
libellé se centrait donc sur l'onglet moins son trait, et au-dessus de la flèche de repli, qui
se centre sur toute la hauteur de la barre. C'est le rembourrage égal, et non l'inégal, qui
écartait le mot de sa flèche.

⛔ **LE REMBOURRAGE VAUT SIX PIXELS PLUS UN DIXIÈME DE CADRATIN DESSUS, ET SIX MOINS UN DIXIÈME
DESSOUS**, et la barre garde ses 31 px. Un rembourrage fixe ne pouvait pas convenir partout : le
décalage croît avec le corps, d'un pixel à la racine 16 à deux pixels à la racine 22. Sept et
cinq laissaient un pixel de trop en haut sur un grand écran ; sept et demi et quatre et demi
mettaient le texte un pixel trop bas sur un portable. Le dixième de cadratin suit le corps :
l'écart est nul aux racines 16 et 22, d'un demi-pixel aux racines 18 et 20, où un pixel impair
ne se partage pas, et d'au plus un pixel d'écran sous une échelle de 1,25.

⚠️ **Le centrage se mesure sur l'ENCRE, et sur les PIXELS d'une capture**, des capitales au
filet. Les métriques que rend le canevas sont arrondies au pixel entier, et ne suffisent pas à
trancher un écart de cet ordre. Et la barre mesurée doit tomber sur la même fraction de pixel
qu'en ligne : le moteur cale la ligne de base sur un pixel entier, et une fraction différente
déplace le texte d'un pixel sans que le rembourrage y soit pour rien.

⚠️ **Au doigt, la même règle vaut** : sous \`hover: none\`, l'onglet prend 2,75 rem de haut, et
c'est encore l'écart des deux rembourrages qui centre le libellé sur l'onglet entier.

⚠️ **Ce qui reste ouvert** : le MODÈLE des barres de page porte le même écart, 8 px dessus et
8 dessous pour le même trait et la même police. Il n'a pas été relevé, et le corriger toucherait
toutes les barres d'onglets de page du site : c'est une décision de l'auteur.
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
  if (texte.includes('### 38.29.1 ')) throw new Error(`[${source}] le § 38.29.1 y est déjà.`)
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 38.29.1.')
}
console.log('Les deux exemplaires portent le § 38.29.1, et la relecture le confirme.')
