import type { Metadata } from "next";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { JsonLd, donneesPersonne, donneesFilAriane } from "@/app/lib/donneesStructurees";

// Métadonnées + données structurées de la page publique d'un auteur. La page
// elle-même est un composant client ; titre, description et Person JSON-LD passent
// par ce layout serveur. Les variantes de nom (nom_original) sont exposées pour
// capter les différentes formes sous lesquelles on cherche un auteur.
async function chargerAuteur(id: string) {
  const supabase = await creerSupabaseServeur();
  const { data } = await supabase
    .from("auteurs")
    .select("nom, nom_original, note_biographique, dates")
    .eq("id_auteur", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await chargerAuteur(id);
  if (!data?.nom) return { title: "Auteur" };
  const variantes = [data.nom, data.nom_original].filter((v): v is string => !!v);
  const description =
    typeof data.note_biographique === "string" && data.note_biographique
      ? data.note_biographique.slice(0, 160)
      : `Notice, œuvres et références de ${data.nom}${data.dates ? ` (${data.dates})` : ""} sur Corpus Scriptura.`;
  return { title: data.nom, description, keywords: variantes };
}

export default async function AuteurLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await chargerAuteur(id);
  return (
    <>
      {data?.nom && (
        <>
          <JsonLd
            donnees={donneesPersonne({
              id,
              nom: data.nom,
              nomOriginal: data.nom_original,
              description:
                typeof data.note_biographique === "string" && data.note_biographique
                  ? data.note_biographique.slice(0, 300)
                  : null,
            })}
          />
          <JsonLd
            donnees={donneesFilAriane([
              { nom: "Accueil", url: "/accueil" },
              { nom: "Bibliothèque", url: "/bibliotheque" },
              { nom: data.nom, url: `/auteur/${id}` },
            ])}
          />
        </>
      )}
      {children}
    </>
  );
}
