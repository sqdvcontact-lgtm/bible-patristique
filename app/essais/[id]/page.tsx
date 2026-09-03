import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { couperDescription, enTetesPartage } from '@/app/lib/metadonneesSeo'
import { estAdmin } from '@/app/lib/verifAdmin'
import { JsonLd, donneesArticle, donneesFilAriane } from '@/app/lib/donneesStructurees'
import EssaiClient from './EssaiClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Titre d'onglet / SEO dynamique par publication. On n'expose le titre que pour une
// publication publiée (ne pas divulguer le titre d'un brouillon dans les métadonnées).
//
// ⚠️ Un brouillon n'a ni canonique ni en-têtes de partage : ce serait annoncer
// une page que le lecteur ne verra pas.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('essais').select('titre, sous_titre, resume, statut').eq('id', id).maybeSingle()
  if (!data?.titre || data.statut !== 'publie') return { title: 'Publication' }
  const titre = data.titre as string
  // Coupe au mot, jamais au milieu : `slice(160)` tranchait la dernière syllabe.
  const brut = (data.resume || data.sous_titre || '') as string
  const description = brut ? couperDescription(brut) : ''
  return {
    title: titre,
    ...(description ? { description } : {}),
    alternates: { canonical: `/essais/${encodeURIComponent(id)}` },
    ...enTetesPartage(titre, description || `${titre}, une publication de Corpus Scriptura.`),
  }
}

export default async function EssaiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: essai } = await supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, contenu, statut, nb_vues, user_id, created_at, publie_at, afficher_nom_reel, couverture, embleme, verset_en_tete').eq('id', id).single()
  if (!essai) {
    return (
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--cs-texte-gris)' }}>Essai introuvable.</p>
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
        <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--cs-texte-gris)' }}>Cet essai n’est pas encore publié.</p>
        </main>
      )
    }
  }

  const { data: profil } = await supabaseAdmin.from('profils').select('pseudo, nom, prenom, mecene_depuis, pub_mecene').eq('id', essai.user_id).maybeSingle()
  const nomAffiche = (essai.afficher_nom_reel && profil?.nom)
    ? `${profil.prenom ? profil.prenom + ' ' : ''}${profil.nom}`
    : (profil?.pseudo ?? null)

  return (
    <>
      {/* Article JSON-LD + fil d'Ariane — seulement pour une publication publiée. */}
      {essai.statut === 'publie' && (
        <>
          <JsonLd donnees={donneesArticle({
            id: essai.id, titre: essai.titre, sousTitre: essai.sous_titre,
            resume: essai.resume, auteur: nomAffiche, publieAt: essai.publie_at,
          })} />
          <JsonLd donnees={donneesFilAriane([
            { nom: 'Accueil', url: '/accueil' },
            { nom: 'Communauté', url: '/essais' },
            { nom: essai.titre, url: `/essais/${essai.id}` },
          ])} />
        </>
      )}
      <EssaiClient essai={{
        id: essai.id, titre: essai.titre, sous_titre: essai.sous_titre, resume: essai.resume,
        categories: essai.categories ?? [], contenu: essai.contenu, statut: essai.statut,
        nb_vues: essai.nb_vues, user_id: essai.user_id, created_at: essai.created_at, publie_at: essai.publie_at,
        auteur_pseudo: nomAffiche, verset_en_tete: essai.verset_en_tete ?? null,
        // ⚠️ `pub_mecene` compte ICI : cette page lit `profils` avec la clé de service
        // et n'a donc pas le filtre de la vue `mecenes_publics` derrière elle.
        auteur_mecene: !!profil?.mecene_depuis && profil.pub_mecene !== false,
      }} />
    </>
  )
}