// Ce qu'un LECTEUR ORDINAIRE peut faire des données des autres, éprouvé depuis
// sa place, en transaction ANNULÉE.
//
// La faille du 2026-09-02 (n'importe quel compte pouvait se donner est_admin) a
// tenu des semaines parce que rien ne rejouait les écritures interdites. Les
// politiques RLS vivent en base, aucun test ne les lit, et une politique qui
// paraît juste à l'œil ne prouve rien : on ÉPROUVE, on ne regarde pas.
//
// Le script prend deux comptes non administrateurs (« moi » et « autre »), se
// met à la place du premier (`set_config('role','authenticated')` + jeton), et
// tente, l'une après l'autre, les écritures et lectures qu'il ne doit pas
// pouvoir faire. Tout se joue dans UN bloc `do` passé à `eprouver_sql` (clé de
// service), qui se termine par une exception : rien n'est écrit, jamais, et
// c'est dans le message de cette exception que le rapport revient. `eprouver_sql`
// ne rend pas les lignes d'un `select` : c'est la seule voie de retour.
//
//   node --env-file=.env.local scripts/audit-droits-lecteur.mjs
//   node --env-file=.env.local scripts/audit-droits-lecteur.mjs --politiques
//
// `--politiques` ne joue aucune épreuve : il relit pg_policies et les GRANT des
// tables d'utilisateurs et réécrit `sql/politiques_utilisateurs.sql`, le miroir
// versionné de ce que la base applique. Un diff sur ce fichier dit ce qui a
// changé en base sans passer par une migration.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const TABLES_UTILISATEURS = [
  'profils', 'admin_users', 'commentaires', 'commentaires_likes', 'essais', 'essais_commentaires',
  'essais_appreciations', 'catalogue_votes', 'favoris', 'prelevements', 'progression_lecture',
  'hauts_faits_obtenus', 'messages', 'signalements', 'lectures_versets', 'messages_contact',
  'inscriptions_attente', 'polyglotte_notes', 'propositions_oeuvres', 'monetisation_votes',
  'oeuvres_personnelles_segments', 'vues_pages',
]

const MARQUE = 'AUDIT-DROITS '

function lit(v) {
  if (Array.isArray(v)) return `array[${v.map(lit).join(',')}]`
  return `'${String(v).replace(/'/g, "''")}'`
}

/** Exécute un bloc qui DOIT se terminer par une exception portant la marque, et rend son message. */
async function rapportDepuisException(sql) {
  const { error } = await service.rpc('eprouver_sql', { sql })
  if (!error) throw new Error('Le bloc s’est terminé sans exception : la transaction a été VALIDÉE. À examiner tout de suite.')
  const i = error.message.indexOf(MARQUE)
  if (i < 0) throw new Error(`Erreur inattendue : ${error.message}`)
  return JSON.parse(error.message.slice(i + MARQUE.length))
}

// ── Épreuves ────────────────────────────────────────────────────────────────
// Chaque épreuve est un sous-bloc : son échec ne fait tomber ni les suivantes ni
// le rapport. `ok` dit si la base a fait ce qu'on attend d'elle.
function blocEpreuves(moi, autre) {
  const ligne = (nom, attendu, obtenu, ok) =>
    `r := r || jsonb_build_object('nom', ${lit(nom)}, 'attendu', ${lit(attendu)}, 'obtenu', ${obtenu}, 'ok', ${ok});`

  // Une épreuve dont le résultat se lit dans une variable.
  const ep = (nom, attendu, corps) => `
  begin
    ${corps}
  exception when others then
    ${ligne(nom, attendu, `'erreur ' || sqlstate || ' : ' || sqlerrm`, 'false')}
  end;`

  // Une épreuve dont le SUCCÈS est un refus de la base.
  const epRefus = (nom, corps, codes) => `
  begin
    ${corps}
    ${ligne(nom, 'refusé', `'accepté'`, 'false')}
  exception when others then
    ${ligne(nom, 'refusé', `'refusé ' || sqlstate`, `sqlstate in (${codes.map(lit).join(',')})`)}
  end;`

  // Une épreuve qui compte des lignes.
  const compte = (nom, attendu, requete) => ep(nom, String(attendu), `
    select count(*) into n from (${requete}) q;
    ${ligne(nom, String(attendu), 'n::text', `n = ${attendu}`)}`)

  // Une écriture sur les lignes d'autrui, qui doit n'en toucher aucune.
  const zeroLigne = (nom, ordre) => ep(nom, '0 ligne', `
    ${ordre}
    get diagnostics n = row_count;
    ${ligne(nom, '0 ligne', `n || ' ligne(s)'`, 'n = 0')}`)

  return `
do $audit$
declare
  moi uuid := ${lit(moi)};
  autre uuid := ${lit(autre)};
  r jsonb := '[]'::jsonb;
  n bigint;
  b boolean;
  cid bigint;
  t text;
begin
  -- Préparation, encore avec les droits du propriétaire : l'autre cache son rang,
  -- et je possède un commentaire EN ATTENTE, que je tenterai de valider puis de supprimer.
  update profils set pub_rang = false where id = autre;
  insert into commentaires (user_id, auteur_nom, texte, valide, id_verset)
    select moi, 'audit', 'texte de l''audit', false, id_verset from commentaires where id_verset is not null limit 1
    returning id into cid;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', moi, 'role', 'authenticated')::text, true);

  ${ep('profils : se donner est_admin, acces_beta, points', 'figé', `
    update profils set est_admin = true, acces_beta = true, points = 4242 where id = moi;
    select coalesce(est_admin, false) or coalesce(acces_beta, false) or points = 4242 into b from profils where id = moi;
    ${ligne('profils : se donner est_admin, acces_beta, points', 'figé', `case when b then 'ÉCRIT' else 'figé' end`, 'not b')}`)}
  ${epRefus('profils : prendre le pseudo « admin »', `update profils set pseudo = 'admin' where id = moi;`, ['23514'])}
  ${epRefus('profils : un pseudo hors format', `update profils set pseudo = 'a b' where id = moi;`, ['23514'])}
  ${compte('profils : lignes lisibles (la mienne seule)', 1, 'select 1 from profils')}
  ${zeroLigne('profils : modifier la bio d’un autre', `update profils set bio = 'pirate' where id = autre;`)}
  ${compte('lecture_utilisateurs : le rang d’un compte qui le cache', 0, 'select 1 from lecture_utilisateurs where user_id = autre')}
  ${compte('classement_utilisateurs : idem', 0, 'select 1 from classement_utilisateurs where user_id = autre')}
  ${compte('lecture_utilisateurs : ma propre ligne', 1, 'select 1 from lecture_utilisateurs where user_id = moi')}
  ${compte('commentaires : en attente d’autrui', 0, 'select 1 from commentaires where valide is not true and user_id is distinct from moi')}
  ${zeroLigne('commentaires : réécrire celui d’un autre', `update commentaires set texte = 'pirate' where user_id is distinct from moi;`)}
  ${ep('commentaires : se valider soi-même', 'figé', `
    update commentaires set valide = true, certifie = true where id = cid;
    select coalesce(valide, false) or coalesce(certifie, false) into b from commentaires where id = cid;
    ${ligne('commentaires : se valider soi-même', 'figé', `case when b then 'ÉCRIT' else 'figé' end`, 'not b')}`)}
  ${ep('commentaires : le texte d’un commentaire que je supprime', 'vidé', `
    update commentaires set supprime = true where id = cid;
    select texte into t from commentaires where id = cid;
    ${ligne('commentaires : le texte d’un commentaire que je supprime', 'vidé', `case when t = '' then 'vidé' else 'gardé' end`, `t = ''`)}`)}
  ${compte('essais_commentaires : en attente d’autrui', 0, 'select 1 from essais_commentaires where valide is not true and user_id is distinct from moi')}
  ${compte('essais : brouillons d’autrui', 0, `select 1 from essais where statut <> 'publie' and user_id is distinct from moi`)}
  ${zeroLigne('essais : modifier celui d’un autre', `update essais set titre = 'pirate' where user_id is distinct from moi;`)}
  ${compte('prelevements d’autrui', 0, 'select 1 from prelevements where user_id is distinct from moi')}
  ${compte('favoris d’autrui', 0, 'select 1 from favoris where user_id is distinct from moi')}
  ${compte('progression_lecture d’autrui', 0, 'select 1 from progression_lecture where user_id is distinct from moi')}
  ${compte('hauts_faits_obtenus d’autrui', 0, 'select 1 from hauts_faits_obtenus where user_id is distinct from moi')}
  ${zeroLigne('prelevements : effacer ceux d’un autre', `delete from prelevements where user_id is distinct from moi;`)}
  ${compte('messages : conversations dont je ne suis pas', 0, 'select 1 from messages where expediteur_id <> moi and destinataire_id <> moi')}
  ${epRefus('messages : écrire au nom d’un autre', `insert into messages (expediteur_id, destinataire_id, contenu) values (autre, moi, 'pirate');`, ['42501'])}
  ${epRefus('signalements : signaler au nom d’un autre', `insert into signalements (user_id, message) values (autre, 'pirate');`, ['42501'])}
  ${compte('signalements : lire la file', 0, 'select 1 from signalements')}
  ${epRefus('messages_contact : lire', `perform 1 from messages_contact;`, ['42501'])}
  ${epRefus('inscriptions_attente : lire', `perform 1 from inscriptions_attente;`, ['42501'])}
  ${epRefus('admin_users : lire', `perform 1 from admin_users;`, ['42501'])}
  ${epRefus('admin_users : s’y inscrire', `insert into admin_users (user_id) values (moi);`, ['42501'])}
  ${epRefus('vues_pages : lire', `perform 1 from vues_pages;`, ['42501'])}

  raise exception using message = ${lit(MARQUE)} || r::text, errcode = 'P0001';
end $audit$;`
}

function blocPolitiques() {
  const tables = `${lit(TABLES_UTILISATEURS)}::text[]`
  return `
do $audit$
declare r jsonb;
begin
  select jsonb_build_object(
    'politiques', (select coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'p', permissive, 'r', roles, 'c', cmd, 'u', qual, 'w', with_check) order by tablename, cmd, policyname), '[]'::jsonb)
                   from pg_policies where schemaname = 'public' and tablename = any(${tables})),
    'rls', (select jsonb_object_agg(relname, relrowsecurity) from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
            where ns.nspname = 'public' and relname = any(${tables})),
    'droits', (select coalesce(jsonb_agg(jsonb_build_object('t', table_name, 'g', grantee, 'd', droits) order by table_name, grantee), '[]'::jsonb)
               from (select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
                     from information_schema.role_table_grants
                     where table_schema = 'public' and grantee in ('anon', 'authenticated') and table_name = any(${tables})
                     group by table_name, grantee) g)
  ) into r;
  raise exception using message = ${lit(MARQUE)} || r::text, errcode = 'P0001';
end $audit$;`
}

function ecrirePolitiques(d) {
  const lignes = [
    '-- Politiques RLS et droits des tables d’utilisateurs, TELS QUE LA BASE LES APPLIQUE.',
    '-- Relevé par `node --env-file=.env.local scripts/audit-droits-lecteur.mjs --politiques`.',
    '-- Ce fichier est un MIROIR : on ne l’édite pas, on change la base par migration puis on le relève.',
    `-- Relevé du ${new Date().toISOString().slice(0, 10)}.`,
    '',
  ]
  const parTable = new Map()
  for (const p of d.politiques) { if (!parTable.has(p.t)) parTable.set(p.t, []); parTable.get(p.t).push(p) }
  for (const t of TABLES_UTILISATEURS) {
    const droits = d.droits.filter(x => x.t === t)
    const politiques = parTable.get(t) ?? []
    lignes.push(`-- ${t} : RLS ${d.rls?.[t] ? 'activée' : 'DÉSACTIVÉE'}` + (droits.length ? '' : ' ; aucun droit pour anon ni authenticated'))
    for (const g of droits) lignes.push(`--   ${g.g} : ${g.d}`)
    for (const p of politiques) {
      const roles = String(p.r).replace(/[{}]/g, '').split(',').join(', ')
      let s = `create policy "${p.n}" on public.${t} as ${p.p.toLowerCase()} for ${p.c.toLowerCase()} to ${roles}`
      if (p.u) s += `\n  using (${p.u})`
      if (p.w) s += `\n  with check (${p.w})`
      lignes.push(s + ';')
    }
    if (!politiques.length) lignes.push('-- (aucune politique : table fermée à l’API, clé de service seulement)')
    lignes.push('')
  }
  writeFileSync('sql/politiques_utilisateurs.sql', lignes.join('\n'))
  console.log(`sql/politiques_utilisateurs.sql relevé : ${d.politiques.length} politiques sur ${parTable.size} tables.`)
}

async function main() {
  if (process.argv.includes('--politiques')) {
    ecrirePolitiques(await rapportDepuisException(blocPolitiques()))
    return
  }
  const { data: comptes, error } = await service.from('profils').select('id, pseudo')
    .is('est_admin', false).order('created_at').limit(20)
  if (error) throw error
  const ordinaires = (comptes ?? []).filter(c => /^[a-zA-Z0-9_-]{3,30}$/.test(c.pseudo ?? ''))
  if (ordinaires.length < 2) throw new Error('Il faut deux comptes non administrateurs pour éprouver les droits.')
  const [moi, autre] = ordinaires
  console.log(`À la place de « ${moi.pseudo} », face à « ${autre.pseudo} ». Transaction annulée à la fin, rien n’est écrit.\n`)
  const rapport = await rapportDepuisException(blocEpreuves(moi.id, autre.id))
  let ko = 0
  for (const e of rapport) {
    if (!e.ok) ko++
    console.log(`${e.ok ? '  ok ' : '  KO '} ${e.nom.padEnd(58)} attendu ${e.attendu} · obtenu ${e.obtenu}`)
  }
  console.log(`\n${rapport.length} épreuves, ${ko} en défaut.`)
  process.exit(ko ? 1 : 0)
}

main().catch(e => { console.error(e.message ?? e); process.exit(2) })
