"use client";

// « MES CITATIONS » — les passages que le lecteur a retenus, bibliques et patristiques.
//
// ⚠️ La page vivait à /prelevements, seule, avec sa tête et son sol à elle. Elle est
// entrée dans l'espace du lecteur le 7 septembre 2026, à la demande de l'auteur : ce
// qu'on retient est de la même nature que ce qu'on écrit (« Ma chaîne ») et se visite
// à la même heure. Le titre, le compte et le sol lui viennent donc du cadre ; ⛔ elle ne
// pose plus de <main> ni de fond, que le cadre porte déjà.

import IconeChevron from '@/app/components/IconeChevron'
import { useEffect, useState } from "react";
import { MotAttente } from '@/app/lib/attenteEnCreux'
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { useEspace } from "@/app/compte/EspaceCompte";
import { BandeauLecteur, SommaireEspace } from "@/app/compte/piecesEspace";
import { ancresCitations } from "@/app/lib/espaceLecteurNavigation";
import { rendreTexteEnrichi, texteSansEnrichissement } from "@/app/oeuvre/[id]/texteEnrichi";
import { citationPatristique, citationBiblique, copierCitation, preparerTexteCitation, type CitationRendue } from "@/app/lib/citation";
import { colorMix } from "@/app/lib/couleurs";
import { codesTraductionsLecture } from "@/app/lib/traductions";
import { useSansSurvol } from "@/app/lib/useEstMobile";
import {
  BoutonCitationPreferee, MarqueCitation, ModaleRemplacerCitation,
  type CitationPreferee,
} from "@/app/components/CitationPreferee";
import { PLAFOND_SEGMENTS_ELIDES, numerosDeLEcart, regrouperCitations, texteDuGroupe, type Ecart } from "@/app/lib/regrouperCitations";
import { lotsPourClauseIn } from "@/app/lib/paginationSupabase";
import { replier } from "@/app/lib/bibleBibliographieOuvrages";
import { HAUTEUR_NAVBAR } from "@/app/lib/mesures";
import OngletsPage from "@/app/components/OngletsPage";

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

// ⚠️ Le type vit dans `app/components/CitationPreferee.tsx`, avec la marque et la fenêtre
// de remplacement. ⛔ Le réexport que cette page en faisait est retiré le 7 septembre 2026 :
// il datait du temps où le profil public l'importait d'ici, et plus rien ne l'appelait.

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

function BoutonSuppr({ onSuppr }: { onSuppr: () => void }) {
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
//
// ⛔ LE LIVRE ET L'AUTEUR PRENNENT LE TITRE DE SECTION DE L'ESPACE — sérif italique vert,
// le rang que « Ma chaîne » donne déjà à un livre. Ils portaient une bande verte à
// capitales espacées, c'est-à-dire le vocabulaire d'une interface là où les trois autres
// pages de l'espace composent un titre. Le compte et le chevron se rangent sur la même
// ligne : c'est le titre lui-même qui déplie.
function GroupeRepliable({ ancre, label, count, ouvert, onToggle, children }: {
  ancre: string; label: React.ReactNode; count: number; ouvert: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    // ⚠️ Le décalage d'ancre se compose sur HAUTEUR_NAVBAR, jamais en pixels : la barre
    // mesure 56 px à la racine 16 et 77 à la racine 22 (charte, « Responsive »).
    <section id={ancre} className="prel-groupe" style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 1.5rem)` }}>
      <button type="button" className="prel-groupe-tete" onClick={onToggle} aria-expanded={ouvert}>
        <h2>{label}</h2>
        <span className="prel-groupe-compte">{count}</span>
        <span className="prel-groupe-chevron" data-ouvert={ouvert} aria-hidden="true"><IconeChevron dir="down" size={10} strokeWidth={1.5} /></span>
      </button>
      {ouvert && <div>{children}</div>}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PagePrelevements() {
  // ⛔ Ni `getSession` ni garde de session ici : le cadre de l'espace les a faites, et
  // il ne rend cette page qu'à un lecteur dont le profil est chargé.
  const { user, profil } = useEspace();
  const [chargement, setChargement] = useState(true);
  const [prelevements, setPrelevements] = useState<Prelevement[]>([]);
  const [onglet, setOnglet] = useState<TypePrelevement>("biblique");
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  const [oeuvresInfo, setOeuvresInfo] = useState<Record<string, OeuvreInfo>>({});
  const [traductions, setTraductions] = useState<Traduction[]>([]);
  const [traductionActive, setTraductionActive] = useState("TR0001");
  const [textesTraduits, setTextesTraduits] = useState<Record<string, string>>({});
  const [citationPreferee, setCitationPreferee] = useState<CitationPreferee | null>(null);
  // Citation qu'on vient de désigner alors qu'une autre était déjà portée : elle
  // attend la réponse à « Voulez-vous remplacer votre citation favorite ? ».
  const [remplacementPropose, setRemplacementPropose] = useState<CitationPreferee | null>(null);
  // ⚠️ Le critère est la capacité du pointeur, pas la largeur de l'écran : la
  // gouttière d'actions ne paraissait qu'au survol, donc jamais au doigt.
  const sansSurvol = useSansSurvol();

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

  // L'écriture, sans question : localStorage (repli hors ligne) + base (profil public).
  const inscrirePreferee = (pref: CitationPreferee | null) => {
    if (pref) localStorage.setItem("cs_citation_preferee", JSON.stringify(pref));
    else localStorage.removeItem("cs_citation_preferee");
    setCitationPreferee(pref);
    supabase.from("profils").update({ citation_preferee: pref }).eq("id", user.id);
  };

  // Le geste, avec ses trois cas. Reprendre la citation déjà portée la retire ;
  // en désigner une autre quand une place est occupée demande d'abord confirmation,
  // parce que le remplacement défait un choix qui paraît sur le profil public.
  const choisirPreferee = (pref: CitationPreferee) => {
    if (citationPreferee?.id === pref.id) { inscrirePreferee(null); return; }
    if (citationPreferee) { setRemplacementPropose(pref); return; }
    inscrirePreferee(pref);
  };

  useEffect(() => {
    (async () => {
      const uid = user.id;
      // ⚠️ `profils` n'est plus interrogé QUE pour la citation favorite : la traduction
      // par défaut vient du cadre, qui a déjà lu le profil une fois pour toutes.
      const [{ data: rows }, { data: trads }, { data: pref }, lisibles] = await Promise.all([
        supabase
          .from("prelevements").select("id, type, ref_livre, ref_livre_abr, ref_chapitre, ref_verset, texte, traduction, auteur, titre_oeuvre, ref_niv1, ref_niv2, id_oeuvre, segment_numero, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx.
        supabase.from("traductions").select("trad_id, nom").eq("est_biblique", true).order("ordre", { ascending: true }),
        supabase.from("profils").select("citation_preferee").eq("id", uid).maybeSingle(),
        codesTraductionsLecture(supabase),
      ]);
      // La base fait foi (visible sur le profil public) ; le localStorage n'est qu'un repli.
      if (pref?.citation_preferee) setCitationPreferee(pref.citation_preferee as CitationPreferee);
      const prelevsData = rows ?? [];
      setPrelevements(prelevsData);
      // ⚠️ Le menu ne peut proposer que des traductions RÉELLEMENT présentes comme
      // colonnes de `versets_lecture`. En nommer une autre (TR0009, dont le texte
      // est recomposé ailleurs) fait échouer TOUTE la requête PostgREST : le texte
      // de chaque verset prélevé retombait alors en silence sur celui d'origine.
      // Charte, § Traductions lisibles vs colonnes de `versets_lecture`.
      const codesLisibles = new Set(lisibles);
      const listeTraductions = (trads ?? [])
        .map(t => ({ code: t.trad_id, label: t.nom }))
        .filter(t => codesLisibles.has(t.code));
      setTraductions(listeTraductions);
      const souhaitee = profil.traduction_defaut || (typeof window !== "undefined" ? localStorage.getItem("traduction_defaut") : null);
      const defaut = (souhaitee && codesLisibles.has(souhaitee) ? souhaitee : null) || listeTraductions[0]?.code || "TR0001";
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
    })();
  }, [user.id, profil.traduction_defaut]);

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
    if (citationPreferee && ids.includes(citationPreferee.id)) inscrirePreferee(null);
    if (remplacementPropose && ids.includes(remplacementPropose.id)) setRemplacementPropose(null);
  };

  // ── RÉUNIR LES PASSAGES D'UNE MÊME ŒUVRE ────────────────────────────────────
  // Même règle que le volet patristique de la page Bible (voir `regrouperCitations`) :
  // les passages qui se suivent se lisent d'un trait, et ceux que sépare une courte
  // élision aussi, l'écart marqué d'un « […] ».
  // ⛔ Un prélèvement ne retient PAS son `id_texte` : il garde un texte, une œuvre et un
  // numéro de segment. Or c'est le TEXTE qui décide d'un regroupement, une œuvre pouvant
  // en porter plusieurs aux numéros qui se recouvrent. On le retrouve donc en base — et
  // quand une œuvre en a plusieurs parmi les segments visés, on ne réunit rien : mieux
  // vaut deux passages séparés qu'un latin collé à un français.
  const [texteDeLOeuvre, setTexteDeLOeuvre] = useState<Map<string, string>>(new Map());
  const [longueurs, setLongueurs] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const patr = prelevements.filter(x => x.type === "patristique" && x.id_oeuvre && x.segment_numero);
    let annule = false;
    (async () => {
      if (!patr.length) { if (!annule) { setTexteDeLOeuvre(new Map()); setLongueurs(new Map()); } return; }
      // Les numéros à lire : ceux des passages enregistrés, et ceux des écarts courts
      // qu'ils laissent entre eux, œuvre par œuvre.
      const numeros = new Set<number>();
      const parOeuvre = new Map<string, number[]>();
      for (const x of patr) {
        numeros.add(x.segment_numero!);
        const l = parOeuvre.get(x.id_oeuvre!) ?? [];
        l.push(x.segment_numero!);
        parOeuvre.set(x.id_oeuvre!, l);
      }
      for (const liste of parOeuvre.values()) {
        const tries = [...new Set(liste)].sort((a, b) => a - b);
        for (let i = 1; i < tries.length; i++) {
          const manquants = tries[i] - tries[i - 1] - 1;
          if (manquants > 0 && manquants <= PLAFOND_SEGMENTS_ELIDES) {
            for (let n = tries[i - 1] + 1; n < tries[i]; n++) numeros.add(n);
          }
        }
      }
      const oeuvresVisees = [...parOeuvre.keys()];
      const lignes: { id_oeuvre: string; id_texte: string; segment_numero: number; segment_texte: string | null }[] = [];
      for (const lot of lotsPourClauseIn([...numeros].map(String))) {
        const { data, error } = await supabase.from("segments")
          .select("id_oeuvre, id_texte, segment_numero, segment_texte")
          .in("id_oeuvre", oeuvresVisees).in("segment_numero", lot.map(Number));
        // ⚠️ Une erreur se LIT : sans elle, l'absence de regroupement passerait pour un
        // parti pris.
        if (error) { console.error("Prélèvements : les élisions n’ont pas pu être mesurées.", error); return; }
        lignes.push(...((data ?? []) as typeof lignes));
      }
      const textesParOeuvre = new Map<string, Set<string>>();
      const mesures = new Map<string, number>();
      for (const r of lignes) {
        const vus = textesParOeuvre.get(r.id_oeuvre) ?? new Set<string>();
        vus.add(r.id_texte);
        textesParOeuvre.set(r.id_oeuvre, vus);
        mesures.set(`${r.id_texte}|${r.segment_numero}`, (r.segment_texte ?? "").length);
      }
      const uniques = new Map<string, string>();
      for (const [oeuvre, vus] of textesParOeuvre) if (vus.size === 1) uniques.set(oeuvre, [...vus][0]);
      if (!annule) { setTexteDeLOeuvre(uniques); setLongueurs(mesures); }
    })();
    return () => { annule = true; };
  }, [prelevements]);

  const cleCitation = (x: Prelevement) => ({
    idOeuvre: x.id_oeuvre ?? "",
    idTexte: x.id_oeuvre ? texteDeLOeuvre.get(x.id_oeuvre) ?? null : null,
    numero: x.segment_numero ?? 0,
    texte: x.texte,
  });
  const signesElides = (ecart: Ecart) => {
    let total = 0;
    for (const n of numerosDeLEcart(ecart)) {
      const l = longueurs.get(`${ecart.idTexte}|${n}`);
      if (l === undefined) return null;
      total += l;
    }
    return total;
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

  // ── Le sommaire de la colonne de gauche ─────────────────────────────────────
  //
  // ⚠️ Il porte les GROUPES de l'onglet courant : les livres d'un côté, les auteurs de
  // l'autre. ⛔ L'ancre se dérive du label et non de son rang : un rang change dès qu'un
  // passage est retiré, et le sommaire mènerait ailleurs.
  // ⚠️ Le repli des accents et de la ponctuation vient de `replier`, l’écriture du
  // moteur bibliographique : une seconde façon de replier une chaîne finirait par ne plus
  // s’accorder avec la première.
  const ancreDuGroupe = (label: string) => "prel-" + (replier(label).replace(/ /g, "-") || "groupe");

  // ⚠️ Un auteur qui revient sous deux œuvres prend son titre en second : deux entrées
  // du même nom dans un sommaire ne se départagent pas.
  const groupesDuSommaire = onglet === "biblique"
    ? groupesBibliquesBruts.map(g => ({
      ancre: ancreDuGroupe(g.label),
      nom: NOM_COMPLET[g.label] ?? g.items[0]?.ref_livre ?? g.label,
    }))
    : groupesPatristiques.map(g => {
      const [auteur, titre] = g.label.split("||");
      const repete = groupesPatristiques.filter(x => x.label.split("||")[0] === auteur).length > 1;
      return {
        ancre: ancreDuGroupe(g.label),
        nom: repete && titre ? `${auteur}, ${titre}` : (auteur || "Sans auteur"),
      };
    });

  const toggleGroupe = (label: string) => setGroupesOuverts(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  // ⚠️ Sauter à un groupe le DÉPLIE, sinon l'ancre mènerait à un titre fermé. Déplier ne
  // déplace pas la cible : ce qui s'ouvre s'ouvre SOUS le titre visé, et tout ce qui le
  // précède reste en place.
  const deplierPourLAncre = (ancre: string) => {
    const vise = tousLesGroupes.find(label => ancreDuGroupe(label) === ancre);
    if (vise) setGroupesOuverts(prev => (prev.has(vise) ? prev : new Set(prev).add(vise)));
  };

  useEffect(() => {
    setGroupesOuverts(new Set(tousLesGroupes));
  }, [onglet, prelevements]);

  const listeActive = onglet === "biblique" ? bibliques : patristiques;

  // ⚠️ Le bandeau porte ce que la tête de page disait : le compte des citations.
  const pluriel = prelevements.length > 1 ? "s" : "";
  const reperes = prelevements.length
    ? `${prelevements.length} citation${pluriel} enregistrée${pluriel}`
    : "Vos citations";

  const rubriqueDuSommaire = onglet === "biblique" ? "Livres" : "Auteurs";

  return (
    <div className="esp-cadre">

      <SommaireEspace page="citations" groupes={ancresCitations(rubriqueDuSommaire, groupesDuSommaire)}
        surAncre={deplierPourLAncre} />

      <div className="esp-page">
      <style>{`
        /* Le titre d'un groupe : celui d'une section de l'espace, et le geste de dépli
           avec lui. Le filet qui sépare deux groupes est celui des sections. */
        .prel-groupe + .prel-groupe { margin-top: 28px; padding-top: 22px;
          border-top: 1px solid var(--cs-bord-clair); }
        .prel-groupe-tete { display: flex; align-items: baseline; gap: 9px; width: 100%;
          padding: 0 0 9px; background: none; border: none; cursor: pointer;
          text-align: left; font-family: inherit; }
        .prel-groupe-tete h2 { font-family: var(--font-source-serif), Georgia, serif;
          font-style: italic; font-weight: normal; font-size: 0.84375rem;
          color: var(--cs-vert); margin: 0; }
        .prel-groupe-compte { font-size: 0.625rem; letter-spacing: 0.06em;
          color: var(--cs-texte-second); }
        .prel-groupe-chevron { margin-left: auto;
          color: var(--cs-texte-doux); transition: transform 0.18s; display: inline-flex; }
        .prel-groupe-chevron[data-ouvert="false"] { transform: rotate(-90deg); }

        /* ⛔ UNE CITATION SE COMPOSE COMME LE VERSET QU'ELLE EST : la référence en
           MANCHETTE, dans sa colonne, le texte au fer à côté d'elle, les actions au bout.
           Elle était en trois lignes empilées — texte, puis référence et provenance en
           9 px gris, sous le seuil de contraste — si bien que ce qui identifie le passage
           était ce qu'on lisait le moins. C'est la composition de « Ma chaîne », et les
           deux pages de l'espace montrent le même corpus. */
        .prel-item {
          display: grid;
          grid-template-columns: 7rem minmax(0, 1fr) auto;
          gap: 0 16px;
          align-items: start;
          padding: 10px 10px 11px 0;
          border-bottom: 1px solid var(--cs-bord-clair);
          position: relative;
          transition: background 0.12s;
        }
        .prel-item:last-child { border-bottom: none; }
        .prel-item:hover { background: rgba(var(--cs-vert-rgb),0.03); }

        /* La manchette NOMME, elle ne mène nulle part : la gouttière d'actions porte déjà
           le chemin vers le passage, et deux façons d'y aller en font une de trop. Sur
           « Ma chaîne », qui n'a pas de gouttière, la même manchette est un lien. */
        .prel-ref { font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.8125rem; font-weight: 600; line-height: 1.35;
          color: var(--cs-texte-fort); padding-top: 1px; }
        /* ⛔ Le texte cité est du CORPUS : il se compose en sérif, comme le verset de la
           page Bible et comme le lemme de la chaîne. Il était en sans, si bien que deux
           pages voisines rendaient le même texte dans deux polices. */
        .prel-texte { font-family: var(--font-source-serif), Georgia, serif;
          font-size: 0.875rem; line-height: 1.42; color: var(--cs-texte-fort); margin: 0;
          text-align: left; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word; }
        /* ⚠️ La provenance est une GLOSE, non une rubrique : elle se répète à chaque
           ligne, presque toujours la même, et en petites capitales espacées elle appelait
           l'œil autant que la référence. L'italique dit qu'elle n'est pas du texte, le gris
           qu'elle vient en second. */
        .prel-provenance { font-size: 0.625rem; font-style: italic;
          color: var(--cs-texte-second); margin: 4px 0 0; }

        @media (max-width: 640px) {
          .prel-item { grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; }
          .prel-ref { grid-column: 1 / -1; padding-top: 0; }
        }

        /* Citation favorite — encadrement doré complet.
           ⚠️ L'or passe par le TOKEN, plus par ses composantes en dur : la teinte
           suit désormais le thème (le Cuir) comme le reste de la page. */
        .prel-pref {
          background: ${colorMix('var(--cs-or)', 8)} !important;
          border-left: none !important;
          box-shadow: inset 0 0 0 1.5px ${colorMix('var(--cs-or)', 50)} !important;
          border-radius: 4px;
          margin: 2px 0;
        }
        .prel-pref .prel-actions { opacity: 1 !important; }

        /* La gouttière d'actions ne paraissait qu'au survol : hors d'atteinte au
           doigt, et invisible au clavier. Elle vient donc aussi au focus, et
           reste posée en permanence sur un écran tactile (.prel-tactile). */
        .prel-actions { display: flex; gap: 0; align-items: center; flex-shrink: 0; margin-left: 10px; opacity: 0; transition: opacity 0.15s; }
        .prel-item:hover .prel-actions,
        .prel-item:focus-within .prel-actions { opacity: 1; }
        .prel-tactile .prel-actions { opacity: 1; }
        .prel-action { background: none; border: none; cursor: pointer; color: var(--cs-texte-faible); padding: 0; line-height: 1; transition: color 0.12s; font-family: inherit; font-size:0.8125rem; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 22px; box-sizing: border-box; text-decoration: none; }
        .prel-action:hover { color: var(--cs-vert); }
        /* La marque de la citation favorite est d'or, jamais du vert des actions :
           elle ne fait pas la même chose qu'elles. */
        .prel-marque { color: var(--cs-or-doux); }
        .prel-marque:hover { color: var(--cs-or); }
        .prel-marque-active { color: var(--cs-or) !important; opacity: 1 !important; }
        .prel-confirm { font-size:0.65625rem; color: var(--cs-texte-doux); display: flex; align-items: center; white-space: nowrap; }
        .prel-trad-sel {
          appearance: none; -webkit-appearance: none;
          font-family: var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; font-style: normal;
          color: var(--cs-texte-second); background: transparent; border: none;
          border-bottom: 1px solid var(--cs-or-doux); padding: 3px 20px 3px 0;
          cursor: pointer; outline: none; text-align: center;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%239a8a72'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 2px center; background-size: 7px;
          letter-spacing: 0.01em;
        }
        .prel-trad-sel:focus { border-bottom-color: var(--cs-or); }
      `}</style>

        <BandeauLecteur lecteur={profil} reperes={reperes} />

        {/* Filet à quadrilobe. C'est la MÊME marque que le bouton de choix dans la liste :
            l'emblème enseigne le geste, sans mode d'emploi. ⚠️ Il a perdu le titre qu'il
            soulignait, que le bandeau porte désormais, mais non son office. */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "-10px 0 20px", color: "var(--cs-or-doux)" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, var(--cs-or-doux))" }} />
          <MarqueCitation taille={22} />
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, var(--cs-or-doux))" }} />
        </div>

        {chargement && <MotAttente />}
        {!chargement && (<>

        {/* ── Onglets ──
            ⛔ AU MODÈLE DU SITE, non redessinés : la barre était la septième composée en
            styles en ligne, ce que l'en-tête d'`OngletsPage` proscrit depuis sa création.
            ⚠️ Le COMPTE entre dans le libellé, le modèle ne connaissant pas de badge — et
            c'est lui qui réserve d'avance la largeur en graisse 600, si bien qu'un compte
            qui change ne déplace pas son voisin. */}
        <OngletsPage
          onglets={[
            { cle: "biblique" as TypePrelevement, libelle: `Versets bibliques (${bibliques.length})` },
            { cle: "patristique" as TypePrelevement, libelle: `Textes patristiques (${patristiques.length})` },
          ]}
          actif={onglet}
          choisir={setOnglet}
          intitule="Corpus des citations"
          style={{ marginBottom: "18px" }}
        />

        {/* ── Sélecteur de traduction ── */}
        {onglet === "biblique" && traductions.length > 0 && listeActive.length > 0 && (
          <div style={{ marginBottom: "18px" }}>
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
                  <GroupeRepliable key={label} ancre={ancreDuGroupe(label)}
                    label={NOM_COMPLET[label] ?? items[0].ref_livre ?? label}
                    count={agglomeres.length} ouvert={ouvert} onToggle={() => toggleGroupe(label)}>
                    {agglomeres.map((g, i) => {
                      const texte = texteGroupe(g);
                      const ref = refBiblique(g);
                      const estPref = citationPreferee?.id === g.ids[0];
                      const nomTrad = nomTraduction(g.traduction);
                      return (
                        <div key={i} className={`prel-item${estPref ? " prel-pref" : ""}${sansSurvol ? " prel-tactile" : ""}`}>
                          <span className="prel-ref" style={estPref ? { color: "var(--cs-or)" } : undefined}>{ref}</span>
                          <div>
                            <p className="prel-texte">
                              «&#8201;{rendreTexteEnrichi(preparerTexteCitation(sansAppelsNote(texte)))}&#8201;»
                            </p>
                            {nomTrad && <p className="prel-provenance">Prélevé dans la {nomTrad}</p>}
                          </div>
                          <div className="prel-actions">
                            <BoutonCitationPreferee actif={estPref} onClick={e => { e.stopPropagation(); choisirPreferee({ id: g.ids[0], texte, type: "biblique", ref }); }} />
                            <BoutonCopie citation={citationBiblique(texteSansEnrichissement(texte), ref)} />
                            <BoutonLien href={`/?livre=${CODE_PAR_ABREV[g.ref_livre_abr] ?? g.ref_livre_abr}&chapitre=${g.ref_chapitre}&verset=${g.verset_debut}&trad=${traductionActive}`} />
                            <BoutonSuppr onSuppr={() => supprimerIds(g.ids)} />
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
                  <GroupeRepliable key={label} ancre={ancreDuGroupe(label)} label={
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
                    {/* ⚠️ Les passages d’une même œuvre qui se suivent — ou que sépare une
                        courte élision — se lisent d’un trait, comme dans le volet de la page
                        Bible (demande de l’auteur, 2026-09-04). Les actions portent alors sur
                        TOUT le groupe, comme elles le font depuis toujours pour une suite de
                        versets bibliques. */}
                    {regrouperCitations(items, cleCitation, signesElides).map(groupe => {
                      const p = groupe[0];
                      const ids = groupe.map(x => x.id);
                      const texteReuni = texteDuGroupe(groupe, cleCitation);
                      const estPref = citationPreferee != null && ids.includes(citationPreferee.id);
                      return (
                        <div key={ids.join("_")} className={`prel-item${estPref ? " prel-pref" : ""}${sansSurvol ? " prel-tactile" : ""}`}>
                          {/* ⚠️ La manchette tient sa colonne même vide : un passage sans
                              référence de niveau ne doit pas décaler le fer de ses voisins. */}
                          <span className="prel-ref" style={estPref ? { color: "var(--cs-or)" } : undefined}>
                            {[p.ref_niv1, p.ref_niv2].filter(Boolean).join(", ")}
                          </span>
                          <div>
                            <p className="prel-texte">
                              «&#8201;{rendreTexteEnrichi(preparerTexteCitation(sansAppelsNote(texteReuni)))}&#8201;»
                            </p>
                          </div>
                          <div className="prel-actions">
                            <BoutonCitationPreferee actif={estPref} onClick={e => { e.stopPropagation(); choisirPreferee({ id: p.id, texte: texteReuni, type: "patristique", auteur: p.auteur, titre_oeuvre: p.titre_oeuvre }); }} />
                            <BoutonCopie citation={citationPatristiqueDepuisInfo(texteSansEnrichissement(texteReuni), auteur, titre, p.id_oeuvre ? oeuvresInfo[p.id_oeuvre] : undefined)} />
                            {p.id_oeuvre && (
                              <BoutonLien href={`/oeuvre/${p.id_oeuvre}${p.segment_numero ? `#s${p.segment_numero}` : ''}`} />
                            )}
                            <BoutonSuppr onSuppr={() => supprimerIds(ids)} />
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

        </>)}
      </div>

      {/* « Voulez-vous remplacer votre citation favorite ? » — seulement quand une
          place est déjà occupée : désigner la première ne demande rien. */}
      {remplacementPropose && citationPreferee && (
        <ModaleRemplacerCitation
          actuelle={citationPreferee}
          nouvelle={remplacementPropose}
          onConfirmer={() => { inscrirePreferee(remplacementPropose); setRemplacementPropose(null); }}
          onAnnuler={() => setRemplacementPropose(null)}
        />
      )}
    </div>
  );
}
