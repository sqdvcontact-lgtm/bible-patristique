'use client'

import { supabase } from '@/app/lib/supabase'
import { parsePointCanonique } from '@/app/lib/referencesBibliques'
import { MESSAGE_CERTIFICATION_NON_RETENUE } from '@/app/lib/messagesModeration'

/**
 * ⛔ UNE NOTIFICATION PORTE QUATRE CHOSES, ET QUATRE SEULEMENT (décision de l'auteur,
 * 2026-09-04) : « se contenter d'indiquer : expéditeur du message, objet, message, date
 * de message ; en bas "voir la publication" ou "aller au commentaire" ». C'est le
 * modèle de la LETTRE, et il suffit.
 *
 * ⚠️ Elle en portait SIX, sur six rangs typographiques : un titre en capitales vertes,
 * un objet en sérif, une date, un « À propos : … » en italique, une ligne « Message de X »
 * et le corps. Trois de ces six disaient la même chose sous trois formes — « Publication
 * acceptée », « Votre publication a été acceptée et publiée. », et le titre de la
 * publication ailleurs. ⛔ `titre` et `contexte` sont donc SUPPRIMÉS du modèle : l'objet
 * les réunit en une ligne, le document nommé compris.
 *
 * ⚠️ Le TON remplace le titre : il ne se compose pas, il COLORE l'objet — vert pour une
 * validation, danger pour un refus, gris pour le reste. La couleur dit en un coup d'œil
 * ce que six mots en capitales disaient à la ligne au-dessus.
 */
// ── Ce que cette page DEMANDE à la base ─────────────────────────────────────
//
// ⚠️ Ces types ne décrivent PAS les tables : ils décrivent la forme exacte que
// chaque `select` ci-dessous en rapporte. C'est ce qui les rend utiles — retirer une
// colonne d'un `select` casse ici, à la compilation, et non chez le lecteur. Ils
// remplacent vingt `any`, qui laissaient passer n'importe quelle faute de nom.
type LigneCommentaire = {
  id: number
  texte: string | null
  user_id: string | null
  reponse_a: number | null
  valide: boolean | null
  certifie: boolean | null
  demande_validation: boolean | null
  message_admin: string | null
  message_admin_at: string | null
  created_at: string | null
  id_verset: string | null
}

type LigneEssai = {
  id: number
  titre: string | null
  sous_titre: string | null
  statut: string | null
  note_admin: string | null
  updated_at: string | null
  publie_at: string | null
  user_id: string | null
}

type LigneSignalement = {
  id: number
  message: string | null
  message_admin: string | null
  message_admin_at: string | null
}

type LigneLike = { id_commentaire: number; user_id: string | null; valeur: number | null }

// ⚠️ `reponse_a` n'est pas nullable ICI, à la différence de la colonne : la requête
// filtre par `.in('reponse_a', idsCommentaires)`, donc toute ligne rendue en porte un.
type LigneReponse = {
  id: number
  texte: string | null
  user_id: string | null
  reponse_a: number
  created_at: string | null
  id_verset: string | null
}

type LigneCommentaireEssai = {
  id: number
  texte: string | null
  id_essai: number
  user_id: string | null
  auteur_nom: string | null
  created_at: string | null
}

type LigneAppreciation = { id_essai: number; user_id: string | null }
type LigneProfil = { id: string; pseudo: string | null }

export type TonNotification = 'validation' | 'refus' | 'neutre'

export type NotificationItem = {
  key: string
  id: number
  type: 'essai' | 'commentaire' | 'signalement' | 'reaction'
  /** Ce que le message ANNONCE. Il décide de l'encre de l'objet, et de rien d'autre. */
  ton: TonNotification
  /** L'objet, en UNE ligne : ce dont il s'agit, le document nommé compris. */
  objet: string
  /** L'expéditeur. */
  auteur: string
  /** Le corps. ⚠️ VIDE quand l'objet dit déjà tout : une ligne qui redit celle du
   *  dessus est précisément ce qu'on vient de retirer. */
  message: string
  date: string | null
  href?: string
  /** Le libellé du lien, quand il y a une adresse où aller. */
  action?: string
}

export function cleArchivesNotifications(uid: string) {
  return `notifications_archivees:${uid}`
}

export function cleNotificationsConnues(uid: string) {
  return `notifications_connues:${uid}`
}

export function lireSetLocalStorage(cle: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set<string>(JSON.parse(localStorage.getItem(cle) ?? '[]')) }
  catch { return new Set() }
}

export function enregistrerSetLocalStorage(cle: string, valeurs: Set<string>) {
  localStorage.setItem(cle, JSON.stringify(Array.from(valeurs)))
}

function extrait(texte: string | null | undefined, taille = 120) {
  const t = String(texte ?? '').replace(/\s+/g, ' ').trim()
  return t.length > taille ? `${t.slice(0, taille)}…` : t
}

function nomAuteur(uid: string | null | undefined, profils: Map<string, LigneProfil>) {
  if (!uid) return 'Utilisateur'
  return profils.get(uid)?.pseudo ?? 'Utilisateur'
}

/** « Objet : document ». Le document ne prend pas de rang à lui : il est DANS l'objet. */
function objetAvecDocument(objet: string, document: string | null | undefined) {
  const nom = String(document ?? '').trim()
  return nom ? `${objet} : ${nom}` : objet
}

/**
 * L'adresse d'un commentaire de verset.
 *
 * ⚠️ On ne passe PAS par `urlLectureBible` : elle exige une traduction, que la
 * notification ne connaît pas. Sans `trad`, la page Bible choisit celle du lecteur —
 * son adresse, son cookie, sa préférence de compte —, ce qui est exactement ce qu'on
 * veut : on le mène à SON verset, dans SA bible.
 * ⛔ Un commentaire de SEGMENT patristique n'a pas d'adresse ici : il faudrait joindre
 * `segments` pour connaître son œuvre. Le corpus n'en compte aucun (mesuré le
 * 2026-09-04, cinq commentaires, tous sur un verset) ; le jour où il y en aura, c'est
 * une requête de plus, pas une règle de plus.
 */
function urlDuVerset(idVerset: string | null | undefined): string | undefined {
  const point = parsePointCanonique(idVerset)
  if (!point || point.chapitre == null) return undefined
  const p = new URLSearchParams({ livre: point.livre, chapitre: String(point.chapitre) })
  if (point.verset != null) p.set('verset', String(point.verset))
  return `/?${p.toString()}`
}

const ALLER_AU_COMMENTAIRE = 'Aller au commentaire'
const VOIR_LA_PUBLICATION = 'Voir la publication'

function notificationModerationCommentaire(c: LigneCommentaire): NotificationItem {
  const certifie = c.certifie === true
  // ⛔ Une certification non retenue se reconnaît à la phrase même que la modération écrit
  // (app/lib/messagesModeration.ts). Trois booléens ne suffisaient pas : toute validation
  // ordinaire laisse certifie à faux, et s'annonçait « Certification refusée ».
  const certificationRefusee = c.valide === true && c.certifie === false && c.message_admin === MESSAGE_CERTIFICATION_NON_RETENUE
  const accepte = c.valide === true
  const refuse = c.valide === false
  // ⚠️ Les quatre libellés sont ceux d'avant, au mot près : ils entrent dans la CLÉ
  // d'archivage, gardée en stockage local. Les réécrire ferait reparaître d'un coup
  // tout ce que le lecteur avait rangé.
  const objet = certifie
    ? 'Certification acceptée'
    : certificationRefusee
      ? 'Certification refusée'
      : accepte
        ? 'Commentaire accepté'
        : refuse
          ? 'Commentaire refusé'
          : 'Modération de votre commentaire'
  const ton: TonNotification = certifie || accepte ? 'validation'
    : certificationRefusee || refuse ? 'refus' : 'neutre'
  const href = urlDuVerset(c.id_verset)

  return {
    key: `commentaire-moderation:${c.id}:${c.message_admin_at ?? c.created_at ?? ''}:${objet}`,
    id: c.id,
    type: 'commentaire',
    ton,
    objet,
    auteur: 'Administrateur',
    // ⛔ Rien par défaut : « Votre commentaire a été accepté. » ne faisait que redire
    // l'objet. Seul un mot RÉELLEMENT écrit par la modération a quelque chose à dire.
    message: c.message_admin || '',
    date: c.message_admin_at ?? c.created_at ?? null,
    href,
    action: href ? ALLER_AU_COMMENTAIRE : undefined,
  }
}

function notificationStatutEssai(e: LigneEssai): NotificationItem | null {
  if (e.statut === 'publie') {
    return {
      key: `essai-accepte:${e.id}:${e.publie_at ?? e.updated_at ?? ''}`,
      id: e.id,
      type: 'essai',
      ton: 'validation',
      objet: objetAvecDocument('Publication acceptée', e.titre),
      auteur: 'Administrateur',
      message: e.note_admin || '',
      date: e.publie_at ?? e.updated_at ?? null,
      href: `/essais/${e.id}`,
      action: VOIR_LA_PUBLICATION,
    }
  }
  if (e.statut === 'a_reviser' || e.statut === 'brouillon') {
    if (!e.note_admin) return null
    return {
      key: `essai-revoir:${e.id}:${e.updated_at ?? ''}`,
      id: e.id,
      type: 'essai',
      // ⚠️ « À revoir » se range avec les REFUS, non avec le reste : la publication
      // n'a pas été acceptée en l'état, et le lecteur a quelque chose à faire.
      ton: 'refus',
      objet: objetAvecDocument('Publication à revoir', e.titre),
      auteur: 'Administrateur',
      message: e.note_admin,
      date: e.updated_at ?? null,
      href: `/essais/${e.id}/modifier`,
      action: 'Modifier la publication',
    }
  }
  if (e.statut === 'refuse') {
    return {
      key: `essai-refuse:${e.id}:${e.updated_at ?? ''}`,
      id: e.id,
      type: 'essai',
      ton: 'refus',
      objet: objetAvecDocument('Publication refusée', e.titre),
      auteur: 'Administrateur',
      message: e.note_admin || '',
      date: e.updated_at ?? null,
      href: `/essais/${e.id}/modifier`,
      action: 'Ouvrir la publication',
    }
  }
  return null
}

export async function chargerNotificationsUtilisateur(userId: string): Promise<NotificationItem[]> {
  const [mesCommentairesRes, mesEssaisRes, signalementsRes] = await Promise.all([
    supabase
      .from('commentaires')
      .select('id, texte, user_id, reponse_a, valide, certifie, demande_validation, message_admin, message_admin_at, created_at, id_verset')
      .eq('user_id', userId),
    supabase
      .from('essais')
      .select('id, titre, sous_titre, statut, note_admin, updated_at, publie_at, user_id')
      .eq('user_id', userId),
    supabase
      .from('signalements')
      .select('id, message, message_admin, message_admin_at')
      .eq('user_id', userId)
      .not('message_admin', 'is', null),
  ])

  if (mesCommentairesRes.error || mesEssaisRes.error || signalementsRes.error) {
    throw new Error('Chargement des notifications impossible')
  }

  const mesCommentaires = (mesCommentairesRes.data ?? []) as LigneCommentaire[]
  const mesEssais = (mesEssaisRes.data ?? []) as LigneEssai[]
  const idsCommentaires = mesCommentaires.map(c => c.id)
  const idsEssais = mesEssais.map(e => e.id)

  const [likesRes, reponsesCommentairesRes, commentairesEssaisRes, appreciationsEssaisRes] = await Promise.all([
    idsCommentaires.length
      ? supabase.from('commentaires_likes').select('id_commentaire, user_id, valeur').in('id_commentaire', idsCommentaires).neq('user_id', userId)
      : Promise.resolve({ data: [] as LigneLike[], error: null }),
    idsCommentaires.length
      ? supabase.from('commentaires').select('id, texte, user_id, reponse_a, created_at, id_verset').in('reponse_a', idsCommentaires).neq('user_id', userId)
      : Promise.resolve({ data: [] as LigneReponse[], error: null }),
    idsEssais.length
      ? supabase.from('essais_commentaires').select('id, texte, id_essai, user_id, auteur_nom, created_at').in('id_essai', idsEssais).neq('user_id', userId)
      : Promise.resolve({ data: [] as LigneCommentaireEssai[], error: null }),
    idsEssais.length
      ? supabase.from('essais_appreciations').select('id_essai, user_id').in('id_essai', idsEssais).neq('user_id', userId)
      : Promise.resolve({ data: [] as LigneAppreciation[], error: null }),
  ])

  if (likesRes.error || reponsesCommentairesRes.error || commentairesEssaisRes.error || appreciationsEssaisRes.error) {
    throw new Error('Chargement des notifications impossible')
  }

  const idsAuteurs = [
    ...((likesRes.data ?? []) as LigneLike[]).map(l => l.user_id),
    ...((reponsesCommentairesRes.data ?? []) as LigneReponse[]).map(r => r.user_id),
    ...((commentairesEssaisRes.data ?? []) as LigneCommentaireEssai[]).map(c => c.user_id),
    ...((appreciationsEssaisRes.data ?? []) as LigneAppreciation[]).map(a => a.user_id),
  ].filter((id): id is string => !!id)

  const profilsRes = idsAuteurs.length
    ? await supabase.from('profils').select('id, pseudo').in('id', [...new Set(idsAuteurs)])
    : { data: [] as LigneProfil[], error: null }
  if (profilsRes.error) throw new Error('Chargement des notifications impossible')

  const profils = new Map<string, LigneProfil>(((profilsRes.data ?? []) as LigneProfil[]).map(p => [p.id, p]))
  const commentaireParId = new Map<number, LigneCommentaire>(mesCommentaires.map(c => [c.id, c]))
  const essaiParId = new Map<number, LigneEssai>(mesEssais.map(e => [e.id, e]))

  const notifications: NotificationItem[] = []

  notifications.push(
    ...mesCommentaires
      .filter(c => c.message_admin || c.certifie === true || (c.valide === true && c.demande_validation === false))
      .map(notificationModerationCommentaire)
  )

  notifications.push(
    ...mesEssais
      .map(notificationStatutEssai)
      .filter((n): n is NotificationItem => !!n)
  )

  notifications.push(...((signalementsRes.data ?? []) as LigneSignalement[]).map(s => ({
    key: `signalement:${s.id}:${s.message_admin_at ?? ''}`,
    id: s.id,
    type: 'signalement' as const,
    ton: 'neutre' as const,
    objet: 'Retour sur votre signalement',
    auteur: 'Administrateur',
    message: s.message_admin || '',
    date: s.message_admin_at,
  })))

  notifications.push(...((likesRes.data ?? []) as LigneLike[]).map(l => {
    const commentaire = commentaireParId.get(l.id_commentaire)
    const positif = l.valeur === 1
    const href = urlDuVerset(commentaire?.id_verset)
    return {
      key: `reaction-commentaire:${l.id_commentaire}:${l.user_id}:${l.valeur}`,
      id: l.id_commentaire,
      type: 'reaction' as const,
      ton: 'neutre' as const,
      objet: positif ? 'Votre commentaire a reçu un j’aime' : 'Votre commentaire a reçu une désapprobation',
      auteur: nomAuteur(l.user_id, profils),
      // L'objet dit tout : « Un utilisateur a aimé votre commentaire » le redisait,
      // et nommait « un utilisateur » que l'expéditeur nomme déjà.
      message: '',
      date: null,
      href,
      action: href ? ALLER_AU_COMMENTAIRE : undefined,
    }
  }))

  notifications.push(...((appreciationsEssaisRes.data ?? []) as LigneAppreciation[]).map(a => {
    const essai = essaiParId.get(a.id_essai)
    return {
      key: `reaction-publication:${a.id_essai}:${a.user_id}`,
      id: a.id_essai,
      type: 'reaction' as const,
      ton: 'neutre' as const,
      objet: objetAvecDocument('Votre publication a reçu un j’aime', essai?.titre),
      auteur: nomAuteur(a.user_id, profils),
      message: '',
      date: null,
      href: essai ? `/essais/${essai.id}` : undefined,
      action: essai ? VOIR_LA_PUBLICATION : undefined,
    }
  }))

  notifications.push(...((reponsesCommentairesRes.data ?? []) as LigneReponse[]).map(r => {
    const href = urlDuVerset(r.id_verset ?? commentaireParId.get(r.reponse_a)?.id_verset)
    return {
      key: `reponse-commentaire:${r.id}:${r.created_at ?? ''}`,
      id: r.id,
      type: 'commentaire' as const,
      ton: 'neutre' as const,
      objet: 'Réponse à votre commentaire',
      auteur: nomAuteur(r.user_id, profils),
      message: extrait(r.texte, 240),
      date: r.created_at ?? null,
      href,
      action: href ? ALLER_AU_COMMENTAIRE : undefined,
    }
  }))

  notifications.push(...((commentairesEssaisRes.data ?? []) as LigneCommentaireEssai[]).map(c => {
    const essai = essaiParId.get(c.id_essai)
    return {
      key: `commentaire-publication:${c.id}:${c.created_at ?? ''}`,
      id: c.id,
      type: 'commentaire' as const,
      ton: 'neutre' as const,
      objet: objetAvecDocument('Nouveau commentaire', essai?.titre),
      auteur: c.auteur_nom || nomAuteur(c.user_id, profils),
      message: extrait(c.texte, 240),
      date: c.created_at ?? null,
      href: essai ? `/essais/${essai.id}` : undefined,
      action: essai ? VOIR_LA_PUBLICATION : undefined,
    }
  }))

  return notifications.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}
