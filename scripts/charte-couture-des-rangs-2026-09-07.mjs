/**
 * Corrige la charte, § 12.2 : LE PARAGRAPHE COMPOSE, LE GROUPE MET EN REGARD.
 *
 * La correction du matin même disait que le bloc de la lecture bilingue est le
 * paragraphe. C'est la moitié de la règle, et l'autre moitié manquait : fondre un
 * paragraphe entier en un seul rang de grille supprime les faux paragraphes ET la mise
 * en regard, une colonne de français contre une colonne de grec que rien ne raccorde.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia` —
 * avec la même table de remplacements. ⛔ Le script REFUSE d'écrire si un motif ne se
 * trouve pas exactement une fois dans chacun.
 *
 * ⚠️ Verrou optimiste sur `mis_a_jour` : la charte est écrite par plusieurs mains.
 *
 * Usage : node scripts/charte-couture-des-rangs-2026-09-07.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 12.2 — le paragraphe compose, le groupe met en regard',
    avant: '**Le bloc de la lecture bilingue est donc le PARAGRAPHE**, découpé sur la clé éditoriale entière — `id_texte`, `espace_textuel`, `ref_niv*`, `paragraphe` —, ses segments rangés par `rang` et joints par `join_before`. Les groupes se RÉPARTISSENT ensuite sur ces blocs, chacun composant son original dans le premier bloc qu’il touche.',
    apres: '**Le PARAGRAPHE compose, le GROUPE met en regard**, et il faut les deux. La composition — filet, blanc, alinéa — appartient au paragraphe de l’édition, découpé sur la clé éditoriale entière (`id_texte`, `espace_textuel`, `ref_niv*`, `paragraphe`), ses segments rangés par `rang` et joints par `join_before`. La mise en regard appartient au groupe : lui seul tient les deux colonnes en face l’une de l’autre, et il lui faut pour cela son propre rang de grille. Chaque groupe compose son original dans le premier rang qu’il touche.',
  },
  {
    nom: '§ 12.2 — la couture des rangs',
    avant: 'Et l’on ne « corrige » jamais en base une minuscule d’ouverture pour masquer un défaut d’affichage : cette minuscule est la trace d’une phrase qui continue, et l’effacer détruirait la preuve au lieu du défaut.',
    apres: [
      'Et l’on ne « corrige » jamais en base une minuscule d’ouverture pour masquer un défaut d’affichage : cette minuscule est la trace d’une phrase qui continue, et l’effacer détruirait la preuve au lieu du défaut.',
      '',
      '⛔ **LA COUTURE.** Les rangs d’un même paragraphe se TOUCHENT : ni filet, ni blanc, ni retrait, et rien ne dit au lecteur qu’il change de paragraphe. Seul le DERNIER rang d’un paragraphe le ferme. ⚠️ Il reste une coupure de LIGNE à chaque empan, et elle est irréductible : aucune écriture CSS ne fait couler un texte d’un rang de grille au suivant en gardant deux colonnes accordées. Une page en regard se paie de ce prix-là ; elle ne se paie pas de soixante-seize faux paragraphes.',
      '',
      '⚠️ Les deux moitiés de la règle se sont chassées l’une l’autre en un seul jour, le 7 septembre 2026, et il faut savoir les deux échecs. Découper au GROUPE seul faisait de chaque empan un paragraphe. Découper au PARAGRAPHE seul fondait les 76 empans du *Discours 38* en un rang unique : plus un filet, mais plus rien en regard non plus.',
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
for (const { nom, avant, apres } of REMPLACEMENTS) {
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
console.log('Les deux exemplaires sont corrigés, et la relecture les confirme.')
