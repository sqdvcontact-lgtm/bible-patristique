import type { Metadata } from "next";

// La page Polyglotte est un composant client ; son titre passe par ce layout serveur.
export const metadata: Metadata = {
  title: "Bible polyglotte",
  description:
    "Un même passage biblique en plusieurs traductions françaises de référence, présentées en regard.",
};

export default function PolyglotteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
