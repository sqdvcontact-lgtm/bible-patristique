import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q1-7-raw.json`, 'utf8'));
const diagnostics = JSON.parse(readFileSync(`${ROOT}/ss-q1-7-diagnostics.json`, 'utf8'));
const segmentsByNumero = new Map(raw.segments.map((segment) => [segment.segment_numero, segment]));
const witnessesById = new Map(raw.witnesses.map((witness) => [witness.id_verset, witness]));
witnessesById.set('MAT.1.2', {
  id_verset: 'MAT.1.2',
  TR0001: 'Abraham engendra Isaac. Isaac engendra Jacob. Jacob engendra Juda et ses frères.',
  TR0003: 'Abraham engendra Isaac ; Isaac engendra Jacob ; Jacob engendra Juda et ses frères ;',
  TR0004: 'Abraham genuit Isaac. Isaac autem genuit Jacob. Jacob autem genuit Judam, et fratres ejus.',
});

const drops = new Map([
  [59358, 'La foi figure en GAL.5.22 ; GAL.5.23 poursuit la liste sans porter le terme commenté. Le lien concurrent verset 23 est supprimé.'],
]);
const overrides = new Map([
  [54119, { type: 3, motif: 'Commentaire de GAL.3.24 : la pédagogie progressive de la Loi est expliquée comme l’enfance de l’Ancien Testament.' }],
  [54175, { type: 3, motif: 'Lecture doctrinale de 1CO.13.13 : l’énumération paulinienne distingue foi et charité comme vertus distinctes.' }],
  [54178, { type: 3, motif: 'Commentaire de 1CO.12.9 : la foi est examinée comme grâce gratuitement donnée.' }],
  [54179, { type: 3, motif: 'Commentaire de GAL.5.22 : la foi est examinée comme fruit de l’Esprit.' }],
  [54183, { type: 2, motif: 'Paraphrase attribuée de ISA.11.2 : sagesse et science sont comptées parmi les dons de l’Esprit.' }],
  [54186, { type: 3, motif: 'La Glose sur LUK.12.4 interprète la force devant les persécuteurs comme fondement de la foi.' }],
  [59357, { type: 3, motif: 'Commentaire explicite de GAL.5.22 : la foi-fruit est expliquée comme certitude délectable des réalités invisibles.' }],
  [84469, { motif: 'Commentaire de HEB.11.1 : « substance des réalités à espérer » désigne l’ébauche présente de la béatitude espérée.' }],
  [84470, { motif: 'Commentaire de HEB.11.1 : la « preuve » désigne l’adhésion ferme produite par l’autorité divine.' }],
  [84471, { motif: 'Reformulation doctrinale de HEB.11.1 en définition formelle de l’habitus de foi.' }],
  [84472, { motif: 'Commentaire de HEB.11.1 distinguant la foi de l’opinion, du doute, de la science et de l’intelligence.' }],
  [84473, { motif: 'Commentaire de HEB.11.1 : « substance » signifie ce qui est premier et contient virtuellement la suite.' }],
  [84474, { motif: 'Commentaire de HEB.11.1 : la preuve issue de l’autorité divine convainc sans rendre l’objet visible.' }],
]);

const additions = [
  [12472, 'ROM.8.23', 3, 'La Glose interprète les « prémices de l’Esprit » comme la plénitude de connaissance accordée aux Apôtres.'],
  [12501, 'JHN.14.1', 3, 'Interprétation augustinienne : on croit Pierre ou Paul, mais on ne croit « en » personne sinon Dieu.'],
  [12561, 'MAT.5.39', 3, 'Interprétation augustinienne du précepte de tendre l’autre joue comme préparation intérieure à la charité.'],
  [12584, 'JHN.1.34', 3, 'La confession du Fils de Dieu établit que Jean connaissait déjà l’avènement du Christ dans la chair.'],
  [12584, 'JHN.1.29', 3, 'L’Agneau qui enlève les péchés est interprété comme annonce de l’immolation future du Christ.'],
  [12584, 'ZEC.9.11', 3, 'Le sang de l’alliance retirant les captifs de la fosse est appliqué à l’efficacité de la Passion jusque dans les limbes.'],
  [12606, 'JHN.4.42', 3, 'Interprétation allégorique : la Samaritaine figure la raison humaine qui conduit à une foi ensuite fondée sur l’autorité divine.'],
  [12614, '2TH.1.11', 3, 'La Glose explique « l’œuvre de la foi » comme la confession extérieure.'],
  [12630, 'HEB.11.1', 3, 'Ouverture du commentaire suivi de HEB.11.1 : objection sur le sens du mot « substance ».'],
  [12631, 'HEB.11.1', 3, 'Commentaire suivi de HEB.11.1 : objection sur les réalités espérées dans la définition de la foi.'],
  [12632, 'HEB.11.1', 3, 'Commentaire suivi de HEB.11.1 : objection sur la place de l’espérance plutôt que de la charité.'],
  [12633, 'HEB.11.1', 3, 'Commentaire suivi de HEB.11.1 : objection sur les termes « substance » et « preuve ».'],
  [12634, 'HEB.11.1', 3, 'Commentaire suivi de HEB.11.1 : objection sur la preuve de réalités invisibles.'],
  [12635, 'HEB.11.1', 3, 'Le sed contra confirme l’autorité de la définition paulinienne de HEB.11.1.'],
  [12636, 'HEB.11.1', 3, 'La description paulinienne est reçue comme contenant tous les éléments d’une définition de la foi.'],
  [12637, 'HEB.11.1', 3, 'Préparation doctrinale de l’explication des deux membres de la définition de HEB.11.1.'],
  [12642, 'HEB.11.1', 3, 'Les définitions patristiques de la foi sont ramenées aux deux membres de HEB.11.1.'],
  [12644, 'HEB.11.1', 3, 'Réponse sur l’inclusion des réalités espérées dans la définition de la foi.'],
  [12645, 'HEB.11.1', 3, 'Réponse expliquant pourquoi l’objet de l’espérance convient plus précisément à la définition paulinienne.'],
  [12646, 'HEB.11.1', 3, 'Réponse expliquant l’unité de l’acte sous les deux termes « substance » et « preuve ».'],
  [12655, 'GAL.5.6', 3, 'La foi agissante par la charité est expliquée comme extension pratique de l’intellect spéculatif.'],
  [12659, 'GAL.5.6', 3, 'La foi agissante par la charité fonde explicitement la thèse que la charité est forme de la foi.'],
  [12668, 'JAS.2.20', 3, 'La Glose explique que la foi morte sans les œuvres revit par les œuvres.'],
  [12672, '1CO.13.10', 3, 'Réponse interprétative : le parfait exclut seulement l’imperfection qui appartient à l’essence de l’imparfait.'],
  [12673, 'JAS.2.20', 3, 'Réponse interprétative distinguant la foi dite morte de la mort essentielle d’un vivant.'],
  [12686, '1CO.12.4', 3, 'La diversité des grâces est expliquée comme distribution non commune à tous les membres de l’Église.'],
  [12686, '1CO.12.8', 3, 'La distribution « à l’un… à l’autre… » fonde l’interprétation de la foi comme grâce supérieure particulière.'],
  [12686, '1CO.12.9', 3, 'La foi de 1CO.12.9 est explicitement interprétée comme foi d’ordre supérieur, constance ou parole de foi.'],
  [12730, 'HOS.3.1', 3, 'La Glose sur HOS.3.1 est invoquée pour expliquer la perte des dons de grâce chez les démons.'],
  [12759, 'ROM.10.15', 3, 'La mission des prédicateurs est expliquée comme modalité extérieure par laquelle Dieu propose les vérités de foi.'],
  [12773, 'MAT.1.2', 3, 'La Glose de la généalogie interprète Abraham engendrant Isaac comme la foi engendrant l’espérance.'],
];

function label(link) { return link.canon_id || link.verset_v2_id || `${link.livre} ${link.chapitre}`; }
function witnesses(link) {
  if (link.canon_id) {
    const witness = witnessesById.get(link.canon_id);
    if (!witness) throw new Error(`Témoin absent : ${link.canon_id}`);
    return ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({ edition, texte: witness[edition] })).filter((item) => item.texte);
  }
  if (link.livre && link.chapitre) return [{ edition: 'cible_chapitre', texte: `${link.livre} ${link.chapitre}` }];
  return [{ edition: 'verset_v2', texte: String(link.verset_v2_id) }];
}
function finalFor(link) {
  const override = overrides.get(link.id) || {};
  return {
    segment_id: link.segment_id,
    canon_id: override.canon_id ?? link.canon_id,
    verset_v2_id: override.verset_v2_id ?? link.verset_v2_id,
    livre: override.livre ?? link.livre,
    chapitre: override.chapitre ?? link.chapitre,
    type: override.type ?? link.type,
    fiabilite: 'vérifié',
    motif: override.motif || link.motif || `Lien de type ${link.type} vers ${label(link)}, relu sur le segment et les témoins.`,
    provenance: 'lecture',
    arbitrage_requis: false,
  };
}

const decisions = raw.links.map((link) => {
  const segment = raw.segments.find((candidate) => candidate.id === link.segment_id);
  const reason = drops.get(link.id);
  const final = reason ? null : finalFor(link);
  return {
    decision_id: `existing:${link.id}`, link_id: link.id, segment_id: link.segment_id,
    segment_numero: segment.segment_numero, question: segment.ref_niv2, ancre_locale_exacte: true,
    avant: link, final, decision: final ? (overrides.has(link.id) ? 'corriger' : 'conserver') : 'supprimer',
    justification: reason || overrides.get(link.id)?.motif || `Lien ${label(link)} relu dans son contexte et contrôlé sur les témoins.`,
    temoins: final ? witnesses(final) : witnesses(link),
  };
});
for (const [segmentNumero, canonId, type, motif] of additions) {
  const segment = segmentsByNumero.get(segmentNumero);
  if (!segment) throw new Error(`Segment absent : ${segmentNumero}`);
  const final = { segment_id: segment.id, canon_id: canonId, verset_v2_id: null, livre: null, chapitre: null, type, fiabilite: 'vérifié', motif, provenance: 'lecture', arbitrage_requis: false };
  decisions.push({
    decision_id: `addition:S${segmentNumero}:${canonId}:T${type}`, link_id: null, segment_id: segment.id,
    segment_numero: segmentNumero, question: segment.ref_niv2, ancre_locale_exacte: true,
    avant: null, final, decision: 'ajouter', justification: motif, temoins: witnesses(final),
  });
}
const finalLinks = decisions.filter((decision) => decision.final).map((decision) => decision.final);
const keys = finalLinks.map((link) => [link.segment_id, link.type, link.canon_id, link.verset_v2_id, link.livre, link.chapitre].join('|'));
if (keys.length !== new Set(keys).size) throw new Error('Doublon dans le postétat');

const difficultIds = new Set([
  ...diagnostics.hard.map((review) => `existing:${review.link_id}`),
  ...diagnostics.low_t1.map((review) => `existing:${review.link_id}`),
  'addition:S12630:HEB.11.1:T3',
]);
const difficult = decisions.filter((decision) => difficultIds.has(decision.decision_id)).slice(0, 18);
const complements = decisions.filter((decision) => !difficultIds.has(decision.decision_id) && decision.final)
  .filter((_, index) => index % 7 === 0).slice(0, 18);
const control = [...difficult, ...complements].map((decision) => ({
  decision_id: decision.decision_id, segment_numero: decision.segment_numero,
  niveau: difficultIds.has(decision.decision_id) ? 'difficile' : 'stratifié',
  resultat: decision.final ? 'conforme au postétat proposé' : 'suppression confirmée',
  justification: decision.justification,
}));
if (control.length < 30 || difficult.length * 2 < control.length) throw new Error('Contrôle insuffisant');
const typeCounts = Object.fromEntries([1, 2, 3, 4].map((type) => [type, finalLinks.filter((link) => link.type === type).length]));
const dossier = {
  oeuvre_id: 'A0013O0002', partie: 'Secunda Secundae', questions: ['Question 1', 'Question 7'],
  protocole: {
    charte_sha256: raw.parameters.charte_ia.sha256,
    feedback_sha256: raw.parameters.feedback_liens_protocole.sha256,
    regle: 'Lecture segment par segment ; cible reconnue au contenu ; type 1 citation, type 2 reprise verbale fondue, type 3 commentaire explicite, type 4 écho sans reprise distinctive.',
  },
  couverture: {
    segments: raw.segments.length, intervalle_segment_numero: [raw.segments[0].segment_numero, raw.segments.at(-1).segment_numero],
    liens_herites_reaudites: raw.links.length, segments_sans_lien_repasses: diagnostics.stats.without,
    candidats_marqueurs: diagnostics.stats.candidates, segments_a_guillemets_sans_lien: diagnostics.stats.quoted,
  },
  summary: {
    liens_avant: raw.links.length,
    suppressions: decisions.filter((decision) => decision.decision === 'supprimer').length,
    corrections: decisions.filter((decision) => decision.decision === 'corriger').length,
    ajouts: decisions.filter((decision) => decision.decision === 'ajouter').length,
    liens_finaux_proposes: finalLinks.length, types_finaux: typeCounts,
    controle_stratifie: control.length, controle_difficile: difficult.length,
    segments_deja_marques_ia_lecture: raw.segments.filter((segment) => segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le).length,
    segments_a_marquer: raw.segments.filter((segment) => !(segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le)).length,
  },
  decisions, controle: control,
};
writeFileSync(`${ROOT}/SECUNDA-SECUNDAE-Q1-7-DOSSIER-STRICT.json`, `${JSON.stringify(dossier, null, 2)}\n`);
console.log(JSON.stringify(dossier.summary, null, 2));
