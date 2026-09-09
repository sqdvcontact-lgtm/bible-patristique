/**
 * Consigne dans la charte, § 33.2 : DEUX REPLIS, DEUX MARQUES.
 *
 * Relevé de l'auteur du 9 septembre 2026 : « le fait qu'Opuscules ait la même flèche
 * pour déployer que les autres niveaux de titre me paraît bizarre ». La section
 * « Opuscules » venait de paraître dans le volet de la page Œuvre avec le triangle
 * plein des RUBRIQUES du volet, ce qui lui donnait le rang de ce qui la contient.
 *
 * La règle qui en sort dépasse les opuscules : une section DANS une liste et une
 * rubrique DU volet ne se replient pas de la même marque, sans quoi le lecteur ne voit
 * plus quel repli emporte quoi.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia`.
 * ⛔ Le script REFUSE d'écrire si le motif ne se trouve pas exactement une fois dans
 * chacun. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-deux-replis-deux-marques-2026-09-09.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 33.2 — deux replis, deux marques',
    avant: "⛔ **Sans la mesure, la règle ne se déclenche jamais — en silence.** La surface qui replie doit lire `nb_signes` : la bibliothèque l’a lu six semaines au rechargement client et pas au rendu serveur, si bien qu’aucune section n’a paru en ligne pendant que ses tests passaient. Une surface qui oublie la colonne n’affiche pas une erreur, elle affiche une liste entière.",
    apres: [
      "⛔ **Sans la mesure, la règle ne se déclenche jamais — en silence.** La surface qui replie doit lire `nb_signes` : la bibliothèque l’a lu six semaines au rechargement client et pas au rendu serveur, si bien qu’aucune section n’a paru en ligne pendant que ses tests passaient. Une surface qui oublie la colonne n’affiche pas une erreur, elle affiche une liste entière.",
      '',
      "⛔ **DEUX REPLIS, DEUX MARQUES.** Une section DANS une liste et une rubrique DU volet ne portent pas le même signe. La rubrique du volet — « Du même auteur », « Apparat critique », « Sommaire » — se replie par un triangle plein posé À DROITE, au bout d’une ligne en capitales espacées. La section, elle, prend le chevron en trait posé À GAUCHE, devant son nom en italique bas de casse, tourné vers la droite quand elle est close et vers le bas quand elle est ouverte. ⚠️ « Opuscules » a d’abord paru dans le volet avec le triangle des rubriques (relevé de l’auteur, 9 septembre 2026 : « la même flèche pour déployer que les autres niveaux de titre me paraît bizarre ») : le signe lui donnait le RANG de ce qui la contient, et le lecteur ne voyait plus quel repli emporte quoi.",
      '',
      "⚠️ **La section garde la même forme sur toutes ses surfaces**, comme elle y garde le même seuil et le même partage : celle qu’elle porte à la bibliothèque, où elle est née.",
    ].join('\n'),
  },
]

/**
 * ⚠️ Les DEUX exemplaires ont DIVERGÉ sur l'apostrophe. On apparie à l'apostrophe
 * INDIFFÉRENTE, et l'on reprend celle que l'exemplaire employait — corriger la
 * ponctuation au passage serait une seconde correction, invisible dans le diff.
 */
function motifIndifferentALApostrophe(avant) {
  const echappe = avant.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return new RegExp(echappe.replace(/['’]/gu, '[\'’]'), 'gu')
}

function appliquer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const motif = motifIndifferentALApostrophe(avant)
    const trouvees = [...sortie.matchAll(motif)]
    if (trouvees.length !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees.length} occurrence(s), 1 attendue.`)
    const droite = trouvees[0][0].includes("'") && !trouvees[0][0].includes('’')
    sortie = sortie.replace(motif, droite ? apres.replace(/’/gu, "'") : apres)
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

const { data: ecrite, error: erreurEcriture } = await db
  .from('parametres')
  .update({ valeur: distantApres, mis_a_jour: new Date().toISOString() })
  .eq('cle', 'charte_ia')
  .eq('mis_a_jour', data.mis_a_jour)
  .select('mis_a_jour')
if (erreurEcriture) throw erreurEcriture
if (!ecrite || ecrite.length !== 1) {
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, apres } of REMPLACEMENTS) {
  if (!motifIndifferentALApostrophe(apres).test(relue.valeur)) {
    throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
  }
}
console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
