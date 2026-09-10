/**
 * Consigne dans la charte le § 13.17 — LES BLOCS D'UNE NOTE SE COMPOSENT D'UNE SEULE MAIN.
 *
 * Relevé de l'auteur du 10 septembre 2026, sur la note d'Ovide de la Consolation :
 * « harmoniser un peu mieux les polices, tailles, espacements, etc. »
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-blocs-de-note-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
### 13.17 Les BLOCS d'une note se composent d'une seule main

Relevé de l'auteur du 10 septembre 2026, sur la note d'Ovide de la *Consolation de la
philosophie* : « harmoniser un peu mieux les polices, tailles, espacements ». Quatre blocs
dans une boîte de 436 pixels — un lemme français, quatre vers latins, leur traduction, le
renvoi — et trois corps, deux retraits de deux unités différentes, deux marques.

⛔ **UN SEUL CORPS POUR CE QUE LA NOTE CITE.** Le vers se composait un cran sous la prose
qui l'entoure : 10,35 px contre 11,5, si bien que la source latine paraissait plus petite
que sa propre traduction, dans une boîte qui porte déjà le rang discret de l'appareil.
Aucune des cinq autres surfaces où le site compose des vers ne le fait — le corps d'une
œuvre, son apparat, son introduction et l'apparat d'une bible donnent tous au vers le corps
de la prose voisine. **Ce qui dit qu'un vers est un vers est le RETOUR À LA LIGNE, non la
taille.**

⛔ **UN SEUL FER POUR TOUT CE QUI SE DÉTACHE, ET IL SE COMPTE EN \`em\`.** Le vers rentrait
de 9,32 px — 0,9 em d'un bloc lui-même réduit — et la traduction de **10 px**, des pixels,
qui ne suivent pas la police racine : sur un grand écran, la traduction se resserrait toute
seule et la source cessait de partir du même fer qu'elle. Les deux valent désormais
**1,5 em**, la valeur du vers partout ailleurs sur le site, et c'est ce fer commun qui tient
la source et sa traduction ensemble.

⛔ **ET PAS DE FILET.** Deux blocs d'un même passage portaient deux marques différentes :
un filet doré sur la traduction, rien sur le vers. Le site a déjà tranché ce cas pour la
citation sortie d'une œuvre — « ni guillemets ni filet » — et la raison vaut ici : le
retrait dit tout, et une barre de deux pixels dans une piste de deux cent vingt en dit
trop.

⛔ **UN VERS NE SE CÉSURE NI NE SE JUSTIFIE, ET L'ENCART EST SA SIXIÈME SURFACE.** Il s'y
rendait par un simple \`pre-line\`, si bien qu'il héritait de la justification et de la
césure posées sur le CORPS de l'encart : sur la capture, « Jam mihi deterior canis » se
coupait en « ca-/nis ». Il se rend désormais LIGNE À LIGNE, en boîtes, avec le style que
les cinq autres surfaces partagent (§ 7.4) — pas de césure, retrait de suite, alinéa.

⚠️ **Et la boîte règle le lemme sans qu'on ait à le nommer.** Un ancrage en tête reste un
fragment EN LIGNE ; l'inline qui précède un enfant de bloc forme sa propre ligne. Le lemme
cesse donc de se coller au premier vers, ce qui le poussait au delà de la piste. La règle
du § 13.10 n'est pas défaite : elle dit qu'un ancrage ne fait pas paragraphe, et il n'en
fait toujours pas.

⛔ **UN SEUL RANG DISCRET.** Ce qu'on TRAVERSE pour atteindre le propos — la coordonnée
d'où vient la note, le renvoi qui suit sa cible — se composait à 0,92 em, l'apparat
critique à 0,94 : **un quart de pixel d'écart**, c'est-à-dire la dérive même que l'échelle
typographique du site a défaite ailleurs, où trente valeurs se pressaient entre 10 et 14 px.

⛔ **LA BOÎTE DOIT PORTER LA NOTE, ET L'ESTIMATION NE COMPTAIT QUE DES SIGNES.** Une note
n'est pas une coulée : ses blocs sont séparés d'un blanc, et un bloc de vers occupe autant
de lignes qu'il porte de vers, si courts soient-ils. Mesurée au navigateur sur la
composition servie, la note d'Ovide prend **179,67 px sur la mesure pleine et 259,2 sur la
mesure étroite**, quand la boîte lui en promettait 120 et 199 : **elle défilait déjà avant
cette passe**. L'estimation compte donc le RELIEF de la note — ses blocs, ses lignes
forcées — et rend 185 et 265.

⚠️ **On SURESTIME plutôt qu'on ne sous-estime**, et c'est le parti déjà pris pour la chasse
moyenne : une boîte un peu trop haute ne se voit pas, une boîte trop courte fait défiler.
Un renvoi rendu en ligne après sa cible compte donc pour un bloc de plus — six pixels de
blanc en trop, contre une note tronquée.

⚠️ **La portée est étroite, et elle est mesurée** : sur les 24 864 blocs de note du corpus,
**69 portent des vers et 77 sont des traductions**, et **36 notes portent les deux**. Ce
n'est pas une raison de laisser trois corps dans la même boîte — c'en est une de ne pas
étendre le retrait aux citations en prose, qui se lisent au fil de la note et n'ont rien à
détacher.
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
  if (texte.includes('### 13.17 ')) throw new Error(`[${source}] le § 13.17 y est déjà.`)
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
  throw new Error('Relecture : la charte distante ne se termine pas par le § 13.17.')
}
console.log('Les deux exemplaires portent le § 13.17, et la relecture le confirme.')
