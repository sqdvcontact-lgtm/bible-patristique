/**
 * LE REGROUPEMENT DU VOCABULAIRE DES STYLES SÉMANTIQUES (2026-08-29).
 *
 * Demande de l'auteur : « regroupe les styles similaires ou très proches qui ne
 * justifient pas de distinction. L'important c'est d'avoir des niveaux de titres et
 * de sous-titres, et un niveau propre à l'introduction, introduction avec sous-titre,
 * introduction sans sous-titre. »
 *
 * ── CE QUE LE RELEVÉ A MONTRÉ ───────────────────────────────────────────────────
 *
 * Le registre portait 48 styles, dont QUARANTE sont un produit croisé NATURE × PORTÉE
 * — sept natures par six niveaux. Or le rendu ne compose que sur le couple
 * `niveau × nature` (`cs-bible-info--i5` + `cs-bible-block--commentary`) : le code du
 * style n'est qu'une clé de recherche, et son suffixe répète ce que la portée dit déjà.
 * C'est la dérive que la charte § 7.1 nomme — « ce qui se répète dérive » —, et elle
 * s'était produite : le Pentateuque et le Nouveau Testament emploient des vocabulaires
 * DISJOINTS pour des fonctions voisines.
 *
 * Quatre natures ne se distinguaient d'ailleurs par rien de visible :
 *   · `excursus` compose EXACTEMENT comme `notice` — même corps, même <aside> ;
 *   · `sommaire` s'en écarte d'un centième d'em, invisible ;
 *   · `conclusion` d'une italique, alors qu'une conclusion est un commentaire PLACÉ à
 *     la fin, et que la position est un axe à part (`placement`) ;
 *   · `transition_*` portait déjà `nature: notice`.
 * Aucune des quatre ne porte un seul bloc : le regroupement ne déplace rien à l'écran.
 *
 * ── LE REGROUPEMENT ─────────────────────────────────────────────────────────────
 *
 * Les TITRES ne bougent pas. Il n'y a chez eux aucun produit croisé : un code par
 * niveau, T1 à T6, plus le second T5 qui vit sur l'axe matériel. Le niveau EST leur
 * identité, et c'est ce que l'auteur demande de garder.
 *
 * Les quarante styles d'INFORMATION deviennent QUATRE :
 *   · `introduction_titree` — l'introduction qui porte son PROPRE titre ;
 *   · `introduction`        — l'introduction qui n'en porte pas ;
 *   · `commentaire`         — l'explication suivie ;
 *   · `notice`              — l'appoint documentaire, rendu à côté du fil.
 *
 * ⛔ Les anciens codes ne disparaissent PAS : ils deviennent des ALIAS, chacun portant
 * le niveau qu'il disait. `commentaire_pericope` se résout donc en `commentaire` + I5,
 * et le rendu ne change pas d'un pixel. La donnée n'a rien à migrer pour continuer de
 * paraître ; elle migrera quand on voudra, en écrivant le nom canonique et le niveau.
 *
 * Usage : node scripts/fillion/regrouper-styles-2026-08-29.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'

const CHEMIN = 'work/fillion/semantic_display_hierarchy.json'
const essaiSeul = process.argv.includes('--dry')

const registre = JSON.parse(readFileSync(CHEMIN, 'utf8'))
if (registre.version !== '1.0.0') {
  console.log(`Registre en version ${registre.version} : déjà regroupé, rien à faire.`)
  process.exit(0)
}

const ANCIENS = registre.styles

/** Les quatre natures d'information et ce qu'elles absorbent. */
const FAMILLES = {
  introduction_titree: {
    nature: 'introduction',
    heading_role: 'title',
    note: "L'introduction qui porte son PROPRE titre, et non un simple repère. Elle ouvre ce qu'elle annonce comme un titre le ferait, à son rang. ⚠️ Le rang du titre porté se DÉCLARE : il ne se déduit pas du niveau, I1 portant un T2 et I5 un T6.",
    absorbe: ['introduction_livre', 'introduction_pericope'],
  },
  introduction: {
    nature: 'introduction',
    heading_role: 'label',
    note: "Ce qui ouvre et prépare, sans porter de titre propre : son intitulé n'est qu'un repère. Aux rangs I1 et I2 elle se compose en PRÉAMBULE — centrée, en italique, rentrée de 12 % — parce qu'elle s'écarte du fil ; aux rangs bas elle appartient au fil et se compose comme lui. ⛔ Absorbe les sommaires : un sommaire annonce ce qui suit, comme elle, et s'en écartait d'un centième d'em.",
    absorbe: ['introduction_bible', 'introduction_testament', 'introduction_groupe_livres',
      'introduction_partie', 'introduction_section', 'introduction_sous_section',
      'introduction_chapitre', 'sommaire_livre', 'sommaire_partie', 'sommaire_section',
      'sommaire_chapitre', 'sommaire_pericope'],
  },
  commentaire: {
    nature: 'commentary',
    heading_role: 'label',
    note: "L'explication suivie, le style le plus employé du corpus. Aux rangs I4 à I6 son repère devient une MANCHETTE flottante que le commentaire habille, à la disposition du fac-similé. ⛔ Absorbe les conclusions : une conclusion est un commentaire PLACÉ à la fin, et la position est un axe à part, non une nature.",
    absorbe: ['commentaire_livre', 'commentaire_partie', 'commentaire_section',
      'commentaire_chapitre', 'commentaire_pericope', 'commentaire_verset',
      'conclusion_livre', 'conclusion_partie', 'conclusion_section',
      'conclusion_chapitre', 'conclusion_pericope'],
  },
  notice: {
    nature: 'notice',
    heading_role: 'label',
    note: "L'appoint documentaire, rendu dans un aparté : à côté du fil, jamais dedans. Sa matière se qualifie par `notice_subtype` — historique, géographique, apparat critique, bibliographie —, qui reste hors des trois axes. ⛔ Absorbe les excursus, qui composaient EXACTEMENT comme elle, et les transitions, qui portaient déjà cette nature.",
    absorbe: ['notice_bible', 'notice_testament', 'notice_groupe_livres', 'notice_livre',
      'notice_partie', 'notice_section', 'notice_chapitre', 'notice_pericope',
      'excursus_livre', 'excursus_partie', 'excursus_section', 'excursus_chapitre',
      'excursus_pericope', 'transition_livre', 'transition_pericope'],
  },
}

// ── Contrôle : tout code d'information doit être absorbé UNE fois ────────────────
const absorbes = Object.values(FAMILLES).flatMap((f) => f.absorbe)
if (new Set(absorbes).size !== absorbes.length) throw new Error('un code est absorbé deux fois')
const infos = Object.keys(ANCIENS).filter((c) => ANCIENS[c].kind === 'info')
const oublies = infos.filter((c) => !absorbes.includes(c))
const fantomes = absorbes.filter((c) => !ANCIENS[c])
if (oublies.length) throw new Error(`codes d'information non absorbés : ${oublies.join(', ')}`)
if (fantomes.length) throw new Error(`codes absorbés qui n'existent pas : ${fantomes.join(', ')}`)

function aliasesDe(liste) {
  const m = {}
  for (const a of liste ?? []) m[a] = null
  return m
}

// ── Le registre neuf ────────────────────────────────────────────────────────────
const styles = {}

// Les titres, tels quels : le niveau EST leur identité, il n'y a rien à regrouper.
for (const [code, e] of Object.entries(ANCIENS)) {
  if (e.kind === 'title') styles[code] = { ...e, aliases: aliasesDe(e.aliases) }
}

// Les quatre familles d'information.
for (const [canonique, famille] of Object.entries(FAMILLES)) {
  const aliases = {}
  for (const ancien of famille.absorbe) {
    const e = ANCIENS[ancien]
    // ⚠️ Ce que l'alias doit porter EN PLUS de son rang : tout ce qui variait d'un
    // ancien code à l'autre. `introduction_livre` et `introduction_pericope` sont
    // tous deux titrés, et pourtant l'un porte un T2 hors du plan, l'autre un T6
    // qui y entre. Une famille ne peut pas trancher pour ses deux membres.
    const propre = {}
    if (e.heading_level) propre.titre = e.heading_level
    if (e.heading_in_outline === true) propre.auPlan = true
    if (e.include_in_outline === true) propre.auSommaire = true
    if (e.hierarchy_axis === 'material') propre.axe = 'material'
    if (e.redundant_with_reader_navigation === true) propre.redondant = true
    if (e.body_block === false) propre.horsCorps = true
    aliases[ancien] = Object.keys(propre).length ? { niveau: e.level, ...propre } : e.level
    // Les alias de GRAPHIE de l'ancien code héritent de son niveau.
    for (const graphie of e.aliases ?? []) aliases[graphie] = aliases[ancien]
  }
  styles[canonique] = {
    kind: 'info',
    nature: famille.nature,
    include_in_outline: false,
    placement: 'editorial_anchor',
    heading_role: famille.heading_role,
    body_block: true,
    hierarchy_axis: 'analytic',
    note: famille.note,
    aliases,
  }
}

// La note de verset : ni titre ni bloc de corps, elle reste seule de son espèce.
styles.note_verset = { ...ANCIENS.note_verset, aliases: aliasesDe(ANCIENS.note_verset.aliases) }

registre.version = '2.0.0'
registre.updated = '2026-08-29'
registre.natures = ['title', 'introduction', 'commentary', 'notice', 'note']
registre.note = "Registre des styles sémantiques de la page Bible. ⛔ Un style dit une NATURE ; le RANG se dit à part — T1-T6 pour la profondeur d'un titre attesté, I1-I6 pour l'étendue qu'un bloc d'information explique. Les deux échelles ne sont pas interchangeables, et aucun rang ne se déduit de la casse, du corps ni de la ponctuation de la source. ⚠️ Le vocabulaire a été REGROUPÉ le 29 août 2026 : quarante styles d'information étaient un produit croisé nature × portée, alors que le rendu ne compose que sur le couple niveau × nature. Ils sont quatre. Les anciens codes vivent comme ALIAS, chacun portant le niveau qu'il disait, et se résolvent à l'identique. Règle normative : charte/CHARTE_IA.md, §§ 6.2, 7.1 et 33.3."
registre.styles = styles

console.log(JSON.stringify({
  avant: Object.keys(ANCIENS).length,
  apres: Object.keys(styles).length,
  alias_portes: Object.values(styles).reduce((n, e) => n + Object.keys(e.aliases).length, 0),
  essai_seul: essaiSeul,
}, null, 2))

if (essaiSeul) {
  console.log("Essai seul : rien n'a été écrit.")
} else {
  writeFileSync(CHEMIN, JSON.stringify(registre, null, 2) + '\n')
  console.log('Registre regroupé. Contrôler : node scripts/fillion/validate_semantic_display_hierarchy.mjs')
}
