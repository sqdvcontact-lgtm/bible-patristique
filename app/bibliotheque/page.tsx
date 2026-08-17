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
type TexteBibliotheque = {
  id_texte: string
  id_oeuvre: string
  langue: string | null
  traducteur: string | null
  edition_label: string | null
  annee_edition: number | null
  is_default: boolean
}
type OeuvreBibliotheque = { id_auteur: string; [cle: string]: unknown }

export default async function BibliothequePage() {
  const supabase = await creerSupabaseServeur()
  // Les métadonnées d'auteur et les dates canoniques des œuvres sont chargées
  // séparément : une vue ne porte pas la relation PostgREST imbriquée de la table.
  // Les témoins textuels d'une œuvre (traduction française, texte latin, seconde
  // traduction) valent chacun une ligne au catalogue : la bibliothèque les liste
  // sous leur œuvre, et non plus seulement dans le volet du lecteur.
  const [auteursResultat, oeuvresResultat, textesResultat] = await Promise.all([
    supabase
      .from("auteurs")
      .select("id_auteur, nom, nom_original, titre, dates, siecle, date_naissance, date_mort, langue_principale, traditions, note, note_biographique, note_theologique, photo_position")
      .order("siecle", { ascending: true, nullsFirst: false }),
    supabase
      .from("v_oeuvres_dates")
      .select("id_oeuvre, id_auteur, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication_affichage_courte, date_publication_precision_affichage, genre, note, langue_originale")
      .or(`note.is.null,note.neq.${MARQUEUR_OEUVRE_DEPUBLIEE}`),
    supabase
      .from("oeuvre_textes")
      .select("id_texte, id_oeuvre, langue, traducteur, edition_label, annee_edition, is_default")
      .eq("is_public", true)
      .eq("statut", "published"),
  ])

  // Un témoin par ligne, celui par défaut en tête : c'est lui que sert le lien
  // nu vers l'œuvre, les autres passant par `?texte=`.
  const textesParOeuvre = new Map<string, TexteBibliotheque[]>()
  for (const texte of (textesResultat.data ?? []) as TexteBibliotheque[]) {
    const groupe = textesParOeuvre.get(String(texte.id_oeuvre)) ?? []
    groupe.push(texte)
    textesParOeuvre.set(String(texte.id_oeuvre), groupe)
  }
  for (const groupe of textesParOeuvre.values()) {
    groupe.sort((a, b) =>
      Number(b.is_default) - Number(a.is_default)
      || (a.annee_edition ?? 0) - (b.annee_edition ?? 0))
  }

  const oeuvresParAuteur = new Map<string, OeuvreBibliotheque[]>()
  for (const oeuvre of (oeuvresResultat.data ?? []) as OeuvreBibliotheque[]) {
    const groupe = oeuvresParAuteur.get(String(oeuvre.id_auteur)) ?? []
    groupe.push({ ...oeuvre, textes: textesParOeuvre.get(String(oeuvre.id_oeuvre)) ?? [] })
    oeuvresParAuteur.set(String(oeuvre.id_auteur), groupe)
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auteurs`
  const cacheV = Math.floor(Date.now() / (3600 * 1000))
  const auteurs = (((auteursResultat.data ?? []) as AuteurBibliotheque[])
    .map(a => ({ ...a, oeuvres: oeuvresParAuteur.get(String(a.id_auteur)) ?? [], imageUrl: `${base}/${a.id_auteur}.jpg?v=${cacheV}` }))
    .filter(a => a.oeuvres.length > 0)) as ComponentProps<typeof BibliothequeClient>["auteurs"]

  // Si le chargement des auteurs échoue, on le signale plutôt que d'afficher une
  // bibliothèque vide comme si de rien n'était.
  const erreurChargement = Boolean(auteursResultat.error || oeuvresResultat.error)

  return (
    <Suspense fallback={null}>
      <BibliothequeClient auteurs={auteurs} erreurChargement={erreurChargement} />
    </Suspense>
  )
}
