import { creerSupabaseServeur } from './supabaseServeur'

// Remplace l'ancien système mot de passe + cookie bp_admin_session.
// Admin = connecté avec ce compte précis (adresse fixe), vérifié côté serveur
// via la session Supabase Auth (cookies lus par creerSupabaseServeur).
// Distinct de verifAdminUtilisateur.ts, qui vérifie profils.est_admin via le
// jeton transmis en en-tête Authorization pour les actions admin déclenchées
// depuis les pages publiques — les deux systèmes restent séparés (voir charte, section 15).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

export async function estAdmin(): Promise<boolean> {
  const supabase = await creerSupabaseServeur()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return false
  return data.user.email === ADMIN_EMAIL
}