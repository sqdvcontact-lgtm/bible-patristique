import type { Metadata } from "next";
import { HORS_INDEX } from "@/app/lib/metadonneesSeo";
import CadreEspace from "./EspaceCompte";

// Espace personnel : il ne regarde que son titulaire, donc aucun index.
//
// ⚠️ `robots` se pose ICI et nulle part ailleurs. Les métadonnées d'un layout
// descendent sur toutes ses pages : une rubrique qui redéclarerait `robots` pour
// changer son titre risquerait de laisser l'espace entrer à l'index. Les rubriques
// ne posent donc que leur `title`.
export const metadata: Metadata = {
  robots: HORS_INDEX,
  title: "Mon compte",
};

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return <CadreEspace>{children}</CadreEspace>;
}
