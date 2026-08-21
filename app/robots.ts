import type { MetadataRoute } from "next";

// Tant que le site est fermé, tout hormis la page du chantier et les mentions
// légales est derrière le verrou : Googlebot y reçoit une redirection. On le
// laisse balayer — les 307 ne pénalisent pas — mais on lui épargne l'API et
// l'espace admin, qui n'ont rien à faire dans un index.
//
// À l'ouverture, ce fichier grandira : sitemap complet, plus de Disallow sur
// les pages devenues publiques.
// Robots d'aspiration / d'entraînement d'IA à qui l'on refuse tout : cela vaut
// réservation « fouille de textes et de données » (opt-out TDM) par un moyen
// lisible par machine, en écho au blocage du middleware et à /.well-known/tdmrep.json.
const ROBOTS_IA = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "Claude-Web",
  "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "PerplexityBot",
  "Amazonbot", "Meta-ExternalAgent", "FacebookBot", "Diffbot", "Omgilibot",
  "ImagesiftBot", "YouBot", "cohere-ai", "Timpibot", "DataForSeoBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] },
      ...ROBOTS_IA.map(userAgent => ({ userAgent, disallow: "/" })),
    ],
    sitemap: "https://corpus-scriptura.fr/sitemap.xml",
    host: "https://corpus-scriptura.fr",
  };
}
