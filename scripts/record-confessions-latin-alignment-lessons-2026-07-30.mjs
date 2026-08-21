import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const BACKUP_PATH = 'audit/charte_memory_before_confessions_latin_lessons_2026-07-30.json'
const CHARTER_MARKER = '### 12.2 — Alignement d’un texte original avec une traduction déjà segmentée'
const MEMORY_MARKER = '### Campagne latine achevée : Augustin, *Les Confessions*'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const sha = (value) => createHash('sha256').update(value).digest('hex')

const charterBlock = `${CHARTER_MARKER}

L’association d’un texte original à une traduction constitue une passe éditoriale autonome. Elle vient après la stabilisation du texte traduit, de ses paragraphes et de ses rangs. Elle ne doit pas être confondue avec la constitution des liens bibliques.

1. **Identifier le témoin original.** Consigner l’édition, l’éditeur scientifique, la collection, la date, l’URL de chaque unité extraite et une empreinte du fichier obtenu. Ne jamais mêler silencieusement plusieurs éditions du texte original.
2. **Ne jamais présumer l’équivalence des paragraphes.** Un site qui présente un chapitre par page ou par bloc HTML ne fournit pas nécessairement les paragraphes de la traduction. Compter séparément livres, chapitres et paragraphes des deux témoins. L’égalité du nombre de paragraphes dans une division n’établit pas davantage l’identité de leurs limites.
3. **Partir des ancres communes les plus sûres.** Aligner d’abord les livres et les chapitres réellement communs. Une traduction libre peut déplacer, inverser, condenser, développer ou omettre une proposition. La ponctuation, la longueur et les cognats ne produisent que des candidats ; ils ne décident jamais seuls d’une frontière.
4. **Contrôler sémantiquement toutes les limites.** Comparer au minimum le début et la fin de chaque paragraphe traduit avec le passage original proposé. Les hymnes, vers, citations, dialogues, énumérations et paragraphes très disproportionnés demandent une vérification intégrale. Une frontière automatique douteuse est remplacée par un marqueur textuel original explicite et documenté.
5. **Admettre les divergences de chapitres.** La limite d’un chapitre de la traduction peut couper autrement celle de l’édition originale. Dans ce cas, déplacer le fragment original vers le paragraphe français auquel il correspond, sans changer l’ordre des mots ni perdre de texte. La numérotation affichée demeure celle de la traduction ; la provenance du fragment demeure celle du témoin original.
6. **Conserver le texte original à l’identique.** Ne pas moderniser, traduire, corriger ou normaliser silencieusement le témoin original pendant l’alignement. Toute correction philologique éventuelle relève d’une passe distincte et documentée.
7. **Règle de stockage.** Pour un paragraphe traduit réparti sur plusieurs segments, placer la totalité du champ \`texte_original\` sur le seul segment de rang 1. Tous les autres segments du paragraphe gardent \`texte_original = null\`. L’apparat critique reste sans texte original, sauf décision éditoriale expresse concernant un apparat bilingue.
8. **Invariants de clôture.** Le texte original doit se recomposer exactement, dans l’ordre, au niveau de chaque division et de l’œuvre entière. Vérifier le nombre de caractères, les empreintes, l’unicité des premiers segments, l’absence de paragraphes privés d’original et l’absence de duplication sur les rangs suivants.
9. **Contrôles obligatoires.** Relire les cas statistiquement extrêmes, effectuer des sondages répartis dans toute l’œuvre, puis relire les données depuis la base. Un score de longueur satisfaisant n’est jamais une preuve sémantique. Une erreur de sondage impose l’examen des paragraphes voisins et de tous ceux produits par la même règle.
10. **Outils automatiques.** Une traduction automatique, un modèle local ou une édition intermédiaire peuvent aider à repérer des candidats. Leur résultat n’est jamais une autorité éditoriale. Une édition intermédiaire ne peut servir de pont que si son propre découpage et son propre rapport au texte original ont été contrôlés.

`

const memoryBlock = `${MEMORY_MARKER}

- Œuvre : \`A0010O0001\`, traduction française de Robert Arnauld d’Andilly, seconde édition de 1649.
- Texte original : Augustin, *Confessiones*, édition Pius Knöll, CSEL 33, 1896, extraite depuis \`https://bkv.unifr.ch/en/works/cpl-251/versions/aug-conf-csel\`.
- Structure originale extraite : 13 livres, 278 chapitres, 516 582 caractères. Le site BKV donne un bloc HTML principal par chapitre et non un paragraphe correspondant à chaque paragraphe d’Andilly.
- La traduction Moreau disponible sur BKV a servi seulement de témoin intermédiaire : 884 paragraphes contre 932 chez d’Andilly. Même dans les 201 chapitres où les comptes coïncidaient, l’identité des frontières ne pouvait pas être présumée.
- Résultat : 932 paragraphes français associés ; 515 928 caractères stockés, auxquels s’ajoutent 654 espaces de frontières internes pour recomposer exactement les 516 582 caractères de la source.
- Stockage : latin sur le premier segment de chacun des 932 paragraphes seulement ; 9 279 segments corporels suivants à \`null\` ; 137 segments d’apparat à \`null\`.
- Trois divergences de limites de chapitres ont exigé une redistribution sans perte au livre X : XIII–XIV, XVII–XVIII et XXXVII–XXXVIII.
- Les vers du cantique d’Ambroise au livre IX, chapitre XII, ont exigé une division manuelle vers par vers. Plusieurs autres frontières coupaient une phrase latine ou suivaient une recomposition libre de d’Andilly.
- Les essais de traduction automatique et de relecture par modèles locaux n’ont pas été assez fiables pour arbitrer les frontières. Ils ne doivent servir qu’à proposer des candidats ; la décision finale repose sur la confrontation sémantique.
- Contrôle final : relecture des treize livres, examen de tous les débuts de paragraphes, contrôle des rapports extrêmes, sondage stratifié, recomposition intégrale et relecture depuis la base. La seconde simulation après écriture a trouvé zéro différence.
- Empreinte des 932 associations latines : \`D98496D08EE2764149DDC1CEC9A413A3A9063B589D14330B5CA0A510AF0900BE\`.
- Scripts de référence : \`scripts/confessions-extract-latin-csel-2026-07-29.py\`, \`scripts/confessions-align-latin-csel-2026-07-29.py\` et \`scripts/confessions-apply-latin-csel-2026-07-30.mjs\`.
- Rapport final : \`tmp/confessions-latin-csel-2026-07-29/confessions-latin-post-apply-audit.json\`.

`

async function guardedUpdate(key, updatedAt, value) {
  const { data, error } = await db.from('parametres')
    .update({ valeur: value, mis_a_jour: new Date().toISOString() })
    .eq('cle', key)
    .eq('mis_a_jour', updatedAt)
    .select('cle,valeur,mis_a_jour')
  if (error) throw new Error(`${key} : ${error.message}`)
  if (data.length !== 1) throw new Error(`${key} : précondition concurrente non satisfaite`)
}

const { data, error } = await db.from('parametres')
  .select('cle,valeur,mis_a_jour')
  .in('cle', ['charte_ia', 'feedback_liens_protocole'])
if (error) throw error
const map = new Map(data.map((row) => [row.cle, row]))
const charter = map.get('charte_ia')
const memory = map.get('feedback_liens_protocole')
if (!charter || !memory) throw new Error('Charte ou mémoire absente')
if (charter.valeur.includes(CHARTER_MARKER) || memory.valeur.includes(MEMORY_MARKER)) throw new Error('Le retour d’expérience est déjà enregistré')

const charterNeedle = '**Ordre recommandé des passes :**'
const memoryNeedle = '## 2. Audit préalable de chaque œuvre'
if (!charter.valeur.includes(charterNeedle) || !memory.valeur.includes(memoryNeedle)) throw new Error('Point d’insertion introuvable')
const charterAfter = charter.valeur
  .replace(/Mise à jour : 29 juillet 2026/, 'Mise à jour : 30 juillet 2026')
  .replace(charterNeedle, `${charterBlock}${charterNeedle}`)
const memoryAfter = memory.valeur.replace(memoryNeedle, `${memoryBlock}${memoryNeedle}`)

const backup = {
  generated_at: new Date().toISOString(),
  reason: 'Retour d’expérience sur l’alignement du latin CSEL avec les paragraphes des Confessions traduites par d’Andilly.',
  before: {
    charte_ia: { mis_a_jour: charter.mis_a_jour, sha256: sha(charter.valeur), valeur: charter.valeur },
    feedback_liens_protocole: { mis_a_jour: memory.mis_a_jour, sha256: sha(memory.valeur), valeur: memory.valeur },
  },
  after_sha256: { charte_ia: sha(charterAfter), feedback_liens_protocole: sha(memoryAfter) },
}
mkdirSync('audit', { recursive: true })
const backupBody = `${JSON.stringify(backup, null, 2)}\n`
writeFileSync(BACKUP_PATH, backupBody, 'utf8')

if (!APPLY) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    backup: BACKUP_PATH,
    before_sha256: { charte_ia: sha(charter.valeur), feedback_liens_protocole: sha(memory.valeur) },
    after_sha256: backup.after_sha256,
    charter_added_chars: charterAfter.length - charter.valeur.length,
    memory_added_chars: memoryAfter.length - memory.valeur.length,
  }, null, 2))
  process.exit(0)
}

const journalSubject = 'Charte et mémoire - alignement des textes originaux parallèles'
const { data: recent, error: recentError } = await db.from('journal_ia').select('id,sujet').order('id', { ascending: false }).limit(30)
if (recentError) throw recentError
let journal = recent.find((row) => row.sujet === journalSubject)
if (!journal) {
  const { data: inserted, error: journalError } = await db.from('journal_ia').insert({
    sujet: journalSubject,
    probleme: 'Sauvegarde préalable à l’inscription dans la charte et la mémoire du retour d’expérience sur l’alignement latin-français des Confessions.',
    reponse: JSON.stringify({ backup_path: BACKUP_PATH, backup_sha256: sha(backupBody), before_sha256: { charte_ia: sha(charter.valeur), feedback_liens_protocole: sha(memory.valeur) }, after_sha256: backup.after_sha256 }),
    statut: 'sauvegarde',
  }).select('id').single()
  if (journalError) throw journalError
  journal = inserted
}

await guardedUpdate('charte_ia', charter.mis_a_jour, charterAfter)
await guardedUpdate('feedback_liens_protocole', memory.mis_a_jour, memoryAfter)

const { data: verified, error: verifyError } = await db.from('parametres')
  .select('cle,valeur,mis_a_jour')
  .in('cle', ['charte_ia', 'feedback_liens_protocole'])
if (verifyError) throw verifyError
const verifiedMap = new Map(verified.map((row) => [row.cle, row]))
const checks = {
  charter_marker_once: verifiedMap.get('charte_ia').valeur.split(CHARTER_MARKER).length - 1 === 1,
  memory_marker_once: verifiedMap.get('feedback_liens_protocole').valeur.split(MEMORY_MARKER).length - 1 === 1,
  charter_hash: sha(verifiedMap.get('charte_ia').valeur) === sha(charterAfter),
  memory_hash: sha(verifiedMap.get('feedback_liens_protocole').valeur) === sha(memoryAfter),
  first_segment_rule: verifiedMap.get('charte_ia').valeur.includes('segment de rang 1'),
  exact_recomposition_rule: verifiedMap.get('charte_ia').valeur.includes('se recomposer exactement'),
  confessions_counts_recorded: verifiedMap.get('feedback_liens_protocole').valeur.includes('516 582 caractères'),
}
if (Object.values(checks).some((value) => !value)) throw new Error(`Vérification finale échouée : ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, backup: BACKUP_PATH, backup_sha256: sha(backupBody), checks }, null, 2))
