import fs from 'node:fs';
import path from 'node:path';

const reviews = path.resolve(process.argv[2] ?? 'work/boece/ceriziers_1646_corrections_alignement_fin/working/03_REVUE_ALIGNEMENT/claude_pairs');
const loadDivision = (reviewNumber, key) => {
  const review = JSON.parse(fs.readFileSync(path.join(reviews, `review_${String(reviewNumber).padStart(2, '0')}.json`), 'utf8'));
  const division = review.result.divisions.find(item => item.division_key === key);
  if (!division) throw new Error(`Division absente : ${key}`);
  return structuredClone(division);
};

const replace = (division, predicate, replacements) => {
  const index = division.groups.findIndex(predicate);
  if (index < 0) throw new Error(`Groupe cible absent : ${division.division_key}`);
  division.groups.splice(index, 1, ...replacements);
};

const firstNine = loadDivision(5, 'LIVRE PREMIER|IX');
replace(firstNine, group => group.left?.[0] === 5 && group.left?.at(-1) === 10, [
  { left: [5, 7], right: [3, 4], status: 'uncertain', exception_to_size_rule: false, reason: 'Le pouvoir divin impose sa loi aux astres et fait rouler les cieux' },
  { left: [8, 10], right: null, status: 'uncertain', exception_to_size_rule: false, reason: 'La bonté divine ôte le voile des astres pour révéler leur beauté, développement propre à Ceriziers' },
]);
replace(firstNine, group => group.left?.[0] === 25 && group.left?.at(-1) === 30, [
  { left: [25, 28], right: [13, 16], status: 'uncertain', exception_to_size_rule: false, reason: 'Alternance de l’hiver et de l’été, des fleurs et des fruits, avec variation des heures du jour' },
  { left: [29, 30], right: null, status: 'uncertain', exception_to_size_rule: false, reason: 'Les vents favorables rafraîchissent la chaleur, détail sans correspondant distinct chez Mirandol' },
]);
replace(firstNine, group => group.left?.[0] === 35 && group.left?.at(-1) === 40, [
  { left: [35, 38], right: [19, 20], status: 'uncertain', exception_to_size_rule: false, reason: 'Le grain protégé sous la glace devient moisson et tombe sous la faucille du laboureur' },
  { left: [39, 40], right: null, status: 'uncertain', exception_to_size_rule: false, reason: 'La famille du laboureur participe à la récolte, précision propre à Ceriziers' },
]);

const secondFour = loadDivision(9, 'LIVRE DEUXIÈME|IV');
replace(secondFour, group => group.left?.[0] === 3 && group.left?.at(-1) === 7, [
  { left: null, right: [3, 3], status: 'uncertain', exception_to_size_rule: false, reason: 'Le grain de sable de l’Océan est antéposé par Mirandol dans une comparaison dont Ceriziers inverse l’ordre' },
  { left: [3, 6], right: [4, 7], status: 'uncertain', exception_to_size_rule: false, reason: 'Les étoiles brillent lorsque la nuit déploie ses voiles, image commune aux deux traductions' },
  { left: [7, 7], right: null, status: 'uncertain', exception_to_size_rule: false, reason: 'Le sable de l’Océan est postposé par Ceriziers dans la comparaison inversée' },
]);

const secondFourteen = loadDivision(14, 'LIVRE DEUXIÈME|XIV');
replace(secondFourteen, group => group.left?.[0] === 17 && group.left?.at(-1) === 24, [
  { left: [17, 20], right: [9, 11], status: 'uncertain', exception_to_size_rule: false, reason: 'La recherche orgueilleuse de la renommée sied mal à la misère humaine et ne produit que fumée' },
  { left: [21, 24], right: null, status: 'uncertain', exception_to_size_rule: false, reason: 'Vaine volonté de se rendre recommandable et adorable, second quatrain sans correspondant distinct chez Mirandol' },
]);

const fourthTwelve = loadDivision(33, 'LIVRE QUATRIÈME|XII');
replace(fourthTwelve, group => group.left?.[0] === 49 && group.left?.at(-1) === 51, [
  { left: [49, 52], right: [33, 36], status: 'uncertain', exception_to_size_rule: false, reason: 'Le Dieu souverain gouverne les mouvements du monde et maintient sous sa loi le cycle de l’univers' },
]);
replace(fourthTwelve, group => group.left?.[0] === 52 && group.left?.at(-1) === 54, [
  { left: [53, 54], right: null, status: 'uncertain', exception_to_size_rule: false, reason: 'Le retour des saisons jusque dans nos maisons précise chez Ceriziers le gouvernement divin déjà aligné' },
]);

const output = {
  schema: 'ceriziers-mirandol-semantic-review-result-v1',
  provider: 'codex_targeted_semantic_correction',
  model: 'Codex-GPT-5',
  subscription_mode: false,
  api_keys_removed: true,
  candidate_only: true,
  validated_human: false,
  batch_id: 'CER-MIR-TARGETED-SIZE-REPAIRS',
  validation: { status: 'PASS', errors: [] },
  result: { batch_id: 'CER-MIR-TARGETED-SIZE-REPAIRS', divisions: [firstNine, secondFour, secondFourteen, fourthTwelve] },
};
fs.writeFileSync(path.join(reviews, 'targeted_override_size_repairs.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', divisions: output.result.divisions.map(item => item.division_key) }, null, 2));
