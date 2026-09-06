/**
 * § 46 : la visite de l'accueil, seule à parler de la BARRE, et la règle des deux
 * sujets. Demande de l'auteur du 6 septembre 2026 au soir.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-visite-accueil-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'L’ACCUEIL EST L’EXCEPTION, ET IL LA CONFIRME'

const ANCRE = '⛔ **UNE VISITE MONTRE LA PAGE QU’ON VIENT D’OUVRIR, et la barre de navigation n’est d’aucune page en particulier.** Les trois visites ont porté un arrêt sur sa recherche le 6 septembre 2026 ; l’auteur l’a retiré le soir même, sa demande de « présenter la recherche » ayant visé le champ du VOLET. La barre ne s’explique donc nulle part, et le voile de la visite repasse SOUS elle, qui garde sa lumière.'

const TEXTE = [
  '⛔ **UNE VISITE MONTRE LA PAGE QU’ON VIENT D’OUVRIR, et la barre de navigation n’est d’aucune page en particulier.** Les visites de page ont porté un arrêt sur sa recherche le 6 septembre 2026 ; l’auteur l’a retiré le soir même, sa demande de « présenter la recherche » ayant visé le champ du VOLET. Le voile repasse donc SOUS la barre, qui garde sa lumière.',
  '',
  '⚠️ **L’ACCUEIL EST L’EXCEPTION, ET IL LA CONFIRME.** Cette page n’a pas d’autre objet que d’être une PORTE, et la barre est la porte : sa visite parle donc d’elle, et d’elle seule. Elle le DÉCLARE, et c’est cette déclaration — non un réglage du dessin — qui fait passer le voile par-dessus la barre, pour cette visite-là. ⛔ La case explicative, elle, garde sa réserve : elle explique la barre, elle ne la couvre pas.',
  '',
  '⛔ **DEUX SUJETS PAR ÉTAPE AU PLUS, et le second ORNE l’étape sans la commander.** Sur l’accueil, l’onglet des bibles et la carte des bibles disent la même porte : les montrer l’un sans l’autre laisserait croire qu’ils font deux choses. Le second sujet reçoit sa case et sa flèche comme le premier ; absent, l’étape se donne quand même. ⛔ Deux, jamais trois : au delà, le voile devient une dentelle et l’on ne sait plus ce que la case explique.',
  '',
  '⚠️ **Le voile n’est plus une OMBRE PORTÉE, et il ne pouvait pas le rester.** Une ombre ne sait ouvrir qu’un trou ; deux ombres superposées assombrissent deux fois le dehors et une fois chaque trou, si bien qu’aucun sujet n’est en pleine lumière. Le voile est donc un aplat que sa DÉCOUPE troue, une fois par sujet. ⛔ La règle ne change pas pour autant : un seul tracé fait l’assombrissement ET la découpe, et les deux ne peuvent pas se désaccorder. ⚠️ Ce qui se sépare est le FILET d’or, qui se pose par-dessus ; il se calcule des mêmes mesures, dans le même rendu.',
].join('\n')

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
if (n !== 1) throw new Error('ancre : ' + n + ' occurrence(s), 1 attendue.')
let apres = avant.split(ANCRE).join(TEXTE)

const ANCRE2 = '**La visite de la Bibliothèque** — la page que la barre appelle « Patristique » —'
const AJOUT = '**La visite de l’accueil** compte sept arrêts, dans l’ordre où la barre se lit, de gauche à droite : elle-même, les deux bibles, la patristique, la Communauté, Aller plus loin, la recherche, et les affaires du lecteur. ⚠️ Les deux premières entrées de lecture portent DEUX flèches, l’onglet et la carte du milieu de page. ⛔ Rien sur Administration, qui ne paraît qu’à l’auteur du site ; rien sur la marque, qui ramène à l’accueil où l’on est déjà. ⚠️ Elle ne s’ouvre qu’en écran large : sous le seuil du menu déroulant la barre n’est qu’un bouton, et l’ouvrir couvrirait les cartes que la visite désigne.\n\n' + ANCRE2
if (apres.split(ANCRE2).length - 1 !== 1) throw new Error('ancre 2 : introuvable.')
apres = apres.split(ANCRE2).join(AJOUT)

console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_visite_accueil'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log('Charte à jour, relue. Sauvegarde : parametres[' + cleSauvegarde + '].')
