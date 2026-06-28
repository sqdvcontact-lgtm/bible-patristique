'use client'

import { supabase } from '@/app/lib/supabase'

export type NotificationItem = {
  key: string
  id: number
  type: 'essai' | 'commentaire' | 'signalement' | 'reaction'
  titre: string
  objet: string
  contexte: string | null
  auteur: string
  message: string
  date: string | null
  href?: string
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

function nomAuteur(uid: string | null | undefined, profils: Map<string, any>) {
  if (!uid) return 'Utilisateur'
  return profils.get(uid)?.pseudo ?? 'Utilisateur'
}

function notificationModerationCommentaire(c: any): NotificationItem {
  const certifie = c.certifie === true
  const certificationRefusee = c.certifie === false && c.valide === true && c.demande_validation === false
  const accepte = c.valide === true
  const refuse = c.valide === false
  const titre = certifie
    ? 'Certification acceptée'
    : certificationRefusee
      ? 'Certification refusée'
      : accepte
        ? 'Commentaire accepté'
        : refuse
          ? 'Commentaire refusé'
          : 'Commentaire'

  return {
    key: `commentaire-moderation:${c.id}:${c.message_admin_at ?? c.created_at ?? ''}:${titre}`,
    id: c.id,
    type: 'commentaire',
    titre,
    objet: 'Modération du commentaire',
    contexte: extrait(c.texte),
    auteur: 'Administrateur',
    message: c.message_admin || (accepte ? 'Votre commentaire a été accepté.' : 'Votre commentaire a été examiné par la modération.'),
    date: c.message_admin_at ?? c.created_at ?? null,
  }
}

function notificationStatutEssai(e: any): NotificationItem | null {
  if (e.statut === 'publie') {
    return {
      key: `essai-accepte:${e.id}:${e.publie_at ?? e.updated_at ?? ''}`,
      id: e.id,
      type: 'essai',
      titre: 'Publication acceptée',
      objet: e.titre || 'Publication',
      contexte: e.sous_titre || null,
      auteur: 'Administrateur',
      message: e.note_admin || 'Votre publication a été acceptée et publiée.',
      date: e.publie_at ?? e.updated_at ?? null,
      href: `/essais/${e.id}`,
    }
  }
  if (e.statut === 'a_reviser' || e.statut === 'brouillon') {
    if (!e.note_admin) return null
    return {
      key: `essai-revoir:${e.id}:${e.updated_at ?? ''}`,
      id: e.id,
      type: 'essai',
      titre: 'Publication à revoir',
      objet: e.titre || 'Publication',
      contexte: e.sous_titre || null,
      auteur: 'Administrateur',
      message: e.note_admin,
      date: e.updated_at ?? null,
      href: `/essais/${e.id}/modifier`,
    }
  }
  if (e.statut === 'refuse') {
    return {
      key: `essai-refuse:${e.id}:${e.updated_at ?? ''}`,
      id: e.id,
      type: 'essai',
      titre: 'Publication refusée',
      objet: e.titre || 'Publication',
      contexte: e.sous_titre || null,
      auteur: 'Administrateur',
      message: e.note_admin || 'Votre publication a été refusée.',
      date: e.updated_at ?? null,
      href: `/essais/${e.id}/modifier`,
    }
  }
  return null
}

export async function chargerNotificationsUtilisateur(userId: string): Promise<NotificationItem[]> {
  const [mesCommentairesRes, mesEssaisRes, signalementsRes] = await Promise.all([
    supabase
      .from('commentaires')
      .select('id, texte, user_id, reponse_a, valide, certifie, demande_validation, message_admin, message_admin_at, created_at')
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

  const mesCommentaires = (mesCommentairesRes.data ?? []) as any[]
  const mesEssais = (mesEssaisRes.data ?? []) as any[]
  const idsCommentaires = mesCommentaires.map(c => c.id)
  const idsEssais = mesEssais.map(e => e.id)

  const [likesRes, reponsesCommentairesRes, commentairesEssaisRes, appreciationsEssaisRes] = await Promise.all([
    idsCommentaires.length
      ? supabase.from('commentaires_likes').select('id_commentaire, user_id, valeur').in('id_commentaire', idsCommentaires).neq('user_id', userId)
      : Promise.resolve({ data: [] as any[] }),
    idsCommentaires.length
      ? supabase.from('commentaires').select('id, texte, user_id, reponse_a, created_at').in('reponse_a', idsCommentaires).neq('user_id', userId)
      : Promise.resolve({ data: [] as any[] }),
    idsEssais.length
      ? supabase.from('essais_commentaires').select('id, texte, id_essai, user_id, auteur_nom, created_at').in('id_essai', idsEssais).neq('user_id', userId)
      : Promise.resolve({ data: [] as any[] }),
    idsEssais.length
      ? supabase.from('essais_appreciations').select('id_essai, user_id').in('id_essai', idsEssais).neq('user_id', userId)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const idsAuteurs = [
    ...((likesRes.data ?? []) as any[]).map(l => l.user_id),
    ...((reponsesCommentairesRes.data ?? []) as any[]).map(r => r.user_id),
    ...((commentairesEssaisRes.data ?? []) as any[]).map(c => c.user_id),
    ...((appreciationsEssaisRes.data ?? []) as any[]).map(a => a.user_id),
  ].filter((id): id is string => !!id)

  const profilsRes = idsAuteurs.length
    ? await supabase.from('profils').select('id, pseudo').in('id', [...new Set(idsAuteurs)])
    : { data: [] as any[] }
  const profils = new Map((profilsRes.data ?? []).map((p: any) => [p.id, p]))
  const commentaireParId = new Map(mesCommentaires.map(c => [c.id, c]))
  const essaiParId = new Map(mesEssais.map(e => [e.id, e]))

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

  notifications.push(...((signalementsRes.data ?? []) as any[]).map(s => ({
    key: `signalement:${s.id}:${s.message_admin_at ?? ''}`,
    id: s.id,
    type: 'signalement' as const,
    titre: 'Signalement',
    objet: 'Retour sur votre signalement',
    contexte: extrait(s.message),
    auteur: 'Administrateur',
    message: s.message_admin || '',
    date: s.message_admin_at,
  })))

  notifications.push(...((likesRes.data ?? []) as any[]).map(l => {
    const commentaire = commentaireParId.get(l.id_commentaire)
    const positif = l.valeur === 1
    return {
      key: `reaction-commentaire:${l.id_commentaire}:${l.user_id}:${l.valeur}`,
      id: l.id_commentaire,
      type: 'reaction' as const,
      titre: positif ? 'Nouveau j’aime' : 'Nouveau je n’aime pas',
      objet: positif ? 'Votre commentaire a reçu un j’aime' : 'Votre commentaire a reçu un je n’aime pas',
      contexte: extrait(commentaire?.texte),
      auteur: nomAuteur(l.user_id, profils),
      message: positif ? 'Un utilisateur a aimé votre commentaire.' : 'Un utilisateur a désapprouvé votre commentaire.',
      date: null,
    }
  }))

  notifications.push(...((appreciationsEssaisRes.data ?? []) as any[]).map(a => {
    const essai = essaiParId.get(a.id_essai)
    return {
      key: `reaction-publication:${a.id_essai}:${a.user_id}`,
      id: a.id_essai,
      type: 'reaction' as const,
      titre: 'Nouveau j’aime',
      objet: essai?.titre || 'Votre publication a reçu un j’aime',
      contexte: essai?.sous_titre || null,
      auteur: nomAuteur(a.user_id, profils),
      message: 'Un utilisateur a aimé votre publication.',
      date: null,
      href: essai ? `/essais/${essai.id}` : undefined,
    }
  }))

  notifications.push(...((reponsesCommentairesRes.data ?? []) as any[]).map(r => {
    const parent = commentaireParId.get(r.reponse_a)
    return {
      key: `reponse-commentaire:${r.id}:${r.created_at ?? ''}`,
      id: r.id,
      type: 'commentaire' as const,
      titre: 'Réponse à un commentaire',
      objet: 'Quelqu’un vous a répondu',
      contexte: extrait(parent?.texte),
      auteur: nomAuteur(r.user_id, profils),
      message: extrait(r.texte, 240),
      date: r.created_at ?? null,
    }
  }))

  notifications.push(...((commentairesEssaisRes.data ?? []) as any[]).map(c => {
    const essai = essaiParId.get(c.id_essai)
    return {
      key: `commentaire-publication:${c.id}:${c.created_at ?? ''}`,
      id: c.id,
      type: 'commentaire' as const,
      titre: 'Commentaire sous une publication',
      objet: essai?.titre || 'Publication',
      contexte: essai?.sous_titre || null,
      auteur: c.auteur_nom || nomAuteur(c.user_id, profils),
      message: extrait(c.texte, 240),
      date: c.created_at ?? null,
      href: essai ? `/essais/${essai.id}` : undefined,
    }
  }))

  return notifications.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
}
