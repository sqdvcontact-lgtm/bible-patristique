import type { Metadata } from "next";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { formaterPlageCanonique } from "@/app/lib/referencesBibliques";
import { JsonLd, donneesPericope, donneesFilAriane } from "@/app/lib/donneesStructurees";

// Métadonnées + données structurées d'une péricope. On expose le nom ET ses
// APPELLATIONS (pericope_noms, visibles seulement) : ce sont les différentes
// façons de nommer un passage, donc autant de mots-clés captés. La page est un
// composant client ; tout passe par ce layout serveur.
async function chargerPericope(id: string) {
  const supabase = await creerSupabaseServeur();
  const [{ data: p }, { data: noms }, { data: occ }] = await Promise.all([
    supabase.from("pericopes").select("nom, notice").eq("id", id).maybeSingle(),
    supabase.from("pericope_noms").select("nom")
      .eq("pericope_id", id).eq("visible_public", true).eq("est_principal", false).order("ordre"),
    supabase.from("pericope_occurrences").select("canon_id_debut, canon_id_fin")
      .eq("pericope_id", id).eq("est_principale", true).limit(1),
  ]);
  const appellations = ((noms ?? []) as { nom: string }[]).map(n => n.nom);
  const occPrincipale = ((occ ?? []) as { canon_id_debut: string; canon_id_fin: string | null }[])[0];
  const reference = occPrincipale
    ? formaterPlageCanonique(occPrincipale.canon_id_debut, occPrincipale.canon_id_fin)
    : null;
  return { p: p as { nom: string; notice: string | null } | null, appellations, reference };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { p, appellations, reference } = await chargerPericope(id);
  if (!p?.nom) return { title: "Péricope" };
  const description = p.notice
    ? p.notice.slice(0, 160)
    : `La péricope « ${p.nom} »${reference ? ` (${reference})` : ""} et ses correspondances patristiques.`;
  return { title: p.nom, description, keywords: [p.nom, ...appellations] };
}

export default async function PericopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { p, appellations, reference } = await chargerPericope(id);
  return (
    <>
      {p?.nom && (
        <>
          <JsonLd
            donnees={donneesPericope({
              id,
              nom: p.nom,
              appellations,
              description: p.notice ? p.notice.slice(0, 300) : null,
              reference,
            })}
          />
          <JsonLd
            donnees={donneesFilAriane([
              { nom: "Accueil", url: "/accueil" },
              { nom: "Péricopes", url: "/pericopes" },
              { nom: p.nom, url: `/pericopes/${id}` },
            ])}
          />
        </>
      )}
      {children}
    </>
  );
}
