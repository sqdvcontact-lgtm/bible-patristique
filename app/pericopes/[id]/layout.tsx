import type { Metadata } from "next";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";

// Titre dynamique de la page d'une péricope (« La création du monde · Corpus
// Scriptura »). La page est un composant client ; le titre passe par ce layout
// serveur, plus spécifique que le layout parent /pericopes.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await creerSupabaseServeur();
  const { data } = await supabase
    .from("pericopes")
    .select("nom, notice")
    .eq("id", id)
    .maybeSingle();
  if (!data?.nom) return { title: "Péricope" };
  const notice = typeof data.notice === "string" ? data.notice : "";
  return {
    title: data.nom as string,
    description: notice ? notice.slice(0, 160) : `La péricope « ${data.nom} » et ses correspondances patristiques.`,
  };
}

export default function PericopeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
