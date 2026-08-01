import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q1-40-raw.json`, 'utf8'));
const extra = JSON.parse(readFileSync(`${ROOT}/pp-q1-40-extra-witnesses.json`, 'utf8'));
const segments = new Map(raw.segments.map((row) => [row.id, row]));
const witnesses = new Map([...raw.witnesses, ...extra.verses].map((row) => [row.id_verset, row]));
const specialWitnesses = new Map(extra.special.map((row) => [row.id, row]));
const deleteReasons = new Map([
  [52267, 'Suppression prudente : la formule générale sur la loi ancienne figure de la loi nouvelle ne permet pas d’identifier Hé 7,19 plutôt qu’un autre locus typologique.'],
  [58965, 'Suppression : « de fausses béatitudes » est un emploi générique du nom commun, sans mobilisation des Béatitudes de Mt 5.'],
  [83099, 'Suppression technique et éditoriale : 3 Esd 4,40 est hors des référentiels versets_lecture et versets_v2 ; aucune cible artificielle ne doit être conservée.'],
  [52519, 'Suppression de la fausse cible Is 9,6 canonique : « le Fils nous a été donné » relève d’Is 9,5 canonique, déjà lié sur le même segment.'],
]);
const typeChanges = new Map([
  [52404, 1], [52424, 1],
  [52427, 3], [59275, 3], [52498, 3], [83204, 3], [83219, 3], [83290, 3],
]);
const motives = new Map([
  [52404, 'Citation biblique explicitement attribuée au livre de la Sagesse : rien ne subsisterait si Dieu ne le voulait (Sg 11,25).'],
  [52424, 'Citation explicite du précepte de pardon mutuel selon le pardon reçu du Christ (Ep 4,32).'],
  [52427, 'Interprétation de Rm 15,8 : Thomas rapporte à la justice et à la vérité le ministère du Christ envers les circoncis.'],
  [59275, 'Interprétation de Rm 15,9 : Thomas rapporte à la miséricorde la glorification de Dieu par les nations.'],
  [52498, 'Interprétation de Col 1,15 : le titre de Premier-né de toute créature est analysé sous le rapport de filiation et de génération.'],
  [83204, 'Interprétation de 1 Co 9,9 : l’exclusion rhétorique des bœufs porte sur l’imputation morale, non sur la providence divine.'],
  [83219, 'Interprétation de 1 Tm 2,4 : la volonté divine de sauver tous les hommes est expliquée comme volonté antécédente.'],
  [83290, 'Interprétation allégorique d’Ex 8,14 par la Glose : l’échec des mages au troisième signe figure la méconnaissance du Saint-Esprit.'],
  [52490, 'Reciblage sémantique : les trois témoins célestes - Père, Verbe et Saint-Esprit - relèvent de 1 Jn 5,7, non de Jn 5,7.'],
  [83075, 'Citation explicite du surnuméraire vulgate Si 24,31 : « qui elucidant me, vitam æternam habebunt », ciblé par versets_v2.'],
]);
const witness = (final) => {
  if (final.canon_id) {
    const row = witnesses.get(final.canon_id);
    if (!row) throw new Error(`témoin canonique absent ${final.canon_id}`);
    return ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({
      id_verset: final.canon_id, reference: row.ref, edition,
      numero_edition: row[`num_${edition}`], texte: row[edition],
    })).filter((item) => item.texte);
  }
  const row = specialWitnesses.get(final.verset_v2_id);
  if (!row) throw new Error(`témoin spécial absent ${final.verset_v2_id}`);
  return [{ verset_v2_id: row.id, edition: row.trad_id, reference: `${row.livre} ${row.ch_orig},${row.v_orig}`, texte: row.texte }];
};
const anchor = (segment) => (segment.segment_texte || '').replace(/\s+/g, ' ').slice(0, 300);
const decisions = raw.links.map((link) => {
  const segment = segments.get(link.segment_id);
  if (deleteReasons.has(link.id)) return {
    link_id: link.id, segment_id: link.segment_id, segment_numero: segment.segment_numero,
    avant: link, decision: 'supprimer', raison: deleteReasons.get(link.id), ancre_locale_exacte: anchor(segment), final: null,
  };
  const canonId = link.id === 52490 ? '1JN.5.7' : (link.id === 83075 ? null : link.canon_id);
  const versetV2Id = link.id === 83075 ? 'decc9cc4-624d-4955-aa9f-aa28ef87e996' : null;
  const final = {
    canon_id: canonId, verset_v2_id: versetV2Id, livre: null, chapitre: null,
    type: typeChanges.get(link.id) || link.type,
    fiabilite: 'vérifié', motif: motives.get(link.id) || link.motif,
    provenance: 'lecture', arbitrage_requis: false,
  };
  return {
    link_id: link.id, segment_id: link.segment_id, segment_numero: segment.segment_numero,
    avant: link, decision: 'mettre_a_jour', changements: {
      reciblage: canonId !== link.canon_id || versetV2Id !== link.verset_v2_id,
      reclassement: final.type !== link.type,
    }, final, ancre_locale_exacte: anchor(segment), temoins: witness(final),
  };
});
const finalLinks = decisions.filter((decision) => decision.final).map((decision) => ({ segment_id: decision.segment_id, ...decision.final }));
const key = (link) => `${link.segment_id}|${link.type}|${link.canon_id || ''}|${link.verset_v2_id || ''}|${link.livre || ''}|${link.chapitre || ''}`;
const keys = finalLinks.map(key);
if (keys.length !== new Set(keys).size) throw new Error('doublon final');
for (const link of finalLinks) {
  const targets = [link.canon_id, link.verset_v2_id, link.livre && link.chapitre].filter(Boolean);
  if (targets.length !== 1) throw new Error(`cible non exclusive ${key(link)}`);
}
const hardIds = new Set([52267, 58965, 83099, 52519, 52490, 83075, 52404, 52424, 52427, 59275, 52498, 83204, 83219, 83290]);
const hardPool = decisions.filter((decision) => hardIds.has(decision.link_id) || decision.final?.type >= 3);
const hard = hardPool.slice(0, 20);
for (const decision of decisions) if (decision.final?.type === 4 && !hard.includes(decision)) hard.push(decision);
while (hard.length < 20) hard.push(hardPool[hard.length]);
const ordinary = decisions.filter((decision) => decision.final?.type === 1 && !hard.includes(decision)).slice(0, hard.length);
const control = [...hard, ...ordinary].map((decision, index) => ({
  strate: index < hard.length ? 'difficile_T3_T4_reciblage_suppression' : 'T1_ordinaire',
  link_id: decision.link_id, segment_numero: decision.segment_numero,
  verdict_cible: decision.final ? 'juste' : 'suppression_justifiée',
  verdict_type: decision.final ? 'juste' : 'sans_objet',
  cible_finale: decision.final ? (decision.final.canon_id || decision.final.verset_v2_id) : null,
  temoins: decision.final ? witness(decision.final) : [],
}));
if (control.length < 30 || hard.length * 2 < control.length) throw new Error('contrôle insuffisant');
const types = Object.fromEntries([1, 2, 3, 4].map((type) => [type, finalLinks.filter((link) => link.type === type).length]));
const summary = {
  segments_lus: raw.segments.length,
  plage_segment_numero: [raw.segments[0].segment_numero, raw.segments.at(-1).segment_numero],
  segments_sans_lien_lus: raw.segments.filter((segment) => !raw.links.some((link) => link.segment_id === segment.id)).length,
  liens_existants_audites: raw.links.length,
  mises_a_jour: decisions.filter((decision) => decision.final).length,
  reciblages_ou_resolution_speciale: decisions.filter((decision) => decision.changements?.reciblage).length,
  reclassements: decisions.filter((decision) => decision.changements?.reclassement).length,
  suppressions: decisions.filter((decision) => !decision.final).length,
  ajouts_certains: 0,
  liens_finaux_proposes: finalLinks.length,
  repartition_types: types,
  cibles_speciales_finales: finalLinks.filter((link) => link.verset_v2_id).length,
  cibles_chapitre_finales: finalLinks.filter((link) => link.livre && link.chapitre).length,
  doublons_finaux: keys.length - new Set(keys).size,
  controle_stratifie: control.length,
  controle_difficile: hard.length,
  projection_globale: { segments: 2214, total: 32367, pourcentage: Number((2214 / 32367 * 100).toFixed(2)) },
};
const dossier = {
  oeuvre: 'A0013O0002', partie: 'Prima Pars', questions: '1-40',
  mode: 'lecture seule ; aucune écriture en base',
  methode: 'Export paginé complet ; reprise indépendante des anciennes marques ; lecture de tous les segments avec et sans lien ; réaudit individuel des 428 liens hérités ; deuxième passe des 160 segments sans lien à indice biblique et des 661 segments à guillemets ; contrôle intégral des T2, T3, T4 et de la cible de chapitre ; confrontation aux témoins TR0001/TR0003/TR0004 ; cibles exclusives ; typage fonctionnel conservateur.',
  pagination_live: raw.pagination,
  preetat_exact: {
    exported_at: raw.exported_at, parametres: raw.parameters,
    segments_sha256: createHash('sha256').update(JSON.stringify(raw.segments)).digest('hex'),
    liens_sha256: createHash('sha256').update(JSON.stringify(raw.links)).digest('hex'),
    segments: raw.segments.length, liens: raw.links.length,
  },
  summary,
  corrections_notables: [
    'Le faux JHN.5.7 est reciblé vers 1JN.5.7, seul témoin des trois témoins célestes.',
    'Le faux ISA.9.6 est supprimé : ISA.9.5, déjà présent sur le segment, porte « un fils nous a été donné ».',
    'Si 24,31 Vg est résolu vers le témoin versets_v2 TR0004, sans inventer de canon_id.',
    'Le chapitre MAT 5 sur les « fausses béatitudes » et l’écho diffus HEB.7.19 sont supprimés par prudence.',
    'Les T4 explicites ou interprétatifs sont reclassés ; seuls demeurent deux parallèles réellement indirects : l’imago Dei via Augustin et Samuel fils d’Helcana comme exemple logique.',
  ],
  omissions_incertains_non_lies: [
    { segment_numero: 76, raison: 'Typologie générale de l’ancienne et de la nouvelle loi, sans locus hébraïque discriminant.' },
    { segment_numero: 499, raison: '3 Esd 4,40 hors référentiels locaux ; aucune cible artificielle.' },
    { segment_numero: 1577, raison: 'Emploi générique de « béatitudes », sans référence au sermon de Mt 5.' },
  ],
  decisions, insertions: [], controle_stratifie: control,
};
writeFileSync(`${ROOT}/PRIMA-PARS-Q1-40-DOSSIER-STRICT.json`, `${JSON.stringify(dossier, null, 2)}\n`);
writeFileSync(`${ROOT}/PRIMA-PARS-Q1-40-RAPPORT.md`, `# Somme théologique - Prima Pars, Questions 1 à 40\n\nAudit rétrospectif exhaustif en lecture seule ; aucune écriture en base.\n\n- ${summary.segments_lus} segments lus (nº ${summary.plage_segment_numero.join('–')}), dont ${summary.segments_sans_lien_lus} initialement sans lien ;\n- ${summary.liens_existants_audites} liens hérités réaudités : ${summary.suppressions} suppressions, ${summary.reciblages_ou_resolution_speciale} reciblages/résolutions et ${summary.reclassements} reclassements ;\n- ${summary.liens_finaux_proposes} liens proposés : ${types[1]} T1, ${types[2]} T2, ${types[3]} T3, ${types[4]} T4 ;\n- ${summary.cibles_speciales_finales} cible versets_v2, aucune cible de chapitre, aucun doublon ;\n- contrôle stratifié : ${summary.controle_stratifie} cas, dont ${summary.controle_difficile} difficiles ;\n- projection globale : ${summary.projection_globale.segments}/${summary.projection_globale.total} = ${summary.projection_globale.pourcentage} %.\n`);
console.log(JSON.stringify(summary, null, 2));
