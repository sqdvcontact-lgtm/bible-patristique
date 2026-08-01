import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const WORK_ID = 'A0418O0003'
const WRITE = process.argv.includes('--write')
const OUT = 'tmp/eucher-links-2026-07-30'
mkdirSync(OUT, { recursive: true })

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data ?? []
}

// [segment_numero, canon_id, type, motif, fiabilite, provenance, arbitrage]
const VERIFIED = 'vérifié'
const L = [
  [100, '1CO.2.7', 2, 'Reprise intégrée de la sagesse de Dieu cachée et préparée avant les siècles pour notre gloire.', VERIFIED, 'lecture', false],
  [127, 'GEN.3.19', 2, 'La chair retourne vers la terre dont elle tire son origine. La note imprimée Genèse 2, 21 ne correspond pas au contenu du verset.', VERIFIED, 'editeur', false],
  [128, 'JAS.1.17', 2, 'Reprise distinctive du « Père des lumières ». La note imprimée Luc 1, 17 ne correspond pas au texte.', VERIFIED, 'editeur', false],
  [129, 'GEN.1.27', 2, 'L’âme est dite image de Dieu dans l’homme.', VERIFIED, 'lecture', false],
  [141, 'MAT.16.26', 1, 'Citation annoncée des paroles du Christ sur le gain du monde et la perte de l’âme.', VERIFIED, 'editeur', false],
  [185, '2CO.5.20', 2, 'La note éditoriale vise l’exhortation apostolique exercée par la bouche de l’ambassadeur du Christ, mais la traduction française n’en conserve qu’une reprise très réduite.', 'douteux', 'editeur', true],
  [185, 'EPH.6.10', 4, 'Référence donnée par l’édition à l’exhortation de se fortifier, dont le rapport avec la formulation française reste ténu.', 'douteux', 'editeur', true],
  [227, '1TI.6.10', 1, 'Citation annoncée de l’Apôtre : l’amour de l’argent est la racine de tous les maux.', VERIFIED, 'editeur', false],
  [236, 'PSA.38.7', 1, 'Citation de David sur les trésors amassés sans savoir pour qui. La note imprimée indique un autre numéro de verset.', VERIFIED, 'editeur', false],
  [290, 'MAL.3.1', 1, 'Citation prophétique donnée par l’édition comme Malachie 3, 1 ; le motif de préparer et de voir venir subsiste, mais la formulation française diverge fortement et un autre témoin éditorial propose Isaïe 28, 25.', 'douteux', 'editeur', true],
  [312, 'MAT.11.30', 2, 'Reprise fondue du joug doux du Christ.', VERIFIED, 'lecture', false],
  [318, 'MAT.7.14', 2, 'Reprise de la voie étroite qui conduit à la vie.', VERIFIED, 'lecture', false],
  [339, 'MAT.11.12', 2, 'Reprise intégrée du royaume des cieux ravi avec violence.', VERIFIED, 'lecture', false],
  [347, '1TI.6.15', 2, 'Reprise du titre divin « Seigneur des seigneurs » dans le contexte du vrai Roi.', VERIFIED, 'lecture', false],
  [364, 'PSA.138.7', 1, 'Citation de la fuite impossible loin de l’Esprit et de la face de Dieu.', VERIFIED, 'editeur', false],
  [364, 'PSA.138.8', 1, 'Suite de la citation : Dieu est présent au ciel comme aux enfers.', VERIFIED, 'editeur', false],
  [364, 'PSA.138.9', 1, 'Suite de la citation : les ailes et les extrémités de la mer.', VERIFIED, 'editeur', false],
  [364, 'PSA.138.10', 1, 'Fin de la citation : la main de Dieu conduit et sa droite soutient.', VERIFIED, 'editeur', false],
  [429, 'PSA.115.12', 1, 'Citation de David demandant ce qu’il rendra au Seigneur pour ses bienfaits.', VERIFIED, 'editeur', false],
  [438, 'ROM.15.19', 2, 'Parole de Paul intégrée à la phrase : l’Évangile porté de Jérusalem jusqu’en Illyrie.', VERIFIED, 'lecture', false],
  [448, '1JN.2.15', 1, 'Citation annoncée de saint Jean : ne pas aimer le monde ni ce qui est dans le monde.', VERIFIED, 'editeur', false],
  [453, '1PE.2.11', 1, 'Citation annoncée de saint Pierre : les désirs charnels combattent contre l’âme.', VERIFIED, 'editeur', false],
  [473, '1CO.10.11', 1, 'Citation annoncée de l’Apôtre sur ceux qui sont arrivés à la fin des temps. La note imprimée décale la cible au verset suivant.', VERIFIED, 'editeur', false],
  [499, 'ROM.8.24', 1, 'Citation annoncée de l’Apôtre : nous sommes sauvés en espérance.', VERIFIED, 'editeur', false],
  [500, 'ROM.8.24', 2, 'Suite du verset absorbée dans le discours : voir ce que l’on espérait n’est plus espérer.', VERIFIED, 'lecture', false],
  [516, '1TI.3.16', 2, 'Début de la confession christologique absorbée dans le discours : manifesté dans la chair et justifié par l’Esprit.', VERIFIED, 'lecture', false],
  [517, '1TI.3.16', 2, 'Suite de la confession christologique : vu des anges et prêché aux nations.', VERIFIED, 'lecture', false],
  [518, '1TI.3.16', 2, 'Fin de la confession christologique : cru dans le monde et élevé dans la gloire.', VERIFIED, 'lecture', false],
  [519, 'PHP.2.9', 1, 'Citation annoncée de Paul : Dieu a souverainement élevé le Christ et lui a donné le nom au-dessus de tout nom.', VERIFIED, 'editeur', false],
  [519, 'PHP.2.10', 1, 'Suite de la citation : tout genou fléchit au nom de Jésus au ciel, sur terre et dans les enfers.', VERIFIED, 'editeur', false],
  [519, 'PHP.2.11', 1, 'Fin de la citation : toute langue confesse Jésus-Christ Seigneur dans la gloire du Père.', VERIFIED, 'editeur', false],
  [534, 'PHP.3.19', 1, 'Citation annoncée de Paul sur ceux dont les pensées et affections sont terrestres.', VERIFIED, 'editeur', false],
  [548, 'MAT.22.39', 2, 'Le commandement d’aimer son prochain comme soi-même est reformulé dans la voix de l’auteur.', VERIFIED, 'lecture', false],
  [548, 'MAT.22.39', 3, 'L’auteur explique que l’amour du prochain sert le bien de celui qui aime.', VERIFIED, 'lecture', false],
  [559, 'MAT.5.44', 2, 'Reprise du commandement d’aimer même ceux qui ne nous aiment pas.', VERIFIED, 'lecture', false],
  [560, 'LUK.12.33', 2, 'Reprise de l’aumône aux pauvres comme trésor mis à l’abri de la perte.', VERIFIED, 'lecture', false],
  [598, '1CO.10.31', 2, 'Reprise intégrée de l’ordre de tout faire pour Dieu dans les paroles et les actions.', VERIFIED, 'lecture', false],
  [606, 'MAT.5.45', 2, 'Reprise du soleil accordé pareillement aux bons et aux méchants.', VERIFIED, 'lecture', false],
  [608, 'MAT.5.45', 3, 'L’égalité des dons temporels aux justes et aux injustes sert de point de départ à un raisonnement sur la récompense réservée aux justes.', VERIFIED, 'lecture', false],
  [614, '1CO.2.9', 1, 'Citation annoncée de l’Apôtre sur les biens inconcevables préparés par Dieu à ceux qui l’aiment.', VERIFIED, 'editeur', false],
]

const segments = await must(db.from('segments')
  .select('id,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).in('nature', ['texte', 'citation']).order('segment_numero'), 'segments')
if (segments.length !== 547) throw new Error(`Précondition rompue : ${segments.length} segments corporels au lieu de 547`)
const byNumber = new Map(segments.map(segment => [segment.segment_numero, segment]))
for (const [numero] of L) if (!byNumber.has(numero)) throw new Error(`Segment absent : ${numero}`)

const existing = []
for (let index = 0; index < segments.length; index += 300) {
  existing.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(index, index + 300).map(segment => segment.id)), 'liens existants'))
}
if (existing.length) throw new Error(`Précondition rompue : ${existing.length} liens existent déjà`)

const targets = [...new Set(L.map(row => row[1]))]
const witnesses = await must(db.from('versets_lecture').select('id_verset').in('id_verset', targets), 'cibles')
const found = new Set(witnesses.map(row => row.id_verset))
const missing = targets.filter(target => !found.has(target))
if (missing.length) throw new Error(`Cibles absentes : ${missing.join(', ')}`)

const rows = L.map(([numero, canon_id, type, motif, fiabilite, provenance, arbitrage_requis]) => ({
  segment_id: byNumber.get(numero).id,
  canon_id,
  livre: null,
  chapitre: null,
  type,
  fiabilite,
  motif,
  provenance,
  arbitrage_requis,
}))
const key = row => `${row.segment_id}|${row.canon_id}|${row.type}`
if (new Set(rows.map(key)).size !== rows.length) throw new Error('Doublon interne segment/cible/type')

const snapshot = {
  work_id: WORK_ID,
  created_at: new Date().toISOString(),
  segments,
  existing_links: existing,
  proposed_links: rows,
  text_hash: createHash('sha256').update(segments.map(s => `${s.segment_numero}\t${s.segment_texte}`).join('\n')).digest('hex').toUpperCase(),
}
writeFileSync(`${OUT}/pre-links-snapshot.json`, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
const counts = rows.reduce((acc, row) => {
  acc[`type_${row.type}`] = (acc[`type_${row.type}`] ?? 0) + 1
  acc[row.fiabilite] = (acc[row.fiabilite] ?? 0) + 1
  return acc
}, {})
console.log(JSON.stringify({ mode: WRITE ? 'write' : 'dry', segments: segments.length, links: rows.length, targets: targets.length, counts, text_hash: snapshot.text_hash }, null, 2))
if (!WRITE) process.exit(0)

for (let index = 0; index < rows.length; index += 100) {
  await must(db.from('liens_bibliques').insert(rows.slice(index, index + 100)), `insertion ${index}`)
}
const reviewedAt = new Date().toISOString()
for (let index = 0; index < segments.length; index += 200) {
  await must(db.from('segments').update({ liens_revus_le: reviewedAt, liens_revus_par: 'IA-lecture' })
    .in('id', segments.slice(index, index + 200).map(segment => segment.id)), `marquage ${index}`)
}
console.log(`Écriture terminée : ${rows.length} liens ; ${segments.length} segments marqués relus.`)
