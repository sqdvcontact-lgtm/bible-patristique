import type { Metadata } from "next";

import Bible899Reader from "./Bible899Reader";
import { loadBible899ReaderEdition } from "./_lib/manifest";

export const metadata: Metadata = {
  title: "Bible française du XIIIe siècle, BnF Français 899",
  description:
    "Lecteur expérimental du manuscrit BnF Français 899 avec transcription diplomatique et abréviations développées.",
};

export default async function Bible899Page({
  searchParams,
}: {
  searchParams: Promise<{ colonne?: string }>;
}) {
  const params = await searchParams;
  const edition = await loadBible899ReaderEdition(params.colonne);
  return <Bible899Reader edition={edition} />;
}
