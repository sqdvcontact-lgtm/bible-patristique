/**
 * § 35.6.4 : déclarer une variante d’éditeur, c’est FUSIONNER.
 *
 * Le mal constaté le 29 août 2026 : on inscrivait « Veuve Jean Camusat ; Pierre Le
 * Petit » parmi les variantes de « Veuve Jean Camusat et Pierre Le Petit », et
 * l’ancienne graphie continuait de figurer dans la liste des éditeurs normalisés,
 * comme si deux maisons portaient ce nom. La charte disait déjà de ne pas créer de
 * doublon ; elle ne disait pas ce qu’il advient de celui qui existe.
 *
 * Trois paragraphes ajoutés : la fusion, le contrôle de collision, et l’ordre de
 * résolution (la forme entière avant le découpage en co-éditeurs).
 *
 * ⛔ N’écrit QUE dans `parametres.charte_ia` ; le miroir s’en régénère.
 * Usage : node scripts/charte-fusion-autorites-editeurs-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCRE = '⛔ Une forme source ne peut rester invisible au seul motif qu’elle n’a pas encore été normalisée : elle doit apparaître dans la rubrique d’administration afin de pouvoir être contrôlée, fusionnée, conservée comme variante ou exclue.'

const AJOUT = `

**Déclarer une variante, c’est FUSIONNER.** Dès qu’une graphie est inscrite parmi les variantes d’une autorité, elle cesse d’être une autorité : ⛔ elle ne peut pas figurer en même temps dans la liste des éditeurs normalisés. La fiche redondante est ABSORBÉE — ses propres variantes rejoignent celles de l’autorité retenue, ses rattachements (\`ouvrages_bibliographiques.editeur_valeur_id\`, \`collections_editeurs\`) lui passent AVANT que la ligne ne disparaisse, et la note de valeur académique la suit **avec sa provenance** si l’autorité retenue n’en portait aucune : un score et la source qui le justifie ne se séparent pas. ⛔ On ne se contente jamais de FILTRER l’affichage, les références resteraient accrochées à une entrée devenue fantôme. ⛔ Et l’on ne réécrit pas pour autant la donnée source (\`oeuvres.editeur\`, \`ouvrages_bibliographiques.editeur\`, \`catalogue_notices.editeur\`), qui est la provenance.

**Une graphie ne se rattache qu’à UNE autorité.** Une variante déjà revendiquée par une autre fiche est refusée, et le refus NOMME celle qui la porte : départager deux autorités est une décision philologique, la machine ne tranche pas. Une fiche ne se cite jamais elle-même parmi ses variantes, et deux graphies de même clé n’y figurent qu’une fois. ⚠️ Le verrou est en BASE et non dans l’écran de saisie : une graphie qui remonterait en autorité par un script ou par une requête doit échouer là aussi. La règle vaut pour les DEUX référentiels — \`editeurs.variantes\` pour les maisons des éditions primaires, \`editeurs_valeur.aliases\` pour les autorités bibliographiques — et une déclaration portée dans l’un se propage à l’autre lorsque l’autorité correspondante y existe ; ⛔ elle n’en crée aucune, ouvrir une autorité bibliographique étant un geste éditorial et non l’effet second d’un enregistrement. **Contrôle de clôture** : \`public.autorites_editeurs_a_fusionner()\` doit rester vide, et \`public.variantes_editeurs_disputees()\` nomme ce qui attend un arbitrage.

**La résolution lit la forme ENTIÈRE avant de la découper.** « Veuve Jean Camusat ; Pierre Le Petit » est UNE graphie de la maison, non deux maisons : le point-virgule y sépare deux associés, comme le « et » de la forme retenue. Découper d’abord rendait introuvable toute variante qui porte un « ; », si bien qu’une variante déclarée restait sans effet à l’affichage alors même qu’elle était en base. Le découpage en co-éditeurs n’est donc qu’un REPLI, pour la forme composée que la table ne répertorie pas.`

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

const n = data.valeur.split(ANCRE).length - 1
if (n !== 1) throw new Error(`ancre § 35.6.4 : ${n} occurrence(s), 1 attendue.`)
if (data.valeur.includes('Déclarer une variante, c’est FUSIONNER')) {
  console.log('La règle est déjà dans la charte : rien à écrire.')
  process.exit(0)
}

const texte = data.valeur.replace(ANCRE, ANCRE + AJOUT)
console.log(JSON.stringify({ avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err

// Double relecture : on vérifie que la charte distante porte bien le texte attendu.
const { data: relu, error: err2 } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (err2) throw err2
if (relu.valeur !== texte) throw new Error('la relecture ne rend pas le texte écrit.')
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
