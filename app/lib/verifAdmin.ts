import { creerSupabaseServeur } from './supabaseServeur'

// Remplace l'ancien système mot de passe + cookie bp_admin_session.
// Admin = connecté avec ce compte précis (adresse fixe), vérifié côté serveur
// via la session Supabase Auth (cookies lus par creerSupabaseServeur).
// Distinct de verifAdminUtilisateur.ts, qui vérifie profils.est_admin via le
// jeton transmis en en-tête Authorization pour les actions admin déclenchées
// depuis les pages publiques — les deux systèmes restent séparés (voir charte, section 15).
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL)?.trim().toLowerCase()

export async function estAdmin(): Promise<boolean> {
  const supabase = await creerSupabaseServeur()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return false
  const emailOk = !!(ADMIN_EMAIL && data.user.email?.trim().toLowerCase() === ADMIN_EMAIL)
  const { data: profil } = await supabase.from('profils').select('est_admin').eq('id', data.user.id).maybeSingle()
  return emailOk || profil?.est_admin === true
}

// Alias de compatibilité : plusieurs routes /api/admin/ antérieures à la
// migration (update-auteur, update-oeuvre, import-segments, export-segments,
// ajouter-traduction) importent encore estAdminServeur — c'était le nom de la
// fonction dans l'ancien verifAdmin.ts (vérification par cookie). On le
// conserve pour ne pas avoir à modifier chacune de ces routes une par une.
export const estAdminServeur = estAdmin
