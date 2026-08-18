// SQL des NOTES STRUCTURÉES (§13.4) — `texte_notes`, `texte_note_blocs`, `texte_note_relations`
// et `texte_note_ancres`. Complète `sql.mjs` (qui vise `oeuvres` + `segments`) : ici on charge la
// fonction éditoriale des notes, que le format plat `segments.notes` ne peut pas porter.
//
// Schéma et conventions relevés SUR LA BASE, jamais devinés :
//   id_texte    « TXT_A0064O0001_FR_1861_MIRANDOL » — œuvre, langue, millésime, traducteur
//   note_key    clé de note (« I-01 » en base ; « N-001 » ici, La Gueule ne connaît pas toujours le livre)
//   anchor_id   « <note_key>:<source_target> »
//   ancre       segment_numero + segment_offset_unicode (POINTS DE CODE) + marker + contexte
//   blocs       block_id « <note_key>-<rank> », rank par pas de 100
//   relations   relation_kind = 'translation_of'
// CANDIDAT à relire : rien n'entre dans l'actif sans contrôle humain (§14).

const q = (v) => (v == null || v === '') ? 'null' : `'${String(v).replace(/'/g, "''")}'`
const qNum = (v) => (v == null || v === '' || !Number.isFinite(Number(v))) ? 'null' : String(Math.trunc(Number(v)))
const qBool = (v) => (v ? 'true' : 'false')

const sansAccent = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const jeton = (s, n = 12) => sansAccent(s).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, n)

/**
 * Identifiant de témoin, sur le patron observé : TXT_<id_oeuvre>_<LANGUE>_<ANNÉE>_<TRADUCTEUR>.
 * Les parties inconnues sont simplement omises — on ne fabrique ni année ni traducteur.
 */
export function identifiantTexte({ id_oeuvre = null, meta = {} } = {}) {
  const parts = ['TXT', jeton(id_oeuvre || 'OEUVRE', 20)]
  const langue = String(meta.langue_trad || '').toLowerCase()
  if (langue.startsWith('fran')) parts.push('FR')
  else if (langue) parts.push(jeton(langue, 3))
  const annee = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(String(meta.date_publication || ''))
  if (annee) parts.push(annee[1])
  const trad = jeton(String(meta.trad_auteur || '').replace(/^(le\s+)?(p\.|m\.|abbé|père)\s+/i, '').split(/[\s,]+/).pop() || '', 14)
  if (trad) parts.push(trad)
  return parts.join('_')
}

/**
 * SQL d'import des notes typées. `notes` = sortie de `notesTypeesProjet` (avec `blocs`, `relations`
 * et, si disponible, `ancre`). Idempotent par construction : chaque table est purgée pour CE
 * `id_texte` avant réinsertion, de sorte qu'un ré-import ne duplique rien.
 */
export function construireSqlNotes({ id_texte, notes = [], livre = null } = {}) {
  const idt = id_texte || 'TXT_A_RENSEIGNER'
  const L = []
  L.push('-- La Gueule — NOTES STRUCTURÉES (charte §13.4), import CANDIDAT. À RELIRE avant exécution.')
  L.push(`-- Témoin : ${idt}`)
  if (!notes.length) { L.push('-- (aucune note typée)'); return L.join('\n') + '\n' }
  L.push('begin;')
  L.push('')
  L.push('-- Ré-import propre : on retire ce que CE témoin avait déjà, jamais les autres.')
  for (const t of ['texte_note_relations', 'texte_note_ancres', 'texte_note_blocs', 'texte_notes']) {
    L.push(`delete from public.${t} where id_texte = ${q(idt)};`)
  }
  L.push('')

  L.push('-- 1) Notes')
  L.push('insert into public.texte_notes (id_texte, note_key, book, note_number, source_target, printed_page) values')
  L.push(notes.map((n) => `  (${q(idt)}, ${q(n.note_key)}, ${q(n.book ?? livre)}, ${qNum(n.note_number)}, ${q(n.source_target ?? ('ancrage_' + n.note_number))}, ${qNum(n.printed_page)})`).join(',\n') + ';')
  L.push('')

  const blocs = notes.flatMap((n) => n.blocs || [])
  if (blocs.length) {
    L.push('-- 2) Blocs typés (kind : lemma · commentary · quotation · translation · reference · attribution)')
    L.push('insert into public.texte_note_blocs (id_texte, note_key, block_id, rank, kind, form, language, text, rendering, needs_review) values')
    L.push(blocs.map((b) => `  (${q(idt)}, ${q(b.note_key)}, ${q(b.block_id)}, ${qNum(b.rank)}, ${q(b.kind)}, ${q(b.form)}, ${q(b.language)}, ${q(b.text)}, ${q(b.rendering)}, ${qBool(b.needs_review)})`).join(',\n') + ';')
    L.push('')
  }

  const ancres = notes.map((n) => n.ancre).filter(Boolean)
  if (ancres.length) {
    L.push('-- 3) Ancres — position EXACTE de l’appel dans le segment (offset en points de code)')
    L.push('insert into public.texte_note_ancres (id_texte, anchor_id, note_key, source_target, segment_key, segment_numero, segment_offset_unicode, marker, anchor_text_left, anchor_text_right, structured_block_count) values')
    L.push(ancres.map((a) => `  (${q(idt)}, ${q(a.anchor_id)}, ${q(a.note_key)}, ${q(a.source_target)}, ${q(a.segment_key)}, ${qNum(a.segment_numero)}, ${qNum(a.segment_offset_unicode)}, ${q(a.marker)}, ${q(a.anchor_text_left)}, ${q(a.anchor_text_right)}, ${qNum(a.structured_block_count)})`).join(',\n') + ';')
    L.push('')
  }

  const rels = notes.flatMap((n) => n.relations || [])
  if (rels.length) {
    L.push('-- 4) Relations (une traduction renvoie à la citation qu’elle traduit)')
    L.push('insert into public.texte_note_relations (id_texte, note_key, relation_kind, source_block_id, target_block_id) values')
    L.push(rels.map((r) => `  (${q(idt)}, ${q(r.note_key)}, ${q(r.relation_kind)}, ${q(r.source_block_id)}, ${q(r.target_block_id)})`).join(',\n') + ';')
    L.push('')
  }

  L.push('commit;')
  return L.join('\n') + '\n'
}
