/**
 * § 43.4 : la page des résultats pagine et compte en base ; la Polyglotte des résultats
 * reproduit le tableau de la page Polyglotte ; un alias masqué qui répond se dit.
 *
 * Trois demandes de l'auteur, le 6 septembre 2026 : « optimise la page », « il y a une
 * nouvelle version du tableau dans la page Polyglotte, il faut la reproduire », et
 * « “Je ne fais pas le bien que je veux” est trouvé quand je cherche “Homme”, ce n'est
 * pas cohérent ».
 *
 * Deux gestes sur la charte : la puce du § 43.3 qui annonçait un plafond de 6 000 versets
 * et 5 000 segments est corrigée (le plafond est tombé), et le § 43.4 s'ajoute en fin de
 * texte. ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-recherche-paginee-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'LA BASE COMPTE, LA BASE PAGINE ; LA PAGE MONTRE'

// La puce du § 43.3 à corriger, reconnue quelle que soit l’espace qui sépare les milliers.
const PUCE_PLAFOND = /Le plafond reste de 6[\s\u00a0\u202f]000 versets et 5[\s\u00a0\u202f]000 segments par recherche, dans un ordre stable désormais\./u
const PUCE_CORRIGEE = 'Le plafond de 6 000 versets et 5 000 segments par recherche est tombé le jour même : la base compte et pagine (§ 43.4).'

const SECTION = `

### 43.4 La page pagine et compte en base (2026-09-06)

Demande de l’auteur, le jour même : « optimise la page ». Relevé sur le site : sur « Dieu » ou « était », la page rapatriait tout ce que la base trouvait, jusqu’à 6 000 versets avec leurs cinq bibles et 5 000 passages entiers, cinq à six méga-octets, puis en montrait vingt et comptait le reste dans le navigateur : dix à quinze secondes avant la première ligne, et un plafond au-delà duquel elle annonçait « résultats trop nombreux ».

⛔ **LA BASE COMPTE, LA BASE PAGINE ; LA PAGE MONTRE.** Une recherche ne demande plus que deux répartitions, les livres et les œuvres avec leur effectif, dont les totaux se déduisent, et une page de vingt lignes à la fois, que la base range dans l’ordre du canon pour l’Écriture, de l’auteur puis de l’œuvre pour les Pères, et filtre sur un livre ou une œuvre. Plus de plafond : « Dieu » compte ses 18 000 passages et ses 5 500 versets, exactement. Mesuré : la recherche la plus lourde du corpus rend en un tiers de seconde ce qui en coûtait quinze.

⛔ **La page ne rejette rien de ce que la base rend.** Elle relisait chaque ligne pour n’en garder que celles où elle retrouvait le mot, et une relecture qui ne connaît pas une graphie jette ce que la base a trouvé (§ 43.2). La base fait foi ; la page marque ce qu’elle reconnaît.

⚠️ **Le texte original rejoint la recherche des passages** : un passage répond en français, en latin ou en grec, ou dans les deux, dans une seule liste et un seul ordre. Deux listes paginées ne se fondent pas, et la langue rendue avec un passage est celle de l’original, jamais celle de la traduction lue.

⚠️ **Trouvaille, qui vaut pour toute recherche écrite en base : un motif passé en paramètre à une fonction se planifie à l’aveugle.** Le planificateur ne connaît pas la valeur d’un paramètre, estime au hasard ce qu’une expression rationnelle retient, et bascule sur un parcours complet de la table dès que le plan générique lui paraît bon marché : la même condition coûtait 110 millisecondes écrite en constante, de 230 à 4 700 en paramètre, et le banc d’essai l’a vue à 2 700 sur la répartition. Les motifs entrent donc dans la requête en constantes, à chaque appel, et le plan se fait sur eux.

**La Polyglotte des résultats reproduit le tableau de la page Polyglotte** (demande de l’auteur, le même jour) : la barre d’en-tête de la page de lecture, le nom de l’édition en sérif et son millésime dessous, un menu par colonne que le chevron annonce, le livre qui change en titre collant, vert et centré, et la colonne composée par la même feuille. Deux surfaces, un seul tableau.

⚠️ **Un alias masqué qui répond se dit** (complément du § 38.18). « Homme » rendait « Je ne fais pas le bien que je veux » sans un mot pour dire pourquoi : la paraphrase « Homme malheureux que je suis », masquée, l’avait trouvée. Un alias masqué ne paraît pas parmi les noms d’une péricope ; mais quand c’est lui qui répond à la recherche, la ligne « Correspond à » le nomme, sans quoi le résultat paraît incohérent. Seul un alias inexact se tait, visible ou non : c’est l’usage qui décide, non le drapeau de visibilité.
`

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

const occurrences = avant.match(new RegExp(PUCE_PLAFOND.source, 'gu')) ?? []
if (occurrences.length !== 1) throw new Error(`puce du plafond : ${occurrences.length} occurrence(s), 1 attendue.`)
if (!avant.includes('### 43.3 Ce qui n’a pas bougé, et ce qui reste')) throw new Error('le § 43.3 est introuvable : la section 43.4 ne se pose pas à l’aveugle.')
const apres = avant.replace(PUCE_PLAFOND, PUCE_CORRIGEE).trimEnd() + SECTION
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_recherche_paginee'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
