import type { MetadataRoute } from "next";

// Tant que le site est fermé, tout hormis la page du chantier et les mentions
// légales est derrière le verrou : Googlebot y reçoit une redirection. On le
// laisse balayer — les 307 ne pénalisent pas — mais on lui épargne l'API et
// l'espace admin, qui n'ont rien à faire dans un index.
//
// À l'ouverture, ce fichier grandira : sitemap complet, plus de Disallow sur
// les pages devenues publiques.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin"],
    },
    sitemap: "https://corpus-scriptura.fr/sitemap.xml",
    host: "https://corpus-scriptura.fr",
  };
}
