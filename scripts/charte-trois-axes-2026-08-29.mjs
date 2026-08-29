/**
 * § 7.1 : LES TROIS AXES D'UN STYLE, et les règles fixes de leur attribution.
 *
 * Décision de l'auteur du 29 août 2026, après l'audit des styles. La question
 * posée était : faut-il préfixer chaque style par sa famille de page —
 * `patristique_citation_sortie`, `bible_apparat_citation_sortie` — ou garder un
 * vocabulaire de fonctions dont la composition change selon la surface ?
 *
 * La seconde voie a été retenue, pour trois raisons qui sont écrites dans la règle.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-trois-axes-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '## 8. Notes structurées et références présentes dans le texte'

const AJOUT = `### 7.1. Les trois axes d’un style, et les règles de leur attribution

Un style se déclare sur **trois axes qui ne se confondent jamais**.

| Axe | Ce qu’il dit | Où il se déclare |
|---|---|---|
| **Le style** | ce que la chose EST : paragraphe, citation sortie, verset, titre de rang *n*, repère, apparat | dans la donnée |
| **La surface** | OÙ elle se compose : texte biblique, apparat des bibles, corps d’une œuvre, apparat des œuvres | par la page — ⛔ jamais sur le segment |
| **Le rang** | la profondeur d’un titre (T1-T6) ou la portée d’une information (I1-I6) | dans la donnée, pour le paratexte biblique |

**Un style nomme une fonction ; une surface nomme une composition ; une donnée ne porte jamais sa surface.**

⛔ **Le style ne se préfixe donc PAS par sa famille de page.** La question a été tranchée le 29 août 2026, et voici pourquoi.

D’abord parce que **c’est déjà ce que fait le site** : la citation sortie compose à la même mesure sur les deux surfaces, l’introduction perd son retrait de 12 % quand elle est lue dans sa pièce, le numéro de verset prend la face de la page Bible mais passe en exposant dans un bloc patristique. Ce sont des surcharges contextuelles d’un même style.

Ensuite parce que **le préfixe n’apprend rien à la donnée** : \`segments.nature\` vit dans \`segments\`, qui EST le corpus patristique, et \`semantic_style\` dans une table qui n’est que biblique. Écrire la famille dans la valeur, c’est répéter ce que la table dit déjà — et ce qui se répète dérive. La preuve en a été faite : \`introduction_subsection\` face à \`introduction_sous_section\`, deux graphies du même style, onze blocs invisibles.

Enfin parce que **le préfixe aurait légitimé le pire défaut du corpus** : le Pentateuque et le Nouveau Testament emploient des noms différents pour la même fonction. Avec un vocabulaire unique de fonctions, cette divergence est une erreur qu’on voit ; avec un préfixe par famille, elle serait devenue une variante.

⚠️ **Le nom se QUALIFIE dès qu’il sort de sa table.** Dans la charte, dans une planche, dans une conversation, on écrit \`patristique/verset\` et \`bible_apparat/commentaire_pericope\` : la barre dit la surface sans l’écrire dans la donnée. C’est nécessaire, \`verset\` désignant deux choses — une rangée de la page Bible et une nature de segment patristique.

**Les règles fixes d’attribution.**

1. ⛔ **Un style ne se devine jamais du texte** — ni de la casse, ni du corps, ni de la ponctuation, ni de la place dans la page. Il se déclare, et depuis le vocabulaire.
2. ⛔ **Le vocabulaire est CLOS, et la base le tient.** Une nature de segment hors de \`chk_segments_nature\` est refusée à l’écriture ; un style de paratexte hors de \`bible_styles_semantiques\` l’est par un déclencheur. Ce verrou a été posé le 29 août 2026 : jusque-là, un style inconnu entrait sans bruit et le bloc ne paraissait nulle part, le rendu refusant ce qu’il ne sait pas composer.
3. **On étend le vocabulaire, on ne le contourne pas.** Un besoin nouveau s’écrit dans le registre — \`work/fillion/semantic_display_hierarchy.json\` pour le paratexte, \`app/lib/naturesSegments.ts\` et la contrainte pour les segments — puis se sème en base. ⛔ Jamais un INSERT à la main : deux vocabulaires qui divergent valent moins qu’un seul.
4. ⚠️ **Une faute de graphie ne devient pas un alias.** Les alias existent pour les noms hérités, non pour les coquilles : celles-ci se corrigent dans la donnée.
5. **Le rang se lit dans la donnée, jamais dans le chiffre du jeton.** \`T3\` ne veut pas dire \`h3\` : la balise se calcule sur les parents réellement présents.
6. ⚠️ **Deux styles peuvent partager un rang s’ils diffèrent d’AXE.** \`titre_chapitre_livre\` et \`titre_paragraphe_livre\` sont tous deux T5 : le premier est matériel et ne commande pas les subdivisions, le second est analytique et les commande.
7. **La composition, elle, appartient à la surface** et vit dans le code, en un seul endroit par famille : \`app/lib/compositionBible.ts\`, \`compositionOeuvre.ts\`, \`compositionVers.ts\`, \`compositionVersets.ts\`, et les classes de \`globals.css\`. ⛔ Une composition écrite deux fois dérive à la première retouche.
8. **La planche des styles — \`/admin/styles\` — montre les quatre surfaces**, et ne rejoue aucune composition : elle les tire de ces modules. Une planche qui recopierait ferait autorité contre la page qu’elle décrit.

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
if (avant.includes('### 7.1. Les trois axes')) { console.log('Déjà posé.'); process.exit(0) }
const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCRE).join(AJOUT + ANCRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
