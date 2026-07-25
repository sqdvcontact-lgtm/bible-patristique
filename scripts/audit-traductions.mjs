// AUDIT DES TRADUCTIONS — état de chaque édition en base, sur six plans.
//
// 1. Inventaire      : versets, livres, couverture de l'ossature
// 2. Alignement      : créneaux remplis, versets sans créneau, collisions
// 3. Typographie     : conformité à la charte §3 (guillemets, insécables, ordinaux…)
// 4. Océrisation     : signatures de reconnaissance fautive
// 5. Métadonnées     : complétude de `editions_sources`
// 6. Points ouverts  : points sensibles, alignements vérifiés
//
//   node scripts/audit-traductions.mjs            → rapport complet
//   node scripts/audit-traductions.mjs --bref     → seulement les totaux
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BREF = process.argv.includes('--bref');

async function pageAll(table, sel, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(table).select(sel).order('id').range(de, de + 999);
    if (filt) q = filt(q);
    const { data, error } = await q;
    if (error) throw error;
    o.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return o;
}

const titre = (s) => console.log(`\n${'═'.repeat(76)}\n  ${s}\n${'═'.repeat(76)}`);
const n = (v) => Number(v).toLocaleString('fr-FR');

// ── Contrôles typographiques, adossés à la charte ───────────────────────────
// Chacun rend le nombre d'occurrences. Le latin et le grec ne se jugent pas comme
// le français : les règles proprement françaises sont marquées `fr`.
// Le tiret cadratin N'EST PAS contrôlé : chez Crampon il porte l'incise prophétique
// (« — oracle de Yahweh, », 601 occurrences) et chez Segond la « — Pause. » des psaumes.
// Ce sont des partis pris de ces éditions, non des fautes — comme le « > » de Crampon.
// La règle du demi-cadratin vaut pour les textes que NOUS composons, pas pour les
// éditions que nous transcrivons : les corriger serait les trahir.
const CONTROLES = [
  ['encodage corrompu', /[�]|Ã[-¿]|â€/g, 'tous'],
  // Un chiffre arabe collé à une lettre — latine OU grecque. La version précédente
  // exigeait des lettres latines des deux côtés et manquait donc tout le grec (99 cas
  // vus le 25/07 contre 1 signalé). On exclut les marqueurs de verset « (n) », voulus.
  ['chiffre collé à une lettre (OCR)', /(?<![(⁽\d])\d(?=[A-Za-zÀ-ÿΑ-Ωα-ωἀ-ῼ])|(?<=[A-Za-zÀ-ÿΑ-Ωα-ωἀ-ῼ])\d(?![)\d])/gu, 'tous'],
  ['guillemets droits "', /"/g, 'fr'],
  ["apostrophe droite '", /'/g, 'fr'],
  ['insécable manquante avant ; : ! ?', /[^\s  ][;:!?»]/g, 'fr'],
  ['ordinal en chiffres', /\b\d+(?:e|è|ème|°)\b|\b[IVXLCDM]{2,}(?:e|è|ème|°)\b/g, 'fr'],
  ['espace avant virgule ou point', /\s+[,.]/g, 'fr'],
  ['espaces multiples', /\s{3,}/g, 'tous'],
];

const { data: trads } = await sb.from('traductions').select('*').order('ordre');
const { data: editions } = await sb.from('editions_sources').select('*');
const canon = await pageAll('versets_canon', 'id, livre');
const parCanon = new Map(canon.map((c) => [c.id, c.livre]));

titre('1 · INVENTAIRE');
console.log('  trad     nom                       versets    livres   créneaux    sans     texte');
console.log('                                                        remplis   créneau     vide');

const donnees = {};
for (const t of trads ?? []) {
  const V = await pageAll('versets_v2', 'canon_id, livre, texte, ordre_slot, alignement_verifie',
    (q) => q.eq('trad_id', t.trad_id));
  donnees[t.trad_id] = V;
  const avecTexte = V.filter((r) => r.texte && r.texte.trim());
  const creneaux = new Set(avecTexte.filter((r) => r.canon_id).map((r) => r.canon_id));
  const livres = new Set(V.map((r) => r.livre));
  console.log(`  ${t.trad_id}  ${String(t.nom).slice(0, 22).padEnd(24)}${n(V.length).padStart(8)}${String(livres.size).padStart(9)}` +
    `${n(creneaux.size).padStart(11)}${n(V.filter((r) => !r.canon_id).length).padStart(9)}${n(V.length - avecTexte.length).padStart(9)}`);
}
console.log(`\n  ossature : ${n(canon.length)} créneaux`);

titre('2 · ALIGNEMENT');
const remplis = new Set();
for (const t of trads ?? []) for (const r of donnees[t.trad_id]) if (r.canon_id && r.texte?.trim()) remplis.add(r.canon_id);
const orphelins = canon.filter((c) => !remplis.has(c.id));
console.log(`  créneaux que PERSONNE ne remplit : ${n(orphelins.length)}`);
if (orphelins.length && !BREF) {
  const parLivre = {};
  orphelins.forEach((c) => { parLivre[c.livre] = (parLivre[c.livre] ?? 0) + 1; });
  console.log('     ' + Object.entries(parLivre).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([l, k]) => `${l} ${k}`).join(' · '));
}
console.log('\n  couverture de l’ossature, par édition :');
for (const t of trads ?? []) {
  const c = new Set(donnees[t.trad_id].filter((r) => r.canon_id && r.texte?.trim()).map((r) => r.canon_id));
  const pct = (100 * c.size / canon.length).toFixed(1);
  const barre = '█'.repeat(Math.round(c.size / canon.length * 40)).padEnd(40, '·');
  console.log(`     ${t.trad_id}  ${barre} ${pct} %`);
}
// collisions : plusieurs versets dans un créneau SANS ordre_slot pour les départager
console.log('\n  collisions (même créneau, même ordre_slot, même édition) :');
for (const t of trads ?? []) {
  const vus = new Map();
  let col = 0;
  for (const r of donnees[t.trad_id]) {
    if (!r.canon_id) continue;
    const cle = `${r.canon_id}|${r.ordre_slot ?? 0}`;
    if (vus.has(cle)) col++; else vus.set(cle, 1);
  }
  console.log(`     ${t.trad_id} : ${col === 0 ? 'aucune' : n(col) + ' ⚠'}`);
}

titre('3 · TYPOGRAPHIE ET OCÉRISATION');
console.log('  (rapporté à 10 000 versets — les règles françaises ne valent pas pour le latin ni le grec)');
for (const t of trads ?? []) {
  const estFr = /fran/i.test(t.langue ?? '');
  const textes = donnees[t.trad_id].map((r) => r.texte ?? '').join('\n');
  const nb = donnees[t.trad_id].length || 1;
  const lignes = [];
  for (const [nom, re, portee] of CONTROLES) {
    if (portee === 'fr' && !estFr) continue;
    const c = (textes.match(re) ?? []).length;
    if (c > 0) lignes.push(`${nom} ${n(c)} (${(10000 * c / nb).toFixed(1)}‰₀)`);
  }
  console.log(`\n  ${t.trad_id} — ${t.nom}  [${t.langue}]`);
  console.log(lignes.length ? '     ' + lignes.join('\n     ') : '     rien à signaler');
}

titre('4 · MÉTADONNÉES DE L’ÉDITION');
const CHAMPS = ['titre_edition', 'traducteur', 'editeur', 'annee_edition', 'lieu_edition',
  'source_type', 'source_url', 'licence', 'graphie', 'integrite_verifiee'];
for (const t of trads ?? []) {
  const e = (editions ?? []).find((x) => x.trad_id === t.trad_id);
  if (!e) { console.log(`  ${t.trad_id} : AUCUNE fiche dans editions_sources ⚠`); continue; }
  const manquants = CHAMPS.filter((c) => e[c] === null || e[c] === '' || e[c] === undefined);
  console.log(`  ${t.trad_id}  ${String(t.nom).slice(0, 24).padEnd(26)}` +
    (manquants.length ? `${manquants.length} champ(s) vide(s) : ${manquants.join(', ')}` : 'fiche complète ✓'));
}

titre('5 · POINTS OUVERTS');
const pts = await pageAll('points_sensibles', 'statut, livre, type');
const parStatut = {};
pts.forEach((p) => { parStatut[p.statut ?? '(sans statut)'] = (parStatut[p.statut ?? '(sans statut)'] ?? 0) + 1; });
console.log('  points sensibles : ' + Object.entries(parStatut).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('\n  alignements vérifiés à la main :');
for (const t of trads ?? []) {
  const v = donnees[t.trad_id].filter((r) => r.alignement_verifie).length;
  console.log(`     ${t.trad_id} : ${n(v)} / ${n(donnees[t.trad_id].length)}`);
}
const { count: nbLiens } = await sb.from('liens_bibliques').select('*', { count: 'exact', head: true });
console.log(`\n  liens bibliques en base : ${n(nbLiens ?? 0)}`);

titre('6 · VUE DE LECTURE');
const { data: unVerset } = await sb.from('versets_lecture').select('*').limit(1);
const colonnes = Object.keys(unVerset?.[0] ?? {}).filter((k) => /^TR\d+$/.test(k));
const attendues = (trads ?? []).map((t) => t.trad_id);
const absentes = attendues.filter((c) => !colonnes.includes(c));
console.log(`  colonnes présentes : ${colonnes.join(', ')}`);
console.log(absentes.length
  ? `  ⚠ TRADUCTIONS SANS COLONNE — invisibles sur la page Bible : ${absentes.join(', ')}`
  : '  ✓ toutes les traductions ont leur colonne');
for (const c of colonnes) {
  const { count } = await sb.from('versets_lecture').select('*', { count: 'exact', head: true }).not(c, 'is', null);
  console.log(`     ${c} : ${n(count ?? 0)} créneaux servis`);
}

console.log();
process.exit(0);
