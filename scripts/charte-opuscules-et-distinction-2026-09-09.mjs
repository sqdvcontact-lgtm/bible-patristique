/**
 * Consigne dans la charte deux règles fixées le 9 septembre 2026 sur la rubrique
 * « Du même auteur » du volet de la page Œuvre.
 *
 * 1. § 33.2 — LE PARTAGE DES OPUSCULES N'EST PAS À LA BIBLIOTHÈQUE, il est à TOUTE
 *    liste d'œuvres d'un auteur. Le paragraphe le disait de la bibliothèque seule, où
 *    la règle est née ; la rubrique « Du même auteur » a le même mal — onze opuscules
 *    pour huit œuvres chez Jean Chrysostome — et doit donc porter le même remède, du
 *    même module. Deux classements du même corpus selon la page où l'on se tient
 *    n'auraient rien classé.
 *
 * 2. § 47.7 — LA LIGNE QUI DÉPARTAGE DEUX ENTRÉES NE DIT PAS LA LANGUE (demande de
 *    l'auteur : « ne pas indiquer la langue du texte »). C'était le rang le plus long
 *    pour le moins de renseignement : sur une étagère d'auteur, presque toutes les
 *    entrées portaient le même mot.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia`.
 * ⛔ Le script REFUSE d'écrire si un motif ne se trouve pas exactement une fois dans
 * chacun. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-opuscules-et-distinction-2026-09-09.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 33.2 — le repli vaut pour toute liste d’œuvres d’un auteur',
    avant: "Une œuvre dont la longueur est inférieure au seuil d’opuscule est un texte bref. La bibliothèque replie les textes brefs d’un auteur dans une section rétractée, sous ses œuvres longues.",
    apres: [
      "Une œuvre dont la longueur est inférieure au seuil d’opuscule est un texte bref. Toute liste qui présente l’ŒUVRE D’UN AUTEUR replie ses textes brefs dans une section rétractée, sous ses œuvres longues.",
      '',
      "⛔ **La règle n’appartient pas à la bibliothèque**, où elle est née : elle vaut partout où une étagère d’auteur se déploie — l’étagère de la bibliothèque, et la rubrique « Du même auteur » du volet de la page Œuvre (9 septembre 2026). Le mal y est le même, onze opuscules pour huit œuvres chez Jean Chrysostome, et deux classements du même corpus selon la page où le lecteur se tient n’auraient rien classé. ⚠️ Elles passent donc par le MÊME module : un seuil, une mesure, un partage.",
      '',
      "⛔ **Sans la mesure, la règle ne se déclenche jamais — en silence.** La surface qui replie doit lire `nb_signes` : la bibliothèque l’a lu six semaines au rechargement client et pas au rendu serveur, si bien qu’aucune section n’a paru en ligne pendant que ses tests passaient. Une surface qui oublie la colonne n’affiche pas une erreur, elle affiche une liste entière.",
    ].join('\n'),
  },
  {
    nom: '§ 47.7 — la ligne de distinction ne dit pas la langue',
    avant: "⛔ **Ce n’est PAS une notice bibliographique.** Pas de titre, pas d’auteur, pas d’italique, pas de point final : une notice se compose par le MOTEUR (§ 47.5). L’adresse en est la seule partie qu’un libellé de navigation reprend, et c’est pour cela qu’elle a son écriture à elle.",
    apres: [
      "⛔ **Ce n’est PAS une notice bibliographique.** Pas de titre, pas d’auteur, pas d’italique, pas de point final : une notice se compose par le MOTEUR (§ 47.5). L’adresse en est la seule partie qu’un libellé de navigation reprend, et c’est pour cela qu’elle a son écriture à elle.",
      '',
      "⛔ **Et la ligne qui départage deux entrées de « Du même auteur » ne dit pas la LANGUE** (demande de l’auteur du 9 septembre 2026 : « ne pas indiquer la langue du texte »). Elle ouvrait la ligne, et c’était le rang le plus long pour le moins de renseignement : sur une étagère d’auteur, presque toutes les entrées portaient le même mot. Le traducteur puis l’adresse suffisent à départager, et une œuvre en langue originale se reconnaît à ce qu’elle n’a justement pas de traducteur. ⚠️ La rubrique se resserre pour la même raison qu’elle se tait : le titre touche son adresse d’édition, et le blanc qui doit se voir est celui qui sépare deux œuvres, non celui qui sépare les deux lignes d’une seule.",
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
