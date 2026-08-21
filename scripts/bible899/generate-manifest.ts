import { writeBible899Manifest } from "../../app/manuscrits/bible-899/_lib/manifest";

async function main(): Promise<void> {
  try {
    const manifest = await writeBible899Manifest();
    console.log(`Manifeste Bible 899 régénéré : ${manifest.teiSha256}`);
    console.log(
      `Folios ${manifest.counts.folios}, colonnes ${manifest.counts.columns}, lignes ${manifest.counts.lines}, choice ${manifest.counts.choice}, gap ${manifest.counts.gap}, unclear ${manifest.counts.unclear}, add ${manifest.counts.add}, réclames ${manifest.counts.catchword}`,
    );
    console.log(`Images vérifiées : ${manifest.images.length}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
