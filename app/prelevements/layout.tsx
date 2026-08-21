import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes citations",
};

export default function PrelevementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
