/**
 * LA PAIRE DE LECTURE : quelle traduction, quel original, quel alignement.
 *
 * Le volet de lecture offre trois modes — « Français », « Français & Latin/Grec »,
 * « Latin/Grec » — et chacun vise un `id_texte`. Ce module décide lesquels, et lui seul.
 *
 * ⛔ CE QU'IL RÉPARE (relevé le 2026-09-05 sur les Annotations sur le livre de Job,
 * A0010O0100). Le choix se faisait par des `find(...)` posés côte à côte :
 *
 *     const versionTraduite = versionsTextuelles.find(v => !estVersionOriginale(v))
 *
 * c'est-à-dire « la première traduction venue », dans l'ORDRE OÙ SUPABASE A RENDU LES
 * LIGNES — `order('annee_edition')`, et rien d'autre pour départager deux millésimes
 * égaux. L'œuvre portait alors deux traductions de 1866 : l'édition courante
 * (`TXT_A0010O0100_LEGACY`, published, publique, par défaut) et l'instantané d'avant
 * une resegmentation (`…_PRE_RESEG_20260903`, retired, privé), que la politique de
 * lecture d'`oeuvre_textes` (`is_admin() OR is_public`) montre à l'AUTEUR seul. Une
 * ligne sur deux, l'archive sortait la première, et « Français & Latin » emmenait
 * l'administrateur sur `?texte=…_PRE_RESEG_20260903&mt=bilingue` — un texte que
 * l'alignement ne connaît pas. Le mode restait pourtant offert et actif : la garde ne
 * demandait qu'un original QUELCONQUE dans l'œuvre. Résultat : bouton bilingue allumé,
 * une seule colonne.
 *
 * ⚠️ Effacer l'archive n'était pas la correction : la même mécanique attend toute œuvre
 * à plusieurs traductions, brouillons ou versions privées. Le corpus en compte déjà
 * (la Consolation de la philosophie a deux traductions alignées sur le même latin ; les
 * Homélies sur l'Hexaéméron portent TROIS grecs, dont un retiré et un vide).
 *
 * ⛔ LES DEUX RÈGLES DU MODULE :
 *
 *  1. **Une version retirée n'est jamais une cible implicite.** Elle reste consultable
 *     par son adresse — un administrateur doit pouvoir y revenir —, mais aucun bouton
 *     de lecture ne l'y envoie. Seule exception : le texte qu'on LIT déjà, qui est un
 *     choix explicite et non une cible.
 *  2. **Rien ne dépend de l'ordre d'arrivée.** Le classement est total : ce qu'on lit,
 *     puis le texte par défaut, puis le statut éditorial, puis la publicité, puis
 *     l'identifiant. Le millésime n'y entre PAS — c'est lui qui décidait, et il ne
 *     décide plus rien.
 *
 * Module PUR : ni requête, ni rendu, ni React. Le serveur (`page.tsx`) et le client
 * (`OeuvreClient.tsx`) l'appellent tous deux, et doivent en sortir avec la même paire :
 * le serveur précharge l'original en regard et sa projection, le client compose les
 * colonnes et les boutons. Deux règles auraient dérivé.
 */

import { choisirEnsembleBilingue, type EnsembleAlignement } from './bilingueAlignement'

/** Ce qu'il faut savoir d'une version pour la choisir — et rien de plus. Le libellé,
 *  la mention d'édition et la notice ne servent qu'à l'afficher. */
export type VersionLisible = {
  idTexte: string
  langue: string | null
  traducteur: string | null
  isDefault: boolean
  isPublic: boolean
  statut: string | null
}

/** Un ensemble d'alignement, avec son statut : un ensemble RETIRÉ ne porte plus la
 *  lecture (les Homélies sur l'Hexaéméron en gardent un, de 96 groupes, à côté de
 *  celui qui fait foi, de 302). */
export type EnsembleLisible = EnsembleAlignement & { status?: string | null }

/** Le statut d'une version ou d'un ensemble qu'on ne retient plus. */
const STATUT_RETIRE = 'retired'

/** L'avancement éditorial, du plus sûr au moins sûr. Il ne tranche qu'APRÈS le texte
 *  par défaut : `oeuvre_textes` porte douze lignes `draft`/`review` marquées
 *  `is_default`, et c'est bien celles-là que la page ouvre. */
const RANG_STATUT: Record<string, number> = { published: 3, review: 2, draft: 1 }

function replier(valeur: string | null | undefined): string {
  return (valeur ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Deux langues sont la même, accents et casse ignorés : les fiches écrivent « Grec »
 *  ici et « grec » là. Une langue absente ne s'accorde avec rien. */
export function memeLangue(a: string | null | undefined, b: string | null | undefined): boolean {
  const gauche = replier(a)
  const droite = replier(b)
  return gauche.length > 0 && gauche === droite
}

/**
 * Un texte EN LANGUE ORIGINALE : pas de traducteur, et la langue de l'œuvre.
 *
 * ⚠️ La même reconnaissance vaut sur le serveur et sur le client, et c'est ici qu'elle
 * vit désormais : elle était écrite deux fois, à deux endroits, avec deux replis
 * d'accents différents.
 */
export function estVersionEnLangueOriginale(
  version: Pick<VersionLisible, 'traducteur' | 'langue'>,
  langueOriginale: string | null | undefined,
): boolean {
  return !version.traducteur?.trim() && memeLangue(version.langue, langueOriginale)
}

/** Une version retirée du service. */
export function estVersionRetiree(version: Pick<VersionLisible, 'statut'>): boolean {
  return replier(version.statut) === STATUT_RETIRE
}

/**
 * Les ensembles d'alignement qu'on accepte encore de suivre.
 *
 * ⛔ Un ensemble `retired` a été remplacé : le suivre remettrait en regard l'appariement
 * qu'on a corrigé. Il reste en base pour la mémoire du travail, non pour la lecture.
 */
export function ensemblesUtilisables<T extends { status?: string | null }>(
  ensembles: readonly T[],
): T[] {
  return ensembles.filter(ensemble => replier(ensemble.status) !== STATUT_RETIRE)
}

/**
 * Le classement des versions, du meilleur choix au moins bon. Total et déterministe :
 * deux versions ne peuvent pas s'égaliser, l'identifiant tranche toujours.
 *
 * ⛔ `annee_edition` n'y figure pas. C'est très exactement ce qui a cassé : deux
 * traductions de 1866, un tri serveur sur le seul millésime, et l'archive devant.
 */
function comparerVersions(idTexteActif: string | null) {
  const rangStatut = (v: VersionLisible) => RANG_STATUT[replier(v.statut)] ?? 0
  const drapeau = (valeur: boolean) => (valeur ? 1 : 0)
  return (a: VersionLisible, b: VersionLisible): number =>
    drapeau(b.idTexte === idTexteActif) - drapeau(a.idTexte === idTexteActif)
    || drapeau(b.isDefault) - drapeau(a.isDefault)
    || rangStatut(b) - rangStatut(a)
    || drapeau(b.isPublic) - drapeau(a.isPublic)
    || (a.idTexte < b.idTexte ? -1 : a.idTexte > b.idTexte ? 1 : 0)
}

export type PaireDeLecture = {
  /** Le texte en langue originale retenu pour cette œuvre. Cible de « Latin »/« Grec ». */
  original: VersionLisible | null
  /** La traduction que vise « Français ». C'est celle qu'on lit, quand on lit une
   *  traduction : on ne change pas d'édition pour rien. */
  traductionFr: VersionLisible | null
  /** La traduction que vise « Français & Latin/Grec ». `null` : le mode n'est pas offert. */
  traductionBilingue: VersionLisible | null
  /** L'original MIS EN REGARD — l'original retenu, sauf quand c'est lui qu'on lit. */
  idTexteEnRegard: string | null
  /** L'ensemble qui porte la lecture en regard DU TEXTE LU. `null` dès que le regard
   *  passe par une autre traduction (il faut alors naviguer) ou par le repli. */
  ensembleBilingue: EnsembleLisible | null
  /** Une colonne peut-elle se composer en regard du texte lu ? C'est la condition du
   *  bilingue ET de l'original seul : sans elle, « Latin » masquerait le français pour
   *  ne rien mettre à sa place. */
  enRegardSurPlace: boolean
  /** Cette colonne ne tient qu'au repli `segments.texte_original`, faute d'alignement. */
  enRegardParRepli: boolean
  /** Le mode « Français & Latin/Grec » est-il offert, ici ou ailleurs ? */
  bilingueOffert: boolean
  /** Le texte à rejoindre pour lire en bilingue. `null` : on y est déjà (ou jamais). */
  navigationBilingue: string | null
}

const PAIRE_VIDE: PaireDeLecture = {
  original: null,
  traductionFr: null,
  traductionBilingue: null,
  idTexteEnRegard: null,
  ensembleBilingue: null,
  enRegardSurPlace: false,
  enRegardParRepli: false,
  bilingueOffert: false,
  navigationBilingue: null,
}

/**
 * Choisit la paire de lecture d'une œuvre.
 *
 * L'ordre de préférence d'une traduction pour le bilingue, une fois l'original retenu :
 *
 *  a. celle qu'on LIT, si elle est alignée — on ne change pas d'édition pour rien ;
 *  b. le texte par défaut, s'il est aligné ;
 *  c. une version `published` et publique, si elle est alignée ;
 *  d. toute autre version non retirée, si elle est alignée ;
 *  e. à défaut, aucune : le bilingue passe par le repli, ou ne s'offre pas.
 *
 * ⚠️ On parcourt les originaux dans le même ordre, et l'on retient LE PREMIER QUI TROUVE
 * UNE TRADUCTION ALIGNÉE. Une œuvre n'a qu'un original en service, mais elle peut en
 * garder trois en base (Hexaéméron) : préférer aveuglément le mieux classé mettrait en
 * regard un texte que rien ne relie à ce qu'on lit.
 *
 * ⛔ L'ALIGNEMENT AVANT LE REPLI, comme dans `originalEnRegard`. `segments.texte_original`
 * n'est qu'une copie de l'original recollée dans la traduction ; elle peut avoir dérivé,
 * et elle s'éteindra. Elle ne sert donc qu'à défaut de tout ensemble d'alignement.
 */
export function choisirPaireDeLecture(params: {
  /** Le texte qu'on lit. `null` quand la page n'en a pas encore. */
  idTexteActif: string | null
  versions: readonly VersionLisible[]
  alignements: readonly EnsembleLisible[]
  langueOriginale: string | null | undefined
  /** Les segments du texte lu portent-ils réellement la colonne `texte_original` ?
   *  ⚠️ Le SERVEUR ne le sait pas quand il choisit la paire, et n'en a pas besoin : le
   *  repli sert à composer, jamais à choisir l'original ni l'ensemble. Il ne change que
   *  l'offre du mode bilingue, que le client seul dresse. */
  repliTexteOriginal?: boolean
}): PaireDeLecture {
  const { idTexteActif, versions, langueOriginale, repliTexteOriginal = false } = params
  if (versions.length === 0) return PAIRE_VIDE

  const comparer = comparerVersions(idTexteActif)
  // ⛔ Une version retirée sort des choix automatiques — sauf si c'est celle qu'on lit :
  // l'administrateur l'a demandée par son adresse, et la page doit continuer de la
  // nommer « Français » plutôt que de le déporter ailleurs sans rien dire.
  const eligible = (v: VersionLisible) => !estVersionRetiree(v) || v.idTexte === idTexteActif
  const retenues = versions.filter(eligible)
  const originaux = retenues
    .filter(v => estVersionEnLangueOriginale(v, langueOriginale))
    .sort(comparer)
  const traductions = retenues
    .filter(v => !estVersionEnLangueOriginale(v, langueOriginale))
    .sort(comparer)
  const ensembles = ensemblesUtilisables(params.alignements)

  let original: VersionLisible | null = originaux[0] ?? null
  let traductionAlignee: VersionLisible | null = null
  let ensembleAligne: EnsembleLisible | null = null
  for (const candidat of originaux) {
    for (const traduction of traductions) {
      const ensemble = choisirEnsembleBilingue(ensembles, traduction.idTexte, candidat.idTexte) as EnsembleLisible | null
      if (!ensemble) continue
      original = candidat
      traductionAlignee = traduction
      ensembleAligne = ensemble
      break
    }
    if (ensembleAligne) break
  }

  const versionActive = idTexteActif ? retenues.find(v => v.idTexte === idTexteActif) ?? null : null
  const actifEstTraduction = Boolean(versionActive) && traductions.some(v => v.idTexte === idTexteActif)
  const alignementSurPlace = Boolean(ensembleAligne) && traductionAlignee?.idTexte === idTexteActif

  // La cible du bilingue, dans l'ordre : l'alignement du texte lu, l'alignement d'une
  // autre traduction (il faudra naviguer), puis seulement le repli du texte lu.
  const traductionBilingue = ensembleAligne
    ? traductionAlignee
    : actifEstTraduction && repliTexteOriginal ? versionActive : null
  const enRegardParRepli = Boolean(traductionBilingue) && !ensembleAligne
  const enRegardSurPlace = alignementSurPlace || enRegardParRepli

  return {
    original,
    traductionFr: traductions[0] ?? null,
    traductionBilingue,
    idTexteEnRegard: original && original.idTexte !== idTexteActif ? original.idTexte : null,
    ensembleBilingue: alignementSurPlace ? ensembleAligne : null,
    enRegardSurPlace,
    enRegardParRepli,
    bilingueOffert: traductionBilingue !== null,
    navigationBilingue: traductionBilingue && traductionBilingue.idTexte !== idTexteActif
      ? traductionBilingue.idTexte
      : null,
  }
}

/** Les trois modes du volet de lecture. */
export type ModeLectureTexte = 'fr' | 'bilingue' | 'la'

/**
 * Le mode RÉELLEMENT composé, quel que soit celui qu'on a demandé.
 *
 * ⛔ Une lecture en regard ne s'ouvre jamais à vide. « Français & Latin » sans colonne
 * latine allumait son bouton pour ne rendre qu'une colonne ; « Latin » sans colonne
 * latine masquait le français pour ne rien mettre à sa place, c'est-à-dire rendait une
 * page blanche — et une préférence gardée dans le navigateur suffisait à l'y ramener.
 * Les deux retombent sur le français seul.
 *
 * ⚠️ Le mode DEMANDÉ n'est pas effacé pour autant : le lecteur qui rejoint une édition
 * alignée y retrouve le bilingue qu'il avait choisi.
 */
export function modeDeLectureEffectif(
  mode: ModeLectureTexte,
  paire: Pick<PaireDeLecture, 'enRegardSurPlace'>,
): ModeLectureTexte {
  return mode !== 'fr' && !paire.enRegardSurPlace ? 'fr' : mode
}
