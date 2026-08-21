// Export des liens bibliques d'origine, AVANT de vider les colonnes lien_1..lien_4.
//
// À QUOI SERT CE FICHIER. Pas à repeupler la base : les liens sont repris de zéro. Il sert de
// CONTRE-ÉPREUVE. La méthode (charte §9.6) veut qu'on résolve un segment à l'aveugle, puis
// seulement ensuite qu'on ouvre l'ancien lien pour comparer. Consulté dans cet ordre, il
// donne un second avis sur chaque segment ; consulté avant, il ne ferait qu'ancrer le
// jugement sur un travail établi contre la table décalée.
//
// Les anciens identifiants (« B016393 ») sont résolus ici en créneaux canoniques tant que la
// sauvegarde de l'ancienne table le permet — après quoi ce sera impossible.
//
//   node scripts/liens-anciens-export.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const tout = async (t, cols, ord) => {
  let o = 0, r = []
  for (;;) {
    const { data, error } = await sb.from(t).select(cols).order(ord).range(o, o + 999)
    if (error) throw new Error(`${t} : ${error.message}`)
    if (!data?.length) break
    r = r.concat(data); if (data.length < 1000) break; o += 1000
  }
  return r
}

// Table de résolution : ancien id_verset → créneau canonique.
const anc = JSON.parse(readFileSync('scripts/backup_ancienne_table_versets.json', 'utf8'))
const canon = await tout('versets_canon', 'id, livre, ch_canon, v_canon', 'id')
const creneau = new Map(canon.map(c => [`${c.livre}.${c.ch_canon}.${c.v_canon}`, c.id]))
const parCode = new Map(anc.map(r => [r.id_verset, r]))
const resoudre = code => {
  const r = parCode.get(code)
  if (!r) return { code, canon_id: null, ref: null, note: 'code inconnu' }
  const ref = `${r.livre} ${r.chapitre}, ${r.verset}`
  const cid = creneau.get(`${r.livre}.${r.chapitre}.${r.verset}`)
  return { code, canon_id: cid ?? null, ref, note: cid ? null : 'hors ossature canonique' }
}

const segs = await tout('segments', 'id, id_oeuvre, segment_numero, lien_1, lien_2, lien_3, lien_4', 'id')
const oeuvres = await tout('oeuvres', 'id_oeuvre, titre', 'id_oeuvre')
const titre = new Map(oeuvres.map(o => [o.id_oeuvre, o.titre]))

let nbLiens = 0, nbResolus = 0, nbPerdus = 0
const sortie = []
for (const s of segs) {
  const liens = []
  for (const n of [1, 2, 3, 4]) {
    const v = s[`lien_${n}`]
    if (!v) continue
    for (const code of String(v).split(/[;,\s]+/).map(x => x.trim()).filter(Boolean)) {
      const r = resoudre(code)
      nbLiens++; r.canon_id ? nbResolus++ : nbPerdus++
      liens.push({ type: n, ...r })
    }
  }
  if (liens.length) sortie.push({
    segment_id: s.id, id_oeuvre: s.id_oeuvre, oeuvre: titre.get(s.id_oeuvre) ?? null,
    segment_numero: s.segment_numero, liens,
  })
}

const chemin = 'scripts/liens_anciens_controle.json'
writeFileSync(chemin, JSON.stringify({
  genere_le: new Date().toISOString(),
  usage: 'CONTRE-ÉPREUVE UNIQUEMENT — à ouvrir APRÈS avoir résolu le segment à l’aveugle (charte §9.6). Établi contre l’ancienne table, dont les décalages ont été corrigés depuis : un lien peut viser le bon texte et le mauvais créneau.',
  segments_avec_liens: sortie.length, liens_total: nbLiens,
  resolus_en_canonique: nbResolus, non_resolus: nbPerdus,
  liens: sortie,
}, null, 1))

console.log(`segments porteurs de liens : ${sortie.length}`)
console.log(`liens exportés             : ${nbLiens}`)
console.log(`  résolus en canonique     : ${nbResolus} (${(100 * nbResolus / nbLiens).toFixed(1)} %)`)
console.log(`  non résolus              : ${nbPerdus}`)
console.log(`\nécrit : ${chemin}`)

// Répartition par œuvre — sert à choisir par quelle œuvre commencer.
const parOeuvre = {}
for (const s of sortie) parOeuvre[s.oeuvre ?? '?'] = (parOeuvre[s.oeuvre ?? '?'] ?? 0) + s.liens.length
console.log('\nliens anciens par œuvre :')
for (const [o, n] of Object.entries(parOeuvre).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(o).slice(0, 46).padEnd(48)}${n}`)
}
