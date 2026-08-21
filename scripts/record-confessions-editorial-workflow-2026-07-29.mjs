import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const BACKUP_PATH = 'audit/charte_memory_before_confessions_workflow_2026-07-29.json'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CHARTER_MARKER = '### 12.1 — Séparation obligatoire entre constitution éditoriale et liens bibliques'
const MEMORY_MARKER = '## 1 bis. Frontière entre préparation éditoriale et constitution des liens'

const charterBlock = `${CHARTER_MARKER}

La constitution éditoriale d’une œuvre et la constitution de ses liens bibliques sont deux chantiers distincts. Elles ne sont jamais mêlées dans une même passe, même lorsque des citations ou des références bibliques sont déjà visibles dans la source.

**Phase A : œuvre propre, complète et structurée.** Elle comprend exclusivement :
1. identification exacte de l’édition et du témoin utilisé ;
2. inventaire matériel du fac-similé, avec première et dernière page du texte, parties, préfaces, apparat et éventuelles lacunes ;
3. exclusion de la page de titre matérielle, utilisée seulement pour les métadonnées ;
4. correction de l’OCR et contrôle de fidélité page par page ou par grands lots vérifiables ;
5. restitution des vrais titres et sous-titres d’après leur fonction dans le fac-similé, sans transformer le titre de l’œuvre en niveau ni une préface en sous-titre ;
6. restitution des paragraphes de l’édition, puis segmentation et attribution des rangs ; les niveaux de titre ne remplacent jamais automatiquement le paragraphage ;
7. constitution de l’apparat critique et des notes, avec numérotation unique dans l’œuvre, appels placés avant tout guillemet fermant, et test effectif des notes présentes dans les titres ;
8. audit de complétude avant import, puis contre-audit après import : recomposition exacte des paragraphes, continuité des pages et des divisions, concordance appels/définitions de notes, absence de texte de page de titre, comparaison des volumes de texte et sondage contre le fac-similé.

Pendant cette phase, les références bibliques imprimées sont conservées fidèlement dans le texte ou les notes, mais aucune ligne n’est créée ni modifiée dans \`liens_bibliques\`. Aucun type 1, 2, 3 ou 4 n’est attribué à la volée. L’œuvre peut être considérée éditorialement prête sans posséder encore de liens.

**Phase B : liens bibliques.** Elle ne commence qu’après clôture explicite de la phase A et sur instruction distincte. Elle suit alors les §9, §24 et §25 ainsi que \`feedback_liens_protocole\`, avec ses propres sauvegardes, passes de lecture et contrôles.

**Application prévue : Augustin, *Les Confessions*, traduction d’Arnauld d’Andilly.** Repartir de la nouvelle édition à localiser et identifier. Ne réutiliser aucun segment ni aucune structure de l’ancien import supprimé. Le premier chantier couvre seulement l’établissement du texte, la structure, les paragraphes, les rangs, les titres, l’apparat, les notes et l’audit. Les liens bibliques seront constitués lors de passes ultérieures séparées.

**Leçon de Ratramne.** Avant tout import comparable, produire un dossier de preuve comprenant : carte complète des parties ; table des titres avec leur niveau justifié par le fac-similé ; limites exactes du corps et de l’apparat ; registre des notes ; compte des paragraphes et des segments ; comparaison du volume source avec le volume préparé. Aucun doute de structure ne doit être résolu par commodité de schéma.

`

const memoryBlock = `${MEMORY_MARKER}

- La préparation éditoriale ne crée et ne modifie jamais de liens bibliques. Les références visibles restent dans le texte et dans les notes jusqu’à l’ouverture d’une passe de liens distincte.
- Un import n’est pas incomplet parce qu’il n’a pas encore de liens. Il doit d’abord être complet, fidèle, correctement hiérarchisé, paragraphé, segmenté et audité.
- Le chantier des liens ne commence qu’après clôture explicite de l’établissement du texte et nouvelle instruction de Sébastien.

### Reprise prévue : Augustin, *Les Confessions*

- Témoin à retrouver : nouvelle édition de la traduction d’Arnauld d’Andilly.
- L’ancien import des *Confessions* a été supprimé et ne doit fournir ni segments, ni structure, ni texte de secours.
- Première campagne seulement : localisation et identification de l’édition, inventaire du fac-similé, OCR, titres et sous-titres, apparat, notes, paragraphes, rangs, segmentation, import et double audit de complétude.
- Campagne ultérieure seulement : constitution des liens bibliques selon la méthode de la présente mémoire.
- Garde-fous hérités de Ratramne : aucune page de titre dans le corps ; fonction réelle de chaque préface vérifiée ; table des divisions avant segmentation ; numérotation des notes unique dans l’œuvre ; appels avant les guillemets fermants ; notes de titres testées dans le rendu ; volume du texte préparé confronté à celui de la source.

`

function sha(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function guardedUpdate(key, beforeUpdatedAt, after) {
  const { data, error } = await db.from('parametres').update({ valeur: after, mis_a_jour: new Date().toISOString() }).eq('cle', key).eq('mis_a_jour', beforeUpdatedAt).select('cle,valeur,mis_a_jour')
  if (error) throw new Error(`${key} : ${error.message}`)
  if (data.length !== 1) throw new Error(`${key} : précondition de sauvegarde non satisfaite`)
  return data[0]
}

async function main() {
  const { data, error } = await db.from('parametres').select('cle,valeur,mis_a_jour').in('cle', ['charte_ia', 'feedback_liens_protocole'])
  if (error) throw error
  const byKey = new Map(data.map((row) => [row.cle, row]))
  const charter = byKey.get('charte_ia')
  const memory = byKey.get('feedback_liens_protocole')
  if (!charter || !memory) throw new Error('Charte ou mémoire absente')
  if (charter.valeur.includes(CHARTER_MARKER) || memory.valeur.includes(MEMORY_MARKER)) throw new Error('La consigne est déjà enregistrée')

  const charterNeedle = '**Ordre recommandé des passes :**'
  const memoryNeedle = '## 2. Audit préalable de chaque œuvre'
  if (!charter.valeur.includes(charterNeedle) || !memory.valeur.includes(memoryNeedle)) throw new Error('Point d’insertion introuvable')
  const charterAfter = charter.valeur
    .replace('Mise à jour : 28 juillet 2026', 'Mise à jour : 29 juillet 2026')
    .replace(charterNeedle, `${charterBlock}${charterNeedle}`)
  const memoryAfter = memory.valeur.replace(memoryNeedle, `${memoryBlock}${memoryNeedle}`)

  const backup = {
    generated_at: new Date().toISOString(),
    reason: 'Consigne de séparation des passes et préparation future des Confessions d’Augustin, traduction d’Arnauld d’Andilly.',
    before: {
      charte_ia: { mis_a_jour: charter.mis_a_jour, sha256: sha(charter.valeur), valeur: charter.valeur },
      feedback_liens_protocole: { mis_a_jour: memory.mis_a_jour, sha256: sha(memory.valeur), valeur: memory.valeur },
    },
    after_sha256: { charte_ia: sha(charterAfter), feedback_liens_protocole: sha(memoryAfter) },
  }
  mkdirSync('audit', { recursive: true })
  const backupJson = `${JSON.stringify(backup, null, 2)}\n`
  writeFileSync(BACKUP_PATH, backupJson)

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', backup: BACKUP_PATH, before_sha256: { charte_ia: sha(charter.valeur), feedback_liens_protocole: sha(memory.valeur) }, after_sha256: backup.after_sha256, charter_added_chars: charterAfter.length - charter.valeur.length, memory_added_chars: memoryAfter.length - memory.valeur.length }, null, 2))
    return
  }

  const backupSha256 = sha(backupJson)
  const journalSubject = 'Charte et mémoire - séparation des passes pour les Confessions'
  const { data: recentJournals, error: recentJournalError } = await db.from('journal_ia').select('id,sujet').order('id', { ascending: false }).limit(20)
  if (recentJournalError) throw recentJournalError
  let journal = recentJournals.find((row) => row.sujet === journalSubject)
  if (!journal) {
    const { data: insertedJournal, error: journalError } = await db.from('journal_ia').insert({
      sujet: journalSubject,
      probleme: 'Sauvegarde préalable à l’inscription de la méthode tirée de Ratramne et de la consigne sur les Confessions d’Augustin, traduction d’Arnauld d’Andilly.',
      reponse: JSON.stringify({ backup_path: BACKUP_PATH, backup_sha256: backupSha256, before_sha256: { charte_ia: sha(charter.valeur), feedback_liens_protocole: sha(memory.valeur) }, after_sha256: backup.after_sha256 }),
      statut: 'sauvegarde',
    }).select('id').single()
    if (journalError) throw journalError
    journal = insertedJournal
  }

  await guardedUpdate('charte_ia', charter.mis_a_jour, charterAfter)
  await guardedUpdate('feedback_liens_protocole', memory.mis_a_jour, memoryAfter)

  const { data: verified, error: verifyError } = await db.from('parametres').select('cle,valeur,mis_a_jour').in('cle', ['charte_ia', 'feedback_liens_protocole'])
  if (verifyError) throw verifyError
  const verifiedMap = new Map(verified.map((row) => [row.cle, row]))
  const checks = {
    charter_marker_once: verifiedMap.get('charte_ia').valeur.split(CHARTER_MARKER).length - 1 === 1,
    memory_marker_once: verifiedMap.get('feedback_liens_protocole').valeur.split(MEMORY_MARKER).length - 1 === 1,
    charter_sha256: sha(verifiedMap.get('charte_ia').valeur) === sha(charterAfter),
    memory_sha256: sha(verifiedMap.get('feedback_liens_protocole').valeur) === sha(memoryAfter),
    links_separation_in_both: [verifiedMap.get('charte_ia').valeur, verifiedMap.get('feedback_liens_protocole').valeur].every((value) => value.includes('passes ultérieures') || value.includes('passe de liens distincte')),
  }
  if (Object.values(checks).some((value) => !value)) throw new Error(`Vérification finale échouée : ${JSON.stringify(checks)}`)
  console.log(JSON.stringify({ mode: 'applied-and-verified', journal_id: journal.id, backup: BACKUP_PATH, backup_sha256: backupSha256, checks, updated_at: Object.fromEntries(verified.map((row) => [row.cle, row.mis_a_jour])) }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
