/**
 * § 38.4, suite : le nom d'une bible se compose partout de la même façon, l'édition
 * passe sous la chronologie, et la bibliographie serre son interligne.
 *
 * Quatre demandes de l'auteur du 4 septembre 2026, en troisième passe sur la page
 * « Bible classique ».
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-fiche-traduction-composition-2026-09-04.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const MARQUE = 'UN NOM DE BIBLE SE COMPOSE PARTOUT DE LA MÊME FAÇON'

// Ancre : la dernière phrase du § 38.4, recopiée de `parametres.charte_ia`.
const ANCRE = 'Une fenêtre de la page Bible ne s’invente pas un dessin : elle prend celui de la page.'

const SECTION = `

⚠️ **${MARQUE}** (demande de l'auteur, 2026-09-04). « Bible française du XIIIe siècle » prend ses petites capitales et son exposant dans le menu central de la page Bible, dans la liste qu'il déploie, dans la fiche « À propos de cette traduction » et dans la référence de son édition — comme elle les prend déjà dans le menu de la Polyglotte et dans les notices d'auteur. Un titre entre astérisques y prend son italique. C'est le module partagé, et il n'y a pas deux façons d'écrire un nom selon l'écran où il paraît. ⛔ Les DATES d'un intitulé se composent AVEC lui : elles en étaient sorties, si bien que « (XIIIe siècle) » restait en chiffres ordinaires dans la fiche même de la bible qui porte ce siècle dans son nom.

⛔ **DANS UNE RÉFÉRENCE BIBLIOGRAPHIQUE, ON NE COMPOSE QUE LES SIÈCLES.** Un fragment de notice porte déjà son rôle — intitulé, nom d'autorité, données —, et c'est le RÔLE qui décide de son italique et de ses petites capitales. Y ajouter la composition des astérisques poserait un italique DANS un fragment déjà italique, où il ne se verrait pas, et ferait décider par le texte ce que la donnée nomme.

⚠️ **À GAUCHE CE QU'ON LIT, À DROITE CE QUI LE DOCUMENTE — et la colonne de droite va jusqu'en bas** (« peut-on envisager que “Édition et état du texte” soit sous la chronologie ? proprement ? »). La rubrique tenait toute la mesure, SOUS les deux colonnes ; or une frise de cinq entrées s'arrête à mi-hauteur d'une notice qui continue, et la fiche montrait donc un grand vide à droite avec sa rubrique reléguée dessous. Elle remplit ce vide, où elle est à sa place. ⚠️ Ses rangées y EMPILENT l'étiquette et sa valeur : une colonne d'étiquettes de 8,5 rem ne laisserait pas cent soixante-dix pixels à la valeur dans une colonne étroite. C'est la forme que la fiche d'édition emploie déjà, et c'est le MÊME composant — une rangée recopiée à deux endroits ne reste identique que par accident.

⚠️ **L'INTERLIGNE D'UNE BIBLIOGRAPHIE EST SERRÉ, LE BLANC ENTRE DEUX NOTICES EST LARGE** (« réduire légèrement l'interligne ; augmenter légèrement le blanc entre deux œuvres »). Une bibliographie n'est pas de la prose : les lignes d'une même référence se lisent d'un trait, tandis que deux références sont deux objets. Le blanc doit donc être plus grand ENTRE les entrées qu'à l'intérieur de l'une d'elles — sans quoi la liste se lit comme un paragraphe, et le retrait suspendu reste seul à dire où commence la suivante. ⛔ La mesure vaut pour TOUTE la famille, l'apparat des bibles comme les listes des notices : il n'y a qu'une composition bibliographique sur le site.`

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
const apres = avant.split(ANCRE).join(ANCRE + SECTION)
console.log(JSON.stringify({ avant: avant.length, apres: apres.length, delta: apres.length - avant.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }

const cleSauvegarde = 'charte_ia_sauvegarde_20260904_avant_composition_fiche'
const { error: errSauv } = await db.from('parametres').upsert({ cle: cleSauvegarde, valeur: avant }, { onConflict: 'cle' })
if (errSauv) throw errSauv

const { error: err } = await db.from('parametres').update({ valeur: apres }).eq('cle', 'charte_ia')
if (err) throw err

const { data: relu } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (!relu.valeur.includes(MARQUE)) throw new Error('relecture : le texte neuf est absent.')
if (relu.valeur.length !== apres.length) throw new Error('relecture : longueur inattendue.')
console.log(`Charte à jour, relue. Sauvegarde : parametres['${cleSauvegarde}'].`)
console.log('Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
