/**
 * Corrige la charte éditoriale sur la lecture bilingue, dans SES DEUX exemplaires
 * (charte/CHARTE_IA.md et parametres.charte_ia), avec la même table de remplacements.
 *
 * Trois phrases affirmaient que le bilingue se compose depuis `segments.texte_original`.
 * Il se compose désormais depuis l'alignement. Un quatrième passage disait que la copie
 * embarquée survit à la création du texte original : elle doit au contraire se retirer.
 *
 * ⛔ Le script REFUSE d'écrire si un motif ne se trouve pas exactement une fois dans
 * chacun des deux exemplaires : mieux vaut ne rien corriger que corriger à moitié.
 *
 * Usage : node corriger-charte-bilingue.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§12.1 — l’original embarqué ne sert plus le bilingue',
    avant: '**1. Original embarqué.** Une traduction peut porter son texte original en regard dans `segments.texte_original`. Cet original accompagne la traduction et sert aux modes de lecture bilingue ou original de cette page. Il n’est pas une œuvre autonome : il n’a pas d’`id_oeuvre`, n’a pas de favori propre et ne crée pas une seconde entrée de bibliothèque. Il demeure une couche parallèle de la traduction.',
    apres: '**1. Original embarqué — forme héritée, en extinction.** Une traduction ancienne peut porter son texte original recopié dans `segments.texte_original`. ⛔ Cette copie ne sert plus la lecture bilingue, qui se compose depuis l’alignement (§ 12.2) : elle n’est plus lue qu’en repli, pour les œuvres dont l’original n’a pas encore de texte propre, et elle s’éteindra avec elles. Elle n’est pas une œuvre autonome : elle n’a pas d’`id_oeuvre`, pas de favori propre, et ne crée pas une seconde entrée de bibliothèque. ⛔ Aucune importation nouvelle ne l’alimente : un texte en langue originale entre comme **texte de l’œuvre**, avec son propre `id_texte`, et c’est l’alignement qui dit la correspondance.',
  },
  {
    nom: '§12.1 — dernier alinéa',
    avant: 'tandis que le bilingue de la traduction continue d’utiliser son original embarqué.',
    apres: 'et le bilingue se compose depuis l’ensemble d’alignement qui relie les deux textes.',
  },
  {
    nom: 'modèle des versions — la copie se retire',
    avant: 'La création de l’original autonome ne supprime donc pas l’original embarqué de la traduction lorsque celui-ci sert au bilingue.',
    apres: '⛔ Un texte n’existe qu’à un seul endroit. Dès que l’original possède son propre `id_texte`, la copie embarquée devient redondante et se retire : l’alignement suffit à la lecture bilingue.',
  },
  {
    nom: 'modèle des versions — second rappel',
    avant: 'tandis que le bilingue continue d’utiliser l’original embarqué de la traduction.',
    apres: 'tandis que le bilingue se compose depuis l’alignement des deux textes.',
  },
  {
    nom: '§12.2 — le groupe d’alignement est le paragraphe du bilingue',
    avant: 'Les cardinalités `1:1`, `1:n`, `n:1`, `n:m`, `1:0` et `0:1` sont admises lorsqu’elles décrivent réellement le rapport entre les textes. Une omission, une addition ou une divergence ne doit jamais être masquée pour obtenir artificiellement du `1:1`.',
    apres: [
      'Les cardinalités `1:1`, `1:n`, `n:1`, `n:m`, `1:0` et `0:1` sont admises lorsqu’elles décrivent réellement le rapport entre les textes. Une omission, une addition ou une divergence ne doit jamais être masquée pour obtenir artificiellement du `1:1`.',
      '',
      '**Le groupe d’alignement est le paragraphe de la lecture bilingue.** C’est lui qui recoupe les deux colonnes, et non `paragraphe`, qui ne vaut que dans un seul texte à la fois : sur les 57 groupes de la Doctrine des Apôtres, 28 enjambent deux sections numérotées, et 4 des 1 036 groupes de la Cité de Dieu enjambent deux paragraphes. Le niveau retenu est `paragraph`, à défaut `segment`, à défaut `division`, et seulement entre le texte lu et un texte en langue originale : un alignement entre deux traductions françaises n’a rien à mettre dans une colonne de latin.',
      '',
      'Un groupe qui enjambe deux divisions se rend en plusieurs blocs, puisque les divisions se composent séparément, chacune sous son titre. L’original ne paraît alors qu’en regard du **premier** bloc ; les suivants gardent leur grille, colonne d’en face vide, pour que la traduction ne reprenne pas toute la largeur au milieu d’un empan. Le filet, qui marque l’appariement empan par empan, ne se tire qu’au **dernier** : tiré entre deux blocs d’un même groupe, il annoncerait une frontière que l’alignement ne reconnaît pas.',
      '',
      'Un groupe de cardinalité `1:0` — une addition du traducteur — ne met rien en regard : son bloc se compose seul, sans ouvrir une grille bilingue vide.',
      '',
      '⚠️ La lecture bilingue n’est offerte au lecteur que si **les deux** textes sont publics : la RLS des trois tables d’alignement l’exige. Un original laissé en `review` réserve donc le bilingue à l’administration, sans que rien ne le signale au visiteur.',
    ].join('\n'),
  },
]

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
  }
  return sortie
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error

// ⛔ Les DEUX d'abord, l'écriture ensuite : si l'un des deux exemplaires ne porte pas
// exactement les motifs attendus, on n'en corrige aucun.
const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)
const { error: erreurEcriture } = await db.from('parametres').update({ valeur: distantApres }).eq('cle', 'charte_ia')
if (erreurEcriture) throw erreurEcriture
console.log('Les deux exemplaires sont corrigés.')
