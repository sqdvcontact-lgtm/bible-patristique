/**
 * § 15.4 et registre GPT ↔ Claude : ce que Mt 1,25 a appris.
 *
 * Le détachement de la glose absorbée dans MAT.1.25 a servi de cas-test. Il a
 * montré que la DONNÉE porte sans perte un surnuméraire inséré au milieu d'un
 * verset, mais que la LECTURE ne sait pas l'y remettre ; et il a fait paraître
 * deux défauts de matérialité qui ne lui sont pas propres.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-glose-intra-verset-2026-09-05.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LA LECTURE, ELLE, NE SAIT PAS L’INSÉRER'

const ANCRE_154 = 'Le redécoupage d’un surnuméraire ne modifie jamais `bible_source_unit_texts`.'

const SECTION_154 = `**Un surnuméraire peut s’insérer À L’INTÉRIEUR d’un verset canonique, entre deux portions de celui-ci.** La donnée le porte sans perte : le segment canonique garde deux empans disjoints, le surnuméraire prend celui du milieu, et l’ordre matériel est dit par des \`alignment_order\` intercalés. La convention de frontière est celle de \`GEN.EXTRA.GLOSS.25.21\`, reprise par \`MAT.1.EXTRA.25A\` : chaque fragment porte son propre séparateur final, la reprise se joint en \`join_before = 'none'\`, et la couverture reste exacte, point de code par point de code. Le segment canonique reçoit alors \`discontinuous: true\` et \`intra_verse_extra\`, le surnuméraire \`intra_verse: true\` avec \`after_text\` et \`before_text\`.

⚠️ **LA LECTURE, ELLE, NE SAIT PAS L’INSÉRER.** L’ordre de lecture est celui des alignements, et un verset canonique n’en porte qu’un seul : le surnuméraire ne peut donc paraître qu’avant ou après le verset ENTIER, jamais entre ses deux portions. Sur Mt 1,25 le lecteur voit « et ne la conut pas desi que ele ot enfant son enfant premier ne. Et ioseph apela lenfant ihesum. » puis la glose, là où le manuscrit intercale la glose entre les deux. ⛔ On ne fabrique ni faux verset, ni suffixe, ni \`canon_id\` artificiel pour rattraper l’ordre à l’affichage : la donnée reste juste et la restitution demeure approchée tant que le modèle de rendu n’aura pas d’ordre INTRA-verset. \`GEN.EXTRA.GLOSS.25.21\` est dans le même cas depuis le 19 août 2026.

${ANCRE_154}`

const ANCRE_REGISTRE = '**Tests de régression à communiquer à Claude.**'

const SECTION_REGISTRE = `- **CONFIRMÉ — \`bible_source_units.break_no\` est décalé d’une ligne.** La colonne ne dit pas ce que dit le balisage : sur les 58 312 unités de TR0009, \`break_no\` d’une ligne vaut l’attribut \`break="no"\` de la ligne SUIVANTE dans 58 306 cas. Les totaux concordent (12 259 contre 12 256), ce qui masque le décalage à tout contrôle qui se contente de compter. ⛔ Ne jamais décider une jonction de mots sur cette colonne : la source de vérité est \`bible_source_unit_texts.source_markup\` de la couche diplomatique. La colonne est à recalculer ou à retirer.

- **CONFIRMÉ — \`join_before\` fautif sur 4 476 jonctions de TR0009.** \`join_before\` porte le séparateur à poser AVANT l’empan courant ; il vaut \`none\` si et seulement si la ligne PRÉCÉDENTE porte \`break="no"\`, c’est-à-dire si un mot y est coupé. Sur les 55 207 jonctions décidables, celles où l’empan précédent va jusqu’au bout de sa ligne et où le courant commence au début de la sienne, **1 564 posent une espace de trop** et **2 912 en omettent une**, soit 8,1 %. Le défaut se lit à l’écran : \`empresne deuant\`, \`laisse a en tendre\`, \`charnelmentcome\`, \`sain te marie\` dans le seul Mt 1,25 ; \`fistce\` et \`ma rie\` dans Mt 1,24. Répartition la plus lourde : LUK 578, ACT 542, GEN 680, MAT 456, EXO 436, JOB 363, NUM 359, JHN 372, MRK 176. ⚠️ Les Psaumes sont propres (3 écarts sur 5 524). Les quatre jonctions du périmètre de Mt 1,25 ont été corrigées le 5 septembre 2026 ; le reste de la famille attend une passe dédiée, déterministe, dont la règle est celle rappelée ici.

- **CONFIRMÉ — les surnuméraires de TR0013 ne sont jamais rendus.** \`chargerVersetsCanoniquesV2\` (app/lib/bibleEditorialServer.ts) lit \`versets_v2\` par \`.in('canon_id', lot)\`. Une ligne surnuméraire porte \`canon_id = NULL\` par construction, conformément au § 15.4 : elle est donc invisible à l’unique chemin de lecture de la traduction moderne. La matière est en base, traduite et ordonnée par \`ordre_slot\`, mais aucune page ne la montre. Cela vaut pour les gloses de Luc, de Jean, d’Exode, de Genèse et d’Esther comme pour \`MAT.1.EXTRA.25A\`. ⛔ Ne pas donner de \`canon_id\` à ces lignes pour les faire paraître : c’est au lecteur de \`versets_v2\` d’aller les chercher par \`(livre, ch_orig, ordre_slot)\`, comme le fait déjà le chemin Bible 899 par \`alignment_order\`.

- **CONFIRMÉ — l’apparat ne sait pas s’ancrer sur un surnuméraire.** Les 8 630 notes de TR0013 portent toutes un \`canon_id\`, et aucune n’en est dépourvue. Une note qui commente une glose ne peut donc être rattachée qu’au verset canonique voisin. Sur Mt 1,25 la note \`tr0013-mat-1-25-textual-01\` a été réécrite pour dire la discontinuité et nommer \`MAT.1.EXTRA.25A\` ; c’est un pis-aller. Le modèle demande soit une ancre de segment (\`bible_verse_note_anchors.target_segment_id\`, aujourd’hui inutilisée pour cette source), soit un \`canon_id\` nullable réellement lu.

- **LEVÉE PARTIELLE — Control V2 couvre désormais \`bible_editorial_segment\` et \`bible_verse_note_block\`.** \`internal.controle_v2_etat_liens_objet\` et \`internal.controle_v2_dependances\` acceptent les deux types, et les contraintes de \`controle_v2_modification_checks\` et \`controle_v2_mutations_audit\` avec eux ; l’identifiant d’un bloc de note s’écrit \`<note_id>#<block_id>\`. Le préflight photographie les alignements, les empans source, une empreinte de couverture matérielle, les ancres, les blocs de corps, les projections de spine et les liens dépendants ; le postcheck exhaustif se referme comme pour un verset. ⚠️ **Il n’y a toujours ni garde bloquante ni trigger d’audit sur ces tables** : le protocole est ouvert, il n’est pas imposé. Ce choix est délibéré, une garde neuve arrêterait sans préavis les chantiers en cours et un trigger d’audit ferait grossir une file de postcontrôles déjà lourde. La dette restante est donc nommée, et non plus l’impossibilité d’écrire sous protocole.

${ANCRE_REGISTRE}`

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

for (const [nom, ancre] of [['§ 15.4', ANCRE_154], ['registre', ANCRE_REGISTRE]]) {
  const n = avant.split(ancre).length - 1
  if (n !== 1) throw new Error(`ancre ${nom} : ${n} occurrence(s), 1 attendue.`)
}

const apres = avant.split(ANCRE_154).join(SECTION_154).split(ANCRE_REGISTRE).join(SECTION_REGISTRE)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260905_avant_glose_intra_verset'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
