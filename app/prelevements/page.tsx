"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { formaterDateHistorique } from "@/app/lib/datesHistoriques";
import { rendreTexteEnrichi, texteSansEnrichissement } from "@/app/oeuvre/[id]/texteEnrichi";

// Les appels de note ([[A]], [[B1]]…) ne doivent pas paraître dans les citations.
const sansAppelsNote = (t: string) => t.replace(/\[\[[A-Z0-9]+\]\]/g, "");

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
      style={{ color: ok ? "var(--cs-vert)" : undefined }}>
      {ok ? "✓" : (
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
          <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
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

function BoutonCoeur({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) {
  const c = active ? "#9a7a38" : "#c0b0a8";
  const cf = active ? "#9a7a38" : "none";
  return (
    <button onClick={onClick} className={`prel-action prel-coeur${active ? " prel-coeur-active" : ""}`}
      title={active ? "Retirer comme citation préférée" : "Marquer comme citation préférée"}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="13" height="15" viewBox="0 0 12 15" fill="none" aria-hidden="true" style={{ display: "block" }}>
        {/* Croix */}
        <line x1="6" y1="0.3" x2="6" y2="2.6" stroke={c} strokeWidth="1" strokeLinecap="round"/>
        <line x1="4.7" y1="1.5" x2="7.3" y2="1.5" stroke={c} strokeWidth="1" strokeLinecap="round"/>
        {/* Flamme */}
        <path d="M6 2.8C6 2.8 4.8 4 4.8 5C4.8 5.7 5.3 6.1 6 6.1C6.7 6.1 7.2 5.7 7.2 5C7.2 4 6 2.8 6 2.8z" fill={c} opacity={active ? "0.85" : "0.45"}/>
        {/* Couronne d'épines */}
        <path d="M2.5 8.8Q3 7.8 3.5 8.7Q4 7.5 4.5 8.5Q5 7.8 5.5 8.5Q6 7.8 6.5 8.5Q7 7.5 7.5 8.7Q8 7.8 8.5 8.8Q9 7.6 9.5 8.8" stroke={c} strokeWidth="0.7" fill="none" strokeLinecap="round"/>
        {/* Cœur */}
        <path d="M6 14.5C6 14.5 0.5 10.5 0.5 7.2A2.8 2.8 0 0 1 6 5.7A2.8 2.8 0 0 1 11.5 7.2C11.5 10.5 6 14.5 6 14.5z"
          fill={cf} opacity={active ? "0.88" : "1"}
          stroke={c} strokeWidth="1" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function BoutonLien({ href }: { href: string }) {
  return (
    <Link href={href} className="prel-action" title="Accéder au passage" style={{ textDecoration: "none" }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <path d="M2 9L9 2" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/>
        <path d="M4.5 2H9V6.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}

// ── Groupe repliable ──────────────────────────────────────────────────────────
function GroupeRepliable({ label, count, ouvert, onToggle, children }: {
  label: React.ReactNode; count: number; ouvert: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "2px solid #c8bdb0" }}>
      <button onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(var(--cs-vert-rgb),0.05)", border: "none", cursor: "pointer", padding: "11px 10px 10px", width: "100%", textAlign: "left" }}>
        <span style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cs-vert)", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.59375rem", color: "#b0a89e", background: "transparent", padding: "0 4px", letterSpacing: "0.04em" }}>{count}</span>
        <span style={{ fontSize: "0.5rem", color: "#c0b8b0", marginLeft: "auto", transition: "transform 0.18s", display: "inline-block", transform: ouvert ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {ouvert && (
        <div style={{ paddingBottom: "4px" }}>
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

  // Résoudre un code de traduction (TR0003) ou un nom brut en nom lisible
  const nomTraduction = (val?: string | null): string | null => {
    if (!val) return null;
    if (/^TR\d+$/.test(val)) return traductions.find(t => t.code === val)?.label ?? val;
    // Essai de correspondance sur le label (ex: "Sacy" → "Bible de Sacy")
    const byLabel = traductions.find(t =>
      t.label === val ||
      t.label.endsWith(` ${val}`) ||
      t.label.endsWith(` de ${val}`)
    );
    if (byLabel) return byLabel.label;
    return val;
  };

  useEffect(() => { document.title = 'Mes prélèvements · Corpus Scriptura' }, [])

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
      if (!data.session) { router.push("/chantier"); return; }
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
        batches.map(batch => supabase.from("versets_lecture").select(`livre, chapitre, verset, "${colonne}"`).or(batch.join(",")))
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
    <main style={{ minHeight: "calc(100vh - 3.5rem)", background: "#f0ebe0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: "0.8125rem", color: "#9a8a72", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>Chargement…</p>
    </main>
  );

  const listeActive = onglet === "biblique" ? bibliques : patristiques;

  return (
    <main style={{ background: "#f0ebe0", minHeight: "calc(100vh - 3.5rem)" }}>
      <style>{`
        .prel-item {
          display: flex; align-items: flex-start; gap: 0;
          padding: 9px 10px 9px 12px;
          border-bottom: 1px solid #e8e1d8;
          position: relative;
          border-left: 2px solid transparent;
          transition: background 0.12s;
        }
        .prel-item:last-child { border-bottom: none; }
        .prel-item:hover { background: rgba(var(--cs-vert-rgb),0.03); }

        /* Citation préférée — encadrement doré complet */
        .prel-pref {
          background: rgba(154,122,56,0.07) !important;
          border-left: none !important;
          box-shadow: inset 0 0 0 1.5px rgba(184,160,80,0.55) !important;
          border-radius: 3px;
          margin: 2px 0;
        }
        .prel-pref .prel-actions { opacity: 1 !important; }

        .prel-actions { display: flex; gap: 0; align-items: center; flex-shrink: 0; margin-left: 10px; opacity: 0; transition: opacity 0.15s; }
        .prel-item:hover .prel-actions { opacity: 1; }
        .prel-action { background: none; border: none; cursor: pointer; color: #b0a89e; padding: 0; line-height: 1; transition: color 0.12s; font-family: inherit; font-size:0.8125rem; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 22px; box-sizing: border-box; text-decoration: none; }
        .prel-action:hover { color: var(--cs-vert); }
        .prel-coeur-active { color: #9a7a38 !important; opacity: 1 !important; }
        .prel-confirm { font-size:0.65625rem; color: #9a8a72; display: flex; align-items: center; white-space: nowrap; }
        .prel-trad-sel {
          appearance: none; -webkit-appearance: none;
          font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; font-style: normal;
          color: #5a4e3a; background: transparent; border: none;
          border-bottom: 1px solid #c8b8a0; padding: 3px 20px 3px 0;
          cursor: pointer; outline: none; text-align: center;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%239a8a72'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 2px center; background-size: 7px;
          letter-spacing: 0.01em;
        }
        .prel-trad-sel:focus { border-bottom-color: #9a7a38; }
      `}</style>

      <div style={{ maxWidth: "42.5rem", margin: "0 auto", padding: "52px 24px 96px" }}>

        {/* ── En-tête ── */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(22px, 4vw, 28px)", fontWeight: "normal", color: "#1e1a14", margin: "0 0 10px", letterSpacing: "0.015em" }}>
            Mes citations
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", maxWidth: "13rem", margin: "2px auto 12px" }}>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #c8b8a4)" }} />
            <img src="/icons/sacre-coeur.png" alt="" aria-hidden="true" style={{ height: "26px", width: "auto", display: "block" }} />
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #c8b8a4)" }} />
          </div>
          <p style={{ fontSize: "0.65625rem", color: "#b8a888", margin: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif", letterSpacing: "0.04em" }}>
            {prelevements.length} citation{prelevements.length > 1 ? "s" : ""} enregistrée{prelevements.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid #ddd5c8", marginBottom: "20px" }}>
          {(["biblique", "patristique"] as TypePrelevement[]).map(t => (
            <button key={t} onClick={() => setOnglet(t)}
              style={{
                padding: "9px 22px", fontSize: "0.75rem", fontFamily: "var(--font-source-sans), Arial, sans-serif",
                fontWeight: onglet === t ? 600 : 400,
                color: onglet === t ? "#1e1a14" : "#a89e8e",
                background: "transparent", border: "none",
                borderBottom: onglet === t ? "1.5px solid var(--cs-vert)" : "1.5px solid transparent",
                cursor: "pointer", letterSpacing: "0.01em", transition: "color 0.12s",
                marginBottom: "-1px",
              }}>
              {t === "biblique" ? "Versets bibliques" : "Textes patristiques"}
              <span style={{ marginLeft: "7px", fontSize: "0.59375rem", color: onglet === t ? "#9a7a38" : "#c0b8b0" }}>
                {t === "biblique" ? bibliques.length : patristiques.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Sélecteur de traduction ── */}
        {onglet === "biblique" && traductions.length > 0 && listeActive.length > 0 && (
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <select value={traductionActive} onChange={e => setTraductionActive(e.target.value)}
              className="prel-trad-sel">
              {traductions.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </div>
        )}

        {/* ── Citations bibliques ── */}
        {onglet === "biblique" && (
          bibliques.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.875rem", color: "#9a8a72", marginBottom: "20px" }}>
                Aucun verset enregistré.
              </p>
              <Link href="/?livre=GEN&chapitre=1" style={{ fontSize: "0.71875rem", color: "var(--cs-vert)", textDecoration: "none", letterSpacing: "0.04em" }}>Ouvrir la Bible →</Link>
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
                      const nomTrad = nomTraduction(g.traduction);
                      return (
                        <div key={i} className={`prel-item${estPref ? " prel-pref" : ""}`}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.8125rem", color: "#1e1a14", lineHeight: 1.45, margin: "0 0 3px" }}>
                              «&#8201;{rendreTexteEnrichi(sansAppelsNote(texte))}&#8201;»
                            </p>
                            <p style={{ fontSize: "0.5625rem", color: "#9a8a72", margin: 0, letterSpacing: "0.06em", fontFamily: "var(--font-source-sans), Arial, sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: estPref ? "#9a7a38" : "#6a7b6e" }}>{ref}</span>
                              {nomTrad && (
                                <>
                                  <span style={{ opacity: 0.4 }}>·</span>
                                  <span>Prélevé dans la {nomTrad}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="prel-actions">
                            <BoutonCoeur active={estPref} onClick={e => { e.stopPropagation(); marquerPreferee({ id: g.ids[0], texte, type: "biblique", ref }); }} />
                            <BoutonCopie texte={`« ${texteSansEnrichissement(texte).replace(/[.!?]$/, '')} » (${ref})`} />
                            <BoutonLien href={`/?livre=${CODE_PAR_ABREV[g.ref_livre_abr] ?? g.ref_livre_abr}&chapitre=${g.ref_chapitre}&verset=${g.verset_debut}&trad=${traductionActive}`} />
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
              <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.875rem", color: "#9a8a72", marginBottom: "20px" }}>
                Aucun passage enregistré.
              </p>
              <Link href="/bibliotheque" style={{ fontSize: "0.71875rem", color: "var(--cs-vert)", textDecoration: "none", letterSpacing: "0.04em" }}>Ouvrir la bibliothèque →</Link>
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
                        <div key={p.id} className={`prel-item${estPref ? " prel-pref" : ""}`}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.8125rem", color: "#1e1a14", lineHeight: 1.45, margin: "0 0 3px" }}>
                              «&#8201;{rendreTexteEnrichi(sansAppelsNote(p.texte))}&#8201;»
                            </p>
                            {(p.ref_niv1 || p.ref_niv2) && (
                              <p style={{ fontSize: "0.5625rem", color: "#9a8a72", margin: 0, letterSpacing: "0.06em", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                                <span style={{ fontWeight: 600, color: estPref ? "#9a7a38" : "#6a7b6e" }}>
                                  {[p.ref_niv1, p.ref_niv2].filter(Boolean).join(", ")}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="prel-actions">
                            <BoutonCoeur active={estPref} onClick={e => { e.stopPropagation(); marquerPreferee({ id: p.id, texte: p.texte, type: "patristique", auteur: p.auteur, titre_oeuvre: p.titre_oeuvre }); }} />
                            <BoutonCopie texte={construireCitationPatristique(texteSansEnrichissement(p.texte), auteur, titre, p.id_oeuvre ? oeuvresInfo[p.id_oeuvre] : undefined)} />
                            {p.id_oeuvre && (
                              <BoutonLien href={`/oeuvre/${p.id_oeuvre}${p.segment_numero ? `#s${p.segment_numero}` : ''}`} />
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
