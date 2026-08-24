import type { Metadata } from "next";
import { cache } from "react";
import { creerSupabaseServeur } from "@/app/lib/supabaseServeur";
import { formaterPlageCanonique } from "@/app/lib/referencesBibliques";
import { JsonLd, donneesPericope, donneesFilAriane } from "@/app/lib/donneesStructurees";
import {
  couperDescription, descriptionPericope, enTetesPartage, naturePatristique, titrePericope,
} from "@/app/lib/metadonneesSeo";
import { chargerPresencePatristiquePlage } from "@/app/lib/metadonneesSeoServeur";

// Métadonnées + données structurées d'une péricope. La page est un composant
// client ; tout passe par ce layout serveur.
//
// Le titre porte les DEUX façons de chercher un passage nommé : son nom
// (« Les noces de Cana ») et sa référence (« Jean 2, 1-11 »), puis ce que
// Corpus Scriptura y apporte. ⛔ Et rien qu'on ne puisse montrer : une péricope
// qu'aucun Père ne commente s'annonce sous son nom et sa référence, un point
// c'est tout. La formule précédente promettait « ses correspondances
// patristiques » à toutes, y compris à celles qui n'en ont aucune.
//
// On expose le nom ET ses APPELLATIONS (pericope_noms, visibles seulement) : ce
// sont les différentes façons de nommer un passage. Elles passent par le JSON-LD
// (`alternateName`), qui est lu, et NON par `<meta name="keywords">`, que Google
// ignore depuis 2009 et qui n'a donc jamais rien capté.
//
// ⚠️ `cache` de React : `generateMetadata` et le corps du layout demandent les
// mêmes faits, et le client Supabase n'est pas mis en cache par le routeur. Sans
// cela, chaque visite payait DEUX FOIS les mêmes lectures.
const chargerFichePericope = cache(async (id: string) => {
  const supabase = await creerSupabaseServeur();
  const [{ data: p }, { data: noms }, { data: occ }] = await Promise.all([
    supabase.from("pericopes").select("nom, notice").eq("id", id).maybeSingle(),
    supabase.from("pericope_noms").select("nom")
      .eq("pericope_id", id).eq("visible_public", true).eq("est_principal", false).order("ordre"),
    supabase.from("pericope_occurrences").select("livre, canon_id_debut, canon_id_fin")
      .eq("pericope_id", id).eq("est_principale", true).limit(1),
  ]);
  const appellations = ((noms ?? []) as { nom: string }[]).map(n => n.nom);
  const occPrincipale = ((occ ?? []) as { livre: string; canon_id_debut: string; canon_id_fin: string | null }[])[0];
  const reference = occPrincipale
    ? formaterPlageCanonique(occPrincipale.canon_id_debut, occPrincipale.canon_id_fin)
    : null;
  // Seconde vague, et elle n'a lieu que si la péricope est résolue au canon :
  // sans plage, il n'y a rien à interroger.
  const presence = occPrincipale
    ? await chargerPresencePatristiquePlage(
        supabase, occPrincipale.livre, occPrincipale.canon_id_debut, occPrincipale.canon_id_fin)
    : { types: [], auteurs: [] };
  return { p: p as { nom: string; notice: string | null } | null, appellations, reference, presence };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { p, reference, presence } = await chargerFichePericope(id);
  if (!p?.nom) return { title: "Péricope" };
  const nature = naturePatristique(presence.types);
  const titre = titrePericope(p.nom, reference, nature);
  const description = descriptionPericope(p.nom, {
    reference, notice: p.notice, nature, auteurs: presence.auteurs,
  });
  return {
    // Pas de `absolute` : le gabarit du layout racine ajoute « · Corpus Scriptura ».
    title: titre,
    description,
    alternates: { canonical: `/pericopes/${encodeURIComponent(id)}` },
    ...enTetesPartage(titre, description),
  };
}

export default async function PericopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { p, appellations, reference, presence } = await chargerFichePericope(id);
  return (
    <>
      {p?.nom && (
        <>
          <JsonLd
            donnees={donneesPericope({
              id,
              nom: p.nom,
              appellations,
              description: p.notice ? couperDescription(p.notice, 300) : null,
              reference,
              // Les Pères qui commentent le passage. Le volet patristique les
              // montre, mais il est rendu par le NAVIGATEUR : sans cette liste,
              // leurs noms n'existent nulle part dans le document servi.
              auteurs: presence.auteurs,
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
