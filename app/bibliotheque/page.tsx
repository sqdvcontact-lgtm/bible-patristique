import { createClient } from "@supabase/supabase-js"
import { Suspense } from "react"
import BibliothequeClient from "./BibliothequeClient"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 86400

export const metadata = {
  title: "Bibliothèque — Corpus Scriptura",
}

export default async function BibliothequePage() {
  const { data } = await supabase
    .from("auteurs")
    .select(`id_auteur, nom, nom_original, titre, dates, siecle, date_naissance, date_mort, langue_principale, traditions, note, note_biographique, note_theologique,
      oeuvres ( id_oeuvre, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication, genre )`)
    .order("siecle", { ascending: true, nullsFirst: false })

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auteurs`
  const auteurs = ((data ?? []) as any[])
    .filter(a => a.oeuvres?.length > 0)
    .map(a => ({ ...a, imageUrl: `${base}/${a.id_auteur}.jpg` }))

  return (
    <Suspense fallback={null}>
      <BibliothequeClient auteurs={auteurs} />
    </Suspense>
  )
}
