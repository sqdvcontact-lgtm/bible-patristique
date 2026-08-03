import { Suspense } from "react"
import BibliothequeClient from "./BibliothequeClient"
import { MARQUEUR_OEUVRE_DEPUBLIEE } from "@/app/lib/oeuvresPublication"
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur"

// Base fermée au rôle anonyme : on interroge avec la session du visiteur. La
// page devient dynamique (elle lit les cookies) et perd donc son cache d'une
// heure — sans conséquence pour un site fermé, et c'est le prix de la lecture
// authentifiée.

export const metadata = {
  title: "Bibliothèque",
}

export default async function BibliothequePage() {
  const supabase = await creerSupabaseServeur()
  // Filtrage des œuvres publiées poussé EN BASE : `oeuvres!inner` + filtre sur la note
  // ne ramène que les auteurs ayant au moins une œuvre publiée, chacun avec ses seules
  // œuvres publiées — plus de rapatriement des œuvres dépubliées ni de filtrage JS.
  const { data } = await supabase
    .from("auteurs")
    .select(`id_auteur, nom, nom_original, titre, dates, siecle, date_naissance, date_mort, langue_principale, traditions, note, note_biographique, note_theologique, photo_position,
      oeuvres!inner ( id_oeuvre, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication, genre, note, langue_originale )`)
    .or(`note.is.null,note.neq.${MARQUEUR_OEUVRE_DEPUBLIEE}`, { referencedTable: "oeuvres" })
    .order("siecle", { ascending: true, nullsFirst: false })

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auteurs`
  const cacheV = Math.floor(Date.now() / (3600 * 1000))
  const auteurs = ((data ?? []) as any[])
    .map(a => ({ ...a, imageUrl: `${base}/${a.id_auteur}.jpg?v=${cacheV}` }))

  return (
    <Suspense fallback={null}>
      <BibliothequeClient auteurs={auteurs} />
    </Suspense>
  )
}
