import type { Metadata } from "next";
import { cache } from "react";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { JsonLd, donneesPersonne, donneesFilAriane } from "@/app/lib/donneesStructurees";
// Description et JSON-LD prennent le texte NU : une notice enrichie y laisserait
// ses astérisques, que ni un moteur ni un aperçu de partage ne savent lire.
import { sansEnrichissements } from "@/app/lib/enrichissements";
import { estOeuvrePubliee } from "@/app/lib/oeuvresPublication";
import {
  couperDescription, descriptionAuteur, enTetesPartage, titreAuteur,
} from "@/app/lib/metadonneesSeo";
import { porteDesLiensBibliques } from "@/app/lib/metadonneesSeoServeur";

// Métadonnées + données structurées de la page publique d'un auteur. La page
// elle-même est un composant client ; titre, description et Person JSON-LD passent
// par ce layout serveur.
//
// Le titre dit ce que la page CONTIENT réellement, et rien de plus : des œuvres
// avec leurs commentaires de l'Écriture, des œuvres seules, ou une notice.
// Beaucoup d'auteurs du corpus n'ont ici qu'une notice ; leur promettre des
// œuvres serait mentir à un moteur comme à un lecteur.
//
// ⚠️ `cache` de React, et non un simple `async` : `generateMetadata` et le corps
// du layout ont besoin des mêmes faits, et le client Supabase n'est pas mis en
// cache par le routeur. Sans cela, chaque visite payait DEUX FOIS les mêmes
// lectures.
const chargerFicheAuteur = cache(async (id: string) => {
  const supabase = await creerSupabaseServeur();
  // Une vague : l'auteur, les œuvres qu'il signe (co-signatures comprises, via
  // la vue), et le catalogue des cinquante œuvres, dont on ne veut que l'état de
  // publication. Le tout tient en quelques kilo-octets.
  const [auteur, signatures, catalogue] = await Promise.all([
    supabase.from("auteurs")
      .select("nom, nom_original, note_biographique, dates")
      .eq("id_auteur", id).maybeSingle(),
    supabase.from("v_oeuvres_auteurs").select("id_oeuvre").eq("id_auteur", id),
    supabase.from("oeuvres").select("id_oeuvre, acces_public"),
  ]);

  const publiees = new Set(
    ((catalogue.data ?? []) as { id_oeuvre: string; acces_public: boolean | null }[])
      .filter(estOeuvrePubliee).map(o => o.id_oeuvre),
  );
  const oeuvres = [...new Set(((signatures.data ?? []) as { id_oeuvre: string }[])
    .map(s => s.id_oeuvre))].filter(id => publiees.has(id)).sort();

  // Seconde vague, et elle ne part que s'il y a des œuvres à interroger : un
  // seul lien suffit à répondre, `limit(1)` arrête Postgres au premier trouvé.
  const aLiensBibliques = await porteDesLiensBibliques(supabase, oeuvres);
  return { data: auteur.data, etat: { nbOeuvres: oeuvres.length, aLiensBibliques } };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data, etat } = await chargerFicheAuteur(id);
  if (!data?.nom) return { title: "Auteur" };
  const titre = titreAuteur(data.nom, etat);
  const description = descriptionAuteur(data.nom, etat, {
    notice: typeof data.note_biographique === "string"
      ? sansEnrichissements(data.note_biographique)
      : null,
    dates: data.dates,
  });
  return {
    // Pas de `absolute` : le gabarit du layout racine ajoute « · Corpus Scriptura ».
    title: titre,
    description,
    alternates: { canonical: `/auteur/${encodeURIComponent(id)}` },
    ...enTetesPartage(titre, description),
  };
}

export default async function AuteurLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await chargerFicheAuteur(id);
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
                  ? couperDescription(sansEnrichissements(data.note_biographique), 300)
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
