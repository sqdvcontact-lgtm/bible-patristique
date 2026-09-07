/**
 * Corrige la charte, § 12.2 : ALIGNEMENT N'EST PAS PARAGRAPHAGE.
 *
 * Deux passages tenaient le groupe d'alignement pour le paragraphe de la lecture
 * bilingue. Le Discours 38 les a démentis : son alignement, posé au SEGMENT, compte
 * 76 groupes sur un corps de deux paragraphes, et le lecteur en tirait 76 blocs,
 * chacun sous son filet et son blanc.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia` —
 * avec la même table de remplacements. ⛔ Le script REFUSE d'écrire si un motif ne se
 * trouve pas exactement une fois dans chacun : mieux vaut ne rien corriger que corriger
 * à moitié.
 *
 * ⚠️ Verrou optimiste sur `mis_a_jour` : la charte est écrite par plusieurs mains, et
 * une lecture suivie d'une écriture sans garde effacerait le travail d'un autre.
 *
 * Usage : node scripts/charte-alignement-nest-pas-paragraphage-2026-09-07.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 12.2 — le bloc de la lecture bilingue est le PARAGRAPHE',
    avant: '**Le groupe d’alignement est le paragraphe de la lecture bilingue.** C’est lui qui recoupe les deux colonnes. Le champ `paragraphe` reste propre à chaque texte : un groupe peut traverser les divisions de la langue originale lorsque celles-ci ne coïncident pas avec le paragraphage de la traduction, mais il ne traverse jamais une frontière de paragraphe du texte traduit.',
    apres: [
      '⛔ **ALIGNEMENT N’EST PAS PARAGRAPHAGE** (décision de l’auteur, 7 septembre 2026). Le groupe dit ce qui se répond d’une colonne à l’autre ; il ne dit RIEN de la découpe du texte, qui appartient à l’édition seule et se lit dans `paragraphe`. **Le bloc de la lecture bilingue est donc le PARAGRAPHE**, découpé sur la clé éditoriale entière — `id_texte`, `espace_textuel`, `ref_niv*`, `paragraphe` —, ses segments rangés par `rang` et joints par `join_before`. Les groupes se RÉPARTISSENT ensuite sur ces blocs, chacun composant son original dans le premier bloc qu’il touche. Le champ `paragraphe` reste propre à chaque texte : un groupe peut traverser les divisions de la langue originale lorsque celles-ci ne coïncident pas avec le paragraphage de la traduction, mais il ne traverse jamais une frontière de paragraphe du texte traduit.',
      '',
      '⚠️ La règle inverse a valu du 24 août au 7 septembre 2026, et le *Discours 38* de Grégoire de Nazianze l’a démentie : son alignement, posé au SEGMENT, compte 76 groupes sur un corps de deux paragraphes, et le lecteur en tirait 76 blocs, chacun sous son filet et son blanc. On y lisait donc soixante-seize paragraphes ouverts en minuscule — « ces choses là… », « ce qu’endure aussi maintenant le Verbe… », « aussi ont faict les Juifs… » — là où Morel n’en a écrit qu’un, dont ces minuscules sont justement la preuve.',
      '',
      '⛔ **Une frontière d’alignement ne pose jamais un blanc, un filet ni un `<p>` là où le paragraphe de l’édition continue.** Un changement de groupe peut décaler la correspondance HORIZONTALE entre les colonnes ; il ne crée pas une rupture verticale. Et l’on ne « corrige » jamais en base une minuscule d’ouverture pour masquer un défaut d’affichage : cette minuscule est la trace d’une phrase qui continue, et l’effacer détruirait la preuve au lieu du défaut.',
    ].join('\n'),
  },
  {
    nom: '§ 12.2 — un groupe qui enjambe deux blocs',
    avant: 'Un groupe qui enjambe deux divisions se rend en plusieurs blocs, puisque les divisions se composent séparément, chacune sous son titre. L’original ne paraît alors qu’en regard du **premier** bloc ; les suivants gardent leur grille, colonne d’en face vide, pour que la traduction ne reprenne pas toute la largeur au milieu d’un empan. Le filet, qui marque l’appariement empan par empan, ne se tire qu’au **dernier** : tiré entre deux blocs d’un même groupe, il annoncerait une frontière que l’alignement ne reconnaît pas.',
    apres: 'Un groupe qui enjambe deux blocs se rend en plusieurs blocs — deux divisions, qui se composent séparément sous leur titre, ou deux paragraphes, ce que la règle 1 proscrit et que la donnée fait pourtant encore. L’original ne paraît alors qu’en regard du **premier** ; les suivants gardent leur grille, colonne d’en face vide, pour que la traduction ne reprenne pas toute la largeur au milieu d’un empan. Le filet, qui marque l’appariement empan par empan, ne se tire qu’au **dernier** : tiré entre deux blocs d’un même groupe, il annoncerait une frontière que l’alignement ne reconnaît pas. ⚠️ Le paragraphe, lui, se sépare quand même : un empan à cheval décale la correspondance horizontale, il n’efface pas une coupure que l’édition a voulue.',
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

const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single()
if (error) throw error

// ⛔ Les DEUX d'abord, l'écriture ensuite : si l'un des deux exemplaires ne porte pas
// exactement les motifs attendus, on n'en corrige aucun.
const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

writeFileSync(cheminCharte, localApres)

// Verrou optimiste : la ligne ne doit pas avoir bougé depuis la lecture.
const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase. Le fichier local, lui, est corrigé — relancer après avoir tiré le miroir.')
}

// Double relecture : on vérifie que la correction est bien celle qu'on voulait.
const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, avant, apres } of REMPLACEMENTS) {
  if (relue.valeur.includes(avant)) throw new Error(`Relecture : « ${nom} » porte encore l’ancien texte.`)
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
