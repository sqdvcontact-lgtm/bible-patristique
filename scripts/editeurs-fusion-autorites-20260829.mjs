/**
 * § 35.6.4 — Passe rétroactive de fusion des autorités d’éditeurs.
 *
 * Aucune graphie ne doit rester une autorité quand une autre fiche la déclare
 * variante. La passe ne décide rien par elle-même : elle se contente de RÉÉCRIRE
 * les fiches, et ce sont les déclencheurs posés par
 * `sql/20260829_fusion_autorites_editeurs.sql` qui nettoient, contrôlent et
 * fusionnent. ⛔ Aucune clé d’éditeur n’est recodée ici : le plan vient de la base
 * (`variantes_editeurs_disputees`, `propagation_editeurs_a_faire`,
 * `autorites_editeurs_a_fusionner`).
 *
 * Trois temps :
 *   1. les graphies DISPUTÉES par deux autorités sont signalées, jamais fusionnées —
 *      c’est une décision philologique ;
 *   2. chaque fiche à variantes est retouchée : les renvois d’une fiche à elle-même
 *      tombent, les doublons de clé aussi, et l’autorité redondante est absorbée ;
 *   3. une variante déclarée dans un référentiel se propage à l’autre, pour que les
 *      deux listes disent la même chose.
 *
 * L’état d’avant part dans `sql/rollback_fusion_autorites_editeurs_20260829.sql`.
 * ⛔ La donnée source (`oeuvres.editeur`, `ouvrages_bibliographiques.editeur`,
 * `catalogue_notices.editeur`) n’est jamais touchée : elle est la provenance.
 *
 * Usage : node scripts/editeurs-fusion-autorites-20260829.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const lire = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data ?? [] }
const plan = async (fn) => { const { data, error } = await db.rpc(fn); if (error) throw new Error(`${fn} : ${error.message}`); return data ?? [] }

// ── Littéraux SQL, pour le fichier de retour arrière ────────────────────────
const txt = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/gu, "''")}'`)
const num = (v) => (v === null || v === undefined ? 'null' : String(v))
const tab = (v) => (!v || v.length === 0 ? `'{}'::text[]` : `array[${v.map(txt).join(', ')}]::text[]`)

// ── 0. Ce que la passe va toucher, avant qu’elle n’y touche ─────────────────
const editeursAvant = await lire(db.from('editeurs').select('*').order('id'))
const valeursAvant = await lire(db.from('editeurs_valeur').select('*').order('id'))
const ouvragesAvant = await lire(db.from('ouvrages_bibliographiques').select('id, editeur_valeur_id').not('editeur_valeur_id', 'is', null))
const collectionsAvant = await lire(db.from('collections_editeurs').select('collection_id, editeur_id'))

const retour = [
  `-- Retour arrière de la passe § 35.6.4 du 29 août 2026 (fusion des autorités d’éditeurs).`,
  `-- État relevé avant la passe : ${editeursAvant.length} maisons, ${valeursAvant.length} autorités,`,
  `-- ${ouvragesAvant.length} notices rattachées, ${collectionsAvant.length} liens de collection.`,
  `-- ⚠️ Les déclencheurs de fusion refuseraient de rendre une graphie à son autorité :`,
  `-- on les écarte le temps de la restauration.`,
  ``,
  `begin;`,
  `alter table public.editeurs disable trigger editeurs_fusion_variantes;`,
  `alter table public.editeurs disable trigger editeurs_absorber;`,
  `alter table public.editeurs_valeur disable trigger editeurs_valeur_fusion_aliases;`,
  `alter table public.editeurs_valeur disable trigger editeurs_valeur_absorber;`,
  ``,
  ...editeursAvant.map(e =>
    `insert into public.editeurs (id, nom_complet, variantes, ville, annee_debut, annee_fin, notes, created_at) overriding system value` +
    ` values (${e.id}, ${txt(e.nom_complet)}, ${tab(e.variantes)}, ${txt(e.ville)}, ${num(e.annee_debut)}, ${num(e.annee_fin)}, ${txt(e.notes)}, ${txt(e.created_at)})` +
    ` on conflict (id) do update set nom_complet = excluded.nom_complet, variantes = excluded.variantes, ville = excluded.ville,` +
    ` annee_debut = excluded.annee_debut, annee_fin = excluded.annee_fin, notes = excluded.notes;`),
  ``,
  ...valeursAvant.map(v =>
    `insert into public.editeurs_valeur (id, nom, aliases, score, statut_usage, confiance_evaluation, source_evaluation, evalue_par, evalue_at, note, created_at, updated_at) overriding system value` +
    ` values (${v.id}, ${txt(v.nom)}, ${tab(v.aliases)}, ${num(v.score)}, ${txt(v.statut_usage)}, ${txt(v.confiance_evaluation)}, ${txt(v.source_evaluation)}, ${txt(v.evalue_par)}, ${txt(v.evalue_at)}, ${txt(v.note)}, ${txt(v.created_at)}, ${txt(v.updated_at)})` +
    ` on conflict (id) do update set nom = excluded.nom, aliases = excluded.aliases, score = excluded.score,` +
    ` statut_usage = excluded.statut_usage, confiance_evaluation = excluded.confiance_evaluation,` +
    ` source_evaluation = excluded.source_evaluation, evalue_par = excluded.evalue_par, evalue_at = excluded.evalue_at, note = excluded.note;`),
  ``,
  ...ouvragesAvant.map(o =>
    `update public.ouvrages_bibliographiques set editeur_valeur_id = ${o.editeur_valeur_id} where id = ${o.id} and editeur_valeur_id is distinct from ${o.editeur_valeur_id};`),
  ``,
  ...collectionsAvant.map(c =>
    `insert into public.collections_editeurs (collection_id, editeur_id) values (${c.collection_id}, ${c.editeur_id}) on conflict do nothing;`),
  ``,
  `alter table public.editeurs enable trigger editeurs_fusion_variantes;`,
  `alter table public.editeurs enable trigger editeurs_absorber;`,
  `alter table public.editeurs_valeur enable trigger editeurs_valeur_fusion_aliases;`,
  `alter table public.editeurs_valeur enable trigger editeurs_valeur_absorber;`,
  `commit;`,
  ``,
].join('\n')

const cheminRetour = resolve(racine, 'sql/rollback_fusion_autorites_editeurs_20260829.sql')
if (!essaiSeul) writeFileSync(cheminRetour, retour, 'utf8')
console.log(`État d’avant : ${editeursAvant.length} maisons, ${valeursAvant.length} autorités.`)
console.log(essaiSeul ? '(essai : le retour arrière n’est pas écrit)' : `Retour arrière écrit : ${cheminRetour}`)

// ── 1. Les graphies disputées : signalées, jamais fusionnées ────────────────
const disputees = await plan('variantes_editeurs_disputees')
console.log(`\n── Graphies disputées (décision humaine) : ${disputees.length}`)
disputees.forEach(d => console.log(`   « ${d.graphie} » revendiquée par ${d.autorites.map(a => `« ${a} »`).join(' et ')}`))

// ── 2. Chaque fiche à variantes est retouchée ───────────────────────────────
const echecs = []

async function retoucher(table, cle, champ, id) {
  const { data: fiche, error: e1 } = await db.from(table).select(`id, ${cle}, ${champ}`).eq('id', id).maybeSingle()
  if (e1) throw new Error(`${table} #${id} : ${e1.message}`)
  if (!fiche) return 'absorbee'
  const { error } = await db.from(table).update({ [champ]: fiche[champ] ?? [] }).eq('id', id)
  if (error) { echecs.push({ table, id, nom: fiche[cle], message: error.message }); return 'refus' }
  return 'ok'
}

const aRetoucher = [
  ...editeursAvant.filter(e => (e.variantes ?? []).length > 0).map(e => ({ table: 'editeurs', cle: 'nom_complet', champ: 'variantes', id: e.id })),
  ...valeursAvant.filter(v => (v.aliases ?? []).length > 0).map(v => ({ table: 'editeurs_valeur', cle: 'nom', champ: 'aliases', id: v.id })),
]
console.log(`\n── Fiches à variantes retouchées : ${aRetoucher.length}`)
if (!essaiSeul) {
  const bilan = { ok: 0, absorbee: 0, refus: 0 }
  for (const f of aRetoucher) bilan[await retoucher(f.table, f.cle, f.champ, f.id)] += 1
  console.log(`   ${bilan.ok} réécrites, ${bilan.absorbee} déjà absorbées, ${bilan.refus} refusées.`)
}

// ── 3. La variante déclarée d’un côté se propage à l’autre ──────────────────
const propagations = await plan('propagation_editeurs_a_faire')
console.log(`\n── Propagations d’un référentiel à l’autre : ${propagations.length}`)
propagations.forEach(p => console.log(`   ${p.referentiel} : « ${p.graphie} » descend en variante de « ${p.autorite} »`))
if (!essaiSeul) {
  for (const p of propagations) {
    const champ = p.referentiel === 'editeurs' ? 'variantes' : 'aliases'
    const { data: fiche } = await db.from(p.referentiel).select(`id, ${champ}`).eq('id', p.autorite_id).maybeSingle()
    if (!fiche) continue
    const { error } = await db.from(p.referentiel).update({ [champ]: [...(fiche[champ] ?? []), p.graphie] }).eq('id', p.autorite_id)
    if (error) echecs.push({ table: p.referentiel, id: p.autorite_id, nom: p.autorite, message: error.message })
  }
}

// ── 4. Contrôle de clôture ──────────────────────────────────────────────────
if (echecs.length) {
  console.log(`\n── Refus du verrou (${echecs.length}) :`)
  echecs.forEach(e => console.log(`   ${e.table} #${e.id} « ${e.nom} » : ${e.message}`))
}

const reste = await plan('autorites_editeurs_a_fusionner')
console.log(`\n── Contrôle de clôture : ${reste.length} forme(s) encore autorité alors qu’une fiche la déclare variante`)
reste.forEach(r => console.log(`   ${r.referentiel} #${r.id} « ${r.forme} » — variante de « ${r.autorite} » (${r.ou})`))

const editeursApres = await lire(db.from('editeurs').select('id'))
const valeursApres = await lire(db.from('editeurs_valeur').select('id'))
console.log(`\nAprès : ${editeursApres.length} maisons (${editeursAvant.length - editeursApres.length} fusionnées), ` +
  `${valeursApres.length} autorités (${valeursAvant.length - valeursApres.length} fusionnées).`)
