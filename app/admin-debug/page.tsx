import { cookies } from 'next/headers'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

// Page de diagnostic TEMPORAIRE — à supprimer une fois le problème d'accès admin résolu.
export default async function AdminDebugPage() {
  const cookieStore = await cookies()
  const cookiesSb = cookieStore.getAll().filter(c => c.name.startsWith('sb-')).map(c => c.name)

  const supabase = await creerSupabaseServeur()
  const { data, error } = await supabase.auth.getUser()

  const adminEmailEnv = process.env.ADMIN_EMAIL ?? null
  const emailUtilisateur = data?.user?.email ?? null
  const correspond = !!(emailUtilisateur && adminEmailEnv && emailUtilisateur.trim().toLowerCase() === adminEmailEnv.trim().toLowerCase())

  return (
    <main style={{ padding: '40px', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.8, background: '#fff', color: '#000', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '16px', marginBottom: '20px' }}>Diagnostic admin (page temporaire — à supprimer après usage)</h1>
      <p>1. Cookies « sb- » trouvés : <b>{cookiesSb.length === 0 ? 'AUCUN' : cookiesSb.join(', ')}</b></p>
      <p>2. Utilisateur lu côté serveur : <b>{emailUtilisateur ? emailUtilisateur : 'AUCUN'}</b></p>
      <p>3. Erreur éventuelle de getUser() : <b>{error ? error.message : 'aucune'}</b></p>
      <p>4. Valeur de ADMIN_EMAIL côté serveur : <b>{adminEmailEnv ? adminEmailEnv : 'ABSENTE — variable non définie'}</b></p>
      <p>5. Correspondance e-mail : <b>{correspond ? 'OUI ✓' : 'NON ✗'}</b></p>
    </main>
  )
}