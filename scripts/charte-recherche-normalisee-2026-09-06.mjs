/**
 * § 43 : la recherche — une seule normalisation, un mot ou plusieurs, trois modes.
 *
 * Demande de l'auteur du 6 septembre 2026 : « peux-tu te pencher sur le système de
 * recherche ? pour l'améliorer ». Audit, mesures et correction le même jour.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère
 * (`node scripts/synchroniser-charte-supabase.mjs --pull`).
 * Usage : node scripts/charte-recherche-normalisee-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LA RECHERCHE LIT LE TEXTE QUE LA BASE A NORMALISÉ, ET RIEN D’AUTRE'

// La section s'ajoute EN FIN de charte, après le § 42.4 : l'ancre est la dernière
// phrase du document, vérifiée pour elle-même avant toute écriture.
const ANCRE_FIN = 'Il ne propose pas de lien d’achat : les librairies sont sur leur page, et la sienne y renvoie en pied.'

const SECTION = `

## 43. La recherche — une seule normalisation, un mot ou plusieurs, trois modes

Demande de l’auteur, 6 septembre 2026 : « se pencher sur le système de recherche, pour l’améliorer ». L’audit du même jour a mesuré la page des résultats et la barre de recherche rapide sur la base réelle ; ce qui suit est ce qu’il a trouvé, et ce qui en est sorti.

### 43.1 Ce que l’audit a trouvé

⛔ **La Bible n’était ni normalisée ni indexée.** \`recherche_versets\` balayait la vue matérialisée colonne par colonne, cinq fois \`unaccent(lower(…)) like '%…%'\`, sans qu’aucun index puisse servir : 890 ms mesurées pour « espérance » sur toutes les bibles, 36 000 lignes lues à chaque frappe. Et \`unaccent\` n’est pas la normalisation du site : la Bible de Sacy écrit « étoit », « avoit », « connoître », et **« était » n’y trouvait rien — 0 verset, contre 2 267 par \`norm_fr\`**, la fonction qui porte \`segments.texte_norm\` depuis toujours et ramène ces graphies au français d’aujourd’hui.

⛔ **Deux mots ne se cherchaient pas comme un seul.** Un mot seul passait par la base normalisée ; deux mots passaient par un \`ilike\` du navigateur sur le texte BRUT, sensible aux accents et aveugle aux graphies anciennes. Le lecteur qui tapait « fils de Dieu » ne cherchait pas dans le même texte que celui qui tapait « fils ». Les graphies latines (u/v, i/j) se cherchaient en autant d’appels successifs, et sur le français normalisé aussi, qui ne les connaît pas.

⛔ **La page rejetait ce que la base avait rendu.** Sa liste de séparateurs de mot ignorait l’apostrophe et le trait d’union : « l’espérance », « d’amour », « Jésus-Christ » — le mot cherché s’y trouve après une apostrophe ou un tiret, la base rendait le verset, et la relecture de la page le jetait en silence.

⚠️ **Un index dormait.** L’index plein texte français sur \`segments.texte_norm\` existait, et aucune requête du site ne le lisait : la recherche par famille de mots (« aimer » → aime, aimait, aimé) était disponible en 69 ms, et inaccessible.

⚠️ **Une référence ne s’ouvrait pas.** « Jean 3, 16 » sur la page des résultats ne menait nulle part ; la barre de recherche ne le comprenait que pour les péricopes.

### 43.2 La règle

⛔ **LA RECHERCHE LIT LE TEXTE QUE LA BASE A NORMALISÉ, ET RIEN D’AUTRE.** Une seule normalisation, \`norm_fr\` — minuscules, accents ôtés, graphies anciennes ramenées au français d’aujourd’hui, ponctuation rendue à l’espace —, portée par \`segments.texte_norm\` et, depuis ce jour, par \`versets_recherche.texte_norm\` : une vue matérialisée, une ligne par verset et par bible, un index trigramme et un index plein texte français, la forme exacte des segments. Elle dérive de \`versets_lecture\` et se rafraîchit dans le même geste qu’elle (\`rafraichir_versets_lecture\`) ; ⛔ rien d’autre ne l’écrit. Mesuré après : « miséricorde » sur toutes les bibles, **9 ms** au lieu de 890.

⛔ **Un mot ou plusieurs se cherchent de la MÊME façon**, par trois RPC qui reçoivent un tableau de termes et un mode — \`recherche_versets_v2\`, \`recherche_segments_v2\`, \`recherche_segments_original_v2\`. La base normalise chaque terme comme ses textes, exige chaque terme dans la MÊME bible ou le même segment, et ne rend que ce qui se lit : les natures de texte, le texte par défaut de chaque œuvre, ⛔ les seules œuvres publiées. Les termes normalisés ne contiennent que des lettres et des chiffres : ils entrent dans une expression rationnelle sans échappement, et c’est \`norm_fr\` qui le garantit.

**Trois modes, et le troisième est neuf.** « Début de mot » et « Mot exact » comme avant ; **« Famille de mots »** prend le mot sous toutes ses formes, par la racine que la recherche plein texte française connaît — « aimer » → aime, aimait, aimé ; « espérance » → espérer, espéré. ⚠️ En ce mode, la page MARQUE dans le texte les RACINES que la base rend (\`lexemes_recherche\`), non les termes tapés, la racine française étant le commencement du mot fléchi dans l’immense majorité des cas ; et elle ne rejette rien de ce que la base a rendu. Le mode n’a pas de sens pour le latin ni le grec, qui n’ont pas de racines dans cette langue de recherche : le texte original se cherche en début de mot ou en mot entier, chaque terme sous ses graphies latines, que la base compose désormais elle-même (\`graphies_latines\`) en une seule expression.

⛔ **La frontière de mot que la page relit est celle de la base** : tout ce qui n’est ni lettre ni chiffre. Une liste de séparateurs écrite à la main finit par en oublier un, et ce qu’elle oublie, elle le jette.

⛔ **Une référence chiffrée S’OUVRE, elle ne se cherche pas.** « Jean 3, 16 », « Jn 3,16 », « Genèse 22 » : la page des résultats l’ouvre en tête, quel que soit l’onglet, et la barre de recherche l’offre en premier rang, Entrée y menant. La grammaire est celle des péricopes (§ 38.18), la seule du site ; « Jonas » seul n’est pas une référence.

### 43.3 Ce qui n’a pas bougé, et ce qui reste

- Les RPC d’avant restent en place pour ce qui pourrait les appeler hors du site. Deux fonctions seulement sont parties : elles lisaient une table qui n’existe plus (\`versets\`), et l’une d’elles rendait l’appel \`recherche_versets(text, text)\` ambigu.
- Les publications de la communauté se cherchent encore sur le texte brut de la vue \`essais_publies\` : vingt-cinq textes, sans index ; leur normalisation attend une décision sur ce qu’on y cherche.
- Le grec ne se désaccentue pas : « λόγος » et « λογος » ne se trouvent pas l’un l’autre. Le plafond reste de 6 000 versets et 5 000 segments par recherche, dans un ordre stable désormais.
- Les suggestions viennent d’un lexique reconstruit chaque mois par la base, et non de la recherche elle-même.
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
if (/^## 43[.\s]/mu.test(avant)) throw new Error('une section 43 existe déjà.')

const apres = avant.trimEnd() + SECTION
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_recherche_normalisee'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
