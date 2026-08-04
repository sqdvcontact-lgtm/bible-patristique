import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { estOeuvrePubliee } from "@/app/lib/oeuvresPublication";

// Site fermé : le plan ne liste que ce qui est réellement accessible sans
// session. Un plan qui pointe des pages verrouillées ne vaut rien, et /sitemap.xml
// est PUBLIC (le proxy ne filtre pas les .xml) — on ne veut donc pas y divulguer
// la carte des entités d'un site encore fermé.
//
// À l'OUVERTURE : poser la variable d'environnement `SITE_OUVERT=1`. Le plan
// énumérera alors, lues depuis la base, toutes les entités de la vitrine
// (auteurs, œuvres publiées, péricopes, essais publiés). Le générateur est prêt.
const BASE = "https://corpus-scriptura.fr";
const OUVERT = process.env.SITE_OUVERT === "1";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publiques: MetadataRoute.Sitemap = [
    { url: `${BASE}/chantier`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/conditions-utilisation`, changeFrequency: "yearly", priority: 0.2 },
  ];
  if (!OUVERT) return publiques;

  const [auteurs, oeuvres, pericopes, essais] = await Promise.all([
    supabaseAdmin.from("auteurs").select("id_auteur"),
    supabaseAdmin.from("oeuvres").select("id_oeuvre, note"),
    supabaseAdmin.from("pericopes").select("id"),
    supabaseAdmin.from("essais").select("id, updated_at").eq("statut", "publie"),
  ]);

  const entites: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/bibliotheque`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/pericopes`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/essais`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/traductions`, changeFrequency: "monthly", priority: 0.6 },
    ...((auteurs.data ?? []) as { id_auteur: string }[]).map(a => ({
      url: `${BASE}/auteur/${a.id_auteur}`, changeFrequency: "monthly" as const, priority: 0.6,
    })),
    ...((oeuvres.data ?? []) as { id_oeuvre: string; note: string | null }[])
      .filter(estOeuvrePubliee)
      .map(o => ({ url: `${BASE}/oeuvre/${o.id_oeuvre}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...((pericopes.data ?? []) as { id: string }[]).map(p => ({
      url: `${BASE}/pericopes/${p.id}`, changeFrequency: "monthly" as const, priority: 0.6,
    })),
    ...((essais.data ?? []) as { id: number; updated_at: string | null }[]).map(e => ({
      url: `${BASE}/essais/${e.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      ...(e.updated_at ? { lastModified: new Date(e.updated_at) } : {}),
    })),
  ];

  return [...publiques, ...entites];
}
