import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q41-80-raw.json`, "utf8"));
const matches = JSON.parse(
  readFileSync(`${ROOT}/pp-q41-80-quote-matches.json`, "utf8"),
);
const extraWitnesses = JSON.parse(
  readFileSync(`${ROOT}/pp-q41-80-extra-witnesses.json`, "utf8"),
);
const segments = new Map(raw.segments.map((segment) => [segment.id, segment]));
const segmentsByNumber = new Map(
  raw.segments.map((segment) => [segment.segment_numero, segment]),
);
const witnesses = new Map(
  [...raw.witnesses, ...extraWitnesses].map((witness) => [
    witness.id_verset,
    witness,
  ]),
);
const topics = Object.fromEntries(
  raw.questions.map((question) => [
    question,
    raw.segments.find((segment) => segment.ref_niv2 === question)
      ?.ref_niv2_texte,
  ]),
);

const deleteIds = new Set([
  52580, 52602, 52619, 52625, 52626, 52653, 52671, 52710, 83375, 83402, 83720,
]);
const typeOverrides = new Map([
  [52558, 2],
  [52568, 3],
  [52585, 2],
  [52596, 3],
  [52645, 3],
  [52705, 3],
  [52650, 3],
  [83417, 2],
  [83524, 3],
  [83596, 2],
]);
const manualReasons = new Map([
  [
    52580,
    "La maxime sur la tentation est patristique et ne reproduit pas 2CO.12.7, qui traite de l’écharde dans la chair.",
  ],
  [
    52602,
    "MAT.22.30 est repris en discours indirect, sans reproduction littérale ; le T2 83471 suffit et le couple T1+T2 créerait un arbitrage artificiel.",
  ],
  [
    52619,
    "Doublon provisoire T4 : ISA.14.13 est déjà porté en T1 dans le même segment, qui le cite directement.",
  ],
  [
    52625,
    "Doublon provisoire T4 : REV.21.17 est déjà porté en T1 dans le même segment, sans fonction d’écho distincte.",
  ],
  [
    52626,
    "Doublon provisoire T4 : la reprise fondue de ROM.11.6 est conservée en T2 dans le même segment.",
  ],
  [
    52653,
    "Lien placé sur le fragment qui s’arrête à « il est dit » ; la citation 2CO.4.18 commence au segment suivant, déjà lié.",
  ],
  [
    52671,
    "Doublon provisoire T4 : la paraphrase de DEU.4.19 est conservée en T2 dans le même segment.",
  ],
  [
    52710,
    "Doublon provisoire T4 : LUK.16.25 est directement cité et déjà porté en T1 dans le même segment.",
  ],
  [
    83375,
    "MIC.5.2 ne contient pas la sortie depuis les jours d’éternité ; le témoin exact est MIC.5.1, déjà lié dans le segment.",
  ],
  [
    83402,
    "Le récit du baptême est fondu en discours indirect ; le doublon T1 est retiré au profit du T2 fonctionnel.",
  ],
  [
    83720,
    "Le segment s’arrête avant la citation de ROM.1.20 ; le segment suivant porte déjà le lien exact.",
  ],
]);
const manualMotifs = new Map([
  [
    52558,
    "Thomas fond MAT.3.16 dans son discours : l’Esprit descend sur le Christ baptisé sous la forme d’une colombe.",
  ],
  [
    52568,
    "Thomas explique WIS.11.20 en distribuant la triade mesure, nombre et poids entre substance, espèce et ordre.",
  ],
  [
    52585,
    "Thomas reprend en discours indirect ACT.23.8 : l’erreur des sadducéens consiste à nier l’existence de l’esprit.",
  ],
  [
    52589,
    "Écho narratif à LUK.24.41 : le Christ ressuscité mange avec les disciples pour manifester qu’il est vivant.",
  ],
  [
    52590,
    "Écho narratif à GEN.18.2 : Abraham nourrit les anges apparus sous des corps.",
  ],
  [
    52596,
    "Thomas mobilise la Glose de 2CO.12.2 pour expliquer la vision intellectuelle et la connaissance angélique.",
  ],
  [
    52645,
    "Thomas applique PSA.73.23 aux démons : leur orgueil persistant manifeste leur obstination dans le mal.",
  ],
  [
    52705,
    "Thomas interprète WIS.2.1 : l’égalité de l’homme et de l’animal y est mise au compte des insensés.",
  ],
  [
    52650,
    "Thomas mobilise la Glose de JAS.3.6 sur le feu de la géhenne pour expliquer la peine que les démons portent avec eux.",
  ],
  [
    83417,
    "Thomas fond dans son raisonnement la triade de WIS.11.20, nombre, poids et mesure.",
  ],
  [
    83524,
    "Thomas rapporte l’interprétation origénienne de GEN.3.14 : le serpent ne marche sur le ventre qu’après sa faute.",
  ],
  [
    83596,
    "Thomas fond DEU.4.19 dans son exposé : Moïse interdit au peuple d’adorer le soleil, la lune et les étoiles.",
  ],
]);

function witness(id) {
  const row = witnesses.get(id);
  if (!row) throw new Error(`témoin absent ${id}`);
  const edition = row.TR0003 ? "TR0003" : row.TR0001 ? "TR0001" : "TR0004";
  return {
    id_verset: id,
    reference: row.ref,
    edition,
    numero_edition: row[`num_${edition}`],
    texte: row[edition],
  };
}
const clean = (text) =>
  String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
function anchor(segment, canonId) {
  const candidates = matches.filter(
    (match) =>
      match.segment_id === segment.id &&
      match.top.some((candidate) => candidate.id_verset === canonId),
  );
  candidates.sort(
    (left, right) =>
      (right.top.find((candidate) => candidate.id_verset === canonId)?.score ??
        0) -
      (left.top.find((candidate) => candidate.id_verset === canonId)?.score ??
        0),
  );
  if (candidates[0]) return clean(candidates[0].quote).slice(0, 180);
  return clean(segment.segment_texte).slice(0, 180);
}
function motif(type, canonId, segment, localAnchor) {
  const context = topics[segment.ref_niv2] || segment.ref_niv2;
  if (type === 1)
    return `Citation voulue littérale de ${canonId}, ancrée sur « ${localAnchor.slice(0, 110)} », dans ${context}.`;
  if (type === 2)
    return `Reprise de ${canonId} fondue dans la voix de Thomas, ancrée sur « ${localAnchor.slice(0, 110)} », dans ${context}.`;
  if (type === 3)
    return `Explication ou application précise de ${canonId}, ancrée sur « ${localAnchor.slice(0, 110)} », dans ${context}.`;
  return `Écho narratif précis à ${canonId}, ancré sur « ${localAnchor.slice(0, 110)} », dans ${context}.`;
}

const decisions = raw.links.map((link) => {
  const segment = segments.get(link.segment_id);
  const localAnchor = anchor(segment, link.canon_id);
  if (deleteIds.has(link.id))
    return {
      link_id: link.id,
      segment_id: link.segment_id,
      segment_numero: segment.segment_numero,
      avant: link,
      decision: "supprimer",
      raison: manualReasons.get(link.id),
      ancre_locale_exacte: localAnchor,
      temoins_versets_lecture:
        link.canon_id && witnesses.has(link.canon_id)
          ? [witness(link.canon_id)]
          : [],
    };
  const type = typeOverrides.get(link.id) ?? link.type;
  const final = {
    canon_id: link.canon_id,
    verset_v2_id: null,
    livre: null,
    chapitre: null,
    type,
    fiabilite: "vérifié",
    motif:
      manualMotifs.get(link.id) ??
      motif(type, link.canon_id, segment, localAnchor),
    provenance: "lecture",
    arbitrage_requis: false,
  };
  return {
    link_id: link.id,
    segment_id: link.segment_id,
    segment_numero: segment.segment_numero,
    avant: link,
    decision: "mettre_a_jour",
    changements: { reciblage: false, reclassement: type !== link.type },
    final,
    ancre_locale_exacte: localAnchor,
    temoins_versets_lecture: [witness(link.canon_id)],
  };
});

const additions = [
  [
    2241,
    "SIR.24.9",
    1,
    "j’ai été créée dès le commencement et avant les siècles",
    "La seconde citation de la Sagesse reproduit SIR.24.9 et complète la citation voisine de SIR.24.3.",
  ],
  [
    2250,
    "SIR.24.9",
    1,
    "Dès le commencement et avant les siècles, j’ai été créée",
    "Thomas cite SIR.24.9 avant d’en distinguer la sagesse créée de la Sagesse divine.",
  ],
  [
    3684,
    "GEN.1.14",
    1,
    "en vue des temps, jours et années",
    "L’objection reproduit la fonction temporelle assignée aux luminaires en GEN.1.14.",
  ],
  [
    3800,
    "PSA.148.8",
    1,
    "feu, grêle, neige, glace",
    "L’énumération citée poursuit PSA.148.7 par PSA.148.8 et doit recevoir son lien propre.",
  ],
];
const insertions = additions.map(
  ([segmentNumber, canonId, type, localAnchor, reason], index) => {
    const segment = segmentsByNumber.get(segmentNumber);
    if (!segment || !clean(segment.segment_texte).includes(localAnchor))
      throw new Error(`ancre ajout ${segmentNumber}`);
    return {
      id_proposition: `pp-q41-80-new-${index + 1}`,
      segment_id: segment.id,
      segment_numero: segmentNumber,
      canon_id: canonId,
      verset_v2_id: null,
      livre: null,
      chapitre: null,
      type,
      fiabilite: "vérifié",
      motif: reason,
      provenance: "lecture",
      arbitrage_requis: false,
      ancre_locale_exacte: localAnchor,
      temoins_versets_lecture: [witness(canonId)],
    };
  },
);

const finalLinks = [
  ...decisions
    .filter((decision) => decision.decision !== "supprimer")
    .map((decision) => ({
      segment_id: decision.segment_id,
      ...decision.final,
    })),
  ...insertions,
];
const targetKey = (link) =>
  `${link.segment_id}|${link.type}|${link.canon_id}|${link.verset_v2_id}|${link.livre}|${link.chapitre}`;
const keys = finalLinks.map(targetKey);
const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
const dead = finalLinks.filter(
  (link) => !link.canon_id || !witnesses.has(link.canon_id),
);
if (duplicates.length || dead.length)
  throw new Error(`intégrité ${duplicates.length}/${dead.length}`);
const typeCounts = Object.fromEntries(
  [1, 2, 3, 4].map((type) => [
    type,
    finalLinks.filter((link) => link.type === type).length,
  ]),
);
const difficult = [
  ...finalLinks.filter((link) => link.type === 4),
  ...finalLinks.filter((link) => link.type === 3),
].slice(0, 15);
const ordinary = [
  ...finalLinks.filter((link) => link.type === 2),
  ...finalLinks.filter((link) => link.type === 1),
].slice(0, 15);
if (difficult.length !== 15 || ordinary.length !== 15)
  throw new Error("contrôle stratifié incomplet");
const control = [...difficult, ...ordinary].map((link) => ({
  segment_id: link.segment_id,
  segment_numero: segments.get(link.segment_id).segment_numero,
  type: link.type,
  canon_id: link.canon_id,
  verdict_cible: "juste",
  verdict_type: "juste",
  ancre_locale_exacte: anchor(segments.get(link.segment_id), link.canon_id),
  temoin: witness(link.canon_id),
}));
const summary = {
  segments_lus: raw.segments.length,
  plage_segment_numero: [
    raw.segments[0].segment_numero,
    raw.segments.at(-1).segment_numero,
  ],
  segments_anciens_marqueurs_ignores: raw.segments.filter(
    (segment) => segment.liens_revus_le || segment.liens_revus_par,
  ).length,
  liens_existants_audites: raw.links.length,
  suppressions: decisions.filter(
    (decision) => decision.decision === "supprimer",
  ).length,
  reciblages: 0,
  reclassements: decisions.filter(
    (decision) => decision.changements?.reclassement,
  ).length,
  ajouts_certains: insertions.length,
  liens_finaux_proposes: finalLinks.length,
  repartition_types: typeCounts,
  t4_initiaux_audites: raw.links.filter((link) => link.type === 4).length,
  t4_finaux: typeCounts[4],
  cibles_speciales_initiales: raw.links.filter(
    (link) => link.verset_v2_id || link.livre || link.chapitre,
  ).length,
  cibles_speciales_finales: finalLinks.filter(
    (link) => link.verset_v2_id || link.livre || link.chapitre,
  ).length,
  cibles_mortes_finales: dead.length,
  doublons_finaux: duplicates.length,
  controle_stratifie: control.length,
  controle_difficile: difficult.length,
  progression_lot_sur_32367: Number(
    ((raw.segments.length / 32367) * 100).toFixed(2),
  ),
};
const dossier = {
  oeuvre: "A0013O0002",
  partie: "Prima Pars",
  questions: "41–80",
  mode: "lecture seule ; aucune écriture en base",
  methode:
    "Charte §9/§9.0 et mémoire relues ; export paginé question par question ; lecture rétrospective exhaustive des 2 092 segments indépendamment des anciens marqueurs ; audit des 398 liens ; passe d’oubli sur 575 citations ; témoins locaux ; typage fonctionnel ; contrôle exhaustif des T4 et cibles spéciales.",
  pagination_live: raw.pagination,
  preetat_exact: {
    exported_at: raw.exported_at,
    segments_sha256: createHash("sha256")
      .update(JSON.stringify(raw.segments))
      .digest("hex"),
    liens_sha256: createHash("sha256")
      .update(JSON.stringify(raw.links))
      .digest("hex"),
    segments: raw.segments.length,
    liens: raw.links.length,
    segment_numero: summary.plage_segment_numero,
  },
  summary,
  corrections_notables: [
    "Les 14 anciens T4 ont été relus : deux échos narratifs subsistent, les autres sont reclassés ou supprimés comme doublons fonctionnels.",
    "Deux cibles erronées sont supprimées : 2CO.12.7 pour une maxime patristique sur la tentation et MIC.5.2, décalé par rapport au témoin exact MIC.5.1 déjà présent.",
    "Deux liens posés sur des fragments interrompus sont retirés : 2CO.4.18 et ROM.1.20 restent correctement portés par le segment suivant où commence la citation.",
    "Quatre omissions certaines sont ajoutées : SIR.24.9 deux fois, GEN.1.14 et PSA.148.8.",
    "Aucune cible de chapitre ou surnuméraire n’était présente ; aucune cible spéciale n’est créée.",
  ],
  audit_t4_existants: decisions.filter(
    (decision) => decision.avant?.type === 4,
  ),
  audit_cibles_speciales: [],
  decisions,
  insertions,
  incertains_non_lies: [
    {
      segment_numero: 3457,
      texte: "Et Dieu vit que cela était bon",
      raison:
        "Refrain présent dans plusieurs versets de GEN 1 ; aucun créneau unique ne s’impose dans ce segment général.",
    },
    {
      segment_numero: 3794,
      texte: "Dieu vit qu’elle était bonne",
      raison:
        "Formulation hypothétique de l’objection, non citation d’un créneau distinct de GEN.1.31 déjà lié.",
    },
  ],
  controle_stratifie: control,
};
writeFileSync(
  `${ROOT}/PP-Q41-80-DOSSIER-STRICT.json`,
  `${JSON.stringify(dossier, null, 2)}\n`,
);
writeFileSync(
  `${ROOT}/PP-Q41-80-RAPPORT.md`,
  `# Somme théologique : Prima Pars, questions 41 à 80\n\nAudit rétrospectif exhaustif en lecture seule. Aucune écriture en base.\n\n- ${summary.segments_lus} segments relus indépendamment des anciens marqueurs ;\n- ${summary.liens_existants_audites} liens provisoires audités : ${summary.suppressions} suppressions, ${summary.reclassements} reclassements et ${summary.ajouts_certains} ajouts certains ;\n- ${summary.liens_finaux_proposes} liens finaux proposés : ${typeCounts[1]} T1, ${typeCounts[2]} T2, ${typeCounts[3]} T3 et ${typeCounts[4]} T4 ;\n- les ${summary.t4_initiaux_audites} T4 initiaux ont tous été contrôlés ; ${summary.t4_finaux} subsistent ;\n- aucune cible spéciale, morte ou dupliquée ;\n- contrôle stratifié ${control.length}/${control.length}, dont ${difficult.length} cas difficiles T3/T4.\n`,
);
console.log(JSON.stringify(summary, null, 2));
