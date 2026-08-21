// Lecture intégrale de l'Homélie III au peuple d'Antioche (A0014O0038,
// segments 378-523). Les notes [[51]] à [[87]] sont résolues par le contenu.
// Les types 2, 3 et 4 sont des décisions de lecture, jamais une extraction.
//
//   node scripts/chrysostome-antioche-hom3-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom3-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// [segment_numero, canon_id, type, motif]
const L = [
  [379, 'JHN.10.11', 1, 'citation du bon pasteur qui donne sa vie pour ses brebis ; note [[51]] décalée au segment suivant'],
  [380, 'JHN.10.11', 3, 'l’évêque applique à lui-même le modèle du bon pasteur en risquant sa vie pour son peuple'],
  [382, 'TIT.2.14', 1, 'citation : le Christ s’est donné lui-même pour nous ; note [[52]] imprimée fautivement « Tit. 3 »'],
  [383, 'GEN.31.40', 1, 'citation de Jacob endurant chaleur, froid et nuits sans sommeil ; note [[53]] imprimée « Gen. 29 » et décalée au segment 385'],
  [387, 'EXO.32.31', 1, 'début de la supplication de Moïse pour le pardon du peuple ; note [[54]]'],
  [388, 'EXO.32.32', 1, 'fin de la supplication de Moïse : être effacé avec le peuple si Dieu ne pardonne pas'],
  [389, 'MAT.18.24', 2, 'rappel de la dette des dix mille talents dans la parabole du serviteur impitoyable'],
  [389, 'MAT.18.28', 2, 'rappel de la dette des cent deniers dans la même parabole'],
  [390, 'MAT.18.32', 1, 'citation : mauvais serviteur, je t’ai fait grâce de toute ta dette ; note [[55]]'],
  [390, 'MAT.18.33', 1, 'citation : il fallait faire grâce à son compagnon'],
  [391, 'MAT.6.12', 1, 'citation du Notre Père : pardonnez-nous comme nous pardonnons ; note [[56]]'],
  [396, 'ACT.11.26', 2, 'Antioche est la ville où les disciples reçurent pour la première fois le nom de chrétiens'],
  [402, 'GEN.18.32', 3, 'application à Antioche de la promesse d’épargner Sodome pour dix justes ; note [[57]] imprimée fautivement « Gen. 8 »'],
  [403, 'PRO.19.12', 1, 'citation : la colère du roi est semblable au rugissement du lion'],
  [403, 'ISA.65.25', 1, 'citation : le loup et l’agneau paîtront ensemble ; note [[58]]'],
  [404, 'ISA.11.6', 1, 'suite parallèle de la citation : le léopard avec le chevreau'],
  [404, 'ISA.11.7', 1, 'suite parallèle de la citation : le lion mangera la paille avec le bœuf'],
  [408, 'ISA.30.1', 1, 'citation : conseil pris sans Dieu et traité conclu sans son Esprit ; note [[59]] imprimée fautivement « Ibid. 50 »'],
  [409, 'HOS.8.4', 1, 'citation : ils ont établi des rois sans Dieu ; note [[60]]'],
  [410, 'EST.7.4', 4, 'Esther intercède pour sauver le peuple juif voué à l’extermination ; note [[61]]'],
  [411, 'EST.14.2', 2, 'Esther quitte ses vêtements royaux, prend le sac et la cendre ; note [[62]]'],
  [411, 'EST.14.13', 1, 'citation de la prière d’Esther demandant une parole persuasive ; note [[63]]'],
  [414, 'EPH.6.14', 2, 'reprise de la cuirasse de justice et de la ceinture de vérité'],
  [414, 'EPH.6.17', 2, 'reprise du glaive de l’Esprit dans la panoplie du prêtre'],
  [418, 'EPH.6.12', 1, 'citation : lutte non contre la chair et le sang mais contre les puissances des ténèbres ; note [[64]] imprimée « Ephes. 4 »'],
  [418, 'ROM.13.12', 1, 'citation : prendre les armes de lumière'],
  [421, 'EPH.6.11', 2, 'reprise de l’armure spirituelle dans le combat contre le démon'],
  [421, 'EPH.6.16', 2, 'reprise du bouclier spirituel contre les attaques du démon'],
  [423, '2TI.2.6', 1, 'citation : le laboureur qui travaille doit jouir le premier des fruits ; note [[65]]'],
  [424, '1CO.3.6', 1, 'citation : Paul a planté, Apollos a arrosé, Dieu a donné l’accroissement ; note [[66]]'],
  [425, 'MAT.7.14', 2, 'reprise de la voie étroite et difficile qui conduit au salut'],
  [425, '1CO.9.27', 2, 'reprise : châtier son corps et le réduire en servitude'],
  [428, '2TI.2.5', 1, 'citation : l’athlète n’est couronné que s’il combat selon les règles ; note [[67]] décalée au segment précédent'],
  [429, 'LUK.18.12', 3, 'le jeûne du pharisien ne lui procure aucun fruit ; note [[68]] décalée au segment 427'],
  [430, 'JON.3.10', 2, 'la prière des Ninivites est reçue, contrairement au jeûne sans conversion'],
  [430, '1CO.9.26', 2, 'reprise de la course incertaine et du combat contre une ombre'],
  [432, 'JON.3.7', 3, 'introduction au commentaire du jeûne des hommes et des animaux à Ninive'],
  [433, 'JON.3.7', 1, 'citation : hommes et bêtes ne doivent prendre aucune nourriture ; note [[69]]'],
  [434, 'JON.3.7', 3, 'commentaire du deuil imposé aussi aux animaux de Ninive'],
  [435, 'JON.3.7', 3, 'commentaire : les animaux apprennent par la faim la colère divine'],
  [436, 'JON.3.7', 3, 'commentaire : les animaux partagent la pénitence puisqu’ils partageraient le châtiment'],
  [437, 'JON.3.7', 3, 'commentaire prophétique du recours aux animaux comme intercesseurs'],
  [438, 'JON.3.7', 3, 'fin du commentaire sur la calamité des animaux présentée à Dieu'],
  [439, 'JOL.1.18', 1, 'citation des troupeaux qui gémissent faute de pâturage ; notes [[70]] et [[71]] interverties'],
  [440, 'JOL.1.20', 1, 'citation des bêtes tournées vers Dieu parce que les sources sont taries'],
  [440, 'JER.14.5', 1, 'citation de la biche abandonnant son faon faute d’herbe'],
  [441, 'JER.14.6', 1, 'citation des bêtes sauvages qui aspirent l’air et dont les yeux défaillent'],
  [441, 'JOL.2.16', 1, 'citation : que l’époux sorte de sa chambre et que soient réunis les enfants à la mamelle'],
  [442, 'JOL.2.16', 3, 'question sur la convocation à la prière des enfants encore incapables de parler'],
  [443, 'JOL.2.16', 3, 'explication : l’innocence des enfants intercède pour les adultes coupables'],
  [444, 'JON.3.10', 1, 'citation : Dieu vit les œuvres des Ninivites et leur pardonna ; note [[72]]'],
  [445, 'JON.3.10', 3, 'explication : leur conversion, non le jeûne seul, détourne la colère divine'],
  [453, 'EXO.23.1', 1, 'citation interdisant de recevoir une parole mensongère ; note [[73]]'],
  [454, 'GAL.5.15', 2, 'reprise de l’image paulinienne de ceux qui se mordent et se dévorent ; note [[74]]'],
  [458, 'ROM.2.24', 3, 'application : les fautes des chrétiens exposent le nom de Dieu au blasphème'],
  [459, 'LUK.18.11', 3, 'le pharisien médit du publicain même en disant vrai ; note [[75]]'],
  [461, '2CO.12.21', 1, 'citation de Paul craignant de pleurer ceux qui ne se sont pas repentis ; note [[76]]'],
  [465, 'PSA.100.5', 1, 'citation : poursuivre celui qui médit en secret de son prochain ; note [[77]] imprimée « Psal. 00 »'],
  [472, 'SIR.19.10', 1, 'citation : qu’une parole entendue meure en toi ; note [[78]] « Eccl. 19 »'],
  [479, 'MAT.12.36', 2, 'reprise de l’obligation de rendre compte de toute parole oiseuse'],
  [480, 'JAS.2.13', 2, 'reprise : celui qui n’a pas fait miséricorde subira un jugement sans miséricorde'],
  [480, 'MAT.7.2', 3, 'le jugement porté contre autrui alourdit le jugement de ses propres fautes ; note [[79]]'],
  [481, 'LUK.6.37', 1, 'citation : ne jugez pas afin de ne pas être jugés ; note [[80]]'],
  [482, 'MAT.15.11', 1, 'citation : ce qui entre dans la bouche ne souille pas l’homme ; note [[81]]'],
  [482, 'MRK.7.15', 1, 'citation parallèle : ce qui sort de l’homme le souille ; note [[82]]'],
  [499, 'PSA.105.2', 1, 'citation : qui dira les puissances du Seigneur et publiera toutes ses louanges ; note [[83]] « Psal. 105 »'],
  [501, '1CO.11.7', 1, 'citation : l’homme ne se couvre pas la tête parce qu’il est l’image de Dieu ; note [[84]]'],
  [501, 'GEN.1.26', 1, 'citation : Dieu a fait l’homme à son image et à sa ressemblance ; note [[85]] décalée au segment suivant'],
  [502, 'GEN.1.26', 3, 'commentaire : l’image n’a pas besoin d’être de même matière que son modèle'],
  [503, 'GEN.1.26', 3, 'commentaire : la différence de substance n’abolit pas la dignité de l’image divine'],
  [504, 'GEN.1.26', 3, 'application morale : outrager l’homme revient à outrager l’image de Dieu'],
  [516, 'GEN.42.21', 1, 'citation des frères de Joseph reconnaissant leur faute dans l’épreuve ; note [[86]]'],
  [520, 'MAT.25.8', 4, 'écho des vierges folles qui demandent l’huile de leurs compagnes ; note [[87]]'],
  [520, 'MAT.25.9', 4, 'écho du refus d’emprunter l’huile nécessaire au dernier moment'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, id_oeuvre, segment_numero').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 378).lte('segment_numero', 523).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 146) throw new Error(`146 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s.id]))

const cibles = [...new Set(L.map((l) => l[1]))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const rows = L.map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero), canon_id, type, fiabilite: P,
  motif, provenance: 'lecture', arbitrage_requis: false,
}))
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie III : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 146 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map((l) => `${l.segment_id}|${l.canon_id}|${l.type}`))
const aEcrire = rows.filter((l) => !deja.has(`${l.segment_id}|${l.canon_id}|${l.type}`))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

if (!WRITE) {
  console.log('(--dry : rien écrit)')
  process.exit(0)
}

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie III',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
