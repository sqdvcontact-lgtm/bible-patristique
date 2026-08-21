import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = ['Question LXXXI','Question LXXXII','Question LXXXIII','Question LXXXIV','Question LXXXV','Question LXXXVI','Question LXXXVII','Question LXXXVIII','Question LXXXIX','Question XC']
const PREMIER = 931
const DERNIER = 967
const NB_SEGMENTS = 37
const EMPREINTE_ATTENDUE = '8adbb60fe31309c3bc6d14cd43a0fe5dbc711f4e4dbbf50bc2e5ad7478ea616c'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. LXXXI-XC'

const LIENS = []
const add = (n, canon, type, motif) => LIENS.push([n, canon, type, motif])
const both = (n, canon, motif) => {
  add(n, canon, 1, `${motif} — citation ou référence intentionnelle.`)
  add(n, canon, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (nums, canon, motif) => nums.forEach(n => add(n, canon, 3, motif))

// Question LXXXI — le bœuf homicide.
both(931, 'EXO.21.28', 'Le bœuf qui tue un homme doit être lapidé et sa chair ne doit pas être mangée')
explain([932,933], 'EXO.21.28', 'La mise à mort, la lapidation et l’interdiction de manger l’animal homicide sont expliquées.')

// Question LXXXII — le bœuf qui tue un autre bœuf.
both(934, 'EXO.21.35', 'Le bœuf vivant est vendu et le prix comme la bête morte sont partagés')
add(935, 'EXO.21.35', 3, 'La règle du partage est étendue aux autres animaux dont la chair peut être mangée.')

// Question LXXXIII — restitution du bœuf ou de la brebis volés.
both(936, 'EXO.21.37', 'La restitution de cinq bœufs ou de quatre brebis pour l’animal volé est interrogée comme figure')

// Question LXXXIV — le voleur nocturne ou diurne.
both(937, 'EXO.22.1', 'Le voleur surpris de nuit en pleine effraction peut être frappé sans responsabilité pour son sang')
both(937, 'EXO.22.2', 'La responsabilité pour homicide renaît si le soleil est levé')
add(938, 'EXO.22.1', 3, 'L’obscurité empêche de distinguer si le voleur vient aussi pour tuer.')
both(938, 'EXO.22.2', '« Si le soleil se lève sur lui » permet de discerner le simple vol')
explain([939], 'EXO.22.1', 'La loi païenne du voleur nocturne est rapprochée de la règle mosaïque.')
explain([939], 'EXO.22.2', 'Le cas du voleur diurne armé est comparé à la responsabilité définie par la Loi.')

// Question LXXXV — le dépositaire condamné par Dieu.
both(940, 'EXO.22.8', 'Celui que Dieu convainc dans le litige doit rendre le double')

// Question LXXXVI — les juges ou créatures appelés dieux.
both(941, 'EXO.22.27', 'L’interdiction de maudire les dieux ouvre l’enquête sur le sens du titre')
both(941, 'EXO.7.1', 'Moïse est explicitement appelé dieu de Pharaon')
add(942, 'EXO.22.27', 3, 'La défense de maudire le prince du peuple explique « les dieux » par les juges.')
both(943, '1CO.8.5', 'Paul reconnaît des êtres appelés dieux dans le ciel ou sur la terre')
explain([943,944,945], 'EXO.22.27', 'Le précepte mosaïque est confronté aux créatures qui peuvent recevoir le nom de dieux sans culte de latrie.')
explain([944,945], '1CO.8.5', 'Les créatures appelées dieux sont distinguées du seul vrai Dieu auquel l’adoration est due.')

// Question LXXXVII — ne pas suivre la multitude pour le mal.
both(946, 'EXO.23.2', '« Tu ne seras pas avec le plus grand nombre pour le mal » condamne l’excuse tirée de la multitude')

// Question LXXXVIII — justice envers le pauvre et miséricorde envers l’ennemi.
both(947, 'EXO.23.3', 'L’interdiction de favoriser le pauvre vaut précisément dans le jugement')
both(948, 'EXO.23.2', 'La défense de suivre la multitude dans un jugement injuste est reprise')
both(948, 'EXO.23.3', 'La compassion pour le pauvre est limitée par le contexte judiciaire')
explain([949,950], 'EXO.23.3', 'La miséricorde ne doit pas faire préférer le pauvre au riche contre la justice.')
add(951, 'EXO.23.3', 3, 'Le précepte judiciaire est distingué de la miséricorde exercée hors du tribunal.')
both(951, 'EXO.23.4', 'La restitution à l’ennemi de son bœuf ou de son âne égaré commande la miséricorde hors jugement')

// Question LXXXIX — jachère de la septième année.
for (const canon of ['EXO.23.10','EXO.23.11']) both(952, canon, 'Les six années de culture et l’abandon de la septième aux pauvres puis aux bêtes sont cités')
for (const n of [953,954,955,956]) {
  add(n, 'EXO.23.10', 3, 'Le semis et la récolte des six années sont confrontés à la récolte possible la septième année.')
  add(n, 'EXO.23.11', 3, 'La nourriture laissée aux pauvres puis aux bêtes pendant la septième année est expliquée.')
}
explain([957,958], 'EXO.23.11', 'La mention des bêtes sauvages est interprétée au-delà de son utilité littérale.')
both(957, '1CO.9.9', '« Dieu se met-il en peine des bœufs ? » sert à distinguer le soin providentiel de l’objet spirituel du précepte')
add(957, 'MAT.6.26', 2, 'Les animaux qui ne sèment, ne moissonnent ni n’amassent dans les greniers reprennent la formulation évangélique.')
add(958, 'MAT.6.26', 2, 'Dieu nourrissant lui-même les animaux prolonge l’allusion aux oiseaux nourris par le Père.')

// Question XC — le chevreau dans le lait de sa mère.
both(959, 'EXO.23.19', 'L’interdiction de cuire le chevreau dans le lait de sa mère est citée')
explain([960,961,962,963,964,965,966,967], 'EXO.23.19', 'Le commandement reçoit successivement des lectures littérale, christologique et chronologique.')
both(963, 'MAT.2.13', 'Hérode cherche l’Enfant pour le faire mourir, mais celui-ci lui échappe')
both(963, 'MAT.2.16', 'La cruauté d’Hérode contre les enfants éclaire le danger auquel le Christ enfant échappe')
add(964, 'MAT.2.13', 3, 'La fuite de l’Enfant menacé par Hérode confirme que le Christ ne souffrit pas dans son enfance.')
add(964, 'MAT.2.16', 3, 'La persécution d’Hérode reste le contexte de la lecture prophétique du commandement.')
both(964, 'SIR.27.5', 'La fournaise éprouve le vase et la tribulation éprouve les justes')

const NON_RESOLUS = [
  [939, 4, 'RÉFÉRENCE NON BIBLIQUE (droit romain / auteur profane) : renvoi à la loi des Douze Tables citée par Cicéron dans le Pro Milone ; cible de corpus à constituer.'],
  [965, 4, 'RÉFÉRENCE NON BIBLIQUE (commentateurs non identifiés) : interprétation attribuée à certains commentateurs sur la conception et la Passion du Christ ; cible de corpus à constituer.'],
]
const SANS_LIEN = new Set()

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1],m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,segment_numero,segment_texte,texte_original,notes,nature,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER).lte('segment_numero', DERNIER).order('segment_numero')
if (e0) throw e0
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode LXXXI-XC', bornes: [PREMIER,DERNIER], segments: NB_SEGMENTS, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '24,52 %' }, null, 2))
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
