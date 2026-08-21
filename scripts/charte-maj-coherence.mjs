// Charte — mise en cohérence des règles sur les liens (audit du 24/07/2026).
//   1. §10 « Fiabilité » : vocabulaire périmé → renvoi au §24.3.
//   2. §25.2 : reformuler l'amendement des psaumes, en tension avec le §9.5.
//   3. §25.10 : supprimer le doublon avec le §9.6, garder l'outillage.
//   node scripts/charte-maj-coherence.mjs --dry
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', 'charte_ia').single();
if (error) throw error;
let v = data.valeur;
const avant = v.length;
writeFileSync('scripts/_charte_sauvegarde3.md', v, 'utf8');

const R = [];

// ── 1. §10 : le vocabulaire périmé ──────────────────────────────────────────
R.push([
`- \`vérifié\` — lien contrôlé manuellement par l'administration du site ; protégé, jamais réécrit par un import ultérieur. **L'IA ne doit jamais écrire cette valeur** — elle est réservée à la validation humaine via l'admin.
- \`probable\` — lien détecté automatiquement, non encore contrôlé ; valeur par défaut.
- \`à_vérifier\` — cas incertain, signalé pour relecture.
- \`Lien à constituer\` — le segment évoque manifestement une source (biblique ou autre) sans qu'elle ait pu être identifiée avec certitude. Apparaît dans l'onglet Vérifications de l'admin.

Ne jamais écrire \`null\`.`,
`> **⚠ SECTION PÉRIMÉE, RÉÉCRITE LE 24 JUILLET 2026.** Elle donnait quatre valeurs dont **deux n'existent plus** (\`à_vérifier\`, \`Lien à constituer\`) et **omettait \`douteux\`**. Une section qui énonce un vocabulaire mort égare plus qu'elle n'aide : celle-ci ne fait plus que renvoyer.

**Le vocabulaire de la fiabilité est fixé au §24.3, et nulle part ailleurs** — quatre valeurs, pour tout le corpus, en base comme à l'écrit :

| valeur | sens |
|---|---|
| \`à constituer\` | une source est manifestement visée, elle n'est pas résolue. Le lien n'a **aucune cible**, et son \`motif\` est obligatoire (§24.2). |
| \`douteux\` | le rapprochement est proposé, mais on en doute. Se déclare plutôt que de taire le lien (§9.4). |
| \`probable\` | piste solide — appariement automatique, ou référence donnée par l'édition — **que personne n'a lue**. Porte alors \`arbitrage_requis = true\` (§25.1). |
| \`vérifié\` | le passage a été **lu**, et le verset visé confronté dans nos éditions. Interdit à toute passe mécanique (§25.0). |

Ne jamais écrire \`null\`. La fiabilité se porte **au lien**, jamais au segment : \`segments.fiabilite\` est vidée depuis le 20 juillet 2026.`]);

// ── 2. §25.2 : reformuler l'amendement des psaumes ──────────────────────────
R.push([
`**Mais cette conversion ne vaut que pour les éditions MODERNES.** Les éditions anciennes citent déjà à la grecque, comme notre ossature : les convertir décale chaque psaume d'un cran, en silence, et dans l'autre sens. Constaté sur l'Hexaéméron (éd. Auger), où « Ps. 106, 26 » désigne bien \`PSA.106.26\`. **Avant toute passe sur une œuvre, éprouver un psaume connu** : prendre une citation reconnaissable, lire le verset au créneau direct, et ne convertir que s'il dit autre chose. Un test, deux minutes, contre un faux invisible sur toute l'œuvre.`,
`**Et la conversion elle-même n'identifie rien.** Les éditions anciennes citent déjà à la grecque : les convertir décale chaque psaume d'un cran, en silence et dans l'autre sens — constaté sur l'Hexaéméron (éd. Auger), où « Ps. 106, 26 » désigne bien \`PSA.106.26\`. Mais la leçon n'est pas qu'il faudrait deviner le système de l'édition : **c'est que le numéro imprimé ne vaut jamais identification** (§9.5). On lit le passage, on reconnaît le verset à ce qu'il dit, et l'on écrit le créneau canonique. La conversion héb→grec ne sert qu'à **orienter la recherche** vers le bon voisinage, jamais à conclure.`]);

// ── 3. §25.10 : supprimer le doublon avec le §9.6 ───────────────────────────
R.push([
`D'où la règle : **l'unité de travail est le segment, non la citation.** Chaque segment reçoit un verdict, « rien ici » compris, pour que la couverture se compte au lieu de s'estimer. Extraire l'œuvre par divisions dans un dossier de travail (\`scripts/hexameron-extraire.mjs\` en donne le modèle : français de la base, liens déjà posés en regard, langue d'origine en dessous), lire, relever à la main dans une table \`segment_numero → [canon_id, type, motif]\`, puis **afficher le verset visé en regard du relevé avant d'écrire** — ce contrôle-là a rattrapé une erreur de l'éditeur lui-même (« Ps. 64, 4 » pour Ps 74, 4).`,
`**La règle qui en découle est déjà écrite : voir le §9.6.** Partir du segment et non d'une liste de références à caser ; marquer \`liens_revus_le\` sur tout segment examiné, **même s'il n'en sort aucun lien** ; passer ensuite la « passe d'oubli » sur les segments restés sans lien mais portant des marqueurs de citation. Rien à ajouter à ces trois prescriptions — seulement à les appliquer, ce qui n'avait pas été fait.

Ce que la présente section ajoute est **l'outillage** :

- extraire l'œuvre par divisions dans un dossier de travail — \`scripts/hexameron-extraire.mjs\` en donne le modèle : le français de la base (c'est lui qu'on lie), les liens déjà posés en regard, la langue d'origine en dessous ;
- relever à la main dans une table \`segment_numero → [canon_id, type, motif]\` — modèle : \`scripts/hexameron-liens-lus.mjs\` ;
- **afficher le verset visé en regard du relevé avant d'écrire.** Ce contrôle-là a rattrapé une erreur de l'éditeur lui-même — « Ps. 64, 4 » là où le texte cite Ps 74, 4.`]);

let n = 0;
for (const [av, ap] of R) {
  if (v.includes(av)) { v = v.replace(av, ap); n++; }
  else console.log('⚠ ancre introuvable : ' + av.slice(0, 70).replace(/\n/g, ' '));
}
console.log(`charte : ${avant} → ${v.length} caractères (${v.length - avant >= 0 ? '+' : ''}${v.length - avant}) · ${n}/${R.length} modifications`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde3.md');
process.exit(0);
