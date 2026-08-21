import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..', '..')
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]),
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Configuration Supabase absente.')
const headers = {
  apikey: key,
  authorization: `Bearer ${key}`,
  'content-type': 'application/json',
}

const response = await fetch(`${url}/rest/v1/controle_sections?select=*&cle=eq.corpus`, { headers })
const body = await response.text()
if (!response.ok) throw new Error(`Section corpus illisible (HTTP ${response.status}) : ${body.slice(0, 1200)}`)
const rows = JSON.parse(body)
if (rows.length !== 1) throw new Error(`Section corpus attendue une fois, obtenu : ${rows.length}`)
const current = rows[0]

const doneTag = '[FILLION|socle-pilot-mrk1-20260820]'
const pendingTag = '[FILLION|validation-pilot-mrk1]'
const doneText = `${doneTag} Socle éditorial Fillion déployé : famille bilingue TR0011/TR0010 et 8 composants bibliographiques en brouillon ; pilote privé Marc I, 1-20 avec 2 sources en revue, 46 unités, 46 segments, 40 alignements canoniques en revue, 6 blocs de corps, 1 note ancrée latin/français et 1 illustration du Jourdain associée après I, 9 ; master PNG privé vérifié par SHA-256 ; 0 ligne au catalogue public.`
const pendingText = `⏳ En cours — ${pendingTag} Valider visuellement et textuellement le pilote Marc I, 1-20 : collation des versets latin/français, des extraits d’introduction et de commentaires, de la note bilingue et de l’illustration ; seulement après validation, téléverser le WebP et ouvrir les capacités publiques.`
const summary = 'Fillion : le socle éditorial bilingue et le pilote privé Marc I, 1-20 sont en place au 20 août 2026. Le pilote conserve les références imprimées I, 1-20 et les aligne séparément sur 20 créneaux canoniques ; il comprend six blocs de corps, une note ancrée sur le latin et le français, et l’illustration du Jourdain après I, 9. Le master PNG est privé et vérifié ; le WebP reste local en revue ; aucune ligne Fillion n’est visible dans le catalogue public.'

const todos = Array.isArray(current.todos) ? [...current.todos] : []
if (!todos.some((item) => item?.texte?.includes(doneTag))) todos.push({ fait: true, texte: doneText })
if (!todos.some((item) => item?.texte?.includes(pendingTag))) todos.push({ fait: false, texte: pendingText })
const commentaire = String(current.commentaire_ia ?? '')
const commentaire_ia = commentaire.includes('Fillion : le socle éditorial bilingue')
  ? commentaire
  : `${commentaire} ${summary}`.trim()

if (commentaire_ia !== commentaire || JSON.stringify(todos) !== JSON.stringify(current.todos)) {
  const filter = `cle=eq.corpus&maj_le=eq.${encodeURIComponent(current.maj_le)}`
  const patch = await fetch(`${url}/rest/v1/controle_sections?${filter}`, {
    method: 'PATCH',
    headers: { ...headers, prefer: 'return=representation' },
    body: JSON.stringify({ commentaire_ia, todos, maj_le: new Date().toISOString() }),
  })
  const patchBody = await patch.text()
  if (!patch.ok) throw new Error(`Mise à jour du centre refusée (HTTP ${patch.status}) : ${patchBody.slice(0, 1200)}`)
  if (JSON.parse(patchBody).length !== 1) throw new Error('La section corpus a changé concurremment ; aucune écriture confirmée.')
}

async function refreshStats() {
  const response = await fetch(`${url}/rest/v1/rpc/rafraichir_controle_stats`, {
    method: 'POST', headers, body: '{}',
  })
  return { response, body: await response.text() }
}

let refresh = await refreshStats()
if (!refresh.response.ok && refresh.body.includes('57014')) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 1200))
  refresh = await refreshStats()
}
const statsRefreshTimedOut = !refresh.response.ok && refresh.body.includes('57014')
if (!refresh.response.ok && !statsRefreshTimedOut) {
  throw new Error(`Rafraîchissement des statistiques refusé (HTTP ${refresh.response.status}) : ${refresh.body.slice(0, 800)}`)
}

const verify = await fetch(`${url}/rest/v1/controle_sections?select=commentaire_ia,todos,maj_le&cle=eq.corpus`, { headers })
const verifiedRows = await verify.json()
const verified = verifiedRows[0]
if (!verify.ok || !verified?.commentaire_ia?.includes('Fillion : le socle éditorial bilingue')) {
  throw new Error('Le résumé Fillion n’est pas relu dans le centre de contrôle.')
}
if (!verified.todos.some((item) => item?.texte?.includes(doneTag) && item.fait === true)) {
  throw new Error('Le jalon Fillion achevé manque au centre de contrôle.')
}
if (!verified.todos.some((item) => item?.texte?.includes(pendingTag) && item.fait === false)) {
  throw new Error('La validation Fillion à faire manque au centre de contrôle.')
}

console.log(JSON.stringify({
  section: 'corpus',
  milestone_recorded: doneTag,
  validation_todo_recorded: pendingTag,
  maj_le: verified.maj_le,
  stats_refresh: statsRefreshTimedOut ? 'timeout_57014_after_one_retry' : 'ok',
}, null, 2))
