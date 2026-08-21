import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bienvenue",
};

export default function BienvenueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
