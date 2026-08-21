// Mise à jour de la charte : §9.5 et les deux passages devenus faux après la bascule.
// Sauvegarde de l'état antérieur avant écriture ; refus si une ancre est introuvable.
//   node scripts/charte-maj-liens.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const REMPLACEMENTS = [
  // ── §9.5 : la désignation des versets a changé de nature ───────────────────────────────
  [`- Les valeurs sont des id_verset séparés par « ; » (ex. « B016393; B016426 »).
- **Toujours vérifier l'id dans la table \`versets\` — ne jamais en inventer un.**
- **Ne pas dupliquer une même référence dans plusieurs colonnes d'un même segment.** Un verset relève d'un seul rapport à la fois : choisir le plus fort qui soit vrai.
- Ordre de priorité quand plusieurs qualifications sont défendables : lien_1 > lien_2 > lien_3 > lien_4.`,

`**Les liens ne sont plus des colonnes, mais la table \`liens_bibliques\`** (une ligne par lien ; les colonnes \`lien_1\` … \`lien_4\` et les identifiants \`BXXXXXX\` appartiennent au modèle supprimé le 20 juillet 2026). Le \`type\` — 1 à 4 — porte la catégorie de §9.1 à §9.4.

**Trois natures de cible, une seule par lien :**
- \`canon_id\` — un créneau de l'ossature (« SIR.16.28 ») : le cas normal, partagé par toutes les éditions ;
- \`verset_v2_id\` — un **surnuméraire**, verset qu'une seule édition porte et qui n'a donc pas de désignation commune. On vise la ligne de l'édition qui l'atteste. Un Père citant la Septante peut parfaitement viser un tel verset ;
- \`livre\` + \`chapitre\` — un **chapitre entier**, pour le commentaire d'ensemble exigé par §9.3.

**Toujours vérifier la cible en base — ne jamais l'inventer.** La clé étrangère refuse un créneau qui n'existe pas, mais elle ne dit rien de la justesse du rapprochement.

**Vérification sémantique systématique.** On se fonde sur **toutes les éditions** ; le référent (Crampon, \`est_referent\`) suffit seulement quand la correspondance est immédiatement claire. Un score de recouvrement lexical ne conclut rien à lui seul (cf. §9.1).

**\`fiabilite\` est propre à CHAQUE LIEN**, non plus au segment : un segment peut porter un lien sûr et un lien douteux. Valeurs : \`à constituer\`, \`douteux\`, \`probable\`, \`vérifié\`. Conformément à §9.4, l'incertitude se déclare ici plutôt que de taire le lien.

**\`motif\` doit être renseigné** : §9.4 exige de pouvoir *nommer* ce qui est commun aux deux textes, pas seulement de ressentir une parenté. Un lien sans motif énonçable n'est pas défendable.

- **Ne pas dupliquer une même référence pour un même segment.** Un verset relève d'un seul rapport à la fois : choisir le plus fort qui soit vrai. La base le refuse désormais, contrainte d'unicité à l'appui.
- Ordre de priorité quand plusieurs qualifications sont défendables : lien_1 > lien_2 > lien_3 > lien_4.`],

  // ── Couverture des deutérocanoniques : l'inverse est vrai depuis la reprise de Sacy ────
  [`Dans la table \`versets\`, seule la colonne \`TR0003\` (traduction de type Crampon) couvre actuellement les livres deutérocanoniques (Sagesse, Ecclésiastique, Machabées) ; \`TR0001\` et \`TR0002\` y sont vides. Pour vérifier une citation de ces livres, interroger \`TR0003\` en priorité, sinon la citation reste invérifiable et doit être marquée \`Lien à constituer\` plutôt que résolue à l'aveugle sur le seul numéro de chapitre/verset.`,

`**(Corrigé le 20 juillet 2026 — l'énoncé précédent est devenu faux.)** Sacy (\`TR0001\`) couvre désormais les deutérocanoniques : Ecclésiastique 1 653 v., Sagesse 442 v., Tobie 298 v., 1 Maccabées 929 v. Crampon (\`TR0003\`) les couvre également. Seule la Segond (\`TR0002\`) ne les reçoit pas — non par lacune, mais parce que la Bible protestante ne les compte pas parmi les livres canoniques : sa case vide est une information, pas un manque à combler.`],
]

const { data } = await sb.from('parametres').select('*').eq('cle', 'charte_ia').maybeSingle()
const colonne = Object.keys(data).find(k => typeof data[k] === 'string' && data[k].length > 10000)
let t = data[colonne]
writeFileSync(D + 'charte_avant_maj_liens.md', t)
console.log(`charte : ${t.length} caractères (colonne « ${colonne} »), sauvegardée`)

for (const [avant, apres] of REMPLACEMENTS) {
  const n = t.split(avant).length - 1
  if (n !== 1) { console.error(`✗ ancre trouvée ${n} fois, attendu 1 — rien n'est écrit :\n   « ${avant.slice(0, 70)}… »`); process.exit(1) }
  t = t.replace(avant, apres)
  console.log(`✓ remplacé : « ${avant.slice(0, 62)}… »`)
}

console.log(`\nnouvelle longueur : ${t.length} (${t.length > data[colonne].length ? '+' : ''}${t.length - data[colonne].length})`)
if (DRY) { console.log('[DRY] rien écrit'); process.exit(0) }
const { error } = await sb.from('parametres').update({ [colonne]: t }).eq('cle', 'charte_ia')
console.log(error ? '✗ ' + error.message : 'charte mise à jour')
