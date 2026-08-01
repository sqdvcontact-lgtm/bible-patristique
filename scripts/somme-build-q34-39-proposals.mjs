import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q34-39-raw.json`, 'utf8'));
const extraWitnesses = JSON.parse(readFileSync(`${ROOT}/ss-q34-39-candidate-witnesses.json`, 'utf8'));
const witnessByCanon = new Map([...raw.witnesses, ...extraWitnesses].map((w) => [w.id_verset, w]));
const segmentByNumber = new Map(raw.segments.map((s) => [s.segment_numero, s]));

const corrections = new Map([
  [54636, { action: 'corriger', canon_id: 'JHN.14.6', type: 4, motif: '« Dieu est la vérité même, selon S. Jean » renvoie à Jn 14,6 ; Jn 13,6 décrit le lavement des pieds.' }],
  [54640, { action: 'retyper', canon_id: 'MAT.12.32', type: 2, motif: 'La qualification du péché contre l’Esprit comme irrémissible reprend Mt 12,32 dans la syntaxe de Thomas ; ce n’est pas un simple écho.' }],
  [54644, { action: 'corriger', canon_id: '1JN.2.9', type: 1, motif: 'Le segment nomme explicitement la première épître de Jean ; JHN.2.9 appartient à l’Évangile et ne correspond pas.' }],
  [54645, { action: 'retyper', canon_id: 'EXO.20.12', type: 2, motif: 'Le commandement d’honorer père et mère est repris dans le raisonnement ; un commentaire distinct de type 3 est aussi proposé.' }],
  [54646, { action: 'corriger', canon_id: '1JN.3.15', type: 1, motif: 'Le segment nomme explicitement la première épître de Jean ; JHN.3.15 appartient à l’Évangile et ne correspond pas.' }],
  [54649, { action: 'retyper', canon_id: '2CO.2.7', type: 1, motif: '« Sombre dans une tristesse excessive » est une citation directe annoncée par « l’Apôtre ne veut-il pas ».' }],
  [54665, { action: 'retyper', canon_id: 'GAL.5.20', type: 1, motif: 'Les dissensions sont reprises directement dans la liste des œuvres de la chair ; Ga 5,21 porte la conséquence sur le Royaume.' }],
  [54669, { action: 'corriger', canon_id: 'MAT.12.25', type: 1, motif: '« Tout royaume divisé contre lui-même » est Mt 12,25 ; Mt 12,35 traite du bon et du mauvais trésor.' }],
  [54688, { action: 'retyper', canon_id: 'WIS.11.16', type: 2, motif: 'Le principe « puni par où il a péché » est une reprise intégrée de Sg 11,16, ensuite appliquée au schisme.' }],
  [59099, { action: 'corriger', canon_id: null, livre: 'EXO', chapitre: 20, type: 4, motif: 'Le segment évoque le Décalogue comme ensemble sans commenter un commandement précis : cible chapitre Ex 20, type 4.' }],
]);

const additions = [
  [14374, 'ROM.1.20', 3, 'Thomas explique la connaissance de Dieu par ses effets visibles, précisément à partir de Rm 1,20.'],
  [14393, '1JN.2.9', 3, 'La condition « dans les ténèbres » est interprétée comme état de péché afin d’établir la culpabilité de la haine.'],
  [14395, 'EXO.20.12', 3, 'Le commandement d’honorer les parents est expliqué dans son rapport à la perfection chrétienne.'],
  [14395, 'LUK.14.26', 3, 'Thomas explique en quel sens Lc 14,26 commande de « haïr » ses parents.'],
  [14396, 'ROM.1.30', 3, 'Thomas explique que Dieu hait la faute des médisants, non leur nature.'],
  [14426, 'SIR.21.2', 1, 'Citation directe : « Fuis le péché comme le serpent ».'],
  [14427, 'SIR.6.26', 1, 'Citation directe attestée par Sacy et la Vulgate : porter la sagesse sans acédie dans ses liens.'],
  [14428, 'PSA.106.18', 3, 'La Glose du psaume sur le dégoût de toute nourriture sert à définir l’acédie.'],
  [14432, '1CO.6.18', 3, 'Thomas explique pourquoi le précepte de fuir la fornication commande une stratégie différente de la résistance à l’acédie.'],
  [14443, '2CO.7.10', 3, 'L’acédie est explicitement identifiée à la tristesse du monde opposée à la tristesse selon Dieu.'],
  [14446, 'EXO.20.8', 3, 'Le précepte de sanctifier le sabbat est interprété moralement comme repos de l’esprit en Dieu.'],
  [14478, 'PSA.36.1', 3, 'Le psaume est expliqué comme interdiction de s’attrister de la prospérité des indignes.'],
  [14478, 'PSA.72.2', 3, 'Thomas explique le faux pas du psalmiste dans le cadre de l’indignation devant la prospérité des impies.'],
  [14478, 'PSA.72.3', 3, 'Thomas explique la jalousie du psalmiste dans le cadre de l’indignation devant la prospérité des impies.'],
  [14488, '1JN.3.14', 3, 'Le passage de la mort à la vie par l’amour des frères fonde l’opposition entre charité et envie.'],
  [14492, 'PSA.72.3', 3, 'Le verset est expliqué pour distinguer l’indignation de l’envie.'],
  [14500, 'WIS.2.24', 3, 'L’entrée de la mort par l’envie du diable explique ce que l’envie reproduit du cœur démoniaque.'],
  [14510, 'GAL.5.21', 1, 'La citation sur l’exclusion du Royaume appartient à Ga 5,21, non à Ga 5,20.'],
  [14510, 'GAL.5.20', 3, 'La présence des dissensions parmi les œuvres de la chair est interprétée comme condamnation de la discorde.'],
  [14510, 'GAL.5.21', 3, 'L’exclusion du Royaume est interprétée comme signe du caractère mortel du péché.'],
  [14515, 'ACT.23.6', 3, 'Thomas explique pourquoi Paul pouvait provoquer une dissension afin de rompre une concorde mauvaise.'],
  [14515, 'MAT.10.34', 3, 'Le glaive de Mt 10,34 est interprété comme rupture légitime d’une concorde mauvaise.'],
  [14516, 'ACT.15.39', 3, 'Le dissentiment de Paul et Barnabé est expliqué comme accidentel et non contraire à la charité.'],
  [14519, 'MAT.12.25', 3, 'Le royaume divisé est commenté comme illustration de l’affaiblissement produit par la discorde.'],
  [14527, 'PHP.1.18', 1, 'Citation directe : Paul se réjouit et se réjouira encore de l’annonce du Christ.'],
  [14528, '1SA.14.1', 1, 'Lemme biblique explicite de la Glose : « Il arriva un jour ».'],
  [14529, 'JOB.42.7', 1, 'Citation directe explicite : Dieu atteste que Job a parlé avec droiture.'],
  [14530, 'GAL.5.21', 1, 'La conséquence « n’obtiendront pas le royaume de Dieu » appartient à Ga 5,21.'],
  [14530, '2TI.2.14', 3, 'L’interdiction des disputes de mots est interprétée comme précepte dont la transgression peut être mortelle.'],
  [14530, 'GAL.5.20', 3, 'La dispute dans la liste des œuvres de la chair est interprétée comme péché.'],
  [14530, 'GAL.5.21', 3, 'L’exclusion du Royaume est interprétée comme signe de péché mortel.'],
  [14532, '2TI.2.14', 3, 'Thomas explique la clause sur la perte des auditeurs comme critère de gravité et de scandale.'],
  [14533, 'LUK.22.24', 3, 'La dispute des disciples est expliquée comme désordonnée mais sans lutte contre la vérité.'],
  [14534, 'PHP.1.17', 3, 'Thomas explique la faute de ceux qui annonçaient le Christ par esprit de dispute.'],
  [14534, 'PHP.1.18', 3, 'Thomas explique que Paul se réjouit du fruit, non de la dispute elle-même.'],
  [14536, 'JOB.13.3', 1, 'Citation directe : Job veut parler au Tout-Puissant et discuter avec Dieu.'],
  [14536, 'JOB.40.2', 3, 'La « dispute » de Job est expliquée au sens de discussion orientée vers la vérité.'],
  [14536, 'JOB.13.3', 3, 'Le désir de discuter avec Dieu est expliqué comme recherche de la vérité, non comme opposition.'],
  [14552, 'COL.2.19', 1, 'La citation commencée en Col 2,18 se poursuit en Col 2,19 : attachement à la Tête et croissance du corps.'],
  [14552, 'COL.2.18', 3, 'Thomas interprète l’orgueil charnel et la séparation d’avec la Tête dans une doctrine de l’unité ecclésiale.'],
  [14552, 'COL.2.19', 3, 'La Tête est identifiée au Christ et le corps à l’Église unie.'],
  [14557, '2KI.17.20', 4, 'Écho narratif explicite : punition des dix tribus séparées du royaume de David.'],
  [14562, 'EXO.32.27', 3, 'Thomas explique pourquoi l’idolâtrie d’Exode 32 reçut une peine humaine ordinaire.'],
  [14562, 'NUM.16.30', 3, 'Thomas explique pourquoi la rébellion de Coré reçut une peine miraculeuse.'],
  [14563, 'EZR.4.19', 3, 'La rébellion ancienne de Jérusalem est expliquée comme motif d’une peine plus sévère contre une habitude de schisme.'],
  [14563, '2KI.17.20', 4, 'Rappel explicite du même épisode : les dix tribus furent punies aussi pour idolâtrie.'],
  [14577, 'WIS.11.16', 3, 'Le principe de Sg 11,16 est appliqué aux deux peines correspondant aux deux aspects du schisme.'],
].map(([segment_numero, canon_id, type, motif]) => ({ segment_numero, canon_id, type, motif, fiabilite: 'vérifié', provenance: 'lecture', arbitrage_requis: false }));

const additionsBySegment = new Map();
for (const a of additions) {
  if (!segmentByNumber.has(a.segment_numero)) throw new Error(`Segment absent : ${a.segment_numero}`);
  if (!witnessByCanon.has(a.canon_id)) throw new Error(`Témoin absent : ${a.canon_id}`);
  const values = additionsBySegment.get(a.segment_numero) ?? [];
  values.push({ ...a, temoins: witnessByCanon.get(a.canon_id) });
  additionsBySegment.set(a.segment_numero, values);
}

const linksBySegment = new Map();
for (const link of raw.links) {
  const values = linksBySegment.get(link.segment_id) ?? [];
  const correction = corrections.get(link.id);
  const target = correction?.canon_id ?? link.canon_id;
  values.push({
    ...link,
    audit: correction ? 'à corriger' : 'juste',
    proposition: correction ? { ...correction, fiabilite: 'vérifié', provenance: 'lecture', arbitrage_requis: false } : { fiabilite: 'vérifié', provenance: 'lecture', arbitrage_requis: false },
    temoins: target ? witnessByCanon.get(target) : null,
  });
  linksBySegment.set(link.segment_id, values);
}
if (corrections.size !== [...corrections.keys()].filter((id) => raw.links.some((l) => l.id === id)).length) throw new Error('Une correction vise un lien absent.');

const segmentRows = raw.segments.map((s) => {
  const existing = linksBySegment.get(s.id) ?? [];
  const proposed = additionsBySegment.get(s.segment_numero) ?? [];
  const hasCorrection = existing.some((l) => l.audit === 'à corriger');
  return {
    id: s.id,
    segment_numero: s.segment_numero,
    question: s.ref_niv2,
    texte: s.segment_texte,
    decision: hasCorrection ? 'correction' : proposed.length ? 'ajout' : existing.length ? 'liens_existants_justes' : 'sans_lien',
    liens_existants: existing,
    liens_a_ajouter: proposed,
  };
});

const questions = raw.questions.map((question) => {
  const rows = segmentRows.filter((s) => s.question === question);
  return {
    question,
    segments_lus: rows.length,
    liens_existants: rows.flatMap((s) => s.liens_existants).length,
    liens_existants_justes: rows.flatMap((s) => s.liens_existants).filter((l) => l.audit === 'juste').length,
    liens_existants_a_corriger: rows.flatMap((s) => s.liens_existants).filter((l) => l.audit === 'à corriger').length,
    liens_a_ajouter: rows.flatMap((s) => s.liens_a_ajouter).length,
    segments_sans_lien_final: rows.filter((s) => !s.liens_existants.length && !s.liens_a_ajouter.length).length,
  };
});
const summary = {
  segments_lus: segmentRows.length,
  liens_existants: raw.links.length,
  liens_existants_justes: raw.links.length - corrections.size,
  liens_existants_a_corriger: corrections.size,
  liens_a_ajouter: additions.length,
  ajouts_par_type: Object.fromEntries([1, 2, 3, 4].map((type) => [type, additions.filter((a) => a.type === type).length])),
  segments_sans_lien_final: segmentRows.filter((s) => !s.liens_existants.length && !s.liens_a_ajouter.length).length,
  ecriture_base: false,
};

const arbitrages = [
  {
    segment_numero: 14427,
    cible: 'SIR.6.26',
    niveau: 'signalement corpus, cible proposée certaine',
    motif: 'La citation correspond à Sacy et à la Vulgate au créneau SIR.6.26, tandis que Crampon affiche la même idée en 6,25 et un autre texte en 6,26. Le lien doit viser SIR.6.26 ; l’alignement interne du Siracide mérite un contrôle distinct.',
  },
  {
    segment_numero: 14440,
    cible: 'EXO chapitre 20',
    niveau: 'arbitrage éditorial léger',
    motif: 'Le Décalogue est seulement invoqué comme ensemble. Le type 4 au chapitre est plus conforme que le type 3 actuel sans cible ; conserver type 3 resterait défendable si la politique du site assimile tout examen du Décalogue à un commentaire.',
  },
  {
    segment_numero: 14528,
    cible: '1SA.14.1',
    niveau: 'citation faible mais explicite',
    motif: 'Le lemme « Il arriva un jour » est très peu discriminant, mais le livre et le verset sont explicitement donnés et les trois témoins confirment la formule.',
  },
];

const output = {
  generated_at: new Date().toISOString(),
  oeuvre: 'A0013O0002',
  partie: 'Secunda Secundae',
  questions: ['Question 34', 'Question 35', 'Question 36', 'Question 37', 'Question 38', 'Question 39'],
  methode: 'Lecture intégrale segment par segment ; confrontation des cibles dans versets_lecture TR0001/TR0003/TR0004 ; aucune écriture en base.',
  summary,
  bilan_par_question: questions,
  arbitrages,
  segments: segmentRows,
};
writeFileSync(`${ROOT}/ss-q34-39-propositions.json`, `${JSON.stringify(output, null, 2)}\n`);

const correctionsMd = segmentRows.flatMap((s) => s.liens_existants.filter((l) => l.audit === 'à corriger').map((l) => {
  const p = l.proposition;
  const target = p.canon_id ?? `${p.livre} ${p.chapitre}`;
  return `- segment ${s.segment_numero}, lien ${l.id} : ${l.canon_id || 'sans cible'} / type ${l.type} → ${target} / type ${p.type}. ${p.motif}`;
}));
const additionsMd = additions.map((a) => `- segment ${a.segment_numero} : ${a.canon_id}, type ${a.type}. ${a.motif}`);
const report = `# Lecture biblique — Somme théologique, IIa-IIae, questions 34 à 39\n\n` +
`Date : 29 juillet 2026. Audit en lecture seule. Aucune donnée de Supabase n’a été modifiée.\n\n` +
`## Bilan\n\n` +
`- ${summary.segments_lus} segments lus intégralement, du no 14369 au no 14580 ;\n` +
`- ${summary.liens_existants} liens existants contrôlés contre Sacy (TR0001), Crampon (TR0003) et la Vulgate (TR0004) ;\n` +
`- ${summary.liens_existants_justes} liens existants justes ;\n` +
`- ${summary.liens_existants_a_corriger} liens existants à corriger ;\n` +
`- ${summary.liens_a_ajouter} liens à ajouter après lecture : ${summary.ajouts_par_type[1]} type 1, ${summary.ajouts_par_type[3]} type 3 et ${summary.ajouts_par_type[4]} type 4 ;\n` +
`- ${summary.segments_sans_lien_final} segments resteraient sans lien, ce qui est normal pour les développements purement philosophiques ou théologiques.\n\n` +
`## Bilan par question\n\n` +
questions.map((q) => `- ${q.question} : ${q.segments_lus} segments ; ${q.liens_existants_justes}/${q.liens_existants} liens existants justes ; ${q.liens_existants_a_corriger} corrections ; ${q.liens_a_ajouter} ajouts ; ${q.segments_sans_lien_final} segments sans lien.`).join('\n') +
`\n\n## Corrections certaines\n\n${correctionsMd.join('\n')}\n\n` +
`## Liens à ajouter\n\n${additionsMd.join('\n')}\n\n` +
`## Arbitrages et signaux\n\n` +
arbitrages.map((a) => `- segment ${a.segment_numero}, ${a.cible} (${a.niveau}) : ${a.motif}`).join('\n') +
`\n\n## Consigne d’application\n\n` +
`Appliquer les changements dans une transaction après sauvegarde des 58 liens et des 212 segments. Passer les liens effectivement relus à \`fiabilite = 'vérifié'\`, \`provenance = 'lecture'\`, \`arbitrage_requis = false\`, sauf décision contraire sur les trois arbitrages ci-dessus. Marquer ensuite les 212 segments avec \`liens_revus_le\` et \`liens_revus_par = 'IA-lecture'\`, puis exécuter le contrôle obligatoire par sondage et un contrôle exhaustif des dix corrections.\n`;
writeFileSync(`${ROOT}/SS-Q34-39-LECTURE-SEULE.md`, report);
console.log(JSON.stringify({ summary, questions }, null, 2));
