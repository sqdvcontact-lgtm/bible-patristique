/**
 * LA CHRONOLOGIE DE TROIS BIBLES QUI N'EN AVAIENT PAS.
 *
 * Demande de l'auteur du 4 septembre 2026, devant la fiche « À propos de cette
 * traduction » de la Bible Fillion : « ajouter une chronologie assez petite
 * inspirée du modèle de la page auteur ; composer pour l'occasion des liens
 * chronologiques ». La fiche sait rendre une frise depuis toujours — c'est celle
 * de la fiche d'auteur, au même corps —, mais seules six bibles sur dix avaient
 * des liens : Fillion, sa Vulgate et la traduction liturgique n'en avaient aucun,
 * et leur colonne de droite restait vide.
 *
 * ⛔ CE SCRIPT NE CRÉE AUCUN ÉVÉNEMENT. Il n'écrit que dans
 * `traductions_evenements`, la table d'ASSOCIATION : chaque événement qu'il
 * rattache existe déjà, il est daté, sourcé et validé de longue date dans
 * `evenements`. Composer une chronologie, c'est ici choisir et ordonner ce que
 * le corpus sait déjà — non inventer des faits datés, ce qui serait une décision
 * philologique et non une décision d'interface.
 *
 * ⚠️ Chaque lien porte `a_controler = true` : je choisis, l'auteur valide. Le
 * drapeau n'empêche pas l'affichage (charte § 26) et range les huit lignes dans
 * la file de relecture de l'onglet « Chronologie » de l'administration.
 *
 * ⚠️ `ordre_force` suit l'ordre CHRONOLOGIQUE, par pas de dix, comme les six
 * chronologies déjà en place : c'est lui qui départage deux événements d'une même
 * année, et la vue range dessus (`ordre_affichage`).
 *
 * Idempotent : la contrainte `(trad_id, evenement_id)` est unique, et l'on
 * n'écrit que ce qui manque. Usage :
 *   node --env-file=.env.local scripts/chronologie-traductions-fillion-aelf-2026-09-04.mjs [--ecrire]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const ecrire = process.argv.includes('--ecrire')

/**
 * ⚠️ La justification est la RAISON du rattachement, non un résumé de
 * l'événement : c'est ce que le champ demande, et c'est ce qu'un relecteur a
 * besoin de lire pour dire oui ou non.
 */
const LIENS = [
  // ── TR0010, la Bible Fillion (français) ─────────────────────────────────────
  // Deux racines, l'édition elle-même, et deux repères de son temps.
  {
    trad_id: 'TR0010', evenement_id: 'EVT000831', ordre_force: 110,
    nature_lien: 'formation', pertinence: 'indispensable',
    justification: 'La Vulgate sixto-clémentine est le texte latin que Fillion imprime en regard et sur lequel il révise le français.',
  },
  {
    trad_id: 'TR0010', evenement_id: 'EVT000330', ordre_force: 120,
    nature_lien: 'formation', pertinence: 'indispensable',
    justification: 'Le français de Fillion n’est pas une traduction nouvelle : c’est celui de Sacy, repris avec des retouches et révisé sur la Vulgate.',
  },
  {
    trad_id: 'TR0010', evenement_id: 'EVT000483', ordre_force: 130,
    nature_lien: 'édition', pertinence: 'indispensable',
    justification: 'C’est l’édition que Corpus Scriptura sert, texte, apparat et gravures compris.',
  },
  {
    trad_id: 'TR0010', evenement_id: 'EVT000588', ordre_force: 140,
    nature_lien: 'contexte', pertinence: 'utile',
    justification: 'L’encyclique de Léon XIII fixe, en pleine publication de la série, les principes de l’exégèse catholique dont la Bible commentée se réclame.',
  },
  {
    trad_id: 'TR0010', evenement_id: 'EVT000280', ordre_force: 150,
    nature_lien: 'contexte', pertinence: 'secondaire',
    justification: 'La Bible de Crampon paraît dans les mêmes années et pour le même public : c’est la traduction française catholique à laquelle celle-ci se compare.',
  },

  // ── TR0011, la Vulgate latine imprimée par Fillion ──────────────────────────
  // La chaîne du texte latin, de Jérôme à la page en regard.
  {
    trad_id: 'TR0011', evenement_id: 'EVT000043', ordre_force: 110,
    nature_lien: 'formation', pertinence: 'indispensable',
    justification: 'Le travail biblique de Jérôme est la source du texte latin que cette colonne transmet.',
  },
  {
    trad_id: 'TR0011', evenement_id: 'EVT000398', ordre_force: 120,
    nature_lien: 'contexte', pertinence: 'indispensable',
    justification: 'Le concile de Trente donne à la Vulgate l’autorité qui explique qu’une Bible française du XIXe siècle l’imprime en regard de sa traduction.',
  },
  {
    trad_id: 'TR0011', evenement_id: 'EVT000831', ordre_force: 130,
    nature_lien: 'formation', pertinence: 'indispensable',
    justification: 'C’est la forme sixto-clémentine du texte latin que Fillion reproduit.',
  },
  {
    trad_id: 'TR0011', evenement_id: 'EVT000483', ordre_force: 140,
    nature_lien: 'édition', pertinence: 'indispensable',
    justification: 'Cette colonne latine n’a pas d’existence séparée : elle est celle des huit volumes de Fillion.',
  },

  // ── TR0012, la traduction officielle liturgique ─────────────────────────────
  // Ce qui la commande, puis ce qui la publie.
  {
    trad_id: 'TR0012', evenement_id: 'EVT000592', ordre_force: 110,
    nature_lien: 'contexte', pertinence: 'utile',
    justification: 'Divino afflante Spiritu ouvre à l’Église catholique la traduction depuis les langues originales, dont procède tout ce travail.',
  },
  {
    trad_id: 'TR0012', evenement_id: 'EVT000472', ordre_force: 120,
    nature_lien: 'contexte', pertinence: 'indispensable',
    justification: 'La constitution liturgique de Vatican II ouvre la liturgie aux langues vivantes : c’est ce qui rend une traduction liturgique française nécessaire.',
  },
  {
    trad_id: 'TR0012', evenement_id: 'EVT000594', ordre_force: 130,
    nature_lien: 'contexte', pertinence: 'utile',
    justification: 'Dei Verbum prescrit que les fidèles disposent de traductions accessibles des Écritures, ce dont cette version est l’application liturgique.',
  },
  {
    trad_id: 'TR0012', evenement_id: 'EVT000506', ordre_force: 140,
    nature_lien: 'formation', pertinence: 'indispensable',
    justification: 'Liturgiam authenticam fixe les règles de traduction des livres liturgiques sous lesquelles cette version a été établie.',
  },
  {
    trad_id: 'TR0012', evenement_id: 'EVT000870', ordre_force: 150,
    nature_lien: 'édition', pertinence: 'indispensable',
    justification: 'C’est la publication de la traduction que Corpus Scriptura sert.',
  },
]

const env = Object.fromEntries(
  readFileSync(`${racine}/.env.local`, 'utf8').split(/\r?\n/u)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── Contrôles préalables ─────────────────────────────────────────────────────
// ⛔ On ne rattache que ce qui existe : un identifiant d'événement fautif ferait
// lever la clé étrangère au milieu du lot, et l'on ne saurait plus ce qui est
// passé. On regarde d'abord, on écrit ensuite.
const idsEvenements = [...new Set(LIENS.map((l) => l.evenement_id))]
const { data: evenements, error: errEvt } = await db
  .from('evenements')
  .select('id, titre, date_exacte, date_debut, source_principale, est_publie')
  .in('id', idsEvenements)
if (errEvt) throw errEvt
const parId = new Map((evenements ?? []).map((e) => [e.id, e]))
const manquants = idsEvenements.filter((id) => !parId.has(id))
if (manquants.length) throw new Error(`événements introuvables : ${manquants.join(', ')}`)
const nonPublies = (evenements ?? []).filter((e) => !e.est_publie)
if (nonPublies.length) throw new Error(`événements non publiés : ${nonPublies.map((e) => e.id).join(', ')}`)

const { data: dejaLa, error: errDeja } = await db
  .from('traductions_evenements')
  .select('trad_id, evenement_id')
  .in('trad_id', [...new Set(LIENS.map((l) => l.trad_id))])
if (errDeja) throw errDeja
const posees = new Set((dejaLa ?? []).map((l) => `${l.trad_id}|${l.evenement_id}`))

const aPoser = LIENS.filter((l) => !posees.has(`${l.trad_id}|${l.evenement_id}`))

for (const trad of ['TR0010', 'TR0011', 'TR0012']) {
  console.log(`\n── ${trad} ──`)
  for (const lien of LIENS.filter((l) => l.trad_id === trad)) {
    const e = parId.get(lien.evenement_id)
    const etat = posees.has(`${trad}|${lien.evenement_id}`) ? 'déjà là' : 'à poser'
    console.log(`  ${String(lien.ordre_force).padStart(3)} ${lien.nature_lien.padEnd(10)} ${(e.date_exacte ?? e.date_debut).toString().padEnd(34)} ${e.titre}  [${etat}]`)
  }
}
console.log(`\n${aPoser.length} lien(s) à poser sur ${LIENS.length}.`)

if (!aPoser.length) { console.log('Rien à faire.'); process.exit(0) }
if (!ecrire) { console.log('Essai seul : rien n’a été écrit. Rejouer avec --ecrire.'); process.exit(0) }

const lignes = aPoser.map((l) => ({
  trad_id: l.trad_id,
  evenement_id: l.evenement_id,
  nature_lien: l.nature_lien,
  pertinence: l.pertinence,
  justification: l.justification,
  ordre_force: l.ordre_force,
  origine_association: 'éditoriale',
  // ⚠️ La source du LIEN est celle de l'événement : le rattachement ne repose
  // sur rien d'autre que ce que l'événement atteste déjà.
  source_lien: parId.get(l.evenement_id).source_principale,
  est_affiche: true,
  // ⚠️ Je choisis, l'auteur valide.
  a_controler: true,
}))

const { error: errIns } = await db.from('traductions_evenements').insert(lignes)
if (errIns) throw errIns

// Relecture : la VUE, non la table — c'est elle que la fiche lit.
const { data: relu, error: errRelu } = await db
  .from('v_chronologie_traductions')
  .select('trad_id, ordre_affichage, type_affichage, date_affichage, titre')
  .in('trad_id', ['TR0010', 'TR0011', 'TR0012'])
  .order('trad_id')
  .order('ordre_affichage')
if (errRelu) throw errRelu
console.log(`\n${lignes.length} lien(s) posé(s). Relecture par la vue :`)
for (const r of relu ?? []) {
  console.log(`  ${r.trad_id}  ${String(r.ordre_affichage).padStart(2)}  ${(r.type_affichage ?? '').padEnd(10)} ${(r.date_affichage ?? '').padEnd(34)} ${r.titre}`)
}
