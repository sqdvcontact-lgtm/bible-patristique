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
  // ⛔ NE PAS embarquer `public/` dans une fonction par `outputFileTracingIncludes`.
  // Essayé le 2026-08-24 pour que la planche des illustrations mesure les fichiers
  // sur le disque : la fonction `/admin/illustrations` est montée à 259 Mo pour un
  // plafond Vercel de 250, et le déploiement a ÉCHOUÉ — donc le site est resté sur
  // la version précédente, sans que rien ne le signale côté dépôt. Les fonctions de
  // ce projet pèsent déjà quelque 240 Mo à vide : la marge est de dix mégaoctets,
  // pas davantage. La planche mesure désormais dans le NAVIGATEUR, qui charge les
  // images de toute façon.
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
