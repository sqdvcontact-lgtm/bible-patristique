import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const CHARTER_KEY = 'charte_ia'
const MEMORY_KEY = 'feedback_liens_protocole'
const CHARTER_MARKER = '### 12.3 — Contrôle final d’une édition patristique bilingue'
const MEMORY_MARKER = '### 2026-07-30 — Basile, *Homélies sur l’Hexaéméron* — A0017O0001'
const BACKUP = 'audit/hexameron-2026-07-30/charter-memory-before-lessons.json'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const sha = (value) => createHash('sha256').update(value, 'utf8').digest('hex')

const charterBlock = `

${CHARTER_MARKER}

Une édition bilingue déjà chargée doit être auditée sur quatre témoins distincts : le fac-similé, la transcription française intermédiaire, le texte original parallèle et l’état réel de la base. Aucun de ces témoins ne se substitue aux autres.

1. **Le fac-similé tranche l’OCR.** Un DOCX ou un HTML secondaire sert au repérage, jamais à décider seul. Corriger une lecture impossible confirmée par l’image (« four » pour « jour », « voient » pour « volent »), mais conserver une coquille réellement imprimée (« Que le terre… ») sauf politique d’émendation explicite.
2. **Des comptes de notes égaux ne prouvent pas leur intégrité.** Après avoir vérifié appels, définitions et unicité, comparer les fins de notes au fac-similé. Une note tronquée peut conserver son numéro et paraître valide. Contrôler aussi la ponctuation terminale, puis replacer chaque appel collé à son groupe et avant la ponctuation.
3. **Valider la langue de \`texte_original\`.** Pour une œuvre grecque, chaque valeur non nulle doit contenir des caractères grecs. Une copie française enrichie d’une référence biblique peut être chargée par erreur dans cette colonne et tromper le compteur. Rechercher aussi les résidus HTML (accolades, balises, entités) et les espaces perdues aux frontières.
4. **Recomposer le témoin original.** Dans une source bilingue par paires, aligner les blocs français et originaux dans leur ordre, puis comparer la suite recomposée. Cette méthode révèle les blocs originaux omis même lorsque les paragraphes voisins semblent complets.
5. **Comparer documentation et base pour les liens.** Additionner les propositions conservées dans les scripts, puis comparer leurs motifs à tous les liens vivants. Tout delta doit être isolé et relu : il peut s’agir d’un rattrapage légitime, d’un doublon sémantique ou d’un résidu d’une passe antérieure.
6. **Marquer la lecture seulement après cette comparaison.** Les marqueurs \`liens_revus_le\` et \`liens_revus_par\` portent sur tous les segments corporels effectivement lus, y compris ceux sans lien. L’apparat n’est pas marqué par défaut.
7. **Sondage reproductible.** Tirer un échantillon stratifié avec une graine consignée, le comparer au fac-similé, puis examiner visuellement toutes les concordances faibles. Conserver la liste, les pages, les scores et les décisions manuelles dans le dossier d’audit.
`

const memoryBlock = `

${MEMORY_MARKER}

- Témoin : Athanase Auger, Lyon, François Guyot, 1827 ; fac-similé SHA-256 \`BFA0E2AFF7B59744476C0D2F7A7856BF03565E1279405EDEE90D598D497C47B9\`.
- Résultat éditorial : 1 799 segments corporels et 19 segments d’apparat ; dix homélies affichées, les neuf premières divisées selon les 214 sections numérotées de l’édition et la dixième sans faux niveau 2.
- Texte français : 593 graphies anciennes rétablies et plus de 60 fautes d’OCR corrigées. Deux fautes tardives ont été retrouvées par l’audit des liens (« four »/« jour », « voient »/« volent »). La coquille imprimée « Que le terre produise… » a été conservée.
- Notes : 97 appels et 97 définitions, numérotation unique 1–97. Dix-sept notes étaient tronquées malgré des comptes apparemment parfaits ; elles ont été restaurées depuis le fac-similé. Treize appels ont été recollés à leur ancre avant la ponctuation.
- Grec : trois blocs réellement manquants ont été rétablis par recomposition des paires bilingues. Sept valeurs françaises avec références bibliques, chargées à tort dans \`texte_original\`, ont été supprimées ; bilan final : 97 champs authentiquement grecs, aucun résidu de balise ou d’accolade.
- Dixième homélie : la notice précise désormais qu’Auger a fusionné et abrégé deux homélies qu’il juge étrangères à Basile comme à Grégoire de Nysse. Le niveau 1 reste « Dixième homélie (attribution discutée) ».
- Liens : 474 liens de lecture (216 T1, 31 T2, 174 T3, 53 T4), 451 probables, 21 douteux et 2 à constituer. Les deux non résolus correspondent à l’addition grecque sur l’abeille en Pr 6, 8, absente de l’ossature. Les 1 799 segments corporels sont marqués \`IA-lecture\`.
- Contrôle des liens : 38 liens tirés par type, puis les 22 douteux et les 2 à constituer relus ; un seul reclassement, Ps 148, 4 au segment 354, de T4 douteux à T1 probable.
- Contrôle aléatoire du texte : 30 segments, graine \`20260730\`, trois par homélie ; 29 concordances OCR fortes, une concordance à relire confirmée visuellement sur la page PDF 480, zéro échec.
- Rapports finaux : \`audit/hexameron-2026-07-30/final-audit.json\` et \`audit/hexameron-2026-07-30/random-facsimile-check.json\`.
- Empreintes finales : texte \`6D71DAFE64CCF8A547FDDA14B0B43B0F3E1C3FF4400F64F2DCB494645256118E\` ; structure \`3ABD8B7B6ADE943B95D055CDECC6B2FC5EF6302D9B49290325D86036775024E1\` ; grec \`DBF87248B82A72C78CC4F4E3B24A46F20656DA2EF1E5489CB05E7D74BE57A89D\` ; notes \`97286B0505F7FA03043B9FEEFB9535618D7F05416C3CD89318BE0C3E4B44CEA5\` ; liens \`6C8152F3F5F58F6A9C04E088F5D07D18746059337496B0E6445B851D1A114B2F\`.
`

const { data, error } = await db.from('parametres').select('cle,valeur,mis_a_jour')
  .in('cle', [CHARTER_KEY, MEMORY_KEY])
if (error) throw error
const byKey = new Map(data.map((row) => [row.cle, row]))
const charter = byKey.get(CHARTER_KEY)
const memory = byKey.get(MEMORY_KEY)
if (!charter || !memory) throw new Error('Charte ou mémoire absente')
if (charter.valeur.includes(CHARTER_MARKER) || memory.valeur.includes(MEMORY_MARKER)) {
  throw new Error('Retour d’expérience déjà consigné')
}
const charterAfter = `${charter.valeur.trimEnd()}${charterBlock}\n`
const memoryAfter = `${memory.valeur.trimEnd()}${memoryBlock}\n`
const backup = {
  generated_at: new Date().toISOString(),
  before: {
    [CHARTER_KEY]: { mis_a_jour: charter.mis_a_jour, sha256: sha(charter.valeur), valeur: charter.valeur },
    [MEMORY_KEY]: { mis_a_jour: memory.mis_a_jour, sha256: sha(memory.valeur), valeur: memory.valeur },
  },
  after_sha256: { [CHARTER_KEY]: sha(charterAfter), [MEMORY_KEY]: sha(memoryAfter) },
}
mkdirSync('audit/hexameron-2026-07-30', { recursive: true })
writeFileSync(BACKUP, JSON.stringify(backup, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry', backup: BACKUP,
  before_sha256: { charter: sha(charter.valeur), memory: sha(memory.valeur) },
  after_sha256: backup.after_sha256 }, null, 2))
if (!APPLY) process.exit(0)

async function guardedUpdate(row, value) {
  const { data: updated, error: updateError } = await db.from('parametres')
    .update({ valeur: value, mis_a_jour: new Date().toISOString() })
    .eq('cle', row.cle).eq('mis_a_jour', row.mis_a_jour).select('cle,valeur')
  if (updateError) throw updateError
  if (updated.length !== 1) throw new Error(`Concurrence détectée sur ${row.cle}`)
}
await guardedUpdate(charter, charterAfter)
await guardedUpdate(memory, memoryAfter)

const subject = 'Audit final : Basile, Homélies sur l’Hexaéméron'
const { data: recent, error: recentError } = await db.from('journal_ia').select('id,sujet').order('id', { ascending: false }).limit(50)
if (recentError) throw recentError
let journal = recent.find((row) => row.sujet === subject)
if (!journal) {
  const { data: inserted, error: journalError } = await db.from('journal_ia').insert({
    sujet: subject,
    probleme: 'Consignation de l’audit intégral du texte, de la structure, des notes, du grec, de la notice et des liens bibliques.',
    reponse: JSON.stringify({ backup: BACKUP, final_audit: 'audit/hexameron-2026-07-30/final-audit.json', random_check: 'audit/hexameron-2026-07-30/random-facsimile-check.json' }),
    statut: 'terminé',
  }).select('id').single()
  if (journalError) throw journalError
  journal = inserted
}
const { data: verify, error: verifyError } = await db.from('parametres').select('cle,valeur').in('cle', [CHARTER_KEY, MEMORY_KEY])
if (verifyError) throw verifyError
const verified = new Map(verify.map((row) => [row.cle, row.valeur]))
const checks = {
  charter_marker_once: verified.get(CHARTER_KEY).split(CHARTER_MARKER).length - 1 === 1,
  memory_marker_once: verified.get(MEMORY_KEY).split(MEMORY_MARKER).length - 1 === 1,
  charter_hash: sha(verified.get(CHARTER_KEY)) === sha(charterAfter),
  memory_hash: sha(verified.get(MEMORY_KEY)) === sha(memoryAfter),
}
if (Object.values(checks).some((value) => !value)) throw new Error(`Postcontrôle : ${JSON.stringify(checks)}`)
console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, checks }, null, 2))
