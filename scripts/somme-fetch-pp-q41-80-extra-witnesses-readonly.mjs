import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, "")]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = ["SIR.24.9", "GEN.1.14", "PSA.148.8"];
const { data, error } = await db.from("versets_lecture").select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in("id_verset", ids);
if (error) throw error;
writeFileSync("tmp/somme-liens-audit-2026-07-29/pp-q41-80-extra-witnesses.json", `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ requested: ids.length, received: data.length, missing: ids.filter((id) => !data.some((row) => row.id_verset === id)) }, null, 2));
