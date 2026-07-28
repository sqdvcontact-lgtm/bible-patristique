// Lecture intégrale de l'Homélie XX au peuple d'Antioche (A0014O0038,
// segments 2027-2135). La note [[352]] est conservée et contrôlée.
//   node scripts/chrysostome-antioche-hom20-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom20-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'

// [segment, cible, type, motif]. Les types viennent de la lecture du texte,
// non des seules notes marginales.
const LIENS = [
  [2034, 'JHN.8.44', 2, 'désignation distinctive du démon comme père du mensonge'],
  [2035, 'HEB.6.19', 2, 'image distinctive de l’espérance en Dieu comme ancre sacrée'],
  [2035, 'ROM.5.5', 2, 'reprise fondue de l’espérance qui ne trompe point'],
  [2037, 'JHN.10.11', 4, 'rapprochement thématique entre le prélat exposant sa vie et le bon pasteur donnant sa vie pour les brebis'],
  [2058, 'EXO.32.30', 2, 'reprise narrative de Moïse remontant vers Dieu après la faute du peuple'],
  [2058, 'EXO.32.31', 2, 'reprise de l’intercession de Moïse pour le péché du peuple'],
  [2059, 'GEN.3.9', 4, 'la note [[352]] « Gen. 3 » oriente vers Dieu abordant lui-même Adam après sa faute'],
  [2072, 'GEN.2.8', 2, 'reprise narrative de l’homme introduit par Dieu dans le paradis'],
  [2073, 'WIS.2.24', 2, 'reprise fondue de l’envie du diable privant l’homme de son bonheur'],
  [2116, 'MAT.6.14', 2, 'énoncé fondu de la promesse : pardonner aux hommes afin que le Père céleste pardonne'],
  [2121, 'GEN.42.24', 2, 'reprise narrative de Joseph se retirant pour pleurer devant ses frères puis reprenant son rôle'],
  [2123, 'LUK.23.34', 2, 'reprise de la prière du Christ au Père pour ceux qui le crucifient'],
  [2132, 'MAT.5.16', 4, 'rapprochement thématique entre les bonnes œuvres et la lumière allumée dans l’âme'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero, segment_texte, notes').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 2027).lte('segment_numero', 2135).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 109) throw new Error(`109 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))

const cibles = [...new Set(LIENS.map((l) => l[1]))]
const { data: versets, error: erreurVersets } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurVersets) throw erreurVersets
const presentes = new Set((versets ?? []).map((v) => v.id_verset))
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const rows = LIENS.map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero)?.id, canon_id, livre: null, chapitre: null,
  type, fiabilite: 'probable', motif, provenance: 'lecture', arbitrage_requis: false,
}))
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')
const cle = (l) => `${l.segment_id}|${l.canon_id}|${l.type}|${l.motif}`
if (new Set(rows.map(cle)).size !== rows.length) throw new Error('Doublon interne dans le relevé')

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cle))
const aEcrire = rows.filter((l) => !deja.has(cle(l)))

const appels = segments.flatMap((s) => [...s.segment_texte.matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
const definitions = segments.flatMap((s) => [...(s.notes ?? '').matchAll(/\[\[([A-Z0-9]+)\]\]/g)].map((m) => m[1]))
if (appels.length !== 1 || definitions.length !== 1 || appels[0] !== '352' || definitions[0] !== '352')
  throw new Error(`Bijection des notes invalide : ${appels.length} appels / ${definitions.length} définitions`)

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie XX : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 109 segments intégralement relus`)
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents · 1 appel/1 définition de note`)
if (!WRITE) process.exit(0)

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie XX',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue
console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
