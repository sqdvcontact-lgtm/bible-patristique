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
import NavLivres from "@/app/components/NavLivres";
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from "@/app/lib/mesures";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";

type Livre = { code: string; nom_fr: string; ordre: number };
type Trad = { trad_id: string; nom: string; ordre: number | null };
type Point = { livre: string | null; reference: string | null; type: string | null; description: string | null; statut: string | null; notes: string | null };
type CanonRow = { id: string; livre: string; ch_canon: number; v_canon: number; est_suscription: boolean };
type V2Row = { id: string; canon_id: string | null; livre: string; trad_id: string; ch_orig: number; v_orig: number; v_orig_suffixe: string | null; texte: string | null; notes: string | null };

// ── Passages que toutes les traditions ne reçoivent pas ────────────────────────────────
// Une case vide n'a pas toujours le même sens. Le plus souvent elle signale un travail en
// cours ou un défaut de source ; mais pour les livres et passages deutérocanoniques, elle
// dit quelque chose de tout autre : cette traduction ne les compte PAS parmi les Écritures.
// Le lecteur doit pouvoir faire la différence, sans quoi il conclut à un oubli.
// Ces passages nous sont parvenus en grec, non en hébreu ; les Bibles catholique et
// orthodoxe les reçoivent, la Bible protestante et la Bible hébraïque non.
const LIVRES_DEUTERO = new Set(["TOB", "JDT", "WIS", "SIR", "BAR", "1MA", "2MA", "ESG", "LJE", "SUS", "BEL", "S3Y"]);
function deuterocanonique(canonId: string): boolean {
  const [livre, ch, v] = canonId.split(".");
  if (LIVRES_DEUTERO.has(livre)) return true;
  // Daniel : le cantique des trois enfants, Suzanne et Bel — que le canon range dans le
  // livre lui-même, aux chapitres 3, 13 et 14.
  if (livre === "DAN") return (+ch === 3 && +v >= 24 && +v <= 90) || +ch === 13 || +ch === 14;
  return false;
}

// Un surnuméraire regroupé : le même verset hors ossature, tel que plusieurs éditions le
// portent au même numéro d'origine. `par` associe chaque traduction à sa version du verset ;
// `ancre` est le dernier créneau du canon rencontré, qui fixe la place de la ligne.
type Surnum = { cle: string; livre: string; ch: number; v: number; ancre: string | null; par: Map<string, V2Row> };

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
// L'en-tête du tableau ne doit PAS reprendre le vert de la NavBar : collés l'un sous l'autre,
// deux aplats identiques se lisaient comme un seul bandeau, et on ne voyait plus où commençait
// le tableau. Un vert nettement plus sombre garde la parenté sans la confusion.
const VERT_ENTETE = "#2b4536";
const VERT_ENTETE_BAS = "#35563f";   // la ligne des traductions, un demi-ton plus clair
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
  // trad_id → code du livre → nom qu'il porte dans cette édition. Seuls les écarts au canon.
  const [livresEd, setLivresEd] = useState<Record<string, Record<string, { nom: string; abrege: string }>>>({});
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
  // `estAdminReel` = les droits ; `estAdmin` = ce qu'on montre. Un admin qui bascule
  // en « mode utilisateur standard » doit voir la page comme un lecteur : les réglages
  // de relecture et les crayons disparaissent, ses droits ne changent pas.
  const [estAdminReel, setEstAdmin] = useState(false);
  const { modeUtilisateurStandard } = useAffichageAdmin();
  const estAdmin = estAdminReel && !modeUtilisateurStandard;
  const [enEdition, setEnEdition] = useState<string | null>(null);   // id du verset édité
  const [brouillon, setBrouillon] = useState("");
  const [enregistre, setEnregistre] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");

  // LE LIVRE COMMANDE, L'ENSEMBLE SUIT. Les onglets ont disparu : on choisit un livre dans le
  // sommaire, et l'ensemble à charger (AT / Psaumes / NT / non canoniques) s'en déduit. Le
  // lecteur n'a plus à savoir dans quel tiroir ranger sa demande.
  const ensembleDe = useCallback((code: string): Onglet => {
    const o = livres.find(l => l.code === code)?.ordre ?? 0;
    if (code === "PSA") return "PSA";
    if (o > ORDRE_CANON_MAX) return "AUTRES";
    return o >= ORDRE_NT ? "NT" : "AT";
  }, [livres]);

  const choisirLivre = useCallback((code: string) => {
    setOnglet(ensembleDe(code));
    setLivreChoisi(code);
    setToutAfficher(false);
  }, [ensembleDe]);

  // Le volet de navigation attend le vocabulaire de la page Bible.
  const livresNav = useMemo(() => livres.map(l => ({
    code: l.code, nom: l.nom_fr,
    testament: l.ordre > ORDRE_CANON_MAX ? "AUTRES" : l.ordre >= ORDRE_NT ? "NT" : "AT",
  })), [livres]);

  const sens = useMemo(() => construireSensibilite(points), [points]);
  const ordreDe = useMemo(() => new Map(livres.map(l => [l.code, l.ordre])), [livres]);

  // Chargement initial (livres, points, traductions migrées)
  useEffect(() => {
    supabase.from("livres").select("code, nom_fr, ordre").order("ordre").then(({ data }) => setLivres(data ?? []));
    // Désignation des livres propre à chaque édition, quand elle diffère du canon : la
    // Sacy de 1730 compte quatre livres des Rois là où le canon en compte deux de Samuel
    // et deux des Rois. Seuls les écarts sont enregistrés (voir scripts/livres-editions.mjs).
    // Passe par une route serveur : la table `parametres` est protégée par RLS et le client
    // public n'y voit rien — elle contient aussi la charte éditoriale, qui doit le rester.
    fetch("/api/livres-editions").then(r => r.json()).then(setLivresEd).catch(() => setLivresEd({}));
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

  // Le livre est choisi dans le sommaire ; on ne lui en substitue un autre que si celui qui
  // est retenu n'appartient pas à l'ensemble chargé — cas qui ne survient qu'au premier rendu.
  useEffect(() => {
    if (livreChoisi && livresOnglet.some(l => l.code === livreChoisi)) return;
    setLivreChoisi(livresOnglet[0]?.code ?? null);
  }, [livresOnglet, livreChoisi]);

  // Livres réellement rendus (et chargés) : un seul, sauf « tout afficher »
  const livresAffiches = useMemo(
    () => (toutAfficher ? livresOnglet : livresOnglet.filter(l => l.code === livreChoisi)),
    [livresOnglet, livreChoisi, toutAfficher]
  );

  // Chargement de tout l'onglet (canon + traductions migrées)
  // On ne charge QUE les traductions réellement affichées. Auparavant la requête
  // ramenait le texte de toutes les éditions en base pour n'en montrer trois ou
  // quatre : sur les Psaumes, cela faisait deux fois plus de lignes que nécessaire,
  // et autant de pages de 1 000 à parcourir. Changer une colonne relance le
  // chargement, mais sur un volume bien moindre.
  const charger = useCallback(async () => {
    const tradIds = slots.filter(Boolean);
    if (!livresAffiches.length || !tradIds.length) return;
    setLoading(true);
    const codes = livresAffiches.map(l => l.code);
    const [c, vv] = await Promise.all([
      fetchPaged<CanonRow>("versets_canon", "id, livre, ch_canon, v_canon, est_suscription", q => q.in("livre", codes)),
      fetchPaged<V2Row>("versets_v2", "id, canon_id, livre, trad_id, ch_orig, v_orig, v_orig_suffixe, texte, notes", q => q.in("livre", codes).in("trad_id", tradIds)),
    ]);
    c.sort((a, b) => (ordreDe.get(a.livre)! - ordreDe.get(b.livre)!) || (a.ch_canon - b.ch_canon) || (a.v_canon - b.v_canon));
    setCanon(c); setV2(vv); setLoading(false);
  }, [livresAffiches, slots, ordreDe]);
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
    const apres = new Map<string, Surnum[]>();   // canon_id → surnuméraires qui le suivent
    const start = new Map<string, Surnum[]>();   // livre → surnuméraires en tête de livre
    const count = new Map<string, number>();     // livre → nb (pour l'estimation de hauteur)
    const parLiv = new Map<string, Surnum[]>();  // livre → tous les surnuméraires (vue « seulement »)
    const parTrad = new Map<string, V2Row[]>();
    for (const r of v2) (parTrad.get(r.trad_id) ?? parTrad.set(r.trad_id, []).get(r.trad_id)!).push(r);

    // Un surnuméraire n'a pas de créneau du canon, mais plusieurs éditions peuvent porter LE
    // MÊME verset au même numéro d'origine — Tobie 1,23 existe chez Sacy comme chez Crampon.
    // On les regroupe alors sur UNE ligne, colonne par colonne, au lieu d'en faire deux lignes
    // sans rapport. La clé est la numérotation d'ÉDITION, seule chose qu'ils ont en commun.
    const groupes = new Map<string, Surnum>();
    for (const [trad, rows] of parTrad) {
      rows.sort((a, b) => (ordreDe.get(a.livre) ?? 999) - (ordreDe.get(b.livre) ?? 999) || a.ch_orig - b.ch_orig || a.v_orig - b.v_orig);
      let last: string | null = null, curLivre: string | null = null;
      for (const r of rows) {
        if (r.livre !== curLivre) { curLivre = r.livre; last = null; }
        if (r.canon_id) { last = r.canon_id; continue; }
        const cle = `${r.livre}|${r.ch_orig}|${r.v_orig}`;
        let g = groupes.get(cle);
        if (!g) {
          g = { cle, livre: r.livre, ch: r.ch_orig, v: r.v_orig, ancre: last, par: new Map() };
          groupes.set(cle, g);
          count.set(r.livre, (count.get(r.livre) ?? 0) + 1);
          (parLiv.get(r.livre) ?? parLiv.set(r.livre, []).get(r.livre)!).push(g);
          if (last) (apres.get(last) ?? apres.set(last, []).get(last)!).push(g);
          else (start.get(r.livre) ?? start.set(r.livre, []).get(r.livre)!).push(g);
        }
        g.par.set(trad, r);
      }
    }
    return { surnumApres: apres, surnumStart: start, surnumCount: count, surnumParLivre: parLiv };
  }, [v2, ordreDe]);

  const colonnes = slots.map(id => trads.find(t => t.trad_id === id)).filter((t): t is Trad => !!t);
  const nomDe = (code: string) => livres.find(l => l.code === code)?.nom_fr ?? code;

  // Sous le titre canonique du livre, la désignation que lui donnent les éditions affichées
  // quand elle diffère. C'est la seule façon pour le lecteur de savoir que la Sacy de 1730
  // appelle « Rois, livre troisième » ce que le canon nomme « 1 Rois ».
  const titresEdition = (code: string) =>
    colonnes
      .map(c => ({ trad: c.nom, ed: livresEd[c.trad_id]?.[code] }))
      .filter((x): x is { trad: string; ed: { nom: string; abrege: string } } => Boolean(x.ed));
  // `minmax(0, 1fr)` et non `minmax(150px, 1fr)` : c'est la seule forme qui donne
  // des colonnes STRICTEMENT égales. Avec un minimum autre que zéro, une colonne
  // dont le contenu ne se laisse pas rétrécir (mot long, numéro d'origine en
  // `nowrap`) impose sa largeur et vole la place aux autres — les traductions ne
  // se lisaient plus sur un peigne régulier. Le zéro laisse la répartition `fr`
  // seule maîtresse, et toutes les colonnes de texte tombent à la même largeur.
  const tmpl = `58px ${colonnes.map(() => "38px minmax(0, 1fr)").join(" ")}`;
  const HAUT_ENTETE = 26;   // hauteur de la ligne des traductions
  const HAUT_TITRE  = 25;   // hauteur du bandeau portant le nom du livre
  const HAUT_NAV    = 10;   // blanc entre la NavBar et le haut du tableau
  // Sommet du corps du tableau : sous la navbar, le blanc de séparation, la barre de
  // titre et la ligne des traductions. C'est là que viennent se poser les bandeaux de
  // nom de livre quand plusieurs livres se suivent.
  const SOMMET_CORPS = HAUTEUR_NAVBAR + HAUT_NAV + HAUT_TITRE + HAUT_ENTETE;

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
        /* Cellule modifiable (administrateur) : le survol la détoure d'un encadrement
           léger et ombré, pour montrer qu'elle est cliquable sans déplacer le texte.
           La bordure est posée en permanence, transparente, afin que son apparition
           ne décale rien à l'intérieur de la grille. */
        .poly-cell {
          position: relative;
          cursor: text;
          border: 1px solid transparent;
          border-radius: 4px;
          transition: border-color .12s, box-shadow .12s, background-color .12s;
        }
        .poly-cell:hover {
          border-color: #d9d2c4;
          background: rgba(255, 255, 255, .55);
          box-shadow: 0 1px 4px rgba(60, 50, 30, .13);
        }
        /* pendant l'édition, aucun effet de survol : le champ prend le relais */
        .poly-cell.poly-edition, .poly-cell.poly-edition:hover {
          cursor: default; border-color: transparent; background: transparent; box-shadow: none;
        }
      `}</style>

      <div className="poly-mobile" style={{ maxWidth: 520, margin: "0 auto", padding: "48px 22px", fontFamily: "system-ui, sans-serif", textAlign: "center", color: "#5b544c" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: VERT, margin: "0 0 14px" }}>Polyglotte</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Cette page compare plusieurs traductions côte à côte : elle demande un écran large.
          <br /><br />
          <strong>Ouvrez-la depuis un ordinateur ou une tablette.</strong>
        </p>
      </div>

      {/* Le MÊME volet que la page Bible — pas un cousin qui lui ressemble. Un seul composant
          pour les deux pages, donc une seule navigation à maintenir et à apprendre. */}
      <div className="poly-outil" style={{ display: "flex", alignItems: "flex-start", minHeight: "100vh" }}>
        {/* `top: 0` collait le volet au bord du viewport, c'est-à-dire DERRIÈRE la
            navbar fixe : sa barre de recherche disparaissait sous elle dès qu'on
            descendait. Le volet se cale donc sous la navbar, et n'occupe que la
            hauteur restante. */}
        <div style={{ position: "sticky", top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR, flexShrink: 0, display: "flex" }}>
          <NavLivres
            livres={livresNav}
            livreActif={livreChoisi ?? ""}
            chapitreActif={1}
            traductionIndex={0}
            setTraductionIndex={() => {}}
            traductions={[]}
            onChoisirLivre={choisirLivre}
            sansChapitres
            titre="Livres à comparer"
          />
        </div>

      <div style={{ flex: 1, minWidth: 0, maxWidth: 1500, margin: "0 auto", padding: "12px 18px 60px", fontFamily: "system-ui, sans-serif", color: "#2a2620" }}>
        {/* Aucun livre choisi : la page reste vide et l'explique */}
        {!onglet && (
          <div style={{ margin: "60px auto", maxWidth: 560, textAlign: "center", color: "#8a8378" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 17, color: VERT, margin: "0 0 10px" }}>Choisissez un livre à ouvrir</p>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
              Prenez-le dans le sommaire, à gauche. Le livre s'affiche en entier, sur une seule
              page défilante, avec toutes ses traductions côte à côte.
            </p>
          </div>
        )}

        {onglet && (
          <>
            {loading && <div style={{ fontSize: 12, color: "#a49b8c", margin: "8px 0 0" }}>chargement de {LIBELLE_ONGLET[onglet]}…</div>}

            {/* En-tête collant : la traduction se choisit ici même, sans étiquette parasite */}
            {/* En-tête collant. Le NOM DU LIVRE y monte avec le choix des traductions : en
                défilant, on perdait de vue ce qu'on lisait, et les titres de section ne
                revenaient qu'au livre suivant. Les deux informations dont on a besoin en
                permanence — quel livre, quelles éditions — tiennent donc ensemble et ne
                quittent jamais l'écran. */}
            {/* L'en-tête entier — nom du livre, réglages de relecture, choix des trois
                traductions — se colle SOUS la navbar, et non au bord du viewport : avec
                `top: 0` il se rangeait derrière elle et disparaissait dès qu'on descendait.
                Le `paddingTop` porte le blanc de séparation dans le bloc collant lui-même,
                sur un fond opaque : le texte du tableau ne défile donc jamais dans
                l'interstice entre la navbar et l'en-tête. */}
            <div style={{ position: "sticky", top: HAUTEUR_NAVBAR, zIndex: 5, background: FOND, paddingTop: HAUT_NAV }}>
              <div style={{ borderRadius: "8px 8px 0 0", overflow: "hidden", boxShadow: "0 2px 10px rgba(55,45,35,0.14)" }}>
              {/* Barre de titre, calée sur LA MÊME grille que le tableau. Le nom du livre
                  s'étend de la deuxième piste à la dernière (`2 / -1`) : il se centre donc
                  exactement sur les colonnes de traduction, la numérotation canonique restant
                  hors de son compte. Les réglages de relecture sont posés en `absolute` sur la
                  barre entière, DEHORS de la grille : ils ne pèsent d'aucun poids dans ce
                  centrage — le titre reste au même endroit qu'on soit admin ou non. */}
              <div style={{ position: "relative", background: VERT_ENTETE, color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.18)" }}>
                <div style={{ display: "grid", gridTemplateColumns: tmpl, alignItems: "center", minHeight: HAUT_TITRE }}>
                  <div />
                  <div style={{ gridColumn: "2 / -1", padding: "3px 12px", textAlign: "center", fontFamily: "Georgia, serif", fontSize: 14.5, letterSpacing: "0.01em" }}>
                    {toutAfficher
                      ? LIBELLE_ONGLET[onglet]
                      : (livres.find(l => l.code === livreChoisi)?.nom_fr ?? LIBELLE_ONGLET[onglet])}
                  </div>
                </div>
                  {estAdmin && (
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 5 }}>
                      {([["tout", toutAfficher, "#c8b98a", "Tout afficher", livresOnglet.length > 1],
                         ["sensibles", sensiblesOnly, "#e0908a", "Lignes problématiques", true],
                         ["surnum", surnumOnly, "#b3a6e8", "Surnuméraires", true]] as const)
                        .filter(([, , , , visible]) => visible)
                        .map(([cle, actif, teinte, libelle]) => (
                        <button key={cle}
                          onClick={() => {
                            if (cle === "tout") setToutAfficher(!actif);
                            else if (cle === "sensibles") { setSensiblesOnly(!actif); if (!actif) setSurnumOnly(false); }
                            else { setSurnumOnly(!actif); if (!actif) setSensiblesOnly(false); }
                          }}
                          title={libelle}
                          style={{ padding: "2px 9px", fontSize: 10.5, fontWeight: 500, cursor: "pointer", borderRadius: 999, fontFamily: "system-ui, sans-serif",
                            border: `1px solid ${actif ? teinte : "rgba(255,255,255,0.30)"}`,
                            background: actif ? teinte : "transparent",
                            color: actif ? "#22301f" : "rgba(255,255,255,0.72)", transition: "all .15s", whiteSpace: "nowrap" }}>
                          {libelle}
                        </button>
                      ))}
                    </span>
                  )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: tmpl, background: VERT_ENTETE_BAS, color: "#fff", fontSize: 12, minHeight: HAUT_ENTETE }}>
                <div />
                {/* Le nom de l'édition couvre les DEUX pistes de sa colonne — sa
                    numérotation d'origine et son texte — au lieu du seul texte : il se
                    centre ainsi sur la colonne telle qu'on la lit, et non sur une moitié.
                    Mise en forme allégée : plus de soulignement ni de gras, le nom se
                    pose sur le bandeau sans le charger. */}
                {colonnes.map((c, k) => {
                  const i = slots.indexOf(c.trad_id);
                  return (
                    <div key={k} style={{ gridColumn: "span 2", borderLeft: "1px solid rgba(255,255,255,0.14)", padding: "0 6px", display: "flex", alignItems: "center" }}>
                      <select value={c.trad_id} aria-label={`Traduction ${k + 1}`}
                        onChange={e => setSlots(s => { const n = [...s]; n[i] = e.target.value; return n; })}
                        style={{ width: "100%", background: "transparent", color: "rgba(255,255,255,0.92)", border: "none", padding: "2px", fontSize: 12.5, fontWeight: 400, fontFamily: "Georgia, serif", cursor: "pointer", appearance: "none", outline: "none", textAlign: "center", textAlignLast: "center" }}>
                        <option value="" style={{ color: "#2a2620" }}>— aucune —</option>
                        {trads.map(t => <option key={t.trad_id} value={t.trad_id} style={{ color: "#2a2620" }}>{t.nom}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>

            {/* Corps : un bloc par livre, rendu paresseux (content-visibility) */}
            <div style={{ border: "1px solid #e4ded3", borderTop: "none", borderRadius: "0 0 6px 6px", background: "#fff" }}>
              {colonnes.length === 0 && <div style={{ padding: 20, color: "#a49b8c" }}>Choisir au moins une traduction dans l’en-tête ci-dessus.</div>}
        {!loading && colonnes.length > 0 && livresAffiches.map(l => {
          // Ligne d'un verset surnuméraire — hors ossature canonique, en violet.
          // Plusieurs éditions peuvent porter le même verset au même numéro d'origine : elles
          // partagent alors cette ligne, chacune dans sa colonne. Une édition qui ne l'a pas
          // affiche un tiret, comme pour un verset du canon qui lui manquerait.
          const ligneSurnum = (g: Surnum, cle: string) => {
            const editions = [...g.par.keys()].length;
            const titre = editions > 1
              ? `Verset hors ossature canonique, porté par ${editions} éditions au même numéro (${g.ch}, ${g.v})`
              : `Verset propre à cette édition — hors ossature canonique (${g.ch}, ${g.v})`;
            return (
              <div key={cle} style={{ display: "grid", gridTemplateColumns: tmpl, background: SURNUM_FOND, borderTop: "1px solid #e3e0f2", fontSize: 13.5 }}>
                {/* « ✦ » plutôt que « ＋ » : le plus disait « on a ajouté quelque chose », ce qui
                    est faux et un peu comptable. L'étoile marque un verset qui existe hors de
                    l'ossature, sans porter de jugement sur sa légitimité. */}
                <div title={titre} style={{ padding: "6px 8px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 12, color: SURNUM, borderRight: `2px solid ${SURNUM}` }}>✦</div>
                {colonnes.map((t, i) => {
                  const r = g.par.get(t.trad_id);
                  return (
                    <div key={i} style={{ display: "contents" }}>
                      <div style={{ padding: "6px 3px", textAlign: "right", whiteSpace: "nowrap", fontSize: 11, color: r ? SURNUM : "#cdc9e0", borderLeft: "1px solid #e3e0f2" }}>{r ? `${r.ch_orig}, ${r.v_orig}` : ""}</div>
                      <div style={{ padding: "6px 10px", lineHeight: 1.4, color: r ? "#3a3566" : "#cdc9e0" }}>{r ? texteEnrichi(r.texte) : "—"}</div>
                    </div>
                  );
                })}
              </div>
            );
          };

          // Vue « surnuméraires seulement » : uniquement les versets propres à la Septante.
          if (surnumOnly) {
            const srs = surnumParLivre.get(l.code) ?? [];
            if (!srs.length) return null;
            return (
              <section key={l.code} style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${srs.length * 34 + 40}px` } as React.CSSProperties}>
                <h2 style={{ margin: 0, padding: "8px 12px", fontFamily: "Georgia, serif", fontSize: 16, color: VERT, background: "#eef2ee", borderTop: "1px solid #dfe6df", borderBottom: "1px solid #dfe6df", position: "sticky", top: SOMMET_CORPS, zIndex: 3, textAlign: "center" }}>
                  {l.nom_fr} <span style={{ fontSize: 12, fontWeight: 400, color: SURNUM }}>· {srs.length} surnuméraire{srs.length > 1 ? "s" : ""}</span>
                {titresEdition(l.code).map(({ trad, ed }) => (
                  <span key={trad} style={{ display: "block", fontSize: 11.5, fontWeight: 400, fontStyle: "italic", color: "#8a8378", marginTop: 2 }}>
                    {trad} : {ed.nom}
                  </span>
                ))}
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
              {/* Le nom du livre ne s'écrit ici QUE si plusieurs livres se suivent : quand un
                  seul est ouvert, la barre de titre collante le porte déjà, et le répéter juste
                  en dessous le donnait à lire deux fois. Les désignations propres aux éditions,
                  elles, restent dans tous les cas — l'en-tête ne les porte pas. */}
              {(toutAfficher || titresEdition(l.code).length > 0) && (
                <h2 style={{ margin: 0, padding: "8px 12px", fontFamily: "Georgia, serif", fontSize: 16, color: VERT, background: "#eef2ee", borderTop: "1px solid #dfe6df", borderBottom: "1px solid #dfe6df", position: "sticky", top: SOMMET_CORPS, zIndex: 3, textAlign: "center" }}>
                  {toutAfficher && l.nom_fr}
                  {titresEdition(l.code).map(({ trad, ed }) => (
                    <span key={trad} style={{ display: "block", fontSize: 11.5, fontWeight: 400, fontStyle: "italic", color: "#8a8378", marginTop: 2 }}>
                      {trad} : {ed.nom}
                    </span>
                  ))}
                </h2>
              )}
              {debut.map((sr, i) => ligneSurnum(sr, `sd-${l.code}-${i}`))}
              {rows.map((r, idx) => {
                const sensible = sens.estSensible(l.code, r.ch_canon, r.v_canon);
                // UN DOUTE DE TRAVAIL N'EST PAS UNE INFORMATION DE LECTURE. Le rouge et le « ⚠ »
                // disent « ce verset est peut-être mal aligné » : c'est une consigne d'atelier.
                // Au lecteur, ils donnaient à croire que le texte lui-même est suspect. Ils ne
                // paraissent donc qu'en mode administrateur. Le violet des surnuméraires reste,
                // lui, visible de tous : il ne signale pas un doute mais un fait — ce verset
                // n'appartient pas à l'ossature canonique.
                const signaler = sensible && estAdmin;
                const desc = (sens.libelle.get(`${l.code}|${r.ch_canon}`) ?? []).join(" ; ");
                // Ligne que AUCUNE des traductions affichées ne porte. Elle reste à sa place
                // — le créneau existe dans l'ossature, et le taire ferait croire à un saut de
                // numérotation — mais elle se retire du regard : on la grise, pour qu'elle ne
                // se lise plus comme une ligne de texte qu'on aurait oublié de remplir.
                const ligneVide = colonnes.every(t => (cellule.get(`${r.id}|${t.trad_id}`) ?? []).length === 0);
                // zébrage discret une ligne sur deux, sans écraser les fonds signalétiques
                const fond = signaler ? ROUGE_FOND : ligneVide ? "#eeece8" : r.est_suscription ? "#f7f5f0" : (idx % 2 ? "#faf8f3" : "#fff");
                const apres = sensiblesOnly ? [] : (surnumApres.get(r.id) ?? []);
                return (
                  <Fragment key={r.id}>
                    <div style={{ display: "grid", gridTemplateColumns: tmpl, background: fond, borderTop: "1px solid #f0ece3", fontSize: 13.5 }}>
                      <div title={signaler ? desc : undefined} style={{ padding: "6px 8px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 12, color: signaler ? ROUGE : ligneVide ? "#b4b0a8" : VERT, borderRight: signaler ? `2px solid ${ROUGE}` : "1px solid #f0ece3" }}>
                        {r.ch_canon}, {r.v_canon}{signaler ? " ⚠" : ""}
                      </div>
                      {colonnes.map((t, i) => {
                        const cs = cellule.get(`${r.id}|${t.trad_id}`) ?? [];
                        return (
                          <div key={i} style={{ display: "contents" }}>
                            <div style={{ padding: "6px 3px", textAlign: "right", whiteSpace: "nowrap", fontSize: 11, color: "#a08e6a", borderLeft: "1px solid #f0ece3" }}>
                              {/* Plusieurs versets de l'édition peuvent partager un créneau du
                                  canon (l'édition coupe là où le canon ne coupe pas). Leurs
                                  numéros d'origine s'écrivent alors l'un SOUS l'autre, en
                                  regard du texte réuni : la numérotation propre à l'édition
                                  reste lisible sans que la colonne se décale. */}
                              {cs.map((c, k) => (
                                <div key={k}>
                                  {c.ch_orig}, {c.v_orig}
                                  {/* Une intervention d'alignement (scission d'un verset,
                                      rattachement corrigé) laisse toujours sa trace dans
                                      `notes`. On la signale ici d'un repère discret : le
                                      lecteur voit QU'il y a eu intervention, et le survol
                                      lui dit LAQUELLE. Rien n'est corrigé en silence. */}
                                  {c.notes ? (
                                    <span title={c.notes} style={{ marginLeft: 3, color: "#7a6fae", cursor: "help" }}>✎</span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            <div
                              className={estAdmin && cs.length > 0 ? `poly-cell${cs.some(c => c.id === enEdition) ? " poly-edition" : ""}` : undefined}
                              title={estAdmin && cs.length > 0 && !cs.some(c => c.id === enEdition) ? "Cliquer pour modifier ce verset" : undefined}
                              // Le clic porte sur la cellule entière, y compris ses marges : on ouvre
                              // le premier verset. Les cellules qui en comptent plusieurs (verset
                              // scindé par l'édition) restent modifiables un à un, chaque fragment
                              // interceptant le clic pour son propre compte.
                              onClick={estAdmin && cs.length > 0 && !cs.some(c => c.id === enEdition)
                                ? () => { setEnEdition(cs[0].id); setBrouillon(cs[0].texte ?? ""); setEnregistre("idle"); }
                                : undefined}
                              style={{ padding: "6px 10px", lineHeight: 1.4, color: signaler ? "#7a1d16" : "#2a2620" }}>
                              {cs.length === 0 ? (
                                deuterocanonique(r.id)
                                  ? <span title={`Ce passage nous est parvenu en grec, non en hébreu. Les Bibles catholique et orthodoxe le reçoivent ; la Bible protestante et la Bible hébraïque ne le comptent pas parmi les livres canoniques. La case est donc vide pour cette traduction, et non par oubli.`}
                                          style={{ color: "#9a8fb5", fontStyle: "italic", fontSize: 12, cursor: "help" }}>
                                      Absent dans cette traduction
                                    </span>
                                  : <span style={{ color: "#d3ccbf" }}>—</span>
                              ) : cs.map((c, k) => (
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
                                  // Cellule à plusieurs fragments : chaque fragment capte le clic
                                  // pour lui-même, sinon celui de la cellule ouvrirait toujours le
                                  // premier. Le survol reste géré par la cellule, d'un seul tenant.
                                  <span key={k}
                                    onClick={estAdmin && cs.length > 1
                                      ? e => { e.stopPropagation(); setEnEdition(c.id); setBrouillon(c.texte ?? ""); setEnregistre("idle"); }
                                      : undefined}>
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
              Colonne <strong>N°</strong> : numérotation propre de chaque édition. Lignes en <span style={{ color: SURNUM, fontWeight: 600 }}>violet ✦</span> = versets propres à la Septante, hors ossature canonique.
              {estAdmin && <> Lignes en <span style={{ color: ROUGE, fontWeight: 600 }}>rouge ⚠</span> = points pouvant poser problème <em>(relecture)</em>.</>}
            </p>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
