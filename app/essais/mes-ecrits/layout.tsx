import type { Metadata } from "next";
import { HORS_INDEX } from "@/app/lib/metadonneesSeo";

// Espace personnel : il ne regarde que son titulaire, donc aucun index. ⚠️ Les
// publications elles-mêmes, elles, s'indexent : c'est la vue « mes écrits » qui
// est privée, non ce qu'elle liste.
export const metadata: Metadata = {
  robots: HORS_INDEX,
  title: "Mes écrits",
};

export default function MesEcritsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
