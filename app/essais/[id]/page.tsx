import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { estAdmin } from '@/app/lib/verifAdmin'
import EssaiClient from './EssaiClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function EssaiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: essai } = await supabaseAdmin.from('essais').select('*').eq('id', id).single()
  if (!essai) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8a8278' }}>Essai introuvable.</p>
      </main>
    )
  }

  if (essai.statut !== 'publie') {
    const supabase = await creerSupabaseServeur()
    const { data: { user } } = await supabase.auth.getUser()
    const estProprietaire = user?.id === essai.user_id
    const autorise = estProprietaire || await estAdmin()
    if (!autorise) {
      return (
        <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#8a8278' }}>Cet essai n'est pas encore publié.</p>
        </main>
      )
    }
  }

  const { data: profil } = await supabaseAdmin.from('profils').select('pseudo, nom, prenom').eq('id', essai.user_id).maybeSingle()
  const nomAffiche = (essai.afficher_nom_reel && profil?.nom)
    ? `${profil.prenom ? profil.prenom + ' ' : ''}${profil.nom}`
    : (profil?.pseudo ?? null)

  return (
    <EssaiClient essai={{
      id: essai.id, titre: essai.titre, sous_titre: essai.sous_titre, resume: essai.resume,
      categories: essai.categories ?? [], contenu: essai.contenu, statut: essai.statut,
      nb_vues: essai.nb_vues, user_id: essai.user_id, created_at: essai.created_at, publie_at: essai.publie_at,
      auteur_pseudo: nomAffiche,
    }} />
  )
}