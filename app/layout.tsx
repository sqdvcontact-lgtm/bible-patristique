import { Suspense } from "react";
import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Navbar from "./components/Navbar";
import MesureAudience from "./components/MesureAudience";
import { ProvisionAffichageAdmin } from "./lib/contexteAffichageAdmin";
import { SCRIPT_THEME, THEME_DEFAUT } from "./lib/theme";
import { ProvisionCompte } from "./lib/contexteCompte";
import AnnonceHautsFaits from "./components/AnnonceHautsFaits";
import { HAUTEUR_NAVBAR } from "./lib/mesures";
import { JsonLd, donneesSite } from "./lib/donneesStructurees";
import "./globals.css";
import "./glosses899.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  // Sans base, les URL relatives des images Open Graph ne se résolvent pas :
  // un lien partagé n'afficherait aucune vignette.
  metadataBase: new URL("https://corpus-scriptura.fr"),
  title: {
    default: "Corpus Scriptura — bibliothèque biblique et patristique",
    // Les pages internes deviendront « … · Corpus Scriptura ».
    template: "%s · Corpus Scriptura",
  },
  description:
    "Corpus Scriptura est un site d’étude consacré aux liens entre la Bible et les textes des Pères de l’Église.",
  applicationName: "Corpus Scriptura",
  // Vérification de propriété Google Search Console (méthode balise HTML).
  verification: { google: "4oCD0P3ntD7JHUPlyTNDO0QxjFm2Koc6q2nj1xCR1ng" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Corpus Scriptura",
    title: "Corpus Scriptura — bibliothèque biblique et patristique",
    description:
      "Corpus Scriptura est un site d’étude consacré aux liens entre la Bible et les textes des Pères de l’Église.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Corpus Scriptura" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Corpus Scriptura",
    description: "Un site d’étude consacré aux liens entre la Bible et les textes des Pères de l’Église.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* Thème de lecture. Recette de cette version de Next, guide « Preventing Flash
       before hydration », section « Themes » : le serveur écrit le thème par DÉFAUT
       sur <html>, un script synchrone du <head> le remplace par le mémorisé avant
       toute peinture, et `suppressHydrationWarning` dit à React d'accepter le DOM.
       ⚠️ Les trois pièces vont ensemble. Sans l'attribut par défaut, le script AJOUTE
       un attribut au lieu d'en changer un, et le désaccord est signalé malgré la
       consigne. Sans le script dans le <head>, la page crème clignote avant de virer
       au brun. La consigne, elle, ne porte que sur <html> : un vrai désaccord ailleurs
       continuera d'être signalé. */
    <html
      lang="fr"
      data-theme={THEME_DEFAUT}
      className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* ⛔ LE LIEN D'ÉVITEMENT, ET IL VIENT EN PREMIER. La barre de navigation porte une
            dizaine de liens, plus la recherche et le menu de compte : sans lui, qui navigue
            au clavier les franchit tous, sur chaque page tournée. C'est la première cible
            du document, il ne paraît qu'au foyer, et il n'occupe aucune place au repos —
            voir `.cs-lien-evitement` dans globals.css. ⚠️ Sa cible porte `tabIndex={-1}` :
            sans quoi le saut déplace la vue sans déplacer le FOYER, et la tabulation
            suivante repart du haut de la barre. */}
        <a href="#cs-corps" className="cs-lien-evitement">Aller au contenu</a>
        {/* Identité du site pour les moteurs (Organisation + WebSite). Inerte tant
            que le site est fermé ; prête pour l'ouverture. */}
        <JsonLd donnees={donneesSite()} />
        <ProvisionAffichageAdmin>
          <ProvisionCompte>
            <Navbar />
            {/* Décalage sous la navbar fixe — voir app/lib/mesures.ts */}
            <div id="cs-corps" tabIndex={-1} className="flex flex-col flex-1" style={{ paddingTop: HAUTEUR_NAVBAR }}>{children}</div>
            {/* Mesure d'audience maison, anonyme et sans cookie. N'affiche rien.
                Elle a remplacé Google Analytics et son bandeau le 2026-08-31.
                ⛔ La frontière Suspense est OBLIGATOIRE : le composant lit
                `useSearchParams` (la page Bible n'a d'adresse que ses paramètres),
                et sans elle toutes les pages prérendues du site basculeraient en
                rendu client. Elle n'enveloppe qu'un composant qui rend `null`,
                donc elle ne peut pas laisser de charge hors flux, à la différence
                de celle qui avait dupliqué un chapitre entier le 2026-08-24. */}
            <Suspense fallback={null}>
              <MesureAudience />
            </Suspense>
            {/* Les annonces de haut fait. Elles ne rendent rien tant qu'il n'y a rien
                à dire, et ne partent en vérification qu'une fois par session — puis
                sur le geste d'un lecteur, jamais à chaque page tournée. */}
            <AnnonceHautsFaits />
          </ProvisionCompte>
        </ProvisionAffichageAdmin>
      </body>
    </html>
  );
}
