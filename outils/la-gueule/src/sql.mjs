// Génère un fichier SQL PRÊT à importer dans Supabase (Postgres) : un upsert des métadonnées
// dans `oeuvres` et des inserts de `segments` (schéma réel du site). CANDIDAT à relire avant
// exécution (doctrine §14 : rien n'entre dans l'actif sans contrôle humain). L'id `segments.id`
// est une identité → jamais fourni ; `marquage_source` marque l'origine « La Gueule ».

const q = (v) => (v == null || v === '') ? 'null' : `'${String(v).replace(/'/g, "''")}'`
const qNum = (v) => (v == null || v === '' || !Number.isFinite(Number(v))) ? 'null' : String(Math.trunc(Number(v)))

// Colonnes de `oeuvres` qu'on sait renseigner depuis les métadonnées (mêmes noms que la table).
const COLS_OEUVRE = ['titre', 'sous_titre', 'titre_original', 'langue_originale', 'langue_trad',
  'trad_auteur', 'editeur', 'collection', 'ville', 'date_publication', 'date_composition', 'genre']

/**
 * Construit le SQL d'import. { meta, segments, id_oeuvre }. Renvoie une chaîne.
 * - upsert `oeuvres` (on conflict id_oeuvre) ;
 * - rattachement `id_auteur` en commentaire actif (sous-requête sur `auteurs.nom`) ;
 * - insert `segments` en une instruction multi-lignes, colonnes présentes seulement.
 */
export function construireSqlSupabase({ meta = {}, segments = [], id_oeuvre = null } = {}) {
  const ido = id_oeuvre || 'IDOEUVRE_A_RENSEIGNER'
  const L = []
  L.push('-- La Gueule — import CANDIDAT (OCR). À RELIRE avant exécution ; rien ne doit entrer')
  L.push('-- dans les tables actives sans contrôle humain (charte §14).')
  L.push(`-- Œuvre : ${ido}`)
  L.push('begin;')
  L.push('')

  // Métadonnées de l'œuvre (upsert).
  const setCols = COLS_OEUVRE.filter((c) => meta[c])
  L.push('-- 1) Métadonnées de l’œuvre')
  L.push(`insert into public.oeuvres (id_oeuvre${setCols.length ? ', ' + setCols.join(', ') : ''})`)
  L.push(`values (${q(ido)}${setCols.length ? ', ' + setCols.map((c) => q(meta[c])).join(', ') : ''})`)
  L.push(`on conflict (id_oeuvre) do update set ${setCols.length ? setCols.map((c) => `${c} = excluded.${c}`).join(', ') : 'id_oeuvre = excluded.id_oeuvre'};`)
  if (meta.auteur) {
    const prem = String(meta.auteur).replace(/^[Ss]aint[e]?\s+/, '').split(/[\s-]/)[0]
    L.push(`-- Auteur détecté : « ${meta.auteur} » — rattachement id_auteur (À VÉRIFIER) :`)
    L.push(`update public.oeuvres set id_auteur = (select id_auteur from public.auteurs where nom ilike ${q('%' + prem + '%')} order by length(nom) limit 1)`)
    L.push(`  where id_oeuvre = ${q(ido)} and id_auteur is null;`)
  }
  L.push('')

  // Segments : on ne liste que les colonnes réellement utilisées (union sur le lot).
  const base = ['id_oeuvre', 'segment_numero', 'rang', 'page', 'paragraphe', 'nature', 'segment_texte', 'texte_original', 'notes']
  const refCols = []
  for (const k of [1, 2, 3, 4, 5]) for (const suf of ['', '_texte']) {
    const c = `ref_niv${k}${suf}`
    if (segments.some((s) => s[c])) refCols.push(c)
  }
  const cols = [...base, ...refCols, 'marquage_source']
  L.push(`-- 2) Segments (${segments.length}) — id auto (identité), marquage « La Gueule »`)
  L.push(`insert into public.segments (${cols.join(', ')}) values`)
  const lignes = segments.map((s, i) => {
    const numeros = new Set(['segment_numero', 'rang', 'page', 'paragraphe'])
    const val = (c) => {
      if (c === 'id_oeuvre') return q(ido)
      if (c === 'segment_numero') return qNum(s.rang) // ordre de lecture = rang
      if (c === 'nature') return q(s.nature || 'texte')
      if (c === 'marquage_source') return q('La Gueule (OCR candidat)')
      return numeros.has(c) ? qNum(s[c]) : q(s[c])
    }
    return '  (' + cols.map(val).join(', ') + ')'
  })
  L.push(lignes.join(',\n') + ';')
  L.push('')
  L.push('commit;')
  return L.join('\n') + '\n'
}
