import type { Metadata } from "next";

// La page du chantier est un composant client : elle ne peut pas exporter ses
// propres métadonnées. Un `document.title` posé dans un effet se fait écraser
// par celles de la mise en page racine ; ce layout serveur est la voie prévue.
export const metadata: Metadata = {
  title: "Corpus Scriptura – site en travaux",
  description:
    "L’Écriture et ce que les Pères en ont dit. Le site est en cours de préparation : laissez votre adresse pour être prévenu de son ouverture.",
};

export default function ChantierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
