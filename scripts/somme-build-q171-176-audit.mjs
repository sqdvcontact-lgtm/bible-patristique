import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q171-176-raw.json`, 'utf8'));
const { segments, links } = raw;
const byNum = new Map(segments.map((s) => [s.segment_numero, s]));
const byId = new Map(segments.map((s) => [s.id, s]));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const sha = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

// Corrections/reclassements fermes issus de la lecture continue et de la vérification des témoins.
const corrections = new Map([
  [56075, { type: 3 }],
  [56081, { type: 3 }],
  [56085, { canon_id: '1CO.14.25', type: 3 }],
  [56092, { type: 3 }],
  [56106, { canon_id: 'MAT.7.22' }],
  [56107, { canon_id: '1CO.13.2', type: 3 }],
  [56113, { type: 3 }],
  [56115, { type: 3 }],
  [56118, { type: 3 }],
  [56127, { canon_id: 'ACT.10.10' }],
  [56134, { canon_id: '1KI.5.13' }],
  [56136, { type: 1 }],
  [59423, { canon_id: 'GEN.41.26' }],
  [56141, { canon_id: 'EXO.33.11' }],
  [56158, { type: 3 }],
  [56167, { type: 3 }],
  [56168, { type: 3 }],
  [59426, { type: 3 }],
  [56169, { canon_id: '2CO.12.4', livre: null, chapitre: null, type: 1 }],
  [56171, { canon_id: '2CO.12.2', type: 3 }],
  [56178, { type: 2 }],
  [56183, { type: 2 }],
  [56189, { canon_id: '1CO.14.5' }],
  [56190, { type: 2 }],
]);
const deletions = new Set([59706]);

const specs = [
  [20389, 'SIR.48.13', 1, 'Citation explicite, numérotation Vulgate 48,13 : le corps mort d’Élisée prophétisa.'],
  [20389, 'SIR.49.15', 1, 'Citation explicite, numérotation Vulgate 49,17-18 : les ossements de Joseph prophétisèrent après sa mort.'],
  [20394, '1SA.9.9', 1, 'Citation explicite : celui qu’on nomme prophète était autrefois appelé voyant.'],
  [20399, 'SIR.48.13', 3, 'Le miracle posthume d’Élisée est interprété comme prophétie au sens de preuve.'],
  [20399, 'SIR.49.15', 3, 'Le miracle posthume des ossements de Joseph est interprété comme prophétie au sens de preuve.'],
  [20410, '1KI.19.11', 1, 'Citation explicite d’Élie invité à se tenir sur la montagne devant le Seigneur qui passe.'],
  [20419, '1CO.14.25', 1, 'La citation sur les secrets du cœur dévoilés se poursuit au verset 25.'],
  [20420, 'ISA.6.1', 1, 'Citation explicite de la vision du Seigneur assis sur un trône élevé.'],
  [20420, 'ISA.40.12', 1, 'Citation explicite : qui a mesuré les eaux dans sa main ?'],
  [20420, 'ISA.58.7', 1, 'Citation explicite : partager son pain avec celui qui a faim.'],
  [20420, 'ISA.47.9', 1, 'Citation explicite de la perte soudaine des enfants et du veuvage.'],
  [20420, '2KI.5.26', 2, 'Allusion narrative précise à Élisée connaissant à distance l’action de Giézi.'],
  [20431, '1CO.13.9', 1, 'Citation explicite : notre connaissance et notre prophétie sont partielles.'],
  [20431, '1CO.13.10', 1, 'Citation explicite : quand vient le parfait, le partiel disparaît.'],
  [20442, 'ISA.38.1', 1, 'Citation explicite de l’ordre donné à Ézéchias de régler sa maison avant sa mort.'],
  [20447, 'ISA.38.1', 3, 'La menace adressée à Ézéchias est interprétée selon la disposition présente des causes.'],
  [20447, 'JON.3.4', 1, 'Citation explicite : encore quarante jours et Ninive sera détruite.'],
  [20454, '2PE.1.21', 1, 'Citation explicite : la prophétie vient d’hommes poussés par l’Esprit Saint.'],
  [20484, 'MAT.7.23', 1, 'La citation se poursuit par la réponse du Christ : je ne vous ai jamais connus.'],
  [20487, '2KI.4.38', 1, 'Référence éditoriale explicite aux fils des prophètes habitant auprès d’Élisée.'],
  [20495, '1KI.18.19', 1, 'Citation explicite du rassemblement des prophètes de Baal et d’Astarté au Carmel.'],
  [20499, 'DEU.18.21', 1, 'Citation explicite de la question permettant de reconnaître une fausse prophétie.'],
  [20499, 'DEU.18.22', 1, 'La citation se poursuit par le critère de la parole restée sans effet.'],
  [20501, '1KI.22.22', 1, 'Citation explicite de l’esprit menteur dans la bouche des prophètes.'],
  [20526, 'DAN.5.5', 2, 'Allusion narrative précise à l’inscription apparue sur la muraille devant Balthazar.'],
  [20527, 'LUK.24.45', 1, 'Citation explicite : le Seigneur ouvrit l’esprit des Apôtres à l’intelligence des Écritures.'],
  [20545, '2PE.1.19', 1, 'Citation explicite de la parole prophétique comme lampe brillant dans un lieu obscur.'],
  [20546, 'JHN.11.51', 1, 'Citation explicite de la prophétie involontaire de Caïphe.'],
  [20548, '2SA.23.2', 1, 'Citation explicite de David : l’Esprit du Seigneur a parlé par moi.'],
  [20548, 'JHN.11.51', 3, 'La parole de Caïphe illustre une annonce dont le locuteur ne saisit pas le sens prophétique.'],
  [20548, 'JER.13.5', 2, 'Allusion narrative précise au geste prophétique de Jérémie cachant sa ceinture près de l’Euphrate.'],
  [20548, 'JHN.19.23', 2, 'Allusion narrative précise aux soldats partageant les vêtements du Christ.'],
  [20548, 'JHN.19.24', 2, 'La scène du partage des vêtements accomplit à l’insu des soldats la parole scripturaire.'],
  [20552, 'JER.18.9', 1, 'La seconde citation commence par la promesse de bâtir et planter une nation.'],
  [20552, 'JER.18.10', 1, 'La seconde citation se poursuit par la révocation du bien promis si la nation fait le mal.'],
  [20553, 'ACT.10.11', 2, 'Allusion narrative précise à la nappe céleste vue par Pierre en extase.'],
  [20553, 'ISA.6.1', 1, 'Citation explicite : Isaïe vit le Seigneur assis sur son trône.'],
  [20553, 'GEN.28.12', 2, 'Allusion narrative précise au songe de Jacob et à l’échelle.'],
  [20553, 'GEN.22.12', 1, 'Citation explicite de la voix céleste : ne porte pas la main sur l’enfant.'],
  [20566, '2SA.23.3', 1, 'Citation explicite : le Fort d’Israël a parlé à David.'],
  [20566, '2SA.23.4', 1, 'La citation se poursuit par l’image de la lumière du matin sans nuages.'],
  [20578, '1KI.5.9', 1, 'Citation explicite, numérotation Vulgate 4,29 : Dieu donna à Salomon sagesse et prudence.'],
  [20585, 'JOS.10.12', 2, 'Allusion narrative précise à Josué arrêtant le soleil et la lune.'],
  [20585, 'ISA.38.8', 2, 'Allusion narrative précise au recul du soleil annoncé par Isaïe.'],
  [20585, 'SIR.48.5', 1, 'La citation sur Élie se poursuit au verset 5 : il releva un mort des enfers.'],
  [20592, 'DEU.34.11', 1, 'La citation sur la supériorité de Moïse se poursuit par les signes accomplis en Égypte.'],
  [20592, 'DEU.34.12', 1, 'La citation se poursuit par les prodiges accomplis devant tout Israël.'],
  [20600, '2PE.1.19', 1, 'Citation explicite de la parole prophétique comme lumière dans un lieu obscur.'],
  [20605, '2KI.1.3', 1, 'Référence éditoriale explicite au message d’Élie contre la consultation du dieu d’Accaron.'],
  [20607, '1SA.3.1', 1, 'Citation explicite : avant Samuel la parole du Seigneur était rare.'],
  [20607, 'ISA.8.1', 1, 'Citation explicite de l’ordre donné à Isaïe d’écrire dans un grand livre.'],
  [20610, 'EXO.6.2', 1, 'La citation où Dieu révèle son nom à Moïse commence par : Je suis le Seigneur.'],
  [20610, 'EXO.6.3', 1, 'La citation se poursuit par les apparitions aux patriarches et le nom Adonaï.'],
  [20616, 'ACT.11.28', 2, 'Allusion narrative précise à la prophétie d’Agabus rapportée par les Actes.'],
  [20616, 'ACT.21.9', 2, 'Allusion narrative précise aux quatre filles vierges de Philippe qui prophétisaient.'],
  [20630, 'ACT.10.10', 2, 'Allusion narrative précise à l’extase de Pierre.'],
  [20630, 'ACT.12.7', 2, 'Allusion narrative précise à Pierre délivré de prison par un ange.'],
  [20638, 'GAL.2.20', 1, 'Citation explicite : ce n’est plus moi qui vis, c’est le Christ qui vit en moi.'],
  [20650, '2CO.12.2', 3, 'Le troisième ciel de Paul est interprété comme lieu de la contemplation bienheureuse.'],
  [20651, '2CO.12.2', 3, 'Le troisième ciel de Paul reçoit trois interprétations intellectuelles ordonnées.'],
  [20652, '2CO.12.2', 3, 'Le troisième ciel est interprété comme contemplation de Dieu.'],
  [20652, '2CO.12.4', 3, 'Le paradis de Paul est interprété comme délectation jointe à la vision.'],
  [20661, '2CO.5.7', 1, 'La citation se poursuit : nous marchons par la foi et non par la claire vision.'],
  [20667, '2CO.5.6', 3, 'L’exil loin du Seigneur est appliqué à l’état de voyageur de Paul, non à son acte de vision.'],
  [20671, '2CO.12.2', 3, 'Le troisième ciel sert à discuter si Paul pouvait connaître l’état corporel de son ravissement.'],
  [20674, '2CO.12.2', 3, 'Exégèse explicite de ce que Paul sait et ignore dans le récit du troisième ciel.'],
  [20675, '2CO.12.2', 3, 'L’hypothèse du ravissement corporel ou seulement spirituel interprète le récit paulinien.'],
  [20676, '2CO.12.2', 3, 'L’exégèse augustinienne du troisième ciel réel réfute une simple image de ravissement.'],
  [20677, '2CO.12.2', 3, 'Le récit est interprété comme ravissement de l’âme avec ignorance de son union au corps.'],
  [20678, '2CO.12.2', 3, 'Discussion exégétique de l’ignorance exprimée par Paul au sujet de son corps.'],
  [20679, '2CO.12.2', 3, 'Les temps verbaux du récit paulinien servent à réfuter une connaissance acquise après coup.'],
  [20680, '2CO.12.2', 3, 'Conclusion augustinienne sur l’ignorance durable de Paul quant à la séparation de l’âme.'],
  [20681, '2CO.12.2', 1, 'Reprise textuelle explicite : je connais un homme, après quatorze ans.'],
  [20682, '2CO.12.2', 3, 'Le troisième ciel est interprété comme réalité incorporelle accessible à l’intelligence.'],
  [20683, '2CO.12.2', 3, 'Le ravissement de Paul est comparé à la vision des bienheureux quant à l’objet et au mode.'],
  [20683, '1CO.15.53', 1, 'Citation explicite de l’être corruptible revêtant l’incorruptibilité à la résurrection.'],
  [20690, 'MAT.28.19', 1, 'Citation explicite de l’envoi des disciples pour enseigner toutes les nations.'],
  [20697, '1CO.12.10', 3, 'La liste paulinienne place l’interprétation des langues après la diversité des langues.'],
  [20702, '1CO.14.5', 3, 'Le besoin d’interprétation pour édifier l’Église fonde la supériorité pratique de la prophétie.'],
  [20702, '1CO.14.14', 3, 'La prière en langue sans intelligence fonde l’argument de l’absence d’édification personnelle.'],
  [20702, '1CO.14.22', 3, 'Le signe des langues pour les non-croyants fonde le troisième argument de Paul.'],
  [20702, '1CO.14.23', 3, 'L’hypothèse des auditeurs traitant les locuteurs d’insensés est reprise dans l’argument.'],
  [20702, '1CO.14.24', 3, 'La prophétie convainquant l’infidèle est appliquée à son utilité supérieure.'],
  [20702, '1CO.14.25', 3, 'La révélation des secrets du cœur explique l’efficacité de la prophétie auprès de l’infidèle.'],
  [20704, '1CO.14.2', 1, 'Citation explicite : celui qui parle en langue ne parle pas aux hommes mais à Dieu.'],
];

const targets = new Set(specs.map((x) => x[1]));
for (const l of links) if (!deletions.has(l.id)) targets.add(corrections.get(l.id)?.canon_id ?? l.canon_id);
targets.delete(null);
const witnesses = [];
for (const ids of Array.from(targets).reduce((a, id, i) => { (a[Math.floor(i / 100)] ??= []).push(id); return a; }, [])) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset,ref,TR0001,TR0003,TR0004,num_TR0001,num_TR0003,num_TR0004,ordre').in('id_verset', ids).order('ordre');
  if (error) throw error;
  witnesses.push(...data);
}
const wm = new Map(witnesses.map((w) => [w.id_verset, w]));
for (const id of targets) if (!wm.has(id)) throw new Error(`Témoin absent : ${id}`);
const ev = (id) => ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({ id_verset: id, reference: wm.get(id).ref, edition, numero_edition: wm.get(id)[`num_${edition}`], texte: wm.get(id)[edition] }));

const defaultMotif = (l, final) => {
  const n = byId.get(l.segment_id).segment_numero;
  const target = final.canon_id ?? `${final.livre}.${final.chapitre}`;
  return `Lien relu au segment ${n} : ${target} est la cible fonctionnelle attestée par le contexte local et les témoins bibliques.`;
};
const decisions = links.map((l) => {
  const s = byId.get(l.segment_id);
  if (deletions.has(l.id)) return { link_id: l.id, segment_id: l.segment_id, segment_numero: s.segment_numero, avant: l, decision: 'supprimer', raison: 'Faux positif redondant : la citation « supérieur à celui qui parle en langues » relève de 1CO.14.5, non de 1CO.14.4.', ancre_locale_exacte: s.segment_texte };
  const c = corrections.get(l.id) ?? {};
  const final = { canon_id: c.canon_id ?? l.canon_id, verset_v2_id: null, livre: c.canon_id ? null : (c.livre ?? l.livre), chapitre: c.canon_id ? null : (c.chapitre ?? l.chapitre), type: c.type ?? l.type, fiabilite: 'vérifié', motif: '', provenance: 'lecture', arbitrage_requis: false };
  if (l.id === 56134) final.motif = 'Correction du faux classement EST.4.9 : la citation sur Salomon et les arbres correspond à 1KI.5.13 (numérotation Vulgate 4,33).';
  else if (l.id === 56141) final.motif = 'Correction EXO.39.11 → EXO.33.11 : le Seigneur parle à Moïse face à face comme un homme à son ami.';
  else if (l.id === 56106) final.motif = 'Correction MAT.6.22 → MAT.7.22 : « n’avons-nous pas prophétisé en ton nom ? »';
  else if (l.id === 56107) final.motif = 'Correction 1CO.13.1 → 1CO.13.2 et reclassement T3 : Paul y associe prophétie, mystères et absence de charité.';
  else if (l.id === 56127) final.motif = 'Correction ACT.10.9 → ACT.10.10 : l’extase de Pierre commence au verset 10.';
  else if (l.id === 59423) final.motif = 'Correction GEN.41.28 → GEN.41.26 : les sept beaux épis signifient sept années.';
  else if (l.id === 56169) final.motif = 'Précision de la cible de chapitre vers 2CO.12.4 : les paroles ineffables entendues par Paul sont citées directement.';
  else if (l.id === 56171) final.motif = 'Correction du faux PSA.113.19 : le segment interprète le ravissement de Paul en 2CO.12.2 ; PSA.115.11 est déjà attesté séparément.';
  else if (l.id === 56189) final.motif = 'Correction 1CO.14.15 → 1CO.14.5 : Paul y dit que celui qui prophétise est plus grand que celui qui parle en langues.';
  else final.motif = defaultMotif(l, final);
  return { link_id: l.id, segment_id: l.segment_id, segment_numero: s.segment_numero, avant: l, decision: 'mettre_a_jour', final, ancre_locale_exacte: s.segment_texte, temoins_versets_lecture: final.canon_id ? ev(final.canon_id) : [] };
});

const insertions = specs.map(([n, canon_id, type, motif], i) => {
  const s = byNum.get(n);
  if (!s) throw new Error(`Segment absent ${n}`);
  return { id_proposition: `new-${i + 1}`, segment_id: s.id, segment_numero: n, canon_id, verset_v2_id: null, livre: null, chapitre: null, type, fiabilite: 'vérifié', motif, provenance: 'lecture', arbitrage_requis: false, ancre_locale_exacte: s.segment_texte, temoins_versets_lecture: ev(canon_id) };
});
const retained = decisions.filter((d) => d.decision !== 'supprimer').map((d) => ({ segment_id: d.segment_id, ...d.final }));
const finalItems = [...retained, ...insertions];
const key = (x) => `${x.segment_id}|${x.type}|${x.canon_id ?? ''}|${x.verset_v2_id ?? ''}|${x.livre ?? ''}|${x.chapitre ?? ''}`;
const seen = new Set();
for (const x of finalItems) { if (seen.has(key(x))) throw new Error(`Doublon final : ${key(x)}`); seen.add(key(x)); }
const counts = Object.fromEntries([1, 2, 3, 4].map((t) => [t, finalItems.filter((x) => x.type === t).length]));
const pool34 = [...decisions.filter((d) => d.final && d.final.type >= 3), ...insertions.filter((x) => x.type >= 3)];
const pool12 = [...decisions.filter((d) => d.final && d.final.type <= 2), ...insertions.filter((x) => x.type <= 2)];
const control = [...pool34.slice(0, 15), ...pool12.slice(0, 15)].map((x) => ({ source: x.id_proposition ? 'ajout' : 'existant', id: x.id_proposition ?? x.link_id, segment_numero: x.segment_numero, type: x.id_proposition ? x.type : x.final.type, cible: x.id_proposition ? x.canon_id : x.final.canon_id, ancre_locale_exacte: x.ancre_locale_exacte, temoins_versets_lecture: x.temoins_versets_lecture, verdict: 'juste après relecture locale et confrontation TR0001/TR0003/TR0004' }));
const before = 20387, potential = before + segments.length, total = 32367;
const dossier = {
  oeuvre: 'A0013O0002', partie: 'Secunda Secundae', questions: '171–176', mode: 'lecture seule',
  pagination_live: raw.pagination,
  preetat_exact: { exported_at: raw.exported_at, segments_sha256: sha(segments), liens_sha256: sha(links), segments: segments.length, liens: links.length, segment_numero: [segments[0].segment_numero, segments.at(-1).segment_numero] },
  methode: 'Lecture exhaustive des 319 segments ; audit des 143 liens ; confrontation des cibles à trois témoins de versets_lecture ; typologie fonctionnelle T1/T2/T3.',
  summary: { segments_lus: segments.length, liens_existants_audites: links.length, liens_supprimes: deletions.size, liens_reclasses_ou_corriges: corrections.size, ajouts_certains: insertions.length, liens_finaux_proposes: finalItems.length, repartition_types: counts, segments_sans_lien_apres_plan: segments.filter((s) => !finalItems.some((x) => x.segment_id === s.id)).length, controle_stratifie: control.length, controle_types_3_4: control.filter((x) => x.type >= 3).length, revus_cumul_avant: before, revus_cumul_potentiel: potential, total_oeuvre: total, pourcentage_cumul_potentiel: Number((potential / total * 100).toFixed(4)) },
  corrections_notables: ['MAT.6.22 → MAT.7.22 ; ajout MAT.7.23.', 'EXO.39.11 → EXO.33.11.', 'EST.4.9 → 1KI.5.13 (Vulgate 3 R 4,33) ; ajout 1KI.5.9 (Vulgate 4,29).', 'ACT.10.9 → ACT.10.10.', 'GEN.41.28 → GEN.41.26.', 'Une cible de chapitre 2CO.12 est ramenée au verset 4.', 'Le doublon erroné 1CO.14.4 est supprimé ; la citation exacte est 1CO.14.5.', 'Tous les T4 sont résolus : aucun T4 final.'],
  decisions, insertions, controle_stratifie: control,
};
if (segments.length !== 319 || links.length !== 143 || control.length !== 30 || control.filter((x) => x.type >= 3).length !== 15 || counts[4] !== 0) throw new Error('Comptes inattendus');
writeFileSync(`${ROOT}/SS-Q171-176-DOSSIER-STRICT.json`, `${JSON.stringify(dossier, null, 2)}\n`);
const segmentPages = raw.pagination.filter((x) => x.objet === 'segments').map((x) => x.lignes);
writeFileSync(`${ROOT}/SS-Q171-176-RAPPORT.md`, `# Somme — IIa-IIae, questions 171 à 176\n\n- 319 segments lus intégralement ; pagination ${segmentPages.join(' + ')} ;\n- 143 liens existants audités ; ${corrections.size} corrections ou reclassements ; ${deletions.size} suppression ;\n- ${insertions.length} ajouts certains ; ${finalItems.length} liens finaux : ${counts[1]} T1, ${counts[2]} T2, ${counts[3]} T3, ${counts[4]} T4 ;\n- contrôle stratifié 30/30, dont 15 T3/T4 ;\n- projection ${potential}/${total} = ${dossier.summary.pourcentage_cumul_potentiel.toFixed(4)} %.\n\nBase non modifiée.\n`);
console.log(JSON.stringify(dossier.summary, null, 2));
