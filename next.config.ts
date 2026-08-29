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
    return [
      { source: "/:chemin*", headers: ENTETES_SECURITE },
      // ── Les folios de la Bible 899 se mettent en cache POUR DE BON ────────────
      //
      // Vercel sert `public/` avec `max-age=0, must-revalidate` : c'est le bon
      // défaut, car un fichier statique peut être remplacé sous le même nom. Il ne
      // l'est PAS ici. Les 1 264 numérisations sont scellées par empreinte SHA-256
      // dans `data/manuscrits/bible-899/manifest.json`, et le chargeur refuse de
      // démarrer si une seule a bougé : leur immuabilité n'est pas une hypothèse,
      // c'est une garde qui s'exécute.
      //
      // Sans cette règle, un lecteur qui a DÉJÀ le folio en cache repaie tout de
      // même un aller-retour conditionnel à chaque affichage — pour des images de
      // 1,4 Mo en moyenne, tournées une par une. Avec elle, la seconde visite ne
      // touche plus le réseau.
      //
      // ⛔ Si un jour une numérisation est refaite, elle DOIT changer de nom (ou le
      // sceau change, donc le manifeste, donc le nom) : un fichier remplacé sous le
      // même nom resterait un an dans les navigateurs.
      {
        source: "/manuscrits/:chemin*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
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
