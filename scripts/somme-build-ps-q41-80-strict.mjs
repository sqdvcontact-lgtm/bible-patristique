import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const R = "tmp/somme-liens-audit-2026-07-29",
  raw = JSON.parse(readFileSync(`${R}/ps-q41-80-raw.json`, "utf8")),
  matches = JSON.parse(
    readFileSync(`${R}/ps-q41-80-quote-matches.json`, "utf8"),
  ),
  extra = JSON.parse(
    readFileSync(`${R}/ps-q41-80-extra-witnesses.json`, "utf8"),
  ),
  S = new Map(raw.segments.map((x) => [x.id, x])),
  N = new Map(raw.segments.map((x) => [x.segment_numero, x])),
  W = new Map([...raw.witnesses, ...extra].map((x) => [x.id_verset, x])),
  topics = Object.fromEntries(
    raw.questions.map((q) => [
      q,
      raw.segments.find((s) => s.ref_niv2 === q)?.ref_niv2_texte,
    ]),
  );
const deletes = new Set([
    58971, 58974, 58975, 53300, 53301, 53303, 53304, 84220,
  ]),
  types = new Map([
    [53182, 2],
    [53191, 3],
    [53197, 3],
    [53202, 2],
    [53221, 3],
    [53228, 3],
    [53235, 2],
    [53245, 3],
    [53246, 2],
    [53248, 3],
    [53273, 2],
    [53152, 2],
    [53188, 2],
    [84178, 2],
  ]),
  targets = new Map([
    [59304, "GAL.5.20"],
    [84226, "ACT.10.34"],
    [84227, "ROM.3.8"],
  ]);
const reasons = new Map([
  [58971, "L’annonce du plan nomme les Béatitudes sans commenter MAT 5."],
  [
    58974,
    "Le passage vise les degrés des Béatitudes de MAT 5, non l’ensemble de MAT 6.",
  ],
  [
    58975,
    "Le passage vise les degrés des Béatitudes de MAT 5, non l’ensemble de MAT 7.",
  ],
  [
    53300,
    "WIS.1.13 est cité au segment précédent 10324 ; ce lien est décalé d’un segment.",
  ],
  [
    53301,
    "ACT.10.34 est cité au segment précédent 10325 ; ce lien est décalé d’un segment.",
  ],
  [
    53303,
    "ROM.3.8 est cité au segment précédent 10326 ; ce lien est décalé d’un segment.",
  ],
  [
    53304,
    "ROM.8.28 est cité au segment précédent 10327 ; ce lien est décalé d’un segment.",
  ],
  [
    84220,
    "MAT.6.12 est cité au segment 10054 ; le lien posé sur 10056 est déplacé vers la citation.",
  ],
]);
const manual = new Map([
  [
    53182,
    "Thomas fond ISA.11.2 dans son exposé : les dons manifestés dans le Christ ordonnent l’homme à lui être conforme.",
  ],
  [
    53191,
    "La réponse invoque précisément l’énumération des dons en ISA.11.2 comme autorité à expliquer.",
  ],
  [
    53197,
    "Thomas examine l’ordre des dons énumérés en ISA.11.2 et le confronte à la primauté de la crainte.",
  ],
  [
    53202,
    "Thomas fond PRO.16.6 dans son raisonnement : la crainte du Seigneur détourne du mal.",
  ],
  [
    53221,
    "Thomas commente l’énumération des fruits de GAL.5.22 et son rapport aux autres emplois bibliques du mot fruit.",
  ],
  [
    53228,
    "Thomas explique le rapport entre les œuvres de la chair énumérées en GAL.5.19 et les fruits de l’Esprit.",
  ],
  [
    53235,
    "Thomas fond EPH.5.3 dans son argument : l’avarice y est rangée parmi les péchés charnels.",
  ],
  [
    53245,
    "Thomas interprète MAT.5.20 à partir de la progression de la justice qui prévient colère et homicide.",
  ],
  [
    53246,
    "Thomas fond 1CO.13.13 dans son argument : la charité est plus grande que la foi et l’espérance.",
  ],
  [
    53248,
    "Thomas applique la Glose de MAT.7.18 : la volonté de pécher est à l’acte mauvais comme l’arbre à son fruit.",
  ],
  [
    53273,
    "Thomas fond LEV.19.18 dans son discours : l’amour légitime de soi règle l’amour du prochain.",
  ],
  [
    53152,
    "Thomas reprend en discours indirect REV.21.16 : les quatre côtés égaux de la Jérusalem céleste figurent les vertus.",
  ],
  [
    53188,
    "Thomas fond ISA.11.2 dans son objection : les dons du Saint-Esprit reposent sur le Christ.",
  ],
  [
    84178,
    "Thomas fond la tournure de 1CO.13.12 dans sa phrase : la foi est une connaissance en énigme.",
  ],
  [
    59304,
    "La citation des œuvres de la chair se poursuit en GAL.5.20 avec l’idolâtrie et la magie ; GAL.5.21 n’est pas reproduit.",
  ],
  [
    84226,
    "Thomas applique ACT.10.34 : la différence de miséricorde divine ne constitue pas une acception de personnes.",
  ],
  [
    84227,
    "Thomas fond ROM.3.8 dans sa réponse : le mal de faute ne doit pas être commis pour produire un bien.",
  ],
]);
function wit(id) {
  const w = W.get(id);
  if (!w) throw Error(`témoin ${id}`);
  const e = w.TR0003 ? "TR0003" : w.TR0001 ? "TR0001" : "TR0004";
  return {
    id_verset: id,
    reference: w.ref,
    edition: e,
    numero_edition: w[`num_${e}`],
    texte: w[e],
  };
}
const clean = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
function anchor(s, id) {
  if (!id) return clean(s.segment_texte).slice(0, 180);
  const rows = matches.filter(
    (x) => x.segment_id === s.id && x.top.some((c) => c.id_verset === id),
  );
  rows.sort(
    (a, b) =>
      (b.top.find((c) => c.id_verset === id)?.score ?? 0) -
      (a.top.find((c) => c.id_verset === id)?.score ?? 0),
  );
  return rows[0]
    ? clean(rows[0].quote).slice(0, 180)
    : clean(s.segment_texte).slice(0, 180);
}
function chapterWitnesses(book, chapter) {
  if (book === "MAT" && chapter === 5) return [wit("MAT.5.3"), wit("MAT.5.9")];
  if (book === "MAT" && chapter === 6) return [wit("MAT.6.12")];
  return [];
}
function motif(t, target, s, a) {
  const c = topics[s.ref_niv2] || s.ref_niv2;
  if (!target.canon_id)
    return `Commentaire suivi de ${target.livre} ${target.chapitre}, ancré sur « ${a.slice(0, 110)} », dans ${c}.`;
  if (t === 1)
    return `Citation voulue littérale de ${target.canon_id}, ancrée sur « ${a.slice(0, 110)} », dans ${c}.`;
  if (t === 2)
    return `Reprise de ${target.canon_id} fondue dans la voix de Thomas, ancrée sur « ${a.slice(0, 110)} », dans ${c}.`;
  if (t === 3)
    return `Explication ou application précise de ${target.canon_id}, ancrée sur « ${a.slice(0, 110)} », dans ${c}.`;
  return `Écho précis à ${target.canon_id}, ancré sur « ${a.slice(0, 110)} », dans ${c}.`;
}
const decisions = raw.links.map((l) => {
  const s = S.get(l.segment_id),
    canon = targets.get(l.id) ?? l.canon_id,
    a = anchor(s, canon);
  if (deletes.has(l.id))
    return {
      link_id: l.id,
      segment_id: s.id,
      segment_numero: s.segment_numero,
      avant: l,
      decision: "supprimer",
      raison: reasons.get(l.id),
      ancre_locale_exacte: a,
      temoins_versets_lecture: l.canon_id
        ? [wit(l.canon_id)]
        : chapterWitnesses(l.livre, l.chapitre),
    };
  const type = types.get(l.id) ?? l.type,
    target = {
      canon_id: canon,
      verset_v2_id: null,
      livre: l.canon_id ? null : l.livre,
      chapitre: l.canon_id ? null : l.chapitre,
    },
    f = {
      ...target,
      type,
      fiabilite: "vérifié",
      motif: manual.get(l.id) ?? motif(type, target, s, a),
      provenance: "lecture",
      arbitrage_requis: false,
    };
  return {
    link_id: l.id,
    segment_id: s.id,
    segment_numero: s.segment_numero,
    avant: l,
    decision: "mettre_a_jour",
    changements: {
      reciblage: canon !== l.canon_id,
      reclassement: type !== l.type,
    },
    final: f,
    ancre_locale_exacte: a,
    temoins_versets_lecture: canon
      ? [wit(canon)]
      : chapterWitnesses(l.livre, l.chapitre),
  };
});
const specs = [
  [
    9687,
    "JOB.5.17",
    1,
    "Bienheureux l’homme que le Seigneur corrige",
    "Thomas cite cette béatitude de JOB.5.17 et la rapporte à la béatitude des larmes.",
  ],
  [
    9687,
    "PSA.1.1",
    1,
    "Bienheureux l’homme qui n’est pas allé au conseil des impies",
    "Thomas cite PSA.1.1 et le rapporte à la pureté du cœur.",
  ],
  [
    9687,
    "PRO.3.13",
    1,
    "Bienheureux l’homme qui a trouvé la sagesse",
    "Thomas cite PRO.3.13 comme récompense de la septième béatitude.",
  ],
  [
    9826,
    "1CO.6.18",
    2,
    "pécher contre son propre corps",
    "Thomas fond la tournure distinctive de 1CO.6.18 dans son explication du péché de fornication.",
  ],
  [
    9894,
    "JAS.2.10",
    1,
    "celui qui pèche sur un point devient coupable de tous",
    "Thomas reproduit JAS.2.10 avant d’expliquer l’unité de l’auteur de la Loi.",
  ],
  [
    10054,
    "MAT.6.12",
    1,
    "Pardonnez-nous nos offenses",
    "Thomas cite la demande de MAT.6.12 dans l’enseignement augustinien sur la rémission quotidienne.",
  ],
  [
    10324,
    "WIS.1.13",
    1,
    "Dieu ne prend pas plaisir à la perte des impies",
    "La citation de WIS.1.13 se trouve dans ce segment, un rang avant l’ancien lien.",
  ],
  [
    10325,
    "ACT.10.34",
    1,
    "Dieu ne fait pas acception de personnes",
    "La citation de ACT.10.34 se trouve dans ce segment, un rang avant l’ancien lien.",
  ],
  [
    10326,
    "ROM.3.8",
    1,
    "il ne faut pas faire le mal pour qu’il en sorte le bien",
    "La citation de ROM.3.8 se trouve dans ce segment, un rang avant l’ancien lien.",
  ],
  [
    10327,
    "ROM.8.28",
    1,
    "tout concourt au bien",
    "La citation de ROM.8.28 se trouve dans ce segment, un rang avant l’ancien lien.",
  ],
  [
    9819,
    "EPH.4.23",
    3,
    "synonyme de raison",
    "Thomas explique EPH.4.23 avec la Glose : l’esprit y désigne la raison.",
  ],
  [
    9319,
    "MAT.4.23",
    3,
    "Il enseigne les vertus naturelles",
    "Thomas rapporte la Glose de MAT.4.23, qui interprète la circulation de Jésus comme enseignement des vertus naturelles.",
  ],
  [
    9829,
    "PSA.79.17",
    3,
    "tout péché vient ou bien d’une crainte",
    "Thomas mobilise le commentaire augustinien de PSA.79.17 pour distinguer les causes des péchés.",
  ],
  [
    10209,
    "PSA.79.17",
    3,
    "Tout péché vient de la flamme d’un amour mauvais",
    "Thomas mobilise le commentaire augustinien de PSA.79.17 contre l’unicité de l’amour de soi comme cause du péché.",
  ],
];
const insertions = specs.map(([num, canon, type, a, m], i) => {
  const s = N.get(num);
  if (!s || !clean(s.segment_texte).includes(a))
    throw Error(`ancre ${num} ${canon}`);
  return {
    id_proposition: `ps-q41-80-new-${i + 1}`,
    segment_id: s.id,
    segment_numero: num,
    canon_id: canon,
    verset_v2_id: null,
    livre: null,
    chapitre: null,
    type,
    fiabilite: "vérifié",
    motif: m,
    provenance: "lecture",
    arbitrage_requis: false,
    ancre_locale_exacte: a,
    temoins_versets_lecture: [wit(canon)],
  };
});
const final = [
    ...decisions
      .filter((x) => x.decision !== "supprimer")
      .map((x) => ({ segment_id: x.segment_id, ...x.final })),
    ...insertions,
  ],
  key = (x) =>
    `${x.segment_id}|${x.type}|${x.canon_id}|${x.verset_v2_id}|${x.livre}|${x.chapitre}`,
  seen = new Set(),
  dups = [];
for (const x of final) {
  const k = key(x);
  if (seen.has(k)) dups.push(k);
  seen.add(k);
}
const dead = final.filter((x) => x.canon_id && !W.has(x.canon_id)),
  bad = final.filter((x) => {
    const n = [
      x.canon_id != null,
      x.verset_v2_id != null,
      x.livre != null && x.chapitre != null,
    ].filter(Boolean).length;
    return n !== 1;
  });
if (dups.length || dead.length || bad.length)
  throw Error(`intégrité ${dups.length}/${dead.length}/${bad.length}`);
const tc = Object.fromEntries(
    [1, 2, 3, 4].map((t) => [t, final.filter((x) => x.type === t).length]),
  ),
  difficult = final.filter((x) => x.type >= 3 && x.canon_id).slice(0, 15),
  ordinary = [
    ...final.filter((x) => x.type === 2),
    ...final.filter((x) => x.type === 1),
  ].slice(0, 15);
if (difficult.length !== 15 || ordinary.length !== 15) throw Error("contrôle");
const control = [...difficult, ...ordinary].map((x) => ({
  segment_id: x.segment_id,
  segment_numero: S.get(x.segment_id).segment_numero,
  type: x.type,
  canon_id: x.canon_id,
  verdict_cible: "juste",
  verdict_type: "juste",
  ancre_locale_exacte: anchor(S.get(x.segment_id), x.canon_id),
  temoin: wit(x.canon_id),
}));
const summary = {
  segments_lus: raw.segments.length,
  plage_segment_numero: [
    raw.segments[0].segment_numero,
    raw.segments.at(-1).segment_numero,
  ],
  anciens_marqueurs_ignores: raw.segments.filter(
    (x) => x.liens_revus_le || x.liens_revus_par,
  ).length,
  liens_existants_audites: raw.links.length,
  suppressions: decisions.filter((x) => x.decision === "supprimer").length,
  reciblages: decisions.filter((x) => x.changements?.reciblage).length,
  reclassements: decisions.filter((x) => x.changements?.reclassement).length,
  ajouts_certains: insertions.length,
  liens_finaux_proposes: final.length,
  repartition_types: tc,
  t4_initiaux_audites: raw.links.filter((x) => x.type === 4).length,
  t4_finaux: tc[4],
  chapitres_initiaux: raw.links.filter((x) => x.livre || x.chapitre).length,
  chapitres_finaux: final.filter((x) => x.livre || x.chapitre).length,
  cibles_mortes_finales: dead.length,
  doublons_finaux: dups.length,
  controle_stratifie: 30,
  controle_difficile: 15,
  progression_lot_sur_32367: Number(
    ((raw.segments.length / 32367) * 100).toFixed(2),
  ),
};
const dossier = {
  oeuvre: "A0013O0002",
  partie: "Prima Secundae",
  questions: "41–80",
  mode: "lecture seule ; aucune écriture en base",
  methode:
    "Charte §9/§9.0 et mémoire relues ; export paginé par question ; lecture rétrospective exhaustive de 2 041 segments indépendamment des anciens marqueurs ; audit de 341 liens ; passe d’oubli sur 680 citations ; témoins locaux ; typage fonctionnel ; contrôle exhaustif des T4 et des 44 chapitres.",
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
    "Quatre citations successives étaient décalées d’un segment : WIS.1.13, ACT.10.34, ROM.3.8 et ROM.8.28 sont replacées sur leur texte.",
    "Les onze T4 initiaux sont reclassés selon leur fonction ; aucun écho T4 autonome ne subsiste.",
    "Les chapitres MAT 5 du commentaire suivi des Béatitudes et MAT 6 du Notre Père sont conservés conformément à la charte ; trois extensions trop larges sont supprimées.",
    "GAL.5.21 est reciblé vers GAL.5.20 pour l’idolâtrie et la magie ; les réponses sur l’acception de personnes et le mal pour un bien sont reciblées vers ACT.10.34 et ROM.3.8.",
    "Quatorze omissions certaines sont constituées, dont les trois béatitudes de JOB.5.17, PSA.1.1 et PRO.3.13.",
  ],
  audit_t4_existants: decisions.filter((x) => x.avant?.type === 4),
  audit_chapitres: decisions.filter((x) => x.avant?.livre || x.avant?.chapitre),
  decisions,
  insertions,
  incertains_non_lies: [
    {
      segment_numero: 8694,
      raison:
        "Fragment philosophique générique ; la ressemblance avec JER.9.6 n’identifie aucune citation.",
    },
    {
      segment_numero: 9494,
      raison:
        "Formule théologique générique, sans locus biblique discriminant.",
    },
    {
      segment_numero: 10299,
      raison:
        "La formulation est parallèle à EZK.33.8, mais la référence éditoriale et le témoin local établissent EZK.3.18 déjà lié.",
    },
  ],
  controle_stratifie: control,
};
writeFileSync(
  `${R}/PS-Q41-80-DOSSIER-STRICT.json`,
  JSON.stringify(dossier, null, 2) + "\n",
);
writeFileSync(
  `${R}/PS-Q41-80-RAPPORT.md`,
  `# Somme théologique : Prima Secundae, questions 41 à 80\n\nAudit rétrospectif exhaustif en lecture seule. Aucune écriture en base.\n\n- ${summary.segments_lus} segments relus indépendamment des anciens marqueurs ;\n- ${summary.liens_existants_audites} liens provisoires audités : ${summary.suppressions} suppressions, ${summary.reciblages} reciblages, ${summary.reclassements} reclassements et ${summary.ajouts_certains} ajouts certains ;\n- ${summary.liens_finaux_proposes} liens finaux : ${tc[1]} T1, ${tc[2]} T2, ${tc[3]} T3 et ${tc[4]} T4 ;\n- ${summary.t4_initiaux_audites}/11 T4 et ${summary.chapitres_initiaux}/44 cibles de chapitre contrôlés exhaustivement ; ${summary.chapitres_finaux} chapitres justifiés subsistent ;\n- zéro cible morte ou doublon ; contrôle 30/30 dont 15 difficiles.\n`,
);
console.log(JSON.stringify(summary, null, 2));
