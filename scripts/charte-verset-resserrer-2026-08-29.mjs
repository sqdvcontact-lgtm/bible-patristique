/**
 * § 3.8.1 : ce que la nature `verset` désigne, et ce qu'elle ne désigne pas.
 *
 * Le paragraphe d'ouverture, écrit le 28 août 2026, autorisait la marque « même si
 * l'édition imprimée la compose dans le fil de la prose ». Le rendu, lui, n'a jamais
 * su faire cela : `estBlocVersets` est TOUT OU RIEN, et un verset dont le paragraphe
 * porte aussi du commentaire se compose en prose. Deux doctrines écrites à un jour
 * d'intervalle, et la donnée suivait l'une pendant que le code suivait l'autre.
 *
 * Arbitrage de l'auteur du 29 août 2026, sur les chiffres : la suite POSÉE PAR
 * L'ÉDITION l'emporte.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-verset-resserrer-2026-08-29.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const ANCIEN = `Dans un commentaire suivi d’un livre biblique, une citation biblique directe qui fonctionne comme lemme, reprise de verset ou unité autonome d’explication peut recevoir, dans la couche éditoriale de lecture, la nature \`verset\`, même si l’édition imprimée la compose dans le fil de la prose. Cette extraction n’altère jamais la couche source : les mots, l’ordre, la ponctuation et la disposition attestée restent conservés dans \`oeuvre_texte_unites\`, les offsets et les métadonnées de provenance. La séparation en \`verset\` est une décision de lecture, non une prétendue restitution de mise en page.`

const NOUVEAU = `⛔ **La nature \`verset\` ne dit PAS qu’un passage est une citation biblique : elle dit que l’ÉDITION le pose verset par verset**, hors du fil de sa prose. C’est la coupure IMPRIMÉE qui la fonde, et c’est pourquoi le rendu ne la recolle pas, quand il recolle au contraire les segments d’une \`citation\` : effacer cette coupure-là serait effacer le verset. Une citation biblique que l’édition coule DANS sa prose — fût-elle lemme, reprise de verset ou unité autonome d’explication — reste une \`citation\` et se lit au fil du texte. La marque n’altère jamais la couche source : les mots, l’ordre, la ponctuation et la disposition attestée restent conservés dans \`oeuvre_texte_unites\`, les offsets et les métadonnées de provenance.

⚠️ **Ce paragraphe disait l’inverse jusqu’au 29 août 2026**, et autorisait la marque « même si l’édition imprimée la compose dans le fil de la prose ». Le rendu ne l’a jamais su faire : \`estBlocVersets\` est TOUT OU RIEN, et un verset dont le paragraphe porte aussi du commentaire se compose en prose. La donnée suivait donc une doctrine et le code une autre, écrites à un jour d’intervalle. Arbitré par l’auteur sur les chiffres du seul texte marqué, le *Commentaire sur les Psaumes* de Chrysostome (Jeannin 1865) : sur **1 109 segments marqués, DEUX suites seulement** — psaume CVIII, 2-11 et psaume CXXVI, 1-2, soit douze segments — sont vraiment posées verset par verset. Les **1 055 autres** sont des citations glissées dans la prose, dont **976 sous 200 signes** et **douze seulement** atteignant les 400 signes à partir desquels la maison laisse une citation quitter le fil. Les détacher toutes aurait fait de ce commentaire un chapelet de blocs rentrés, un tous les trois segments, et serait revenu sur la décision du 20 août 2026 sur les lemmes du *Commentaire sur Joël* : « le seuil reste à 400 et les lemmes se lisent au fil du texte ». Les 1 097 marques sont repassées en \`citation\`, qui dit ce qu’elles sont sans prétendre à une disposition que l’édition n’a pas.

⚠️ **Le corollaire tient au CODE, et il avait été manqué** : la lecture ordinaire exigeait le tout ou rien, la lecture en traductions parallèles faisait bloc sur la seule nature du segment. La MÊME donnée sortait donc du fil sur une surface et y restait sur l’autre. Les deux passent désormais par \`estBlocVersets\`, et un test le tient. C’est la règle déjà payée sur les vers — « une nature traitée sur UNE surface ne l’est nulle part » — prise par l’autre bout : **une nature ne se compose pas de deux façons.**`

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error
const avant = data.valeur
if (avant.includes('ne dit PAS qu’un passage est une citation biblique')) { console.log('Déjà posé.'); process.exit(0) }
const n = avant.split(ANCIEN).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
const apres = avant.split(ANCIEN).join(NOUVEAU)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes('ne dit PAS qu’un passage est une citation biblique')) throw new Error('relecture : le texte neuf est absent.')
// ⚠️ La garde porte sur l'ANCRE entière, non sur la formule : le texte neuf CITE
// l'ancienne rédaction pour dire ce qu'elle disait, et une garde par sous-chaîne
// lèverait donc sur sa propre citation. Payé à la première exécution.
if (relu.valeur.includes(ANCIEN)) throw new Error('relecture : l’ancien paragraphe subsiste.')
console.log('Charte à jour, relue. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
