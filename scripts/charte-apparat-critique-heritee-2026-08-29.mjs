/**
 * § 7.5.1 : la nature `apparat_critique` est HÉRITÉE, et ce n'est pas un apparat.
 *
 * ⛔ Erreur de ma rédaction du 29 août 2026. En dressant le catalogue des natures,
 * j'ai décrit `apparat_critique` comme « l'apparat de l'ÉDITEUR — variantes,
 * collation », ce qui est le sens de l'ESPACE TEXTUEL du même nom, non celui de la
 * nature. Le § 7 disait déjà l'inverse — « valeur héritée seulement ; ne plus en
 * créer » — et le § 7 précise même qu'on ne reclasse jamais ces segments en masse,
 * leur auteur et leur fonction devant être établis un par un.
 *
 * La donnée tranche, et elle donne raison au § 7. Sondés le 29 août 2026, les 1 295
 * segments qui portent cette nature, répartis sur 26 textes, contiennent :
 *   · une épître dédicatoire — « A MONSEIGNEVR PIERRE SCARRON, EVESQVE… » ;
 *   · un privilège d'imprimer — « deffences à tous Libraires, Imprimeurs… » ;
 *   · des gloses de vocabulaire — « Alléluia. Mot hébreux qui signifie… » ;
 *   · des arguments analytiques — « 1. Appel aux pécheurs. Bornes prescrites… » ;
 *   · de la prose de commentaire.
 * Aucune variante, aucune collation : c'est un FOURRE-TOUT de paratexte.
 *
 * ⛔ L'apparat critique d'une édition savante, lui, n'est pas une nature de segment
 * mais un RÔLE de bloc de note (`metadata.editorial_role`) : les 7 266 entrées de
 * Knöll sur les Confessions vivent là, et nulle part ailleurs. Deux choses portent
 * le même nom, et c'est ce qui m'a fait écrire l'une pour l'autre.
 *
 * ⚠️ Les ancres emploient l'apostrophe DROITE, celle que ces lignes du catalogue
 * portent réellement. Aucun échappement n'est écrit ici : le dépôt a déjà perdu des
 * caractères invisibles de cette façon.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-apparat-critique-heritee-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REPRISES = [
  {
    quoi: "§ 7.5.1 · la ligne `apparat_critique`",
    avant: "| `apparat_critique` | l'apparat de l'ÉDITEUR — variantes, collation | il a sa PROPRE vue dans la page, il n'est pas dans le corps | 1 295 |",
    apres: "| `apparat_critique` | ⛔ **HÉRITÉE** (§ 7) : un fourre-tout de paratexte — dédicaces, privilèges, gloses de vocabulaire, arguments analytiques —, rendu dans la vue d'apparat. Ne plus en créer : employer `apparat_auteur` ou `apparat_editeur` | ⛔ **PAS** l'apparat critique d'une édition savante : celui-là n'est pas une nature de segment mais un RÔLE de bloc de note (`editorial_role`), et les 7 266 entrées de Knöll vivent là. Deux choses portent le même nom | 1 295 |",
  },
  {
    quoi: "§ 7.5.1 · la ligne `apparat_auteur`, dont la contre-indication visait à faux",
    avant: "| `apparat_auteur` | prologue, avertissement, dédicace écrits par L'AUTEUR | ⛔ pas `apparat_critique` : celui-ci appartient au CORPS et se lit à sa place | 96 |",
    apres: "| `apparat_auteur` | prologue, avertissement, dédicace écrits par L'AUTEUR | ⛔ pas `apparat_editeur`, qui porte le paratexte de l'ÉDITION : celui-ci appartient au CORPS et se lit à sa place | 96 |",
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

if (avant.includes('un fourre-tout de paratexte')) { console.log('Déjà posé.'); process.exit(0) }

// ⛔ Toutes les ancres se vérifient AVANT d'écrire : une reprise partielle laisserait
// la charte à moitié dans l'ancienne doctrine, ce qui est le défaut qu'on corrige.
let texte = avant
for (const r of REPRISES) {
  const n = texte.split(r.avant).length - 1
  if (n !== 1) throw new Error(`${r.quoi} : ${n} occurrence(s), 1 attendue.`)
}
for (const r of REPRISES) texte = texte.split(r.avant).join(r.apres)

// Contrôle de clôture : le catalogue ne présente plus cette nature comme un apparat.
if (texte.includes("l'apparat de l'ÉDITEUR — variantes, collation")) {
  throw new Error('la description fautive subsiste.')
}

console.log(JSON.stringify({ avant: avant.length, apres: texte.length, delta: texte.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien nest écrit.'); process.exit(0) }

const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (relu.valeur.length !== texte.length) throw new Error('relecture : longueur inattendue.')
if (!relu.valeur.includes('un fourre-tout de paratexte')) throw new Error('relecture : la reprise est absente.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
