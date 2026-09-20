/**
 * § 38.36 : l’en-tête de lecture au doigt, et les deux règles qu’il amende (38.30, 38.31).
 * Posé le 20 septembre 2026.
 *
 * ⛔ N’écrit QUE dans `parametres.charte_ia` ; le miroir se régénère par
 * `node scripts/synchroniser-charte-supabase.mjs --pull`.
 * Usage : node scripts/charte-entete-lecture-au-doigt-2026-09-20.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

// Trois retouches, dans l’ordre du fichier : deux amendements et une section neuve.
// ⚠️ Les ancres sont recopiées de la charte SERVIE, apostrophes comprises : elle mêle
// l’apostrophe droite et la courbe, et une ancre retapée ne se retrouve pas.
const RETOUCHES = [
  { quoi: "§ 38.30 — le nombre quitte le verset au doigt", ancre: "⚠️ **La décision vise le nombre posé à droite du verset.** Sur un téléphone, où aucune marge ne peut le porter, la ligne « N œuvres en parlent » reste sous le verset.", neuf: "⚠️ **La décision vise le nombre posé à droite du verset**, et donc l’écran large.\n\n⛔ **AU DOIGT, LE NOMBRE QUITTE LE VERSET** (décision de l’auteur, 20 septembre 2026 : « supprimer, en mode mobile, le “10 œuvres en parlent” qui décale tout »). La ligne se posait en toutes lettres sous chaque verset commenté, et repoussait le suivant : une mention de service prenait au texte la place qu’un écran étroit n’a pas. ⚠️ Le compte n’est pas perdu pour autant, et c’est la condition du retrait : il passe sur l’ONGLET « Commentaires », dès qu’un verset est choisi (§ 38.36)." },
  { quoi: "§ 38.31 — plus de titre à tenir au doigt", ancre: "⛔ **LE TITRE DU CHAPITRE SE TIENT CONTRE LE MENU DES BIBLES** (« Matthieu❧Chapitre 1 et le menu de sélection de la traduction biblique doivent être plus proches l'un de l'autre ; réduire le blanc qui les sépare »). Le titre portait un interligne de prose, qui laissait un vide sous ses lettres, et la marge du menu en ajoutait autant. L'interligne du titre se resserre, et la marge tombe à un huitième de rem. ⚠️ **Rectifié le soir même** (« Matthieu❧Chapitre 1 et le menu de sélection de la traduction biblique doivent être très légèrement plus éloignés l'un de l'autre ») : l'interligne reste serré, et la marge remonte à cinq seizièmes de rem. C'est la MARGE qui règle l'écart, jamais l'interligne, qui rouvrirait un vide sous les lettres du titre. ⛔ Les deux lectures, une colonne et en regard, prennent les mêmes mesures : passer de l'une à l'autre ne déplace ni le titre ni le menu.", neuf: "⛔ **LE TITRE DU CHAPITRE SE TIENT CONTRE LE MENU DES BIBLES** (« Matthieu❧Chapitre 1 et le menu de sélection de la traduction biblique doivent être plus proches l'un de l'autre ; réduire le blanc qui les sépare »). Le titre portait un interligne de prose, qui laissait un vide sous ses lettres, et la marge du menu en ajoutait autant. L'interligne du titre se resserre, et la marge tombe à un huitième de rem. ⚠️ **Rectifié le soir même** (« Matthieu❧Chapitre 1 et le menu de sélection de la traduction biblique doivent être très légèrement plus éloignés l'un de l'autre ») : l'interligne reste serré, et la marge remonte à cinq seizièmes de rem. C'est la MARGE qui règle l'écart, jamais l'interligne, qui rouvrirait un vide sous les lettres du titre. ⛔ Les deux lectures, une colonne et en regard, prennent les mêmes mesures : passer de l'une à l'autre ne déplace ni le titre ni le menu.\n\n⚠️ **AU DOIGT, IL N’Y A PLUS DE TITRE À TENIR** (décision de l’auteur, 20 septembre 2026 : « supprimer le “Genèse ❧ Chapitre 1” en haut de page, et conserver le menu de sélection de la traduction biblique »). L’écart réglé ici ne vaut donc que sur écran large ; au téléphone, le menu des bibles ouvre l’en-tête seul (§ 38.36)." },
  { quoi: "§ 38.36 — l’en-tête au doigt", ancre: "⚠️ **CE QUI ATTEND UNE DÉCISION, ET CE QUI ATTEND LA DONNÉE.** Une bible sans famille éditoriale n’offre pas le choix « Sans les commentaires » : ses notes de verset ne se retirent que par l’adresse (`?texte=seul`), et offrir l’axe à ces bibles est une décision. Les notes du découpage de 1730 ont été écrites pour la Polyglotte, où chaque fragment se lit sur sa ligne ; réunies dans une fenêtre, « partie 1 sur 2 » et « partie 2 sur 2 » se lisent l’une sous l’autre, et les reformuler pour les deux pages est une question de donnée. Les remarques de la traduction moderne du témoin, que la révision du § 50.7 n’a pas touchées, parlent encore la langue de l’atelier (« conservée comme extra du témoin », « dans la transcription actuelle »). Les trois notes de Suzanne ne s’atteignent pas, pas plus que son texte (§ 38.11).", neuf: "⚠️ **CE QUI ATTEND UNE DÉCISION, ET CE QUI ATTEND LA DONNÉE.** Une bible sans famille éditoriale n’offre pas le choix « Sans les commentaires » : ses notes de verset ne se retirent que par l’adresse (`?texte=seul`), et offrir l’axe à ces bibles est une décision. Les notes du découpage de 1730 ont été écrites pour la Polyglotte, où chaque fragment se lit sur sa ligne ; réunies dans une fenêtre, « partie 1 sur 2 » et « partie 2 sur 2 » se lisent l’une sous l’autre, et les reformuler pour les deux pages est une question de donnée. Les remarques de la traduction moderne du témoin, que la révision du § 50.7 n’a pas touchées, parlent encore la langue de l’atelier (« conservée comme extra du témoin », « dans la transcription actuelle »). Les trois notes de Suzanne ne s’atteignent pas, pas plus que son texte (§ 38.11).\n\n### 38.36 L’en-tête de lecture AU DOIGT ne garde que ce qui CHOISIT\n\nTrois demandes de l’auteur du 20 septembre 2026, sur la page « Bible classique » vue au téléphone.\n\n⛔ **CE QUI NOMME S’EN VA, CE QUI CHOISIT RESTE.** Le titre « Genèse ❧ Chapitre 1 » prenait une bande entière, avec ses deux flèches, pour dire où l’on est — ce que le volet des livres dit déjà, et ce que le bandeau du bas redit, flèches comprises. Il ne paraît plus. Le menu des bibles, lui, reste : il ne nomme pas, il OFFRE, et rien d’autre à l’écran ne permet de changer de traduction. ⚠️ Sur écran large, rien ne change : le titre y tient sans rien coûter, et le § 38.31 règle son écart au menu.\n\n⛔ **UN COMPTE SE POSE SUR L’ONGLET QU’IL DÉCRIT, non sous le texte qu’il encombre.** Le nombre d’œuvres qui parlent du verset retenu vient sur l’onglet « Commentaires » — c’est ce que l’onglet ouvrira, et l’étiquette avait la place que le verset n’avait pas. ⛔ Sans verset retenu, AUCUN chiffre : l’onglet ouvre alors le volet sur le chapitre entier, qui ne se dit pas en un nombre. Un vide se lit « rien à dire », jamais « zéro ».\n\n⚠️ **LE CHIFFRE N’EST PAS UN MOT DU LIBELLÉ.** Il ne prend ni l’espacement des capitales de l’onglet, ni la graisse de l’onglet actif, et garde son encre propre : on le lit comme une indication, non comme la suite du nom. ⛔ Aucune pastille : la barre n’a que 2,875 rem de haut, et un fond rond y ferait une alarme là où l’on ne donne qu’un nombre.\n\n⚠️ **À LA VOIX, L’ONGLET DIT LA PHRASE ENTIÈRE** — « Commentaires — 8 œuvres en parlent, 5 commentaires, 3 citations » —, et le chiffre à l’écran devient alors redondant pour qui écoute.\n\n⚠️ **LA VISITE SUIT.** Son arrêt sur l’en-tête annonçait un titre ; au doigt, il n’annonce plus que le menu. ⛔ Une visite qui nomme ce que l’écran ne montre pas est une case posée sur du vide, en mots — c’est le défaut contre lequel ses sujets sont donnés en repères plutôt qu’en sélecteurs. Elle ne se DUPLIQUE pas pour autant : une seule étape change, et elle change dans le scénario." },
]

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
let texte = data.valeur
const avant = texte.length
if (texte.includes('### 38.36 L’en-tête de lecture AU DOIGT')) throw new Error('La règle est déjà posée.')
for (const r of RETOUCHES) {
  const n = texte.split(r.ancre).length - 1
  if (n !== 1) throw new Error(`${r.quoi} : ${n} occurrence(s) de l’ancre, 1 attendue.`)
  texte = texte.split(r.ancre).join(r.neuf)
}
console.log(JSON.stringify({ avant, apres: texte.length, delta: texte.length - avant, retouches: RETOUCHES.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('§ 38.36 inscrit, §§ 38.30 et 38.31 amendés.')
