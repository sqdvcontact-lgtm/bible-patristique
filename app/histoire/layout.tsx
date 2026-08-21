import type { Metadata } from "next";

// La page Histoire est un composant client ; son titre passe par ce layout serveur.
export const metadata: Metadata = {
  title: "Histoire de l’Église",
  description:
    "Une frise chronologique des Pères, des œuvres et des grands événements de l’histoire de l’Église.",
};

export default function HistoireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
