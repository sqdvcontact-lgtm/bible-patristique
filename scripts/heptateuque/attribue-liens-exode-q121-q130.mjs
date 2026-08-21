import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = ['Question CXXI','Question CXXII','Question CXXIII','Question CXXIV','Question CXXV','Question CXXVI','Question CXXVII','Question CXXVIII','Question CXXIX','Question CXXX']
const PREMIER = 1071
const DERNIER = 1101
const NB_SEGMENTS = 31
const EMPREINTE_ATTENDUE = 'c6cd09ece3b24e7dbbb2fd026b833249066af338329c03c18ba1d9489ebe442c'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. CXXI-CXXX'

const LIENS = []
const add = (n, canon, type, motif) => LIENS.push([n, canon, type, motif])
const both = (n, canon, motif) => {
  add(n, canon, 1, `${motif} — citation ou référence intentionnelle.`)
  add(n, canon, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (nums, canon, motif) => nums.forEach(n => add(n, canon, 3, motif))

// Question CXXI — remplir ou consacrer les mains.
both(1071, 'EXO.28.41', 'La consécration des mains d’Aaron et de ses fils les établit dans le sacerdoce')

// Question CXXII — les caleçons de lin.
both(1072, 'EXO.28.42', 'Les caleçons de lin couvrent la nudité depuis les reins jusqu’aux cuisses')
add(1073, 'EXO.28.42', 3, 'Le vêtement couvrant les parties honteuses devient figure de continence reçue par grâce.')

// Question CXXIII — les cidares.
both(1074, 'EXO.29.8', 'Les fils d’Aaron sont revêtus de leurs tuniques et ceintures')
both(1074, 'EXO.29.9', 'Les fils d’Aaron sont enveloppés ou coiffés de cidares')
add(1075, 'EXO.29.9', 3, 'Le verbe « envelopper » sert à discuter si la cidare couvrait la tête ou le corps.')

// Question CXXIV — éternité du sacerdoce.
both(1076, 'EXO.29.9', 'Le sacerdoce d’Aaron est déclaré perpétuel dans l’institution figurative')
both(1076, 'HEB.7.11', 'Le sacerdoce selon Melchisédech est opposé à l’ordre d’Aaron')
both(1076, 'HEB.7.12', 'Le changement du sacerdoce lévitique est affirmé')
both(1076, 'HEB.7.17', 'Le prêtre éternel selon Melchisédech possède la véritable permanence')
both(1077, 'PSA.109.4', 'Le serment irrévocable établit le prêtre éternel selon l’ordre de Melchisédech')
explain([1077,1078,1079], 'EXO.29.9', 'La perpétuité du sacerdoce d’Aaron est distinguée du serment irrévocable sur Melchisédech.')
explain([1078,1079], 'PSA.109.4', 'L’absence de repentir dans le serment sur Melchisédech marque l’éternité sans changement.')

// Questions CXXV-CXXVI — perfection et imposition des mains.
both(1080, 'EXO.29.9', 'La consécration ou perfection des mains communique le pouvoir sacerdotal')
both(1081, 'EXO.29.10', 'Aaron et ses fils imposent les mains au veau destiné au sacrifice')
add(1081, 'EXO.29.9', 3, 'L’imposition des mains sur la victime explique la perfection annoncée au verset précédent.')

// Question CXXVII — odeur de suavité.
both(1082, 'EXO.29.18', 'Le bélier consumé est une offrande d’agréable odeur au Seigneur')
add(1083, 'EXO.29.18', 3, 'L’odeur respirée par Dieu est interprétée spirituellement et non selon un odorat corporel.')

// Question CXXVIII — part réservée au grand-prêtre.
both(1084, 'EXO.29.26', 'La poitrine du bélier de consécration est réservée comme part d’Aaron')

// Question CXXIX — droit perpétuel, vêtements et accès au sanctuaire.
both(1085, 'EXO.29.28', 'Aaron et ses fils reçoivent perpétuellement la poitrine et l’épaule des sacrifices')
both(1086, 'EXO.29.29', 'Les vêtements saints d’Aaron passent à ses fils pour leur onction et leur consécration')
both(1086, 'EXO.29.30', 'Le successeur d’Aaron porte les vêtements pendant sept jours pour officier dans le sanctuaire')
for (const canon of ['EXO.29.29','EXO.29.30']) explain([1087,1089,1090], canon, 'Le singulier et le pluriel des vêtements, leur consécration et leur port pendant sept jours sont analysés.')
add(1088, 'EXO.29.29', 3, 'Le vêtement saint au singulier rassemble les divers ornements sacerdotaux décrits plus haut.')
explain([1091,1092,1093,1094,1095,1096,1097], 'EXO.29.30', 'Les sept jours et l’entrée du seul successeur d’Aaron dans le Saint sont expliqués par le ministère du grand-prêtre.')
both(1095, 'HEB.9.7', 'Le grand-prêtre seul entre une fois l’an dans la seconde partie du sanctuaire')
both(1097, 'HEB.9.7', 'L’entrée annuelle du seul grand-prêtre dans le Saint des Saints est rappelée')
both(1097, 'HEB.9.11', 'Le grand-prêtre ancien devient une figure expressive du Christ pontife des biens futurs')
add(1098, 'EXO.29.29', 3, 'Le vêtement sacerdotal transmis aux successeurs est interprété comme symbole des sacrements de l’Église.')
both(1098, 'EXO.25.16', 'L’Arche contient le témoignage ou la Loi')
both(1098, 'EXO.25.17', 'Le propitiatoire placé au-dessus de l’Arche figure la miséricorde pour les transgressions')
both(1099, 'EXO.28.30', 'Le rational porte le jugement sur la poitrine du prêtre')
both(1099, 'EXO.28.36', 'La lame d’or porte la sanctification sur le front du grand-prêtre')
both(1099, 'EXO.28.38', 'La lame manifeste le pardon des fautes attachées aux choses saintes')
add(1099, 'EXO.25.16', 3, 'Le rational du jugement est comparé à l’Arche contenant la Loi.')
add(1099, 'EXO.25.17', 3, 'La lame de pardon est comparée au propitiatoire placé au-dessus de l’Arche.')
both(1099, 'JAS.2.13', '« La miséricorde l’emporte sur le jugement » résume le double symbole')

// Question CXXX — consécration de l’autel.
both(1100, 'EXO.29.37', 'L’autel purifié et sanctifié pendant sept jours devient très saint')
both(1100, 'EXO.26.33', 'Le voile sépare le Saint du Saint des Saints où se trouve l’Arche')
both(1101, 'EXO.29.37', '« Quiconque touchera l’autel sera sanctifié »')

const NON_RESOLUS = [
  [1075, 4, 'RÉFÉRENCE NON BIBLIQUE (interprètes non identifiés) : opinion de plusieurs interprètes sur la cidare des prêtres ; cible de corpus à constituer.'],
  [1090, 4, 'RÉFÉRENCE NON BIBLIQUE (renvoi interne) : renvoi explicite à la Question CXXV de la présente œuvre ; cible intertextuelle à constituer.'],
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode CXXI-CXXX', bornes: [PREMIER,DERNIER], segments: NB_SEGMENTS, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '31,70 %' }, null, 2))
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
