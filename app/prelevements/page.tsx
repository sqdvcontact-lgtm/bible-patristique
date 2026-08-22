"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { rendreTexteEnrichi, texteSansEnrichissement } from "@/app/oeuvre/[id]/texteEnrichi";
import { citationPatristique, citationBiblique, copierCitation, preparerTexteCitation, type CitationRendue } from "@/app/lib/citation";
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import {
  chargerTextesPrelevementsAelf,
  chapitreLabelPrelevement,
  versetLabelPrelevement,
  TRADUCTIONS_PRELEVEMENTS_AELF,
} from '@/app/lib/prelevementsBibleAelf'

// Les appels de note ([[A]], [[B1]]…) ne doivent pas paraître dans les citations.
const sansAppelsNote = (t: string) => t.replace(/\[\[[A-Z0-9]+\]\]/g, "");

type TypePrelevement = "biblique" | "patristique";

type Prelevement = {
  id: string; type: TypePrelevement;
  ref_livre?: string; ref_livre_abr?: string;
  ref_chapitre?: number; ref_verset?: number;
  ref_chapitre_label?: string | null; ref_verset_label?: string | null;
  aelf_version_id?: string | null; aelf_entry_id?: string | null; aelf_reference?: string | null;
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
  ids: string[]; entryIds: string[]; ref_livre: string; ref_livre_abr: string;
  chapitreLabel: string; versetDebutLabel: string; versetFinLabel: string;
  versetDebutNum: number | null; versetFinNum: number | null;
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

function entierLabel(label: string): number | null {
  return /^\d+$/.test(label) ? Number.parseInt(label, 10) : null;
}

function trierBibliques(list: Prelevement[]): Prelevement[] {
  return [...list].sort((a, b) => {
    const oa = ABREV_ORDRE[a.ref_livre_abr ?? ""] ?? 99;
    const ob = ABREV_ORDRE[b.ref_livre_abr ?? ""] ?? 99;
    if (oa !== ob) return oa - ob;
    const ch = chapitreLabelPrelevement(a).localeCompare(chapitreLabelPrelevement(b), "fr", { numeric: true });
    if (ch) return ch;
    return versetLabelPrelevement(a).localeCompare(versetLabelPrelevement(b), "fr", { numeric: true });
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
    const ch = chapitreLabelPrelevement(p);
    const v = versetLabelPrelevement(p);
    const vNum = entierLabel(v);
    const last = groupes[groupes.length - 1];
    if (
      last
      && last.ref_livre_abr === abr
      && last.chapitreLabel === ch
      && last.versetFinNum != null
      && vNum != null
      && last.versetFinNum + 1 === vNum
    ) {
      last.ids.push(p.id);
      if (p.aelf_entry_id) last.entryIds.push(p.aelf_entry_id);
      last.versetFinLabel = v;
      last.versetFinNum = vNum;
      last.textes.push(p.texte);
    } else {
      groupes.push({
        ids: [p.id], entryIds: p.aelf_entry_id ? [p.aelf_entry_id] : [],
        ref_livre: p.ref_livre ?? "", ref_livre_abr: abr,
        chapitreLabel: ch, versetDebutLabel: v, versetFinLabel: v,
        versetDebutNum: vNum, versetFinNum: vNum,
        textes: [p.texte], traduction: p.traduction,
      });
    }
  }
  return groupes;
}

function refBiblique(g: GroupeBiblique): string {
  const base = `${g.ref_livre_abr} ${g.chapitreLabel}, ${g.versetDebutLabel}`;
  return g.versetDebutLabel === g.versetFinLabel ? base : `${base}–${g.versetFinLabel}`;
}

function texteGroupe(g: GroupeBiblique): string { return g.textes.join(" "); }

function urlGroupeBiblique(g: GroupeBiblique, traduction: string): string {
  const livre = CODE_PAR_ABREV[g.ref_livre_abr] ?? g.ref_livre_abr;
  const base = `/?livre=${encodeURIComponent(livre)}&chapitre=${encodeURIComponent(g.chapitreLabel)}&trad=${encodeURIComponent(traduction)}`;
  const entryId = g.entryIds[0];
  return entryId
    ? `${base}&verset=${encodeURIComponent(g.versetDebutLabel)}#verset-${entryId}`
    : `${base}&verset=${encodeURIComponent(g.versetDebutLabel)}`;
}

function grouper<T>(list: T[], key: (item: T) => string): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// Citation patristique complète (titre en italique pour le collage riche), construite
// exactement comme sur la page de lecture (règles centralisées dans app/lib/citation.ts).
function citationPatristiqueDepuisInfo(texte: string, auteur: string, titre: string, info?: OeuvreInfo): CitationRendue {
  return citationPatristique(texte, {
    auteur, titre,
    sousTitre: info?.sous_titre, tradAuteur: info?.trad_auteur, editeur: info?.editeur,
    collection: info?.collection, ville: info?.ville, datePublication: info?.date_publication,
  });
}

// ── Micro-composants ──────────────────────────────────────────────────────────

function BoutonCopie({ citation }: { citation: CitationRendue | string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); copierCitation(citation).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); }); }}
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
      <button onClick={onSuppr} style={{ fontWeight: 600, color: "var(--cs-danger-fonce)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}>Oui</button>
      &ensp;
      <button onClick={() => setConf(false)} style={{ color: "var(--cs-texte-doux)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}>Non</button>
    </span>
  );
  return (
    <button onClick={e => { e.stopPropagation(); setConf(true); }} className="prel-action" title="Supprimer">✕</button>
  );
}

function BoutonCoeur({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) {
  const c = active ? "var(--cs-or)" : "var(--cs-or-doux)";
  const cf = active ? "var(--cs-or)" : "none";
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
    <div style={{ borderTop: "2px solid var(--cs-or-doux)" }}>
      <button onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(var(--cs-vert-rgb),0.05)", border: "none", cursor: "pointer", padding: "11px 10px 10px", width: "100%", textAlign: "left" }}>
        <span style={{ fontSize: "0.59375rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cs-vert)", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.59375rem", color: "var(--cs-texte-faible)", background: "transparent", padding: "0 4px", letterSpacing: "0.04em" }}>{count}</span>
        <span style={{ fontSize: "0.5rem", color: "var(--cs-texte-faible)", marginLeft: "auto", transition: "transform 0.18s", display: "inline-block", transform: ouvert ? "rotate(180deg)" : "none" }}>▼</span>
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
  const [userId, setUserId] = useState<string | null>(null);

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

  // Le titre d'onglet vient du layout (« Mes citations ») ; on ne le réécrit plus
  // ici en « Mes prélèvements » (contradiction avec la métadonnée et le titre de page).

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
      if (userId) supabase.from("profils").update({ citation_preferee: null }).eq("id", userId);
    } else {
      localStorage.setItem("cs_citation_preferee", JSON.stringify(pref));
      setCitationPreferee(pref);
      // Persistée en base pour être visible sur le profil public.
      if (userId) supabase.from("profils").update({ citation_preferee: pref }).eq("id", userId);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/chantier"); return; }
      const uid = data.session.user.id;
      setUserId(uid);
      const [{ data: rows }, { data: trads }, { data: profil }] = await Promise.all([
        supabase
          .from("prelevements").select("id, type, ref_livre, ref_livre_abr, ref_chapitre, ref_verset, ref_chapitre_label, ref_verset_label, aelf_version_id, aelf_entry_id, aelf_reference, texte, traduction, auteur, titre_oeuvre, ref_niv1, ref_niv2, id_oeuvre, segment_numero, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase.from("v_aelf_bible_search_translations").select("trad_id, nom, ordre").order("ordre", { ascending: true }),
        supabase.from("profils").select("traduction_defaut, citation_preferee").eq("id", uid).maybeSingle(),
      ]);
      // La base fait foi (visible sur le profil public) ; le localStorage n'est qu'un repli.
      if (profil?.citation_preferee) setCitationPreferee(profil.citation_preferee as CitationPreferee);
      const prelevsData = (rows ?? []) as Prelevement[];
      setPrelevements(prelevsData);
      const listeTraductions = (trads ?? []).map(t => ({ code: t.trad_id, label: t.nom }));
      setTraductions(listeTraductions);
      const souhaitee = profil?.traduction_defaut || (typeof window !== "undefined" ? localStorage.getItem("traduction_defaut") : null);
      const defaut = souhaitee && TRADUCTIONS_PRELEVEMENTS_AELF.includes(souhaitee as typeof TRADUCTIONS_PRELEVEMENTS_AELF[number])
        ? souhaitee
        : listeTraductions[0]?.code || "TR0001";
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
      const bibliquesActuels = prelevements.filter(p => p.type === "biblique" && p.aelf_entry_id);
      if (bibliquesActuels.length === 0) { setTextesTraduits({}); return; }
      const colonne = traductions.some(t => t.code === traductionActive) ? traductionActive : "TR0001";
      try {
        const textesParEntree = await chargerTextesPrelevementsAelf(
          bibliquesActuels.map(p => p.aelf_entry_id as string),
        );
        const map: Record<string, string> = {};
        for (const p of bibliquesActuels) {
          const entryId = p.aelf_entry_id as string;
          const texte = textesParEntree.get(entryId)?.[colonne];
          if (texte) map[entryId] = texte;
        }
        setTextesTraduits(map);
      } catch {
        // Une citation ancienne ou momentanément non résolue conserve son texte enregistré :
        // on ne retombe jamais silencieusement sur les coordonnées du canon historique.
        setTextesTraduits({});
      }
    };
    void chargerTextes();
  }, [prelevements, traductionActive, traductions]);

  const supprimerIds = async (ids: string[]) => {
    await supabase.from("prelevements").delete().in("id", ids);
    setPrelevements(prev => prev.filter(p => !ids.includes(p.id)));
    if (citationPreferee && ids.includes(citationPreferee.id)) {
      localStorage.removeItem("cs_citation_preferee");
      setCitationPreferee(null);
      if (userId) supabase.from("profils").update({ citation_preferee: null }).eq("id", userId);
    }
  };

  const bibliques = trierBibliques(prelevements.filter(p => p.type === "biblique").map(p => {
    const texteTraduit = p.aelf_entry_id ? textesTraduits[p.aelf_entry_id] : null;
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
    <main style={{ minHeight: "calc(100vh - 3.5rem)", background: "var(--cs-fond-doux)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: "0.8125rem", color: "var(--cs-texte-doux)", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>Chargement…</p>
    </main>
  );

  const listeActive = onglet === "biblique" ? bibliques : patristiques;

  return (
    <main style={{ background: "var(--cs-fond-doux)", minHeight: "calc(100vh - 3.5rem)" }}>
      <style>{`
        .prel-item {
          display: flex; align-items: flex-start; gap: 0;
          padding: 9px 10px 9px 12px;
          border-bottom: 1px solid var(--cs-bord-clair);
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
          border-radius: 4px;
          margin: 2px 0;
        }
        .prel-pref .prel-actions { opacity: 1 !important; }

        .prel-actions { display: flex; gap: 0; align-items: center; flex-shrink: 0; margin-left: 10px; opacity: 0; transition: opacity 0.15s; }
        .prel-item:hover .prel-actions { opacity: 1; }
        .prel-action { background: none; border: none; cursor: pointer; color: var(--cs-texte-faible); padding: 0; line-height: 1; transition: color 0.12s; font-family: inherit; font-size:0.8125rem; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 22px; box-sizing: border-box; text-decoration: none; }
        .prel-action:hover { color: var(--cs-vert); }
        .prel-coeur-active { color: var(--cs-or) !important; opacity: 1 !important; }
        .prel-confirm { font-size:0.65625rem; color: var(--cs-texte-doux); display: flex; align-items: center; white-space: nowrap; }
        .prel-trad-sel {
          appearance: none; -webkit-appearance: none;
          font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; font-style: normal;
          color: #5a4e3a; background: transparent; border: none;
          border-bottom: 1px solid var(--cs-or-doux); padding: 3px 20px 3px 0;
          cursor: pointer; outline: none; text-align: center;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%239a8a72'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 2px center; background-size: 7px;
          letter-spacing: 0.01em;
        }
        .prel-trad-sel:focus { border-bottom-color: var(--cs-or); }
      `}</style>

      <div style={{ maxWidth: "42.5rem", margin: "0 auto", padding: "52px 24px 96px" }}>

        {/* ── En-tête ── */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: "0 0 10px", letterSpacing: "0.015em" }}>
            Mes citations
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", maxWidth: "13rem", margin: "2px auto 12px" }}>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, var(--cs-or-doux))" }} />
            <img src="/icons/sacre-coeur.png" alt="" aria-hidden="true" style={{ height: "26px", width: "auto", display: "block" }} />
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, var(--cs-or-doux))" }} />
          </div>
          <p style={{ fontSize: "0.65625rem", color: "#b8a888", margin: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif", letterSpacing: "0.04em" }}>
            {prelevements.length} citation{prelevements.length > 1 ? "s" : ""} enregistrée{prelevements.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: "flex", justifyContent: "center", borderBottom: "1px solid var(--cs-bord)", marginBottom: "20px" }}>
          {(["biblique", "patristique"] as TypePrelevement[]).map(t => (
            <button key={t} onClick={() => setOnglet(t)}
              style={{
                padding: "9px 22px", fontSize: "0.75rem", fontFamily: "var(--font-source-sans), Arial, sans-serif",
                fontWeight: onglet === t ? 600 : 400,
                color: onglet === t ? "#1e1a14" : "var(--cs-texte-doux)",
                background: "transparent", border: "none",
                borderBottom: onglet === t ? "1.5px solid var(--cs-vert)" : "1.5px solid transparent",
                cursor: "pointer", letterSpacing: "0.01em", transition: "color 0.12s",
                marginBottom: "-1px",
              }}>
              {t === "biblique" ? "Versets bibliques" : "Textes patristiques"}
              <span style={{ marginLeft: "7px", fontSize: "0.59375rem", color: onglet === t ? "var(--cs-or)" : "var(--cs-texte-faible)" }}>
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
              <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.875rem", color: "var(--cs-texte-doux)", marginBottom: "20px" }}>
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
                              «&#8201;{rendreTexteEnrichi(preparerTexteCitation(sansAppelsNote(texte)))}&#8201;»
                            </p>
                            <p style={{ fontSize: "0.5625rem", color: "var(--cs-texte-doux)", margin: 0, letterSpacing: "0.06em", fontFamily: "var(--font-source-sans), Arial, sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: estPref ? "var(--cs-or)" : "#6a7b6e" }}>{ref}</span>
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
                            <BoutonCopie citation={citationBiblique(texteSansEnrichissement(texte), ref)} />
                            <BoutonLien href={urlGroupeBiblique(g, traductionActive)} />
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
              <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.875rem", color: "var(--cs-texte-doux)", marginBottom: "20px" }}>
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
                      {titre && <span style={{ textTransform: "none", fontStyle: "italic", fontWeight: 400, color: "var(--cs-texte-second)" }}>,&ensp;{titre}</span>}
                    </>
                  } count={items.length} ouvert={ouvert} onToggle={() => toggleGroupe(label)}>
                    {items.map(p => {
                      const estPref = citationPreferee?.id === p.id;
                      return (
                        <div key={p.id} className={`prel-item${estPref ? " prel-pref" : ""}`}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: "0.8125rem", color: "#1e1a14", lineHeight: 1.45, margin: "0 0 3px" }}>
                              «&#8201;{rendreTexteEnrichi(preparerTexteCitation(sansAppelsNote(p.texte)))}&#8201;»
                            </p>
                            {(p.ref_niv1 || p.ref_niv2) && (
                              <p style={{ fontSize: "0.5625rem", color: "var(--cs-texte-doux)", margin: 0, letterSpacing: "0.06em", fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                                <span style={{ fontWeight: 600, color: estPref ? "var(--cs-or)" : "#6a7b6e" }}>
                                  {[p.ref_niv1, p.ref_niv2].filter(Boolean).join(", ")}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="prel-actions">
                            <BoutonCoeur active={estPref} onClick={e => { e.stopPropagation(); marquerPreferee({ id: p.id, texte: p.texte, type: "patristique", auteur: p.auteur, titre_oeuvre: p.titre_oeuvre }); }} />
                            <BoutonCopie citation={citationPatristiqueDepuisInfo(texteSansEnrichissement(p.texte), auteur, titre, p.id_oeuvre ? oeuvresInfo[p.id_oeuvre] : undefined)} />
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