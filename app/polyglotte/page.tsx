"use client";

// ────────────────────────────────────────────────────────────────────────────
// Page « Polyglotte » — comparaison des traductions, outil de suivi de la refonte.
// Quatre onglets (Ancien Testament / Psaumes / Nouveau Testament / Écrits non
// canoniques) ; la page s'ouvre vide, un onglet charge TOUTE sa portion sur une
// seule page défilante. Rendu par livre avec content-visibility:auto (seules les
// sections visibles sont calculées). Jusqu'à 4 traductions en parallèle, choisies
// directement dans l'en-tête du tableau ; numérotation propre de chaque édition collée
// au texte, lignes problématiques en rouge, zébrage une ligne sur deux.
// En mode admin, un clic sur une cellule permet de corriger le verset (route serveur).
// Écran large requis : la page est signalée indisponible sous 820 px.
// ────────────────────────────────────────────────────────────────────────────

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Livre = { code: string; nom_fr: string; ordre: number };
type Trad = { trad_id: string; nom: string; ordre: number | null };
type Point = { livre: string | null; reference: string | null; type: string | null; description: string | null; statut: string | null; notes: string | null };
type CanonRow = { id: string; livre: string; ch_canon: number; v_canon: number; est_suscription: boolean };
type V2Row = { id: string; canon_id: string | null; livre: string; trad_id: string; ch_orig: number; v_orig: number; texte: string | null };

// Certaines éditions portent un enrichissement typographique dans le texte, sous la seule
// forme <i>…</i> (Sacy 1730 : mots ajoutés par le traducteur, absents de la Vulgate).
// On le rend en vrais éléments React — jamais via dangerouslySetInnerHTML.
function texteEnrichi(t: string | null) {
  if (!t) return null;
  if (!t.includes("<i>")) return t;
  return t.split(/(<i>[\s\S]*?<\/i>)/g).filter(Boolean).map((bout, i) =>
    bout.startsWith("<i>")
      ? <i key={i}>{bout.slice(3, -4)}</i>
      : <span key={i}>{bout}</span>
  );
}

const VERT = "#3d6b4f";
const ROUGE = "#b3261e";
const ROUGE_FOND = "#fbeceb";
const SURNUM = "#5a4b9c";       // versets propres à la Septante (hors ossature canonique)
const SURNUM_FOND = "#f0eef9";
const NB_SLOTS = 4;
const ORDRE_NT = 52;
const ORDRE_CANON_MAX = 78;     // au-delà : écrits non canoniques
const FOND = "#f6f2e8";         // fond commun aux autres pages du site

// ── Analyse des points sensibles → ensembles de versets/chapitres concernés ──
function construireSensibilite(points: Point[]) {
  const chap = new Set<string>();
  const vers = new Set<string>();
  const libelle = new Map<string, string[]>();
  const addChap = (l: string, c: number, desc: string) => { chap.add(`${l}|${c}`); const k = `${l}|${c}`; libelle.set(k, [...(libelle.get(k) ?? []), desc]); };
  const addVers = (l: string, c: number, v: number, desc: string) => { vers.add(`${l}|${c}|${v}`); const k = `${l}|${c}`; libelle.set(k, [...(libelle.get(k) ?? []), desc]); };

  for (const p of points) {
    const ref = (p.reference ?? "").trim();
    const desc = `${p.type ?? ""} — ${p.description ?? ""}`.trim();
    if (/^([1-4]?[A-Z]{2,3})(\/[1-4]?[A-Z]{2,3})+$/.test(ref)) { for (const code of ref.split("/")) addChap(code, 0, desc); continue; }
    if (/\(\d+\s+psaumes?\)/i.test(ref) && p.notes) { const nums = (p.notes.match(/\d+/g) ?? []).map(Number).filter(n => n >= 1 && n <= 150); for (const n of nums) addChap("PSA", n, desc); continue; }
    let dernierLivre = p.livre && /^[1-4]?[A-Z]{2,3}$/.test(p.livre) ? p.livre : "";
    for (let tok of ref.split(/[\/,]/)) {
      tok = tok.trim(); if (!tok) continue;
      const m = tok.match(/^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?(?:\s*-\s*(\d+))?$/);
      if (!m) continue;
      const l = m[1] || dernierLivre; if (!l) continue; dernierLivre = l;
      const c = Number(m[2]);
      if (m[3]) { const v1 = Number(m[3]); const v2 = m[4] ? Number(m[4]) : v1; for (let v = v1; v <= v2; v++) addVers(l, c, v, desc); }
      else if (m[5]) { for (let cc = c; cc <= Number(m[5]); cc++) addChap(l, cc, desc); }
      else addChap(l, c, desc);
    }
  }
  const estSensible = (l: string, c: number, v: number) => chap.has(`${l}|0`) || chap.has(`${l}|${c}`) || vers.has(`${l}|${c}|${v}`);
  return { estSensible, libelle };
}

// Chargement paginé parallèle (1000 lignes/requête)
async function fetchPaged<T>(table: string, cols: string, addFilters: (q: any) => any): Promise<T[]> {
  const { count } = await addFilters(supabase.from(table).select(cols, { count: "exact", head: true }));
  const pages = Math.max(1, Math.ceil((count || 0) / 1000));
  const reqs = Array.from({ length: pages }, (_, p) => addFilters(supabase.from(table).select(cols)).order("id").range(p * 1000, p * 1000 + 999));
  const res = await Promise.all(reqs);
  return res.flatMap(r => (r.data ?? []) as T[]);
}

type Onglet = "AT" | "PSA" | "NT" | "AUTRES";
const ONGLETS: Onglet[] = ["AT", "PSA", "NT", "AUTRES"];
const LIBELLE_ONGLET: Record<Onglet, string> = {
  AT: "Ancien Testament", PSA: "Psaumes", NT: "Nouveau Testament", AUTRES: "Écrits non canoniques",
};

export default function PolyglottePage() {
  const [livres, setLivres] = useState<Livre[]>([]);
  const [trads, setTrads] = useState<Trad[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [onglet, setOnglet] = useState<Onglet | null>(null);   // la page s'ouvre vide : on choisit un ensemble
  const [slots, setSlots] = useState<string[]>([]);
  const [canon, setCanon] = useState<CanonRow[]>([]);
  const [v2, setV2] = useState<V2Row[]>([]);
  const [sensiblesOnly, setSensiblesOnly] = useState(false);
  const [surnumOnly, setSurnumOnly] = useState(false);
  const [livreChoisi, setLivreChoisi] = useState<string | null>(null);  // un seul livre à la fois
  const [toutAfficher, setToutAfficher] = useState(false);              // …sauf demande explicite
  const [loading, setLoading] = useState(false);
  // Édition en place (admin). L'affordance dépend du client, mais l'autorisation réelle
  // est revérifiée côté serveur par /api/admin/verset-modifier (charte §17).
  const [estAdmin, setEstAdmin] = useState(false);
  const [enEdition, setEnEdition] = useState<string | null>(null);   // id du verset édité
  const [brouillon, setBrouillon] = useState("");
  const [enregistre, setEnregistre] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");

  const sens = useMemo(() => construireSensibilite(points), [points]);
  const ordreDe = useMemo(() => new Map(livres.map(l => [l.code, l.ordre])), [livres]);

  // Chargement initial (livres, points, traductions migrées)
  useEffect(() => {
    supabase.from("livres").select("code, nom_fr, ordre").order("ordre").then(({ data }) => setLivres(data ?? []));
    supabase.from("points_sensibles").select("livre, reference, type, description, statut, notes").then(({ data }) => setPoints(data ?? []));
    (async () => {
      const { data: tr } = await supabase.from("traductions").select("trad_id, nom, ordre").order("ordre");
      const migres: Trad[] = [];
      for (const t of tr ?? []) {
        const { count } = await supabase.from("versets_v2").select("trad_id", { count: "exact", head: true }).eq("trad_id", t.trad_id);
        if ((count ?? 0) > 0) migres.push({ trad_id: t.trad_id, nom: t.nom, ordre: t.ordre });
      }
      setTrads(migres);
      setSlots(Array.from({ length: NB_SLOTS }, (_, i) => migres[i]?.trad_id ?? ""));
    })();
    // l'utilisateur connecté est-il admin ? (affichage seulement — le serveur revérifie)
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) return;
      const { data: p } = await supabase.from("profils").select("est_admin").eq("id", uid).maybeSingle();
      setEstAdmin(p?.est_admin === true);
    })();
  }, []);

  // Enregistrement d'un verset modifié
  const enregistrerVerset = useCallback(async (id: string, texte: string) => {
    setEnregistre("envoi");
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    const res = await fetch("/api/admin/verset-modifier", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, texte }),
    });
    if (res.ok) {
      setV2(rows => rows.map(r => (r.id === id ? { ...r, texte } : r)));   // mise à jour locale
      setEnregistre("ok"); setEnEdition(null);
      setTimeout(() => setEnregistre("idle"), 1500);
    } else setEnregistre("erreur");
  }, []);

  // Livres de l'onglet courant (dans l'ordre canonique)
  const livresOnglet = useMemo(() => {
    if (!onglet) return [];
    if (onglet === "PSA") return livres.filter(l => l.code === "PSA");
    if (onglet === "NT") return livres.filter(l => l.ordre >= ORDRE_NT && l.ordre <= ORDRE_CANON_MAX);
    if (onglet === "AUTRES") return livres.filter(l => l.ordre > ORDRE_CANON_MAX);
    return livres.filter(l => l.ordre < ORDRE_NT && l.code !== "PSA");
  }, [livres, onglet]);

  // Un onglet ouvre son PREMIER livre ; « tout afficher » lève la restriction.
  useEffect(() => {
    setLivreChoisi(livresOnglet[0]?.code ?? null);
    setToutAfficher(false);
  }, [onglet, livresOnglet]);

  // Livres réellement rendus (et chargés) : un seul, sauf « tout afficher »
  const livresAffiches = useMemo(
    () => (toutAfficher ? livresOnglet : livresOnglet.filter(l => l.code === livreChoisi)),
    [livresOnglet, livreChoisi, toutAfficher]
  );

  // Chargement de tout l'onglet (canon + traductions migrées)
  const charger = useCallback(async () => {
    if (!livresAffiches.length || !trads.length) return;
    setLoading(true);
    const codes = livresAffiches.map(l => l.code);
    const tradIds = trads.map(t => t.trad_id);
    const [c, vv] = await Promise.all([
      fetchPaged<CanonRow>("versets_canon", "id, livre, ch_canon, v_canon, est_suscription", q => q.in("livre", codes)),
      fetchPaged<V2Row>("versets_v2", "id, canon_id, livre, trad_id, ch_orig, v_orig, texte", q => q.in("livre", codes).in("trad_id", tradIds)),
    ]);
    c.sort((a, b) => (ordreDe.get(a.livre)! - ordreDe.get(b.livre)!) || (a.ch_canon - b.ch_canon) || (a.v_canon - b.v_canon));
    setCanon(c); setV2(vv); setLoading(false);
  }, [livresAffiches, trads, ordreDe]);
  useEffect(() => { charger(); }, [charger]);

  // Index (canon_id, trad_id) → cellule ; canon groupé par livre
  const cellule = useMemo(() => {
    const m = new Map<string, V2Row[]>();
    for (const r of v2) { const k = `${r.canon_id}|${r.trad_id}`; m.set(k, [...(m.get(k) ?? []), r]); }
    // versets fusionnés (many→1) : afficher dans l'ordre d'origine (ch_orig, v_orig)
    for (const arr of m.values()) if (arr.length > 1) arr.sort((a, b) => a.ch_orig - b.ch_orig || a.v_orig - b.v_orig);
    return m;
  }, [v2]);
  const parLivre = useMemo(() => {
    const m = new Map<string, CanonRow[]>();
    for (const r of canon) m.set(r.livre, [...(m.get(r.livre) ?? []), r]);
    return m;
  }, [canon]);

  // Surnuméraires (versets sans slot canon) ancrés à leur position logique : après le
  // dernier verset mappé de la MÊME traduction (ordre livre → chapitre → verset d'origine).
  const { surnumApres, surnumStart, surnumCount, surnumParLivre } = useMemo(() => {
    const apres = new Map<string, V2Row[]>();   // canon_id → surnuméraires qui le suivent
    const start = new Map<string, V2Row[]>();   // livre → surnuméraires en tête de livre
    const count = new Map<string, number>();    // livre → nb (pour l'estimation de hauteur)
    const parLiv = new Map<string, V2Row[]>();  // livre → tous les surnuméraires (vue « seulement »)
    const parTrad = new Map<string, V2Row[]>();
    for (const r of v2) (parTrad.get(r.trad_id) ?? parTrad.set(r.trad_id, []).get(r.trad_id)!).push(r);
    for (const rows of parTrad.values()) {
      rows.sort((a, b) => (ordreDe.get(a.livre) ?? 999) - (ordreDe.get(b.livre) ?? 999) || a.ch_orig - b.ch_orig || a.v_orig - b.v_orig);
      let last: string | null = null, curLivre: string | null = null;
      for (const r of rows) {
        if (r.livre !== curLivre) { curLivre = r.livre; last = null; }
        if (r.canon_id) { last = r.canon_id; continue; }
        count.set(r.livre, (count.get(r.livre) ?? 0) + 1);
        (parLiv.get(r.livre) ?? parLiv.set(r.livre, []).get(r.livre)!).push(r);
        if (last) (apres.get(last) ?? apres.set(last, []).get(last)!).push(r);
        else (start.get(r.livre) ?? start.set(r.livre, []).get(r.livre)!).push(r);
      }
    }
    return { surnumApres: apres, surnumStart: start, surnumCount: count, surnumParLivre: parLiv };
  }, [v2, ordreDe]);

  const colonnes = slots.map(id => trads.find(t => t.trad_id === id)).filter((t): t is Trad => !!t);
  const nomDe = (code: string) => livres.find(l => l.code === code)?.nom_fr ?? code;
  const tmpl = `58px ${colonnes.map(() => "38px minmax(150px, 1fr)").join(" ")}`;
  const HAUT_ENTETE = 34;   // hauteur de l'en-tête collant, sous lequel se cale le titre du livre
  const HAUT_NAV = 8;       // léger décollement de la NavBar quand le tableau atteint le sommet

  return (
    <div style={{ background: FOND, minHeight: "100vh" }}>
      {/* La comparaison en colonnes exige une largeur d'écran : indisponible sur téléphone. */}
      <style>{`
        .poly-outil { display: block; }
        .poly-mobile { display: none; }
        @media (max-width: 820px) {
          .poly-outil { display: none; }
          .poly-mobile { display: block; }
        }
        /* bouton de modification : discret, révélé au survol de la cellule */
        .poly-cell { position: relative; }
        .poly-edit {
          position: absolute; top: 3px; right: 4px;
          opacity: 0; transition: opacity .12s;
          border: 1px solid #d9d2c4; background: #fff; color: #8a8378;
          border-radius: 4px; cursor: pointer; line-height: 1;
          padding: 2px 5px; font-size: 11px;
        }
        .poly-cell:hover .poly-edit { opacity: 1; }
        .poly-edit:hover { color: #3d6b4f; border-color: #3d6b4f; }
      `}</style>

      <div className="poly-mobile" style={{ maxWidth: 520, margin: "0 auto", padding: "48px 22px", fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#5b544c" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: VERT, margin: "0 0 14px" }}>Polyglotte</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Cette page compare plusieurs traductions côte à côte : elle demande un écran large.
          <br /><br />
          <strong>Ouvrez-la depuis un ordinateur ou une tablette.</strong>
        </p>
      </div>

      <div className="poly-outil" style={{ maxWidth: 1500, margin: "0 auto", padding: "12px 18px 60px", fontFamily: "system-ui, sans-serif", color: "#2a2620" }}>
        {/* Titre et onglets sur une même ligne */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 26, borderBottom: "1px solid #e0d9cc", paddingBottom: 2, flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 27, fontWeight: 400, letterSpacing: "0.02em", color: VERT, margin: 0, lineHeight: 1.1 }}>
            Polyglotte
          </h1>
          <div style={{ display: "flex", gap: 2, marginBottom: -3 }}>
            {ONGLETS.map(t => {
              const actif = onglet === t;
              return (
                <button key={t} onClick={() => setOnglet(t)}
                  style={{ padding: "7px 16px", fontSize: 13.5, fontWeight: actif ? 600 : 500, cursor: "pointer", border: "none", background: "none", fontFamily: "Georgia, serif", color: actif ? VERT : "#a8a094", borderBottom: actif ? `2px solid ${VERT}` : "2px solid transparent", transition: "color .15s" }}>
                  {LIBELLE_ONGLET[t]}
                </button>
              );
            })}
          </div>
          {onglet && (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", marginBottom: 4, alignItems: "center" }}>
              {livresOnglet.length > 1 && (
                <select value={toutAfficher ? "" : (livreChoisi ?? "")} disabled={toutAfficher}
                  onChange={e => setLivreChoisi(e.target.value)} aria-label="Livre biblique"
                  style={{ padding: "5px 10px", fontSize: 12.5, fontFamily: "Georgia, serif", color: toutAfficher ? "#b0a89e" : VERT, background: "#fff", border: "1px solid #ddd6c8", borderRadius: 999, cursor: toutAfficher ? "default" : "pointer", outline: "none", maxWidth: 210 }}>
                  {livresOnglet.map(l => <option key={l.code} value={l.code}>{l.nom_fr}</option>)}
                </select>
              )}
              {livresOnglet.length > 1 && (
                <button onClick={() => setToutAfficher(v => !v)}
                  title={toutAfficher ? "Revenir à un seul livre" : "Afficher tous les livres de l’onglet"}
                  style={{ padding: "5px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer", borderRadius: 999, fontFamily: "inherit",
                    border: `1px solid ${toutAfficher ? VERT : "#ddd6c8"}`, background: toutAfficher ? VERT : "transparent", color: toutAfficher ? "#fff" : "#8a8378", transition: "all .15s" }}>
                  Tout afficher
                </button>
              )}
              {([["sensibles", sensiblesOnly, ROUGE, "Lignes problématiques"], ["surnum", surnumOnly, SURNUM, "Surnuméraires"]] as const).map(([cle, actif, teinte, libelle]) => (
                <button key={cle}
                  onClick={() => {
                    if (cle === "sensibles") { setSensiblesOnly(!actif); if (!actif) setSurnumOnly(false); }
                    else { setSurnumOnly(!actif); if (!actif) setSensiblesOnly(false); }
                  }}
                  style={{ padding: "5px 13px", fontSize: 12, fontWeight: 500, cursor: "pointer", borderRadius: 999, fontFamily: "inherit",
                    border: `1px solid ${actif ? teinte : "#ddd6c8"}`, background: actif ? teinte : "transparent", color: actif ? "#fff" : "#8a8378", transition: "all .15s" }}>
                  {libelle}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aucun ensemble choisi : la page reste vide et l'explique */}
        {!onglet && (
          <div style={{ margin: "60px auto", maxWidth: 560, textAlign: "center", color: "#8a8378" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 17, color: VERT, margin: "0 0 10px" }}>Choisissez un ensemble à ouvrir</p>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
              Chaque onglet charge l'intégralité de sa portion de Bible en une seule page défilante.
              Sélectionnez <em>Ancien Testament</em>, <em>Psaumes</em>, <em>Nouveau Testament</em> ou <em>Écrits non canoniques</em> ci-dessus.
            </p>
          </div>
        )}

        {onglet && (
          <>
            {loading && <div style={{ fontSize: 12, color: "#a49b8c", margin: "8px 0 0" }}>chargement de {LIBELLE_ONGLET[onglet]}…</div>}

            {/* En-tête collant : la traduction se choisit ici même, sans étiquette parasite */}
            <div style={{ position: "sticky", top: HAUT_NAV, zIndex: 4, marginTop: 10, display: "grid", gridTemplateColumns: tmpl, background: VERT, color: "#fff", fontSize: 12, borderRadius: "6px 6px 0 0", overflow: "hidden", minHeight: HAUT_ENTETE, boxShadow: "0 1px 6px rgba(0,0,0,0.10)" }}>
              <div />
              {colonnes.map((c, k) => {
                const i = slots.indexOf(c.trad_id);
                return (
                  <div key={k} style={{ display: "contents" }}>
                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.18)" }} />
                    <div style={{ padding: "4px 8px", display: "flex", alignItems: "center" }}>
                      <select value={c.trad_id} aria-label={`Traduction ${k + 1}`}
                        onChange={e => setSlots(s => { const n = [...s]; n[i] = e.target.value; return n; })}
                        style={{ width: "100%", background: "transparent", color: "#fff", border: "none", borderBottom: "1px solid rgba(255,255,255,0.30)", padding: "3px 2px", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif", cursor: "pointer", appearance: "none", outline: "none" }}>
                        <option value="" style={{ color: "#2a2620" }}>— aucune —</option>
                        {trads.map(t => <option key={t.trad_id} value={t.trad_id} style={{ color: "#2a2620" }}>{t.nom}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Corps : un bloc par livre, rendu paresseux (content-visibility) */}
            <div style={{ border: "1px solid #e4ded3", borderTop: "none", borderRadius: "0 0 6px 6px", background: "#fff" }}>
              {colonnes.length === 0 && <div style={{ padding: 20, color: "#a49b8c" }}>Choisir au moins une traduction dans l’en-tête ci-dessus.</div>}
        {!loading && colonnes.length > 0 && livresAffiches.map(l => {
          // Ligne d'un verset surnuméraire (propre à la Septante, hors ossature) — violet.
          const ligneSurnum = (r: V2Row, cle: string) => (
            <div key={cle} style={{ display: "grid", gridTemplateColumns: tmpl, background: SURNUM_FOND, borderTop: "1px solid #e3e0f2", fontSize: 13.5 }}>
              <div title="Verset propre à la Septante — hors ossature canonique" style={{ padding: "6px 8px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 12, color: SURNUM, borderRight: `2px solid ${SURNUM}` }}>＋</div>
              {colonnes.map((t, i) => {
                const own = t.trad_id === r.trad_id;
                return (
                  <div key={i} style={{ display: "contents" }}>
                    <div style={{ padding: "6px 3px", textAlign: "right", whiteSpace: "nowrap", fontSize: 11, color: own ? SURNUM : "#cdc9e0", borderLeft: "1px solid #e3e0f2" }}>{own ? `${r.ch_orig}, ${r.v_orig}` : ""}</div>
                    <div style={{ padding: "6px 10px", lineHeight: 1.4, color: own ? "#3a3566" : "#cdc9e0" }}>{own ? texteEnrichi(r.texte) : "—"}</div>
                  </div>
                );
              })}
            </div>
          );

          // Vue « surnuméraires seulement » : uniquement les versets propres à la Septante.
          if (surnumOnly) {
            const srs = surnumParLivre.get(l.code) ?? [];
            if (!srs.length) return null;
            return (
              <section key={l.code} style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${srs.length * 34 + 40}px` } as React.CSSProperties}>
                <h2 style={{ margin: 0, padding: "8px 12px", fontFamily: "Georgia, serif", fontSize: 16, color: VERT, background: "#eef2ee", borderTop: "1px solid #dfe6df", borderBottom: "1px solid #dfe6df", position: "sticky", top: HAUT_NAV + HAUT_ENTETE, zIndex: 3, textAlign: "center" }}>
                  {l.nom_fr} <span style={{ fontSize: 12, fontWeight: 400, color: SURNUM }}>· {srs.length} surnuméraire{srs.length > 1 ? "s" : ""}</span>
                </h2>
                {srs.map((sr, i) => ligneSurnum(sr, `so-${l.code}-${i}`))}
              </section>
            );
          }

          const rows0 = parLivre.get(l.code) ?? [];
          const rows = sensiblesOnly ? rows0.filter(r => sens.estSensible(l.code, r.ch_canon, r.v_canon)) : rows0;
          const debut = sensiblesOnly ? [] : (surnumStart.get(l.code) ?? []);
          if (!rows.length && !debut.length) return null;
          const hauteur = (rows.length + (sensiblesOnly ? 0 : surnumCount.get(l.code) ?? 0)) * 34 + 40;

          return (
            <section key={l.code} style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${hauteur}px` } as React.CSSProperties}>
              <h2 style={{ margin: 0, padding: "8px 12px", fontFamily: "Georgia, serif", fontSize: 16, color: VERT, background: "#eef2ee", borderTop: "1px solid #dfe6df", borderBottom: "1px solid #dfe6df", position: "sticky", top: HAUT_NAV + HAUT_ENTETE, zIndex: 3, textAlign: "center" }}>
                {l.nom_fr}
              </h2>
              {debut.map((sr, i) => ligneSurnum(sr, `sd-${l.code}-${i}`))}
              {rows.map((r, idx) => {
                const sensible = sens.estSensible(l.code, r.ch_canon, r.v_canon);
                const desc = (sens.libelle.get(`${l.code}|${r.ch_canon}`) ?? []).join(" ; ");
                // zébrage discret une ligne sur deux, sans écraser les fonds signalétiques
                const fond = sensible ? ROUGE_FOND : r.est_suscription ? "#f7f5f0" : (idx % 2 ? "#faf8f3" : "#fff");
                const apres = sensiblesOnly ? [] : (surnumApres.get(r.id) ?? []);
                return (
                  <Fragment key={r.id}>
                    <div style={{ display: "grid", gridTemplateColumns: tmpl, background: fond, borderTop: "1px solid #f0ece3", fontSize: 13.5 }}>
                      <div title={sensible ? desc : undefined} style={{ padding: "6px 8px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 12, color: sensible ? ROUGE : VERT, borderRight: sensible ? `2px solid ${ROUGE}` : "1px solid #f0ece3" }}>
                        {r.ch_canon}, {r.v_canon}{sensible ? " ⚠" : ""}
                      </div>
                      {colonnes.map((t, i) => {
                        const cs = cellule.get(`${r.id}|${t.trad_id}`) ?? [];
                        return (
                          <div key={i} style={{ display: "contents" }}>
                            <div style={{ padding: "6px 3px", textAlign: "right", whiteSpace: "nowrap", fontSize: 11, color: "#a08e6a", borderLeft: "1px solid #f0ece3" }}>
                              {cs.map(c => `${c.ch_orig}, ${c.v_orig}`).join(" · ")}
                            </div>
                            <div className={estAdmin ? "poly-cell" : undefined} style={{ padding: "6px 10px", lineHeight: 1.4, color: sensible ? "#7a1d16" : "#2a2620" }}>
                              {estAdmin && cs.length > 0 && enEdition !== cs[0].id && (
                                <button className="poly-edit" title="Modifier ce verset"
                                  onClick={() => { setEnEdition(cs[0].id); setBrouillon(cs[0].texte ?? ""); setEnregistre("idle"); }}>✎</button>
                              )}
                              {cs.length === 0 ? <span style={{ color: "#d3ccbf" }}>—</span> : cs.map((c, k) => (
                                enEdition === c.id ? (
                                  <span key={k} style={{ display: "block" }}>
                                    <textarea autoFocus value={brouillon} onChange={e => setBrouillon(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Escape") { setEnEdition(null); setEnregistre("idle"); }
                                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enregistrerVerset(c.id, brouillon);
                                      }}
                                      rows={Math.max(2, Math.ceil(brouillon.length / 60))}
                                      style={{ width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.45, fontFamily: "inherit", padding: "5px 7px", border: `1px solid ${VERT}`, borderRadius: 4, background: "#fff", outline: "none", resize: "vertical" }} />
                                    <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 11 }}>
                                      <button onClick={() => enregistrerVerset(c.id, brouillon)} disabled={enregistre === "envoi"}
                                        style={{ padding: "3px 11px", fontSize: 11.5, borderRadius: 4, border: "none", background: VERT, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                                        {enregistre === "envoi" ? "…" : "Enregistrer"}
                                      </button>
                                      <button onClick={() => { setEnEdition(null); setEnregistre("idle"); }}
                                        style={{ padding: "3px 9px", fontSize: 11.5, borderRadius: 4, border: "1px solid #d6cfc2", background: "transparent", color: "#8a8378", cursor: "pointer", fontFamily: "inherit" }}>
                                        Annuler
                                      </button>
                                      <span style={{ color: "#b0a89e" }}>⌘/Ctrl+↵ pour enregistrer · Échap pour annuler · balise &lt;i&gt; admise</span>
                                      {enregistre === "erreur" && <span style={{ color: ROUGE }}>échec de l’enregistrement</span>}
                                    </span>
                                  </span>
                                ) : (
                                  <span key={k}
                                    onClick={estAdmin ? () => { setEnEdition(c.id); setBrouillon(c.texte ?? ""); setEnregistre("idle"); } : undefined}
                                    title={estAdmin ? "Cliquer pour modifier ce verset" : undefined}
                                    style={estAdmin ? { cursor: "text", borderRadius: 3, transition: "background .12s" } : undefined}
                                    onMouseEnter={estAdmin ? e => { (e.currentTarget as HTMLElement).style.background = "#eef3ee"; } : undefined}
                                    onMouseLeave={estAdmin ? e => { (e.currentTarget as HTMLElement).style.background = "transparent"; } : undefined}>
                                    {k > 0 ? " " : ""}{texteEnrichi(c.texte)}
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {apres.map((sr, i) => ligneSurnum(sr, `sa-${r.id}-${i}`))}
                  </Fragment>
                );
              })}
            </section>
          );
        })}
            </div>

            <p style={{ marginTop: 10, fontSize: 12, color: "#a49b8c" }}>
              Colonne <strong>N°</strong> : numérotation propre de chaque édition. Lignes en <span style={{ color: ROUGE, fontWeight: 600 }}>rouge ⚠</span> = points pouvant poser problème. Lignes en <span style={{ color: SURNUM, fontWeight: 600 }}>violet ＋</span> = versets propres à la Septante, hors ossature canonique.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
