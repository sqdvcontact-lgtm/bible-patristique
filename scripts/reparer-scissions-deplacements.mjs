// RÉPARATION. Ce matin, six corrections d'alignement ont été appliquées comme des
// DÉPLACEMENTS DE TEXTE : le fragment était retiré d'un verset et fondu dans le verset voisin.
//
// C'était faux, et c'est la faute que la charte interdit en premier. Quand un verset de
// l'édition chevauche deux créneaux du canon, il ne faut pas déplacer sa matière : il faut le
// SCINDER en deux lignes — « 7, 30a » et « 7, 30b » — chacune sur son créneau. Fondre le
// fragment dans le verset voisin lui fait prendre le numéro de ce voisin, et la numérotation
// d'origine du fragment disparaît sans laisser de trace.
//
// Effet observé : le créneau ECC.8.1 affichait « 8, 1 » alors qu'il portait de la matière de
// Sacy 7, 30. Et ROM.3.4 commençait par un « ! » orphelin, la coupe étant tombée sur une
// espace insécable.
//
//   node scripts/reparer-scissions-deplacements.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const note = (v, s, autre) =>
  `Ce verset de l’édition (${v}) chevauche deux créneaux du canon ; il est scindé en ${v}${s} et ${v}${autre}, ` +
  `chaque part rejoignant le créneau qui lui revient. La numérotation d’origine est conservée de part et d’autre.`

// src → dst, et l'ancre qui sépare les deux parts dans le texte du verset d'origine.
// sens 'apres'  : la part qui suit l'ancre s'en va vers dst  (le verset déborde en aval)
// sens 'avant'  : la part qui précède l'ancre s'en va vers dst (le verset déborde en amont)
const CAS = [
  ['TR0001', 'ECC.7.29',  'ECC.8.1',   'Qui est assez sage pour ceci',                'apres'],
  ['TR0002', 'PSA.100.1', 'PSA.100.2', 'Je chanterai la bonté et la justice',         'apres'],
  ['TR0002', 'LUK.4.18',  'LUK.4.19',  'Pour proclamer aux captifs la délivrance',    'apres'],
  ['TR0002', 'JHN.16.4',  'JHN.16.5',  'Je ne vous en ai pas parlé dès le commencement', 'apres'],
  ['TR0002', '2CO.2.12',  '2CO.2.13',  'je n’eus point de repos d’esprit',            'apres'],
  ['TR0002', 'ROM.3.4',   'ROM.3.3',   'Que Dieu, au contraire, soit reconnu',        'avant'],
]

const sauve = JSON.parse(readFileSync(D + 'avant_corrections_1784531306692.json', 'utf8'))
const avant = sauve.find.bind(sauve)
const sauvegarde = []

for (const [trad, src, dst, ancre, sens] of CAS) {
  const s0 = avant(e => e.src === src && e.dst === dst)

  // 1. Rendre au verset destinataire son texte d'origine (il avait reçu le fragment).
  if (s0) {
    const { data: d } = await sb.from('versets_v2').select('id,texte').eq('trad_id', trad).eq('canon_id', dst)
      .eq('ch_orig', s0.b.ch_orig ?? -1).limit(1)
    if (!DRY && d?.length) await sb.from('versets_v2').update({ texte: s0.b.texte, notes: null }).eq('id', s0.b.id)
  }

  // 2. Reconstituer le verset d'origine entier, puis le couper proprement.
  const { data: rows } = await sb.from('versets_v2').select('*').eq('trad_id', trad).eq('canon_id', src)
  const ligne = rows?.[0]
  if (!ligne) { console.error(`✗ ${src} introuvable`); continue }
  const entier = s0 ? s0.a.texte : (sens === 'avant' ? `Loin de là ! ${ligne.texte.replace(/^\s*!\s*/, '')}` : ligne.texte)

  const i = entier.indexOf(ancre)
  if (i < 0) { console.error(`✗ ${src} : ancre « ${ancre.slice(0, 34)} » introuvable`); continue }
  const p1 = entier.slice(0, i).trim()
  const p2 = entier.slice(i).trim()
  if (!p1 || !p2) { console.error(`✗ ${src} : la coupe laisse une part vide`); continue }

  // Quelle part va où, et dans quel ordre de lecture.
  const versSrc = sens === 'apres' ? p1 : p2   // la part qui reste sur le créneau du verset
  const versDst = sens === 'apres' ? p2 : p1
  const sufSrc  = sens === 'apres' ? 'a' : 'b'
  const sufDst  = sens === 'apres' ? 'b' : 'a'
  const v = `${ligne.ch_orig}, ${ligne.v_orig}`

  console.log(`${DRY ? '[DRY] ' : ''}${trad}  ${v} scindé — ${v}${sufSrc} → ${src} · ${v}${sufDst} → ${dst}`)
  console.log(`        ${sufSrc}: ${versSrc.slice(0, 58)}`)
  console.log(`        ${sufDst}: ${versDst.slice(0, 58)}`)
  sauvegarde.push({ src, dst, ligne })

  if (DRY) continue
  await sb.from('versets_v2').update({
    texte: versSrc, v_orig_suffixe: sufSrc, notes: note(v, sufSrc, sufDst),
  }).eq('id', ligne.id)

  const { error } = await sb.from('versets_v2').insert({
    id: randomUUID(), trad_id: trad, livre: ligne.livre,
    ch_orig: ligne.ch_orig, v_orig: ligne.v_orig, v_orig_suffixe: sufDst,
    est_suscription: false, texte: versDst, canon_id: dst,
    notes: note(v, sufDst, sufSrc), alignement_verifie: false,
  })
  if (error) console.error(`   ✗ insertion de la part ${sufDst} : ${error.message}`)
}

if (!DRY) {
  writeFileSync(D + `avant_reparation_scissions_${Date.now()}.json`, JSON.stringify(sauvegarde, null, 1))
  const { error } = await sb.rpc('rafraichir_versets_lecture')
  console.log(error ? `\n✗ rafraîchissement : ${error.message}` : '\nvue de lecture rafraîchie')
}
