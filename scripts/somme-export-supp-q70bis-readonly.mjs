import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const R = "tmp/somme-liens-audit-2026-07-29";
mkdirSync(R, { recursive: true });
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw Error(`${label}: ${error.message}`);
  return data;
};
const settings = await must(
  db
    .from("parametres")
    .select("cle,valeur,mis_a_jour")
    .in("cle", ["charte_ia", "feedback_liens_protocole"]),
  "parametres",
);
const parameters = Object.fromEntries(
  settings.map((x) => [
    x.cle,
    {
      mis_a_jour: x.mis_a_jour,
      sha256: createHash("sha256")
        .update(String(x.valeur ?? ""))
        .digest("hex"),
    },
  ]),
);
const segments = await must(
  db
    .from("segments")
    .select("*")
    .eq("id_oeuvre", "A0013O0002")
    .eq("ref_niv1", "Supplément")
    .eq("ref_niv2", "Question 70 bis")
    .order("segment_numero"),
  "segments",
);
const links = await must(
  db
    .from("liens_bibliques")
    .select("*")
    .in(
      "segment_id",
      segments.map((x) => x.id),
    )
    .order("id"),
  "liens",
);
const ids = [...new Set(links.map((x) => x.canon_id).filter(Boolean))];
const witnesses = ids.length
  ? await must(
      db
        .from("versets_lecture")
        .select(
          'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"',
        )
        .in("id_verset", ids),
      "témoins",
    )
  : [];
const payload = {
  exported_at: new Date().toISOString(),
  parameters,
  scope: {
    oeuvre: "A0013O0002",
    partie: "Supplément",
    question: "Question 70 bis",
  },
  segments,
  links,
  witnesses,
};
writeFileSync(
  `${R}/supp-q70bis-raw.json`,
  `${JSON.stringify(payload, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      segments: segments.length,
      range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
      links: links.length,
      link_ids: links.map((x) => x.id),
      witnesses: witnesses.length,
      marked: segments.filter(
        (x) => x.liens_revus_le && x.liens_revus_par === "IA-lecture",
      ).length,
      markers: Object.fromEntries(
        [...new Set(segments.map((x) => x.liens_revus_par))].map((marker) => [
          String(marker),
          segments.filter((x) => x.liens_revus_par === marker).length,
        ]),
      ),
      types: Object.fromEntries(
        [1, 2, 3, 4].map((type) => [
          type,
          links.filter((x) => x.type === type).length,
        ]),
      ),
      provisional: links.filter(
        (x) =>
          x.fiabilite !== "vérifié" ||
          x.provenance !== "lecture" ||
          x.arbitrage_requis,
      ).length,
    },
    null,
    2,
  ),
);
