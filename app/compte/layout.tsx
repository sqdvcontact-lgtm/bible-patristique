import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon compte",
};

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
