/**
 * Charte : ce que les contrôles de la grille doivent DIRE, et ce qu'ils n'autorisent pas.
 *
 * Huit points, tous demandés par l'auteur le 20 septembre 2026 pour verrouiller le
 * cadre technique AVANT l'audit éditorial livre par livre :
 *
 *   § 35.28 — une relation non descendante est une faute STRUCTURELLE, et le contrôle
 *             ne préjuge pas du champ fautif : le rang ou la parenté, selon le cas.
 *           — la fratrie hétérogène est une ALERTE, non un invariant.
 *           — aucune déclaration de rang présente dans les données n'est neutralisée
 *             SILENCIEUSEMENT.
 *           — le relevé chiffré, repris sur la mesure du jour.
 *   § 35.29 — le champ qui porte les trois états de clôture, et ce que `null` veut dire.
 *   § 35.30 — le registre en deux exemplaires, et ce que le contrôle de dérive compare.
 *   § 48.1  — une clé `parametres.protocole_*` n'a AUCUNE autorité normative.
 *   § 48.4  — les contrôles correspondants.
 *
 * ⛔ Le script refuse d'écrire si un motif ne se trouve pas exactement une fois dans
 * CHACUN des deux exemplaires. ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-grille-titres-verrous-2026-09-20.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const cheminCharte = resolve(racine, 'charte', 'CHARTE_IA.md')
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: '§ 35.28 — aucune déclaration n’est neutralisée en silence',
    avant: '⚠️ Le rendu a ignoré ces déclarations jusqu’au 20 septembre 2026 : 4 948 titres sur 6 316 en portaient une, et 39 en portaient une que le registre contredisait.',
    apres: '⚠️ Le rendu a ignoré ces déclarations jusqu’au 20 septembre 2026 : 4 948 titres sur 6 316 en portaient une, et 39 en portaient une que le registre contredisait.\n\n⛔ **AUCUNE DÉCLARATION DE RANG PRÉSENTE DANS LES DONNÉES N’EST NEUTRALISÉE SILENCIEUSEMENT.** La préséance ci-dessus ne change pas — un nom hérité porte son rang dans son nom, et il fait foi —, mais lorsqu’elle écarte une déclaration du bloc, le CONTRÔLE la nomme : le code déclaré, le rang déclaré, le rang retenu. ⚠️ C’est le seul moyen de distinguer une donnée qui parle d’une donnée qui se tait, et donc de savoir si la grille a été réellement posée sur un livre. ⛔ Le rendu, lui, ne change rien : il compose ce que la règle dit, et c’est le relevé qui porte le doute.',
  },
  {
    nom: '§ 35.28 — quatre relevés, dont deux structurels',
    avant: '**Quatre relevés, du plus dur au plus souple.** ⛔ Les trois premiers sont des défauts, le quatrième est une QUESTION.\n\n1. **Déclaration irrecevable** — un titre qui déclare un rang d’information, ou l’inverse. Le rendu l’écarte déjà ; c’est une faute de donnée pure, et elle doit valoir zéro.\n2. **Inversion** — un titre à un rang SUPÉRIEUR à celui de son parent. Incohérent par construction : un enfant ne domine pas son père.\n3. **Rang plat** — un titre au MÊME rang que son parent. Une hiérarchie qui ne descend pas n’en est pas une.\n4. **Saut** — un enfant à plus d’un rang sous son parent. ⚠️ Ce n’est PAS une faute en soi : une édition peut n’avoir qu’un seul niveau analytique sous une section. C’est une question à poser au livre, et le nombre dit s’il faut la poser.\n\n⚠️ **La fratrie hétérogène** — des titres frères d’un même parent à des rangs différents — se relève avec eux : deux frères qui n’ont pas le même poids rendent le plan illisible.',
    apres: '**L’INVARIANT.** ⛔ **TOUTE RELATION TITRE-PARENT DOIT ÊTRE STRICTEMENT DESCENDANTE.** Un enfant se tient exactement un rang au-dessous de son parent, ou davantage ; il ne le domine jamais et ne se tient jamais à son niveau.\n\n⛔ **UNE VIOLATION IMPOSE UNE CORRECTION STRUCTURELLE, PORTANT SELON LE CAS SUR LE RANG DU TITRE OU SUR SA PARENTÉ.** Les deux champs peuvent la produire, et rien dans la relation ne dit lequel est fautif : un titre correctement rangé sous un mauvais parent donne la même anomalie qu’un titre mal rangé sous le bon. ⛔ **Le contrôle signale donc une inversion ou un rang plat SANS PRÉJUGER DU CHAMP FAUTIF. Ne jamais corriger automatiquement `semantic_level` au seul motif que la relation est invalide. Vérifier `semantic_parent_key` avant toute correction**, et trancher à la LECTURE du livre.\n\n**Les relevés, du plus dur au plus souple.**\n\n1. **Déclaration irrecevable** — un titre qui déclare un rang d’information, ou l’inverse. Le rendu l’écarte déjà ; c’est une faute de donnée pure, et elle doit valoir zéro.\n2. **Conflit de préséance** — un bloc déclare un rang, et le rendu en retient un autre parce qu’un nom hérité en porte un. Le rendu garde sa règle ; le contrôle nomme le conflit (voir ci-dessus).\n3. **Relation non descendante** — inversion (l’enfant domine son parent) ou rang plat (l’enfant est au rang de son parent). Incohérent par construction, et à reprendre sur le rang OU sur la parenté.\n4. **Saut** — un enfant à plus d’un rang sous son parent. ⚠️ Ce n’est PAS une faute en soi : une édition peut n’avoir qu’un seul niveau analytique sous une section. C’est une question à poser au livre, et le nombre dit s’il faut la poser.\n\n⚠️ **LA FRATRIE HÉTÉROGÈNE EST UNE ALERTE FORTE, NON UN INVARIANT.** Des titres frères d’un même parent à des rangs différents rendent un plan illisible, et le relevé les nomme ; mais le modèle ne GARANTIT pas formellement que deux frères soient au même étage, et rien ne l’a démontré. ⛔ **Aucune normalisation automatique**, donc, et aucun durcissement de cette alerte en invariant tant que la garantie n’est pas écrite ici, avec sa démonstration.',
  },
  {
    nom: '§ 35.28 — le relevé chiffré, mesuré par la fonction de la page',
    avant: '⛔ **ON REPREND LIVRE PAR LIVRE, JAMAIS EN MASSE.** Relevé du 20 septembre 2026 sur les 6 316 titres du corpus Fillion : **62 inversions, 294 rangs plats, 140 fratries hétérogènes, 1 579 sauts**, et zéro déclaration irrecevable. Une règle qui demanderait de justifier quinze cents sauts au cas par cas ne serait pas une règle mais un arriéré ; on corrige un livre quand on le reprend, et le contrôle dit où en est chacun.',
    apres: '⛔ **ON REPREND LIVRE PAR LIVRE, JAMAIS EN MASSE.** Relevé du 20 septembre 2026, par la fonction de la page, sur les 6 339 titres du corpus Fillion : **52 inversions, 284 rangs plats, 134 fratries hétérogènes, 1 565 sauts**, zéro déclaration irrecevable et zéro conflit de préséance. Une règle qui demanderait de justifier quinze cents sauts au cas par cas ne serait pas une règle mais un arriéré ; on corrige un livre quand on le reprend, et le contrôle dit où en est chacun.\n\n⚠️ **UN RELEVÉ SE DATE ET SE RATTACHE À LA RÈGLE QUI L’A PRODUIT.** Le même jour, le même corpus, mesuré avec la préséance d’AVANT, rendait 64 inversions, 292 rangs plats et 1 518 sauts. Rendre au bloc son rang déclaré en retire douze et huit, et en ouvre quarante-sept — c’est arithmétique : un titre qui remonte d’un cran s’éloigne d’autant de ses enfants. ⛔ Comparer deux relevés pris sous deux règles ferait conclure à une dégradation là où il n’y a qu’un changement de lecture.',
  },
  {
    nom: '§ 35.28 — ce que le contrôle relève',
    avant: '**Le contrôle est `scripts/fillion/controle-grille-titres.mts`** (`--livre=`, `--detail`, `--strict`). ⛔ Il n’a aucune règle à lui : le rang de chaque bloc vient de `resoudreStyleSemantique`, la fonction que la page emploie. Il n’écrit rien.',
    apres: '**Le contrôle est `scripts/fillion/controle-grille-titres.mts`** (`--livre=`, `--detail`, `--strict`). ⛔ Il n’a aucune règle à lui : le rang de chaque bloc vient de `resoudreStyleSemantique` et les conflits de préséance de `rangsNeutralises`, les fonctions que la page emploie. Il n’écrit rien, et il ne tranche rien : sur une relation non descendante, il nomme les deux titres et rappelle que la correction porte sur le rang OU sur la parenté. Il rougit sur une déclaration irrecevable ou sur un état de manchette que la donnée contredit ; `--strict` le fait rougir aussi sur les relations non descendantes et les conflits.',
  },
  {
    nom: '§ 35.29 — le champ des trois états',
    avant: '⛔ **UNE MANCHETTE ÉDITORIALE NE REÇOIT JAMAIS DE `facsimile_heading`**, et la raison n’est pas une convention de champ : `facsimile_heading` ATTESTE une forme imprimée. Lui donner une forme qu’aucun témoin ne porte, ce n’est pas remplir un champ, c’est falsifier le témoin.',
    apres: '⛔ **UNE MANCHETTE ÉDITORIALE NE REÇOIT JAMAIS DE `facsimile_heading`**, et la raison n’est pas une convention de champ : `facsimile_heading` ATTESTE une forme imprimée. Lui donner une forme qu’aucun témoin ne porte, ce n’est pas remplir un champ, c’est falsifier le témoin.\n\n**LE CHAMP.** ⛔ Les trois états sont REPRÉSENTABLES et CONTRÔLABLES dans la donnée, sans quoi ils ne sont qu’une intention : `bible_editorial_body_blocks.manchette_etat` vaut `source`, `editoriale` ou `absente`, et `manchette_motif` porte la raison, obligatoire pour les deux derniers, interdite au premier — le témoin EST la justification d’une manchette source. Un motif sans état est refusé. ⛔ **`null` ne veut dire qu’une chose, et une seule : « pas encore relu ».** C’est ce qui permet à la clôture d’un livre d’exiger zéro `null` parmi les blocs éligibles, au lieu d’exiger l’impossible d’un champ qui mêlerait l’absence et l’oubli.\n\n⚠️ **Est ÉLIGIBLE un commentaire de rang I4 à I6**, c’est-à-dire ce que le § 35.9 compose en manchette. Le contrôle les compte livre par livre, dit combien restent à relire, et signale un état que la donnée contredit : « source » sur un bloc sans intitulé, « absente » sur un bloc qui en porte un.\n\n⛔ **AUCUN ÉTAT NE S’ÉCRIT EN MASSE, ET AUCUN NE SE DÉDUIT.** La migration qui pose le champ n’a renseigné AUCUNE ligne : l’état se pose à la relecture, livre par livre, et c’est un travail de LECTURE. ⛔ Un quatrième état ne s’invente pas dans une passe : il se décide ici.',
  },
  {
    nom: '§ 48.1 — une clé protocole_* n’a aucune autorité',
    avant: 'Si elle est purement locale, elle reste dans le journal de mission sans alourdir la norme. ⛔ **Le protocole ne s’allège jamais en supprimant une garde qui a déjà empêché une erreur réelle** ; il peut être réorganisé pour éviter les doublons, mais sa couverture ne régresse pas.',
    apres: 'Si elle est purement locale, elle reste dans le journal de mission sans alourdir la norme. ⛔ **Le protocole ne s’allège jamais en supprimant une garde qui a déjà empêché une erreur réelle** ; il peut être réorganisé pour éviter les doublons, mais sa couverture ne régresse pas.\n\n⛔ **UNE CLÉ `parametres.protocole_*` EST UNE NOTE DE TRAVAIL, JAMAIS UNE NORME.** Le préambule le dit déjà de la charte — elle est « la Constitution du projet », et elle est UNE —, mais il faut le dire du lieu : ce qui prescrit vit dans `charte_ia`, sous un numéro de §, et nulle part ailleurs. Une clé `protocole_*`, un manifeste déposé dans `parametres`, une note du centre de contrôle n’ont AUCUNE autorité normative, et ne peuvent ni compléter ni contredire un §. ⚠️ Elles restent utiles : on y dépose un brouillon, un relevé, un plan de mission. ⛔ Mais une règle qui n’est pas dans la charte n’est pas une règle, et l’on ne la cite pas comme telle. Le centre de contrôle renvoie au § ; il ne renvoie pas à la clé.\n\n⚠️ **UNE SEULE EXCEPTION, ET ELLE EST NOMMÉE** : `feedback_liens_protocole`, que le protocole des liens bibliques impose de lire avant toute passe (§ 9.0). Elle est citée comme une lecture OBLIGATOIRE, non comme une norme concurrente, et sa doctrine vit aux §§ 9 et 9.0. ⛔ Toute clé qu’on voudrait traiter de même se nomme ici, avec le § qui la commande — faute de quoi elle ne fait pas autorité.',
  },
  {
    nom: '§ 48.4 — les contrôles de la grille, du registre et de la manchette',
    avant: '- la grille des titres ne porte ni déclaration de rang irrecevable, ni inversion, ni rang plat (§ 35.28) — `scripts/fillion/controle-grille-titres.mts` ;\n- les fratries hétérogènes et les sauts de rang sont RELEVÉS et tranchés livre par livre, jamais corrigés en masse ;',
    apres: '- la grille des titres ne porte ni déclaration de rang irrecevable, ni conflit de préséance, ni relation non descendante (§ 35.28) — `scripts/fillion/controle-grille-titres.mts` ;\n- les fratries hétérogènes et les sauts de rang sont RELEVÉS et tranchés livre par livre, jamais corrigés en masse ;\n- aucun état de manchette n’est contredit par la donnée, et la clôture d’un livre exige zéro bloc éligible non relu (§ 35.29) ;\n- le registre des styles ne diverge pas de son exemplaire SQL sur les colonnes que le verrou lit (§ 35.30) — `scripts/fillion/controle-registre-styles.mts` ;',
  },
]

const ANCRE = '\n\n\n## 36. Le modèle d’onglets\n'
const NUMEROS = ['### 35.30.']

const SECTIONS = [
  '### 35.30. Le registre des styles vit en DEUX exemplaires',
  '',
  '⛔ **LE VOCABULAIRE DES STYLES SÉMANTIQUES EST ÉCRIT DEUX FOIS, ET LES DEUX EXEMPLAIRES NE SE VALENT PAS.**',
  '',
  '- `work/fillion/semantic_display_hierarchy.json` est lu par le **RENDU**. Il porte la COMPOSITION — nature, rang par défaut, axe, rôle de l’intitulé, rangs de titre portés — et **il fait foi**.',
  '- `public.bible_styles_semantiques` est lu par le seul **VERROU de base**, le déclencheur `bible_style_semantique_connu`, qui refuse un style inconnu et une nature d’information sans rang. Il porte le VOCABULAIRE, et c’est tout ce qu’on lui demande.',
  '',
  '⛔ **LA TABLE N’EST JAMAIS UNE SECONDE SOURCE NORMATIVE.** On ne corrige pas le registre pour l’accorder à elle : c’est elle qui se rattrape. ⚠️ Le verrou ne lit que quatre colonnes — `code`, `alias_de`, `niveau`, `kind` —, et c’est là, et là seulement, que les deux exemplaires doivent dire la même chose : une divergence y fait composer au rendu ce que la base refuse, ou l’inverse.',
  '',
  '**Les autres colonnes sont des COPIES DÉCORATIVES.** `nature`, `axe`, `au_plan`, `role_intitule`, `niveau_intitule`, `bloc_de_corps`, `masque_par_navigation` recopient la composition et ne décident de RIEN. ⚠️ Une divergence y est une copie périmée : on la signale, on la corrige du côté de la TABLE, et elle ne change rien à ce que le lecteur voit.',
  '',
  '⚠️ **UNE LIGNE DE NOM HÉRITÉ NE PORTE QUE CE QUE L’ALIAS AJOUTE.** Son `kind` et sa `nature` y valent nul, le verrou allant les chercher sur le canonique ; ses booléens y valent faux sans rien vouloir dire. ⛔ Qui lirait la table SEULE s’y tromperait — 142 colonnes sont dans ce cas au 20 septembre 2026 —, et c’est une raison de plus de ne jamais l’ériger en norme.',
  '',
  '⛔ **`heading_levels` N’A PAS D’ÉQUIVALENT EN BASE, ET N’EN AURA PAS.** La table des rangs de titre portés (§ 35.27) donne SIX valeurs, une par rang d’information ; `niveau_intitule` en est la forme ancienne, à une seule valeur, et ne peut pas les porter. Le verrou, lui, ne compose aucun titre : il n’a rien à en faire. ⚠️ Ce n’est donc pas une lacune de la table, et le contrôle le DIT plutôt que de le compter.',
  '',
  '**Le contrôle est `scripts/fillion/controle-registre-styles.mts`** (`--detail`). ⛔ Il n’a aucune règle à lui : les valeurs attendues viennent de `resoudreStyleSemantique`, la fonction que la page emploie — une seconde écriture de la composition divergerait au premier ajustement, et c’est exactement ce qu’il existe pour relever. Il n’écrit rien. Il rougit sur la surface commune, signale les copies périmées, et compte la convention des lignes d’alias. Relevé du 20 septembre 2026 : 58 styles de part et d’autre, zéro écart sur la surface commune, zéro copie périmée.',
].join('\n')

function appliquer(source, nom) {
  let sortie = source
  for (const { nom: motif, avant, apres } of REMPLACEMENTS) {
    const n = sortie.split(avant).length - 1
    if (n !== 1) throw new Error(`[${nom}] « ${motif} » : ${n} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
  }
  const ancres = sortie.split(ANCRE).length - 1
  if (ancres !== 1) throw new Error(`[${nom}] ancre du § 36 : ${ancres} occurrence(s), 1 attendue.`)
  for (const n of NUMEROS) if (sortie.includes(n)) throw new Error(`[${nom}] le numéro ${n} est déjà pris.`)
  return sortie.split(ANCRE).join(`\n\n${SECTIONS}${ANCRE}`)
}

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

// ⛔ Les DEUX d'abord, l'écriture ensuite.
const localAvant = readFileSync(cheminCharte, 'utf8')
const localApres = appliquer(localAvant, 'fichier local')
const distantAvant = data.valeur
const distantApres = appliquer(distantAvant, 'Supabase')

console.log(JSON.stringify({
  remplacements: REMPLACEMENTS.length,
  sections_posees: NUMEROS,
  fichier_local: { avant: localAvant.length, apres: localApres.length, delta: localApres.length - localAvant.length },
  supabase: { avant: distantAvant.length, apres: distantApres.length, delta: distantApres.length - distantAvant.length, mis_a_jour: data.mis_a_jour },
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
  throw new Error('La charte a changé entre la lecture et l’écriture : rien n’a été écrit dans Supabase. Le fichier local, lui, est corrigé — relancer après avoir tiré le miroir.')
}

const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (erreurRelecture) throw erreurRelecture
for (const { nom, avant, apres } of REMPLACEMENTS) {
  const posees = relue.valeur.split(apres).length - 1
  if (posees !== 1) throw new Error(`Relecture : « ${nom} » posé ${posees} fois.`)
  // ⚠️ Plusieurs de ces passages AJOUTENT à un paragraphe qu'ils gardent : l'ancien
  // texte y survit comme tête du nouveau, et le compter pour un reste ferait crier
  // une relecture qui vient de réussir. On ne compte donc que ce qui subsiste HORS
  // du nouveau texte.
  const dedans = apres.split(avant).length - 1
  const restes = relue.valeur.split(avant).length - 1 - dedans * posees
  if (restes !== 0) throw new Error(`Relecture : « ${nom} » laisse ${restes} reste(s) de l’ancien texte.`)
}
for (const n of NUMEROS) {
  const posees = relue.valeur.split(n).length - 1
  if (posees !== 1) throw new Error(`Relecture : ${n} posé ${posees} fois.`)
  if (relue.valeur.indexOf(n) > relue.valeur.indexOf('## 36. Le modèle d’onglets')) {
    throw new Error(`Relecture : ${n} est posé APRÈS le § 36.`)
  }
}
console.log('§ 35.30 posé, sept passages corrigés, et la relecture le confirme.')
