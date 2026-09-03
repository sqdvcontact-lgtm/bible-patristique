/**
 * LES NOMS PROPRES DES STYLES — ce que l'administration montre à la place des codes.
 *
 * Demande de l'auteur (2026-09-03) : « un petit module admin pour les styles, pour
 * les identifier ou les changer ; il faut donc un nom de style propre, pas le nom
 * technique, pour chaque style ». Le CODE reste la clé — c'est lui que la base garde
 * et que ses contraintes connaissent — ; le NOM PROPRE est ce qu'on lit et ce qu'on
 * choisit dans un menu.
 *
 * ⛔ UN NOM POUR CHAQUE STYLE, ET RIEN DE PLUS. Le vocabulaire est CLOS (charte § 7) :
 * les natures viennent de `NATURE_VALIDES`, les styles bibliques du registre
 * `semantic_display_hierarchy.json`, les rangs de ses échelles. `stylesLibelles.test.ts`
 * refuse un nom orphelin comme un style sans nom. Le menu « Nature » du contrôle des
 * œuvres lit la même table : deux listes de noms divergeraient au premier ajout.
 *
 * ⚠️ Les notices sont COURTES, écrites pour un menu : la doctrine entière est dans la
 * charte (§ 7.5) et, pour le paratexte biblique, dans la note du registre.
 */
import registre from '@/work/fillion/semantic_display_hierarchy.json'
import { NATURE_VALIDES, type NatureSegmentValide } from './naturesSegments'
import { FORME_VERS } from './compositionVers'
import type { JetonInfo, JetonTitre } from './bibleHierarchieSemantique'

export type LibelleStyle = { libelle: string; notice: string }

// ── Les natures de segment (corps et apparat d'une œuvre) ─────────────────────
export const LIBELLE_NATURE: Record<NatureSegmentValide, string> = {
  texte: 'Texte',
  citation: 'Citation',
  verset: 'Verset',
  lemme: 'Lemme',
  rubrique: 'Rubrique',
  dialogue: 'Dialogue',
  introduction: 'Introduction (argument)',
  signature: 'Signature',
  apparat_critique: 'Apparat critique',
  apparat_auteur: 'Apparat d’auteur',
  apparat_editeur: 'Apparat d’éditeur',
  'texte absent': 'Texte absent',
  separateur: 'Séparateur (hérité)',
}

export const NOTICE_NATURE: Record<NatureSegmentValide, string> = {
  texte: 'La prose de l’auteur, le corps de l’œuvre.',
  citation: 'Un passage cité. Long, isolé et terminal, il sort du fil (citation sortie).',
  verset: 'Un verset d’une citation biblique que l’édition pose verset par verset ; la suite forme le bloc.',
  lemme: 'Le verset ou le mot que le commentaire explique, en tête de son paragraphe ; se lit au fil du texte.',
  rubrique: 'Un intertitre bref, centré, en italique.',
  dialogue: 'Une réplique. Jamais sortie comme une citation d’auteur.',
  introduction: 'L’argument ou l’introduction qui ouvre une division.',
  signature: 'Approbations, censeurs, souscripteurs : au fer à droite, interligne resserré.',
  apparat_critique: 'L’apparat de l’éditeur savant, variantes et sigles, rendu tel quel.',
  apparat_auteur: 'Prologue, avertissement, dédicace de l’auteur : au corps, à sa place.',
  apparat_editeur: 'Sommaire, table, colophon, privilège de l’éditeur : dans la vue d’apparat.',
  'texte absent': 'Une lacune déclarée, qui tient la place du texte.',
  separateur: 'Hérité des anciens exports. Ne plus en créer.',
}

/** La FORME est un second axe, posée dans `segment_metadata.forme` : elle se cumule
 *  avec la nature (un vers d’introduction reste une introduction). */
export const LIBELLE_FORME_VERS: LibelleStyle = {
  libelle: 'En vers',
  notice: `Une ligne de poésie : ni justification ni césure, alinéa de base, strophe et retrait de suite (\`forme = ${FORME_VERS}\`).`,
}

// ── Les styles du paratexte biblique (registre clos) ──────────────────────────
type EntreeRegistre = { kind: 'title' | 'info' | 'note'; level?: string; nature: string; note?: string }
const ENTREES = registre.styles as unknown as Record<string, EntreeRegistre>

export const STYLES_BIBLE: Record<string, LibelleStyle> = {
  titre_livre: { libelle: 'Titre du livre', notice: 'Le titre du livre vient des métadonnées de la page ; un bloc qui le répète ne se rend pas.' },
  titre_partie_livre: { libelle: 'Titre de partie', notice: 'Une partie du livre (« Première partie »). Rang T2, centré.' },
  titre_section_livre: { libelle: 'Titre de section', notice: 'Une section (« Section II »). Rang T3, centré.' },
  titre_sous_section: { libelle: 'Titre de sous-section', notice: 'Une sous-section. Rang T4, centré ; ce qui suit lui appartient.' },
  titre_chapitre_livre: { libelle: 'Mention de chapitre', notice: 'La mention imprimée « Chapitre I ». Témoin matériel, jamais rendue : la navigation nomme déjà le chapitre.' },
  titre_paragraphe_livre: { libelle: 'Titre de paragraphe (§)', notice: 'La division « § I » de Fillion, entre la sous-section et la péricope. Rang T5, centré.' },
  titre_pericope: { libelle: 'Titre de péricope', notice: 'Le titre d’une péricope. Rang T6, au fer, en italique.' },
  introduction_titree: { libelle: 'Introduction titrée', notice: 'L’introduction qui porte son propre titre, et non un simple repère. Son rang se déclare.' },
  introduction: { libelle: 'Introduction', notice: 'Ce qui ouvre et prépare une portée, sans titre propre : en préambule aux rangs I1 et I2, dans le fil au-dessous.' },
  commentaire: { libelle: 'Commentaire', notice: 'L’explication suivie, le style le plus employé. Aux rangs I4 à I6, son repère devient une manchette.' },
  notice: { libelle: 'Notice', notice: 'L’appoint documentaire, rendu en aparté à côté du fil.' },
  note_verset: { libelle: 'Note de verset', notice: 'L’appel dans le verset, le contenu au bas de l’unité de lecture. Jamais un bloc du corps.' },
}

/** Les styles qu'un bloc du CORPS peut recevoir : tout le registre, sauf la note,
 *  qui vit dans sa propre table. */
export const STYLES_BIBLE_ATTRIBUABLES: string[] = Object.keys(STYLES_BIBLE).filter((code) => ENTREES[code]?.kind !== 'note')

export function styleBibleEstTitre(code: string): boolean { return ENTREES[code]?.kind === 'title' }
export function styleBibleEstInfo(code: string): boolean { return ENTREES[code]?.kind === 'info' }
/** Le rang FIXE d'un titre (T1 à T6), ou `null` pour une nature d'information, dont le rang se déclare. */
export function rangFixeDuStyleBible(code: string): string | null { return ENTREES[code]?.level ?? null }
/** La note du registre, entière, pour qui veut la doctrine derrière le nom. */
export function noteDuRegistre(code: string): string { return ENTREES[code]?.note ?? '' }

// ── Les rangs (les deux échelles du registre) ─────────────────────────────────
type Jeton = JetonTitre | JetonInfo
export const LIBELLE_RANG: Record<Jeton, string> = Object.fromEntries([
  ...registre.levels.titles.map((n) => [n.token, n.role]),
  ...registre.levels.info.map((n) => [n.token, n.scope]),
]) as Record<Jeton, string>

/** « Commentaire · péricope (I5) », « Titre de péricope (T6) ». */
export function libelleStyleBible(code: string, rang?: string | null): string {
  const nom = STYLES_BIBLE[code]?.libelle ?? code
  const fixe = rangFixeDuStyleBible(code)
  if (fixe) return `${nom} (${fixe})`
  if (rang && rang in LIBELLE_RANG) return `${nom} · ${LIBELLE_RANG[rang as Jeton]} (${rang})`
  return nom
}

// ── Les versets ────────────────────────────────────────────────────────────────
/** Ce qu'un verset PEUT être, pour qu'on l'identifie ; rien ne s'y attribue encore :
 *  la prose est la seule forme que la donnée porte, la suscription vient du canon, et
 *  le vers attend que les stiques soient dans la donnée (charte § 7.4). */
export const STYLES_VERSET: { code: string; libelle: string; notice: string }[] = [
  { code: 'prose', libelle: 'Verset', notice: 'Le verset de la page Bible : sérif, justifié, numéro dans la gouttière.' },
  { code: 'vers', libelle: 'Verset en vers', notice: 'Le style est posé et éprouvé sur la planche ; il attend que les stiques du Psautier soient dans la donnée.' },
  { code: 'suscription', libelle: 'Suscription', notice: 'Le titre d’un psaume, porté par le canon (`est_suscription`).' },
]

/** Toutes les natures, avec leur nom, pour un menu. */
export const NATURES_POUR_MENU: { code: NatureSegmentValide; libelle: string }[] =
  NATURE_VALIDES.map((code) => ({ code, libelle: LIBELLE_NATURE[code] }))
