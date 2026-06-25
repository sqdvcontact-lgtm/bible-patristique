import { createClient } from "@supabase/supabase-js"
import BibliothequeClient from "./BibliothequeClient"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata = {
  title: "Bibliothèque — Bible & Tradition",
}

export default async function BibliothequePage() {
  const { data } = await supabase
    .from("auteurs")
    .select(`id_auteur, nom, dates, siecle, tradition, note,
      oeuvres ( id_oeuvre, titre, sous_titre, titre_original, trad_auteur, trad_date )`)
    .order("siecle", { ascending: true, nullsFirst: false })

  const auteurs = ((data ?? []) as any[]).filter(a => a.oeuvres?.length > 0)

  return <BibliothequeClient auteurs={auteurs} />
}