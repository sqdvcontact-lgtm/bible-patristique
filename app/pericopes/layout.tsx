import type { Metadata } from "next";

// Le catalogue des péricopes est un composant client ; son titre passe par ce layout serveur.
export const metadata: Metadata = {
  title: "Les péricopes",
  description:
    "Le catalogue des péricopes bibliques, passage par passage, avec leurs notices et leurs correspondances patristiques.",
};

export default function PericopesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
