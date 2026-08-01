import type { Metadata } from "next";

// La page est un composant client ; le titre passe par ce layout serveur, sans
// quoi la mise en page racine l'écraserait.
export const metadata: Metadata = {
  title: "Contact",
  description: "Écrire à l’éditeur de Corpus Scriptura : question, signalement, exercice de vos droits sur vos données.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
