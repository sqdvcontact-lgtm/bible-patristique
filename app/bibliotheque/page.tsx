import { createClient } from "@supabase/supabase-js"
import { Suspense } from "react"
import BibliothequeClient from "./BibliothequeClient"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata = {
  title: "Bibliothèque — Corpus Scriptura",
}

export default async function BibliothequePage() {
  const { data } = await supabase
    .from("auteurs")
    .select(`id_auteur, nom, nom_original, titre, dates, siecle, traditions, note, note_biographique,
      oeuvres ( id_oeuvre, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication, trad_date )`)
    .order("siecle", { ascending: true, nullsFirst: false })

  const auteurs = ((data ?? []) as any[]).filter(a => a.oeuvres?.length > 0)

  return (
    <Suspense fallback={null}>
      <BibliothequeClient auteurs={auteurs} />
    </Suspense>
  )
}
