// Charte — corrections issues de l'audit de la règle du 24/07/2026 :
//   1. §25.8 : deux « impasses » qui n'en sont pas hors du profil où on les a mesurées.
//   2. §25.5 : le test des guillemets mesure le BALISAGE, pas la FORME de l'œuvre.
//   3. §25.9 : journal requalifié en historique, contrôle de « vérifié » rendu juste.
//   node scripts/charte-maj-audit-regle.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde4.md', v, 'utf8');

const R = [];

// ── 1. §25.8 — borner les mesures à leur profil ─────────────────────────────
R.push([
`- **Plusieurs traductions** (meilleur score des trois) : **gain nul** — 588 segments liés avant, 586 après. Les trois sont françaises et modernes, trop proches.
- **Pondération par la rareté** (IDF depuis \`concordance_lexique\`) : **gain nul** en volume, et elle déplace l’échelle des scores, donc oblige à recalibrer les seuils.`,
`> **⚠ CES DEUX MESURES ONT ÉTÉ FAITES SUR JOB SEUL, ET NE VALENT PAS AILLEURS** (audit du 24 juillet 2026). Énoncées comme des lois, elles interdisaient ce qui marche. Les voici bornées à leur profil.

- **Plusieurs traductions** — gain nul *sur Job* (588 segments liés avant, 586 après). La conclusion d'alors (« les trois sont françaises et modernes, trop proches ») est **fausse** : Sacy date de 1667 et traduit la Vulgate, quand Segond et Crampon traduisent l'hébreu et le grec. Mesuré sur des œuvres à citations délimitées (\`scripts/diag-traductions-appariement.mjs\`) : **Sacy gagne 46 à 49 % des appariements et reste irremplaçable pour 52 à 65 liens par œuvre**, là où Segond ne l'est que pour 5 à 12. Ce qui compte n'est pas le nombre de traductions mais leur **famille textuelle** : une seconde traduction de la Vulgate vaut mieux que cinq faites sur les originaux.
- **Pondération par la rareté (IDF)** — gain nul *sur Job*, où l'appariement bute sur la paraphrase et non sur le vocabulaire. Mais c'est le cœur de \`liens-cite-de-dieu.mjs\`, la passe la plus productive du corpus : 528 liens sur *Contre Marcion*, 650 sur *Contre les hérésies*. **Elle est indispensable dès qu'il y a des citations délimitées** ; elle ne sert à rien quand il n'y en a pas. Le mot « gain nul » ne disait donc pas ce qu'il fallait entendre : il faut lire « aucun gain sur les commentaires suivis ».`]);

// ── 2. §25.5 — balisage ≠ forme ─────────────────────────────────────────────
R.push([
`À 0 % (Cyprien, Tertullien), les citations ne sont pas marquées : l'appariement n'a aucune prise, c'est un problème de source à régler avant.`,
`À 0 %, les citations ne sont pas marquées : l'appariement n'a aucune prise.

⚠️ **Mais ce test mesure le BALISAGE, non la FORME de l'œuvre — ne pas confondre les deux** (audit du 24 juillet 2026). Un taux nul de guillemets ne dit pas qu'il n'y a pas de commentaire suivi : il dit que l'édition ne délimite rien. L'*Hexaéméron* de Basile est à 0 % **et** commente Genèse 1 verset par verset ; conclure au « problème de source » l'aurait écarté d'une passe qui lui convenait. Les deux axes se croisent, et c'est le §25.10 qui les articule : le balisage décide de **l'outil**, la forme décide de **la méthode**. Une œuvre sans balisage et sans forme suivie (Cyprien, Tertullien) ne relève d'aucune passe automatique — celle-là, seule la lecture la couvrira.`]);

// ── 3. §25.9 — contrôle juste, journal historique ───────────────────────────
R.push([
`-- rien de « vérifié » au sortir d'une passe automatique
select count(*) from liens_bibliques where fiabilite = 'vérifié' and provenance = 'ia';`,
`-- rien de « vérifié » au sortir d'une passe automatique.
-- ⚠ Ce contrôle est devenu AVEUGLE depuis l'amendement du §25.0 : un lien
-- réellement lu s'écrit lui aussi \`provenance = 'ia'\`, faute d'une valeur qui
-- dise « lu ». Tant que \`provenance\` n'accepte pas 'lecture' (contrainte
-- \`chk_liens_provenance\`, DDL en attente), ce contrôle signale des liens légitimes.
select count(*) from liens_bibliques where fiabilite = 'vérifié' and provenance = 'ia';`]);

R.push([
`**À compléter à chaque œuvre**, avec le rendement réel et non l’intention.`,
`> **⚠ JOURNAL HISTORIQUE, NON UN ÉTAT.** Le 24 juillet 2026, \`liens_bibliques\` a été **entièrement vidée** (33 795 → 0) sur décision de l'auteur du site : plus aucun de ces liens n'existe. Le tableau ci-dessus garde tout son prix — il dit ce qu'une passe **rend** sur un profil donné — mais il ne dit plus rien de l'avancement. Ne jamais en déduire qu'une œuvre « a » des liens : compter en base.

**À compléter à chaque œuvre**, avec le rendement réel et non l’intention.`]);

let n = 0;
for (const [av, ap] of R) {
  if (v.includes(av)) { v = v.replace(av, ap); n++; }
  else console.log('⚠ ancre introuvable : ' + av.slice(0, 70).replace(/\n/g, ' '));
}
console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant}) · ${n}/${R.length} modifications`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour · sauvegarde : scripts/_charte_sauvegarde4.md');
process.exit(0);
