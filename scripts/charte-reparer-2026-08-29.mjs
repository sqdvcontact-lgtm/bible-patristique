/**
 * RÉPARATION de `parametres.charte_ia` — trois défauts, une seule écriture.
 *
 * 1. LES SAUTS DE LIGNE ÉCRITS EN TOUTES LETTRES. Vingt-quatre suites « antislash
 *    + n » séparent des paragraphes au lieu de vrais retours : au rendu, elles
 *    collent trois paragraphes et deux titres sur une seule ligne, et le § 35.5.3
 *    comme le § 35.14.1 s'y trouvent avalés par leur propre intitulé. Le dépôt a
 *    déjà payé ce défaut le 24 août 2026 ; il est revenu.
 *
 * 2. ONZE SECTIONS PERDUES. Entre 16 h 16 et 16 h 26 UTC le 28 août, une écriture
 *    a ramené la charte de 351 202 à 320 468 signes, emportant le § 36 et ses trois
 *    sous-sections, les § 37 et 38, la règle de synchronisation des deux chartes,
 *    les § 23.6.1 et 23.6.2 et le § 35.4.3. Aucune ne se retrouve ailleurs : elles
 *    ont été écrasées, non déplacées. Elles forment dans le miroir un bloc
 *    CONTIGU en queue, ce qui rend la restitution sûre — on le remet tel quel.
 *
 * 3. LE NUMÉRO DE VERSET n'était pas consigné. Le § 3.8.1, écrit depuis, dit la
 *    nature `verset` mais non le numéro qu'elle porte ni la face qu'il prend.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia`, après une sauvegarde sous clé propre.
 * Usage : node scripts/charte-reparer-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')
const CLE_SAUVEGARDE = 'charte_ia_sauvegarde_20260829_avant_reparation'

// ── Le paragraphe qui manquait : le NUMÉRO du verset ─────────────────────────
const ANCRE_NUMERO = '### 3.8.2.'
const AJOUT_NUMERO = `**Le numéro du verset s’écrit à la main, dans \`segment_metadata.biblical_verse_number\`.** ⛔ Il ne se devine pas : ni au nombre placé en tête du segment, puisqu’un verset peut commencer par un nombre — « Quarante jours et quarante nuits… » —, ni au lien biblique, qui relève d’un travail de liaison distinct et n’est pas toujours fait. Une édition qui n’imprime pas les numéros n’en reçoit pas : la case reste vide et le bloc se lit sans eux. ⚠️ La clé \`verse_number\` est déjà prise et veut dire autre chose : elle porte le rang du VERS dans son poème, chez Ceriziers. Un vers n’est pas un verset, et mêler les deux mêlerait la numérotation d’un mètre de Boèce à celle d’un chapitre d’Isaïe.

Le numéro se rend dans la **face de la page Bible** — même graisse, même teinte effacée, même rapport de corps au texte qu’il accompagne. La page Bible le pose dans une gouttière, à droite d’une colonne étroite ; dans un bloc de versets, cette gouttière se battrait avec le retrait gauche, et le numéro passe donc en **exposant**, sans changer de face pour autant. ⚠️ L’exposant se cale comme partout ailleurs sur le site, par un déport et non par \`vertical-align\`, faute de quoi il gonflerait la boîte de ligne et rouvrirait le blanc entre versets, qui est léger. Enfin, le numéro de SEGMENT s’efface dans le bloc : deux nombres en exposant sur la même ligne ne se lisent pas, et c’est le verset que le lecteur cherche.

`

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
const avant = data.valeur
let texte = avant
const journal = []

// ── 1. Les sauts de ligne écrits en toutes lettres ───────────────────────────
const ecrits = (texte.match(/\\n/g) ?? []).length
if (ecrits > 0) {
  texte = texte.split('\\n').join('\n')
  journal.push(`${ecrits} suite(s) « antislash + n » rendue(s) à un vrai saut de ligne`)
}

// ── 2. Les sections perdues, reprises au miroir ──────────────────────────────
//
// ⚠️ Le miroir `charte/CHARTE_IA.md` est resté à l'état du 28 août 16 h 16, celui
// d'AVANT l'écrasement : c'est lui qui porte les sections perdues. Elles y forment
// un bloc contigu, de « ## 36. » à la fin du fichier.
const miroir = readFileSync(resolve(racine, 'charte/CHARTE_IA.md'), 'utf8').replace(/\r/g, '')
const DEBUT_QUEUE = '## 36. Le modèle d’onglets'
const iQueue = miroir.indexOf(DEBUT_QUEUE)
if (iQueue < 0) throw new Error('Le miroir ne porte pas la queue perdue : rien à restituer.')
const queue = miroir.slice(iQueue).trimEnd()

const perdues = [...queue.matchAll(/^(#{1,4} .*)$/gm)].map(m => m[1].trim())
const manquantes = perdues.filter(t => !texte.includes(t))
if (manquantes.length > 0) {
  if (manquantes.length !== perdues.length) {
    throw new Error(
      `Restitution partielle refusée : ${manquantes.length} section(s) manquent sur ${perdues.length}. ` +
      'Les autres sont revenues autrement ; il faut regarder à la main.')
  }
  texte = `${texte.trimEnd()}\n\n${queue}\n`
  journal.push(`${perdues.length} section(s) restituée(s) : ${perdues.map(t => t.replace(/^#+ /, '')).join(' · ')}`)
}

// ── 3. Le numéro de verset ───────────────────────────────────────────────────
if (!texte.includes('biblical_verse_number')) {
  const n = texte.split(ANCRE_NUMERO).length - 1
  if (n !== 1) throw new Error(`ancre du numéro : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(ANCRE_NUMERO).join(AJOUT_NUMERO + ANCRE_NUMERO)
  journal.push('règle du numéro de verset consignée au § 3.8')
}

// ── Rapport, puis écriture ───────────────────────────────────────────────────
const titres = t => (t.match(/^#{1,4} /gm) ?? []).length
console.log(JSON.stringify({
  avant: { signes: avant.length, titres: titres(avant), antislash_n: ecrits },
  apres: { signes: texte.length, titres: titres(texte), antislash_n: (texte.match(/\\n/g) ?? []).length },
  journal,
  essai_seul: essaiSeul,
}, null, 2))

if (journal.length === 0) { console.log('Rien à réparer.'); process.exit(0) }
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

// ⛔ La sauvegarde D'ABORD, et sous une clé propre : on ne répare pas une source
// unique sans laisser derrière soi l'état qu'on remplace.
const { error: errSauvegarde } = await db.from('parametres')
  .upsert({ cle: CLE_SAUVEGARDE, valeur: avant }, { onConflict: 'cle' })
if (errSauvegarde) throw errSauvegarde
console.log(`État d’avant sauvegardé sous « ${CLE_SAUVEGARDE} ».`)

const { error: errEcriture } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (errEcriture) throw errEcriture
console.log('Charte réparée. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
