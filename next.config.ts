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
  // ⛔ NE PAS poser de `Cache-Control: immutable` sur `/manuscrits/:chemin*`.
  // Essayé puis retiré le 29 août 2026, sur une prémisse fausse : les 1 264
  // fac-similés de la Bible 899 ne sont PAS servis par `public/`. Le dossier local
  // est un miroir de travail, ignoré par git (voir `.gitignore`) ; les images
  // viennent du seau Supabase `manuscrits`. Sous ce chemin, Vercel ne sert donc
  // qu'une chose : la PAGE de lecture — dynamique, et pour un visiteur sans session
  // une redirection 307 vers la connexion. La règle la gelait un an dans le
  // navigateur : le lecteur, une fois connecté, aurait continué d'être renvoyé
  // vers `/chantier` depuis son propre cache.
  //
  // ⚠️ La leçon vaut au-delà de ce chemin : une règle d'en-tête écrite sur un
  // `source` désigne des ROUTES, pas des fichiers, et une route de page y répond
  // aussi bien qu'un fichier statique. Vérifier ce que le chemin sert RÉELLEMENT
  // en ligne avant d'y poser un cache long.
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
