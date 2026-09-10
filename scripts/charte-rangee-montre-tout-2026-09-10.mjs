/**
 * Consigne dans la charte, § 38.26.1 : LA RANGÉE MONTRE TOUT, ET NE CÈDE QUE TOUT ENTIÈRE.
 *
 * Seconde rectification de l'auteur du 10 septembre 2026, quelques heures après la
 * première : « je t'ai demandé de regrouper partager, extraire, etc., sous un bouton ⋮ ;
 * cela ne doit être le cas que quand on manque de place à l'écran ; sur grand écran, pas
 * la peine de cacher les icônes. »
 *
 * ⛔ Elle ne défait pas le § 38.26, elle le PRÉCISE : ce qui coûte la largeur reste le
 * nombre de cibles, et le nom de l'auteur passe toujours avant. Ce qui change est le
 * moment où le ⋮ paraît.
 *
 * ⚠️ Le texte s'AJOUTE par la fin, et l'invariant l'exige : ce qu'on écrit doit COMMENCER
 * par ce que l'exemplaire porte déjà. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-rangee-montre-tout-2026-09-10.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const SECTION = `
#### 38.26.1 La rangée MONTRE TOUT, et ne cède que TOUT ENTIÈRE

Seconde rectification de l'auteur, le soir du 10 septembre 2026 : « je t'ai demandé de
regrouper partager, extraire, etc., sous un bouton ⋮ ; cela ne doit être le cas que quand
on manque de place à l'écran ; sur grand écran, pas la peine de cacher les icônes. »

⛔ **UN REPLI QUI JOUE EN TOUTES CIRCONSTANCES N'EST PLUS UN REPLI.** La forme du matin
rangeait les trois actions sous le ⋮ quelle que fût la place, et n'en sortait que l'étoile
quand le nom la permettait : elle cachait donc des icônes là où rien ne l'exigeait, c'est-à-
dire l'exact contraire de ce qu'une condensation existe pour faire. Une rangée montre TOUT
tant que la tête le porte, et ne cède que quand elle ne le porte plus.

⛔ **ET ELLE CÈDE D'UN COUP, JAMAIS PAR DEGRÉS.** Deux formes, et deux seulement : la rangée
entière en icônes, ou le ⋮ et le contrôle du contenant. Un repli par crans — une icône qui
cède après l'autre — a été écarté : c'est le parti que la barre de navigation avait défait
le matin même, « la rangée n'avait pas la même forme selon la largeur de la fenêtre », et
une rangée qui change de forme par degrés ne s'apprend jamais.

⛔ **CE QUI DISPUTE LA PLACE SE COMPTE, IL NE SE MESURE PAS.** Le prédicat ne reçoit plus la
largeur de la rangée telle qu'elle est peinte — il lisait alors dans le document une valeur
qu'il venait lui-même de décider, et il fallait la ramener à la forme dépliée pour qu'il
n'oscille pas — mais le NOMBRE de cibles de la forme dépliée, dont la place se calcule : n
côtés et n−1 écarts. Les trois termes de la règle sont ainsi connus AVANT le rendu.

⚠️ **Une rangée n'a pas le même nombre de cibles pour tout le monde**, et cela se compte
aussi : l'administrateur en a une de plus, un téléphone n'a pas le chevron du volet — c'est
la barre qui y ferme.

⚠️ **LE PRIX DE LA CIBLE DE L'ADMINISTRATEUR SE CHIFFRE, et il reste à trancher.** Mesuré
sur les quinze auteurs publiés et neuf écrans : à 2400 px et au-delà, quatorze noms sur
quinze portent la rangée du lecteur, dix seulement celle de l'administrateur. « Augustin
d'Hippone » demande 168 px quand la tête en offre 347 : 168 et la rangée du lecteur tiennent,
168 et celle de l'administrateur non — huit pixels. Trois leviers, tous trois des décisions
et non des correctifs : sortir de la tête le réglage réservé à l'administration, hausser le
plafond de largeur du volet, ou rendre aux cibles leur plancher absolu de 24 px sur les
grands écrans, ce dernier défaisant la mise en rem du matin.

⚠️ **Et « Eusèbe de Césarée » porte la rangée de l'administrateur d'UN SEUL PIXEL** — 346
pour 347 offerts. C'est ce genre de cas qui interdit de poser un seuil : il se mesure.
`

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

/** ⛔ L'INVARIANT : on n'écrit QUE par la fin, et jamais sur ce qui est déjà là. */
function ajouter(texte, source) {
  if (texte.includes('#### 38.26.1 ')) throw new Error(`[${source}] le § 38.26.1 y est déjà.`)
  const sortie = texte.trimEnd() + '\n' + SECTION
  if (!sortie.startsWith(texte.trimEnd())) throw new Error(`[${source}] l'ajout ne prolonge pas le texte existant.`)
  return sortie
}

const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = ajouter(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = ajouter(distantAvant, 'Supabase')

console.log(JSON.stringify({
  fichier_local: { avant: localAvant.length, apres: localApres.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, mis_a_jour: data.mis_a_jour },
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
if (!relue.valeur.trimEnd().endsWith(SECTION.trimEnd())) {
  throw new Error('Relecture : la charte distante ne se termine pas par le § 38.26.1.')
}
console.log('Les deux exemplaires portent le § 38.26.1, et la relecture le confirme.')
