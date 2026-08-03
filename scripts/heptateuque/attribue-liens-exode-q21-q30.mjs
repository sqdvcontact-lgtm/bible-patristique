import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = ['Question XXI','Question XXII','Question XXIII','Question XXIV','Question XXV','Question XXVI','Question XXVII','Question XXVIII','Question XXIX','Question XXX']
const PREMIER = 637
const DERNIER = 678
const NB_SEGMENTS = 42
const EMPREINTE_ATTENDUE = '1688f6be7b2756ab772a960e2705a85e96e8ff4b68a8866f0c603eb9e776c4b8'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. XXI-XXX'

const LIENS = []
const add = (n, canon, type, motif) => LIENS.push([n, canon, type, motif])
const both = (n, canon, motif) => {
  add(n, canon, 1, `${motif} — référence ou citation intentionnelle.`)
  add(n, canon, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (nums, canon, motif) => nums.forEach(n => add(n, canon, 3, motif))

// Question XXI — les verges changées en serpents.
both(637, 'EXO.7.12', 'La verge d’Aaron dévore les verges des magiciens')
both(638, 'EXO.7.12', 'La formule « la verge d’Aaron dévora leurs verges » est reprise textuellement')
explain([639,640,641,642,643,644], 'EXO.7.12', 'La réalité du changement et la causalité des prodiges prolongent l’exégèse d’Exode 7,12.')

// Question XXII — premier motif de l’endurcissement.
both(645, 'EXO.7.22', 'Les magiciens imitent le prodige et le cœur de Pharaon s’endurcit')
add(646, 'EXO.7.22', 3, 'L’imitation des magiciens demeure le premier motif examiné de l’endurcissement.')
both(646, 'EXO.8.14', 'L’impuissance ultérieure des magiciens à produire les moustiques est annoncée')

// Question XXIII — imitation des deux premières plaies.
both(647, 'EXO.8.3', 'Les magiciens font monter des grenouilles sur l’Égypte')
both(647, 'EXO.7.22', 'Le changement de l’eau en sang par les magiciens est explicitement rapproché')
explain([648,649], 'EXO.8.3', 'La provenance des grenouilles produites par les magiciens est discutée.')
explain([648,649], 'EXO.7.22', 'Le prodige magique de l’eau changée en sang reste le parallèle directeur.')

// Question XXIV — patience divine et endurcissement.
both(650, 'EXO.8.11', 'Pharaon profite du relâchement puis endurcit son cœur')
explain([651,652,653,654,655,656], 'EXO.8.11', 'La patience accordée à Pharaon fournit le cas directeur du développement moral.')
for (const canon of ['ROM.2.4','ROM.2.5','ROM.2.6']) both(652, canon, 'La séquence paulinienne sur la patience, l’impénitence et le jugement est citée')
both(653, '2CO.2.15', 'La bonne odeur du Christ parmi ceux qui se sauvent et ceux qui se perdent est citée')
add(654, '2CO.2.15', 3, 'La bonne odeur du Christ est appliquée aux effets opposés produits dans les âmes.')
both(655, 'PSA.118.175', '« Mon âme vivra et vous louera ; et vos jugements me soutiendront »')
both(655, 'PSA.25.2', '« Éprouvez-moi, Seigneur, sondez-moi ; brûlez mes reins et mon cœur »')
add(656, 'PSA.25.2', 3, 'La demande d’épreuve du verset précédent reçoit son correctif dans la miséricorde divine.')
both(656, 'PSA.25.3', '« Votre miséricorde est devant mes yeux, et je me suis complu dans votre vérité »')
both(656, 'PSA.24.10', '« Toutes les voies du Seigneur sont miséricorde et vérité »')

// Question XXV — le doigt de Dieu et la troisième plaie.
both(657, 'EXO.8.15', 'Les magiciens confessent : « Le doigt de Dieu est ici »')
both(657, 'EXO.8.14', 'L’impuissance des magiciens à produire les moustiques est explicitement rappelée')
add(658, 'EXO.8.15', 3, 'Le doigt de Dieu confessé par les magiciens est identifié au Saint-Esprit.')
both(658, 'LUK.11.20', '« Si je chasse les démons par le doigt de Dieu »')
both(658, 'MAT.12.28', 'Le parallèle évangélique remplace « doigt de Dieu » par « Esprit de Dieu »')
explain([659,660,661,662,663], 'EXO.8.15', 'La défaite des magiciens à la troisième plaie et le doigt de Dieu demeurent le sujet directeur.')
for (const [canon, motif] of [
  ['EXO.7.20', 'Le changement de l’eau en sang est nommé comme première plaie.'],
  ['EXO.8.2', 'La montée des grenouilles est nommée comme deuxième plaie.'],
  ['EXO.8.13', 'La poussière changée en moustiques constitue la troisième plaie.'],
]) {
  add(660, canon, 1, motif)
  add(661, canon, 3, motif)
}
both(661, 'EXO.7.12', 'Le changement initial de la verge en serpent est rappelé comme premier prodige')

// Question XXVI — distinction de la terre de Gessen.
for (const canon of ['EXO.8.17','EXO.8.18','EXO.8.19']) both(664, canon, 'La menace des mouches et la séparation de Gessen sont citées')
for (const canon of ['EXO.8.17','EXO.8.18','EXO.8.19']) explain([665,666,667], canon, 'La séparation entre l’Égypte et Gessen est étendue aux plaies voisines.')
both(666, 'EXO.8.13', 'Les moustiques remplissant l’Égypte sont rappelés')
both(666, 'EXO.8.14', 'L’échec des magiciens à produire les moustiques est rappelé')
add(667, 'EXO.8.14', 3, 'L’impuissance des magiciens marque le seuil où la séparation des deux pays est explicitée.')

// Questions XXVII-XXVIII — lieu et matière du sacrifice.
both(668, 'EXO.8.21', 'Pharaon permet ironiquement de sacrifier dans le pays d’Égypte')
both(669, 'EXO.8.22', 'La réponse de Moïse invoque l’abomination et le risque de lapidation')
both(670, 'EXO.8.22', 'Moïse refuse de sacrifier sous les yeux des Égyptiens ce qu’ils tiennent pour abominable')
explain([671,672], 'EXO.8.22', 'Les traductions latines d’Exode 8,22 sont confrontées au sens du passage.')
both(673, 'EXO.8.22', 'Le texte sans particule négative est de nouveau cité et expliqué')
add(674, 'EXO.8.22', 3, 'L’abomination des sacrifices israélites reçoit une interprétation morale.')
both(674, 'GEN.46.34', 'Les pasteurs détestés des Égyptiens et établis à part en Gessen fournissent le parallèle explicite')

// Questions XXIX-XXX — progression de l’endurcissement.
both(675, 'EXO.8.28', 'Pharaon endurcit volontairement son cœur après le retrait des mouches')
add(676, 'EXO.8.28', 3, 'L’acte volontaire de Pharaon sert d’exemple au principe volontaire des vices.')
both(677, 'EXO.9.7', 'Aucun animal d’Israël n’est mort, mais le cœur de Pharaon s’endurcit')
add(678, 'EXO.9.7', 3, 'L’endurcissement malgré la préservation des troupeaux d’Israël est expliqué.')

const NON_RESOLUS = [
  [663, 4, 'RÉFÉRENCE NON BIBLIQUE (Père de l’Église) : renvoi à l’ouvrage de Didyme l’Aveugle sur le Saint-Esprit, livre I ; cible de corpus à constituer.'],
]
const SANS_LIEN = new Set()

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1],m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,segment_numero,segment_texte,texte_original,notes,nature,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER).lte('segment_numero', DERNIER).order('segment_numero')
if (e0) throw e0
// La sélection bornée évite les variations d’encodage de l’accent dans PostgREST ;
// le périmètre exact est ensuite contrôlé en mémoire.
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode XXI-XXX', bornes: [PREMIER,DERNIER], segments: NB_SEGMENTS, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '18,39 %' }, null, 2))
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
