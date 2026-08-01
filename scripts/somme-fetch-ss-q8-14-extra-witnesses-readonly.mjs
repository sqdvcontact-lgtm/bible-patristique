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
  ids = ["MAT.13.29", "MAT.13.30", "TIT.3.10", "PRO.6.14"];
const { data, error } = await db
  .from("versets_lecture")
  .select(
    'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"',
  )
  .in("id_verset", ids);
if (error) throw error;
writeFileSync(
  "tmp/somme-liens-audit-2026-07-29/ss-q8-14-extra-witnesses.json",
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
