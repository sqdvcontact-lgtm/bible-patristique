/**
 * § 35.6.1 : une liste d'ouvrages se compose depuis la DONNÉE STRUCTURÉE.
 *
 * Trois décisions de l'auteur, prises le 28 août 2026 sur la pièce « Du même
 * auteur » de Fillion et valant pour toute liste bibliographique :
 *
 *  1. le titre et le sous-titre sont deux champs distincts de la base, mais un
 *     seul intitulé typographique : tous deux en italique, joints par un
 *     DEUX-POINTS et non par une virgule — ce qui remplace la règle antérieure ;
 *  2. la source de vérité est la donnée structurée, jamais un texte
 *     bibliographique précomposé, et la ponctuation vient du rendu ;
 *  3. la description matérielle (format, pagination, planches, figures,
 *     dimensions) ne s'affiche pas dans une liste d'ouvrages.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-liste-ouvrages-structuree-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: 'titre et sous-titre',
    avant: 'Dans une liste bibliographique éditoriale, la casse du fac-similé ou de l’OCR ne commande jamais l’affichage. Les titres sont ramenés à la casse française normale ; le titre individualisé de l’ouvrage se compose en italique. Un sous-titre bibliographiquement solidaire du titre est intégré au même intitulé et séparé par une virgule, non par un point : `*Évangile selon saint Jean, introduction critique et commentaires*`.',
    apres: 'Dans une liste bibliographique éditoriale, la casse du fac-similé ou de l’OCR ne commande jamais l’affichage. Les titres sont ramenés à la casse française normale ; le titre individualisé de l’ouvrage se compose en italique. **Le titre et le sous-titre sont deux champs distincts de la base** — `ouvrages_bibliographiques.titre` et `ouvrages_bibliographiques.sous_titre` — mais ils constituent typographiquement UN SEUL intitulé : ils se composent tous deux en italique et se joignent par un **deux-points**, précédé de son espace insécable `U+00A0`, non par une virgule ni par un point : `*Évangile selon saint Jean : Introduction critique et commentaires*`. ⚠️ Décision de l’auteur du 28 août 2026, qui remplace la virgule prescrite jusque-là.\n\n**La source de vérité est la donnée STRUCTURÉE, jamais un texte bibliographique précomposé.** Une liste d’ouvrages se construit champ par champ : `bible_editorial_bibliography_entries` donne l’appartenance à la pièce et l’ordre d’affichage, `ouvrages_bibliographiques` le titre, le sous-titre, le lieu et l’année, `ouvrage_contributeurs_scientifiques` et `auteurs_valeur` l’auteur normalisé, `editeurs_valeur` l’éditeur normalisé. ⛔ On ne découpe jamais une notice précomposée pour en retrouver les parties, et l’ancien texte de lecture des blocs matériels cesse d’être la source de l’affichage : il demeure en base pour la provenance et le témoin source. ⛔ La ponctuation est produite par le rendu à partir des champs présents ; elle n’est pas stockée dans la donnée, et un champ absent emporte son séparateur. **L’identité d’une entrée est `ouvrage_id`**, jamais son rang dans la liste. Un repli sur l’ancien texte n’est admis que si la liste structurée est réellement absente, et il ne se mêle jamais à elle : ou l’une, ou l’autre, jamais quelques entrées de chaque.',
  },
  {
    nom: 'petites capitales depuis la donnée',
    avant: 'Dans une rubrique « Du même auteur », le nom n’est pas répété à chaque entrée : le titre de rubrique porte déjà cette information.',
    apres: 'Dans une rubrique « Du même auteur », le nom n’est pas répété à chaque entrée : le titre de rubrique porte déjà cette information. ⛔ Les petites capitales viennent de la donnée structurée — `auteurs_valeur.prenom` et `auteurs_valeur.nom_famille` —, jamais d’une transformation heuristique de la chaîne affichée : une autorité que ce couple ne décrit pas ne se coupe pas à la première espace, elle se compose entière. Le composant bibliographique demeure GÉNÉRIQUE : c’est la pièce qui dit si l’auteur doit paraître, non le composant qui le devine.',
  },
  {
    nom: 'description matérielle non affichée',
    avant: 'Les éléments d’une même notice sont séparés par des virgules, et non par une succession de phrases ponctuées de points. L’ordre normal est : titre, lieu, éditeur, date, format et pagination ; le point final clôt seul la notice. Un point-virgule peut séparer deux états ou deux éditions réellement distincts.',
    apres: 'Les éléments d’une même notice sont séparés par des virgules, et non par une succession de phrases ponctuées de points. L’ordre normal est : titre, lieu, éditeur, date, format et pagination ; le point final clôt seul la notice. Un point-virgule peut séparer deux états ou deux éditions réellement distincts.\n\n⛔ **La description MATÉRIELLE ne s’affiche pas dans une liste d’ouvrages** : le format (`in-8°`, `in-4°`), le nombre de pages, la pagination romaine ou arabe, le nombre de planches, les figures et les dimensions sont des données de description, conservées dans la notice, et ne paraissent pas au lecteur. Une liste d’ouvrages nomme des œuvres, elle ne décrit pas des exemplaires. La forme affichée est donc : intitulé, lieu, éditeur normalisé, année, point final — `*Évangile selon saint Jean : Introduction critique et commentaires*, Paris, P. Lethielleux, 1887.` ⚠️ Décision de l’auteur du 28 août 2026.\n\nUne liste d’ouvrages lue SEULE, en pièce liminaire, prend la composition du § 35.6 : un seul titre en tête, une œuvre par ligne, aucune puce ni tiret, aucun cadre, aucun fond, aucune bordure, alignement à gauche, retrait de première ligne des bibliographies imprimées, blanc léger entre deux références, et un corps légèrement inférieur au corps courant.',
  },
]

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

let texte = data.valeur
for (const { nom, avant, apres } of REMPLACEMENTS) {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`motif « ${nom} » : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(avant).join(apres)
}
console.log(JSON.stringify({
  avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length,
  essai_seul: essaiSeul,
}, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
