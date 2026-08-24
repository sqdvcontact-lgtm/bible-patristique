/**
 * Inscrit dans la charte la règle du NOM D'UNE PERSONNE en trois rubriques (§29.2),
 * fixée par l'auteur le 2026-08-24.
 *
 * ⛔ La doctrine vit dans `parametres.charte_ia`, et nulle part ailleurs : ce script
 * n'écrit QUE là. Le miroir `charte/CHARTE_IA.md` se régénère ensuite par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 *
 * ⛔ Il refuse d'écrire si l'ancre ne se trouve pas exactement une fois, ou si la
 * section est déjà présente : mieux vaut ne rien inscrire qu'inscrire deux fois.
 *
 * Usage : node scripts/charte-ajouter-nom-personne-2026-08-24.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const essaiSeul = process.argv.includes('--dry')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const ANCRE = "## 30. Suivi de l'avancement — le centre de contrôle"

const SECTION = `## 29.2 Le nom d’une personne — nom, prénom, pseudonyme

Un nom appartient à quelqu’un, non à chacun de ses livres. Les trois rubriques vivent donc sur la fiche de la personne, dans \`auteurs_valeur\`, et jamais sur l’ouvrage : les corriger depuis un ouvrage les corrige partout où l’auteur est cité, et une seule fois.

Les trois rubriques sont facultatives. \`prenom\` et \`nom_famille\` portent le nom civil d’une personne moderne. \`pseudonyme\` porte le nom d’usage, celui sous lequel la personne signe et sous lequel on la cite. Voltaire en est un pour François-Marie Arouet.

Le pseudonyme vaut aussi pour tout auteur jusqu’à la fin du Moyen Âge. « Irénée de Lyon », « Augustin d’Hippone », « Césaire d’Arles » ne sont pas des patronymes mais des désignations, faites d’un prénom et d’un siège, d’un lieu ou d’un surnom. On ne leur cherche donc ni nom de famille ni prénom : leur nom entier est le pseudonyme. Les auteurs anciens et les collectifs n’ont pas de fiche dans \`auteurs_valeur\`, conformément au §29.1, et leur nom reste d’un seul tenant sur leur ligne de contributeur, où \`nature_personne\` dit déjà ce qu’il est.

L’affichage reste « Prénom Nom », comme avant ces rubriques. Quand un pseudonyme est renseigné, c’est lui qui paraît, et le nom civil demeure pour l’index, le tri et la recherche : on dit Voltaire, on classe à Arouet. La forme de classement met le nom de famille devant, séparé du prénom par une virgule.

⚠️ La colonne \`auteurs_valeur.nom\` n’est jamais réécrite depuis un écran d’administration. C’est par elle que les notices des ouvrages et les lignes de contributeurs retrouvent la personne, et la réécrire les détacherait. Les rubriques la doublent, et ce qui paraît passe par la composition, qui retombe sur elle tant que les rubriques sont vides.

⛔ Le découpage automatique d’un nom est une PROPOSITION, jamais un verdict. Rien, dans « José Grosdidier de Matons », ne dit à une machine si le nom de famille est « de Matons » ou « Grosdidier de Matons ». Les cas de ce genre sont signalés pour relecture au lieu d’être tranchés en silence. La logique est pure et testée dans \`app/lib/nomsPersonnes.ts\`.

⛔ Un nom qui ne paraît que dans le texte libre d’une notice, sans fiche ni ligne de contributeur, est SIGNALÉ et non créé. Lui ouvrir une fiche sans note ferait retomber son ouvrage à « à vérifier », le calcul de la base déclassant tout ouvrage dont un auteur scientifique n’est pas évalué. Combler ces trous est un arbitrage éditorial, pas une reprise mécanique.


`

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', 'charte_ia').maybeSingle()
if (error || !data) { console.error('Lecture de la charte refusée :', error?.message); process.exit(1) }
const charte = data.valeur

if (charte.includes('## 29.2 Le nom')) { console.error('⛔ La section §29.2 est déjà là. Rien à faire.'); process.exit(1) }
const occurrences = charte.split(ANCRE).length - 1
if (occurrences !== 1) { console.error(`⛔ L'ancre se trouve ${occurrences} fois, il en faut une. Rien écrit.`); process.exit(1) }

const nouvelle = charte.replace(ANCRE, SECTION + ANCRE)
console.log(`Charte : ${charte.length} → ${nouvelle.length} signes (+${nouvelle.length - charte.length}).`)

if (essaiSeul) { console.log('Essai seul, rien écrit. Relancer sans --dry.'); process.exit(0) }

const { error: e2 } = await sb.from('parametres').update({ valeur: nouvelle }).eq('cle', 'charte_ia')
if (e2) { console.error('Écriture refusée :', e2.message); process.exit(1) }
console.log('✓ §29.2 inscrite dans parametres.charte_ia.')
console.log('  Tirer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
