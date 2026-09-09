/**
 * § 7.5.1 et § 7.7 : la SIGNATURE vit sur les deux surfaces, et une mention de
 * traducteur clôt le texte.
 *
 * La charte écrivait que les onze `signature` du corpus portent TOUTES
 * `espace_textuel = 'apparat_critique'` et qu'aucune ne vit dans le corps. C'était
 * faux depuis le 16 août 2026 : les six mentions de traducteur du Chrysostome de
 * Jeannin sont au corps. La septième, « Cette traduction est l'œuvre de M. l'abbé
 * Pognon. », y a été portée le 9 septembre 2026 — elle était rangée à l'apparat, où
 * elle paraissait seule sous le titre « Livre septième — Questions sur les Juges ».
 * Et la table du § 7.5.1 comptait ZÉRO segment `signature`.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-signature-clot-le-texte-2026-09-09.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const essaiSeul = process.argv.includes('--dry')

/** Chaque remplacement doit trouver son ancre UNE fois, sans quoi rien n'est écrit. */
const REMPLACEMENTS = [
  {
    quoi: '§ 7.5.1 — la ligne `signature` du vocabulaire',
    avant: '| `signature` | approbations, censeurs, souscripteurs : au fer à droite, interligne resserré | | 0 |',
    apres: '| `signature` | approbations, censeurs, souscripteurs — et la mention de traducteur que l\'édition imprime en CLÔTURE d\'une pièce : au fer à droite, interligne resserré. Onze à l\'apparat, sept au corps | ⛔ pas un apparat : une mention de traducteur ferme le TEXTE et se lit avec lui, à la place que l\'imprimé lui donne | 18 |',
  },
  {
    quoi: '§ 7.7 — le compte des `signature` et la mention de traducteur',
    avant: [
      'composition au fer à droite existait depuis l\'origine dans la branche de la LECTURE ; or',
      'les **onze** `signature` du corpus — les quatre approbateurs du Mépris du monde, les trois',
      'de Boèce, le Privilège des Confessions — portent **toutes** `espace_textuel =',
      '\'apparat_critique\'`, et pas une seule ne vit dans le corps. Le fer à droite était donc',
      'rendu là où il n\'y a personne, et absent là où ils sont tous : « A. Debreda Curé de',
      'S. André. » se composait en prose justifiée, comme l\'approbation qu\'il signe.',
    ].join('\n'),
    apres: [
      'composition au fer à droite existait depuis l\'origine dans la branche de la LECTURE, et',
      '**onze** `signature` — les quatre approbateurs du Mépris du monde, les trois de Boèce, le',
      'Privilège des Confessions — portent `espace_textuel = \'apparat_critique\'`, où la forme',
      'n\'existait pas : « A. Debreda Curé de S. André. » se composait en prose justifiée, comme',
      'l\'approbation qu\'il signe.',
      '',
      '⚠️ **Le 9 septembre 2026, cette page a été prise à son propre piège.** Elle écrivait que',
      'les onze étaient TOUTES à l\'apparat et que pas une ne vivait dans le corps ; le compte',
      'qu\'elle prescrit plus bas disait le contraire depuis le 16 août 2026. SEPT `signature`',
      'vivent dans le corps : les mentions de traducteur que Bar-le-Duc imprime en clôture d\'une',
      'pièce — « Traduit par M. Portelette. » au bas du neuvième Discours sur la Genèse, cinq',
      'psaumes du Commentaire, et « Cette traduction est l\'œuvre de M. l\'abbé Pognon. », qui',
      'ferme les Questions sur l\'Heptateuque. ⛔ Écrire « toutes » sans avoir pris le compte est',
      'le défaut même que ce paragraphe dénonce.',
      '',
      '⛔ **Une mention de traducteur n\'est pas un apparat.** Elle clôt le TEXTE, à la place que',
      'l\'imprimé lui donne, et se lit avec lui : `nature = \'signature\'`, `espace_textuel =',
      '\'corps\'`. Le Pognon des Questions sur l\'Heptateuque portait `apparat_critique` sur les',
      'deux axes ; il paraissait donc SEUL dans la vue d\'apparat, sous le titre « Livre septième',
      '— Questions sur les Juges », comme s\'il ne créditait que ce livre-là, quand il crédite',
      'l\'œuvre entière et que l\'imprimé le pose au bas de la p. 589, sous la dernière ligne du',
      'livre VII. Corrigé le 9 septembre 2026 : la vue d\'apparat de cette œuvre est vide, et',
      'disparaît.',
    ].join('\n'),
  },
  {
    quoi: '§ 7.7 — les deux axes, et la répartition réelle',
    avant: [
      'espace explicite, et aucun de ses segments n\'est dans le corps — et une composition qui',
      'n\'en regarde qu\'un compose à côté.',
    ].join('\n'),
    apres: [
      'espace explicite, et ses dix-huit segments se répartissent sur les DEUX surfaces — et une',
      'composition qui n\'en regarde qu\'un compose à côté.',
    ].join('\n'),
  },
]

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error

const avant = data.valeur
if (avant.includes('Une mention de traducteur n\'est pas un apparat.')) {
  console.log('Déjà consigné.')
  process.exit(0)
}

let apres = avant
for (const r of REMPLACEMENTS) {
  const n = apres.split(r.avant).length - 1
  if (n !== 1) throw new Error(`Ancre « ${r.quoi} » : ${n} occurrence(s), 1 attendue.`)
  apres = apres.split(r.avant).join(r.apres)
}

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n\'a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
