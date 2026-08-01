import type { Metadata } from "next";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";

// Titre dynamique de la page publique d'un auteur (« Augustin d'Hippone · Corpus
// Scriptura »). La page elle-même est un composant client ; le titre passe par ce
// layout serveur.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await creerSupabaseServeur();
  const { data } = await supabase
    .from("auteurs")
    .select("nom, note_biographique")
    .eq("id_auteur", id)
    .maybeSingle();
  if (!data?.nom) return { title: "Auteur" };
  return {
    title: data.nom,
    description: typeof data.note_biographique === "string" && data.note_biographique
      ? data.note_biographique.slice(0, 160)
      : `Notice et œuvres de ${data.nom} sur Corpus Scriptura.`,
  };
}

export default function AuteurLayout({ children }: { children: React.ReactNode }) {
  return children;
}
