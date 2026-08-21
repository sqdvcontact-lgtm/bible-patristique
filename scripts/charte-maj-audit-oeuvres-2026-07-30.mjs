// Enseignements de l'audit transversal des œuvres du 30 juillet 2026.
// Usage : node scripts/charte-maj-audit-oeuvres-2026-07-30.mjs --dry
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const MARKER = '### 20.05.1 — Faux positifs, contrôles aléatoires et clôture d’audit';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: row, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single();
if (error) throw error;
if (row.valeur.includes(MARKER)) {
  console.log('Charte déjà amendée : aucune écriture.');
  await db.removeAllChannels();
  process.exitCode = 0;
}
const alreadyApplied = row.valeur.includes(MARKER);
const before = row.valeur;
let value = before;
const insertAfter = (anchor, addition, label) => {
  const index = value.indexOf(anchor);
  if (index < 0) throw new Error(`Ancre introuvable (${label}).`);
  value = `${value.slice(0, index + anchor.length)}${addition}${value.slice(index + anchor.length)}`;
};

if (!alreadyApplied) insertAfter(
  '**Clé de regroupement à l’affichage.** Un paragraphe n’est jamais identifié par `paragraphe` seul : les mêmes numéros recommencent dans chaque chapitre, livre ou partie. La clé doit inclure `id_oeuvre`, tous les `ref_niv` actifs qui délimitent l’unité, puis `paragraphe`. Pour les *Annotations sur Job*, la clé minimale est donc `(id_oeuvre, ref_niv1, paragraphe)`. Grouper sur `paragraphe` seul fusionnerait des unités étrangères. L’ordre général reste celui de `segment_numero` ; `rang` ne sert qu’à ordonner les segments appartenant à la même clé composite. Deux occurrences non contiguës portant accidentellement le même numéro ne doivent jamais être fusionnées sans contrôle de la source.',
  `

**Précisions de contrôle sur la clé composite (audit transversal du 30 juillet 2026).**

- « Tous les \`ref_niv\` actifs » signifie : tous ceux qui **délimitent réellement** le paragraphe, non tous les champs simplement renseignés. Un libellé visible \`§ n\` qui répète la valeur de \`paragraphe\` reste utile à la navigation, mais **ne crée pas un groupe supplémentaire** pour contrôler les rangs. Dans ce cas, l'inclure dans la clé ferait passer à tort chaque segment pour un paragraphe isolé de rang 1.
- Les espaces textuels sont distincts. La clé technique commence par un espace de nature : **corps** (\`texte\`, \`citation\`, \`dialogue\` et natures assimilées), **introduction**, ou **apparat_critique**. Une introduction et le premier paragraphe du corps peuvent donc porter tous deux \`paragraphe=1, rang=1\` sous la même homélie sans collision. Une \`citation\` enchâssée reste en revanche dans le corps : elle ne reçoit pas un espace de numérotation autonome.
- Un audit de rang doit d'abord construire cette clé correcte, puis vérifier que les rangs de chaque groupe valent exactement \`1…k\`, sans trou ni doublon. Un grand nombre d'alertes produites par une seule règle de groupement erronée constitue **un défaut de l'auditeur**, non des milliers d'erreurs éditoriales.
- Des \`paragraphe\` et \`rang\` tous nuls dans une œuvre ancienne ne se remplissent jamais mécaniquement d'après \`segment_numero\`, un \`ref_niv\` ou une valeur constante. On reprend l'édition source et ses alinéas ; à défaut, on consigne la dette structurelle sans fabriquer une conformité fictive.`,
  'clé composite',
);

if (!alreadyApplied) insertAfter(
  'Chaque passe importante doit produire : un CSV corrigé, un audit des modifications (ligne modifiée, champ, ancienne valeur, nouvelle valeur, raison), et un fichier d\'alertes pour les cas non corrigés volontairement (versets vides, découpage douteux, guillemets déséquilibrés sur plusieurs segments, référence impossible à résoudre, OCR probable mais non certain, variante d\'édition ou de versification possible).',
  `

### 12.0 — Écriture corrective réversible et suppression prudente

Avant toute écriture en lot, produire une **simulation complète** et une sauvegarde machine-lisible contenant au minimum l'identifiant stable, le texte ou la ligne avant, la valeur proposée après, la raison et, lorsqu'elle décide de la correction, la source consultée. La simulation doit vérifier les nombres attendus et s'arrêter si l'état réel diffère.

À l'écriture, utiliser une précondition sur l'ancienne valeur ou sur l'horodatage lu : une modification concurrente ne doit jamais être écrasée silencieusement. Relire ensuite les lignes depuis la base, relancer l'audit intégral et contrôler un échantillon réparti dans tout le lot. La sauvegarde est conservée avec le rapport.

Une fiche d'œuvre vide et non publiée n'est pas en soi une corruption textuelle. Si sa suppression est demandée, vérifier explicitement : identifiant exact, \`date_mise_en_ligne IS NULL\`, zéro segment et absence de dépendances utiles ; sauvegarder la fiche ; supprimer dans l'ordre prévu par l'administration (segments éventuels, puis œuvre) ; confirmer enfin que l'identifiant n'existe plus. Ne jamais étendre cette autorisation à une autre fiche par simple ressemblance.`,
  'protocole d’écriture',
);

if (!alreadyApplied) insertAfter(
  'Signaler spontanément le coût quand la profondeur demandée relit un gros corpus.',
  `

${MARKER}

Les détecteurs automatiques produisent des **candidats**, jamais des corrections. Toute famille doit être relue sur plusieurs exemples avant une transformation en lot.

- **Apostrophe suivie d'une espace.** Distinguer l'élision réellement espacée (\`qu’ il\` → \`qu’il\`) de l'apostrophe OCR parasite après un mot entier (\`ville’ des\` → \`ville des\`). Supprimer toujours l'espace donnerait \`ville’des\`, nouvelle corruption créée par l'audit.
- **Traits d'union espacés.** Vérifier si le composé existe : \`Jésus- Christ\` → \`Jésus-Christ\`, mais \`aimer- Dieu\` → \`aimer Dieu\`. Une même regex ne décide pas des deux cas.
- **Mots immédiatement répétés.** Lire la phrase et, si nécessaire, la source. \`voit voit\`, \`faire faire\`, \`vouloir vouloir\`, \`ce qui est est\` et \`Punis-toi toi-même\` peuvent être corrects ; \`est est\` ou \`cela cela appartient\` peuvent être des doublons OCR. Une répétition légitime ne doit pas être « corrigée » pour satisfaire un compteur.
- **Encodage.** Ne jamais classer tout caractère \`Â\` comme mojibake : \`Âme\` et \`Âge\` sont français. Le détecteur doit exiger une séquence d'octets mal décodée ou un contexte impossible, puis montrer le passage.
- **Liens prétendument dupliqués.** Deux liens ne sont identiques que si cible, type, fiabilité, motif, provenance et arbitrage coïncident. Deux liens sans cible sur le même segment peuvent représenter deux logia distincts ; les agréger sur \`segment_id + type + cible nulle\` produit un faux doublon.
- **Source contre OCR.** Une tournure étrange déjà présente dans le témoin consulté n'est pas automatiquement une coquille de la base. Ne corriger que si la leçon est établie par la source, la grammaire sans ambiguïté ou un parallélisme décisif ; sinon consigner le cas.

**Contrôles aléatoires réguliers.** Ne pas attendre la clôture : après chaque lot significatif, tirer quelques lignes dans le début, le milieu et la fin, plus des exemples de chaque règle appliquée. Le hasard est complété par un échantillon stratifié des cas extrêmes. Une erreur trouvée impose d'examiner ses voisins et **tous les éléments produits par la même règle**, puis de relancer le tirage. Le contrôle final relit les valeurs depuis la base ; vérifier seulement le fichier préparatoire ne prouve pas l'écriture.

**Compte rendu honnête.** Séparer : anomalies certaines corrigées ; candidats laissés ouverts ; faux positifs écartés ; dette structurelle exigeant le fac-similé ; métadonnées absentes ; état de la passe de liens. Un compteur de segments \`liens_revus_le\` mesure un processus de révision, non la qualité du texte.`,
  'audit et faux positifs',
);

mkdirSync('audit', { recursive: true });
const backupPath = 'audit/charte_memory_before_global_works_lessons_2026-07-30.json';
if (!alreadyApplied) writeFileSync(backupPath, `${JSON.stringify({ saved_at: new Date().toISOString(), cle: 'charte_ia', mis_a_jour: row.mis_a_jour, valeur: before }, null, 2)}\n`, 'utf8');
if (!alreadyApplied) console.log(JSON.stringify({ mode: DRY ? 'dry_run' : 'apply', before: before.length, after: value.length, added: value.length - before.length, backupPath }, null, 2));

if (!DRY && !alreadyApplied) {
  const nextTimestamp = new Date().toISOString();
  const { data: updated, error: updateError } = await db.from('parametres')
    .update({ valeur: value, mis_a_jour: nextTimestamp })
    .eq('cle', 'charte_ia').eq('mis_a_jour', row.mis_a_jour)
    .select('valeur,mis_a_jour');
  if (updateError) throw updateError;
  if (updated.length !== 1) throw new Error('La charte a changé depuis sa lecture : écriture annulée.');
  if (updated[0].valeur !== value || !updated[0].valeur.includes(MARKER)) throw new Error('Relecture immédiate non conforme.');
  console.log(`Charte mise à jour et relue (${updated[0].valeur.length} caractères).`);
}
await db.removeAllChannels();
