/**
 * § 41 : la densité des textes, le gris typographique.
 *
 * Décision de l'auteur du 5 septembre 2026, à la suite de l'audit de densité
 * (`audit/densite-typographique-2026-09-05.md`) : « J'aime les textes serrés, césurés,
 * condensés, avec un interligne peu important. […] Cette règle de "texte dense"
 * s'applique seulement aux paragraphes un peu longs, comme une notice. »
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère
 * (`node scripts/synchroniser-charte-supabase.mjs --pull`).
 * Usage : node scripts/charte-densite-des-textes-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UN TEXTE JUSTIFIÉ EST TOUJOURS CÉSURÉ'

// La section s'ajoute EN FIN de charte : l'ancre est donc la dernière phrase du
// document, vérifiée pour elle-même avant toute écriture.
const ANCRE_FIN = 'La coupe se fait sur un séparateur EXPLICITE — le tiret, ou l’incise « , d’après … » —, jamais sur une position ni sur la première virgule : « Gallica, Bibliothèque nationale de France » porte la sienne dans son nom même.'

const SECTION = `

## 41. La densité des textes — le gris typographique

Décision de l’auteur, 5 septembre 2026 : « J’aime les textes serrés, césurés, condensés, avec un interligne peu important. […] Cette règle de "texte dense" s’applique seulement aux paragraphes un peu longs, comme une notice. » La règle est née de l’audit de densité du même jour, qui a relevé toutes les surfaces de prose du site et mesuré la longueur réelle des textes servis.

### 41.1 Le seuil : ce qu’est un paragraphe

La règle vise **ce qui se lit en paragraphe, non ce qui se lit d’un coup d’œil**. Le seuil est de deux cent cinquante signes habituellement servis, soit environ trois lignes pleines. Un libellé, une étiquette, une légende, un message d’état ou une confirmation n’ont pas de gris et ne relèvent pas de la règle.

⚠️ **Le seuil se MESURE sur la donnée, jamais sur l’impression** : on compte les signes du champ en base avant de décider. Relevé le 5 septembre 2026, en médiane — corps d’un essai 6 732 signes, notice exégétique d’une péricope 1 049, note biographique d’un auteur 663, notice courte d’une péricope 661, anecdotes d’un auteur 373, notice d’un événement 221 dont un quart passe 280 et le plus long 776, bio courte d’une traduction 167, note de datation d’un événement 131.

### 41.2 Les cinq propriétés, et elles sont solidaires

1. \`text-align: justify\` avec \`text-justify: inter-word\` ;
2. \`hyphens: auto\` et \`-webkit-hyphens: auto\` ;
3. \`word-spacing\` négatif, qui ramène l’espace au quart de cadratin : −0,03 em pour le sans, −0,025 em pour le sérif ;
4. \`letter-spacing: 0\` — aucun interlettrage sur un corps de texte ;
5. un \`line-height\` pris au barème du § 41.3.

⛔ **UN TEXTE JUSTIFIÉ EST TOUJOURS CÉSURÉ, et cela ne dépend pas de sa longueur.** Justifié sans césure, rien ne borne l’étirement des espaces : mesuré dans ce dépôt jusqu’à 1,609 em, six fois le quart de cadratin, et aucune propriété CSS ne le borne — c’est la mécanique du procédé, non un défaut de réglage. La césure REMPLIT les lignes ; l’espace resserrée les tasse. Deux lignes suffisent à creuser une lézarde : le seuil du § 41.1 décide si l’on JUSTIFIE, jamais si l’on césure quand on a justifié. ⚠️ Relevé du 5 septembre 2026 : sur trente paragraphes justifiés du site, quinze n’étaient pas césurés.

⚠️ **La césure automatique n’agit que si la langue est déclarée.** \`<html lang="fr">\` la porte pour tout le site ; un texte d’une autre langue déclare la sienne sur son propre bloc. Le latin et le grec reçoivent leurs coupes du site, aucun navigateur ne sachant les syllaber (§ 18).

### 41.3 Le barème des interlignes

| Rang | Valeur | Surfaces |
| --- | --- | --- |
| Appareil | 1,38 – 1,40 | repères, apparat critique, notices techniques |
| Notice | 1,50 – 1,52 | toute notice, toute page fixe, tout chapeau de plus de trois lignes |
| Lecture continue | 1,62 | le corps qu’on lit d’un bout à l’autre : lecture d’une œuvre, texte original, citation de verset |

⛔ **Rien ne monte au-dessus de 1,62**, et cette valeur ne se prend que pour un texte qu’on lit en entier. Relevé du 5 septembre 2026 : onze surfaces portaient de 1,60 à 1,75, dont les deux pages légales à 1,75 sur des lignes d’une centaine de signes — les textes les plus longs du site après les essais, sur l’interligne le plus ouvert et la mesure la plus large.

⚠️ **Une notice ne monte pas au rang de la lecture continue.** Les notices de la page « Histoire de l’Église » tenaient 1,55 pour des textes de 221 signes, quand la page « Les traductions » tient 1,52 pour des notices de plusieurs écrans.

### 41.4 Sur une mesure étroite, on ferre

Sous une quarantaine de signes par ligne, la justification se creuse de lézardes que la césure ne comble plus. Le texte se ferre alors à gauche ET GARDE SA CÉSURE : c’est elle qui remplit les lignes, si bien que le bord libre reste presque droit sans qu’une seule espace ait été étirée (§ 18, manchette).

⚠️ **Un texte en \`white-space: pre-wrap\` ne se justifie jamais** : il conserve les espaces de la donnée, que la justification étirerait pour leur compte. Il se ferre, et il se césure.

### 41.5 Ce que la règle ne touche pas

- ce qui se lit d’un coup d’œil : libellés, étiquettes, légendes, messages d’état, confirmations ;
- ce qui est CENTRÉ par composition — une bande de noms, une invite en pyramide, un exergue, un colophon, un portrait de lecteur. L’air y est le dessin ; on ne justifie pas un bloc centré et on ne le césure pas davantage, une coupure au milieu d’un centrage se voyant. ⚠️ Si un texte centré devient un paragraphe, c’est le CENTRAGE qu’il faut lui retirer d’abord ;
- un CHAMP DE SAISIE ordinaire, qui ne promet rien du rendu final. ⚠️ Un éditeur WYSIWYG, lui, promet la forme finale : il prend la césure comme la page de lecture ;
- une langue dont aucun navigateur ne connaît la syllabation : un texte diplomatique en ancien français (\`lang="fro"\`) ne peut pas être césuré, il se ferre plutôt que de se justifier.

### 41.6 Une valeur morte est pire qu’une valeur absente

⛔ **Un attribut \`style\` d’auteur perd contre une déclaration \`!important\` d’auteur.** Trois écritures du dépôt réglaient ainsi des interlignes que personne ne recevait : 1,78 sur les notices de traduction, des deux côtés du site, et 1,42 sur le corps d’un essai. On pouvait les corriger sans que rien ne bouge à l’écran. ⚠️ Avant de corriger une valeur, VÉRIFIER qu’elle est servie.

⛔ **Une même forme ne s’écrit qu’une fois.** Le corps d’un essai était réglé à trois endroits — la feuille de la page de lecture, la sérialisation qui alimente l’éditeur, le composeur — et les trois disaient des choses différentes. Ils dérivent désormais d’une seule écriture, \`app/lib/compositionEssai.ts\`, comme la lecture d’une œuvre dérive de \`compositionOeuvre.ts\`. *Trois copies d’une même forme ne restent identiques que par accident.*

⛔ **Un aperçu d’administration compose EXACTEMENT comme la surface publique.** La fiche d’une traduction se disait « copie exacte » du volet public et montrait la bio en corps 14 sur un interligne de 1,65 quand le lecteur la reçoit en corps 12,5 sur 1,50 : l’auteur jugeait ses notices dans une forme que le site ne sert pas.

⚠️ **Une règle CSS que rien ne porte fausse un relevé comme elle fausse une lecture.** \`.cs-chapeau\` portait 1,75 sur la page du chantier et n’était posée sur aucun élément ; l’audit l’avait d’abord comptée parmi les écarts.
`

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

const n = avant.split(ANCRE_FIN).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
if (!avant.trimEnd().endsWith(ANCRE_FIN)) throw new Error('ancre : la charte ne se termine pas où on l’attend.')
if (/^## 41[.\s]/mu.test(avant)) throw new Error('une section 41 existe déjà.')

const apres = avant.trimEnd() + SECTION
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_densite_des_textes'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
