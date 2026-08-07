import type { Metadata } from "next";

import Bible899Reader from "./Bible899Reader";
import { loadBible899Edition } from "./_lib/manifest";

export const metadata: Metadata = {
  title: "Bible française du XIIIe siècle, BnF Français 899",
  description:
    "Lecteur expérimental du manuscrit BnF Français 899 avec transcription diplomatique et abréviations développées.",
};

// La colonne peut être fournie par un lien de provenance (`?colonne=f297r_a`).
// La route doit donc être rendue à la requête, même si le TEI reste local.
export const dynamic = "force-dynamic";

export default async function Bible899Page({
  searchParams,
}: {
  searchParams: Promise<{ colonne?: string }>;
}) {
  const params = await searchParams;
  const edition = await loadBible899Edition();
  return <Bible899Reader edition={edition} initialColumn={params.colonne} />;
}
