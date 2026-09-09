/**
 * Consigne dans la charte, § 7 et § 7.5 : l'APPARAT DE L'AUTEUR PARAÎT AUSSI DANS LA
 * VUE D'APPARAT, et cette vue se lit désormais en DEUX SECTIONS.
 *
 * Décision de l'auteur du 9 septembre 2026 : « il faudrait qu'on distingue, dans
 * apparat critique, l'apparat auteur de l'apparat éditeur ; mais les deux doivent
 * apparaître dans apparat critique ». L'apparat de l'auteur ne quitte pas le corps pour
 * autant — l'en retirer avait fait disparaître le Prologue de Rufin le 18 août 2026 —,
 * et seules les PIÈCES ENTIÈRES y résonnent : les trente-huit paragraphes pris au milieu
 * d'une division de prose y paraîtraient sans le texte qui les entoure.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia`.
 * ⛔ Le script REFUSE d'écrire si un motif ne se trouve pas exactement une fois dans
 * chacun. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-apparat-deux-mains-2026-09-09.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 7 — l’apparat de l’auteur a une seconde surface',
    avant: "Il ne doit pas être relégué hors lecture sous prétexte qu’il s’agit d’une préface, d’une digression ou d’un développement liminaire.",
    apres: [
      "Il ne doit pas être relégué hors lecture sous prétexte qu’il s’agit d’une préface, d’une digression ou d’un développement liminaire.",
      '',
      "**L’apparat de l’auteur paraît AUSSI dans la vue d’apparat** (décision de l’auteur du",
      "9 septembre 2026) : les deux apparats s’y lisent l’un après l’autre, sous deux en-têtes,",
      "« Apparat de l’auteur » puis « Apparat de l’éditeur ». ⛔ C’est un ÉCHO et non un",
      "déménagement — la pièce reste au corps, s’y lit à sa place, y garde sa lettrine et son",
      "entrée au sommaire, et un lien profond l’ouvre dans le TEXTE. Une seconde surface",
      "n’en retire aucune.",
      '',
      "⛔ **Et par PIÈCES ENTIÈRES seulement.** Seules résonnent dans l’apparat les divisions",
      "dont TOUT le corps est de la main de l’auteur, que nomme `get_niv1_apparat_auteur`",
      "(migration `20260909093419`) : neuf divisions et 152 segments au 9 septembre 2026. Les",
      "trente-huit autres segments d’`apparat_auteur` sont des paragraphes pris au milieu",
      "d’une division de prose — dix dans le « Livre I » d’Eusèbe, qui en compte 209, un seul",
      "dans la « Procatéchèse » de Cyrille — et ils y paraîtraient sans le texte qui les",
      "entoure, c’est-à-dire tronqués. ⚠️ Le compte se refait à CHAQUE affichage : une",
      "division cesse d’être entière dès qu’un segment d’une autre nature y entre.",
      '',
      "⚠️ L’en-tête de section ne se compose que si la vue porte les deux mains : un en-tête",
      "seul ne distingue rien et poserait un titre là où le lecteur n’avait qu’une matière.",
    ].join('\n'),
  },
  {
    nom: '§ 7.5 — la date des deux lignes remesurées',
    avant: "⚠️ Deux lignes ont été remesurées le 8 septembre 2026, `lemme` et `exergue` : les",
    apres: [
      "⚠️ Deux autres l’ont été le 9 septembre 2026, `apparat_auteur` et `apparat_editeur` :",
      "onze segments du « Prologue de Rufin » ont changé de main le jour même. ⛔ Les autres",
      "comptes du tableau restent ceux du 29 août, et un compte n’est vrai qu’à sa date.",
      "⚠️ Deux lignes ont été remesurées le 8 septembre 2026, `lemme` et `exergue` : les",
    ].join('\n'),
  },
  {
    nom: '§ 7.5.1 — la ligne `apparat_editeur`',
    avant: "| `apparat_editeur` | préface du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l'œuvre | l'apparat de l'auteur, qui appartient au corps | 323 |",
    apres: "| `apparat_editeur` | préface du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l'œuvre. Deux espaces lui sont ouverts et le corps lui est fermé (`segments_apparat_editeur_space_ck`) : `apparat_critique`, ou `introduction` s'il appartient aux préliminaires qu'on lit | l'apparat de l'auteur, qui appartient au corps et s'y lit à sa place | 1 978 |",
  },
  {
    nom: '§ 7.5.1 — la ligne `apparat_auteur`',
    avant: "| `apparat_auteur` | prologue, avertissement, dédicace écrits par L'AUTEUR | ⛔ pas `apparat_editeur`, qui porte le paratexte de l'ÉDITION : celui-ci appartient au CORPS et se lit à sa place | 96 |",
    apres: "| `apparat_auteur` | prologue, avertissement, dédicace écrits par L'AUTEUR. Il appartient au CORPS, s'y lit à sa place, et paraît EN OUTRE dans la vue d'apparat quand sa division entière est de sa main (§ 7) | ⛔ pas `apparat_editeur`, qui porte le paratexte de l'ÉDITION. ⛔ Et sa seconde surface ne lui retire pas la première : l'ôter du corps avait fait disparaître le Prologue de Rufin, le 18 août 2026 | 190 |",
  },
  {
    nom: '§ contrôle — la règle courte des deux apparats',
    avant: "L’`apparat_auteur` reste dans le parcours de lecture du corps. L’`apparat_editeur` est rendu hors du flux ordinaire.",
    apres: "L’`apparat_auteur` reste dans le parcours de lecture du corps, et paraît en outre dans la vue d’apparat lorsque sa division entière est de sa main (§ 7). L’`apparat_editeur` est rendu hors du flux ordinaire.",
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
