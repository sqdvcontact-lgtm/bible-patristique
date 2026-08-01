import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK_ID = 'A0010O0001';
const SEGMENT_ID = 544079;
const NOTICE_ID = 2;
const PRINTER_COLOPHON = 'De l’Imprimerie d’Antoine Vitré, 1649.';
const metadata = JSON.parse(readFileSync('tmp/confessions-import-2026-07-29/confessions-metadata-candidate.json', 'utf8'));
const newWorkNote = metadata.publication_patch.note;
const newNoticeVerification = metadata.catalogue_notice.niveau_verification;
const newSignCount = metadata.oeuvre_staging.nb_signes;

const env = Object.fromEntries(readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (promise, label) => {
  const { data, error, count } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data, count };
};

const [{ data: segment }, { data: work }, { data: notice }, { data: charterRow }] = await Promise.all([
  must(db.from('segments').select('*').eq('id', SEGMENT_ID).eq('id_oeuvre', WORK_ID).single(), 'segment imprimeur'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID).single(), 'fiche œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID).single(), 'notice catalogue'),
  must(db.from('parametres').select('cle,valeur').eq('cle', 'charte_ia').single(), 'charte'),
]);

if (segment.segment_numero !== 10349
    || segment.segment_texte !== PRINTER_COLOPHON
    || segment.nature !== 'apparat_critique'
    || segment.ref_niv1 !== 'Fin') {
  throw new Error('Précondition refusée : le segment final ne correspond plus à la mention d’imprimeur attendue.');
}
if (!String(work.note ?? '').includes('le colophon sont conservés dans l’apparat éditorial')) {
  throw new Error('Précondition refusée : la note de l’œuvre a déjà changé.');
}
if (work.nb_signes !== 880724) throw new Error(`Précondition refusée : nb_signes=${work.nb_signes}.`);
if (String(notice.niveau_verification ?? '').includes(PRINTER_COLOPHON)) {
  throw new Error('Précondition refusée : la notice contient déjà la mention d’imprimeur.');
}

for (const [table, column, value] of [
  ['liens_bibliques', 'segment_id', SEGMENT_ID],
  ['commentaires', 'id_segment', SEGMENT_ID],
  ['signalements', 'id_segment', SEGMENT_ID],
  ['prelevements', 'segment_numero', 10349],
]) {
  const { count } = await must(db.from(table).select('*', { count: 'exact', head: true }).eq(column, value), `${table} liés`);
  if (count !== 0) throw new Error(`Suppression refusée : ${count} ligne(s) liée(s) dans ${table}.`);
}

const charter = String(charterRow.valeur ?? '');
const charterAnchor = 'Cette exclusion ne concerne pas les titres de parties ou de sections effectivement placés dans le corps de l’œuvre.';
const charterRule = '**Mentions d’imprimeur et colophons bibliographiques.** Une formule qui indique seulement l’imprimeur, le lieu ou la date d’impression est conservée sous sa forme exacte dans les métadonnées ou la notice bibliographique ; elle ne devient ni segment du corps ni `apparat_critique`. Un colophon qui appartient réellement au contenu transmis de l’œuvre reste traité selon sa fonction textuelle : on ne classe donc jamais un passage par sa seule position en fin de volume.';
if (!charter.includes(charterAnchor)) throw new Error('Ancre de charte introuvable.');
if (charter.includes(charterRule)) throw new Error('La règle de charte existe déjà.');
const newCharter = charter.replace(charterAnchor, `${charterAnchor}\n\n${charterRule}`);

const backup = {
  backed_up_at: new Date().toISOString(),
  work,
  notice,
  segment,
  charter_sha_length: charter.length,
};
mkdirSync('audit', { recursive: true });
writeFileSync('audit/confessions-printer-colophon-before-2026-07-29.json', `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

const plan = {
  apply: APPLY,
  segment_to_remove: { id: segment.id, numero: segment.segment_numero, texte: segment.segment_texte },
  work_update: { note: newWorkNote, nb_signes: newSignCount },
  notice_update: { niveau_verification: newNoticeVerification },
  charter_rule: charterRule,
};
if (!APPLY) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

await must(db.from('oeuvres').update({ note: newWorkNote, nb_signes: newSignCount }).eq('id_oeuvre', WORK_ID), 'mise à jour œuvre');
await must(db.from('catalogue_notices').update({ niveau_verification: newNoticeVerification }).eq('id', NOTICE_ID), 'mise à jour notice');
await must(db.from('parametres').update({ valeur: newCharter }).eq('cle', 'charte_ia'), 'mise à jour charte');
await must(db.from('segments').delete().eq('id', SEGMENT_ID).eq('id_oeuvre', WORK_ID), 'suppression du segment bibliographique');
await must(db.from('journal_ia').insert({
  sujet: 'Confessions - mention d’imprimeur déplacée vers les métadonnées',
  probleme: `La formule « ${PRINTER_COLOPHON} » était affichée à tort comme apparat critique.`,
  reponse: JSON.stringify({
    segment_supprime: SEGMENT_ID,
    conservation: ['oeuvres.note', 'catalogue_notices.niveau_verification'],
    charte: 'règle ajoutée sur les mentions d’imprimeur et colophons bibliographiques',
  }),
  statut: 'terminé',
}), 'journal');

const [{ data: afterSegment, count: segmentCount }, { data: afterWork }, { data: afterNotice }, { data: afterCharter }] = await Promise.all([
  must(db.from('segments').select('id', { count: 'exact' }).eq('id_oeuvre', WORK_ID).eq('id', SEGMENT_ID), 'vérification segment'),
  must(db.from('oeuvres').select('note,nb_signes').eq('id_oeuvre', WORK_ID).single(), 'vérification œuvre'),
  must(db.from('catalogue_notices').select('niveau_verification').eq('id', NOTICE_ID).single(), 'vérification notice'),
  must(db.from('parametres').select('valeur').eq('cle', 'charte_ia').single(), 'vérification charte'),
]);
if (segmentCount !== 0 || afterSegment.length !== 0) throw new Error('Le segment bibliographique existe encore.');
if (afterWork.note !== newWorkNote || afterWork.nb_signes !== newSignCount) throw new Error('La fiche œuvre ne correspond pas au candidat.');
if (afterNotice.niveau_verification !== newNoticeVerification) throw new Error('La notice ne conserve pas la mention exacte.');
if (!String(afterCharter.valeur ?? '').includes(charterRule)) throw new Error('La règle de charte n’a pas été enregistrée.');

console.log(JSON.stringify({ ok: true, ...plan }, null, 2));
