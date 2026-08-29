/**
 * § 7.3 : COMMENT UN STYLE SE CHOISIT, S'ÉCRIT ET SE REND.
 *
 * Le § 7.1 dit quels sont les axes, le § 7.2 dit que le nom porte une nature. Aucun
 * des deux ne dit comment on s'en sert. Demande de l'auteur du 29 août 2026 :
 * « explique le fonctionnement des styles dans la charte ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-fonctionnement-styles-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '## 8. Notes structurées et références présentes dans le texte'

const AJOUT = `### 7.3. Comment un style se choisit, s’écrit et se rend

Les deux paragraphes précédents disent ce qu’un style EST. Celui-ci dit comment on
s’en sert, du texte qu’on a sous les yeux jusqu’à la page composée.

#### 7.3.1. Il y a DEUX vocabulaires, et ils ne se rencontrent jamais

C’est la confusion la plus fréquente, et elle vient de ce que les deux disent des
choses voisines.

| | Le corps d’une ŒUVRE patristique | Le paratexte d’une BIBLE commentée |
|---|---|---|
| Où il vit | \`segments.nature\` | \`bible_editorial_body_blocks.metadata.semantic_style\` |
| Ce qu’il décrit | un morceau du texte de l’auteur | un bloc que l’ÉDITEUR a ajouté autour du texte sacré |
| Combien de valeurs | 14 | 12 |
| Ce qui le tient | la contrainte \`chk_segments_nature\` | la table \`bible_styles_semantiques\` et son déclencheur |
| Où on l’étend | \`app/lib/naturesSegments.ts\` + une migration | \`work/fillion/semantic_display_hierarchy.json\` + un semis |

⛔ **Une valeur de l’un n’est jamais une valeur de l’autre.** \`verset\` est une nature
de segment patristique ; ce n’est pas le \`titre_pericope\` d’une bible, et la rangée
de la page Bible n’est ni l’un ni l’autre. C’est pourquoi le nom se QUALIFIE dès qu’il
sort de sa table : on écrit \`patristique/verset\` et \`bible_apparat/commentaire\`.

⚠️ **Une nature qu’une table accepte et que le CODE ignore n’existe pas pour le
lecteur.** Ce n’est pas une composition ratée, c’est une disparition, et rien ne la
signale. Le dépôt l’a payé deux fois : \`apparat_auteur\` le 18 août 2026 — le
« Prologue de Rufin » évanoui —, \`lemme\` le 29 — quarante-sept versets de Jérôme sur
Jonas, dans une œuvre publiée, dont le commentaire s’ouvrait sur la comparaison d’une
traduction avec un verset absent. Une garde l’exige désormais : toute nature valide
doit être RANGÉE, au corps, à l’apparat, ou parmi les formes éteintes.

#### 7.3.2. Ce qu’on écrit pour un bloc de paratexte biblique

Deux champs, et chacun dit une chose :

\`\`\`jsonc
"metadata": {
  "semantic_style": "commentaire",   // la NATURE — ce que le bloc EST
  "semantic_level": "I5"             // le RANG — l’étendue qu’il explique
}
\`\`\`

⛔ **Un titre n’écrit PAS son rang** : son nom le porte. \`titre_partie_livre\` EST le
rang T2, et l’écrire une seconde fois ouvrirait la porte à ce que les deux se
contredisent — ce qui était arrivé sur vingt-quatre blocs avant la normalisation du
29 août 2026. **Chaque fait une fois, et une seule.**

Les **dix noms** que le corpus emploie, au 29 août 2026 :

| Nom | Ce que c’est | Rang |
|---|---|---|
| \`titre_partie_livre\` | une partie du livre | T2, dans le nom |
| \`titre_section_livre\` | une section | T3, dans le nom |
| \`titre_sous_section\` | une sous-section | T4, dans le nom |
| \`titre_chapitre_livre\` | la mention imprimée « CHAPITRE IX » — ⛔ jamais affichée | T5, dans le nom |
| \`titre_paragraphe_livre\` | la division « § » du commentaire | T5, dans le nom |
| \`titre_pericope\` | une péricope | T6, dans le nom |
| \`introduction_titree\` | une introduction qui porte son PROPRE titre | déclaré |
| \`introduction\` | une introduction qui n’en porte pas | déclaré |
| \`commentaire\` | l’explication suivie | déclaré |
| \`notice\` | l’appoint documentaire, rendu à côté du fil | déclaré |

S’y ajoutent \`titre_livre\`, que la page porte déjà dans ses métadonnées et qui ne se
rend donc pas, et \`note_verset\`, qui n’est pas un bloc de corps mais une note.

Les six rangs d’information, de la portée la plus large à la plus étroite : **I1** le
livre — et au-dessus, groupe de livres, testament, Bible entière —, **I2** une partie,
**I3** une section ou une sous-section, **I4** un chapitre, **I5** une péricope, **I6**
un verset.

⛔ **Les deux échelles ne s’alignent PAS**, et c’est le piège qui coûte le plus cher :
\`I4\` est le CHAPITRE quand \`T4\` est la SOUS-SECTION. Aucune arithmétique ne fait
passer de l’une à l’autre. Un sous-titre prend donc le rang du TITRE auquel il
s’accroche, jamais le sien.

#### 7.3.3. Ce que la page en fait

Le rendu ne compose que sur **deux classes** : le rang et la nature.

\`\`\`
"commentaire" + I5  →  <section class="cs-bible-info--i5 cs-bible-block--commentary">
\`\`\`

C’est tout, et c’est pourquoi le nom d’un style n’a pas à porter autre chose que sa
nature. Le RANG règle le blanc et le retrait ; la NATURE règle la police, l’encre et
la place — une notice sort du fil dans un aparté, un commentaire y reste avec sa
manchette, une introduction de rang haut se compose en préambule centré.

⚠️ **Le chiffre du jeton n’est pas la balise HTML.** \`T3\` ne veut pas dire \`h3\` : la
balise se calcule sur les parents RÉELLEMENT présents, sans quoi une édition sans
partie ni sous-section sauterait de \`h1\` à \`h5\` et casserait le plan
d’accessibilité.

⚠️ **Un nom HÉRITÉ se résout, il ne se réécrit pas tout seul.** \`commentaire_pericope\`
rend \`commentaire\` + I5, et la page ne change pas d’un pixel. Ces noms existent pour
que rien ne casse, non pour qu’on continue d’en écrire.

#### 7.3.4. Les trois verrous

1. **Le vocabulaire est CLOS.** Un style hors de \`bible_styles_semantiques\` est refusé
   à l’écriture, et une nature hors de \`chk_segments_nature\` aussi. Avant ce verrou,
   un style mal orthographié entrait sans bruit et son bloc disparaissait du site sans
   un mot : quarante-cinq blocs y ont été perdus.
2. **Une information sans RANG est refusée**, par la base comme par le rendu. Le nom
   dit la nature, le rang se déclare, et un bloc qui n’en déclare aucun ne s’en invente
   pas un.
3. **Le rendu REFUSE ce qu’il ne sait pas composer**, au lieu de l’aplatir en
   paragraphe générique. Un bloc mal déclaré ne paraît pas ; c’est brutal, et c’est
   voulu — une donnée fausse rendue proprement ne se corrige jamais.

#### 7.3.5. Ce qu’on ne fait jamais

⛔ **Deviner un style du texte.** Ni de la casse, ni du corps, ni de la ponctuation, ni
de la place dans la page. Fillion centre « INTRODUCTION » et justifie son corps : la
mise en page ne dit pas la fonction.

⛔ **Écrire la portée dans le nom.** \`commentaire_pericope\` répétait ce que le rang
dit déjà, et ce qui se répète dérive : le Pentateuque et le Nouveau Testament avaient
fini par employer des vocabulaires disjoints pour des fonctions voisines.

⛔ **Faire d’une coquille un alias.** Les alias sont pour les noms hérités ; une faute
de graphie se corrige dans la donnée. \`introduction_subsection\` contre
\`introduction_sous_section\` avait rendu onze blocs invisibles.

⛔ **Ajouter un style à la main en base.** On l’écrit dans le registre, puis on sème.
Deux vocabulaires qui divergent valent moins qu’un seul.

⛔ **Garder un champ que rien ne lit.** Ce n’est pas une réserve pour plus tard, c’est
une seconde vérité qui attend de contredire la première — \`semantic_level\` et
\`embedded_title_level\` étaient écrits, exposés par la vue, lus par personne, et
divergeaient déjà quand on les a regardés.

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
if (avant.includes('### 7.3. Comment un style se choisit')) { console.log('Déjà posé.'); process.exit(0) }
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes('### 7.3. Comment un style se choisit')) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
