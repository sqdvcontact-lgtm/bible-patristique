"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { formaterDateHistorique } from "@/app/lib/datesHistoriques";

type TypePrelevement = "biblique" | "patristique";

type Prelevement = {
  id: string; type: TypePrelevement;
  ref_livre?: string; ref_livre_abr?: string;
  ref_chapitre?: number; ref_verset?: number;
  texte: string; traduction?: string;
  auteur?: string; titre_oeuvre?: string;
  ref_niv1?: string; ref_niv2?: string;
  id_oeuvre?: string; segment_numero?: number;
  created_at: string;
};

type Traduction = { code: string; label: string };

type OeuvreInfo = {
  id_oeuvre: string; id_auteur?: string; sous_titre?: string
  trad_auteur?: string; editeur?: string
  collection?: string; ville?: string; date_publication?: string
};

type GroupeBiblique = {
  ids: string[]; ref_livre: string; ref_livre_abr: string;
  ref_chapitre: number; verset_debut: number; verset_fin: number;
  textes: string[]; traduction?: string;
};

export type CitationPreferee = {
  id: string; texte: string; type: "biblique" | "patristique";
  ref?: string; auteur?: string; titre_oeuvre?: string;
}

const ABREV_ORDRE: Record<string, number> = {
  Gn:1,Ex:2,Lv:3,Nb:4,Dt:5,Jos:6,Jg:7,Rt:8,"1S":9,"2S":10,"1R":11,"2R":12,
  "1Ch":13,"2Ch":14,Esd:15,Né:16,Est:17,Jb:18,Ps:19,Pr:20,Qo:21,Ct:22,
  Is:23,Jr:24,Lm:25,Ez:26,Dn:27,Os:28,Jl:29,Am:30,Ab:31,Jon:32,Mi:33,
  Na:34,Ha:35,So:36,Ag:37,Za:38,Ml:39,Mt:40,Mc:41,Lc:42,Jn:43,Ac:44,
  Rm:45,"1Co":46,"2Co":47,Ga:48,Ep:49,Ph:50,Col:51,"1Th":52,"2Th":53,
  "1Tm":54,"2Tm":55,Tt:56,Phm:57,He:58,Jc:59,"1P":60,"2P":61,
  "1Jn":62,"2Jn":63,"3Jn":64,Jude:65,Ap:66,
};

const NOM_COMPLET: Record<string, string> = {
  Gn:"Genèse", Ex:"Exode", Lv:"Lévitique", Nb:"Nombres", Dt:"Deutéronome",
  Jos:"Josué", Jg:"Juges", Rt:"Ruth", "1S":"1 Samuel", "2S":"2 Samuel",
  "1R":"1 Rois", "2R":"2 Rois", "1Ch":"1 Chroniques", "2Ch":"2 Chroniques",
  Esd:"Esdras", Né:"Néhémie", Est:"Esther", Jb:"Job", Ps:"Psaumes",
  Pr:"Proverbes", Qo:"Qohéleth", Ct:"Cantique des cantiques",
  Is:"Isaïe", Jr:"Jérémie", Lm:"Lamentations", Ez:"Ézéchiel", Dn:"Daniel",
  Os:"Osée", Jl:"Joël", Am:"Amos", Ab:"Abdias", Jon:"Jonas", Mi:"Michée",
  Na:"Nahum", Ha:"Habacuc", So:"Sophonie", Ag:"Aggée", Za:"Zacharie", Ml:"Malachie",
  Mt:"Évangile selon Matthieu", Mc:"Évangile selon Marc", Lc:"Évangile selon Luc",
  Jn:"Évangile selon Jean", Ac:"Actes des Apôtres",
  Rm:"Romains", "1Co":"1 Corinthiens", "2Co":"2 Corinthiens", Ga:"Galates",
  Ep:"Éphésiens", Ph:"Philippiens", Col:"Colossiens",
  "1Th":"1 Thessaloniciens", "2Th":"2 Thessaloniciens",
  "1Tm":"1 Timothée", "2Tm":"2 Timothée", Tt:"Tite", Phm:"Philémon",
  He:"Hébreux", Jc:"Jacques", "1P":"1 Pierre", "2P":"2 Pierre",
  "1Jn":"1 Jean", "2Jn":"2 Jean", "3Jn":"3 Jean", Jude:"Jude", Ap:"Apocalypse",
};

const CODE_PAR_ABREV: Record<string, string> = {
  Gn:"GEN",Ex:"EXO",Lv:"LEV",Nb:"NUM",Dt:"DEU",Jos:"JOS",Jg:"JDG",Rt:"RUT","1S":"1SA","2S":"2SA","1R":"1KI","2R":"2KI",
  "1Ch":"1CH","2Ch":"2CH",Esd:"EZR",Né:"NEH",Est:"EST",Jb:"JOB",Ps:"PSA",Pr:"PRO",Qo:"ECC",Ct:"SNG",
  Is:"ISA",Jr:"JER",Lm:"LAM",Ez:"EZK",Dn:"DAN",Os:"HOS",Jl:"JOL",Am:"AMO",Ab:"OBA",Jon:"JON",Mi:"MIC",
  Na:"NAM",Ha:"HAB",So:"ZEP",Ag:"HAG",Za:"ZEC",Ml:"MAL",Mt:"MAT",Mc:"MRK",Lc:"LUK",Jn:"JHN",Ac:"ACT",
  Rm:"ROM","1Co":"1CO","2Co":"2CO",Ga:"GAL",Ep:"EPH",Ph:"PHP",Col:"COL","1Th":"1TH","2Th":"2TH",
  "1Tm":"1TI","2Tm":"2TI",Tt:"TIT",Phm:"PHM",He:"HEB",Jc:"JAS","1P":"1PE","2P":"2PE",
  "1Jn":"1JN","2Jn":"2JN","3Jn":"3JN",Jude:"JUD",Ap:"REV",
};

function trierBibliques(list: Prelevement[]): Prelevement[] {
  return [...list].sort((a, b) => {
    const oa = ABREV_ORDRE[a.ref_livre_abr ?? ""] ?? 99;
    const ob = ABREV_ORDRE[b.ref_livre_abr ?? ""] ?? 99;
    if (oa !== ob) return oa - ob;
    if ((a.ref_chapitre ?? 0) !== (b.ref_chapitre ?? 0)) return (a.ref_chapitre ?? 0) - (b.ref_chapitre ?? 0);
    return (a.ref_verset ?? 0) - (b.ref_verset ?? 0);
  });
}

function trierPatristiques(list: Prelevement[]): Prelevement[] {
  return [...list].sort((a, b) => {
    const ca = (a.auteur ?? "").localeCompare(b.auteur ?? "", "fr");
    if (ca !== 0) return ca;
    const co = (a.titre_oeuvre ?? "").localeCompare(b.titre_oeuvre ?? "", "fr");
    if (co !== 0) return co;
    return (a.segment_numero ?? 0) - (b.segment_numero ?? 0);
  });
}

function agglomererBibliques(sorted: Prelevement[]): GroupeBiblique[] {
  const groupes: GroupeBiblique[] = [];
  for (const p of sorted) {
    const abr = p.ref_livre_abr ?? "";
    const ch = p.ref_chapitre ?? 0;
    const v = p.ref_verset ?? 0;
    const last = groupes[groupes.length - 1];
    if (last && last.ref_livre_abr === abr && last.ref_chapitre === ch && last.verset_fin + 1 === v) {
      last.ids.push(p.id); last.verset_fin = v; last.textes.push(p.texte);
    } else {
      groupes.push({ ids: [p.id], ref_livre: p.ref_livre ?? "", ref_livre_abr: abr, ref_chapitre: ch, verset_debut: v, verset_fin: v, textes: [p.texte], traduction: p.traduction });
    }
  }
  return groupes;
}

function refBiblique(g: GroupeBiblique): string {
  const base = `${g.ref_livre_abr} ${g.ref_chapitre}, ${g.verset_debut}`;
  return g.verset_debut === g.verset_fin ? base : `${base}–${g.verset_fin}`;
}

function texteGroupe(g: GroupeBiblique): string { return g.textes.join(" "); }

function grouper<T>(list: T[], key: (item: T) => string): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function construireCitationPatristique(
  texte: string, auteur: string, titre: string,
  info?: OeuvreInfo
): string {
  const parts: string[] = [];
  if (auteur) parts.push(auteur);
  let titreComplet = titre || '';
  if (info?.sous_titre) titreComplet += '. ' + info.sous_titre;
  if (titreComplet) parts.push(titreComplet);
  if (info?.trad_auteur) parts.push('trad. ' + info.trad_auteur);
  if (info?.editeur) parts.push(info.editeur);
  if (info?.collection) parts.push(info.collection);
  if (info?.ville) parts.push(info.ville);
  if (info?.date_publication) parts.push(formaterDateHistorique(info.date_publication));
  parts.push('disponible sur le site Corpus Scriptura');
  return parts.join(', ') + ' : « ' + texte + ' »';
}

// ── Micro-composants ──────────────────────────────────────────────────────────

function BoutonCopie({ texte }: { texte: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(texte).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); }); }}
      className="prel-action" title="Copier"
      style={{ color: ok ? "#3d6b4f" : undefined }}>
      {ok ? "✓" : "⧉"}
    </button>
  );
}

function BoutonSuppr({ ids, onSuppr }: { ids: string[]; onSuppr: () => void }) {
  const [conf, setConf] = useState(false);
  if (conf) return (
    <span className="prel-confirm" onClick={e => e.stopPropagation()}>
      Supprimer ?&ensp;
      <button onClick={onSuppr} style={{ fontWeight: 600, color: "#9a2a2a", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}>Oui</button>
      &ensp;
      <button onClick={() => setConf(false)} style={{ color: "#9a958d", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}>Non</button>
    </span>
  );
  return (
    <button onClick={e => { e.stopPropagation(); setConf(true); }} className="prel-action" title="Supprimer">✕</button>
  );
}

function BoutonEtoile({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} className="prel-action prel-star" title={active ? "Retirer comme citation préférée" : "Marquer comme citation préférée"}
      style={{ color: active ? "#9a7a38" : undefined, opacity: active ? 1 : undefined }}>
      {active ? "★" : "☆"}
    </button>
  );
}

// ── Groupe repliable ──────────────────────────────────────────────────────────
function GroupeRepliable({ label, count, ouvert, onToggle, children }: {
  label: React.ReactNode; count: number; ouvert: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "1px solid #ddd5c8" }}>
      <button onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: "14px 0 12px", width: "100%", textAlign: "left" }}>
        <span style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3d6b4f", fontFamily: "Georgia, serif" }}>
          {label}
        </span>
        <span style={{ fontSize: "9.5px", color: "#b0a89e", background: "transparent", padding: "0 4px", letterSpacing: "0.04em" }}>{count}</span>
        <span style={{ fontSize: "8px", color: "#c0b8b0", marginLeft: "auto", transition: "transform 0.18s", display: "inline-block", transform: ouvert ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {ouvert && (
        <div style={{ paddingBottom: "6px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PrelevementsPage() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [prelevements, setPrelevements] = useState<Prelevement[]>([]);
  const [onglet, setOnglet] = useState<TypePrelevement>("biblique");
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  const [oeuvresInfo, setOeuvresInfo] = useState<Record<string, OeuvreInfo>>({});
  const [traductions, setTraductions] = useState<Traduction[]>([]);
  const [traductionActive, setTraductionActive] = useState("TR0001");
  const [textesTraduits, setTextesTraduits] = useState<Record<string, string>>({});
  const [citationPreferee, setCitationPreferee] = useState<CitationPreferee | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cs_citation_preferee");
      if (saved) setCitationPreferee(JSON.parse(saved));
    } catch {}
  }, []);

  const marquerPreferee = (pref: CitationPreferee) => {
    if (citationPreferee?.id === pref.id) {
      localStorage.removeItem("cs_citation_preferee");
      setCitationPreferee(null);
    } else {
      localStorage.setItem("cs_citation_preferee", JSON.stringify(pref));
      setCitationPreferee(pref);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/compte"); return; }
      const uid = data.session.user.id;
      const [{ data: rows }, { data: trads }, { data: profil }] = await Promise.all([
        supabase
          .from("prelevements").select("id, type, ref_livre, ref_livre_abr, ref_chapitre, ref_verset, texte, traduction, auteur, titre_oeuvre, ref_niv1, ref_niv2, id_oeuvre, segment_numero, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase.from("traductions").select("trad_id, nom").order("ordre", { ascending: true }),
        supabase.from("profils").select("traduction_defaut").eq("id", uid).maybeSingle(),
      ]);
      const prelevsData = rows ?? [];
      setPrelevements(prelevsData);
      const listeTraductions = (trads ?? []).map(t => ({ code: t.trad_id, label: t.nom }));
      setTraductions(listeTraductions);
      const defaut = profil?.traduction_defaut || (typeof window !== "undefined" ? localStorage.getItem("traduction_defaut") : null) || listeTraductions[0]?.code || "TR0001";
      setTraductionActive(defaut);
      setChargement(false);

      const ids = [...new Set(prelevsData.filter(p => p.id_oeuvre).map(p => p.id_oeuvre as string))];
      if (ids.length > 0) {
        const { data: od } = await supabase
          .from("oeuvres")
          .select("id_oeuvre, id_auteur, sous_titre, trad_auteur, editeur, collection, ville, date_publication")
          .in("id_oeuvre", ids);
        const map: Record<string, OeuvreInfo> = {};
        (od ?? []).forEach(o => { map[o.id_oeuvre] = o; });
        setOeuvresInfo(map);
      }
    });
  }, [router]);

  useEffect(() => {
    const chargerTextes = async () => {
      const bibliquesActuels = prelevements.filter(p => p.type === "biblique");
      if (bibliquesActuels.length === 0) { setTextesTraduits({}); return; }
      const clauses = bibliquesActuels
        .map(p => {
          const livre = CODE_PAR_ABREV[p.ref_livre_abr ?? ""] ?? "";
          if (!livre || !p.ref_chapitre || !p.ref_verset) return "";
          return `and(livre.eq.${livre},chapitre.eq.${p.ref_chapitre},verset.eq.${p.ref_verset})`;
        })
        .filter(Boolean);
      if (clauses.length === 0) { setTextesTraduits({}); return; }
      const colonne = traductions.some(t => t.code === traductionActive) ? traductionActive : "TR0001";
      const batches: string[][] = [];
      for (let i = 0; i < clauses.length; i += 80) batches.push(clauses.slice(i, i + 80));
      const results = await Promise.all(
        batches.map(batch => supabase.from("versets").select(`livre, chapitre, verset, "${colonne}"`).or(batch.join(",")))
      );
      const map: Record<string, string> = {};
      results.forEach(({ data }) => {
        (data ?? []).forEach((v: any) => {
          map[`${v.livre}:${v.chapitre}:${v.verset}`] = String(v[colonne] ?? "");
        });
      });
      setTextesTraduits(map);
    };
    chargerTextes();
  }, [prelevements, traductionActive, traductions]);

  const supprimerIds = async (ids: string[]) => {
    await supabase.from("prelevements").delete().in("id", ids);
    setPrelevements(prev => prev.filter(p => !ids.includes(p.id)));
    // Si la citation préférée est supprimée, la retirer
    if (citationPreferee && ids.includes(citationPreferee.id)) {
      localStorage.removeItem("cs_citation_preferee");
      setCitationPreferee(null);
    }
  };

  const bibliques = trierBibliques(prelevements.filter(p => p.type === "biblique").map(p => {
    const livre = CODE_PAR_ABREV[p.ref_livre_abr ?? ""];
    const texteTraduit = livre ? textesTraduits[`${livre}:${p.ref_chapitre}:${p.ref_verset}`] : null;
    return texteTraduit ? { ...p, texte: texteTraduit } : p;
  }));
  const patristiques = trierPatristiques(prelevements.filter(p => p.type === "patristique"));
  const groupesBibliquesBruts = grouper(bibliques, p => p.ref_livre_abr ?? p.ref_livre ?? "");
  const groupesPatristiques = grouper(patristiques, p => `${p.auteur ?? ""}||${p.titre_oeuvre ?? ""}`);

  const tousLesGroupes = onglet === "biblique"
    ? groupesBibliquesBruts.map(g => g.label)
    : groupesPatristiques.map(g => g.label);

  const toutDeployer = () => setGroupesOuverts(new Set(tousLesGroupes));
  const toutRetracter = () => setGroupesOuverts(new Set());
  const toggleGroupe = (label: string) => setGroupesOuverts(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  useEffect(() => {
    setGroupesOuverts(new Set(tousLesGroupes));
  }, [onglet, prelevements]);

  if (chargement) return (
    <main style={{ minHeight: "calc(100vh - 48px)", background: "#f0ebe0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: "13px", color: "#9a8a72", fontStyle: "italic", fontFamily: "Georgia, serif" }}>Chargement…</p>
    </main>
  );

  const listeActive = onglet === "biblique" ? bibliques : patristiques;

  return (
    <main style={{ background: "#f0ebe0", minHeight: "calc(100vh - 48px)" }}>
      <style>{`
        .prel-item { display: flex; align-items: flex-start; gap: 0; padding: 11px 0; border-bottom: 1px solid #e8e1d8; position: relative; }
        .prel-item:last-child { border-bottom: none; }
        .prel-actions { display: flex; gap: 1px; align-items: center; flex-shrink: 0; margin-left: 10px; opacity: 0; transition: opacity 0.15s; }
        .prel-item:hover .prel-actions { opacity: 1; }
        .prel-action { background: none; border: none; cursor: pointer; font-size: 13px; color: #b0a89e; padding: 2px 5px; line-height: 1; transition: color 0.12s; font-family: inherit; }
        .prel-action:hover { color: #3d6b4f; }
        .prel-star { font-size: 14px; }
        .prel-confirm { font-size: 10.5px; color: #9a8a72; display: flex; align-items: center; white-space: nowrap; }
        .prel-trad-sel {
          appearance: none; -webkit-appearance: none;
          font-family: Georgia, serif; font-size: 12.5px; font-style: italic;
          color: #3d6b4f; background: transparent; border: none;
          border-bottom: 1px solid #b8a898; padding: 2px 20px 2px 0;
          cursor: pointer; outline: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a8a72'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 2px center; background-size: 8px;
        }
        .prel-trad-sel:focus { border-bottom-color: #3d6b4f; }
      `}</style>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "52px 24px 96px" }}>

        {/* ── En-tête ── */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#9a8a72", margin: "0 0 14px" }}>
            Corpus Scriptura
          </p>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: "normal", color: "#1e1a14", margin: "0 0 12px", letterSpacing: "0.01em" }}>
            Mes citations
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", maxWidth: "160px", margin: "0 auto 12px" }}>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #c8b8a4)" }} />
            <span style={{ fontSize: "8px", color: "#b0a088", letterSpacing: "0.2em" }}>⁂</span>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #c8b8a4)" }} />
          </div>
          <p style={{ fontSize: "11px", color: "#b0a088", margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            {prelevements.length} citation{prelevements.length > 1 ? "s" : ""} enregistrée{prelevements.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Citation préférée — exergue ── */}
        {citationPreferee && (
          <div style={{ textAlign: "center", margin: "0 0 48px", padding: "28px 32px 24px", borderTop: "1px solid #c8b8a4", borderBottom: "1px solid #c8b8a4", position: "relative" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#9a7a38", margin: "0 0 16px" }}>
              Citation préférée
            </p>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "15px", fontStyle: "italic", color: "#1e1a14", lineHeight: 1.75, margin: "0 0 12px" }}>
              «&#8201;{citationPreferee.texte.length > 220 ? citationPreferee.texte.slice(0, 220) + "…" : citationPreferee.texte}&#8201;»
            </p>
            {(citationPreferee.ref || citationPreferee.auteur) && (
              <p style={{ fontSize: "10px", color: "#9a8a72", margin: 0, letterSpacing: "0.08em", fontFamily: "Georgia, serif" }}>
                {citationPreferee.type === "biblique"
                  ? citationPreferee.ref
                  : [citationPreferee.auteur, citationPreferee.titre_oeuvre].filter(Boolean).join(", ")}
              </p>
            )}
            <button onClick={() => { localStorage.removeItem("cs_citation_preferee"); setCitationPreferee(null); }}
              title="Effacer"
              style={{ position: "absolute", top: "10px", right: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#c8b8a4", lineHeight: 1, padding: "2px 4px" }}>
              ✕
            </button>
          </div>
        )}

        {/* ── Onglets ── */}
        <div style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid #ddd5c8", marginBottom: "28px" }}>
          {(["biblique", "patristique"] as TypePrelevement[]).map(t => (
            <button key={t} onClick={() => setOnglet(t)}
              style={{
                padding: "10px 22px", fontSize: "12px", fontFamily: "Georgia, serif",
                fontWeight: "normal", fontStyle: onglet === t ? "normal" : "italic",
                color: onglet === t ? "#1e1a14" : "#a89e8e",
                background: "transparent", border: "none",
                borderBottom: onglet === t ? "1px solid #1e1a14" : "1px solid transparent",
                cursor: "pointer", letterSpacing: "0.01em", transition: "color 0.12s",
                marginBottom: "-1px",
              }}>
              {t === "biblique" ? "Textes bibliques" : "Textes patristiques"}
              <span style={{ marginLeft: "7px", fontSize: "9.5px", color: onglet === t ? "#9a7a38" : "#c0b8b0" }}>
                {t === "biblique" ? bibliques.length : patristiques.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Barre de contrôles ── */}
        {listeActive.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>

            {/* Sélecteur de traduction — centré, élégant */}
            {onglet === "biblique" && traductions.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10.5px", color: "#9a8a72", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                  Traduction
                </span>
                <select value={traductionActive} onChange={e => setTraductionActive(e.target.value)}
                  className="prel-trad-sel">
                  {traductions.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </div>
            ) : <span />}

            {/* Déployer / rétracter */}
            <div style={{ display: "flex", gap: "16px" }}>
              <button onClick={toutDeployer}
                style={{ fontSize: "10.5px", color: "#9a8a72", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                Tout déployer
              </button>
              <button onClick={toutRetracter}
                style={{ fontSize: "10.5px", color: "#9a8a72", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                Tout rétracter
              </button>
            </div>
          </div>
        )}

        {/* ── Citations bibliques ── */}
        {onglet === "biblique" && (
          bibliques.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#9a8a72", fontStyle: "italic", marginBottom: "20px" }}>
                Aucun verset enregistré.
              </p>
              <Link href="/?livre=GEN&chapitre=1" style={{ fontSize: "11.5px", color: "#3d6b4f", textDecoration: "none", letterSpacing: "0.04em" }}>Ouvrir la Bible →</Link>
            </div>
          ) : (
            <div>
              {groupesBibliquesBruts.map(({ label, items }) => {
                const agglomeres = agglomererBibliques(items);
                const ouvert = groupesOuverts.has(label);
                return (
                  <GroupeRepliable key={label}
                    label={NOM_COMPLET[label] ?? items[0].ref_livre ?? label}
                    count={agglomeres.length} ouvert={ouvert} onToggle={() => toggleGroupe(label)}>
                    {agglomeres.map((g, i) => {
                      const texte = texteGroupe(g);
                      const ref = refBiblique(g);
                      const estPref = citationPreferee?.id === g.ids[0];
                      return (
                        <div key={i} className="prel-item">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "13.5px", fontStyle: "italic", color: "#1e1a14", lineHeight: 1.7, margin: "0 0 4px" }}>
                              «&#8201;{texte}&#8201;»
                            </p>
                            <p style={{ fontSize: "9.5px", color: "#9a8a72", margin: 0, letterSpacing: "0.10em", fontFamily: "Georgia, serif" }}>
                              {ref}
                              {g.traduction && <span style={{ marginLeft: "6px", opacity: 0.7 }}>· {g.traduction}</span>}
                            </p>
                          </div>
                          <div className="prel-actions">
                            <BoutonEtoile active={estPref} onClick={e => { e.stopPropagation(); marquerPreferee({ id: g.ids[0], texte, type: "biblique", ref }); }} />
                            <BoutonCopie texte={`« ${texte.replace(/[.!?]$/, '')} » (${ref})`} />
                            <BoutonSuppr ids={g.ids} onSuppr={() => supprimerIds(g.ids)} />
                          </div>
                        </div>
                      );
                    })}
                  </GroupeRepliable>
                );
              })}
            </div>
          )
        )}

        {/* ── Citations patristiques ── */}
        {onglet === "patristique" && (
          patristiques.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#9a8a72", fontStyle: "italic", marginBottom: "20px" }}>
                Aucun passage enregistré.
              </p>
              <Link href="/bibliotheque" style={{ fontSize: "11.5px", color: "#3d6b4f", textDecoration: "none", letterSpacing: "0.04em" }}>Ouvrir la bibliothèque →</Link>
            </div>
          ) : (
            <div>
              {groupesPatristiques.map(({ label, items }) => {
                const [auteur, titre] = label.split("||");
                const ouvert = groupesOuverts.has(label);
                const idAuteur = items[0]?.id_oeuvre ? oeuvresInfo[items[0].id_oeuvre]?.id_auteur : undefined;
                return (
                  <GroupeRepliable key={label} label={
                    <>
                      {idAuteur ? (
                        <Link href={`/auteur/${idAuteur}`} onClick={e => e.stopPropagation()}
                          style={{ color: "inherit", textDecoration: "none" }}>
                          {auteur}
                        </Link>
                      ) : auteur}
                      {titre && <span style={{ textTransform: "none", fontStyle: "italic", fontWeight: 400, color: "#7a6e5e" }}>,&ensp;{titre}</span>}
                    </>
                  } count={items.length} ouvert={ouvert} onToggle={() => toggleGroupe(label)}>
                    {items.map(p => {
                      const estPref = citationPreferee?.id === p.id;
                      return (
                        <div key={p.id} className="prel-item">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "13.5px", fontStyle: "italic", color: "#1e1a14", lineHeight: 1.7, margin: "0 0 4px" }}>
                              «&#8201;{p.texte}&#8201;»
                            </p>
                            {(p.ref_niv1 || p.ref_niv2) && (
                              <p style={{ fontSize: "9.5px", color: "#9a8a72", margin: 0, letterSpacing: "0.08em", fontFamily: "Georgia, serif" }}>
                                {[p.ref_niv1, p.ref_niv2].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="prel-actions">
                            <BoutonEtoile active={estPref} onClick={e => { e.stopPropagation(); marquerPreferee({ id: p.id, texte: p.texte, type: "patristique", auteur: p.auteur, titre_oeuvre: p.titre_oeuvre }); }} />
                            <BoutonCopie texte={construireCitationPatristique(p.texte, auteur, titre, p.id_oeuvre ? oeuvresInfo[p.id_oeuvre] : undefined)} />
                            {p.id_oeuvre && (
                              <Link href={`/oeuvre/${p.id_oeuvre}${p.segment_numero ? `#s${p.segment_numero}` : ''}`} target="_blank" rel="noopener noreferrer"
                                title="Accéder à ce passage" className="prel-action" style={{ textDecoration: "none", fontSize: "12px" }}>
                                ↗
                              </Link>
                            )}
                            <BoutonSuppr ids={[p.id]} onSuppr={() => supprimerIds([p.id])} />
                          </div>
                        </div>
                      );
                    })}
                  </GroupeRepliable>
                );
              })}
            </div>
          )
        )}

      </div>
    </main>
  );
}
