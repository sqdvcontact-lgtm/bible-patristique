import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const WORK_ID = "A0010O0023";
const EXPECTED_SEGMENTS = 3262;
const AUDIT_ROOT = resolve("audit/heptateuque-revision-affichage-2026-08-02");

const LIVRES = new Map([
  ["Livre premier — Questions sur la Genèse", ["Livre premier", "Questions sur la Genèse"]],
  ["Livre deuxième — Questions sur l’Exode", ["Livre deuxième", "Questions sur l’Exode"]],
  ["Livre troisième — Questions sur le Lévitique", ["Livre troisième", "Questions sur le Lévitique"]],
  ["Livre quatrième — Questions sur les Nombres", ["Livre quatrième", "Questions sur les Nombres"]],
  ["Livre cinquième — Questions sur le Deutéronome", ["Livre cinquième", "Questions sur le Deutéronome"]],
  ["Livre sixième — Questions sur Josué", ["Livre sixième", "Questions sur Josué"]],
  ["Livre septième — Questions sur les Juges", ["Livre septième", "Questions sur les Juges"]],
  ["Livre premier", ["Livre premier", "Questions sur la Genèse"]],
  ["Livre deuxième", ["Livre deuxième", "Questions sur l’Exode"]],
  ["Livre troisième", ["Livre troisième", "Questions sur le Lévitique"]],
  ["Livre quatrième", ["Livre quatrième", "Questions sur les Nombres"]],
  ["Livre cinquième", ["Livre cinquième", "Questions sur le Deutéronome"]],
  ["Livre sixième", ["Livre sixième", "Questions sur Josué"]],
  ["Livre septième", ["Livre septième", "Questions sur les Juges"]],
]);
const LIVRES_REFERENCES = new Map([
  ["gen.", "Genèse"], ["exod.", "Exode"], ["lev.", "Lévitique"],
  ["nomb.", "Nombres"], ["deut.", "Deutéronome"], ["jos.", "Josué"],
  ["juges.", "Juges"],
]);

function entierRomain(romain) {
  const valeurs = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < romain.length; i++) {
    const courant = valeurs[romain[i]] ?? 0;
    const suivant = valeurs[romain[i + 1]] ?? 0;
    total += courant < suivant ? -courant : courant;
  }
  return total;
}

function livreReference(titreLong) {
  return titreLong.replace(/^Questions sur (?:la |le |les |l’)/u, "");
}

function normaliserLigneReference(ligne, titreLong) {
  const m = ligne.trim().match(/^\(?\s*(Gen\.|Exod\.|Lev\.|Nomb\.|Deut\.|Jos\.|Juges\.?|Ib[.,]*)\s*(.+?)\s*\)?$/iu);
  if (!m) return ligne;
  const prefixe = m[1].toLowerCase();
  const livre = prefixe.startsWith("ib")
    ? livreReference(titreLong)
    : prefixe.startsWith("juges") ? "Juges" : LIVRES_REFERENCES.get(prefixe);
  const parties = m[2].replace(/[.]$/, "").split(/\s*;\s*/);
  const references = parties.map((partie) => {
    const ref = partie.match(/^([IVXLCDM]+|\d+)(?:\s*[,.]\s*(.+))?$/iu);
    if (!ref) return null;
    const chapitre = /^\d+$/.test(ref[1]) ? Number(ref[1]) : entierRomain(ref[1].toUpperCase());
    const versets = ref[2]?.replace(/\.\s*(?=\d)/g, ", ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s*-\s*/g, "-")
      .replace(/[.]$/, "").trim();
    return versets ? `${chapitre}, ${versets}` : String(chapitre);
  });
  return livre && references.every(Boolean) ? `${livre} ${references.join(" ; ")}` : ligne;
}

function normaliserReference(texte, titreLong) {
  if (!texte) return texte;
  return texte.split("\n").map((ligne) => normaliserLigneReference(ligne, titreLong)).join("\n");
}

const italiserSic = (texte) => texte == null ? texte : texte.replace(/\[sic\]/giu, "[<i>sic</i>]");

function sansBalisage(texte) {
  return String(texte ?? "").replace(/<\/?i>/g, "").replace(/\[\[\d+\]\]/g, "N");
}

function corrigerTypographie(texte) {
  if (texte == null) return texte;
  return texte
    .replace(/'/g, "’")
    .replace(/\.\.\./g, "…")
    .replace(/[ \u00a0\u202f]+([,.])/g, "$1")
    .replace(/[ \u00a0\u202f]+([;!?])/g, "\u202f$1")
    .replace(/[ \u202f]+:/g, "\u00a0:")
    .replace(/«[ \u00a0\u202f]*/g, "«\u202f")
    .replace(/[ \u00a0\u202f]*»/g, "\u202f»")
    .replace(/\s+[–—]\s+/g, " - ")
    .replace(/ {2,}/g, " ");
}

function auditTypographique(rows) {
  const champs = rows.flatMap((row) => [row.segment_texte, row.ref_niv1, row.ref_niv1_texte, row.ref_niv2, row.ref_niv2_texte, row.notes]).filter(Boolean);
  const textes = champs.map(sansBalisage);
  const compte = (regex) => textes.reduce((n, texte) => n + [...texte.matchAll(regex)].length, 0);
  const compteBrut = (regex) => champs.reduce((n, texte) => n + [...texte.matchAll(regex)].length, 0);
  const ouvrantsItal = champs.reduce((n, texte) => n + (texte.match(/<i>/g)?.length ?? 0), 0);
  const fermantsItal = champs.reduce((n, texte) => n + (texte.match(/<\/i>/g)?.length ?? 0), 0);
  return {
    apostrophes_droites: compte(/[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/g),
    points_suspension_ascii: compte(/\.\.\./g),
    doubles_espaces: compteBrut(/ {2,}/g),
    espaces_avant_point_ou_virgule: compteBrut(/ +[,.]/g),
    espaces_ordinaires_avant_ponctuation_haute: compteBrut(/ [;:!?]/g),
    guillemets_francais_ouvrants: compte(/«/g),
    guillemets_francais_fermants: compte(/»/g),
    balises_italiques_ouvrantes: ouvrantsItal,
    balises_italiques_fermantes: fermantsItal,
    sic_italiques: champs.reduce((n, texte) => n + (texte.match(/\[<i>sic<\/i>\]/g)?.length ?? 0), 0),
    sic_non_italiques: champs.reduce((n, texte) => n + (texte.match(/\[sic\]/g)?.length ?? 0), 0),
  };
}

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, "")]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Variables Supabase absentes.");
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function tousLesSegments() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("segments")
      .select("id,id_oeuvre,segment_numero,segment_texte,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,notes,nature,paragraphe,rang,page")
      .eq("id_oeuvre", WORK_ID).order("segment_numero").range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const avant = await tousLesSegments();
if (avant.length !== EXPECTED_SEGMENTS) throw new Error(`Nombre de segments inattendu : ${avant.length}.`);
const revisions = avant.map((row) => {
  const livre = LIVRES.get(row.ref_niv1);
  if (!livre) throw new Error(`Livre inattendu au segment ${row.segment_numero} : ${row.ref_niv1}`);
  return {
    id: row.id,
    segment_numero: row.segment_numero,
    segment_texte: italiserSic(corrigerTypographie(row.segment_texte)),
    ref_niv1: livre[0],
    ref_niv1_texte: livre[1],
    ref_niv2: italiserSic(corrigerTypographie(row.ref_niv2)),
    ref_niv2_texte: italiserSic(corrigerTypographie(normaliserReference(row.ref_niv2_texte, livre[1]))),
    notes: italiserSic(corrigerTypographie(row.notes)),
  };
});
const restesReferences = revisions.filter((row) => String(row.ref_niv2_texte ?? "").split("\n")
  .some((ligne) => /^\s*(?:Ib[.,]*|Gen\.|Exod\.|Lev\.|Nomb\.|Deut\.|Jos\.|Juges\.)(?:\s|$)/iu.test(ligne)));
if (restesReferences.length) throw new Error(`${restesReferences.length} référence(s) ancienne(s) non normalisée(s) : ${JSON.stringify(restesReferences.slice(0, 20))}`);

mkdirSync(AUDIT_ROOT, { recursive: true });
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const rapport = {
  generated_at: new Date().toISOString(), apply: APPLY, oeuvre: WORK_ID,
  segments: avant.length,
  livres_avant: [...new Set(avant.map((row) => row.ref_niv1))],
  livres_apres: [...new Set(revisions.map((row) => `${row.ref_niv1} | ${row.ref_niv1_texte}`))],
  references_modifiees: revisions.filter((row, i) => row.ref_niv2_texte !== avant[i].ref_niv2_texte).length,
  audit_typographique: auditTypographique(avant),
  audit_typographique_prevision: auditTypographique(avant.map((row, i) => ({ ...row, ...revisions[i] }))),
  hash_avant: hash(avant.map(({ id, ...row }) => row)),
};
writeFileSync(resolve(AUDIT_ROOT, "rapport-avant.json"), `${JSON.stringify(rapport, null, 2)}\n`);
const ecartsGuillemets = avant.map((row) => {
  const texte = row.segment_texte ?? "";
  return {
    segment_numero: row.segment_numero,
    page: row.page,
    ouvrants: texte.match(/«/g)?.length ?? 0,
    fermants: texte.match(/»/g)?.length ?? 0,
    texte,
  };
}).filter((row) => row.ouvrants !== row.fermants);
writeFileSync(resolve(AUDIT_ROOT, "guillemets-a-revoir.json"), `${JSON.stringify({
  generated_at: new Date().toISOString(),
  avertissement: "Une différence par segment peut être légitime quand une citation traverse plusieurs segments ; la différence globale doit en revanche être arbitrée contre le fac-similé.",
  ecart_global: rapport.audit_typographique.guillemets_francais_ouvrants - rapport.audit_typographique.guillemets_francais_fermants,
  segments: ecartsGuillemets,
}, null, 2)}\n`);

if (APPLY) {
  const controleSql = `
do $controle$
declare n integer;
begin
  select count(*) into n from segments where id_oeuvre='${WORK_ID}';
  if n<>${EXPECTED_SEGMENTS} then raise exception 'Segments avant révision : %', n; end if;
end $controle$;`;
  const controle = await db.rpc("exec_sql", { sql: controleSql });
  if (controle.error) throw new Error(controle.error.message);
  const batchSize = 250;
  for (let offset = 0; offset < revisions.length; offset += batchSize) {
    const json = JSON.stringify(revisions.slice(offset, offset + batchSize)).replaceAll("'", "''");
    const sql = `
with corrections as (
  select * from jsonb_to_recordset('${json}'::jsonb)
    as x(id bigint, segment_numero integer, segment_texte text, ref_niv1 text, ref_niv1_texte text, ref_niv2 text, ref_niv2_texte text, notes text)
)
update segments s
set segment_texte=c.segment_texte,
    ref_niv1=c.ref_niv1,
    ref_niv1_texte=c.ref_niv1_texte,
    ref_niv2=c.ref_niv2,
    ref_niv2_texte=c.ref_niv2_texte,
    notes=c.notes
from corrections c
where s.id=c.id and s.id_oeuvre='${WORK_ID}' and s.segment_numero=c.segment_numero;`;
    const { error } = await db.rpc("exec_sql", { sql });
    if (error) throw new Error(`Lot ${offset + 1}-${Math.min(offset + batchSize, revisions.length)} : ${error.message}`);
  }
  const apres = await tousLesSegments();
  const attendu = revisions.map((row) => [row.id, row.segment_numero, row.segment_texte, row.ref_niv1, row.ref_niv1_texte, row.ref_niv2, row.ref_niv2_texte, row.notes]);
  const obtenu = apres.map((row) => [row.id, row.segment_numero, row.segment_texte, row.ref_niv1, row.ref_niv1_texte, row.ref_niv2, row.ref_niv2_texte, row.notes]);
  if (JSON.stringify(attendu) !== JSON.stringify(obtenu)) throw new Error("La relecture en base diffère de la révision attendue.");
  const final = {
    ...rapport,
    applied_at: new Date().toISOString(),
    hash_apres: hash(apres.map(({ id, ...row }) => row)),
    audit_typographique_apres: auditTypographique(apres),
  };
  writeFileSync(resolve(AUDIT_ROOT, "rapport-apres.json"), `${JSON.stringify(final, null, 2)}\n`);
  console.log(JSON.stringify(final, null, 2));
} else {
  console.log(JSON.stringify(rapport, null, 2));
}
