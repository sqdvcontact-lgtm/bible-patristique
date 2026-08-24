import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les réponses.
//
// Volontairement SANS Content-Security-Policy : le site charge des images depuis
// Supabase et renvoie vers PayPal, et une CSP écrite à l'aveugle casserait l'un
// ou l'autre sans qu'on s'en aperçoive. Elle mérite d'être posée, mais en la
// vérifiant page par page — ce n'est pas un réglage qu'on devine.
const ENTETES_SECURITE = [
  // Empêche le navigateur de « deviner » un type MIME : un fichier téléversé
  // ne peut plus être servi comme du script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Interdit l'inclusion du site dans une iframe tierce (détournement de clic).
  { key: "X-Frame-Options", value: "DENY" },
  // Ne divulgue l'URL complète qu'au sein du site ; vers l'extérieur, seul le
  // domaine part. Sans cela, un lien sortant révèle le passage qu'on lisait.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le site n'a besoin ni de la caméra, ni du micro, ni de la position.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Réservation « pas d'entraînement d'IA » : signal complémentaire du robots.txt
  // et de /.well-known/tdmrep.json. N'affecte pas l'indexation (aucun `noindex`).
  { key: "X-Robots-Tag", value: "noai, noimageai" },
];

const nextConfig: NextConfig = {
  // La planche des illustrations (/admin/illustrations) MESURE les fichiers de
  // `public/` : elle y lit leur poids et l'en-tête qui porte leurs dimensions. Or
  // `public/` est servi en statique, il n'est pas embarqué d'office dans la
  // fonction qui rend une page. Sans cette inclusion, la planche s'afficherait en
  // ligne sans un seul chiffre (elle ne tombe pas en panne pour autant, la mesure
  // étant facultative).
  // ⚠️ Les dossiers sont nommés UN À UN, et `manuscrits/` en est écarté : il pèse
  // 1,8 Go de fac-similés, que la planche compte sans jamais les mesurer.
  outputFileTracingIncludes: {
    "/admin/illustrations": [
      "./public/ornements/**",
      "./public/icons/**",
      "./public/logo/**",
      "./public/holy-guessr/**",
      "./public/auteurs/**",
      "./public/*.png",
      "./public/*.svg",
      "./public/*.ico",
      "./app/icon.png",
      "./app/apple-icon.png",
      "./app/favicon.ico",
    ],
  },
  async headers() {
    return [{ source: "/:chemin*", headers: ENTETES_SECURITE }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oucotpxcjalwgetylfbz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
