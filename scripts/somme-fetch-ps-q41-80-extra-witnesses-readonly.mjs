import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  ),
  db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  ids = [
    "JOB.5.17",
    "PSA.1.1",
    "PRO.3.13",
    "1CO.6.18",
    "ROM.3.8",
    "JAS.2.10",
    "GAL.5.20",
    "MAT.6.12",
    "WIS.1.13",
    "ACT.10.34",
    "ROM.8.28",
    "EPH.4.23",
    "MAT.4.23",
    "PSA.79.17",
  ];
const { data, error } = await db
  .from("versets_lecture")
  .select(
    'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"',
  )
  .in("id_verset", ids);
if (error) throw error;
writeFileSync(
  "tmp/somme-liens-audit-2026-07-29/ps-q41-80-extra-witnesses.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      requested: ids.length,
      received: data.length,
      missing: ids.filter((id) => !data.some((x) => x.id_verset === id)),
    },
    null,
    2,
  ),
);
