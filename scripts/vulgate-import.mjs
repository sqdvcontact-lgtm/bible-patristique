// IMPORT DE LA VULGATE CLÉMENTINE (TR0004).
//   · 35 809 versets du canon → versets_v2, dont 427 surnuméraires (ordre_slot > 1)
//   · 5 livres hors canon     → versets_apocryphes (pas de canon_id, par nature)
// Idempotent : purge TR0004 avant d'écrire.
//   node scripts/vulgate-import.mjs [--dry]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const TR = 'TR0004';
const SRC = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/sources/la/VulgClementine/VulgClementine-osis.json';
const HORS = { 'Prayer of Manasses':'MAN', 'I Esdras':'1ES', 'II Esdras':'2ES', 'Additional Psalm':'PS2', 'Laodiceans':'LAO' };
const nettoie = (t)=>(t||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

const aImporter = JSON.parse(readFileSync('scripts/_vulgate_a_importer.json','utf8'));
const j = JSON.parse(readFileSync(SRC,'utf8'));
const apocryphes = [];
for (const b of j.books) {
  const code = HORS[b.name]; if (!code) continue;
  for (const c of b.chapters||[]) for (const v of c.verses||[]) {
    const t = nettoie(v.text); if (t) apocryphes.push({ trad_id:TR, livre:code, chapitre:c.chapter, verset:v.verse, texte:t });
  }
}
console.log(`canon      : ${aImporter.length} versets (dont ${aImporter.filter(r=>r.surnumeraire).length} surnuméraires)`);
console.log(`hors canon : ${apocryphes.length} versets · ${[...new Set(apocryphes.map(a=>a.livre))].join(', ')}`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }

// 1. livre Laodicéens
// (les 5 livres hors canon sont VIDES dans ce jeu de données : rien à déclarer)
// 2. la traduction
const { error: eT } = await sb.from('traductions').upsert({
  trad_id: TR, nom: 'Vulgate clémentine', auteur: 'Jérôme de Stridon', dates: 'v. 347-420',
  langue: 'Latin', confession: 'Catholique', ordre: 4, est_referent: false,
  date_publication: '1592', schema_numerotation: 'vulgate',
  source_edition: 'Biblia Sacra Vulgatæ editionis, Sixte V et Clément VIII (1592)',
  source_url: 'https://github.com/scrollmapper/bible_databases',
  bio_courte: "Traducteur de la Bible en latin à la fin du IVᵉ siècle, à partir de l'hébreu et du grec ; sa version devint le texte de référence de l'Occident latin.",
}, { onConflict:'trad_id' });
if (eT) throw eT;
// 3. la fiche d'édition
await sb.from('editions_sources').insert({
  trad_id: TR,
  titre_edition: 'Biblia Sacra Vulgatæ editionis — édition sixto-clémentine',
  traducteur: 'Jérôme de Stridon (v. 347-420)',
  editeur: 'Typographia Apostolica Vaticana', annee_edition: '1592', lieu_edition: 'Rome',
  langue: 'Latin', confession: 'Catholique',
  source_type: 'corpus numérique', source_nom: 'scrollmapper / bible_databases — VulgClementine',
  source_url: 'https://github.com/scrollmapper/bible_databases', licence: 'Domaine public',
  particularites: "Texte latin que Lemaistre de Sacy a traduit (TR0001) ; l'alignement en dérive. 427 versets propres à la Vulgate, sans équivalent dans l'ossature, sont portés en surnuméraires au créneau où la Vulgate les place. Cette édition numérique ne porte que les 73 livres du canon : les cinq livres hors canon y sont déclarés mais sans texte.",
  integrite_verifiee: false,
});
// 4. purge puis écriture
await sb.from('versets_v2').delete().eq('trad_id', TR);
await sb.from('versets_apocryphes').delete().eq('trad_id', TR);

const lignes = aImporter.map(r=>({
  trad_id: TR, livre: r.livre, ch_orig: r.ch, v_orig: r.v,
  texte: r.texte, canon_id: r.canon_id, ordre_slot: r.ordre_slot,
  alignement_verifie: false,
  notes: r.surnumeraire ? 'Verset propre à la Vulgate, sans créneau dans l’ossature : porté en surnuméraire à l’emplacement choisi par la Vulgate.' : null,
}));
let n=0;
for (let i=0;i<lignes.length;i+=500){
  const { error } = await sb.from('versets_v2').insert(lignes.slice(i,i+500));
  if (error) { console.error('ERREUR lot',i,error.message); throw error; }
  n += Math.min(500, lignes.length-i);
  if (i % 5000 === 0) process.stdout.write(`  ${n}…\r`);
}
console.log(`\n✓ ${n} versets écrits en versets_v2`);
let m=0;
for (let i=0;i<apocryphes.length;i+=500){
  const { error } = await sb.from('versets_apocryphes').insert(apocryphes.slice(i,i+500));
  if (error) { console.error('ERREUR apocryphes', error.message); throw error; }
  m += Math.min(500, apocryphes.length-i);
}
console.log(`✓ ${m} versets écrits en versets_apocryphes`);
process.exit(0);
