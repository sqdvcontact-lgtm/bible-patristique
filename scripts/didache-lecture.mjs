// LECTURE de la Didachè (A0012O0002, 107 segments) — constitution des liens
// bibliques par LECTURE segment par segment (charte §9.0, protocole
// feedback_liens_protocole). Œuvre-manuel : cite en rafales courtes le Sermon
// sur la montagne, le Notre Père, les deux voies, le Décalogue — le mécanique
// les rate. Provenance 'lecture' ; la lecture AFFIRME les types 3/4 (pas de
// garde-fou mécanique). Cibles TOUTES vérifiées au texte dans versets_lecture
// (TR0003 Crampon ; psaumes en numérotation grecque/Vulgate). Pièges corrigés :
// béatitude des doux = MAT.5.4 (pas 5.5) ; règle d'or négative = TOB.4.16.
//   node scripts/didache-lecture.mjs [--dry]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const OEUVRE = 'A0012O0002';

// [segId, canon_id, type, fiabilite, motif]
const P = 'probable', D = 'douteux';
const L = [
  // n°1 — les deux chemins (cadre de l'œuvre)
  [447913, 'JER.21.8', 4, P, 'les deux chemins : celui de la vie et celui de la mort'],
  [447913, 'MAT.7.13', 4, P, 'les deux voies : la large qui mène à la perdition'],
  [447913, 'MAT.7.14', 4, D, 'la voie étroite qui mène à la vie'],
  [447913, 'DEU.30.19', 4, D, 'la vie et la mort placées devant l’homme (choisis la vie)'],
  // n°2 — double amour + règle d'or
  [447914, 'LEV.19.18', 1, P, 'tu aimeras ton prochain comme toi-même'],
  [447914, 'DEU.6.5', 2, D, 'tu aimeras Dieu (commandement abrégé, « qui t’a créé »)'],
  [447914, 'TOB.4.16', 4, P, 'règle d’or sous forme négative : ne fais pas à autrui ce que tu ne veux pas subir'],
  [447914, 'MAT.7.12', 4, D, 'règle d’or (forme positive de l’Évangile)'],
  // n°3 — aimer ses ennemis
  [447915, 'LUK.6.28', 1, P, 'bénissez ceux qui vous maudissent'],
  [447915, 'MAT.5.44', 1, P, 'priez pour ceux qui vous persécutent, aimez vos ennemis'],
  [447915, 'MAT.5.46', 1, P, 'aimer ceux qui vous aiment, quel mérite'],
  [447915, 'MAT.5.47', 1, P, 'les païens n’en font-ils pas autant'],
  [447915, 'LUK.6.27', 1, P, 'aimez ceux qui vous haïssent'],
  // n°4
  [447916, '1PE.2.11', 1, P, 'abstiens-toi des convoitises charnelles'],
  // n°5 — non-résistance
  [447917, 'MAT.5.39', 1, P, 'présente l’autre joue'],
  [447917, 'MAT.5.40', 1, P, 'donne aussi ta tunique à qui prend ton manteau'],
  [447917, 'MAT.5.41', 1, P, 'fais deux mille pas avec qui te requiert'],
  [447917, 'LUK.6.30', 1, P, 'à qui ravit ton bien, ne le réclame pas'],
  // n°6
  [447918, 'MAT.5.42', 1, P, 'donne à quiconque te demande'],
  [447918, 'ACT.20.35', 4, D, 'heureux celui qui donne (plus de bonheur à donner qu’à recevoir)'],
  // n°7
  [447919, 'MAT.5.26', 1, P, 'jusqu’à ce qu’il ait rendu le dernier quart d’as (dernière obole)'],
  // n°8 — agraphon
  [447920, 'SIR.12.1', 4, D, 'sache à qui tu donnes (agraphon ; parenté avec Sir 12, 1)'],
  // n°10 — Décalogue
  [447922, 'EXO.20.13', 1, P, 'tu ne tueras point'],
  [447922, 'EXO.20.14', 1, P, 'tu ne seras pas adultère'],
  [447922, 'EXO.20.15', 1, P, 'ni vol'],
  [447922, 'EXO.20.17', 1, P, 'tu ne désireras pas les biens de ton prochain'],
  // n°11
  [447923, 'EXO.20.16', 1, P, 'tu ne diras pas de faux témoignage'],
  // n°16
  [447928, '1TH.5.22', 4, P, 'fuir tout ce qui ressemble au mal (toute apparence de mal)'],
  // n°17-19 — les « clôtures »
  [447929, 'MAT.5.22', 4, D, 'la colère rapprochée du meurtre'],
  [447930, 'MAT.5.28', 4, P, 'le regard de convoitise engendre l’adultère'],
  [447931, 'DEU.18.10', 4, P, 'interdiction de la divination, des augures, des enchantements'],
  [447931, 'DEU.18.11', 4, D, 'interdiction des charmes, évocateurs et sorciers'],
  // n°22 — béatitude des doux
  [447934, 'MAT.5.4', 1, P, 'les doux posséderont la terre (béatitude, Crampon 5, 4)'],
  [447934, 'PSA.36.11', 4, P, 'les doux posséderont la terre (source du psaume)'],
  // n°23
  [447935, 'ISA.66.2', 4, P, 'celui qui tremble à ma parole'],
  // n°24
  [447936, 'ROM.12.16', 4, P, 'ne pas aspirer à ce qui est élevé, se laisser attirer par l’humble'],
  // n°25
  [447937, 'ROM.8.28', 4, D, 'tout concourt au bien de ceux qui aiment Dieu (rien sans Dieu)'],
  // n°26
  [447938, 'HEB.13.7', 4, P, 'se souvenir de celui qui a annoncé la parole de Dieu'],
  // n°28
  [447940, 'LEV.19.15', 1, P, 'tu jugeras avec justice, sans acception de personne'],
  // n°30
  [447942, 'SIR.4.31', 1, P, 'la main ni étendue pour recevoir ni fermée pour donner'],
  // n°31
  [447943, 'SIR.3.30', 4, D, 'l’aumône expie/rachète les péchés (aussi Dn 4, 24 ; Tb 4, 11)'],
  // n°33
  [447945, 'ACT.4.32', 4, P, 'mise en commun des biens, ne rien dire à soi en propre'],
  // n°34
  [447946, 'EPH.6.4', 4, D, 'élever ses enfants selon le Seigneur (dans la crainte de Dieu)'],
  // n°35-37 — maîtres et esclaves
  [447947, 'EPH.6.9', 4, P, 'maîtres, laissez les menaces : même Seigneur pour tous'],
  [447948, 'ROM.2.11', 4, P, 'Dieu ne fait pas acception des personnes'],
  [447949, 'EPH.6.5', 2, D, 'esclaves, soyez soumis à vos maîtres avec respect et crainte'],
  // n°39
  [447951, 'DEU.4.2', 1, P, 'ne rien ajouter ni retrancher aux commandements'],
  // n°40
  [447952, 'JAS.5.16', 4, P, 'confesser ses péchés dans l’assemblée'],
  // n°42 — catalogue de vices (chemin de la mort)
  [447954, 'MAT.15.19', 4, P, 'catalogue de vices : meurtres, adultères, fornications, vols, faux témoignages'],
  // n°43
  [447955, 'PSA.4.3', 4, P, 'aimer la vanité'],
  [447955, 'ISA.1.23', 4, P, 'courir après les récompenses, juges iniques du pauvre'],
  // n°45
  [447957, 'MAT.24.4', 4, D, 'que nul ne te détourne / ne te séduise'],
  // n°46
  [447958, 'MAT.11.29', 4, P, 'porter le joug du Seigneur'],
  // n°47
  [447959, 'ACT.15.29', 4, P, 's’abstenir des viandes offertes aux idoles'],
  // n°48, 50 — formule baptismale
  [447960, 'MAT.28.19', 1, P, 'baptiser au nom du Père, et du Fils, et du Saint-Esprit'],
  [447962, 'MAT.28.19', 1, P, 'au nom du Père, et du Fils, et du Saint-Esprit (reprise)'],
  // n°52
  [447964, 'MAT.6.16', 2, D, 'ne pas jeûner comme les hypocrites'],
  // n°53 — Notre Père
  [447965, 'MAT.6.5', 2, D, 'ne pas prier comme les hypocrites'],
  [447965, 'MAT.6.9', 1, P, 'Notre Père qui es au ciel, que ton nom soit sanctifié'],
  [447965, 'MAT.6.10', 1, P, 'que ton règne vienne, ta volonté faite sur la terre comme au ciel'],
  [447965, 'MAT.6.11', 1, P, 'donne-nous aujourd’hui le pain nécessaire'],
  [447965, 'MAT.6.12', 1, P, 'remets-nous notre dette comme nous remettons'],
  [447965, 'MAT.6.13', 1, P, 'ne nous induis pas en tentation, délivre-nous du mal'],
  // n°54 — doxologie du Notre Père
  [447966, '1CH.29.11', 4, D, 'doxologie : à toi la puissance et la gloire'],
  // n°59 — prière eucharistique
  [447971, 'JHN.11.52', 4, P, 'rassembler l’Église (les enfants de Dieu dispersés) des extrémités de la terre'],
  // n°60
  [447972, 'MAT.7.6', 1, P, 'ne donnez pas ce qui est saint aux chiens'],
  // n°62
  [447974, 'JHN.17.11', 4, P, 'l’appellation « Père saint »'],
  // n°63
  [447975, 'REV.4.11', 4, D, 'Dieu a créé l’univers / toutes choses (aussi Si 18, 1)'],
  // n°65
  [447977, 'MAT.24.31', 4, P, 'rassembler l’Église des quatre vents'],
  // n°66
  [447978, 'MAT.21.9', 4, D, 'Hosanna (variante « au Dieu de David » pour « au fils de David »)'],
  [447978, '1CO.16.22', 1, P, 'Maran atha'],
  // n°69, 71 — reçu « comme le Seigneur »
  [447981, 'MAT.10.40', 4, D, 'recevoir comme le Seigneur celui qui enseigne pour accroître la justice (qui vous reçoit me reçoit)'],
  [447983, 'MAT.10.40', 4, D, 'recevoir l’apôtre comme le Seigneur (qui vous reçoit me reçoit)'],
  // n°74
  [447986, 'MAT.12.31', 1, P, 'tout péché sera remis, sauf le blasphème contre l’Esprit'],
  // n°75
  [447987, 'MAT.7.16', 4, P, 'reconnaître le (faux) prophète à sa conduite / ses fruits'],
  // n°80
  [447992, 'PSA.117.26', 4, P, 'celui qui vient au nom du Seigneur'],
  // n°82
  [447994, '2TH.3.10', 4, P, 'qui ne veut pas travailler ne doit pas manger'],
  // n°85-86 — l'ouvrier
  [447997, 'MAT.10.10', 1, P, 'l’ouvrier mérite sa nourriture'],
  [447998, 'MAT.10.10', 1, P, 'l’ouvrier mérite sa nourriture (reprise, le docteur)'],
  // n°87 — prémices
  [447999, 'DEU.18.4', 4, P, 'les prémices (blé, vin, huile, prémices du troupeau) dues aux prêtres'],
  // n°93
  [448005, 'MAT.5.24', 4, P, 'se réconcilier avec son frère avant d’offrir le sacrifice'],
  // n°94 — sacrifice pur
  [448006, 'MAL.1.11', 1, P, 'en tout lieu on offre un sacrifice pur, mon nom grand parmi les nations'],
  [448006, 'MAL.1.14', 1, P, 'je suis un grand roi, mon nom redoutable parmi les nations'],
  // n°97
  [448009, 'MAT.18.15', 4, P, 'reprendre son frère, mise à l’écart de l’offenseur impénitent'],
  // n°99 — veiller
  [448011, 'LUK.12.35', 1, P, 'la ceinture aux reins et les lampes allumées'],
  [448011, 'MAT.24.42', 1, P, 'veillez, vous ignorez l’heure où le Seigneur viendra'],
  [448011, 'MAT.24.44', 1, P, 'tenez-vous prêts'],
  // n°101 — apocalypse
  [448013, 'MAT.24.11', 4, P, 'multiplication des faux prophètes aux derniers jours'],
  [448013, 'MAT.24.12', 4, P, 'la charité se refroidit / l’amour se change en haine'],
  // n°102
  [448014, '2TH.2.4', 4, P, 'le séducteur se donnant pour Dieu / Fils de Dieu'],
  // n°103
  [448015, 'MAT.24.24', 4, P, 'signes et prodiges du séducteur pour égarer'],
  // n°104
  [448016, 'MAT.24.10', 1, P, 'beaucoup se scandaliseront'],
  [448016, 'MAT.24.13', 1, P, 'qui persévère (jusqu’à la fin) sera sauvé'],
  // n°105 — les signes de la fin
  [448017, 'MAT.24.30', 4, D, 'le signe (du Fils de l’homme) apparaîtra'],
  [448017, '1TH.4.16', 4, D, 'le son de la trompette et la résurrection des morts'],
  // n°106
  [448018, 'ZEC.14.5', 1, P, 'le Seigneur viendra, tous les saints avec lui'],
  // n°107
  [448019, 'MAT.24.30', 1, P, 'le Seigneur venant sur les nuées du ciel'],
  [448019, 'DAN.7.13', 4, P, 'sur les nuées comme un Fils d’homme (source vétérotestamentaire)'],
];

// Garde-fou : toutes les cibles doivent exister dans l'ossature.
const cibles = [...new Set(L.map((l) => l[1]))];
const present = new Set();
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200));
  if (error) throw error;
  for (const r of data) present.add(r.id_verset);
}
const manquants = cibles.filter((c) => !present.has(c));
if (manquants.length) { console.error('❌ CIBLES ABSENTES :', manquants.join(', ')); process.exit(1); }

const rows = L.map(([segment_id, canon_id, type, fiabilite, motif]) => ({
  segment_id, canon_id, type, fiabilite, motif,
  provenance: 'lecture',
  arbitrage_requis: fiabilite === 'douteux',
}));

console.log(`Didachè — ${rows.length} liens de lecture sur ${new Set(rows.map((r) => r.segment_id)).size} segments`);
const parType = {}; for (const r of rows) parType[r.type] = (parType[r.type] || 0) + 1;
console.log('  par type :', JSON.stringify(parType), '| douteux :', rows.filter((r) => r.fiabilite === 'douteux').length);

if (DRY) { console.log('(--dry : rien écrit)'); process.exit(0); }

// Idempotence : purge des liens existants de ces segments avant réinsertion.
const segIds = [...new Set(rows.map((r) => r.segment_id))];
const { error: eDel } = await sb.from('liens_bibliques').delete().in('segment_id', segIds);
if (eDel) throw eDel;
const { error: eIns } = await sb.from('liens_bibliques').insert(rows);
if (eIns) throw eIns;
console.log('✅ inséré.');
process.exit(0);
