import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = ['Question LI','Question LII','Question LIII','Question LIV','Question LV','Question LVI','Question LVII','Question LVIII','Question LIX','Question LX']
const PREMIER = 770
const DERNIER = 800
const NB_SEGMENTS = 31
const EMPREINTE_ATTENDUE = '64c6cdbb8b54d3d46bddd8a76e2fbbae319527827e2107fc87184e3b2e0d7214'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. LI-LX'

const LIENS = []
const add = (n, canon, type, motif) => LIENS.push([n, canon, type, motif])
const both = (n, canon, motif) => {
  add(n, canon, 1, `${motif} — citation ou référence intentionnelle.`)
  add(n, canon, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (nums, canon, motif) => nums.forEach(n => add(n, canon, 3, motif))

// Question LI — « Vous ne verrez plus jamais les Égyptiens ».
both(770, 'EXO.14.13', 'La promesse de ne plus revoir les Égyptiens est citée intégralement')
explain([771,772,773], 'EXO.14.13', 'Les sens possibles de la promesse de ne plus revoir les Égyptiens sont examinés.')

// Question LII — le cri intérieur de Moïse.
both(774, 'EXO.14.15', '« Pourquoi cries-tu vers moi ? » est expliqué comme cri silencieux du cœur')

// Question LIII — attribution de la verge à Moïse ou à Aaron.
both(775, 'EXO.14.16', 'Dieu ordonne à Moïse de lever sa verge et d’étendre sa main sur la mer')
for (const canon of ['EXO.7.9','EXO.7.19','EXO.8.1','EXO.8.12']) {
  both(775, canon, 'Les ordres antérieurs attribuent la verge à Aaron lorsqu’il l’emploie pour le prodige')
}

// Question LIV — la terre mise pour l’eau.
both(776, 'EXO.15.12', '« Vous avez étendu votre droite, et la terre les a dévorés »')
add(777, 'EXO.15.12', 3, 'Le mot terre est interprété comme désignant la partie inférieure du monde, y compris les eaux.')
both(777, 'PSA.148.7', 'L’appel du psaume aux créatures de la terre inclut les êtres et abîmes aquatiques')

// Question LV — les cinq premières mentions de l’Esprit de Dieu.
both(778, 'EXO.15.10', 'Le souffle ou Esprit envoyé par Dieu submerge les Égyptiens')
both(778, 'EXO.8.15', 'Le « doigt de Dieu » confessé par les magiciens est identifié à l’Esprit')
for (const [canon, motif] of [
  ['GEN.1.2', 'Première mention : l’Esprit de Dieu porté sur les eaux'],
  ['GEN.6.3', 'Deuxième mention : l’Esprit ne demeure plus dans les hommes de chair'],
  ['GEN.41.38', 'Troisième mention : Pharaon reconnaît l’Esprit de Dieu en Joseph'],
  ['EXO.8.15', 'Quatrième mention : les magiciens confessent le doigt de Dieu'],
  ['EXO.15.10', 'Cinquième mention : le souffle de Dieu submerge les Égyptiens'],
]) both(779, canon, motif)
both(780, 'EXO.15.8', '« Les eaux se sont amoncelées au souffle de votre colère »')
add(780, 'EXO.15.10', 3, 'Le souffle qui engloutit les Égyptiens est rapproché de l’Esprit de colère.')
explain([781,782], 'EXO.15.8', 'Le souffle de colère divise les eaux, pour la perte des Égyptiens et le salut d’Israël.')
explain([781,782], 'EXO.15.10', 'L’unique Esprit produit des effets opposés sur les Égyptiens et sur Israël.')
add(781, 'EXO.14.23', 2, 'L’entrée des poursuivants égyptiens dans le lit de la mer est absorbée dans le rappel narratif.')
add(781, 'EXO.14.28', 2, 'Le retour des eaux engloutissant l’armée égyptienne est absorbé dans le rappel narratif.')
add(782, 'EXO.14.22', 2, 'Le passage d’Israël à pied sec entre les eaux est absorbé dans le rappel narratif.')
add(782, 'EXO.14.29', 2, 'La préservation d’Israël dans la mer divisée est absorbée dans le rappel narratif.')
both(783, 'ROM.8.15', 'L’Esprit de servitude et l’Esprit d’adoption sont cités et opposés')
both(783, 'EXO.31.18', 'Le doigt de Dieu grave la Loi sur les tables de pierre')
both(783, 'GAL.3.22', 'L’Écriture enferme sous le péché afin de conduire à la promesse par la foi')
both(783, 'GAL.3.24', 'La Loi sert de pédagogue pour conduire au Christ et à la justification par la foi')
both(784, '2CO.3.6', '« La lettre tue, mais l’Esprit vivifie »')
add(784, 'ROM.8.15', 3, 'L’Esprit vivifiant est expliqué comme l’opération de grâce et d’adoption.')

// Question LVI — le nom de Mara donné rétrospectivement.
both(785, 'EXO.15.23', 'L’arrivée à Mara et l’amertume de ses eaux sont citées')
add(786, 'EXO.15.23', 3, 'Le récit emploie rétrospectivement le nom que le lieu reçut à la suite des faits.')

// Question LVII — le bois qui adoucit les eaux.
both(787, 'EXO.15.25', 'Le bois montré par Dieu est jeté dans l’eau, qui devient douce')
explain([788,789], 'EXO.15.25', 'La propriété naturelle ou miraculeuse du bois et sa figure de la croix sont discutées.')

// Question LVIII — Dieu tente au sens d’éprouver.
both(790, 'EXO.16.4', 'Le pain quotidien est promis afin d’éprouver si le peuple marche dans la Loi')
add(791, 'EXO.16.4', 3, 'L’épreuve divine est distinguée de l’entraînement au péché et ordonnée à l’humilité.')

// Question LIX — « Que sommes-nous ? » et la divinité du Saint-Esprit.
both(792, 'EXO.16.8', 'Moïse et Aaron déclarent que le murmure vise Dieu et non ses serviteurs')
explain([793,794,795,796], 'EXO.16.8', 'La distinction entre les envoyés humains et Dieu est confrontée aux paroles de Pierre.')
both(794, 'ACT.5.3', 'Pierre reproche à Ananie d’avoir menti au Saint-Esprit')
both(794, 'ACT.5.4', 'Pierre conclut qu’Ananie a menti non aux hommes, mais à Dieu')
both(795, 'ACT.5.3', 'La formule sur le mensonge au Saint-Esprit est reprise pour exclure une distinction de nature')
add(795, 'ACT.5.4', 3, 'La conclusion « mais à Dieu » est analysée avec la phrase précédente.')
both(796, 'ACT.5.4', '« Ce n’est pas aux hommes que tu as menti, mais à Dieu » établit la divinité de l’Esprit')

// Question LX — chair du soir, pain du matin et typologie pascale.
both(797, 'EXO.16.12', 'La promesse de chair le soir et de pains le matin est citée')
explain([798,799,800], 'EXO.16.12', 'La chair du soir et la manne du matin reçoivent une interprétation christologique.')
both(799, '1KI.17.6', 'Les corbeaux apportent à Élie pain et chair le matin et le soir')
both(799, 'ROM.4.25', 'Le Christ livré pour nos péchés et ressuscité pour notre justification est cité')
add(800, 'ROM.4.25', 3, 'La mort du soir et la résurrection du matin développent Romains 4,25.')

const NON_RESOLUS = []
const SANS_LIEN = new Set()

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1],m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,segment_numero,segment_texte,texte_original,notes,nature,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER).lte('segment_numero', DERNIER).order('segment_numero')
if (e0) throw e0
// Sélection bornée, puis contrôle structurel en mémoire pour éviter les
// variations d’encodage de l’accent dans « deuxième » côté PostgREST.
const segments = bruts.filter(s => s.ref_niv1 === REF_NIV1 && QUESTIONS.includes(s.ref_niv2))
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map(s => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Préétat : questions incomplètes ou désordonnées')
if (segments.some(s => s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat : segment déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id,s.segment_numero,s.ref_niv1,s.ref_niv2,s.ref_niv2_texte,s.segment_texte,s.texte_original,s.notes,s.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map(s => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...NON_RESOLUS].map(([n]) => n))
const nonClasses = segments.filter(s => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Segments non classés : ${nonClasses.map(s => s.segment_numero)}`)
if ([...SANS_LIEN].some(n => classes.has(n) || !parNumero.has(n))) throw new Error('Chevauchement ou numéro SANS_LIEN invalide')
if (LIENS.some(([n,c,t,m]) => !parNumero.has(n) || !c || ![1,2,3,4].includes(t) || !m.trim())) throw new Error('Lien biblique invalide')
if (NON_RESOLUS.some(([n,t,m]) => !parNumero.has(n) || ![1,2,3,4].includes(t) || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence non biblique invalide')
const cles = LIENS.map(([n,c,t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne segment/cible/type')

const cibles = [...new Set(LIENS.map(([,c]) => c))]
const { data: temoins, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(temoins.map(v => [v.id_verset, v]))
const absentes = cibles.filter(c => !parCible.has(c))
const illisibles = temoins.filter(v => !v.TR0001 || !v.TR0003 || !v.TR0004).map(v => v.id_verset)
if (absentes.length || illisibles.length) throw new Error(`Cibles invalides : absentes=${absentes}; témoins incomplets=${illisibles}`)
const ids = segments.map(s => s.id)
const { count: existants, error: e2 } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (e2) throw e2
if (existants) throw new Error(`Préétat : ${existants} liens déjà présents`)

const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a,[,,t]) => (a[t] = (a[t] ?? 0) + 1, a), {})
for (const [,t] of NON_RESOLUS) types[t] = (types[t] ?? 0) + 1
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode LI-LX', bornes: [PREMIER,DERNIER], segments: NB_SEGMENTS, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '21,61 %' }, null, 2))
if (DETAIL) {
  for (const [n,c,t,m] of LIENS) console.log({ n,c,t,m,segment:parNumero.get(n).segment_texte,temoins:parCible.get(c) })
  for (const [n,t,m] of NON_RESOLUS) console.log({ n,t,m,segment:parNumero.get(n).segment_texte,fiabilite:'à constituer' })
}
if (!WRITE) process.exit(0)

const q = v => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([n,c,t,m]) => `(${parNumero.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([n,t,m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens %/${TOTAL}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments %/${NB_SEGMENTS}', n; end if;
end $passe$;`
const { error: ew } = await sb.rpc('exec_sql', { sql })
if (ew) throw ew
const [{ data: audit, error: e3 }, { count: relus, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
])
if (e3 || e4) throw (e3 || e4)
if (audit.length !== TOTAL || relus !== NB_SEGMENTS || audit.some(x => !x.motif || x.provenance !== 'lecture' || (x.canon_id ? (x.fiabilite !== 'vérifié' || x.arbitrage_requis) : (x.verset_v2_id || x.livre || x.chapitre || x.fiabilite !== 'à constituer' || !x.arbitrage_requis || !x.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
console.log(`✓ ${audit.length} liens ; ${relus} segments relus`)
