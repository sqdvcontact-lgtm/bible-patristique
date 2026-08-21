import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = ['Question XCI','Question XCII','Question XCIII','Question XCIV','Question XCV','Question XCVI','Question XCVII','Question XCVIII','Question XCIX','Question C']
const PREMIER = 968
const DERNIER = 995
const NB_SEGMENTS = 28
const EMPREINTE_ATTENDUE = '1a34f510eec5f5f19eeea8421314e302f96a96182b0ff13fe6e6a3255490f454'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. XCI-C'

const LIENS = []
const add = (n, canon, type, motif) => LIENS.push([n, canon, type, motif])
const both = (n, canon, motif) => {
  add(n, canon, 1, `${motif} — citation ou référence intentionnelle.`)
  add(n, canon, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (nums, canon, motif) => nums.forEach(n => add(n, canon, 3, motif))

// Question XCI — l’ange conducteur identifié à Josué.
for (const canon of ['EXO.23.20','EXO.23.21']) both(968, canon, 'L’ange envoyé devant Israël pour le garder et le conduire doit être écouté')
explain([969], 'EXO.23.20', 'L’ange qui introduit le peuple dans la terre préparée est identifié à Josué.')
add(969, 'EXO.23.21', 3, 'Le nom divin porté par le conducteur nourrit l’interprétation du nom de Jésus ou Josué.')
both(969, 'NUM.13.16', 'Moïse change le nom d’Osée, fils de Nun, en Josué')
both(969, 'DEU.31.23', 'Josué reçoit la mission d’introduire Israël dans la terre promise')

// Question XCII — promesses temporelles de l’ancienne Alliance.
both(970, 'EXO.23.25', 'Le service de Dieu reçoit bénédiction du pain et de l’eau et éloignement de la maladie')
both(970, 'EXO.23.26', 'L’absence de stérilité et l’accomplissement du nombre des jours sont promis')
both(971, 'EXO.23.27', 'Dieu envoie sa terreur devant Israël et met les nations en fuite')
for (const canon of ['EXO.23.25','EXO.23.26']) explain([971], canon, 'Ces récompenses terrestres caractérisent l’ancienne Alliance et sont opposées aux biens du nouveau Testament.')
for (const canon of ['EXO.23.25','EXO.23.26','EXO.23.27']) explain([972,973,974,975], canon, 'Ces récompenses terrestres caractérisent l’ancienne Alliance et sont opposées aux biens du nouveau Testament.')
for (const canon of ['PSA.72.2','PSA.72.3','PSA.72.12']) both(973, canon, 'Le psalmiste chancelle en voyant la paix et l’abondance temporelle des impies')
both(974, 'PSA.72.11', 'La pensée impie demande comment Dieu pourrait connaître les choses humaines')
both(974, 'PSA.72.16', 'Comprendre la prospérité des impies est d’abord un travail difficile')
both(974, 'PSA.72.17', 'L’entrée dans le sanctuaire révèle la fin réservée aux impies')

// Question XCIII — les frelons promis et attestés par la Sagesse.
both(976, 'EXO.23.28', 'Dieu promet d’envoyer des frelons devant Israël pour chasser les peuples de Chanaan')
both(976, 'WIS.12.8', 'La Sagesse affirme que Dieu envoya des frelons comme avant-coureurs de son armée')
explain([977,978,979], 'EXO.23.28', 'L’absence de récit littéral conduit à comprendre les frelons comme aiguillons figurés de la crainte.')
add(977, 'WIS.12.8', 3, 'Le témoignage de la Sagesse est concilié avec l’absence de narration historique du prodige.')

// Question XCIV — service et adoration.
both(980, 'EXO.23.33', 'Servir les dieux des nations devient un piège pour Israël')

// Question XCV — portée des ordonnances.
both(981, 'EXO.24.1', 'Moïse, Aaron, Nadab, Abiu et les anciens sont appelés à adorer de loin')
both(981, 'EXO.24.2', 'Moïse seul s’approche du Seigneur tandis que les autres restent éloignés')
both(982, 'EXO.24.3', 'Moïse rapporte les paroles et ordonnances, auxquelles le peuple promet d’obéir')
add(983, 'EXO.24.3', 3, 'Les ordonnances rapportées au peuple sont suivies rétrospectivement depuis leur première mention.')
both(983, 'EXO.21.1', 'La série est introduite comme celle des ordonnances ou jugements')
both(983, 'EXO.21.2', 'La première ordonnance règle le service de l’esclave hébreu')
both(983, 'EXO.21.6', 'L’oreille de l’esclave qui reste est percée contre le poteau')
add(984, 'EXO.24.3', 3, 'Le terme grec des ordonnances est distingué des seules règles morales.')
add(984, 'EXO.21.1', 3, 'Le vocabulaire des ordonnances ouvre une série mêlant morale et figures mystérieuses.')

// Question XCVI — faire avant de comprendre.
both(985, 'EXO.24.3', 'La seconde réponse du peuple est transmise selon la variante « nous ferons et nous écouterons »')
both(985, 'EXO.19.8', 'La première promesse collective d’accomplir les paroles de Dieu est implicitement comptée')
explain([986,987], 'EXO.24.3', 'Faire avant d’écouter est interprété comme obéir humblement avant de comprendre.')
both(987, 'MAT.21.30', 'Le fils qui promet d’aller à la vigne mais n’y va pas figure la promesse non tenue')
both(987, 'ROM.9.30', 'Les Gentils qui ne poursuivaient pas la justice l’ont finalement atteinte')

// Question XCVII — l’autel et les douze pierres.
both(988, 'EXO.24.4', 'Moïse bâtit l’autel et dresse douze pierres pour les douze tribus')
both(988, '2CO.6.16', 'Le peuple est interprété comme temple du Dieu vivant')

// Question XCVIII — victime, calice et Sauveur.
both(989, 'EXO.24.5', 'L’expression grecque « victime du salut » est examinée')
both(989, 'PSA.115.13', 'Le parallèle « calice du salut » confirme le génitif plutôt que l’adjectif')
add(990, 'EXO.24.5', 3, 'La victime du salut est interprétée comme une annonce personnelle du Sauveur.')
both(990, 'LUK.2.30', 'Siméon déclare que ses yeux ont vu le salut ou Sauveur de Dieu')
both(990, 'PSA.95.2', '« Annoncez de jour en jour son salut » est lu comme annonce du Sauveur')
add(991, 'PSA.95.2', 3, '« De jour en jour » reçoit une interprétation christologique de la lumière née de la lumière.')

// Question XCIX — sang, livre de l’alliance et premier sacrifice.
both(992, 'EXO.24.6', 'Moïse partage le sang entre les coupes et l’autel')
both(992, 'EXO.24.7', 'Moïse prend ensuite le livre de l’alliance et le lit devant le peuple')
explain([993], 'EXO.24.6', 'L’effusion du sang accompagne la lecture du livre de l’alliance.')
explain([993], 'EXO.24.7', 'Le livre lu en même temps que le sacrifice contient les ordonnances divines.')
both(993, 'EXO.18.12', 'Le sacrifice antérieur offert par Jéthro est rappelé comme cas ambigu')
both(994, 'EXO.31.18', 'Les tables de pierre écrites par Dieu ne sont données que plus tard')

// Question C — troisième répétition de la réponse.
both(995, 'EXO.24.7', 'Le peuple répond pour la troisième fois : « Nous ferons et nous écouterons »')
add(995, 'EXO.19.8', 3, 'La première réponse identique est incluse dans le décompte des trois occurrences.')
add(995, 'EXO.24.3', 3, 'La deuxième réponse identique est incluse dans le décompte des trois occurrences.')

const NON_RESOLUS = [
  [991, 4, 'RÉFÉRENCE NON BIBLIQUE (formule doctrinale) : reprise de la formule du symbole de Nicée « lumière de la lumière, Dieu de Dieu » ; cible de corpus à constituer.'],
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode XCI-C', bornes: [PREMIER,DERNIER], segments: NB_SEGMENTS, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '29,64 %' }, null, 2))
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
