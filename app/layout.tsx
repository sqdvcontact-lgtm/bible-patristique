import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Navbar from "./components/Navbar";
import BandeauMobile from "./components/BandeauMobile";
import { ProvisionAffichageAdmin } from "./lib/contexteAffichageAdmin";
import { HAUTEUR_NAVBAR } from "./lib/mesures";
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
    "L’Écriture et ce que les Pères de l’Église en ont dit, mis en regard verset par verset. Les traductions françaises côte à côte, le corpus patristique découpé et relié au texte.",
  applicationName: "Corpus Scriptura",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Corpus Scriptura",
    title: "Corpus Scriptura — bibliothèque biblique et patristique",
    description:
      "L’Écriture et ce que les Pères de l’Église en ont dit, mis en regard verset par verset.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Corpus Scriptura" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Corpus Scriptura",
    description: "L’Écriture et ce que les Pères de l’Église en ont dit.",
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
        <ProvisionAffichageAdmin>
          <Navbar />
          <BandeauMobile />
          {/* Décalage sous la navbar fixe — voir app/lib/mesures.ts */}
          <div id="cs-corps" className="flex flex-col flex-1" style={{ paddingTop: HAUTEUR_NAVBAR }}>{children}</div>
        </ProvisionAffichageAdmin>
      </body>
    </html>
  );
}
