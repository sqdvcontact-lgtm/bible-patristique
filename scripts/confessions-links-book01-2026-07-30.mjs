import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK_ID = 'A0010O0001'
const BOOK = 'Livre premier'
const OUT = 'tmp/confessions-links-2026-07-30/book-01'
const WRITE = process.argv.includes('--write')
const VERIFIED = 'vérifié'
mkdirSync(OUT, { recursive: true })

// [segment_numero, canon_id, type, motif]
const L = [
  [138, 'PSA.144.3', 2, 'Ouverture de la prière par la reprise intégrée du Seigneur grand et infiniment digne de louange.'],
  [139, 'PSA.146.5', 2, 'Reprise intégrée de la puissance infinie et de la sagesse sans mesure du Seigneur.'],
  [153, 'ROM.10.14', 1, 'Première question de la citation annoncée de l’Apôtre : invoquer celui auquel on ne croit pas.'],
  [154, 'ROM.10.14', 1, 'Suite de la citation annoncée de Rm 10,14 : croire exige que le Christ ait été annoncé.'],
  [155, 'PSA.21.27', 1, 'Citation annoncée du prophète : ceux qui cherchent le Seigneur le loueront.'],
  [156, 'MAT.7.7', 2, 'La recherche qui aboutit à trouver reprend la parole évangélique sous forme intégrée.'],
  [171, 'PSA.138.8', 1, 'Citation expressément donnée comme parole sacrée : même aux enfers, Dieu est présent.'],
  [174, 'ROM.11.36', 2, 'Reprise de la formule paulinienne : toutes choses procèdent de Dieu, subsistent par lui et sont en lui.'],
  [179, 'JER.23.24', 2, 'Reprise intégrée de la parole divine : Dieu remplit le ciel et la terre.'],
  [201, 'PSA.17.32', 2, 'Première question du psaume reprise dans l’interrogation sur l’unique Seigneur.'],
  [202, 'PSA.17.32', 2, 'Seconde question du psaume reprise dans l’interrogation sur l’unique Dieu.'],
  [248, 'PSA.34.3', 2, 'Première reprise de la prière « dites à mon âme : je suis ton salut ».'],
  [251, 'PSA.34.3', 2, 'Répétition intégrée de la prière du psaume demandant à Dieu de se dire salut de l’âme.'],
  [253, 'PSA.26.9', 2, 'Reprise de la supplication demandant à Dieu de ne pas cacher sa face.'],
  [262, 'PSA.18.13', 2, 'Reprise directe de la demande d’être purifié des fautes secrètes.'],
  [262, 'PSA.18.14', 2, 'Suite de la prière psalmique demandant d’épargner au serviteur les fautes étrangères.'],
  [263, 'PSA.115.10', 2, 'Reprise intégrée de « j’ai cru, c’est pourquoi j’ai parlé ».'],
  [265, 'PSA.31.5', 2, 'Reprise de la confession du péché suivie du pardon de son impiété.'],
  [269, 'PSA.129.3', 2, 'Début de la question psalmique sur l’observation rigoureuse des iniquités.'],
  [270, 'PSA.129.3', 2, 'Fin de la question psalmique : nul ne subsisterait devant Dieu.'],
  [271, 'GEN.18.27', 2, 'Augustin reprend pour lui-même l’expression d’Abraham, terre et cendre, avant de parler à Dieu.'],
  [360, 'PSA.101.28', 2, 'Reprise de l’affirmation que les années de Dieu ne finiront pas.'],
  [361, 'PSA.101.28', 2, 'Développement intégré de la durée divine sans fin.'],
  [367, 'PSA.101.28', 2, 'Reprise de « vous êtes toujours le même » dans le développement sur l’éternité.'],
  [386, 'JOB.14.4', 1, 'Citation annoncée de l’Écriture selon la forme ancienne de Jb 14,4 : nul n’est pur du péché devant Dieu.'],
  [387, 'JOB.14.4', 1, 'Suite de la citation de Jb 14,4 selon la Septante : pas même l’enfant d’un jour.'],
  [431, 'PSA.91.2', 2, 'Reprise intégrée de l’ordre de chanter des psaumes au nom du Très-Haut.'],
  [446, 'PSA.50.7', 2, 'Début de la reprise du psaume : conception dans l’iniquité.'],
  [447, 'PSA.50.7', 2, 'Suite de la reprise du psaume : le péché dès le sein maternel.'],
  [487, 'GEN.3.16', 4, 'Les douleurs multipliées aux enfants d’Adam condensent l’annonce faite à Ève après la chute.'],
  [487, 'GEN.3.17', 4, 'Les travaux transmis à la postérité d’Adam font écho au labeur imposé pour tirer la nourriture de la terre.'],
  [608, 'EPH.4.24', 4, 'La « forme de l’homme nouveau » reçue au baptême évoque l’homme nouveau créé selon Dieu.'],
  [634, 'PSA.77.39', 2, 'Première moitié de la reprise : l’homme n’est que chair corruptible.'],
  [635, 'PSA.77.39', 2, 'Seconde moitié de la reprise : esprit qui passe et ne revient pas.'],
  [651, 'PSA.72.27', 2, 'La séparation d’avec Dieu décrite comme adultère reprend ceux qui se prostituent loin de lui.'],
  [653, 'JAS.4.4', 2, 'Reprise intégrée de l’amitié du monde comme adultère qui éloigne de Dieu.'],
  [723, 'PSA.5.3', 2, 'Reprise de l’invocation « mon Roi et mon Dieu ».'],
  [811, 'PSA.85.15', 2, 'Première partie de la reprise : patience divine et longue attente.'],
  [812, 'PSA.85.15', 2, 'Suite de la reprise : abondance de miséricorde et fidélité de la justice divine.'],
  [817, 'PSA.26.8', 2, 'Le cœur d’Augustin reprend la recherche continuelle de la face du Seigneur.'],
  [821, 'LUK.15.13', 3, 'Annonce du récit évangélique du fils cadet parti dans une région lointaine, aussitôt interprété spirituellement.'],
  [822, 'LUK.15.13', 3, 'Augustin explique que le voyage du fils dans la région lointaine ne fut pas un déplacement matériel.'],
  [823, 'LUK.15.13', 3, 'Suite de l’exclusion d’un voyage corporel pour interpréter l’éloignement du fils.'],
  [824, 'LUK.15.13', 3, 'Interprétation de la région lointaine comme éloignement de Dieu par le mouvement du cœur.'],
  [825, 'LUK.15.13', 2, 'Reprise narrative de la dissipation des biens dans les profusions et les débauches.'],
  [826, 'LUK.15.12', 3, 'Application de la part d’héritage accordée par le père aux biens reçus de Dieu puis employés pour le quitter.'],
  [827, 'LUK.15.20', 3, 'Début de l’interprétation du père accueillant avec tendresse le fils revenu dans la misère.'],
  [828, 'LUK.15.20', 3, 'Suite de l’application du retour et de l’accueil paternel à l’âme qui revient vers Dieu.'],
  [829, 'LUK.15.13', 3, 'La vie dissolue du fils est interprétée comme plongée dans une passion ténébreuse.'],
  [830, 'LUK.15.13', 3, 'La région lointaine est explicitement interprétée comme éloignement de la lumière de la face divine.'],
  [846, 'TOB.4.16', 2, 'Reprise intégrée de la règle négative : ne pas faire à autrui ce que l’on ne voudrait pas subir.'],
  [893, 'MAT.19.14', 1, 'Citation annoncée de l’Évangile : le royaume des cieux appartient à ceux qui ressemblent aux enfants.'],
  [894, 'MAT.19.14', 3, 'Augustin exclut l’innocence morale comme objet de la comparaison évangélique.'],
  [895, 'MAT.19.14', 3, 'Augustin interprète la petitesse corporelle de l’enfant comme image de l’humilité.'],
]

// [segment_numero, type, motif]
const UNRESOLVED = [
  [143, 2, 'Formule « Dieu résiste aux superbes », commune à Jc 4,6 et 1 P 5,5, elles-mêmes tributaires de Pr 3,34 ; aucun indice local ne permet de choisir un locus.'],
  [591, 3, 'La soumission de Monique à son mari est expliquée comme obéissance à un commandement divin ; Ép 5,22, Col 3,18 et 1 P 3,1 sont parallèles sans indice discriminant.'],
  [621, 2, 'Les cheveux de la tête comptés par Dieu reprennent une parole commune à Mt 10,30 et Lc 12,7, sans indice permettant de choisir.'],
]

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
const segments = await must(db.from('segments')
  .select('id,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).eq('ref_niv1', BOOK).in('nature', ['texte', 'citation']).order('segment_numero'), 'segments')
if (segments.length !== 784 || segments[0]?.segment_numero !== 138 || segments.at(-1)?.segment_numero !== 921) {
  throw new Error(`Précondition segments rompue : ${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero}`)
}
const byNumber = new Map(segments.map(row => [row.segment_numero, row]))
const existing = []
for (let offset = 0; offset < segments.length; offset += 250) {
  existing.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(offset, offset + 250).map(row => row.id)), `liens:${offset}`))
}
if (existing.length) throw new Error(`Précondition rompue : ${existing.length} liens existent déjà dans le livre I`)
const targets = [...new Set(L.map(row => row[1]))]
const witnesses = []
for (let offset = 0; offset < targets.length; offset += 250) {
  witnesses.push(...await must(db.from('versets_lecture').select('id_verset')
    .in('id_verset', targets.slice(offset, offset + 250)), `cibles:${offset}`))
}
const found = new Set(witnesses.map(row => row.id_verset))
const missing = targets.filter(target => !found.has(target))
if (missing.length) throw new Error(`Cibles absentes : ${missing.join(', ')}`)

const rows = [
  ...L.map(([number, canon_id, type, motif]) => ({
    segment_id: byNumber.get(number)?.id, canon_id, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: VERIFIED, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...UNRESOLVED.map(([number, type, motif]) => ({
    segment_id: byNumber.get(number)?.id, canon_id: null, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: 'à constituer', motif, provenance: 'lecture', arbitrage_requis: true,
  })),
]
if (rows.some(row => !row.segment_id)) throw new Error('Un segment visé est absent')
const key = row => `${row.segment_id}|${row.canon_id ?? ''}|${row.type}|${row.motif}`
if (new Set(rows.map(key)).size !== rows.length) throw new Error('Doublon interne')
const snapshot = {
  work_id: WORK_ID, book: BOOK, created_at: new Date().toISOString(), segments,
  proposed_links: rows,
  text_hash: createHash('sha256').update(segments.map(row => `${row.segment_numero}\t${row.segment_texte}`).join('\n')).digest('hex').toUpperCase(),
}
writeFileSync(`${OUT}/pre-write.json`, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  mode: WRITE ? 'write' : 'dry', segments: segments.length, links: rows.length,
  types: rows.reduce((acc, row) => ({ ...acc, [row.type]: (acc[row.type] ?? 0) + 1 }), {}),
  unresolved: UNRESOLVED.length, text_hash: snapshot.text_hash,
}, null, 2))
if (!WRITE) process.exit(0)
for (let offset = 0; offset < rows.length; offset += 100) {
  await must(db.from('liens_bibliques').insert(rows.slice(offset, offset + 100)), `insert:${offset}`)
}
const reviewedAt = new Date().toISOString()
for (let offset = 0; offset < segments.length; offset += 200) {
  await must(db.from('segments').update({ liens_revus_le: reviewedAt, liens_revus_par: 'IA-lecture' })
    .in('id', segments.slice(offset, offset + 200).map(row => row.id)), `review:${offset}`)
}
console.log(`Livre I écrit : ${rows.length} liens ; ${segments.length} segments marqués relus.`)
