import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes écrits",
};

export default function MesEcritsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
