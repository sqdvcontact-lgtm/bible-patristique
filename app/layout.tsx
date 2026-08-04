import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Navbar from "./components/Navbar";
import Consentement from "./components/Consentement";
import ConfortLecture from "./components/ConfortLecture";
import { ProvisionAffichageAdmin } from "./lib/contexteAffichageAdmin";
import { HAUTEUR_NAVBAR } from "./lib/mesures";
import { JsonLd, donneesSite } from "./lib/donneesStructurees";
import "./globals.css";

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
    <html
      lang="fr"
      className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Confort de lecture : applique le thème mémorisé AVANT peinture (pas de
            flash). Le clair est le défaut (aucun attribut). */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('cs-theme');if(t==='sepia'||t==='sombre'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();` }} />
        {/* Identité du site pour les moteurs (Organisation + WebSite). Inerte tant
            que le site est fermé ; prête pour l'ouverture. */}
        <JsonLd donnees={donneesSite()} />
        <ProvisionAffichageAdmin>
          <Navbar />
          {/* Décalage sous la navbar fixe — voir app/lib/mesures.ts */}
          <div id="cs-corps" className="flex flex-col flex-1" style={{ paddingTop: HAUTEUR_NAVBAR }}>{children}</div>
          <Consentement />
          <ConfortLecture />
        </ProvisionAffichageAdmin>
      </body>
    </html>
  );
}
