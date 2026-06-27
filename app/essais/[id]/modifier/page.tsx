import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import EditeurEssai from '../../EditeurEssai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ModifierEssaiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await creerSupabaseServeur()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: essai } = await supabaseAdmin.from('essais').select('*').eq('id', id).single()

  if (!essai) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8a8278' }}>Essai introuvable.</p>
      </main>
    )
  }

  const estProprietaire = !!user && user.id === essai.user_id
  const estAdminConnecte = !estProprietaire && await verifierEstAdmin()

  if (!estProprietaire && !estAdminConnecte) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8a8278' }}>Vous ne pouvez modifier que vos propres essais.</p>
      </main>
    )
  }

  return (
    <EditeurEssai
      modeAdmin={estAdminConnecte}
      essaiExistant={{
        id: essai.id, titre: essai.titre, sous_titre: essai.sous_titre, resume: essai.resume,
        categories: essai.categories ?? [], contenu: essai.contenu, statut: essai.statut,
        afficher_nom_reel: essai.afficher_nom_reel ?? false, publie_at: essai.publie_at,
      }}
    />
  )
}
