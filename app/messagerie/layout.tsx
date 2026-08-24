import type { Metadata } from "next";
import { HORS_INDEX } from "@/app/lib/metadonneesSeo";

// Espace personnel : il ne regarde que son titulaire, donc aucun index.
export const metadata: Metadata = {
  robots: HORS_INDEX,
  title: "Messages",
};

export default function MessagerieLayout({ children }: { children: React.ReactNode }) {
  return children;
}
