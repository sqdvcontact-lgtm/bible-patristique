// Quatre corrections d'alignement demandées le 20/07/2026, toutes vérifiées
// contre le référent Crampon (TR0003), qui ne bouge pas.
//
//   PSA 100 Segond — 101, 5 à 101, 8 descendent d'un cran (créneau 9 était vide)
//   PSA 138 Sacy   — 138, 3 scindé : « toutes mes voies » ferme le créneau 3
//   PSA 138 Sacy   — créneau 2 : rétablir l'ordre de l'imprimé (1b avant 2a)
//   REV  20 Segond — 20, 9 scindé : « un feu descendit du ciel » ouvre le créneau 9
//
//   node scripts/corrections-alignement-2026-07-20b.mjs --dry
//   node scripts/corrections-alignement-2026-07-20b.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const NOTE_DECALAGE_PSA100 =
  `Le canon réserve son créneau 5 au seul « Un cœur faux ne sera jamais le mien » ; l’édition Segond y logeait aussi son verset 101, 5. Les versets 101, 5 à 101, 8 descendent donc d’un cran : le verset 101, N de l’édition occupe le créneau N + 1 du canon. La numérotation d’origine est conservée.`
const scissionSegond = (v, a, b) =>
  `Ce verset de l’édition (${v}) chevauche deux créneaux du canon ; il est scindé en ${a} et ${b}, chaque part rejoignant le créneau qui lui revient. La numérotation d’origine est conservée de part et d’autre.`
const soudureSegond = (a, b, canon, part) =>
  `L’édition Segond découpe autrement : ${a} et ${b} tiennent ensemble le verset ${canon} du canon — partie ${part} sur 2. La numérotation d’origine est conservée pour chacune.`
const scission1730 = (v, part) =>
  `L’édition de 1730 réunit en un seul verset, numéroté ${v}, ce que le canon compte en 2 : partie ${part} sur 2. La numérotation d’origine est conservée pour chaque part.`
const soudure1730 = (a, b, canon, part) =>
  `L’édition de 1730 découpe autrement : ${a} et ${b} tiennent ensemble le verset ${canon} du canon — partie ${part} sur 2. La numérotation d’origine est conservée pour chacune.`
const J = (...n) => n.filter(Boolean).join(' ')

const equilibre = t => (t.match(/<i>/g) || []).length === (t.match(/<\/i>/g) || []).length

// Chaque opération désigne sa ligne par (trad, canon_id actuel, v_orig, suffixe).
const OPS = [
  // ── PSA 100 Segond : décalage +1 ───────────────────────────────────────────
  { type: 'deplacer', trad: 'TR0002', de: 'PSA.100.8', v: 8, vers: 'PSA.100.9', slot: null, note: NOTE_DECALAGE_PSA100 },
  { type: 'deplacer', trad: 'TR0002', de: 'PSA.100.7', v: 7, vers: 'PSA.100.8', slot: null, note: NOTE_DECALAGE_PSA100 },
  { type: 'deplacer', trad: 'TR0002', de: 'PSA.100.6', v: 6, vers: 'PSA.100.7', slot: null, note: NOTE_DECALAGE_PSA100 },
  { type: 'deplacer', trad: 'TR0002', de: 'PSA.100.5', v: 5, vers: 'PSA.100.6', slot: null, note: NOTE_DECALAGE_PSA100 },
  // 101, 4 reste au créneau 5, désormais seul : on efface son rang.
  { type: 'deplacer', trad: 'TR0002', de: 'PSA.100.5', v: 4, vers: 'PSA.100.5', slot: null, note: null },

  // ── PSA 138 Sacy : créneau 2, rétablir l'ordre de l'imprimé ────────────────
  { type: 'deplacer', trad: 'TR0001', de: 'PSA.138.2', v: 1, suf: 'b', vers: 'PSA.138.2', slot: 1,
    note: J(scission1730('138, 1', 2), soudure1730('138, 1', '138, 2', '138, 2', 1)) },
  { type: 'deplacer', trad: 'TR0001', de: 'PSA.138.2', v: 2, suf: 'a', vers: 'PSA.138.2', slot: 2,
    note: J(scission1730('138, 2', 1), soudure1730('138, 1', '138, 2', '138, 2', 2)) },

  // ── PSA 138 Sacy : scinder 138, 3 ─────────────────────────────────────────
  // « toutes mes voies te sont familières » ferme le v. 3 du référent ; la
  // parole encore sur la langue ouvre son v. 4.
  { type: 'deplacer', trad: 'TR0001', de: 'PSA.138.3', v: 2, suf: 'b', vers: 'PSA.138.3', slot: 1,
    note: J(scission1730('138, 2', 2), soudure1730('138, 2', '138, 3', '138, 3', 1)) },
  { type: 'scinder', trad: 'TR0001', de: 'PSA.138.4', v: 3,
    coupe: '& avant même que ma langue',
    a: { canon: 'PSA.138.3', slot: 2, note: J(scission1730('138, 3', 1), soudure1730('138, 2', '138, 3', '138, 3', 2)) },
    b: { canon: 'PSA.138.4', slot: null, note: scission1730('138, 3', 2) } },

  // ── REV 20 Segond : scinder 20, 9 ─────────────────────────────────────────
  // « mais Dieu fit tomber un feu du ciel qui les dévora » ouvre le v. 9 du
  // référent, où il précède le diable jeté dans l'étang.
  { type: 'scinder', trad: 'TR0002', de: 'REV.20.8', v: 9,
    coupe: 'Mais un feu descendit du ciel',
    a: { canon: 'REV.20.8', slot: null, note: scissionSegond('20, 9', '20, 9a', '20, 9b') },
    b: { canon: 'REV.20.9', slot: 1, note: J(scissionSegond('20, 9', '20, 9b', '20, 9a'), soudureSegond('20, 9', '20, 10', '20, 9', 1)) } },
  { type: 'deplacer', trad: 'TR0002', de: 'REV.20.9', v: 10, suf: 'a', vers: 'REV.20.9', slot: 2,
    note: J(scissionSegond('20, 10', '20, 10a', '20, 10b'), soudureSegond('20, 9', '20, 10', '20, 9', 2)) },
]

const sauvegarde = []
const actions = []
let anomalies = 0

for (const op of OPS) {
  let q = sb.from('versets_v2').select('*').eq('trad_id', op.trad).eq('canon_id', op.de).eq('v_orig', op.v)
  q = op.suf ? q.eq('v_orig_suffixe', op.suf) : q.is('v_orig_suffixe', null)
  const { data, error } = await q
  if (error) throw error
  const cible = `${op.trad} ${op.de} ${op.v}${op.suf ?? ''}`
  if (data.length !== 1) { console.error(`✗ ${cible} : ${data.length} ligne(s) trouvée(s), 1 attendue`); anomalies++; continue }
  const r = data[0]
  sauvegarde.push(r)

  if (op.type === 'deplacer') {
    actions.push({ libelle: `${cible} → ${op.vers} [slot ${op.slot ?? '-'}]`,
      maj: [{ id: r.id, canon_id: op.vers, ordre_slot: op.slot, notes: op.note, alignement_verifie: true }], ins: [] })
  } else {
    const i = r.texte.indexOf(op.coupe)
    if (i < 0) { console.error(`✗ ${cible} : coupe « ${op.coupe} » introuvable`); anomalies++; continue }
    const avant = r.texte.slice(0, i).trim(), apres = r.texte.slice(i).trim()
    if (!avant || !apres) { console.error(`✗ ${cible} : coupe en bord de verset`); anomalies++; continue }
    if (!equilibre(avant) || !equilibre(apres)) { console.error(`✗ ${cible} : la coupe traverse une balise <i>`); anomalies++; continue }
    actions.push({
      libelle: `${cible} scindé → ${op.v}a ${op.a.canon} [slot ${op.a.slot ?? '-'}] / ${op.v}b ${op.b.canon} [slot ${op.b.slot ?? '-'}]`,
      apercu: [`  a │ ${avant}`, `  b │ ${apres}`],
      maj: [{ id: r.id, canon_id: op.a.canon, ordre_slot: op.a.slot, v_orig_suffixe: 'a', texte: avant, notes: op.a.note, alignement_verifie: true }],
      ins: [{ trad_id: r.trad_id, livre: r.livre, ch_orig: r.ch_orig, v_orig: r.v_orig, v_orig_suffixe: 'b',
              est_suscription: false, texte: apres, canon_id: op.b.canon, canon_id_fin: null,
              ordre_slot: op.b.slot, notes: op.b.note, alignement_verifie: true }],
    })
  }
}

for (const a of actions) { console.log(`· ${a.libelle}`); (a.apercu || []).forEach(l => console.log(l)) }

if (anomalies) { console.error(`\n✗ ${anomalies} anomalie(s) — rien n'a été écrit`); process.exit(1) }
if (DRY) { console.log('\n✓ plan valide (--dry, rien écrit)'); process.exit(0) }

const fichier = `scripts/backup_corrections_2026-07-20b.json`
writeFileSync(fichier, JSON.stringify(sauvegarde, null, 1), 'utf8')
console.log(`\nSauvegarde : ${fichier} (${sauvegarde.length} lignes)`)

for (const a of actions) {
  for (const m of a.maj) {
    const { id, ...champs } = m
    const { error } = await sb.from('versets_v2').update(champs).eq('id', id)
    if (error) throw error
  }
  if (a.ins.length) { const { error } = await sb.from('versets_v2').insert(a.ins); if (error) throw error }
}
console.log('✓ appliqué')
