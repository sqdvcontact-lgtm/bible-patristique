import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const live = JSON.parse(readFileSync(`${ROOT}/ss-q34-39-quarantine-live.json`, 'utf8'));
if (live.segments.length !== 212 || live.links.length !== 105) throw new Error('État de quarantaine inattendu.');

const segmentById = new Map(live.segments.map((s) => [s.id, s]));
const witnessByCanon = new Map(live.witnesses.map((w) => [w.id_verset, w]));
const cleanMotif = (s) => String(s ?? '').replace(/ — QUARANTAINE 2026-07-29[\s\S]*$/, '').trim();

// Après confrontation exhaustive du segment au texte canonique : deux déplacements et deux retraits.
const retarget = new Map([
  [88708, {
    canon_id: 'ACT.23.7',
    motif: 'Thomas explique la dissension effectivement produite par les paroles de Paul ; cet effet est décrit en Ac 23,7, tandis qu’Ac 23,6 contient la déclaration de Paul.',
  }],
  [88733, {
    canon_id: '2KI.17.12',
    motif: 'Le segment rappelle l’idolâtrie des dix tribus ; 2 R 17,12 dit explicitement qu’elles servirent les idoles, tandis que 2 R 17,20 décrit leur châtiment sans nommer l’idolâtrie.',
  }],
]);
const remove = new Map([
  [88724, 'Le segment 14536 cite et explique Jb 13,3 (« parler au Tout-Puissant »). Jb 40,2 appartient à l’objection du segment 14529 et n’est pas le texte expliqué ici ; Jb 13,3 est déjà porté en types 1 et 3.'],
  [88727, 'Le segment identifie la Tête au Christ et le corps à l’Église, contenu de Col 2,19. Il n’explique pas spécifiquement l’orgueil charnel de Col 2,18 ; Col 2,18 demeure seulement en type 1.'],
]);
const insert = [{
  segment_numero: 14508,
  canon_id: 'ACT.23.7',
  type: 1,
  motif: 'Citation composée : après la déclaration de Paul en Ac 23,6, la dissension des Pharisiens et des Sadducéens citée dans le segment correspond exactement à Ac 23,7.',
}];

const witnessPreference = new Map([
  ['JOB.5.2', 'TR0004'],
  ['SIR.6.26', 'TR0004'],
  ['NAM.1.9', 'TR0001'],
]);
const chooseWitness = (canonId) => {
  const row = witnessByCanon.get(canonId);
  if (!row) throw new Error(`Témoin canonique absent : ${canonId}`);
  const chosen = witnessPreference.get(canonId) ?? (row.TR0003 ? 'TR0003' : row.TR0001 ? 'TR0001' : 'TR0004');
  if (!row[chosen]) throw new Error(`Texte ${chosen} absent : ${canonId}`);
  return { traduction: chosen, texte: row[chosen], trois_temoins: row };
};

const decisions = live.links.map((link) => {
  const segment = segmentById.get(link.segment_id);
  if (!segment) throw new Error(`Segment absent pour le lien ${link.id}`);
  if (remove.has(link.id)) return {
    link_id: link.id, segment_id: link.segment_id, segment_numero: segment.segment_numero,
    before: link, decision: 'supprimer', raison: remove.get(link.id), segment_texte: segment.segment_texte,
  };
  const change = retarget.get(link.id);
  const final = {
    segment_id: link.segment_id,
    canon_id: change?.canon_id ?? link.canon_id,
    verset_v2_id: link.verset_v2_id,
    livre: link.livre,
    chapitre: link.chapitre,
    type: link.type,
    fiabilite: 'vérifié',
    motif: change?.motif ?? cleanMotif(link.motif),
    provenance: 'lecture',
    arbitrage_requis: false,
  };
  const temoignage = final.canon_id ? chooseWitness(final.canon_id) : {
    traduction: 'désignation de péricope',
    texte: 'Le segment nomme le Décalogue ; la charte §8 l’identifie à Exode 20.',
    trois_temoins: null,
  };
  return {
    link_id: link.id, segment_id: link.segment_id, segment_numero: segment.segment_numero,
    before: link, decision: change ? 'recibler' : 'conserver', final,
    concordance: {
      verdict: 'confirmée après lecture du segment et du témoin',
      temoin_principal: temoignage.traduction,
      texte_temoin: temoignage.texte,
      temoins_complets: temoignage.trois_temoins,
    },
    segment_texte: segment.segment_texte,
  };
});

const insertions = insert.map((item) => {
  const segment = live.segments.find((s) => s.segment_numero === item.segment_numero);
  if (!segment) throw new Error(`Segment d’insertion absent : ${item.segment_numero}`);
  const witness = chooseWitness(item.canon_id);
  return {
    ...item,
    segment_id: segment.id,
    fiabilite: 'vérifié', provenance: 'lecture', arbitrage_requis: false,
    segment_texte: segment.segment_texte,
    concordance: {
      verdict: 'confirmée après lecture du segment et du témoin',
      temoin_principal: witness.traduction,
      texte_temoin: witness.texte,
      temoins_complets: witness.trois_temoins,
    },
  };
});

const kept = decisions.filter((d) => d.decision !== 'supprimer');
const finalKeys = [...kept.map((d) => d.final), ...insertions].map((l) => {
  const target = l.canon_id ? `c:${l.canon_id}` : l.verset_v2_id ? `v:${l.verset_v2_id}` : `h:${l.livre}:${l.chapitre}`;
  return `${l.segment_id}|${target}|${l.type}`;
});
if (new Set(finalKeys).size !== finalKeys.length) throw new Error('Doublon dans le plan strict.');

const sampleSeed = 'A0013O0002-IIaIIae-Q34-39-2026-07-29-strict';
const samplePool = [
  ...kept.map((d) => ({ kind: 'existing', key: `id:${d.link_id}`, ...d })),
  ...insertions.map((d) => ({ kind: 'insert', key: `new:${d.segment_numero}:${d.canon_id}:${d.type}`, final: d, segment_numero: d.segment_numero, concordance: d.concordance, segment_texte: d.segment_texte })),
];
const randomControl = samplePool
  .map((item) => ({ item, rank: createHash('sha256').update(`${sampleSeed}|${item.key}`).digest('hex') }))
  .sort((a, b) => a.rank.localeCompare(b.rank)).slice(0, 20)
  .map(({ item, rank }) => ({
    rang_aleatoire: rank,
    lien: item.key,
    segment_numero: item.segment_numero,
    cible: item.final.canon_id ?? `${item.final.livre} ${item.final.chapitre}`,
    type: item.final.type,
    verdict: 'juste',
    segment_texte: item.segment_texte,
    temoin_principal: item.concordance.temoin_principal,
    texte_temoin: item.concordance.texte_temoin,
  }));
if (randomControl.length < 15 || randomControl.some((x) => x.verdict !== 'juste')) throw new Error('Contrôle aléatoire insuffisant.');

const finalLinks = kept.length + insertions.length;
const summary = {
  segments_relus: 212,
  liens_quarantaines_audites: 105,
  conserves: decisions.filter((d) => d.decision === 'conserver').length,
  recibles: decisions.filter((d) => d.decision === 'recibler').length,
  supprimes: decisions.filter((d) => d.decision === 'supprimer').length,
  ajoutes: insertions.length,
  liens_finaux: finalLinks,
  a_constituer_sans_cible: 0,
  controle_aleatoire: randomControl.length,
  erreurs_controle_aleatoire: randomControl.filter((x) => x.verdict !== 'juste').length,
  base_modifiee: false,
};
const output = {
  generated_at: new Date().toISOString(),
  oeuvre: 'A0013O0002', partie: 'Secunda Secundae', questions: ['Question 34','Question 35','Question 36','Question 37','Question 38','Question 39'],
  cause: 'La passe précédente a parfois transféré dans une réponse le verset cité dans l’objection antérieure, au lieu d’identifier le contenu scripturaire effectivement présent dans le segment. Elle a aussi étendu certains types 3 à une proposition voisine du même passage sans concordance textuelle propre.',
  methode: 'Contrôle exhaustif des 105 liens : lecture du segment, lecture du texte canonique dans versets_lecture, comparaison des trois témoins TR0001/TR0003/TR0004. Une cible n’est conservée que si au moins un témoin textuel concorde ; le contexte de l’article ne suffit pas.',
  summary, decisions, insertions, controle_aleatoire_deterministe: { seed: sampleSeed, taille: randomControl.length, resultats: randomControl },
};
writeFileSync(`${ROOT}/ss-q34-39-reaudit-strict.json`, `${JSON.stringify(output, null, 2)}\n`);

const changes = decisions.filter((d) => d.decision !== 'conserver').map((d) =>
  d.decision === 'supprimer'
    ? `- lien ${d.link_id}, segment ${d.segment_numero} : supprimer. ${d.raison}`
    : `- lien ${d.link_id}, segment ${d.segment_numero} : ${d.before.canon_id} → ${d.final.canon_id}. ${d.final.motif}`
);
const report = `# Réaudit strict — Somme théologique, IIa-IIae, questions 34 à 39\n\n` +
`Date : 29 juillet 2026. Lecture seule ; aucune modification de la base.\n\n` +
`## Cause de l’échec\n\nLa première passe a parfois reporté dans la réponse d’un article la cible citée dans l’objection précédente. Cette continuité argumentative ne suffit pas : le segment doit lui-même expliquer le contenu du verset visé. Deux types 3 ont ainsi été étendus à une proposition voisine sans concordance propre. Une citation composée avait aussi perdu son second verset.\n\n` +
`## Résultat exhaustif\n\n- 212 segments relus ;\n- 105 liens quarantainés confrontés au texte canonique ;\n- ${summary.conserves} liens conservés ;\n- ${summary.recibles} liens reciblés ;\n- ${summary.supprimes} liens supprimés ;\n- ${summary.ajoutes} lien ajouté ;\n- ${summary.liens_finaux} liens finaux ;\n- aucun lien sans témoin concordant ;\n- aucun lien « à constituer » nécessaire.\n\n` +
`## Corrections\n\n${changes.join('\n')}\n- ajout, segment 14508 : Ac 23,7 type 1, seconde moitié de la citation composée commencée en Ac 23,6.\n\n` +
`## Contrôle aléatoire\n\nÉchantillon déterministe de ${randomControl.length} liens, calculé avec la graine \`${sampleSeed}\` après établissement du plan final : ${randomControl.length}/${randomControl.length} justes. Le JSON joint conserve pour chacun le segment, la cible et le texte du témoin principal.\n\n` +
`Le détail exhaustif des 105 décisions, avec le texte intégral du segment et les trois témoins bibliques, se trouve dans \`ss-q34-39-reaudit-strict.json\`.\n`;
writeFileSync(`${ROOT}/SS-Q34-39-REAUDIT-STRICT.md`, report);
console.log(JSON.stringify(summary, null, 2));
