import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const R = "tmp/somme-liens-audit-2026-07-29";
const raw = JSON.parse(readFileSync(`${R}/supp-q70bis-raw.json`, "utf8"));
const segmentsById = new Map(raw.segments.map((x) => [x.id, x]));
const segmentsByNumber = new Map(
  raw.segments.map((x) => [x.segment_numero, x]),
);
const witnessesById = new Map(raw.witnesses.map((x) => [x.id_verset, x]));
const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const anchor = (segment) => clean(segment.segment_texte).slice(0, 300);
const witnesses = (canonId) => {
  const row = witnessesById.get(canonId);
  if (!row) throw Error(`témoin absent : ${canonId}`);
  return ["TR0001", "TR0003", "TR0004"]
    .filter((edition) => row[edition])
    .map((edition) => ({
      canon_id: canonId,
      reference: row.ref,
      edition,
      numero_edition: row[`num_${edition}`],
      texte: row[edition],
    }));
};
const reasons = new Map([
  [
    59798,
    "Citation littérale annoncée par « comme il est dit dans l’Apocalypse » : la proposition reproduit REV.18.7 dans le même ordre et avec ses termes distinctifs.",
  ],
  [
    59799,
    "Citation littérale annoncée par « selon la parole d’Isaïe » : « Avec mesure, vous l’exilez, vous la châtiez » reproduit ISA.27.8, confirmé par les témoins locaux.",
  ],
]);
const decisions = raw.links.map((link) => {
  const segment = segmentsById.get(link.segment_id);
  if (!segment || !link.canon_id || !reasons.has(link.id)) {
    throw Error(`lien hors arbitrage : ${link.id}`);
  }
  return {
    link_id: link.id,
    segment_id: link.segment_id,
    segment_numero: segment.segment_numero,
    avant: link,
    decision: "mettre_a_jour",
    changements: {
      reciblage: false,
      reclassement: link.type !== 1,
      fiabilite: link.fiabilite !== "vérifié",
      provenance: link.provenance !== "lecture",
      arbitrage: link.arbitrage_requis !== false,
      motif: link.motif !== reasons.get(link.id),
    },
    final: {
      canon_id: link.canon_id,
      verset_v2_id: null,
      livre: null,
      chapitre: null,
      type: 1,
      fiabilite: "vérifié",
      motif: reasons.get(link.id),
      provenance: "lecture",
      arbitrage_requis: false,
    },
    ancre_locale_exacte: anchor(segment),
    temoins_versets_lecture: witnesses(link.canon_id),
  };
});
const omissionVerdicts = new Map([
  [30527, "Sommaire doctrinal sans référence biblique déterminée."],
  [30528, "Citation patristique attribuée à Augustin, non biblique."],
  [30529, "Raisonnement théologique sans citation ni passage déterminé."],
  [
    30530,
    "Observation générale sur les peines de cette vie, sans épisode biblique visé.",
  ],
  [
    30531,
    "Analyse abstraite du péché originel, sans référence scripturaire déterminée.",
  ],
  [
    30532,
    "Développement eschatologique général ; aucun verset précis n’est cité ou expliqué.",
  ],
  [30533, "Citation patristique attribuée à Augustin, non biblique."],
  [30534, "REV.18.7 est déjà relevé et contrôlé ; aucune autre omission."],
  [30535, "ISA.27.8 est déjà relevé et contrôlé ; aucune autre omission."],
  [
    30536,
    "Le mot générique « feu » ne vise aucun emploi scripturaire déterminé.",
  ],
  [30537, "Raisonnement moral et théologique sans passage biblique déterminé."],
  [30538, "Cosmologie et eschatologie scolastiques sans citation biblique."],
  [30539, "Distinction conceptuelle sans référence scripturaire."],
  [
    30540,
    "Doctrine de la résurrection sans verset ou épisode précisément visé.",
  ],
  [30541, "Citation patristique attribuée à Chrysostome, non biblique."],
  [30542, "Argument rationnel sans référence biblique."],
  [30543, "Analogie morale sans passage scripturaire déterminé."],
  [
    30544,
    "Parallèle doctrinal Adam-Christ trop général pour viser un verset précis.",
  ],
  [
    30545,
    "Connaissance naturelle de Dieu exposée sans citation ni exégèse d’un passage.",
  ],
  [
    30546,
    "« Ver rongeur des damnés » est une image traditionnelle générique, sans cible déterminable dans ce segment.",
  ],
  [30547, "Référence explicite à Sénèque, donc profane et non biblique."],
  [
    30548,
    "Conclusion doctrinale sans citation, commentaire d’un verset ni écho suffisamment déterminé.",
  ],
]);
const controlSegments = raw.segments.map((segment) => ({
  segment_id: segment.id,
  segment_numero: segment.segment_numero,
  ancre_locale_exacte: anchor(segment),
  liens_finaux: decisions
    .filter((x) => x.segment_id === segment.id)
    .map((x) => ({ canon_id: x.final.canon_id, type: x.final.type })),
  verdict_omissions: omissionVerdicts.get(segment.segment_numero),
}));
if (
  raw.segments.length !== 22 ||
  raw.segments[0]?.segment_numero !== 30527 ||
  raw.segments.at(-1)?.segment_numero !== 30548 ||
  raw.links.length !== 2 ||
  decisions.length !== 2 ||
  controlSegments.length !== 22 ||
  controlSegments.some((x) => !x.verdict_omissions)
) {
  throw Error("périmètre ou contrôle exhaustif incomplet");
}
const final = decisions.map((x) => ({ segment_id: x.segment_id, ...x.final }));
const duplicateKeys = final.map(
  (x) =>
    `${x.segment_id}|${x.type}|${x.canon_id}|${x.verset_v2_id}|${x.livre}|${x.chapitre}`,
);
const duplicateCount = duplicateKeys.length - new Set(duplicateKeys).size;
const dead = final.filter((x) => !x.canon_id || !witnessesById.has(x.canon_id));
if (duplicateCount || dead.length) throw Error("intégrité finale invalide");
const summary = {
  segments_lus: 22,
  plage_segment_numero: [30527, 30548],
  segments_sans_lien_lus: 20,
  segments_a_marquer: 22,
  liens_existants_audites: 2,
  suppressions: 0,
  reciblages: 0,
  reclassements: 0,
  mises_a_niveau_metadonnees: 2,
  ajouts_certains: 0,
  liens_finaux_proposes: 2,
  repartition_types: { 1: 2, 2: 0, 3: 0, 4: 0 },
  cibles_chapitre_finales: 0,
  t4_finaux: 0,
  cibles_mortes_finales: dead.length,
  doublons_finaux: duplicateCount,
  controle_segments_exhaustif: 22,
  controle_liens_exhaustif: 2,
};
const dossier = {
  oeuvre: "A0013O0002",
  partie: "Supplément",
  question: "Question 70 bis",
  mode: "lecture seule ; aucune écriture en base",
  methode:
    "Charte §9/§9.0 et mémoire relues ; périmètre exact exporté ; lecture exhaustive des 22 segments, y compris les 20 sans lien ; audit individuel des deux liens ; passe d’oubli ; confrontation de chaque cible aux témoins locaux ; contrôle exhaustif de tous les cas.",
  parametres: raw.parameters,
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
  },
  summary,
  corrections_notables: [
    "REV.18.7 est confirmé comme citation littérale T1 : le segment reproduit l’ordre et les termes distinctifs du verset.",
    "ISA.27.8 est confirmé comme citation littérale T1 malgré la variation de traduction ; TR0003 et TR0004 confirment la cible.",
    "Les deux liens passent de douteux/ia/arbitrage à vérifié/lecture/sans arbitrage avec motifs spécifiques.",
    "Les images génériques du feu et du ver, ainsi que le parallèle Adam-Christ, ne sont pas forcés vers des cibles indéterminées.",
  ],
  decisions,
  insertions: [],
  incertains_non_lies: [],
  controle_liens_exhaustif: decisions.map((x) => ({
    link_id: x.link_id,
    segment_numero: x.segment_numero,
    canon_id: x.final.canon_id,
    type: x.final.type,
    verdict_cible: "juste",
    verdict_type: "juste",
    temoins_versets_lecture: x.temoins_versets_lecture,
  })),
  controle_segments_exhaustif: controlSegments,
};
writeFileSync(
  `${R}/SUPPLEMENT-Q70BIS-DOSSIER-STRICT.json`,
  `${JSON.stringify(dossier, null, 2)}\n`,
);
const report = `# Supplément — Question 70 bis — audit strict\n\n- 22 segments lus intégralement, de 30527 à 30548.\n- 2 liens existants audités et conservés : REV.18.7 et ISA.27.8, tous deux T1.\n- 20 segments sans lien relus dans la passe d’oubli.\n- 0 omission certaine, 0 ajout, 0 suppression, 0 reciblage, 0 reclassement.\n- 2 mises à niveau de métadonnées : vérifié, lecture, sans arbitrage, motif spécifique.\n- 0 T4, 0 cible de chapitre, 0 cible morte, 0 doublon.\n- Contrôle exhaustif : 22/22 segments et 2/2 liens.\n- Aucune écriture en base.\n`;
writeFileSync(`${R}/SUPPLEMENT-Q70BIS-RAPPORT.md`, report);
console.log(JSON.stringify(summary, null, 2));
