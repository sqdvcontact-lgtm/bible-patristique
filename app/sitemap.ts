import type { MetadataRoute } from "next";

// Site fermé : le plan ne liste que ce qui est réellement accessible sans
// session. Inutile d'y déclarer la Bible ou les œuvres — Google n'y accède pas
// encore, et un plan qui pointe des pages verrouillées ne vaut rien.
//
// À l'ouverture, ce fichier devra énumérer les œuvres et les livres bibliques,
// lus depuis la base.
const BASE = "https://corpus-scriptura.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/chantier`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/conditions-utilisation`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
