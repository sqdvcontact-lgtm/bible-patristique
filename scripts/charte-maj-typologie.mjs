// Mise à jour de la charte (parametres.charte_ia) : §25.10 typologie des œuvres,
// + deux amendements rendus nécessaires par le chantier de l'Hexaéméron.
// Sauvegarde l'état antérieur avant écriture (charte §23.10).
//   node scripts/charte-maj-typologie.mjs --dry
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
writeFileSync('scripts/_charte_sauvegarde.md', v, 'utf8');

// ── Amendement 1 : §25.0, règle 1 — le mot « vérifié » ──────────────────────
const A1_AVANT = `**1. La machine propose, l'éditeur dispose.** Aucune passe n'écrit jamais \`fiabilite = 'vérifié'\` : ce mot est réservé au jugement humain.`;
const A1_APRES = `**1. La machine propose, l'éditeur dispose.** Aucune PASSE AUTOMATIQUE n'écrit jamais \`fiabilite = 'vérifié'\` : un score, si haut soit-il, ne juge pas.

*Amendement du 24 juillet 2026.* « Vérifié » cesse d'être réservé au seul jugement de l'administrateur : il couvre désormais tout lien **effectivement lu et confronté au verset dans nos traductions**, que le lecteur soit l'auteur du site ou l'assistant. Ce qui fait la valeur du mot n'est pas la main qui l'écrit, c'est la lecture qu'il atteste. Il reste donc interdit à toute passe mécanique, et il engage : on n'écrit « vérifié » que sur ce qu'on a réellement lu, et « douteux » dès qu'on doute — la prudence de principe qui étiquette tout en « probable » ne renseigne personne.`;

// ── Amendement 2 : §25.2, piège 1 — l'exception des éditions anciennes ──────
const A2_ANCRE = `**Convertir par \`versets_canon.ch_heb/v_heb\`, et refuser plutôt que se rabattre sur le créneau direct quand la conversion échoue.**`;
const A2_AJOUT = A2_ANCRE + `

**Mais cette conversion ne vaut que pour les éditions MODERNES.** Les éditions anciennes citent déjà à la grecque, comme notre ossature : les convertir décale chaque psaume d'un cran, en silence, et dans l'autre sens. Constaté sur l'Hexaéméron (éd. Auger), où « Ps. 106, 26 » désigne bien \`PSA.106.26\`. **Avant toute passe sur une œuvre, éprouver un psaume connu** : prendre une citation reconnaissable, lire le verset au créneau direct, et ne convertir que s'il dit autre chose. Un test, deux minutes, contre un faux invisible sur toute l'œuvre.`;

// ── §25.10 : la typologie ───────────────────────────────────────────────────
const NOUVELLE = `

### 25.10 — Auditer l'œuvre avant de choisir la méthode

**La méthode dépend de la forme de l'œuvre et de l'état de son édition — jamais de son auteur.** Appliquer la même passe à tout donne des résultats vides ou faux : la même mécanique a rendu 650 liens sur Irénée et 93 sur l'Hexaéméron, qui en appelait cinq fois plus. L'audit précède le choix, et le choix se justifie.

#### Ce que l'audit mesure

1. **Le balisage de l'édition.** \`node scripts/diag-conventions.mjs <id…>\` : part des segments portant des guillemets, part portant une référence en parenthèse, présence de notes.
2. **Le rapport de l'œuvre à l'Écriture.** Commente-t-elle un livre pas à pas, ou cite-t-elle toute la Bible au fil d'un raisonnement ? La question se tranche au sommaire, pas au comptage.
3. **L'intégrité de l'import — contrôle nouveau et obligatoire.** Comparer le texte en base à sa source en ligne. L'Hexaéméron ne portait que 7 références quand l'édition en donne 88 : l'import les avait perdues, et aucune passe ne pouvait le savoir. Une œuvre pauvre en références n'est pas forcément une œuvre sans références.
4. **La langue d'origine.** Si l'édition donne le grec ou le latin en regard, la citation y est souvent littérale là où la traduction française la dilue. À récupérer avec le texte.

#### Les quatre profils, et l'ordre des passes

| Profil | Reconnaissance | Traitement |
|---|---|---|
| **A — œuvre référencée** | l'édition donne ses références (Somme, Cyrille) | §25.1 domine et suffit presque. Le travail réel est ailleurs : abréviations (§25.3) et pièges de numérotation (§25.2). |
| **B — citations délimitées** | guillemets fréquents, ≥ 15 % des segments (Tertullien, Irénée, Cité de Dieu) | appariement des spans par rappel pondéré. Puis **lecture** : les guillemets ne portent que les citations, jamais les reprises ni les échos. |
| **C — commentaire suivi** | l'œuvre progresse dans un livre biblique (Hexaéméron, Job, Discours sur les Psaumes) | §25.5 (alignement de la suite) **et lecture obligatoire**. Les liens de type 3 y dominent, et **aucune mesure lexicale ne peut les voir** : un commentaire ne ressemble pas au verset qu'il explique. |
| **D — œuvre allusive nue** | ni guillemets ni références (Homélies d'Antioche, Cyprien, Climaque) | **la lecture est la seule voie.** Les outils ne servent qu'à proposer des candidats ; ils ne concluent jamais. |

#### Le contrôle de rendement

L'audit énonce un **ordre de grandeur attendu** avant de lancer quoi que ce soit, et l'on compare à l'arrivée. Un commentaire suivi devrait porter des liens de l'ordre du nombre de ses segments ; une œuvre allusive, beaucoup moins. **Un résultat très en dessous de l'attendu est une alarme, pas un résultat** : 93 liens pour 1 798 segments d'un commentaire de Genèse 1 aurait dû arrêter le chantier sur-le-champ.

#### Ce que les passes ne font jamais

Elles **amorcent**. Elles ne concluent pas. Trois raisons constatées :

- elles ne voient que ce que l'éditeur a marqué — Gn 1, 1 est cité ou commenté quinze fois dans la seule première homélie, sans une seule parenthèse ;
- elles placent le lien sur le segment qui **précède** la citation, la référence de l'édition venant en fin de phrase ;
- leurs seuils écartent du vrai **sans laisser de trace**.

D'où la règle : **l'unité de travail est le segment, non la citation.** Chaque segment reçoit un verdict, « rien ici » compris, pour que la couverture se compte au lieu de s'estimer. Extraire l'œuvre par divisions dans un dossier de travail (\`scripts/hexameron-extraire.mjs\` en donne le modèle : français de la base, liens déjà posés en regard, langue d'origine en dessous), lire, relever à la main dans une table \`segment_numero → [canon_id, type, motif]\`, puis **afficher le verset visé en regard du relevé avant d'écrire** — ce contrôle-là a rattrapé une erreur de l'éditeur lui-même (« Ps. 64, 4 » pour Ps 74, 4).
`;

let n = 0;
if (v.includes(A1_AVANT)) { v = v.replace(A1_AVANT, A1_APRES); n++; } else console.log('⚠ amendement 1 : ancre introuvable');
if (v.includes(A2_ANCRE)) { v = v.replace(A2_ANCRE, A2_AJOUT); n++; } else console.log('⚠ amendement 2 : ancre introuvable');
if (!v.includes('### 25.10')) { v = v.trimEnd() + '\n' + NOUVELLE; n++; } else console.log('⚠ §25.10 déjà présent');

console.log(`charte : ${avant} → ${v.length} caractères (+${v.length - avant}) · ${n} modifications`);
console.log('sauvegarde de l’état antérieur : scripts/_charte_sauvegarde.md');
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }
const { error: e2 } = await sb.from('parametres').update({ valeur: v, mis_a_jour: new Date().toISOString() }).eq('cle', 'charte_ia');
if (e2) throw e2;
console.log('✓ charte mise à jour');
process.exit(0);
