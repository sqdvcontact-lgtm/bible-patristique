// Passe sémantique MANUELLE — Didachè / « Doctrine des Apôtres » (A0012O0002, 107 seg.).
//
// Calibration (21/07) : le matcheur de citations délimitées n'a extrait que 15
// spans et n'en a apparié que 11, alors que la lecture en relève ~28 — la Didachè
// cite en rafales COURTES (« les doux auront la terre », « ne donnez pas ce qui
// est saint aux chiens ») que le filtre MIN_MOTS_QUOTE=5 écarte. Haute précision,
// faible rappel : ici la lecture prime. J'écris donc à la main.
//
// Type 1, provenance ia. Citations verbatim d'une source claire = probable ;
// paraphrase / verset discutable = douteux + arbitrage. Idempotent.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0012O0002';
const P = 'probable', D = 'douteux';

const CIT = {
  2:  [['MAT.22.37', P, '« tu aimeras Dieu… tu aimeras ton prochain comme toi-même » — double commandement, Mt 22, 37.'],
       ['MAT.22.39', P, '« tu aimeras ton prochain comme toi-même » — Mt 22, 39.'],
       ['TOB.4.15', D, '« ce que tu ne veux pas qu’il te soit fait, ne le fais pas à autrui » — règle d’or négative, Tb 4, 15.']],
  3:  [['MAT.5.44', P, '« Bénissez ceux qui vous maudissent, priez pour vos ennemis… aimez ceux qui vous haïssent » — Mt 5, 44.']],
  4:  [['1PE.2.11', P, '« Abstiens-toi des désirs charnels » — 1 P 2, 11.']],
  5:  [['MAT.5.39', P, '« présente-lui l’autre [joue]… fais-en deux… donne-lui ta tunique » — Mt 5, 39-41.']],
  6:  [['MAT.5.42', P, '« Donne à quiconque t’implore, sans rien redemander » — Mt 5, 42.']],
  7:  [['MAT.5.26', P, '« il ne sortira pas de là qu’il n’ait rendu le dernier quart d’as » — Mt 5, 26.']],
  10: [['EXO.20.13', P, '« Tu ne tueras pas, tu ne seras pas adultère… ni vol » — décalogue, Ex 20, 13-15.'],
       ['EXO.20.17', P, '« tu ne désireras pas les biens de ton prochain » — Ex 20, 17.']],
  11: [['EXO.20.16', P, '« tu ne diras pas de faux témoignage » — Ex 20, 16.']],
  22: [['MAT.5.5', P, '« les doux auront la terre en partage » — Mt 5, 5.']],
  28: [['LEV.19.15', D, '« Tu jugeras avec justice » — Lv 19, 15 (ou Dt 1, 16).']],
  30: [['SIR.4.31', P, '« Ne tiens pas les mains étendues pour recevoir et fermées pour donner » — Si 4, 31.']],
  39: [['DEU.13.1', P, '« sans rien ajouter ni rien retrancher » — Dt 13, 1 (Vg ; Dt 12, 32 héb.).']],
  48: [['MAT.28.19', P, '« baptisez au nom du Père et du Fils et du Saint-Esprit » — Mt 28, 19.']],
  50: [['MAT.28.19', P, '« au nom du Père et du Fils et du Saint-Esprit » — Mt 28, 19 (repris).']],
  52: [['MAT.6.16', D, '« Que vos jeûnes n’aient pas lieu comme ceux des hypocrites » — cf. Mt 6, 16.']],
  53: [['MAT.6.9', P, '« Notre Père qui es au ciel, que ton nom soit sanctifié… » — oraison dominicale, Mt 6, 9-13.'],
       ['MAT.6.5', P, '« Ne priez pas comme les hypocrites » — Mt 6, 5.']],
  60: [['MAT.7.6', P, '« Ne donnez pas ce qui est saint aux chiens » — Mt 7, 6.']],
  74: [['MAT.12.31', P, '« tout péché sera remis, mais ce péché-là ne le sera pas » — Mt 12, 31.']],
  85: [['MAT.10.10', P, '« [l’ouvrier] mérite sa nourriture » — Mt 10, 10.']],
  86: [['MAT.10.10', P, '« l’ouvrier [mérite] sa nourriture » — Mt 10, 10 (repris ; cf. Lc 10, 7).']],
  94: [['MAL.1.11', P, '« qu’en tout lieu on m’offre un sacrifice pur… mon nom est admirable parmi les nations » — Ml 1, 11.'],
       ['MAL.1.14', P, '« je suis un grand roi, dit le Seigneur » — Ml 1, 14.']],
  99: [['LUK.12.35', P, '« vos lampes… la ceinture de vos reins… soyez prêts » — Lc 12, 35.'],
       ['MAT.24.44', D, '« vous ignorez l’heure où notre Seigneur viendra » — cf. Mt 24, 44.']],
  103:[['MAT.24.24', D, '« des signes et des prodiges » — cf. Mt 24, 24.']],
  104:[['MAT.24.13', P, '« ceux qui auront persévéré… seront sauvés » — Mt 24, 13.']],
  106:[['ZEC.14.5', P, '« le Seigneur viendra et tous les saints avec lui » — Za 14, 5.']],
  107:[['MAT.24.30', P, '« le Seigneur venant sur les nuées du ciel » — Mt 24, 30.'],
       ['DAN.7.13', D, '« venant sur les nuées du ciel » — cf. Dn 7, 13.']],
};

async function main() {
  const { data: segs } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE);
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  const ids = segs.map((s) => s.id);
  const deja = new Set();
  const { data: ex } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids);
  for (const l of ex || []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);

  const liens = []; const vus = new Set();
  for (const [num, liste] of Object.entries(CIT)) {
    const sid = parNum.get(Number(num));
    if (!sid) { console.warn('segment introuvable #' + num); continue; }
    for (const [canon, fiab, motif] of liste) {
      const cle = `${sid}|${canon}|1`;
      if (deja.has(cle) || vus.has(cle)) continue;
      vus.add(cle);
      liens.push({ segment_id: sid, canon_id: canon, type: 1, fiabilite: fiab, provenance: 'ia', arbitrage_requis: fiab === D, motif });
    }
  }
  if (liens.length) { const { error } = await sb.from('liens_bibliques').insert(liens); if (error) throw error; }
  const sur = liens.filter((l) => l.fiabilite === P).length;
  console.log(`✓ ${liens.length} écrits : ${sur} probables, ${liens.length - sur} douteux.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
