import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const DRY = process.argv.includes('--dry');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: before, error: beforeError } = await db.from('oeuvres').select('*')
  .eq('id_oeuvre', OEUVRE).single();
if (beforeError) throw beforeError;
if (before.titre !== 'Hexaéméron' || before.editeur !== 'Crapart' || before.ville !== 'Paris') {
  throw new Error('Garde notice : état initial inattendu, aucune écriture');
}

const patch = {
  titre: 'Homélies sur l’Hexaéméron',
  sous_titre: 'ou L’Ouvrage des six jours',
  trad_auteur: 'Athanase Auger',
  editeur: 'François Guyot',
  ville: 'Lyon',
  date_publication: '1827',
  url_source: 'https://www.liberius.net/livres/Homelies%2C_discours_et_lettres_choisis_de_saint_Basile-le-Grand_000000468.pdf',
};

console.log(JSON.stringify({ dry: DRY, before: Object.fromEntries(Object.keys(patch).map((k) => [k, before[k]])), after: patch }, null, 2));
if (DRY) process.exit(0);

const { error: updateError } = await db.from('oeuvres').update(patch).eq('id_oeuvre', OEUVRE);
if (updateError) throw updateError;

const { data: editeurs, error: editeursError } = await db.from('editeurs').select('*');
if (editeursError) throw editeursError;
const guyot = editeurs.find((e) => e.nom_complet === 'François Guyot');
if (!guyot) {
  const { error } = await db.from('editeurs').insert({
    nom_complet: 'François Guyot',
    variantes: ['F.çois Guyot', 'F. Guyot', 'Guyot'],
    ville: 'Lyon',
    notes: 'Libraire-éditeur, grande rue Mercière, no 39, « Aux Trois Vertus théologales » ; forme attestée sur la page de titre de 1827.',
  });
  if (error) throw error;
}

const { data: after, error: afterError } = await db.from('oeuvres').select('*')
  .eq('id_oeuvre', OEUVRE).single();
if (afterError) throw afterError;
for (const [key, value] of Object.entries(patch)) {
  if (after[key] !== value) throw new Error(`Post-contrôle notice échoué : ${key}`);
}
console.log(JSON.stringify({ ok: true, notice: Object.fromEntries(Object.keys(patch).map((k) => [k, after[k]])) }, null, 2));
