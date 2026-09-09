/**
 * § 13.11.2 — ce que la composition SÉPARE dans une même famille (le lemme n'est pas
 * la coordonnée ; tout le renvoi suit sa cible).
 * § 13.12.4 — les rôles hors vocabulaire, et l'axe `rendering` qui n'en a pas.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-lemme-et-roles-notes-2026-09-09.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const essaiSeul = process.argv.includes('--dry')

const AJOUTS = [
  {
    marque: '#### 13.11.2 Ce que la composition SÉPARE',
    // Ancre : la dernière phrase du § 13.11.1, recopiée de `parametres.charte_ia`.
    ancre: "Il s'écrit par marqueur, dans le texte, à la passe 5.",
    section: `


#### 13.11.2 Ce que la composition SÉPARE dans une même famille (9 septembre 2026)

⛔ **LA REPRISE N'EST PAS LA COORDONNÉE.** \`lemma\` et \`source_locator\` sont tous deux de la famille \`ancrage\`, tous deux s'ouvrent sur la ligne du propos, et le § 13.11 les composerait donc de même. Voici la raison NOMMÉE qu'il réclame : **le lemme est un mot de l'ŒUVRE, que la note cite avant de le commenter ; la coordonnée est un repère de l'APPAREIL, que le lecteur traverse.** Un seul gris pour les deux les rendrait indiscernables précisément là où ils se touchent — chez Faivre, « (V) pag. 178. — *Avec les démons les plus féroces* — On peut consulter… » les range sur la même ligne, et la passe 3 va en poser 396 de cette forme.

- **La reprise se compose en ITALIQUE**, à la teinte et à la mesure du texte, comme toute édition savante compose son lemme.
- **La coordonnée garde le repère discret** : 0,92 em, teinte seconde.
- ⚠️ **Où qu'elle paraisse** : en tête sur la ligne du propos, au milieu d'une note, ou seule. La règle se dit alors d'un trait — *le lemme est en italique* — et ne tient pas à un rang. Mesuré le 9 septembre 2026 : les 126 lemmes du corpus ouvrent tous leur note et sont tous suivis d'un propos, mais une règle qui tiendrait à cela se briserait au premier import qui en placerait un ailleurs.
- ⚠️ **Rien ne se cumule** : un lemme latin est déjà italique par sa langue (§ 13.8), et les deux règles disent alors la même chose.

⛔ **TOUTE LA FAMILLE DU RENVOI SUIT SA CIBLE EN LIGNE**, et non le seul \`reference\`. Le rendu ne rattachait que \`reference\` et \`attribution\` : un \`internal_cross_reference\` posé avec \`rendering = 'inline_after_target'\` aurait fait paragraphe **en silence**, et le défaut se serait lu comme une donnée fautive plutôt que comme un rendu qui l'ignore. C'est le § 13.11 pris à la lettre : deux natures d'une même famille se composent de même, et ici seule la NORMALISATION les sépare. \`natureSuitSaCibleEnLigne\`, dans \`app/lib/naturesNote.ts\`.`,
  },
  {
    marque: '#### 13.12.4 Les rôles HORS VOCABULAIRE',
    // Ancre : la dernière phrase du § 13.12.3.
    ancre: 'et la cible se posera quand le modèle saura la porter.',
    section: `


#### 13.12.4 Les rôles HORS VOCABULAIRE, et l'axe \`rendering\` qui n'en a pas (9 septembre 2026)

⛔ **UN RÔLE QUE LE SITE NE LIT PAS NE SE VOIT PAS.** \`libelleTypeNote\` rend « Note » sur toute valeur inconnue, exactement comme sur une note jamais typée : le défaut n'a donc aucun symptôme, et c'est ce qui l'a laissé vivre. Mesuré le 9 septembre 2026 : **1 037 blocs** portent l'un des trois rôles que \`TYPES_NOTE\` ignore.

| Rôle en base | Blocs | Ce qu'on en fait |
|---|---|---|
| \`translation_note\` | 258, une œuvre | il DEVIENT \`translator_note\` |
| \`source_marginalia\` | 659, six œuvres | il ne devient PAS un type |
| \`reference_biblique_detachee\` | 120, une œuvre | il est dans le mauvais AXE |

⛔ **QUI TRADUIT RÉPOND DE SA TRADUCTION.** Les 258 notes accompagnent notre propre traduction, et deux types s'en disputaient : \`translator_note\`, qui dit la fonction, et \`corpus_editorial_note\`, qui dit la maison. **Le type nomme une FONCTION dans l'édition** : quand nous traduisons, nos notes de traduction sont des notes du traducteur, comme celles de Vivès. \`corpus_editorial_note\` reste ce qu'il est — ce que NOUS ajoutons à une édition dont nous ne sommes pas le traducteur. ⛔ Sans cette règle il absorberait tout ce que le corpus produit, et l'axe cesserait de distinguer. ⚠️ C'est la décision 10 (§ 13.12) portée aux rôles : des deux noms d'une même chose, le survivant est celui que le code lit.

⛔ **ON NE CRÉE PAS UN TYPE POUR REDIRE CE QUE LE RENDU CALCULE.** \`source_marginalia\` déclare la manchette imprimée ; or la manchette du site ne lui doit rien : elle reconnaît ses renvois à leur FORME, une note qui n'est QU'UN renvoi. Mesuré : des 383 notes qui portent ce rôle, **312 passent déjà en manchette** sans qu'il soit lu une seule fois. Il quitte l'axe du TYPE pour \`metadata.provenance_note\` — le champ que la décision 2 institue pour dire d'où vient un renvoi, et qui ne porte encore aucune valeur : l'axe se nettoie sans que la provenance se perde. ⚠️ Les 71 notes que la manchette ne prend pas relèvent ensuite de la lecture, non du vocabulaire.

⛔ **ET UN RÔLE NE DIT JAMAIS UNE DISPOSITION.** \`reference_biblique_detachee\` nomme la façon dont un renvoi se pose sur la page, non celui qui parle : c'est l'affaire de \`rendering\`, et son nom français au milieu d'un vocabulaire anglais trahit l'import qui l'a semé. Il quitte l'axe du type, et ce qu'il dit du DÉTACHEMENT s'écrit là où se disent les dispositions.

⛔ **RETIRER N'EST PAS SUPPRIMER.** Aucune de ces trois valeurs ne s'efface avant que ce qu'elle porte ait trouvé sa colonne : *un axe se nettoie en déplaçant, jamais en jetant* — sans quoi le rangement coûte une information que la mesure ne saura plus retrouver.

⚠️ **CHANTIER OUVERT — \`rendering\` EST UN AXE SANS VOCABULAIRE.** Là où \`kind\` a une contrainte SQL et une source unique, la colonne voisine accepte n'importe quoi. Mesuré : **7 787 blocs en portent un, et le rendu n'en lit que 79** (\`inline_after_target\`, \`manual_line_break_in_verse\`). Le reste est de l'étiquette de chaîne d'import — \`markdown\` 4 641, \`reference_biblique_imprimee_non_liee\` 1 702, \`word_paragraph\` 516, \`note_editoriale_imprimee\` 409, \`plain\` 265, \`word_footnote\` 78, \`Footnote Verse\` 70 — et **26 blocs portent la chaîne \`{}\`**, qui n'est le nom de rien. Trois choses y sont mêlées : le format du texte source, l'outil dont il vient, la disposition voulue. ⛔ Rien ne se ferme tant qu'elles ne sont pas démêlées : une contrainte posée trop tôt ferait échouer les imports au lieu de les corriger.

⛔ **LE CONTRÔLE EXISTE, ET IL LIT LE VOCABULAIRE DANS LE CODE** : \`node scripts/controle-roles-notes.mjs\` liste les rôles hors vocabulaire, texte par texte, et sort en échec s'il en trouve un. ⚠️ Il ne recopie aucune liste : il lit \`app/lib/typeNote.ts\` et \`app/lib/apparatCritique.ts\`, et refuse de deviner s'il ne les comprend pas. *Une copie du vocabulaire dans le contrôle serait la seconde vérité que le contrôle existe pour empêcher.*`,
  },
]

// ⚠️ RETOUCHES d'une section déjà posée le même jour : `provenance_note` n'existe pas
// encore en base (0 bloc), et dire d'un rôle qu'« il se retire » sans nommer la colonne
// où va ce qu'il porte reviendrait à prescrire une perte. Idempotentes.
const CORRECTIONS = [
  {
    de: 'Il se retire ; les 71 autres relèvent de la lecture, non du vocabulaire.',
    vers: `Il quitte l'axe du TYPE pour \`metadata.provenance_note\` — le champ que la décision 2 institue pour dire d'où vient un renvoi, et qui ne porte encore aucune valeur : l'axe se nettoie sans que la provenance se perde. ⚠️ Les 71 notes que la manchette ne prend pas relèvent ensuite de la lecture, non du vocabulaire.`,
  },
  {
    de: `trahit l'import qui l'a semé. Il se retire.`,
    vers: `trahit l'import qui l'a semé. Il quitte l'axe du type, et ce qu'il dit du DÉTACHEMENT s'écrit là où se disent les dispositions.

⛔ **RETIRER N'EST PAS SUPPRIMER.** Aucune de ces trois valeurs ne s'efface avant que ce qu'elle porte ait trouvé sa colonne : *un axe se nettoie en déplaçant, jamais en jetant* — sans quoi le rangement coûte une information que la mesure ne saura plus retrouver.`,
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

let apres = avant
for (const ajout of AJOUTS) {
  if (apres.includes(ajout.marque)) { console.log(`Déjà posé : ${ajout.marque}`); continue }
  const n = apres.split(ajout.ancre).length - 1
  if (n !== 1) throw new Error(`ancre « ${ajout.ancre} » : ${n} occurrence(s), 1 attendue.`)
  apres = apres.split(ajout.ancre).join(ajout.ancre + ajout.section)
}
for (const correction of CORRECTIONS) {
  if (apres.includes(correction.vers)) { console.log('Retouche déjà faite.'); continue }
  const n = apres.split(correction.de).length - 1
  if (n !== 1) throw new Error(`retouche « ${correction.de.slice(0, 40)}… » : ${n} occurrence(s), 1 attendue.`)
  apres = apres.split(correction.de).join(correction.vers)
}
if (apres === avant) { console.log('Rien à écrire.'); process.exit(0) }

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n\'a été écrit.'); process.exit(0) }

// ⛔ La sauvegarde ne s'écrase JAMAIS : au second passage (une retouche), `avant`
// porte déjà la section, et l'écraser perdrait l'état d'origine, seul retour possible.
const cleSauvegarde = 'charte_ia_sauvegarde_20260909_avant_13_11_2'
const { data: dejaSauve } = await db.from('parametres').select('cle').eq('cle', cleSauvegarde).maybeSingle()
if (!dejaSauve) {
  const { error: errSauv } = await db.from('parametres').insert({ cle: cleSauvegarde, valeur: avant })
  if (errSauv) throw errSauv
} else {
  console.log(`Sauvegarde déjà prise : parametres['${cleSauvegarde}'] — conservée telle quelle.`)
}
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
for (const ajout of AJOUTS) if (!relu.valeur.includes(ajout.marque)) throw new Error(`relecture : ${ajout.marque} absent.`)
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
