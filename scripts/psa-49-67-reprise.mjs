// Reprise d'alignement des psaumes 49 et 67 — Sacy (TR0001) et Segond (TR0002)
// sur le référent Crampon (TR0003), qui ne bouge pas.
//
// Chaque chapitre est repris en entier : la table de correspondance ci-dessous est
// complète, du premier verset au dernier, et c'est elle qui fait foi. On ne retouche
// pas « le point douteux » — c'est la leçon des psaumes 86 et 97 (consigne §23.14) :
// un compte qui tombe juste ne prouve pas que la structure est juste.
//
//   node scripts/psa-49-67-reprise.mjs --dry     (n'écrit rien, affiche le plan)
//   node scripts/psa-49-67-reprise.mjs           (sauvegarde puis applique)
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// ── Notes ────────────────────────────────────────────────────────────────────
// Toute modification d'alignement conserve la numérotation d'origine ET la
// retranscrit en note ; le décalage entraîné par une coupe est noté lui aussi,
// sur chaque verset qu'il déplace, et pas seulement au point de coupe.
const soudure = (ed, a, b, canon, part) =>
  `L’édition de ${ed} découpe autrement : ${a} et ${b} tiennent ensemble le verset ${canon} du canon — partie ${part} sur 2. La numérotation d’origine est conservée pour chacune.`
const scission1730 = (v, part) =>
  `L’édition de 1730 réunit en un seul verset, numéroté ${v}, ce que le canon compte en 2 : partie ${part} sur 2. La numérotation d’origine est conservée pour chaque part.`
const scissionSegond = (v, a, b) =>
  `Ce verset de l’édition (${v}) chevauche deux créneaux du canon ; il est scindé en ${a} et ${b}, chaque part rejoignant le créneau qui lui revient. La numérotation d’origine est conservée de part et d’autre.`
const decalageSegond =
  `Le canon compte la suscription du psaume comme verset 1 ; l’édition Segond la joint au corps du psaume dans son verset 50, 1. Le corps est donc décalé d’un cran : le verset 50, N de l’édition occupe le créneau N + 1 du canon. La numérotation d’origine est conservée.`

const J = (...n) => n.filter(Boolean).join(' ')

// ── PSA 49 — Sacy ────────────────────────────────────────────────────────────
// Une seule divergence, mais elle traverse deux créneaux : le référent réunit en
// son verset 2 tout le mouvement « Dieu parle … du lever du soleil à son couchant »,
// que l'édition de 1730 coupe entre ses versets 1 et 2 ; « c’est de Sion » ouvre
// chez elle le verset 2 alors que le référent en fait son verset 3.
//   1 ← 0(susc) · 2 ← 1 + 2a · 3 ← 2b · 4 ← 3 + 4 · 5…24 ← 5…24
const SACY_49 = [
  { v: 0, susc: true, canon: 1 },
  { v: 1, canon: 2, slot: 1, note: soudure('1730', '49, 1', '49, 2', '49, 2', 1) },
  { v: 2, suf: 'a', canon: 2, slot: 2, coupe: 'c’est de Sion',
    note: J(scission1730('49, 2', 1), soudure('1730', '49, 1', '49, 2', '49, 2', 2)) },
  { v: 2, suf: 'b', canon: 3, note: scission1730('49, 2', 2) },
  { v: 3, canon: 4, slot: 1, note: soudure('1730', '49, 3', '49, 4', '49, 4', 1) },
  { v: 4, canon: 4, slot: 2, note: soudure('1730', '49, 3', '49, 4', '49, 4', 2) },
  ...Array.from({ length: 20 }, (_, i) => ({ v: i + 5, canon: i + 5 })),
]

// ── PSA 49 — Segond ──────────────────────────────────────────────────────────
// Le référent isole la suscription dans son créneau 1 ; l'édition Segond la joint
// au corps du psaume dans son verset 1. Tout le corps était donc logé un cran trop
// bas, et le créneau 24 restait vide.
//   1 ← 1a · 2 ← 1b · 3…24 ← 2…23
const SEGOND_49 = [
  { v: 1, suf: 'a', canon: 1, susc: true, note: scissionSegond('50, 1', '50, 1a', '50, 1b') },
  { v: 1, suf: 'b', canon: 2, coupe: 'Dieu, Dieu, l’Éternel', note: scissionSegond('50, 1', '50, 1b', '50, 1a') },
  ...Array.from({ length: 22 }, (_, i) => ({ v: i + 2, canon: i + 3, note: decalageSegond })),
]

// ── PSA 67 — Sacy ────────────────────────────────────────────────────────────
// Le psaume le plus disloqué du lot. Quatre coupes nouvelles (6, 15, 16, 34), un
// verset déplacé (4, logé à tort avec le 3), un autre replacé (35b).
//   1←0 · 2←1 · 3←2 · 4←3 · 5←4+5a · 6←5b+6a · 7←6b+7 · 8…18←8…18 · 19←19+20
//   20…27←21…28 · 28←29+30 · 29←31 · 30←32 · 31←33+34a · 32←34b · 33←35a
//   34←35b+36a · 35←36b · 36←37
const SACY_67 = [
  { v: 0, susc: true, canon: 1 },
  { v: 1, canon: 2 }, { v: 2, canon: 3 }, { v: 3, canon: 4 },

  // « tressaillez devant lui » ferme le v. 5 du référent : le début du v. 5 de
  // l'édition lui appartient encore, la suite bascule dans le v. 6.
  { v: 4, canon: 5, slot: 1, note: soudure('1730', '67, 4', '67, 5', '67, 5', 1) },
  // 5a / 5b sont déjà scindés en base, et bien scindés : on les reprend tels quels.
  { v: 5, suf: 'a', canon: 5, slot: 2,
    note: J(scission1730('67, 5', 1), soudure('1730', '67, 4', '67, 5', '67, 5', 2)) },
  { v: 5, suf: 'b', canon: 6, slot: 1, note: scission1730('67, 5', 2) },

  // « Dieu dans sa sainte demeure » clôt le v. 6 du référent ; « Dieu donne une
  // maison » ouvre son v. 7. L'édition coupe au milieu de cette charnière.
  { v: 6, suf: 'a', canon: 6, slot: 2, coupe: 'Dieu fait demeurer dans sa maison',
    note: J(scission1730('67, 6', 1), soudure('1730', '67, 6', '67, 7', '67, 7', 1)) },
  { v: 6, suf: 'b', canon: 7, slot: 1,
    note: J(scission1730('67, 6', 2), soudure('1730', '67, 6', '67, 7', '67, 7', 1)) },
  { v: 7, canon: 7, slot: 2, note: soudure('1730', '67, 6', '67, 7', '67, 7', 2) },

  ...Array.from({ length: 7 }, (_, i) => ({ v: i + 8, canon: i + 8 })),   // 8…14

  // Le référent consacre son v. 16 à la seule apposition « montagne de Basan » ;
  // l'édition la répartit sur la fin de son v. 15 et le début de son v. 16.
  { v: 15, suf: 'a', canon: 15, coupe: 'La montagne de Dieu', note: scission1730('67, 15', 1) },
  { v: 15, suf: 'b', canon: 16, slot: 1, note: scission1730('67, 15', 2) },
  { v: 16, suf: 'a', canon: 16, slot: 2,
    coupe: 'mais pourquoi regardez-vous',
    note: J(scission1730('67, 16', 1), soudure('1730', '67, 15', '67, 16', '67, 16', 2)) },
  { v: 16, suf: 'b', canon: 17, slot: 1,
    note: J(scission1730('67, 16', 2), soudure('1730', '67, 16', '67, 17', '67, 17', 1)) },
  { v: 17, canon: 17, slot: 2, note: soudure('1730', '67, 16', '67, 17', '67, 17', 2) },

  { v: 18, canon: 18 },
  { v: 19, canon: 19, slot: 1, note: soudure('1730', '67, 19', '67, 20', '67, 19', 1) },
  { v: 20, canon: 19, slot: 2, note: soudure('1730', '67, 19', '67, 20', '67, 19', 2) },
  ...Array.from({ length: 8 }, (_, i) => ({ v: i + 21, canon: i + 20 })),  // 21…28 → 20…27
  { v: 29, canon: 28, slot: 1, note: soudure('1730', '67, 29', '67, 30', '67, 28', 1) },
  { v: 30, canon: 28, slot: 2, note: soudure('1730', '67, 29', '67, 30', '67, 28', 2) },
  { v: 31, canon: 29 }, { v: 32, canon: 30 },

  // « Disperse les nations qui se plaisent aux combats » ferme le v. 31 du
  // référent ; l'édition l'a rejeté en tête de son v. 34, avec l'Égypte.
  { v: 33, canon: 31, slot: 1, note: soudure('1730', '67, 33', '67, 34', '67, 31', 1) },
  { v: 34, suf: 'a', canon: 31, slot: 2, coupe: 'Il viendra de l’Egypte',
    note: J(scission1730('67, 34', 1), soudure('1730', '67, 33', '67, 34', '67, 31', 2)) },
  { v: 34, suf: 'b', canon: 32, note: scission1730('67, 34', 2) },

  { v: 35, suf: 'a', canon: 33, note: scission1730('67, 35', 1) },
  { v: 35, suf: 'b', canon: 34, slot: 1,
    note: J(scission1730('67, 35', 2), soudure('1730', '67, 35', '67, 36', '67, 34', 1)) },
  { v: 36, suf: 'a', canon: 34, slot: 2,
    note: J(scission1730('67, 36', 1), soudure('1730', '67, 35', '67, 36', '67, 34', 2)) },
  { v: 36, suf: 'b', canon: 35, note: scission1730('67, 36', 2) },
  { v: 37, canon: 36 },
]

const PLAN = [
  { trad: 'TR0001', ch: 49, rows: SACY_49 },
  { trad: 'TR0002', ch: 49, rows: SEGOND_49 },
  { trad: 'TR0001', ch: 67, rows: SACY_67 },
]

// ─────────────────────────────────────────────────────────────────────────────
const horodatage = new Date().toISOString().slice(0, 10)
const sauvegarde = []
const aEcrire = []
let anomalies = 0

for (const { trad, ch, rows } of PLAN) {
  const { data: actuel, error } = await sb.from('versets_v2')
    .select('*').eq('trad_id', trad).like('canon_id', `PSA.${ch}.%`)
  if (error) throw error
  sauvegarde.push(...actuel)

  // Regrouper l'état actuel par verset d'origine : une entrée par v_orig, qui
  // peut déjà être scindée (suffixes) ou non.
  const parOrig = new Map()
  for (const r of actuel) {
    const k = String(r.v_orig)
    if (!parOrig.has(k)) parOrig.set(k, [])
    parOrig.get(k).push(r)
  }

  // Le texte porte des italiques (<i>…</i> : mots suppléés par le traducteur).
  // On ne recolle donc jamais des parts pour les recouper — une coupe tomberait
  // au milieu d'une balise. Deux cas seulement :
  //   · la part existe déjà en base sous ce suffixe → on la reprend telle quelle,
  //     et l'on ne touche qu'à son créneau, son rang et sa note ;
  //   · le verset est entier en base et le plan le scinde → on coupe son texte,
  //     après avoir vérifié que la coupe ne traverse pas une balise.
  const balisesEquilibrees = t =>
    (t.match(/<i>/g) || []).length === (t.match(/<\/i>/g) || []).length
  const netto = t => t.replace(/<i>\s*<\/i>/g, '').replace(/[ \t]+/g, ' ').trim()

  const cible = []
  for (const spec of rows) {
    const parts = parOrig.get(String(spec.v))
    if (!parts) { console.error(`✗ ${trad} PSA ${ch} : verset d'origine ${spec.v} introuvable`); anomalies++; continue }

    let texte
    const dejaScinde = parts.find(p => p.v_orig_suffixe === spec.suf)
    if (dejaScinde) {
      texte = netto(dejaScinde.texte)
    } else if (spec.suf) {
      if (parts.length !== 1) {
        console.error(`✗ ${trad} PSA ${ch},${spec.v} : scission attendue sur un verset entier, ${parts.length} parts en base`); anomalies++; continue
      }
      const entier = parts[0].texte
      const coupe = (rows.find(r => r.v === spec.v && r.coupe) || {}).coupe
      const i = entier.indexOf(coupe)
      if (i < 0) { console.error(`✗ ${trad} PSA ${ch},${spec.v} : coupe « ${coupe} » introuvable`); anomalies++; continue }
      const avant = entier.slice(0, i), apres = entier.slice(i)
      if (!balisesEquilibrees(avant) || !balisesEquilibrees(apres)) {
        console.error(`✗ ${trad} PSA ${ch},${spec.v} : la coupe traverse une balise <i>`); anomalies++; continue
      }
      texte = netto(spec.suf === 'a' ? avant : apres)
    } else {
      if (parts.length !== 1) { console.error(`✗ ${trad} PSA ${ch},${spec.v} : ${parts.length} parts en base pour un verset non scindé`); anomalies++; continue }
      texte = netto(parts[0].texte)
    }
    if (!texte) { console.error(`✗ ${trad} PSA ${ch},${spec.v}${spec.suf ?? ''} : texte vide après coupe`); anomalies++; continue }
    cible.push({
      trad_id: trad, livre: 'PSA', ch_orig: parOrig.get(String(spec.v))[0].ch_orig,
      v_orig: spec.v, v_orig_suffixe: spec.suf ?? null,
      est_suscription: !!spec.susc, texte,
      canon_id: `PSA.${ch}.${spec.canon}`, canon_id_fin: null,
      ordre_slot: spec.slot ?? null,
      notes: spec.note ?? null,
      alignement_verifie: true,
    })
  }

  // La note éditoriale de la suscription (commentaire de l'édition) n'est pas une
  // note d'alignement : elle est portée par le verset 0 et doit être préservée.
  const susc = actuel.find(r => r.est_suscription || r.v_orig === 0)
  if (susc?.notes) {
    const cibleSusc = cible.find(r => r.v_orig === susc.v_orig)
    if (cibleSusc) cibleSusc.notes = susc.notes
  }

  // Contrôle intégral : tous les créneaux du référent sont-ils occupés ?
  const { data: ref } = await sb.from('versets_v2').select('canon_id')
    .eq('trad_id', 'TR0003').like('canon_id', `PSA.${ch}.%`)
  const attendus = new Set(ref.map(r => r.canon_id))
  const obtenus = new Set(cible.map(r => r.canon_id))
  const manquants = [...attendus].filter(c => !obtenus.has(c))
  const surnumeraires = [...obtenus].filter(c => !attendus.has(c))
  console.log(`\n${trad} PSA ${ch} : ${actuel.length} lignes → ${cible.length} · ` +
    `${attendus.size} créneaux du référent, ${obtenus.size} occupés`)
  if (manquants.length) { console.error(`  ✗ créneaux vides : ${manquants.join(', ')}`); anomalies++ }
  if (surnumeraires.length) { console.error(`  ✗ créneaux hors référent : ${surnumeraires.join(', ')}`); anomalies++ }
  if (!manquants.length && !surnumeraires.length) console.log('  ✓ couverture complète')

  // Aucun verset de l'édition ne doit avoir disparu en route.
  const origAvant = new Set(actuel.map(r => r.v_orig))
  const origApres = new Set(cible.map(r => r.v_orig))
  const perdus = [...origAvant].filter(v => !origApres.has(v))
  if (perdus.length) { console.error(`  ✗ versets d'origine perdus : ${perdus.join(', ')}`); anomalies++ }

  if (DRY) for (const r of cible.filter(r => r.v_orig_suffixe)) {
    console.log(`  ${r.canon_id} [slot ${r.ordre_slot ?? '-'}] ← ${r.ch_orig},${r.v_orig}${r.v_orig_suffixe}\n     ${r.texte}`)
  }

  aEcrire.push({ trad, ch, cible })
}

// ── Écriture ─────────────────────────────────────────────────────────────────
// Rien n'est touché tant que les trois chapitres n'ont pas été validés, et la
// sauvegarde part sur le disque avant le premier delete (charte §23.10).
if (anomalies) {
  console.error(`\n✗ ${anomalies} anomalie(s) — rien n'a été écrit`)
  process.exit(1)
}
if (DRY) {
  console.log('\n✓ plan valide (--dry, rien écrit)')
  process.exit(0)
}

const fichier = `scripts/backup_psa_49_67_${horodatage}.json`
writeFileSync(fichier, JSON.stringify(sauvegarde, null, 1), 'utf8')
console.log(`\nSauvegarde de l'état antérieur : ${fichier} (${sauvegarde.length} lignes)`)

for (const { trad, ch, cible } of aEcrire) {
  const { error: eDel } = await sb.from('versets_v2').delete().eq('trad_id', trad).like('canon_id', `PSA.${ch}.%`)
  if (eDel) throw eDel
  const { error: eIns } = await sb.from('versets_v2').insert(cible)
  if (eIns) throw eIns
  console.log(`  → ${trad} PSA ${ch} écrit (${cible.length} lignes)`)
}
console.log('\n✓ appliqué')
