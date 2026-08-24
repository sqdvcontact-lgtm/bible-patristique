import type { Metadata } from "next";
import { HORS_INDEX } from "@/app/lib/metadonneesSeo";

// Page d'accueil d'un compte tout juste créé : elle n'a de sens que pour celui
// qui vient de s'inscrire, et n'a rien à faire dans un index.
export const metadata: Metadata = {
  robots: HORS_INDEX,
  title: "Bienvenue",
};

export default function BienvenueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
