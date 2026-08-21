// Ps 49 et Ps 100 : ramener l'ossature canonique sur celle de l'AELF.
//
// CONSTAT. `versets_canon` compte 24 créneaux pour PSA 49 et 9 pour PSA 100,
// là où l'AELF en compte 23 et 8 (aelf.org/bible/ps/49 et /100). Cause : dans
// ces deux psaumes SEULS, l'édition Crampon isole typographiquement la
// suscription (« Psaume d'Asaph. ») et l'import a pris cette séparation pour une
// division de verset, fabriquant un créneau surnuméraire. Trois sources
// concordent contre lui : l'AELF, l'hébreu (Ps 50 et 101 ont 23 et 8 versets,
// le titre faisant partie du v. 1) et la Segond, qui compte 23 et 8 versets.
//
// Contre-épreuve : le Ps 67, dont le créneau 1 est aussi un titre seul, est
// CORRECT — l'AELF y numérote le corps 2 à 36, parce qu'en hébreu le titre du
// Ps 68 constitue à lui seul le verset 1. La règle n'est donc pas « le titre ne
// compte jamais », elle dépend du psaume. D'où une correction limitée à 49 et 100.
//
// OPÉRATION. L'ancien créneau 1 est fondu dans l'ancien 2 ; tout le reste
// remonte d'un cran (ancien N → nouveau N−1 pour N ≥ 3). Les parts a/b d'un
// même verset d'origine qui se retrouvent dans le même créneau sont
// refusionnées : leur scission n'était qu'un artefact de l'ossature fausse, et
// la maintenir reviendrait à réécrire l'édition (charte §23.7). Les lignes de
// numéros d'origine différents restent distinctes, départagées par ordre_slot.
//
//   node scripts/psa-49-100-ossature-aelf.mjs --dry
//   node scripts/psa-49-100-ossature-aelf.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const CHAPITRES = [{ ch: 49, avant: 24, apres: 23 }, { ch: 100, avant: 9, apres: 8 }]
const TRADS = { TR0001: 'de 1730', TR0002: 'Segond', TR0003: 'Crampon' }

const soudure = (ed, parts, canon, i) =>
  `L’édition ${ed} découpe autrement : ${parts.join(', ')} tiennent ensemble le verset ${canon} du canon — partie ${i} sur ${parts.length}. La numérotation d’origine est conservée pour chacune.`
const scission = (ed, v, i) =>
  `L’édition ${ed} réunit en un seul verset, numéroté ${v}, ce que le canon compte en 2 : partie ${i} sur 2. La numérotation d’origine est conservée pour chaque part.`
const NOTE_OSSATURE =
  `Ossature ramenée sur celle de l’AELF le 20/07/2026 : la suscription ne compte pas pour un verset dans ce psaume, et le corps est numéroté à partir de 1. Les créneaux ont donc reculé d’un cran par rapport à l’état antérieur.`

const sauvegarde = { versets_v2: [], versets_canon: [] }
const plan = []
let anomalies = 0

for (const { ch, avant, apres } of CHAPITRES) {
  // Contrôle : l'ossature est-elle bien dans l'état attendu avant intervention ?
  const { data: canon } = await sb.from('versets_canon').select('*').eq('livre', 'PSA').eq('ch_canon', ch)
  if (canon.length !== avant) {
    console.error(`✗ PSA ${ch} : ${canon.length} créneaux en base, ${avant} attendus — ossature déjà modifiée ?`); anomalies++; continue
  }
  sauvegarde.versets_canon.push(...canon)

  for (const trad of Object.keys(TRADS)) {
    const { data: lignes } = await sb.from('versets_v2').select('*').eq('trad_id', trad).like('canon_id', `PSA.${ch}.%`)
    if (!lignes.length) continue
    sauvegarde.versets_v2.push(...lignes)

    // Ordre de lecture actuel : créneau, puis rang, puis numéro d'origine.
    lignes.sort((a, b) =>
      (+a.canon_id.split('.')[2] - +b.canon_id.split('.')[2]) ||
      ((a.ordre_slot ?? 0) - (b.ordre_slot ?? 0)) ||
      (a.v_orig - b.v_orig) ||
      (a.v_orig_suffixe || '').localeCompare(b.v_orig_suffixe || ''))

    // Nouveau créneau : 1 et 2 fusionnent, le reste recule d'un cran.
    const parCreneau = new Map()
    for (const l of lignes) {
      const ancien = +l.canon_id.split('.')[2]
      const nouveau = ancien <= 2 ? 1 : ancien - 1
      if (nouveau > apres) { console.error(`✗ ${trad} PSA ${ch} : créneau ${nouveau} hors ossature (${apres})`); anomalies++ }
      if (!parCreneau.has(nouveau)) parCreneau.set(nouveau, [])
      parCreneau.get(nouveau).push(l)
    }

    for (const [creneau, occupants] of parCreneau) {
      // Refusionner les parts a/b d'un même verset d'origine réunies ici.
      const parOrig = new Map()
      for (const o of occupants) {
        if (!parOrig.has(o.v_orig)) parOrig.set(o.v_orig, [])
        parOrig.get(o.v_orig).push(o)
      }
      const unites = []
      for (const [v, parts] of parOrig) {
        if (parts.length === 1) { unites.push({ garde: parts[0], texte: parts[0].texte, suffixe: parts[0].v_orig_suffixe, v }) }
        else {
          parts.sort((a, b) => (a.v_orig_suffixe || '').localeCompare(b.v_orig_suffixe || ''))
          unites.push({ garde: parts[0], supprime: parts.slice(1), v,
            texte: parts.map(p => p.texte).join(' ').replace(/[ \t]+/g, ' ').trim(), suffixe: null })
        }
      }
      const n = unites.length
      unites.forEach((u, i) => {
        const ed = TRADS[trad]
        const etiquettes = unites.map(x => `${x.garde.ch_orig}, ${x.v}${x.suffixe ?? ''}`)
        const notes = [
          n > 1 ? soudure(ed, etiquettes, `PSA ${ch}, ${creneau}`.replace('PSA ', ''), i + 1) : null,
          u.suffixe ? scission(ed, `${u.garde.ch_orig}, ${u.v}`, u.suffixe === 'a' ? 1 : 2) : null,
          // la note éditoriale d'une suscription Sacy n'est pas une note d'alignement
          u.garde.est_suscription && u.garde.notes && !/^L’édition/.test(u.garde.notes) ? u.garde.notes : null,
          NOTE_OSSATURE,
        ].filter(Boolean)
        plan.push({
          trad, ch, action: u.supprime ? 'refusion' : 'deplacement',
          id: u.garde.id, de: u.garde.canon_id, vers: `PSA.${ch}.${creneau}`,
          maj: { canon_id: `PSA.${ch}.${creneau}`, ordre_slot: n > 1 ? i + 1 : null,
                 v_orig_suffixe: u.suffixe, texte: u.texte, notes: notes.join(' '), alignement_verifie: true },
          supprime: (u.supprime || []).map(s => s.id),
          libelle: `${trad} ${u.garde.ch_orig},${u.v}${u.suffixe ?? ''} : ${u.garde.canon_id} → PSA.${ch}.${creneau}` +
                   (n > 1 ? ` [slot ${i + 1}/${n}]` : '') + (u.supprime ? ` (refusion de ${u.supprime.length + 1} parts)` : ''),
        })
      })
    }
  }
}

for (const p of plan) if (p.action === 'refusion' || p.vers.endsWith('.1')) console.log(`· ${p.libelle}`)
console.log(`\n${plan.length} lignes replacées, ${plan.reduce((s, p) => s + p.supprime.length, 0)} lignes absorbées par refusion`)

if (anomalies) { console.error(`\n✗ ${anomalies} anomalie(s) — rien n'a été écrit`); process.exit(1) }
if (DRY) { console.log('✓ plan valide (--dry, rien écrit)'); process.exit(0) }

writeFileSync('scripts/backup_ossature_aelf_2026-07-20.json', JSON.stringify(sauvegarde, null, 1), 'utf8')
console.log(`\nSauvegarde : scripts/backup_ossature_aelf_2026-07-20.json ` +
  `(${sauvegarde.versets_v2.length} versets + ${sauvegarde.versets_canon.length} créneaux)`)

for (const p of plan) {
  const { error } = await sb.from('versets_v2').update(p.maj).eq('id', p.id)
  if (error) throw error
  for (const id of p.supprime) { const { error: e } = await sb.from('versets_v2').delete().eq('id', id); if (e) throw e }
}
// Le créneau surnuméraire, désormais inoccupé, quitte l'ossature.
for (const { ch, avant } of CHAPITRES) {
  const { error } = await sb.from('versets_canon').delete().eq('id', `PSA.${ch}.${avant}`)
  if (error) throw error
  console.log(`  ossature : PSA.${ch}.${avant} retiré`)
}
console.log('✓ appliqué')
