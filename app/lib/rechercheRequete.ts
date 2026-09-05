// Ce que la recherche DEMANDE, et comment elle relit ce qu'on lui rend — logique PURE.
//
// Ce module ne connaît ni Supabase ni React : il est importable depuis un test. La
// page des résultats (`app/recherche/RechercheClient.tsx`) et la barre de recherche
// rapide lui passent ce que le lecteur a tapé ; il en fait les termes, le mode, la
// référence biblique éventuelle, et les vérifications que le rendu applique aux
// lignes reçues (le mot est-il bien là, où le marquer).
//
// ⚠️ La NORMALISATION qui compte est celle de la BASE (`norm_fr` : minuscules, accents
// ôtés, graphies anciennes ramenées au français d'aujourd'hui — « étoit » → « était »),
// portée par `segments.texte_norm` et `versets_recherche.texte_norm`, et lue par les
// RPC `recherche_*_v2`. Ce module ne la reproduit pas : il ne fait que replier la
// SAISIE et les TEXTES REÇUS de la même façon (accents, casse, apostrophes), ce qui
// suffit à retrouver un mot dans une ligne que la base a déjà jugée pertinente.
//
// Quatre services :
//   1. les termes et le mode (`termesRecherche`, `modeDepuisParametre`) ;
//   2. la référence biblique tapée (« Jn 3, 16 »), comprise par le module des
//      péricopes, qui sait déjà lire une référence — jamais une seconde grammaire ;
//   3. la relecture d'un texte reçu (`contientTous`, `compterOccurrences`,
//      `regexTermes`) — frontière de mot, accents ignorés ;
//   4. les graphies anciennes d'un mot latin (u/v, i/j), pour relire un texte ORIGINAL.

import { analyserRequetePericope } from './pericopesRecherche'
import { LIVRES } from './bible'

// ── 1. Les termes et le mode ─────────────────────────────────────────────────

/** Les trois modes de la page des résultats.
 *  — `prefixe` : chaque terme est un début de mot (« glo » → gloire, glorieux) ;
 *  — `exact`   : chaque terme est un mot entier ;
 *  — `famille` : chaque terme est pris avec ses flexions et ses dérivés, par la
 *    racine que la recherche plein texte française connaît (« aimer » → aime,
 *    aimait, aimé). ⚠️ Le marquage se fait alors sur les RACINES que la base rend
 *    (`lexemesRecherche`), non sur les termes tapés. */
export type ModeRecherche = 'prefixe' | 'exact' | 'famille'
export const MODES_RECHERCHE: readonly ModeRecherche[] = ['prefixe', 'exact', 'famille']

export function modeDepuisParametre(v: string | null | undefined): ModeRecherche {
  return v === 'exact' || v === 'famille' ? v : 'prefixe'
}

/** Les mots tapés, blancs de bord et blancs répétés ôtés. */
export function termesRecherche(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean)
}

/**
 * Minuscules, sans accents, apostrophes unifiées, ET les graphies anciennes ramenées au
 * français d'aujourd'hui : ce qu'on compare des deux côtés.
 *
 * ⛔ CES RÈGLES SONT CELLES DE `norm_fr`, la normalisation de la BASE, et il faut les
 * lui prendre toutes — sinon la page rejette ce que la base a rendu. Relevé sur le site
 * le 2026-09-06 : la base trouvait « était » dans « étoit » (Sacy, 2 267 versets), la
 * page relisait chaque verset sans connaître « étoit », et jetait ceux où seule Sacy
 * portait le mot ; et sur un verset gardé, « étoit » ne se marquait pas.
 *
 * ⚠️ Seules les règles qui GARDENT LA LONGUEUR sont reprises : le marquage retrouve les
 * positions dans le texte d'origine par leur index dans le texte replié, et une
 * substitution qui allonge ou raccourcit décalerait tout ce qui suit. `norm_fr` en a
 * trois de plus — « tems » → « temps », « enfans » → « enfants », « sçav » → « sav » —,
 * qui changent la longueur ; la base les applique, la page non : trois mots dont la
 * relecture peut manquer, ⛔ jamais une position fausse.
 */
export function normaliser(s: string): string {
  return (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’ʼ']/g, "'")
    // connoître, paroissoit, accroître… : « oi » devant t, tr, ss dans ces radicaux.
    .replace(/(conn|reconn|par|appar|compar|acc|croi|dec|empl|nett)oi(t|tr|ss)/g, '$1ai$2')
    // étoit, avoit, disoit → était, avait, disait ; étoient → étaient.
    .replace(/([a-z]{2,})oit(s?)\b/g, '$1ait$2')
    .replace(/([a-z]{2,})oient\b/g, '$1aient')
    .replace(/\bfoibl/g, 'faibl')
}

// ── 2. La référence biblique tapée ───────────────────────────────────────────

export type ReferenceBiblique = {
  livre: string
  nom: string
  chapitre: number
  verset: number | null
  /** L'adresse de la page Bible, ancrée sur le verset quand il y en a un. */
  href: string
  /** « Jean 3, 16 », « Genèse 22 ». */
  libelle: string
}

const NOM_LIVRE: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

/**
 * La référence chiffrée que la saisie désigne, ou rien. « Jean 3, 16 », « Jn 3,16 »,
 * « Genèse 22 » en sont ; « Jonas » (un livre sans chapitre) et « fils de Dieu » n'en
 * sont pas. ⛔ La grammaire est celle du module des péricopes (`analyserRequetePericope`),
 * et d'elle seule : la barre, le catalogue des péricopes et la page des résultats
 * lisent une référence de la même façon.
 */
export function referenceBiblique(q: string): ReferenceBiblique | null {
  const r = analyserRequetePericope(q)
  if (!r.livre || r.chapitre == null) return null
  const nom = NOM_LIVRE[r.livre] ?? r.livre
  const base = `/?livre=${encodeURIComponent(r.livre)}&chapitre=${r.chapitre}`
  return {
    livre: r.livre, nom, chapitre: r.chapitre, verset: r.verset,
    href: r.verset != null ? `${base}&verset=${r.verset}#verset-${r.verset}` : base,
    libelle: r.verset != null ? `${nom} ${r.chapitre}, ${r.verset}` : `${nom} ${r.chapitre}`,
  }
}

// ── 3. Relire un texte reçu ──────────────────────────────────────────────────

/**
 * La FRONTIÈRE DE MOT, telle que la base la voit : tout ce qui n'est ni lettre ni
 * chiffre. `norm_fr` remplace ces caractères par une espace, si bien qu'une ligne
 * trouvée en base l'a été à cette frontière-là ; la relecture doit la reconnaître à
 * l'identique, sans quoi elle rejette ce que la base a rendu.
 *
 * ⛔ L'ancienne liste de séparateurs — espaces, guillemets, virgule, point, tirets
 * longs, parenthèses — n'avait NI L'APOSTROPHE NI LE TRAIT D'UNION (relevé de l'audit du
 * 2026-09-06). « l’espérance », « d’amour », « Jésus-Christ » : le mot cherché s'y
 * trouve après une apostrophe ou un tiret, la base le rendait, et la page le rejetait
 * en silence — le verset disparaissait des résultats, sans que rien ne le dise.
 */
const SEP_AVANT = '(^|[^\\p{L}\\p{N}])'
const SEP_APRES = '(?=[^\\p{L}\\p{N}]|$)'

export function echapperRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * L'expression qui trouve l'un des termes dans un texte REPLIÉ : en début de mot, ou
 * en mot entier si `entier`. Les termes les plus longs d'abord, pour que « gloire »
 * l'emporte sur « glo » quand les deux sont tapés. Rend `null` sans terme.
 * ⚠️ Le texte à tester doit être passé par `normaliser`, comme les termes le sont ici.
 */
export function regexTermes(termes: readonly string[], entier: boolean, jusquAuBout = false): RegExp | null {
  const nets = [...new Set(termes.map(normaliser).filter(Boolean))].sort((a, b) => b.length - a.length)
  if (nets.length === 0) return null
  // `jusquAuBout` : le mot ENTIER qui commence par le terme est pris dans la marque —
  // « aimait » tout entier pour la racine « aim », non ses trois premières lettres.
  const corps = `(${nets.map(echapperRegex).join('|')}${jusquAuBout ? '[\\p{L}\\p{N}]*' : ''})`
  return new RegExp(`${SEP_AVANT}${corps}${entier ? SEP_APRES : ''}`, 'giu')
}

/** Vrai si CHAQUE terme se trouve dans le texte, en début de mot (ou en mot entier). */
export function contientTous(texte: string, termes: readonly string[], entier: boolean): boolean {
  const nets = termes.map(normaliser).filter(Boolean)
  if (nets.length === 0 || !texte) return false
  const texteN = normaliser(texte)
  return nets.every(t => new RegExp(`${SEP_AVANT}${echapperRegex(t)}${entier ? SEP_APRES : ''}`, 'iu').test(texteN))
}

/** Le nombre d'occurrences des termes dans un texte : ce que le volet compte. */
export function compterOccurrences(texte: string, termes: readonly string[], entier: boolean): number {
  const re = regexTermes(termes, entier)
  if (!re || !texte) return 0
  const texteN = normaliser(texte)
  let n = 0
  while (re.exec(texteN) !== null) n++
  return n
}

/**
 * CE QUE LA PAGE MARQUE dans les lignes reçues, et ce qu'elle y vérifie.
 *
 * En mode préfixe ou exact, ce sont les termes tapés, en début de mot ou entiers. En
 * mode famille, ce sont les RACINES que la base a rendues (`lexemes_recherche`) —
 * « aimer » → « aim » —, toujours en début de mot : la racine française est le
 * commencement du mot fléchi dans l'immense majorité des cas (aim-ait, esper-ance,
 * resurrect-ion). ⚠️ Faute de racines (la base n'a pas répondu), les termes tapés
 * servent de repli : on marque moins, on ne marque pas faux.
 */
export type Marque = {
  mots: string[]
  entier: boolean
  /** En famille, la marque couvre le mot fléchi ENTIER, non la seule racine. */
  jusquAuBout?: boolean
}

export function marqueDe(termes: readonly string[], mode: ModeRecherche, lexemes: readonly string[] = []): Marque {
  if (mode === 'famille') return { mots: [...(lexemes.length ? lexemes : termes)], entier: false, jusquAuBout: true }
  return { mots: [...termes], entier: mode === 'exact' }
}

export function contientMarque(texte: string, m: Marque): boolean {
  return contientTous(texte, m.mots, m.entier)
}

export function compterMarque(texte: string, m: Marque): number {
  return compterOccurrences(texte, m.mots, m.entier)
}

export function regexMarque(m: Marque): RegExp | null {
  return regexTermes(m.mots, m.entier, m.jusquAuBout === true)
}

// ── 4. Les graphies d'un mot latin ───────────────────────────────────────────

/**
 * Les formes sous lesquelles un mot latin peut être écrit dans un texte ORIGINAL :
 * « jesus » se lit aussi « iesus » et « jesvs », « verite » « uerite ». ⛔ Elles ne
 * s'appliquent qu'au texte original : le français normalisé de la base ne les connaît
 * pas, et les lui demander doublait les requêtes pour ne rien trouver de plus.
 * ⚠️ La MÊME règle vit en SQL (`graphies_latines`), pour la RPC qui cherche dans
 * l'original ; ici elle ne sert qu'à RELIRE la ligne rendue.
 */
export function graphiesVariantes(base: string): string[] {
  const v = new Set([base])
  if (base.includes('j')) v.add(base.replaceAll('j', 'i'))
  if (/^i[aeiouy]/.test(base)) v.add('j' + base.slice(1))
  if (base.includes('v')) v.add(base.replaceAll('v', 'u'))
  if (base.includes('u')) v.add(base.replaceAll('u', 'v'))
  return [...v].filter(s => s.length >= 2)
}

/** Vrai si chaque terme, sous l'une de ses graphies, se trouve dans le texte original. */
export function contientTousOriginal(texte: string, termes: readonly string[], entier: boolean): boolean {
  const nets = termes.map(normaliser).filter(Boolean)
  if (nets.length === 0 || !texte) return false
  return nets.every(t => graphiesVariantes(t).some(g => contientTous(texte, [g], entier)))
}
