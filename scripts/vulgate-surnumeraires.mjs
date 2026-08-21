// PLACEMENT DES SURNUMÉRAIRES — à l'emplacement que la Vulgate a choisi.
//
// Un verset latin sans créneau propre n'est pas égaré : la Vulgate l'a mis à un
// endroit précis, entre deux versets qui, eux, ont leur créneau. On le rattache
// donc au créneau du verset qui le PRÉCÈDE dans le chapitre, et `ordre_slot` le
// range derrière lui. Rien n'est déplacé, rien n'est inventé : la position
// latine est conservée telle quelle, et reste lisible.
//   node scripts/vulgate-surnumeraires.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const finals = JSON.parse(readFileSync('scripts/_vulgate_final.json','utf8'));
const trouves = JSON.parse(readFileSync('scripts/_vulgate_trouves.json','utf8'));
const surnum = JSON.parse(readFileSync('scripts/_vulgate_surnumeraires.json','utf8'));

// carte (livre|ch|v) → canon_id, pour tout ce qui est déjà placé
const place = new Map();
for (const f of [...finals, ...trouves]) place.set(`${f.livre}|${f.ch}|${f.v}`, f.canon_id);

const resultat = [...finals.map(f=>({...f, ordre_slot:1})), ...trouves.map(f=>({...f, ordre_slot:1}))];
const orphelinsVrais = [];
let rattaches = 0;

// pour chaque surnuméraire, remonter au verset précédent qui a un créneau
const parCh = new Map();
for (const s of surnum) { const k=`${s.livre}|${s.ch}`; let a=parCh.get(k); if(!a)parCh.set(k,a=[]); a.push(s); }
for (const [k, liste] of parCh) {
  const [livre, ch] = k.split('|');
  liste.sort((a,b)=>a.v-b.v);
  for (const s of liste) {
    let ancre = null;
    for (let v = s.v - 1; v >= 1 && !ancre; v--) ancre = place.get(`${livre}|${ch}|${v}`) || null;
    if (!ancre) {                      // aucun précédent : prendre le suivant
      for (let v = s.v + 1; v <= s.v + 40 && !ancre; v++) ancre = place.get(`${livre}|${ch}|${v}`) || null;
    }
    if (!ancre) { orphelinsVrais.push(s); continue; }
    resultat.push({ ...s, canon_id: ancre, surnumeraire: true });
    rattaches++;
  }
}
// numéroter ordre_slot à l'intérieur de chaque créneau, dans l'ordre vulgate
const parCanon = new Map();
for (const r of resultat) { let a=parCanon.get(r.canon_id); if(!a)parCanon.set(r.canon_id,a=[]); a.push(r); }
for (const [, a] of parCanon) {
  a.sort((x,y)=> (x.ch-y.ch) || (x.v-y.v));
  a.forEach((r,i)=>{ r.ordre_slot = i+1; });
}
const avecSurnum = [...parCanon.values()].filter(a=>a.length>1).length;
console.log(`versets au total          : ${resultat.length}`);
console.log(`  · rattachés en surnuméraire : ${rattaches}`);
console.log(`  · créneaux portant plusieurs versets : ${avecSurnum}`);
console.log(`sans aucun point d’ancrage : ${orphelinsVrais.length}`);
if (orphelinsVrais.length) console.log('  ' + orphelinsVrais.slice(0,10).map(o=>`${o.livre} ${o.ch},${o.v}`).join(' · '));
writeFileSync('scripts/_vulgate_a_importer.json', JSON.stringify(resultat),'utf8');
console.log('\n→ scripts/_vulgate_a_importer.json');
process.exit(0);
