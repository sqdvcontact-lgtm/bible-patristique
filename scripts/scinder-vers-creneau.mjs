// Porter un fragment vers un autre créneau du canon — PAR SCISSION, jamais par déplacement.
//
// Quand un verset de l'édition chevauche deux créneaux, sa matière ne se déplace pas : le
// verset se coupe en deux lignes, « a » et « b », chacune sur son créneau, chacune gardant le
// numéro d'origine. Fondre le fragment dans le verset voisin lui ferait prendre le numéro de
// ce voisin — la faute commise ce matin, six fois.
//
//   node scripts/scinder-vers-creneau.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// traduction · début EXACT du fragment · créneau canonique où il doit aller
const DEMANDES = [
  ['TR0001', 'Seigneur des armées, heureux est l’homme qui espere en vous', 'PSA.83.13'],
  ['TR0001', 'Je les chanterai sur des instrumens',                          'PSA.100.2'],
  ['TR0002', 'Je prendrai garde à la voie droite',                           'PSA.100.3'],
  ['TR0002', 'Je ne mettrai rien de mauvais devant mes yeux',                'PSA.100.4'],
  ['TR0002', 'Le cœur pervers s’éloignera de moi',                           'PSA.100.5'],
  ['TR0001', 'vous avez remarqué le sentier par lequel je marche',           'PSA.138.3'],
  ['TR0002', 'et il prit congé d’eux, en disant',                            'ACT.18.21'],
]

// Les espaces insécables posées par la passe typographique font échouer une recherche
// littérale : on compare sur un texte normalisé, en gardant les positions.
const norm = s => s.replace(/[   ]/g, ' ')

const sauvegarde = []
for (const [trad, ancre, dest] of DEMANDES) {
  const { data } = await sb.from('versets_v2').select('*').eq('trad_id', trad)
    .ilike('texte', `%${ancre.slice(0, 40)}%`)
  const cands = (data ?? []).filter(r => norm(r.texte).includes(norm(ancre)))
  if (cands.length !== 1) {
    console.error(`✗ « ${ancre.slice(0, 44)} » : ${cands.length} verset(s) — ancre ambiguë ou absente`)
    continue
  }
  const l = cands[0]
  if (l.canon_id === dest) { console.log(`— déjà en ${dest} : rien à faire`); continue }
  if (l.v_orig_suffixe)    { console.error(`✗ ${l.canon_id} est déjà une part scindée — à traiter à la main`); continue }

  const i = norm(l.texte).indexOf(norm(ancre))
  const p1 = l.texte.slice(0, i).trim()
  const p2 = l.texte.slice(i).trim()
  if (!p1) { console.error(`✗ ${l.canon_id} : le fragment est TOUT le verset → soudure, pas scission`); continue }

  // Le fragment part-il vers l'aval ou vers l'amont ? L'ordre du canon le dit.
  const rang = c => { const [, ch, v] = c.split('.'); return +ch * 1000 + +v }
  const versAval = rang(dest) > rang(l.canon_id)
  const resteSur = p1, part = p2                    // le fragment est toujours la fin ici
  const sufReste = versAval ? 'a' : 'b'
  const sufPart  = versAval ? 'b' : 'a'
  const v = `${l.ch_orig}, ${l.v_orig}`
  const note = (s, o) => `Ce verset de l’édition (${v}) chevauche deux créneaux du canon ; il est scindé en ${v}${s} et ${v}${o}, chaque part rejoignant le créneau qui lui revient. La numérotation d’origine est conservée de part et d’autre.`

  console.log(`${DRY ? '[DRY] ' : ''}${trad}  ${v} → ${v}${sufReste} reste en ${l.canon_id} · ${v}${sufPart} va en ${dest}`)
  console.log(`        reste : ${resteSur.slice(0, 60)}`)
  console.log(`        part  : ${part.slice(0, 60)}`)
  sauvegarde.push({ ...l })
  if (DRY) continue

  await sb.from('versets_v2').update({ texte: resteSur, v_orig_suffixe: sufReste, notes: note(sufReste, sufPart) }).eq('id', l.id)
  const { error } = await sb.from('versets_v2').insert({
    id: randomUUID(), trad_id: trad, livre: l.livre,
    ch_orig: l.ch_orig, v_orig: l.v_orig, v_orig_suffixe: sufPart,
    est_suscription: false, texte: part, canon_id: dest,
    notes: note(sufPart, sufReste), alignement_verifie: false,
  })
  if (error) console.error(`   ✗ ${error.message}`)
}

if (!DRY && sauvegarde.length) {
  writeFileSync(D + `avant_scissions_${Date.now()}.json`, JSON.stringify(sauvegarde, null, 1))
  const { error } = await sb.rpc('rafraichir_versets_lecture')
  // La garde crie au lieu de passer son chemin : base juste et site faux est le pire des deux.
  console.log(error ? `\n⚠️  RAFRAÎCHISSEMENT ÉCHOUÉ (${error.message}) — le site montre encore l’état ancien` : '\nvue de lecture rafraîchie')
}
