// Aligne l'ossature du Siracide sur l'AELF, désormais référence pour ce livre seul.
//
// POURQUOI CE LIVRE FAIT EXCEPTION. Le Siracide existe en deux recensions — le grec bref, que
// suit Crampon, et la version longue gréco-latine, que traduit Sacy — avec une quarantaine de
// versets d'écart. Aucun accord n'était possible entre les témoins. Pire : on a découvert que
// `versets_canon` ET le référent TR0003 sortaient du MÊME fichier (FreCrampon.json,
// scrollmapper), si bien que l'ossature n'était pas un témoin indépendant pour ce livre.
// L'éditeur a donc arrêté que l'AELF ferait référence ici, ce qui rétablit l'intention
// d'origine — l'ossature est censée suivre l'AELF partout.
//
// L'ÉCART EST FAIBLE ET LOCALISÉ : 1 407 versets à l'AELF contre 1 418 au canon, et 45
// chapitres sur 51 coïncident déjà. Trois créneaux sont à retirer, un à ajouter, et six
// versets de deux chapitres restent à trancher sur le texte (5, 41, 43).
//
// LES VERSETS QUI PERDENT LEUR CRÉNEAU DEVIENNENT SURNUMÉRAIRES — ils ne sont pas supprimés.
// Sacy et Crampon les portent, et l'édition doit continuer de les montrer : simplement, ils
// sortent de l'ossature, comme tout ce qui n'a pas de répondant dans la référence.
//
//   node scripts/sir-ossature-aelf.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// Créneaux que l'AELF ne numérote pas : elle passe de 18,2 à 18,4 et de 36,13 à 36,16.
// Deuxième vague : neuf créneaux que l'ossature avait hérités du fichier scrollmapper et que
// NI l'AELF NI Crampon ne connaissent — accord des deux témoins vérifié rang par rang.
const A_RETIRER = ['SIR.5.16','SIR.5.17','SIR.41.23','SIR.41.24','SIR.41.25','SIR.41.26','SIR.41.27','SIR.43.34','SIR.43.35']
const NOTE = `Ce verset n’a pas de correspondant dans la référence retenue pour ce livre (AELF), qui ne le numérote pas ; il est donc surnuméraire, tout en étant attesté par cette édition.`

// L'AELF porte au chapitre 39 un verset liminaire numéroté 0, avant le v. 1.
const A_AJOUTER = { id: 'SIR.39.0', livre: 'SIR', ch_canon: 39, v_canon: 0,
                    ordre: 29039000, est_suscription: false, ch_heb: 39, v_heb: 0 }

// ── sauvegarde de tout ce qu'on va toucher, AVANT de le toucher ──────────────────────────
const { data: creneaux } = await sb.from('versets_canon').select('*').in('id', A_RETIRER)
const { data: versets }  = await sb.from('versets_v2').select('*').in('canon_id', A_RETIRER)
console.log(`${DRY?'[DRY] ':''}créneaux à retirer : ${creneaux.length} · versets à rendre surnuméraires : ${versets.length}`)
for (const v of versets) console.log(`   ${v.trad_id} ${v.livre} ${v.ch_orig},${v.v_orig} — ${(v.texte||'').slice(0,52)}`)
const { data: existe } = await sb.from('versets_canon').select('id').eq('id', A_AJOUTER.id)
console.log(`${DRY?'[DRY] ':''}créneau à ajouter : ${A_AJOUTER.id}${existe.length ? ' (existe déjà)' : ''}`)

if (!DRY){
  writeFileSync(D + `avant_ossature_sir_${Date.now()}.json`, JSON.stringify({ creneaux, versets }, null, 1))
  // 1. les versets d'abord : on ne retire jamais un créneau avant d'avoir détaché ce qui s'y accroche.
  // UN VERSET QUI PORTE DU TEXTE devient surnuméraire — il reste visible, hors ossature.
  // UNE LIGNE VIDE est supprimée : ce sont les fantômes créés par l'import scrollmapper, qui
  // réservait un rang sans rien y mettre. Les garder en surnuméraires afficherait des cases
  // creuses dans la colonne, ce qui serait pire que le trou qu'on vient de fermer.
  for (const v of versets){
    const { error } = v.texte && v.texte.trim()
      ? await sb.from('versets_v2').update({ canon_id: null, notes: [v.notes, NOTE].filter(Boolean).join(' ') }).eq('id', v.id)
      : await sb.from('versets_v2').delete().eq('id', v.id)
    if (error){ console.error('  ERR ' + error.message); process.exit(1) }
  }
  const { error: e1 } = await sb.from('versets_canon').delete().in('id', A_RETIRER)
  if (e1){ console.error('  ERR ' + e1.message); process.exit(1) }
  if (!existe.length){
    const { error: e2 } = await sb.from('versets_canon').insert(A_AJOUTER)
    if (e2){ console.error('  ERR ' + e2.message); process.exit(1) }
  }
  const { count } = await sb.from('versets_canon').select('*', { count: 'exact', head: true }).like('id','SIR.%')
  console.log(`  écrit — ossature du Siracide : ${count} créneaux`)
}
