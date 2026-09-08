/**
 * Complète la charte, § 16.7 : UNE MENTION DE RÉGIME N'EST PAS UN NOM.
 *
 * `trad_auteur` porte, pour Dhuoda, « Traduction IA — Corpus Scriptura ». Composée
 * comme une personne, elle donnait « Traduction par Traduction IA — Corpus Scriptura »
 * en page de titre (relevé de l'auteur, 8 septembre 2026), et « Scriptura 2026 » en
 * tête de la colonne française du texte en regard, le dernier mot du champ pris pour
 * un patronyme.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia` —
 * avec la même table de remplacements. ⛔ Le script REFUSE d'écrire si un motif ne se
 * trouve pas exactement une fois dans chacun : mieux vaut ne rien corriger que corriger
 * à moitié.
 *
 * ⚠️ Verrou optimiste sur `mis_a_jour` : la charte est écrite par plusieurs mains, et
 * une lecture suivie d'une écriture sans garde effacerait le travail d'un autre.
 *
 * Usage : node scripts/charte-mention-de-regime-2026-09-08.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const ANCRE = 'Un point-virgule visible à l’écran signale donc un défaut d’affichage, jamais un défaut de saisie.'

const REMPLACEMENTS = [
  {
    nom: '§ 16.7 — une mention de régime n’est pas un nom',
    avant: ANCRE,
    apres: [
      ANCRE,
      '',
      '⛔ **UNE MENTION DE RÉGIME N’EST PAS UN NOM**, et ne se compose pas comme tel. « Traduction IA — Corpus Scriptura » nomme l’instrument et la maison qui en répond, non une personne ; prise pour un nom, elle donnait « Traduction par Traduction IA — Corpus Scriptura » en page de titre — le mot deux fois, et un instrument présenté comme un traducteur — et « Scriptura 2026 » en tête de la colonne française du texte en regard, en face de « Bondurand 1887 », le dernier mot du champ pris pour un patronyme.',
      '',
      'Le site la RÉDIGE (décision de l’auteur, 8 septembre 2026) : **« Traduction par intelligence artificielle sous la direction de Corpus Scriptura »** en page de titre et partout où paraît la phrase de responsabilité ; la même formule en bas de casse et sans « trad. » dans une ligne bibliographique, comme une formule de direction ; « Traduction IA 2026 » là où il faut un label court. ⚠️ La donnée, elle, reste INTACTE en base : c’est l’affichage qui rédige, et la règle vit dans `app/lib/traducteurs.ts` avec le reste des mentions de responsabilité.',
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

// Double relecture : on vérifie que l'ajout est bien celui qu'on voulait.
const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, apres } of REMPLACEMENTS) {
  if (!relue.valeur.includes(apres)) throw new Error(`Relecture : « ${nom} » ne porte pas le nouveau texte.`)
}
console.log('Les deux exemplaires portent la règle, et la relecture les confirme.')
