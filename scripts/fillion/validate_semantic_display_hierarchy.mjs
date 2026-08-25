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

const jetonsEmployes = new Set()
for (const [canonique, e] of Object.entries(registre.styles)) {
  const ou = `le style « ${canonique} »`
  reserver(canonique, ou)
  for (const alias of e.aliases ?? []) reserver(alias, `un alias de ${ou}`)

  const echelle = e.kind === 'title' ? JETONS_TITRE : JETONS_INFO
  if (!echelle.includes(e.level)) refuser(`${ou} porte le niveau ${e.level}, hors de son échelle.`)
  jetonsEmployes.add(e.level)
  if (!NATURES.has(e.nature)) refuser(`${ou} porte une nature inconnue : ${e.nature}.`)
  if (!PLACEMENTS.has(e.placement)) refuser(`${ou} porte un emplacement inconnu : ${e.placement}.`)
  if (!ROLES.has(e.heading_role)) refuser(`${ou} porte un rôle d'intitulé inconnu : ${e.heading_role}.`)
  if (typeof e.include_in_outline !== 'boolean') refuser(`${ou} n'a pas de décision de plan.`)
  if (typeof e.body_block !== 'boolean') refuser(`${ou} ne dit pas s'il se rend dans le corps.`)

  // Un intitulé qui est un vrai titre doit dire à quel niveau il se compose.
  if (e.heading_role === 'title' && !JETONS_TITRE.includes(e.heading_level ?? '')) {
    refuser(`${ou} annonce un intitulé-titre sans niveau de titre valide.`)
  }
  if (e.heading_role !== 'title' && e.heading_in_outline === true) {
    refuser(`${ou} met au plan un intitulé qui n'est pas un titre.`)
  }
  // Seul un titre structurel entre au plan par lui-même.
  if (e.include_in_outline && e.kind !== 'title') {
    refuser(`${ou} entre au plan sans être un titre.`)
  }

  // L'axe est CLOS : un troisième nom passerait pour analytique en silence.
  if (e.hierarchy_axis !== undefined && !AXES.has(e.hierarchy_axis)) {
    refuser(`${ou} porte un axe de hiérarchie inconnu : ${e.hierarchy_axis}.`)
  }
  if (e.redundant_with_reader_navigation !== undefined && typeof e.redundant_with_reader_navigation !== 'boolean') {
    refuser(`${ou} porte une redondance de navigation qui n'est pas un booléen.`)
  }
  // Une mention que la surface de lecture redit déjà ne se rend pas ; elle ne
  // peut donc pas être une entrée de plan, qui serait une ancre sans cible.
  if (e.redundant_with_reader_navigation === true && e.include_in_outline) {
    refuser(`${ou} n'est pas affiché mais entre au plan : l'ancre n'aurait pas de cible.`)
  }
  // Un titre matériel qui commanderait l'axe analytique casserait la suite des
  // subdivisions qu'il traverse.
  if (e.redundant_with_reader_navigation === true && e.hierarchy_axis !== 'material') {
    refuser(`${ou} est masqué comme témoin matériel sans porter l'axe matériel.`)
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

// Invariants éditoriaux, nommément demandés.
const attendu = (style, champ, valeur) => {
  const e = registre.styles[style]
  if (!e) return refuser(`Le registre a perdu « ${style} ».`)
  if (JSON.stringify(e[champ]) !== JSON.stringify(valeur)) {
    refuser(`« ${style} » doit avoir ${champ} = ${JSON.stringify(valeur)}, et porte ${JSON.stringify(e[champ])}.`)
  }
}
attendu('note_verset', 'level', 'I6')
attendu('note_verset', 'placement', 'footnote_only')
attendu('note_verset', 'body_block', false)
attendu('commentaire_pericope', 'heading_in_outline', false)
attendu('introduction_pericope', 'heading_role', 'title')
attendu('introduction_pericope', 'heading_level', 'T6')
attendu('introduction_pericope', 'heading_in_outline', true)
attendu('titre_livre', 'body_block', false)
if (!(registre.styles.titre_section_livre?.aliases ?? []).includes('titre_section')) {
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

console.log(`Registre accepté : ${Object.keys(registre.styles).length} styles, `
  + `${jetonsEmployes.size} jetons employés sur 12, thème complet.`)
