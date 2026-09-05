/**
 * § 42 : l'outil bibliographique — la page « Bibliographie » d'« Aller plus loin ».
 *
 * Décision de l'auteur du 6 septembre 2026 : « Mise en place d'un outil bibliographique
 * dédié au religieux, dans Aller plus loin. Je te laisse constituer ça. »
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère
 * (`node scripts/synchroniser-charte-supabase.mjs --pull`).
 * Usage : node scripts/charte-outil-bibliographique-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'L’OUTIL BIBLIOGRAPHIQUE EST UNE SURFACE DU MOTEUR, NON UN MOTEUR DE PLUS'

// La section s'ajoute EN FIN de charte, après le § 41.6 : l'ancre est la dernière
// phrase du document, vérifiée pour elle-même avant toute écriture.
const ANCRE_FIN = '⚠️ **Une règle CSS que rien ne porte fausse un relevé comme elle fausse une lecture.** `.cs-chapeau` portait 1,75 sur la page du chantier et n’était posée sur aucun élément ; l’audit l’avait d’abord comptée parmi les écarts.'

const SECTION = `

## 42. L’outil bibliographique — la page « Bibliographie »

Décision de l’auteur, 6 septembre 2026 : « Mise en place d’un outil bibliographique dédié au religieux, dans Aller plus loin. » La page \`/bibliographie\` donne à consulter, à chercher et à citer les ouvrages sur lesquels s’appuient les notices du site — commentaires, éditions critiques, études d’exégèse, de théologie et d’histoire de la réception. Elle entre au menu « Aller plus loin » entre « Les traductions » et « Acheter des livres » : ce qu’on lit ici, ce sur quoi l’on s’appuie, où l’on trouve les livres.

### 42.1 Ce qu’elle montre, et ce qu’elle tait

⛔ **Elle ne montre que ce que le § 29.1 permet de montrer** : les ouvrages dont le statut scientifique calculé est \`retenu\` ou \`secondaire\`. Un ouvrage \`exclu\` ne paraît nulle part ; un ouvrage \`a_verifier\` n’est pas présenté comme une référence validée, donc pas présenté du tout. Le filtre est posé à la LECTURE, côté serveur, et revérifié dans le module pur : deux barrières pour une règle qui protège des personnes. ⚠️ Au 6 septembre 2026, 588 ouvrages sur 958 sont dans ce cas ; les 162 sources primaires du catalogue sont toutes \`a_verifier\` et n’y paraissent donc pas — c’est une dette de qualification, non un choix de l’outil, et elle se règle dans la donnée.

⛔ **Rien n’y dit le RANG d’un ouvrage** : ni score, ni le mot « secondaire », ni motif, ni réserve, ni note d’administration. Le lecteur voit ce qu’un catalogue montre : la référence, le genre, la langue, et pour quelles péricopes l’ouvrage est cité.

### 42.2 Une surface du moteur

⛔ **L’OUTIL BIBLIOGRAPHIQUE EST UNE SURFACE DU MOTEUR, NON UN MOTEUR DE PLUS** (§ 35.6.5). Chaque référence se compose par \`ReferenceBibliographique\` depuis \`v_references_bibliographiques\`, par le même chargement que toute autre surface qui cite ; la page n’a aucune règle de composition à elle, et le bouton « Copier la référence » sort la même référence par les sorties du § 35.6.6 — en HTML riche pour un traitement de texte, en texte nu pour ce qui ne lit que le texte. La forme de la liste est celle de toute bibliographie du site (§ 35.6.2) : retrait suspendu, ferrée à gauche, aucune puce, aucun cadre.

**L’ordre se calcule** (§ 35.6.3), par le comparateur commun : la vedette, puis le titre sans son article. La vedette est le premier auteur structuré — scientifique ou source —, dont l’autorité dit si elle se coupe en prénom et nom de famille ; à défaut le texte libre ; à défaut le titre. La marge du catalogue porte la LETTRE de cette vedette, collante comme le nom d’un livre au catalogue des péricopes, et une entrée qui ne commence pas par une lettre se range sous « # ».

### 42.3 Le volet

Même grammaire que le catalogue des péricopes, l’autre page-outil du site : la recherche, le compte, « Parcourir » (aller à une lettre), « Filtrer ». Quatre axes de filtre, dont les comptes se prennent sur le corpus ENTIER — un filtre dit ce qu’il donnerait, et un axe dont on retire une valeur ne se vide pas sous la main : le genre (le vocabulaire de \`type_ouvrage\`, dans les mots de l’administration), la rubrique sous laquelle l’ouvrage est cité par une péricope (exégèse, théologie, tradition et réception, critique textuelle), la langue, le siècle de parution. ⛔ Pas de barre d’onglets : le seul partage naturel — par genre — redirait un filtre, ce que le § 36 proscrit.

**La recherche cherche partout où un lecteur peut savoir quelque chose d’un ouvrage** : les noms des personnes sous leurs deux formes, les intitulés, la collection, les maisons, le lieu, l’année, et la référence composée elle-même. Chaque mot tapé doit s’y trouver, dans n’importe quel ordre, sans égard aux accents, à la casse ni à l’apostrophe.

### 42.4 Le chargement

La bibliographie est une donnée de référence publique et quasi statique : elle se charge côté SERVEUR et la page se met en cache, revalidée toutes les trente minutes, comme le catalogue des péricopes. La page ne demande que les colonnes qu’elle affiche ; les 1 659 liens de péricopes passent le plafond d’une page PostgREST et se lisent par pages, dans un ordre stable. Le module pur \`app/lib/bibliographieCatalogue.ts\` répond de l’assemblage, du tri, des filtres et des libellés, et ses tests figent ce qui paraît, l’ordre et ce qu’une recherche trouve.

⚠️ **Ce que l’outil ne fait pas encore, et pourquoi.** Il ne lie qu’aux péricopes : seize ouvrages sont aussi cités dans les notes d’une œuvre et quinze dans les introductions d’une bible, et ces rattachements attendent une décision sur la forme du lien. Il n’a pas de fiche par ouvrage : la référence est la fiche, et une page par notice ajouterait six cents adresses pour ne rien dire de plus. Il ne propose pas de lien d’achat : les librairies sont sur leur page, et la sienne y renvoie en pied.
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

const n = avant.split(ANCRE_FIN).length - 1
if (n !== 1) throw new Error(`ancre : ${n} occurrence(s), 1 attendue.`)
if (!avant.trimEnd().endsWith(ANCRE_FIN)) throw new Error('ancre : la charte ne se termine pas où on l’attend.')
if (/^## 42[.\s]/mu.test(avant)) throw new Error('une section 42 existe déjà.')

const apres = avant.trimEnd() + SECTION
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260906_avant_outil_bibliographique'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv
const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err
const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
