import type { Metadata } from "next";

import Bible899Reader from "./Bible899Reader";
import { loadBible899Edition } from "./_lib/manifest";

export const metadata: Metadata = {
  title: "Bible française du XIIIe siècle, BnF Français 899",
  description:
    "Lecteur expérimental du manuscrit BnF Français 899 avec transcription diplomatique, abréviations développées et graphie modernisée.",
};

export const dynamic = "force-static";

export default async function Bible899Page() {
  const edition = await loadBible899Edition();
  return <Bible899Reader edition={edition} />;
}
