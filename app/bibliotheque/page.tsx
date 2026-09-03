import { Suspense, type ComponentProps } from "react"
import BibliothequeClient from "./BibliothequeClient"
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur"
import { chargerAuteursParOeuvre, grouperOeuvresParAuteur } from "@/app/lib/auteursOeuvre"
import { SELECT_AUTEURS_BIBLIOTHEQUE, SELECT_OEUVRES_BIBLIOTHEQUE } from "@/app/lib/bibliothequeSelects"

// Base fermée au rôle anonyme : on interroge avec la session du visiteur. La
// page devient dynamique (elle lit les cookies) et perd donc son cache d'une
// heure — sans conséquence pour un site fermé, et c'est le prix de la lecture
// authentifiée.

export const metadata = {
  title: "Bibliothèque",
}

type AuteurBibliotheque = { id_auteur: string; [cle: string]: unknown }
type OeuvreBibliotheque = { id_oeuvre: string; id_auteur: string; [cle: string]: unknown }

export default async function BibliothequePage() {
  const supabase = await creerSupabaseServeur()
  // Les métadonnées d'auteur et les dates canoniques des œuvres sont chargées
  // séparément : une vue ne porte pas la relation PostgREST imbriquée de la table.
  const [auteursResultat, oeuvresResultat, auteursParOeuvre] = await Promise.all([
    supabase
      .from("auteurs")
      .select(SELECT_AUTEURS_BIBLIOTHEQUE)
      .order("siecle", { ascending: true, nullsFirst: false }),
    supabase
      .from("v_oeuvres_dates")
      .select(SELECT_OEUVRES_BIBLIOTHEQUE)
      .eq("acces_public", true),
    chargerAuteursParOeuvre(supabase),
  ])

  // Une œuvre à deux auteurs paraît sous le nom de chacun : le groupement suit
  // les couples (œuvre, auteur) de `v_oeuvres_auteurs`, pas la seule colonne
  // `id_auteur` de l'œuvre, qui n'en porte que le premier. Chaque œuvre emporte
  // la liste de ses auteurs, pour porter les deux noms là où elle est nommée.
  const oeuvres = ((oeuvresResultat.data ?? []) as OeuvreBibliotheque[])
    .map(oeuvre => ({ ...oeuvre, auteurs: auteursParOeuvre[oeuvre.id_oeuvre] ?? [] }))
  const oeuvresParAuteur = grouperOeuvresParAuteur(oeuvres, auteursParOeuvre, oeuvre => String(oeuvre.id_auteur))

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
