// Lecture intégrale de l'Homélie XVII au peuple d'Antioche (A0014O0038,
// segments 1744-1834). Les références [[309]] à [[321]] sont reconstruites,
// corrigées et réancrées ; douze références perdues sont restaurées en notes.
//
//   node scripts/chrysostome-antioche-hom17-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom17-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// Règle appliquée : la mécanique ne peut produire que du type 1, une
// proposition de type 2 douteuse ou une cible « à constituer ». Les types 2,
// 3 et 4 ci-dessous proviennent tous de la lecture intégrale de l'homélie.

const plage = (debut, fin, canon, motif) => Array.from(
  { length: fin - debut + 1 }, (_, i) => [debut + i, canon, 3, motif],
)

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [1744, 'PSA.71.18', 1, 'citation liturgique annoncée : béni soit le Dieu d’Israël qui seul opère des merveilles ; référence marginale « Psal. 71 » perdue par l’import'],
  [1746, '1TH.5.18', 2, 'paraphrase de Paul prescrivant de rendre grâce à Dieu en toute circonstance ; note [[309]] réancrée, dont le chapitre imprimé « Thess. 1 » est fautif'],
  [1747, 'ROM.8.28', 2, 'reprise fondue de toutes choses concourant au bien de celui qui aime Dieu ; référence absente de l’import'],
  [1750, 'PSA.77.34', 1, 'citation annoncée de ceux qui cherchent Dieu lorsqu’il les frappe ; note [[310]]'],
  [1751, 'DEU.6.11', 2, 'reprise du rassasiement qui précède l’avertissement de Moïse ; le fac-similé corrige [[311]] de « Deut. 8 » en « Deut. 6 »'],
  [1751, 'DEU.6.12', 2, 'reprise fondue de l’avertissement de ne pas oublier le Seigneur après avoir mangé et été rassasié ; note [[311]] corrigée'],
  [1761, 'GEN.1.27', 2, 'reprise de l’homme comme image du Dieu vivant, opposée aux statues impériales réparables ; référence biblique non signalée dans l’import'],
  [1795, 'ACT.11.26', 2, 'reprise narrative des disciples appelés chrétiens pour la première fois à Antioche ; référence marginale absorbée « Act. 11 »'],
  [1797, 'ACT.11.28', 2, 'reprise de la grande famine annoncée sous Claude ; référence du second titre d’Antioche restituée'],
  [1797, 'ACT.11.29', 2, 'reprise de la collecte décidée selon les facultés de chacun pour les frères de Judée'],
  [1799, 'ACT.15.1', 2, 'reprise narrative des hommes venus de Judée introduire les observances judaïques à Antioche ; note [[312]]'],
  [1799, 'ACT.15.2', 2, 'reprise narrative de l’envoi de Paul et Barnabé à Jérusalem pour trancher la controverse ; note [[312]]'],
  [1804, 'MAT.21.13', 1, 'citation directe du Temple devenu caverne de voleurs ; note [[314]] réancrée'],
  [1804, 'LUK.19.46', 1, 'parallèle éditorial de la citation du Temple devenu caverne de voleurs ; note [[315]] réancrée'],
  [1804, 'JER.7.11', 1, 'source prophétique directe de la caverne de voleurs, absente des notes françaises mais attestée par la formulation et le témoin parallèle'],
  [1805, 'GEN.13.10', 2, 'reprise fondue de la plaine de Sodome comparée au paradis de Dieu ; référence absente de l’import'],
  [1806, 'GEN.14.11', 2, 'reprise narrative du pillage de Sodome par les vainqueurs'],
  [1806, 'GEN.14.12', 2, 'reprise narrative de l’enlèvement des habitants de Sodome'],
  [1806, 'GEN.14.14', 2, 'reprise narrative d’Abraham poursuivant les ravisseurs'],
  [1806, 'GEN.14.15', 2, 'reprise narrative d’Abraham mettant les vainqueurs en fuite'],
  [1806, 'GEN.14.16', 2, 'reprise narrative d’Abraham ramenant les captifs et leurs biens'],
  [1807, 'PHP.3.20', 2, 'reprise fondue de la citoyenneté située dans le ciel'],
  [1808, 'HEB.11.13', 2, 'reprise fondue des croyants étrangers et voyageurs sur toute la terre'],
  [1815, 'ROM.9.27', 1, 'citation annoncée du reste sauvé lorsque les fils d’Israël seraient comme le sable de la mer ; note [[316]] réancrée'],
  [1816, 'MAT.23.37', 1, 'citation directe de la lamentation sur Jérusalem qui tue les prophètes ; note [[317]]'],
  [1826, '1SA.17.49', 2, 'reprise narrative de David terrassant Goliath d’une pierre de fronde ; note [[318]]'],
  [1826, '1SA.17.50', 2, 'suite narrative : David sans épée triomphe du Philistin ; note [[318]]'],
  [1827, 'SIR.11.2', 1, 'citation annoncée de l’avertissement à ne louer ni mépriser un homme d’après son apparence ; note [[319]]'],
  [1827, 'SIR.11.3', 1, 'suite directe de la citation : l’abeille est petite mais son fruit est très doux ; note [[319]]'],
  [1829, 'HEB.13.3', 2, 'reprise de la solidarité avec les prisonniers et les malheureux comme partageant leur condition ; référence absente de l’import'],
  [1830, 'ROM.12.15', 1, 'citation fondamentalement littérale de l’exhortation à pleurer avec ceux qui pleurent ; note [[320]] réancrée'],
  [1830, 'ROM.12.16', 2, 'reprise de la condescendance fraternelle rendue par le partage des passions des frères ; note [[320]]'],
  [1833, 'DAN.3.27', 1, 'citation directe de la prière d’Azarias : Dieu est juste dans tout ce qu’il a fait contre son peuple ; référence absente de l’import'],
  [1833, 'DAN.3.31', 2, 'reprise condensée de la justice des châtiments reçus'],
  [1834, 'MAT.6.13', 1, 'citation directe de la fin du Notre Père : ne pas entrer en tentation et être délivré du mal ; note [[321]]'],
]

const COMMENTAIRES = [
  ...plage(1744, 1745, 'PSA.71.18', 'application du chant du psaume à la délivrance merveilleuse d’Antioche'),
  ...plage(1745, 1747, '1TH.5.18', 'commentaire de l’action de grâce due aussi bien pour l’épreuve que pour la délivrance'),
  ...plage(1747, 1747, 'ROM.8.28', 'application de toutes choses concourant au bien à la tempête traversée par Antioche'),
  ...plage(1750, 1753, 'PSA.77.34', 'application du retour vers Dieu dans l’épreuve à la nécessité de persévérer après le danger'),
  ...plage(1751, 1753, 'DEU.6.12', 'application de l’avertissement de Moïse : ne pas oublier Dieu une fois rassasié et délivré'),
  ...plage(1760, 1761, 'GEN.1.27', 'application de l’image de Dieu à la valeur irréparable de la vie humaine, opposée aux statues de l’empereur'),
  ...plage(1794, 1796, 'ACT.11.26', 'commentaire du premier titre véritable d’Antioche : le nom de chrétiens y fut donné pour la première fois'),
  ...plage(1797, 1798, 'ACT.11.28', 'commentaire du deuxième titre d’Antioche : la charité exercée pendant la famine'),
  ...plage(1797, 1798, 'ACT.11.29', 'commentaire de la collecte proportionnée aux facultés de chacun pour Jérusalem'),
  ...plage(1799, 1800, 'ACT.15.1', 'commentaire du troisième titre d’Antioche : résistance aux innovations judaïsantes'),
  ...plage(1799, 1800, 'ACT.15.2', 'commentaire de l’envoi de Paul et Barnabé au concile de Jérusalem'),
  ...plage(1804, 1804, 'MAT.21.13', 'application de la caverne de voleurs à la déchéance d’un Temple magnifique lorsque ses ministres se corrompent'),
  ...plage(1804, 1804, 'LUK.19.46', 'application parallèle de la caverne de voleurs à la corruption du Temple'),
  ...plage(1804, 1804, 'JER.7.11', 'application de l’oracle prophétique de la caverne de voleurs à la profanation du Temple'),
  ...plage(1805, 1806, 'GEN.13.10', 'comparaison entre la magnificence de Sodome, semblable au paradis, et la tente sans défense d’Abraham'),
  ...plage(1805, 1806, 'GEN.14.11', 'commentaire de la fragilité des villes fortifiées de Sodome face aux envahisseurs'),
  ...plage(1805, 1806, 'GEN.14.15', 'commentaire de la piété d’Abraham comme puissance supérieure aux forteresses et aux armées'),
  ...plage(1814, 1815, 'ROM.9.27', 'commentaire du petit reste vertueux opposé à une multitude vicieuse'),
  ...plage(1816, 1817, 'MAT.23.37', 'commentaire de la lamentation du Christ comme jugement moral sur Jérusalem'),
  ...plage(1825, 1827, '1SA.17.49', 'application de David petit et désarmé terrassant Goliath à la supériorité de la vertu sur l’apparence'),
  ...plage(1825, 1827, 'SIR.11.2', 'commentaire de l’avertissement du Siracide à juger de l’homme par l’âme plutôt que par le corps'),
  ...plage(1825, 1827, 'SIR.11.3', 'application de la petitesse féconde de l’abeille à l’évaluation des hommes et des cités'),
  ...plage(1828, 1830, 'HEB.13.3', 'application de la solidarité avec les prisonniers au sort des condamnés et exilés d’Antioche'),
  ...plage(1829, 1830, 'ROM.12.15', 'application de l’exhortation à pleurer avec les affligés'),
  ...plage(1829, 1830, 'ROM.12.16', 'application de la condescendance et de la communion fraternelles'),
  ...plage(1833, 1834, 'DAN.3.27', 'appropriation pénitentielle de la prière d’Azarias par les habitants d’Antioche'),
  ...plage(1834, 1834, 'MAT.6.13', 'conclusion de la supplication par les paroles du Notre Père'),
]

const CHAPITRES = [
  [1799, 1800, 'ACT', 15, 'commentaire d’ensemble du concile de Jérusalem comme troisième titre spirituel d’Antioche'],
  [1801, 1804, '1KI', 6, 'commentaire d’ensemble du Temple de Salomon : magnificence de sa construction puis déchéance causée par la corruption de ses ministres ; note [[313]]'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 1744).lte('segment_numero', 1834).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 91) throw new Error(`91 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set([...VERSETS, ...COMMENTAIRES].map((l) => l[1]))]
const { data: versets, error: erreurVersets } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurVersets) throw erreurVersets
const presentes = new Set((versets ?? []).map((v) => v.id_verset))
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

for (const [, , livre, chapitre] of CHAPITRES) {
  const { count, error } = await sb.from('versets_canon').select('id', { count: 'exact', head: true })
    .eq('livre', livre).eq('ch_canon', chapitre)
  if (error) throw error
  if (!count) throw new Error(`Chapitre cible absent : ${livre}.${chapitre}`)
}

const rows = [
  ...[...VERSETS, ...COMMENTAIRES].map(([numero, canon_id, type, motif]) => ({
    segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
    type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...CHAPITRES.flatMap(([debut, fin, livre, chapitre, motif]) => Array.from(
    { length: fin - debut + 1 }, (_, i) => ({
      segment_id: parNumero.get(debut + i)?.id, canon_id: null, livre, chapitre,
      type: 3, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
    }),
  )),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? `${l.livre}.${l.chapitre}`}|${l.type}|${l.motif}`
if (new Set(rows.map(cleLien)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XVII : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 91 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

for (const segment of segments) segment.segment_texte_corrige = segment.segment_texte
for (const segment of segments) {
  for (const marqueur of [
    ...Array.from({ length: 13 }, (_, i) => String(309 + i)),
    'H17P', 'H17R', 'H17G', 'H17A1', 'H17A2', 'H17J', 'H17S1', 'H17S2',
    'H17P3', 'H17H1', 'H17H2', 'H17D',
  ]) segment.segment_texte_corrige = segment.segment_texte_corrige.replaceAll(`[[${marqueur}]]`, '')
}
const corriger = (numero, avant, apres) => {
  const segment = parNumero.get(numero)
  if (!segment.segment_texte_corrige.includes(avant)) {
    if (segment.segment_texte_corrige.includes(apres)) return
    throw new Error(`Correction introuvable au segment ${numero} : ${avant}`)
  }
  segment.segment_texte_corrige = segment.segment_texte_corrige.replace(avant, apres)
}
const deplacer = (marqueur, numero, ancre) => corriger(numero, ancre, `${ancre}[[${marqueur}]]`)

// Nettoyage limité aux corruptions certaines relevées pendant le contrôle.
corriger(1744, 'il appartient A d’operer', 'il appartient d’operer')
corriger(1745, 'S.', '')
corriger(1747, 'tournent nent', 'tournent')
corriger(1747, 'je! disois', 'je disois')
corriger(1748, 'sont Plus necessaires', 'sont plus necessaires')
corriger(1755, 'garene tir', 'garentir')
corriger(1758, 'jusques a ce', 'jusques à ce')
corriger(1758, 'accompagner lecoupables', 'accompagner les coupables')
corriger(1762, 'du oheval', 'du cheval')
corriger(1765, 'parlé aux. Juges', 'parlé aux Juges')
corriger(1765, 'au roient-ils', 'auroient-ils')
corriger(1767, 'monstrueuf Cyniques', 'monstrueux Cyniques')
corriger(1767, '& plus, mpudens', '& plus impudens')
corriger(1769, 'profession-d’une', 'profession d’une')
corriger(1769, 'vinrent parmy: nous', 'vinrent parmy nous')
corriger(1769, 'n’y eûr point', 'n’y eût point')
corriger(1775, 'magnànimité', 'magnanimité')
corriger(1775, 'unc faveur', 'une faveur')
corriger(1778, 'Mm ui heroïque', 'heroïque')
corriger(1780, 'mauvaise impresfion', 'mauvaise impression')
corriger(1784, 'dégulsemens', 'déguisemens')
corriger(1784, 'Mais les-Prêtres', 'Mais les Prêtres')
corriger(1793, 'Comparez se châtiment a l’offense', 'Comparez ce châtiment à l’offense')
corriger(1794, 'maisçavez-vous', 'mais sçavez-vous')
corriger(1795, 'dans ses muts', 'dans ses murs')
corriger(1802, 'marques de l’amouf', 'marques de l’amour')
corriger(1806, 'les Batbares', 'les Barbares')
corriger(1806, 'victorieux, II n’y', 'victorieux. Il n’y')
corriger(1813, 'Antioche infortunéc', 'Antioche infortunée')
corriger(1828, 'remerctons', 'remercions')
corriger(1828, 'les prisonners', 'les prisonniers')

deplacer('H17P', 1744, 'à qui seul il appartient d’operer des merveilles')
deplacer('309', 1746, 'Paul veut qu’on louë Dieu de tout')
deplacer('H17R', 1747, 'toutes choses tournent à l’avantage de celuy qui aime le Seigneur')
deplacer('310', 1750, 'ils couroient à luy dès le matin')
deplacer('311', 1751, 'de n’oublier point Dieu aprés le repas')
deplacer('H17G', 1761, 'les Images du Dieu vivant')
deplacer('H17A1', 1795, 'le nom de Chrétiens')
deplacer('H17A2', 1797, 'aux pauvres de Jerusalem les choses qui leur seroient necessaires')
deplacer('312', 1799, 'à purger le monde de cette superstition Judaique')
deplacer('313', 1802, 'Ce Temple')
deplacer('314', 1804, 'une caverne de larrons')
deplacer('315', 1804, 'une caverne de larrons[[314]]')
deplacer('H17J', 1804, 'une caverne de larrons[[314]][[315]]')
deplacer('H17S1', 1805, 'On le comparoit à un Paradis terrestre')
deplacer('H17S2', 1806, 'mais le solitaire Abraham mit en fuïte ces victorieux')
deplacer('H17P3', 1807, 'c’est au Ciel qu’est vôtre demeure')
deplacer('H17H1', 1808, 'nous n’y sommes qu’hôtes & passagers')
deplacer('316', 1815, 'quand le nombre seroit égal aux arenes de la Mer')
deplacer('317', 1816, 'tu jettes des pierres à ceux qui te viennent enseigner')
deplacer('318', 1826, 'ce Colosse armé qui le menaçoit')
deplacer('319', 1827, 'son miel est le principe de toute douceur')
deplacer('H17H2', 1829, 'soyons malades avec ceux qui se portent mal')
deplacer('320', 1830, 'pleurons avec les affligez')
deplacer('H17D', 1833, 'Oüy, nous souffrons avec justice')
deplacer('321', 1834, 'Ne nous induisez point en tentation, & délivrez-nous du mal')

const notesAttendues = new Map([
  [1744, '[[H17P]] Psal. 71.'],
  [1746, '[[309]] Thess. 1.'],
  [1747, '[[H17R]] Rom. 8.'],
  [1750, '[[310]] Psal. 77.'],
  [1751, '[[311]] Deut. 6.'],
  [1761, '[[H17G]] Genes. 1.'],
  [1795, '[[H17A1]] Act. 11.'],
  [1797, '[[H17A2]] Act. 11.'],
  [1799, '[[312]] Act. 15.'],
  [1802, '[[313]] 1. Reg. 6.'],
  [1804, '[[314]] Matt. 21.\n[[315]] Luc. 19.\n[[H17J]] Jerem. 7.'],
  [1805, '[[H17S1]] Genes. 13.'],
  [1806, '[[H17S2]] Genes. 14.'],
  [1807, '[[H17P3]] Philip. 3.'],
  [1808, '[[H17H1]] Hebr. 11.'],
  [1815, '[[316]] Rom. 9.'],
  [1816, '[[317]] Matt. 23.'],
  [1826, '[[318]] 1. Reg. 17.'],
  [1827, '[[319]] Eccl. 11.'],
  [1829, '[[H17H2]] Hebr. 13.'],
  [1830, '[[320]] Rom. 12.'],
  [1833, '[[H17D]] Dan. 3.'],
  [1834, '[[321]] Matt. 6.'],
])

const appels = segments.flatMap((s) => [...s.segment_texte_corrige.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = [...notesAttendues.values()].flatMap((n) => [...n.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 25 || definitions.length !== 25 || new Set(appels).size !== 25
  || appels.some((m) => !definitions.includes(m)) || definitions.some((m) => !appels.includes(m)))
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

if (!WRITE) {
  console.log('25 appels/25 définitions de notes reconstruits (--dry : rien écrit)')
  process.exit(0)
}

for (const segment of segments) {
  const notes = notesAttendues.get(segment.segment_numero) ?? null
  if (segment.segment_texte_corrige !== segment.segment_texte || notes !== segment.notes) {
    const { error } = await sb.from('segments').update({ segment_texte: segment.segment_texte_corrige, notes }).eq('id', segment.id)
    if (error) throw error
  }
}
for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XVII',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus ; notes réancrées`)
