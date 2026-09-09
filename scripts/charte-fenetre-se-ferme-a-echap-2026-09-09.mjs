/**
 * Consigne dans la charte, § 38.5 : UNE FENÊTRE SE FERME À ÉCHAP.
 *
 * Trouvaille de l'audit de la page de lecture du 9 septembre 2026 : le mot « Escape »
 * n'apparaissait pas une seule fois dans les 4 400 lignes d'`OeuvreClient.tsx`. Ses deux
 * fenêtres se fermaient par un voile cliquable et une croix — c'est-à-dire au curseur
 * seul. Trois autres surfaces du site posaient chacune leur écouteur, sans se ressembler.
 *
 * Les DEUX exemplaires sont corrigés — `charte/CHARTE_IA.md` et `parametres.charte_ia`.
 * ⛔ Le script REFUSE d'écrire si le motif ne se trouve pas exactement une fois dans
 * chacun. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-fenetre-se-ferme-a-echap-2026-09-09.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 38.5 — une fenêtre se ferme à Échap',
    avant: "⚠️ **ET UN CONTRÔLE DE QUATORZE PIXELS NE PREND PAS L’ENCRE LA PLUS TÉNUE DE L’ÉCHELLE.**",
    apres: [
      "⛔ **UNE FENÊTRE QUI NE SE FERME QU’À LA SOURIS N’EST PAS FERMABLE.** Le voile cliquable et la croix servent le curseur ; au clavier il ne reste rien, et c’est le seul chemin de qui n’emploie pas de souris. Échap ferme donc toute fenêtre du site, sans exception, et la fenêtre se DÉCLARE — `role=\"dialog\"`, `aria-modal`, et un nom, faute de quoi un lecteur d’écran ne sait ni qu’il est entré ni d’où il ne peut plus sortir.",
      '',
      "⚠️ **La touche est CONSOMMÉE, et une seule fenêtre répond.** Deux fenêtres empilées — une gravure agrandie par-dessus une fiche — se fermeraient ensemble, et le lecteur qui ne voulait refermer que la plus haute perdrait les deux. C’est la plus récemment montée qui gagne : l’écouteur se pose en phase de BULLE, où elle est la dernière abonnée, donc la dernière appelée ; en capture, l’ordre s’inverse et la plus ancienne l’emporterait.",
      '',
      "⚠️ **Une seule écriture, `app/lib/useFermerAEchap.ts`** : le site en portait trois, qui ne se ressemblaient pas. ⛔ Le mot « Escape » ne figurait dans AUCUNE des 4 400 lignes de la page d’une œuvre au 9 septembre 2026 — un défaut qui ne se voit ni au type, ni au test, ni en relisant le composant, puisqu’il n’est pas ce que le code FAIT mais ce qu’il ne fait pas.",
      '',
      "⚠️ **ET UN CONTRÔLE DE QUATORZE PIXELS NE PREND PAS L’ENCRE LA PLUS TÉNUE DE L’ÉCHELLE.**",
    ].join('\n'),
  },
]

/**
 * ⚠️ Les DEUX exemplaires ont DIVERGÉ sur l'apostrophe. On apparie à l'apostrophe
 * INDIFFÉRENTE, et l'on reprend celle que l'exemplaire employait.
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
    // ⛔ Fonction de remplacement, jamais la chaîne : dans une chaîne de remplacement,
    // `$$` vaut un seul `$`, `$&` la correspondance, `$'` ce qui suit. Payé le jour même
    // sur un fichier SQL, dont les délimiteurs `$$` ont été mangés.
    const texteNeuf = droite ? apres.replace(/’/gu, "'") : apres
    sortie = sortie.replace(motif, () => texteNeuf)
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
