import { Suspense, type ComponentProps } from "react"
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

type AuteurBibliotheque = { id_auteur: string; [cle: string]: unknown }
type OeuvreBibliotheque = { id_auteur: string; [cle: string]: unknown }

export default async function BibliothequePage() {
  const supabase = await creerSupabaseServeur()
  // Les métadonnées d'auteur et les dates canoniques des œuvres sont chargées
  // séparément : une vue ne porte pas la relation PostgREST imbriquée de la table.
  const [auteursResultat, oeuvresResultat] = await Promise.all([
    supabase
      .from("auteurs")
      .select("id_auteur, nom, nom_original, titre, dates, siecle, date_naissance, date_mort, langue_principale, traditions, note, note_biographique, note_theologique, photo_position")
      .order("siecle", { ascending: true, nullsFirst: false }),
    supabase
      .from("v_oeuvres_dates")
      .select("id_oeuvre, id_auteur, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication_affichage_courte, date_publication_precision_affichage, genre, note, langue_originale")
      .or(`note.is.null,note.neq.${MARQUEUR_OEUVRE_DEPUBLIEE}`),
  ])

  const oeuvresParAuteur = new Map<string, OeuvreBibliotheque[]>()
  for (const oeuvre of (oeuvresResultat.data ?? []) as OeuvreBibliotheque[]) {
    const groupe = oeuvresParAuteur.get(String(oeuvre.id_auteur)) ?? []
    groupe.push(oeuvre)
    oeuvresParAuteur.set(String(oeuvre.id_auteur), groupe)
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auteurs`
  const cacheV = Math.floor(Date.now() / (3600 * 1000))
  const auteurs = (((auteursResultat.data ?? []) as AuteurBibliotheque[])
    .map(a => ({ ...a, oeuvres: oeuvresParAuteur.get(String(a.id_auteur)) ?? [], imageUrl: `${base}/${a.id_auteur}.jpg?v=${cacheV}` }))
    .filter(a => a.oeuvres.length > 0)) as ComponentProps<typeof BibliothequeClient>["auteurs"]

  return (
    <Suspense fallback={null}>
      <BibliothequeClient auteurs={auteurs} />
    </Suspense>
  )
}
