// Contrôle du registre des styles sémantiques de la page Bible.
//
//   node scripts/fillion/validate_semantic_display_hierarchy.mjs
//
// Le registre est la source unique des deux hiérarchies. Ce contrôle vérifie
// qu'il se tient, que le thème porte les douze jetons, et que les invariants
// éditoriaux ne se sont pas défaits en chemin — un commentaire de péricope qui
// remonterait au sommaire, une note de verset qui deviendrait un encadré.
//
// Il ne juge pas le contenu d'un volume : il juge le registre et le thème.
//
// ⚠️ Depuis le REGROUPEMENT du 29 août 2026, un style d'information ne porte plus
// son rang : il dit une NATURE, et le rang vient de l'alias hérité ou se déclare.
// Le contrôle porte donc sur deux plans — la forme des douze entrées canoniques,
// et la RÉSOLUTION de chaque nom, canonique ou hérité, qui doit rendre un couple
// niveau × nature composable.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const racine = resolve(import.meta.dirname, '..', '..')
const cheminRegistre = resolve(racine, 'work', 'fillion', 'semantic_display_hierarchy.json')
const cheminTheme = resolve(racine, 'app', 'globals.css')

const registre = JSON.parse(readFileSync(cheminRegistre, 'utf8'))
const theme = readFileSync(cheminTheme, 'utf8')

const erreurs = []
const refuser = (message) => erreurs.push(message)

const JETONS_TITRE = registre.levels.titles.map((n) => n.token)
const JETONS_INFO = registre.levels.info.map((n) => n.token)
const NATURES = new Set(registre.natures)
const PLACEMENTS = new Set(['editorial_anchor', 'footnote_only'])
const ROLES = new Set(['title', 'label', 'none'])
const AXES = new Set(['analytic', 'material'])

if (JETONS_TITRE.join(',') !== 'T1,T2,T3,T4,T5,T6') refuser(`Échelle des titres inattendue : ${JETONS_TITRE}`)
if (JETONS_INFO.join(',') !== 'I1,I2,I3,I4,I5,I6') refuser(`Échelle des informations inattendue : ${JETONS_INFO}`)

// Un nom ne peut désigner qu'une chose : ni deux canoniques, ni un canonique
// et un alias, ni deux alias.
const noms = new Map()
const reserver = (nom, pour) => {
  if (noms.has(nom)) refuser(`Le nom « ${nom} » désigne à la fois ${noms.get(nom)} et ${pour}.`)
  noms.set(nom, pour)
}

/** Ce qu'un alias porte, sous une forme unique — la chaîne n'en dit que le rang. */
const propreALAlias = (valeur) => {
  if (valeur === null || valeur === undefined) return {}
  return typeof valeur === 'string' ? { niveau: valeur } : valeur
}

/** La résolution, telle que `bibleHierarchieSemantique.ts` la fait. */
const resoudre = (canonique, valeurAlias) => {
  const e = registre.styles[canonique]
  const porte = propreALAlias(valeurAlias)
  return {
    kind: e.kind,
    level: e.level ?? porte.niveau ?? null,
    nature: e.nature,
    includeInOutline: e.include_in_outline || porte.auSommaire === true,
    placement: e.placement,
    headingRole: e.heading_role,
    headingLevel: e.heading_level ?? porte.titre ?? null,
    headingInOutline: e.heading_in_outline === true || porte.auPlan === true,
    bodyBlock: e.body_block && porte.horsCorps !== true,
    hierarchyAxis: (e.hierarchy_axis ?? porte.axe) === 'material' ? 'material' : 'analytic',
    redondant: e.redundant_with_reader_navigation === true || porte.redondant === true,
  }
}

const jetonsEmployes = new Set()

/** Les invariants qui doivent tenir sur TOUT nom, canonique ou hérité. */
const controlerResolution = (nom, r) => {
  const ou = `« ${nom} »`
  const echelle = r.kind === 'title' ? JETONS_TITRE : JETONS_INFO
  if (r.level === null) {
    // Une nature seule n'a pas de rang : c'est voulu, le rang se déclare. Mais
    // un nom HÉRITÉ qui en perdrait un cesserait de se composer.
    if (registre.styles[nom] === undefined) refuser(`${ou} est un nom hérité sans rang.`)
  } else {
    if (!echelle.includes(r.level)) refuser(`${ou} porte le niveau ${r.level}, hors de son échelle.`)
    jetonsEmployes.add(r.level)
  }
  if (!NATURES.has(r.nature)) refuser(`${ou} porte une nature inconnue : ${r.nature}.`)
  if (!PLACEMENTS.has(r.placement)) refuser(`${ou} porte un emplacement inconnu : ${r.placement}.`)
  if (!ROLES.has(r.headingRole)) refuser(`${ou} porte un rôle d'intitulé inconnu : ${r.headingRole}.`)
  if (!AXES.has(r.hierarchyAxis)) refuser(`${ou} porte un axe de hiérarchie inconnu : ${r.hierarchyAxis}.`)

  // Un intitulé qui est un vrai titre doit dire à quel niveau il se compose.
  if (r.headingRole === 'title' && r.level !== null && !JETONS_TITRE.includes(r.headingLevel ?? '')) {
    refuser(`${ou} annonce un intitulé-titre sans niveau de titre valide.`)
  }
  if (r.headingRole !== 'title' && r.headingInOutline) {
    refuser(`${ou} met au plan un intitulé qui n'est pas un titre.`)
  }
  // Seul un titre structurel entre au plan par lui-même.
  if (r.includeInOutline && r.kind !== 'title') refuser(`${ou} entre au plan sans être un titre.`)
  // Une mention que la surface de lecture redit déjà ne se rend pas ; elle ne
  // peut donc pas être une entrée de plan, qui serait une ancre sans cible.
  if (r.redondant && r.includeInOutline) {
    refuser(`${ou} n'est pas affiché mais entre au plan : l'ancre n'aurait pas de cible.`)
  }
  // Un titre matériel qui commanderait l'axe analytique casserait la suite des
  // subdivisions qu'il traverse.
  if (r.redondant && r.hierarchyAxis !== 'material') {
    refuser(`${ou} est masqué comme témoin matériel sans porter l'axe matériel.`)
  }
}

for (const [canonique, e] of Object.entries(registre.styles)) {
  const ou = `le style « ${canonique} »`
  reserver(canonique, ou)
  if (typeof e.include_in_outline !== 'boolean') refuser(`${ou} n'a pas de décision de plan.`)
  if (typeof e.body_block !== 'boolean') refuser(`${ou} ne dit pas s'il se rend dans le corps.`)
  if (e.aliases === undefined || Array.isArray(e.aliases) || typeof e.aliases !== 'object') {
    refuser(`${ou} porte des alias qui ne sont pas une table nom → rang.`)
    continue
  }
  // ⛔ Un TITRE porte son rang dans son nom ; une NATURE ne peut pas en porter,
  // sans quoi le regroupement n'aurait servi à rien.
  if (e.kind !== 'info' && e.level === undefined) refuser(`${ou} n'est pas une nature et ne porte pas de rang.`)
  if (e.kind === 'info' && e.level !== undefined) refuser(`${ou} est une nature et porte pourtant un rang : ${e.level}.`)

  controlerResolution(canonique, resoudre(canonique, null))
  for (const [alias, valeur] of Object.entries(e.aliases)) {
    reserver(alias, `un alias de ${ou}`)
    controlerResolution(alias, resoudre(canonique, valeur))
  }
}

// Les douze jetons doivent exister dans le thème, même si aucun volume ne les
// emploie encore : c'est ce qui permet d'accueillir un tome plus structuré sans
// retoucher le rendu.
for (const jeton of JETONS_TITRE) {
  if (!theme.includes(`.cs-bible-title--${jeton.toLowerCase()}`)) {
    refuser(`Le thème ne définit pas .cs-bible-title--${jeton.toLowerCase()}.`)
  }
}
for (const jeton of JETONS_INFO) {
  if (!theme.includes(`.cs-bible-info--${jeton.toLowerCase()}`)) {
    refuser(`Le thème ne définit pas .cs-bible-info--${jeton.toLowerCase()}.`)
  }
}
for (const nature of NATURES) {
  if (!theme.includes(`.cs-bible-block--${nature}`)) {
    refuser(`Le thème ne définit pas .cs-bible-block--${nature}.`)
  }
}

// ⛔ Et le thème ne doit plus porter une nature que le registre a REGROUPÉE : une
// règle qui ne peut plus s'appliquer se lit comme un style disponible.
for (const morte of ['summary', 'excursus', 'conclusion']) {
  if (theme.includes(`.cs-bible-block--${morte}`)) {
    refuser(`Le thème garde .cs-bible-block--${morte}, que le regroupement du 29 août 2026 a fondu.`)
  }
}

// Invariants éditoriaux, nommément demandés. ⚠️ Ils portent sur la RÉSOLUTION,
// et non sur l'entrée brute : depuis le regroupement, plusieurs de ces noms sont
// des alias, et c'est justement leur résolution qui doit rester intacte.
const parNom = new Map()
for (const [canonique, e] of Object.entries(registre.styles)) {
  parNom.set(canonique, resoudre(canonique, null))
  for (const [alias, valeur] of Object.entries(e.aliases ?? {})) parNom.set(alias, resoudre(canonique, valeur))
}
const attendu = (nom, champ, valeur) => {
  const r = parNom.get(nom)
  if (!r) return refuser(`Le registre a perdu « ${nom} ».`)
  if (JSON.stringify(r[champ]) !== JSON.stringify(valeur)) {
    refuser(`« ${nom} » doit se résoudre en ${champ} = ${JSON.stringify(valeur)}, et rend ${JSON.stringify(r[champ])}.`)
  }
}
attendu('note_verset', 'level', 'I6')
attendu('note_verset', 'placement', 'footnote_only')
attendu('note_verset', 'bodyBlock', false)
attendu('commentaire_pericope', 'level', 'I5')
attendu('commentaire_pericope', 'nature', 'commentary')
attendu('commentaire_pericope', 'headingInOutline', false)
attendu('introduction_pericope', 'level', 'I5')
attendu('introduction_pericope', 'headingRole', 'title')
attendu('introduction_pericope', 'headingLevel', 'T6')
attendu('introduction_pericope', 'headingInOutline', true)
attendu('introduction_livre', 'level', 'I1')
attendu('introduction_livre', 'headingLevel', 'T2')
attendu('introduction_livre', 'headingInOutline', false)
attendu('titre_livre', 'bodyBlock', false)
attendu('titre_chapitre_livre', 'redondant', true)
if (!Object.keys(registre.styles.titre_section_livre?.aliases ?? {}).includes('titre_section')) {
  refuser('L\'alias ancien « titre_section » ne se résout plus vers « titre_section_livre ».')
}

// Deux niveaux voisins doivent se distinguer autrement que par la couleur.
// On contrôle que chaque classe de niveau règle au moins une propriété qui
// n'est pas une teinte.
// `text-align` compte : centrer un rang le distingue autant qu'un corps de
// caractère, et sans dépendre de la teinte.
const NON_COULEUR = /(font-size|font-weight|font-style|letter-spacing|margin|padding|border|text-transform|text-align|font-variant)/
for (const jeton of [...JETONS_TITRE, ...JETONS_INFO]) {
  const prefixe = jeton.startsWith('T') ? 'cs-bible-title--' : 'cs-bible-info--'
  const classe = `.${prefixe}${jeton.toLowerCase()}`
  // ⚠️ Une classe peut être réglée en PLUSIEURS endroits — une règle groupée
  // qui centre, puis une règle propre qui donne le corps. Ne lire que la
  // première occurrence faisait crier le contrôle à tort.
  let porteUneForme = false
  let depuis = 0
  for (;;) {
    const debut = theme.indexOf(classe, depuis)
    if (debut === -1) break
    const ouvrante = theme.indexOf('{', debut)
    const fermante = theme.indexOf('}', ouvrante)
    if (ouvrante === -1 || fermante === -1) break
    if (NON_COULEUR.test(theme.slice(ouvrante, fermante))) porteUneForme = true
    depuis = fermante
  }
  if (theme.includes(classe) && !porteUneForme) {
    refuser(`${classe} ne se distingue que par la couleur ; ajouter une propriété de forme.`)
  }
}
if (erreurs.length > 0) {
  console.error(`Registre refusé — ${erreurs.length} anomalie(s) :`)
  for (const erreur of erreurs) console.error(`  · ${erreur}`)
  process.exit(1)
}

console.log(`Registre accepté : ${Object.keys(registre.styles).length} styles canoniques, `
  + `${noms.size - Object.keys(registre.styles).length} noms hérités, `
  + `${jetonsEmployes.size} jetons employés sur 12, thème complet.`)
