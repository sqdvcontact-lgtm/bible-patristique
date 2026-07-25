// Passe sémantique — Augustin, « Du Symbole aux catéchumènes » (A0010O0055, 52 segments).
//
// Ce sermon n'est PAS un commentaire suivi d'un livre : il tisse des citations
// scripturaires dans l'exposé du Credo. Ni lemme de tête (pas de guillemets en
// ouverture de segment), ni séquence à aligner. La seule méthode qui convienne
// est la lecture (charte §25, passe sémantique) : j'ai relu les 52 segments et
// relevé chaque citation explicite (entre guillemets « … »), en la rattachant à
// sa référence canonique.
//
// Toutes sont de type 1 (citation). Provenance ia. Les citations verbatim d'une
// source non ambiguë sont « probable » ; les paraphrases ou allusions dont le
// verset exact reste discutable (numérotation des psaumes en particulier) sont
// « douteux » + arbitrage_requis.
//
// Idempotent : dédoublonne contre l'existant sur (segment_id, canon_id, type).

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const OEUVRE = 'A0010O0055';

// segment_numero → liste de citations relevées à la lecture.
// [ canon_id, fiabilite, motif ]
const P = 'probable';
const D = 'douteux';
const CITATIONS = {
  3:  [['2TI.2.13', P, '« il ne peut se renier lui-même » — 2 Tm 2, 13, cité mot pour mot.']],
  4:  [['COL.1.16', P, '« les trônes, les dominations, les principautés, les puissances » — énumération de Col 1, 16.']],
  5:  [['GEN.1.26', P, '« créée à son image et à sa ressemblance » — Gn 1, 26.']],
  10: [['MAT.6.24', P, '« Personne ne peut servir deux maîtres » — Mt 6, 24.']],
  11: [['ACT.4.32', P, '« n’avait qu’un cœur et qu’une âme » — Ac 4, 32.']],
  14: [['JHN.5.19', P, '« Tout ce que fait le Père, le Fils le fait également » — Jn 5, 19.']],
  15: [['JHN.5.19', P, '« Tout ce que fait le Père, le Fils le fait également » — Jn 5, 19 (repris).'],
       ['JHN.16.15', P, '« Tout ce qui est à mon Père est à moi » — Jn 16, 15.']],
  19: [['PSA.115.12', D, '« Que rendrai-je au Seigneur pour toutes les grâces… » — Ps 115, 12 (num. Vulgate, à vérifier).']],
  24: [['ISA.53.8', P, '« Qui racontera sa génération ? » — Is 53, 8.']],
  27: [['ROM.6.9', P, '« il ne meurt plus, la mort n’exercera plus sur lui son empire » — Rm 6, 9.']],
  28: [['JAS.5.11', P, '« Vous avez appris quelle a été la patience de Job… » — Jc 5, 11.']],
  29: [['JOB.1.8', P, '« Avez-vous remarqué mon serviteur Job ?… » — Jb 1, 8.']],
  31: [['JOB.1.21', P, '« Le Seigneur m’a donné, le Seigneur m’a ôté… que son nom soit béni » — Jb 1, 21.']],
  32: [['JOB.2.9', P, '« Lancez quelque parole contre le Seigneur, et mourez » — Jb 2, 9 (femme de Job).']],
  33: [['JOB.1.21', P, '« Le Seigneur m’a donné, le Seigneur m’a ôté… » — Jb 1, 21 (repris).'],
       ['PSA.74.8', D, '« il humilie celui-ci et exalte celui-là » — Ps 74, 8 (num. Vulgate, à vérifier).']],
  34: [['JOB.1.21', P, '« Le Seigneur me l’a donné, le Seigneur me l’a ôté… » — Jb 1, 21 (repris).']],
  35: [['JOB.2.10', P, '« Puisque nous recevons tous les biens de la main de Dieu, pourquoi ne supporterions-nous pas les maux ? » — Jb 2, 10.']],
  36: [['JAS.5.11', P, '« Vous avez appris la patience de Job, et vous avez vu la fin du Seigneur » — Jc 5, 11 (repris).']],
  37: [['MAT.27.46', P, '« Dieu, mon Dieu, pourquoi m’avez-vous abandonné ? » — parole du Christ en croix, Mt 27, 46.'],
       ['ROM.6.9', P, '« Jésus-Christ ressuscitant d’entre les morts ne meurt plus » — Rm 6, 9.']],
  40: [['MAT.25.34', P, '« Venez, bénis de mon Père, possédez le royaume… » — Mt 25, 34.'],
       ['MAT.25.41', P, '« Allez au feu éternel, qui a été préparé pour le démon et ses anges » — Mt 25, 41.']],
  43: [['ACT.7.48', P, '« le Très-Haut n’habite point dans les temples faits de mains d’hommes » — Ac 7, 48 (parole d’Étienne).']],
  46: [['MAT.16.18', P, '« Les portes de l’enfer ne prévaudront point contre elle » — Mt 16, 18.']],
  48: [['MAT.6.12', P, '« Pardonnez-nous nos offenses, comme nous pardonnons à ceux qui nous ont offensés » — Mt 6, 12.']],
  50: [['MAT.6.9', D, '« Notre Père ? » — renvoi à l’oraison dominicale, Mt 6, 9 (allusion brève).']],
};

async function main() {
  // seg_num → segment_id
  const { data: segs, error } = await sb
    .from('segments').select('id,segment_numero').eq('id_oeuvre', OEUVRE);
  if (error) throw error;
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));

  // liens déjà posés sur ces segments
  const ids = segs.map((s) => s.id);
  const deja = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from('liens_bibliques')
      .select('segment_id,canon_id,type').in('segment_id', ids.slice(i, i + 200));
    for (const l of data || []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);
  }

  const aEcrire = [];
  const vus = new Set();
  for (const [num, liste] of Object.entries(CITATIONS)) {
    const sid = parNum.get(Number(num));
    if (!sid) { console.warn('segment introuvable #' + num); continue; }
    for (const [canon, fiab, motif] of liste) {
      const cle = `${sid}|${canon}|1`;
      if (deja.has(cle) || vus.has(cle)) continue;
      vus.add(cle);
      aEcrire.push({
        segment_id: sid, canon_id: canon, type: 1,
        fiabilite: fiab, motif, provenance: 'ia',
        arbitrage_requis: fiab === D,
      });
    }
  }

  console.log(`À écrire : ${aEcrire.length} liens (déjà présents ignorés).`);
  if (aEcrire.length) {
    const { error: e2 } = await sb.from('liens_bibliques').insert(aEcrire);
    if (e2) throw e2;
  }
  const sur = aEcrire.filter((l) => l.fiabilite === P).length;
  console.log(`Écrits : ${sur} probables, ${aEcrire.length - sur} douteux (arbitrage).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
