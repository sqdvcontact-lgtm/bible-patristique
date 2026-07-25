// Passe sémantique — Jean Climaque, « L'Échelle du Paradis » (A0078O0001).
//
// La passe de références (parenthèses « (cf. Mt 8, 22) ») est déjà faite : 52
// liens provenance=editeur. Restaient 117 segments citant l'Écriture entre
// guillemets SANS référence en parenthèse. Je les ai relus un à un et relevé
// les citations franches ; les simples mots entre guillemets (« moine »,
// « chrétien ») et les paroles des Pères ne sont pas retenus.
//
// Les citations verbatim d'une source non ambiguë sont « probable » ; les
// paraphrases ou les cas où le verset exact / l'évangile reste discutable sont
// « douteux » + arbitrage_requis. Toutes type 1 (citation), provenance ia.
//
// Les PSAUMES sont donnés en numérotation HÉBRAÏQUE ([ch,v] de l'édition) et
// convertis vers l'ossature grecque via ch_heb/v_heb (charte §18) — jamais
// converti à la main. Les autres livres sont donnés directement en canon.
//
// Idempotent, dédoublonne sur (segment_id, canon_id, type). Mode --dry.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const OEUVRE = 'A0078O0001';
const P = 'probable', D = 'douteux';

// segment_numero → citations relevées.
//   psaume  : { psH:[chHeb, vHeb], f, m }
//   autre   : { id:'MAT.8.22',    f, m }
const CIT = {
  5:   [{ psH: [14, 1], f: P, m: '« Il n’y a aucun Dieu ! » — l’insensé du Ps 14 (13), 1.' }],
  34:  [{ id: 'MAT.9.12', f: P, m: '« ce ne sont pas les biens portants qui ont besoin de médecin » — Mt 9, 12.' },
        { psH: [141, 4], f: D, m: '« Ils cherchent des excuses à leurs péchés » — Ps 141 (140), 4.' }],
  49:  [{ id: 'MAT.8.22', f: P, m: '« laisse les morts ensevelir leurs morts » — Mt 8, 22.' }],
  52:  [{ id: 'MAT.19.21', f: P, m: '« vends ton bien, donnes-en le prix aux pauvres et suis-moi » — Mt 19, 21.' }],
  59:  [{ id: 'MAT.5.3', f: D, m: '« le royaume des cieux leur appartient » — béatitude, Mt 5, 3 (ou 5, 10).' }],
  67:  [{ id: 'LUK.4.24', f: P, m: '« personne n’est bon prophète dans son propre pays » — Lc 4, 24.' }],
  85:  [{ id: 'MAT.6.24', f: P, m: '« Personne ne peut servir deux maîtres » — Mt 6, 24.' }],
  86:  [{ id: 'MAT.10.34', f: P, m: '« non la paix, mais la guerre et le glaive » — Mt 10, 34.' }],
  92:  [{ id: 'GEN.12.1', f: P, m: '« Sors de ton pays, de ta parenté et de la maison de ton père » — Gn 12, 1.' }],
  116: [{ id: 'ROM.14.23', f: P, m: '« tout ce qui ne vient pas de la foi est péché » — Rm 14, 23.' }],
  123: [{ psH: [32, 5], f: P, m: '« j’ai résolu de confesser mes iniquités… vous m’avez pardonné » — Ps 32 (31), 5.' }],
  138: [{ id: '1CO.13.5', f: P, m: '« l’amour ne pense pas le mal » — 1 Co 13, 5.' }],
  140: [{ id: 'ROM.8.38', f: P, m: '« ni les anges, ni les principautés… ne pourront nous séparer de l’amour de Dieu » — Rm 8, 38-39.' }],
  149: [{ psH: [133, 1], f: P, m: '« Qu’il est bon et agréable de vivre au milieu de ses frères ! » — Ps 133 (132), 1.' }],
  156: [{ psH: [94, 19], f: P, m: '« selon la multitude des douleurs… vos consolations ont réjoui mon âme » — Ps 94 (93), 19.' }],
  186: [{ psH: [136, 23], f: P, m: '« Le Seigneur s’est souvenu de nous dans notre humiliation » — Ps 136 (135), 23-24.' }],
  189: [{ id: 'ECC.4.9', f: D, m: '« il vaut mieux être deux ensemble que seul » — Qo 4, 9.' }],
  272: [{ psH: [89, 50], f: P, m: '« Où sont, Seigneur, tes anciennes miséricordes ? » — Ps 89 (88), 50.' },
        { psH: [89, 51], f: P, m: '« Souviens-toi, Seigneur, des humiliations de tes serviteurs » — Ps 89 (88), 51.' }],
  319: [{ psH: [16, 8], f: P, m: '« Je regardais continuellement le Seigneur, présent devant mes yeux » — Ps 16 (15), 8.' }],
  350: [{ id: 'MAT.25.41', f: P, m: '« Retirez-vous de moi, maudits » — Mt 25, 41.' }],
  355: [{ psH: [137, 4], f: P, m: '« Comment chanter les cantiques du Seigneur sur une terre étrangère ? » — Ps 137 (136), 4.' }],
  370: [{ psH: [142, 8], f: P, m: '« Tire mon âme de ce lieu où je suis enfermé » — Ps 142 (141), 8.' }],
  378: [{ id: 'REV.21.4', f: P, m: '« ni pleurs, ni gémissements, ni douleur » — Ap 21, 4.' }],
  379: [{ psH: [146, 8], f: P, m: '« Le Seigneur éclaire les aveugles » — Ps 146 (145), 8.' }],
  498: [{ psH: [5, 7], f: P, m: '« Tu perdras, Seigneur, tous ceux qui profèrent le mensonge » — Ps 5, 7 (5, 6).' }],
  591: [{ id: 'EPH.5.12', f: P, m: '« ce qui se fait en secret, il est honteux même de le nommer » — Ep 5, 12.' }],
  592: [{ id: 'ROM.7.24', f: P, m: '« qui me délivrera de ce corps de mort ? » — Rm 7, 24.' }],
  643: [{ psH: [6, 3], f: P, m: '« Aie pitié de moi, Seigneur, car je suis faible » — Ps 6, 3 (6, 2).' }],
  720: [{ id: 'JOB.4.15', f: P, m: '« mes cheveux se sont dressés… mes membres ont frissonné » — Éliphaz, Jb 4, 15.' }],
  734: [{ id: 'ISA.3.12', f: P, m: '« ceux qui t’appellent heureux te trompent » — Is 3, 12.' }],
  753: [{ id: 'LUK.16.10', f: P, m: '« celui qui est infidèle dans les petites choses l’est aussi dans les grandes » — Lc 16, 10.' }],
  756: [{ id: 'MAT.16.26', f: P, m: '« que sert à l’homme de gagner l’univers s’il perd son âme ? » — Mt 16, 26.' }],
  758: [{ id: '1SA.2.30', f: P, m: '« je glorifierai ceux qui me glorifient » — 1 S 2, 30.' },
        { id: 'LUK.6.26', f: P, m: '« malheur à vous lorsque les hommes vous loueront » — Lc 6, 26.' }],
  763: [{ id: 'LUK.14.11', f: D, m: '« il sera humilié, celui qui s’élève » — Lc 14, 11 (ou Mt 23, 12).' }],
  776: [{ id: 'JAS.4.6', f: D, m: '« Dieu résiste aux superbes » — Jc 4, 6 (ou 1 P 5, 5).' }],
  780: [{ psH: [18, 42], f: P, m: '« ils ont crié, nul ne les a sauvés ; ils se sont adressés au Seigneur, il ne les a pas exaucés » — Ps 18 (17), 42.' }],
  798: [{ id: 'EXO.15.1', f: P, m: '« Chantons au Seigneur… il a précipité dans la mer le cheval et son cavalier » — cantique de Moïse, Ex 15, 1.' }],
  799: [{ id: 'MAT.11.29', f: P, m: '« Apprenez de moi que je suis doux et humble de cœur » — Mt 11, 29.' }],
  803: [{ id: 'ISA.66.2', f: P, m: '« sur qui arrêterai-je mes regards, sinon sur le cœur contrit et humble ? » — Is 66, 2.' }],
  806: [{ id: 'MAT.5.5', f: P, m: '« les doux posséderont la terre » — Mt 5, 5 (ou Ps 36, 11).' }],
  808: [{ psH: [25, 9], f: P, m: '« il dirige les doux dans le jugement, il enseigne aux humbles ses voies » — Ps 25 (24), 9.' }],
  821: [{ psH: [25, 8], f: P, m: '« Le Seigneur est doux et droit » — Ps 25 (24), 8.' }],
  829: [{ id: 'MAT.19.23', f: P, m: '« les riches entrent difficilement dans le royaume des cieux » — Mt 19, 23.' }],
};

async function main() {
  // ossature + conversion hébraïque
  const canon = new Set(); const parHebreu = new Map();
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('versets_canon').select('id, livre, ch_heb, v_heb').order('id').range(from, from + 999);
    if (!data?.length) break;
    for (const r of data) { canon.add(r.id); if (r.ch_heb != null && r.v_heb != null) parHebreu.set(`${r.livre}.${r.ch_heb}.${r.v_heb}`, r.id); }
    if (data.length < 1000) break;
  }
  // segments
  const { data: segs } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE);
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));

  const liens = []; const manques = [];
  for (const [num, liste] of Object.entries(CIT)) {
    const sid = parNum.get(Number(num));
    if (!sid) { manques.push('segment #' + num + ' introuvable'); continue; }
    for (const c of liste) {
      let cible = c.id;
      if (c.psH) cible = parHebreu.get(`PSA.${c.psH[0]}.${c.psH[1]}`);
      if (!cible || !canon.has(cible)) { manques.push(`#${num} → ${c.id ?? 'PSA heb ' + c.psH} (hors ossature)`); continue; }
      liens.push({ segment_id: sid, canon_id: cible, type: 1, fiabilite: c.f, provenance: 'ia', arbitrage_requis: c.f === D, motif: c.m });
    }
  }

  console.log(`${liens.length} liens candidats · ${liens.filter((l) => l.fiabilite === P).length} probables, ${liens.filter((l) => l.fiabilite === D).length} douteux`);
  if (manques.length) console.log('MANQUES:\n  ' + manques.join('\n  '));
  if (DRY) { console.log('\n(--dry : rien écrit)'); return; }

  // dédup contre l'existant
  const ids = [...new Set(liens.map((l) => l.segment_id))];
  const deja = new Set();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 300));
    for (const l of data || []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);
  }
  const aEcrire = liens.filter((l) => !deja.has(`${l.segment_id}|${l.canon_id}|${l.type}`));
  if (aEcrire.length) { const { error } = await sb.from('liens_bibliques').insert(aEcrire); if (error) throw error; }
  console.log(`\n✓ ${aEcrire.length} écrits · ${liens.length - aEcrire.length} déjà présents`);
}
main().catch((e) => { console.error(e); process.exit(1); });
