import type { MetadataRoute } from "next";

// Tant que le site est fermé, tout hormis la page du chantier et les mentions
// légales est derrière le verrou : Googlebot y reçoit une redirection. On le
// laisse balayer — les 307 ne pénalisent pas — mais on lui épargne l'API et
// l'espace admin, qui n'ont rien à faire dans un index.
//
// À l'ouverture, ce fichier grandira : sitemap complet, plus de Disallow sur
// les pages devenues publiques.

// ── Deux familles de robots d'IA, et elles ne font pas la même chose ─────────
// ⛔ Ne pas les refondre en une seule liste : c'est la confusion des deux qui a
// rendu le site invisible dans les assistants pendant des mois.
//
// Ceux qui ENTRAÎNENT aspirent le corpus pour nourrir un modèle. On leur refuse
// tout : cela vaut réservation « fouille de textes et de données » (opt-out TDM,
// art. L122-5-3 CPI) par un moyen lisible par machine, en écho au blocage du
// proxy et à /.well-known/tdmrep.json.
const ROBOTS_IA_ENTRAINEMENT = [
  "GPTBot", "anthropic-ai", "Claude-Web",
  "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider",
  "Amazonbot", "Meta-ExternalAgent", "FacebookBot", "Diffbot", "Omgilibot",
  "ImagesiftBot", "YouBot", "cohere-ai", "Timpibot", "DataForSeoBot",
];

// Ceux qui CITENT EN RÉPONDANT vont chercher une page pour la donner en source
// à un lecteur qui pose une question. Les refuser ne protège rien : cela rend
// seulement le site introuvable de qui cherche précisément un verset commenté
// par Augustin. Ouverts sur décision de l'auteur, le 2026-09-09.
// ⚠️ `ClaudeBot` sert chez Anthropic à la fois l'exploration et la recherche ;
// il est ouvert avec les autres, et se referme d'une ligne si l'on veut s'en
// tenir aux seuls `Claude-User` / `Claude-SearchBot`.
const ROBOTS_IA_REPONSE = [
  "OAI-SearchBot", "ChatGPT-User",
  "PerplexityBot", "Perplexity-User",
  "ClaudeBot", "Claude-User", "Claude-SearchBot",
];

// ⛔ Un groupe nommé REMPLACE entièrement celui de `*` : les robots de réponse
// doivent donc redire les deux interdits, sans quoi ils entreraient dans /api/
// et /admin que tout le monde s'interdit.
const INTERDITS = ["/api/", "/admin"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: INTERDITS },
      ...ROBOTS_IA_REPONSE.map(userAgent => ({ userAgent, allow: "/", disallow: INTERDITS })),
      ...ROBOTS_IA_ENTRAINEMENT.map(userAgent => ({ userAgent, disallow: "/" })),
    ],
    sitemap: "https://corpus-scriptura.fr/sitemap.xml",
    host: "https://corpus-scriptura.fr",
  };
}
