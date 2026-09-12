/**
 * § 29.1 : l'état éditorial d'un ouvrage bibliographique est DÉRIVÉ de sa valeur
 * scientifique, comme la publication est dérivée des états de validation (§ 52).
 *
 * Décision de l'auteur du 12 septembre 2026, devant « Ouvrages bibliographiques,
 * 0 validé / 1000 » : « Je ne veux pas avoir à la valider. »
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère
 * (`node scripts/synchroniser-charte-supabase.mjs --pull`).
 * Usage : node scripts/charte-etat-editorial-derive-2026-09-12.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'L’ÉTAT ÉDITORIAL D’UN OUVRAGE EST DÉRIVÉ DE SA VALEUR SCIENTIFIQUE'

// L'ancre est la dernière phrase du paragraphe qui décrit la décision manuelle : le
// texte neuf se pose juste après, là où le lecteur vient d'apprendre quel est le seul
// levier humain.
const ANCRE = "⛔ **Une exclusion manuelle exige un motif, et la base refuse l'écriture sans lui.**"

const AJOUT = `

⛔ **${MARQUE} ; il ne se saisit pas.** La base le calcule dans \`internal.etat_editorial_ouvrage\` et l'écrit en même temps que la valeur : \`exclu\` donne \`rejete\`, \`retenu\` et \`secondaire\` donnent \`valide\`, \`a_verifier\` donne \`a_revoir\`. C'est la doctrine du § 52 appliquée à la bibliographie : un état qui se déduit ne se tient pas à la main. ⛔ **Le code n'écrit jamais \`ouvrages_bibliographiques.statut_editorial\`, et le déclencheur récrit toute écriture directe.** L'onglet « Ouvrages » le donne en pastille, sans bouton : il n'y a aucune validation à conduire titre par titre, et la seule décision qui déplace un ouvrage reste \`statut_scientifique_override\`. Les colonnes \`valide_par\` et \`valide_at\` gardent la trace de la conclusion : le nom de l'évaluateur lorsqu'il y en a un, \`calcul\` sinon, et la date du premier passage au vert, qu'un recalcul sans effet ne réécrit pas.

⚠️ **Pourquoi cette dérivation, et ce qu'elle a débloqué.** Le catalogue comptait 1 347 titres et pas un seul « validé ». Une contrainte exigeait en outre une \`garantie_scientifique\` saisie à la main, restée à sa valeur par défaut sur 925 notices : l'écran offrait donc un bouton que la base refusait toujours. La garantie entrant déjà dans le calcul de la valeur scientifique, l'exiger une seconde fois au moment de valider revenait à interdire la validation. La conséquence était muette et grave : la vue \`bibliographie_publiable\`, qui réclame un ouvrage éditorialement validé, était VIDE, et le chemin de publication décrit ci-dessus ne menait nulle part. Au 12 septembre 2026, après dérivation, 590 ouvrages sont validés, un est rejeté, 756 restent à revoir faute d'éditeur, de collection ou de contributeurs rattachés à des autorités notées, et \`bibliographie_publiable\` porte 736 liens. ⛔ **Ce reliquat est une dette de normalisation des autorités, non une file d'attente de validation : il se règle dans la donnée, jamais en cliquant.**`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes(MARQUE)) { console.log('Déjà posé.'); process.exit(0) }

const n = avant.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)

const apres = avant.replace(ANCRE, ANCRE + AJOUT)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260912_avant_etat_editorial_derive'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
