"use client";

// ────────────────────────────────────────────────────────────────────────────
// Page « Polyglotte » — comparaison des traductions, outil de suivi de la refonte.
// Quatre onglets (Ancien Testament / Psaumes / Nouveau Testament / Écrits non
// canoniques) ; la page s'ouvre vide, un onglet charge TOUTE sa portion sur une
// seule page défilante. Rendu par livre avec content-visibility:auto (seules les
// sections visibles sont calculées). Jusqu'à 4 traductions en parallèle, choisies
// directement dans l'en-tête du tableau ; numérotation propre de chaque édition collée
// au texte, lignes problématiques en rouge, zébrage une ligne sur deux.
// En mode admin, un crayon paraît au survol d'une cellule et ouvre une petite fenêtre
// pour corriger le verset (route serveur).
// Écran large requis : la page est signalée indisponible sous 820 px.
// ────────────────────────────────────────────────────────────────────────────

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cesurerGrec, codeLangue } from "@/app/lib/grec";
import { supabase } from "@/app/lib/supabase";
import NavLivres from "@/app/components/NavLivres";
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from "@/app/lib/mesures";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";
import { ABREV_FR } from "@/app/lib/bible";
import { texteSansEnrichissement } from "@/app/oeuvre/[id]/texteEnrichi";
import ModalSignalement from "@/app/components/ModalSignalement";

type Livre = { code: string; nom_fr: string; ordre: number };
type Trad = { trad_id: string; nom: string; ordre: number | null; label: string; edition: string | null; lang: string };


// Libellé daté d'une traduction : « Bible de Sacy, édition de 1730 ». L'année retenue est
// celle de l'édition-source (dernier millésime qu'elle cite), à défaut la fin de la période
// de publication de la traduction.
function libelleTrad(t: { nom: string; source_edition?: string | null; publication_fin_annee?: number | null }): string {
  let annee: string | null = null;
  if (t.source_edition) { const m = t.source_edition.match(/\d{4}/g); if (m?.length) annee = m[m.length - 1]; }
  if (!annee && t.publication_fin_annee) annee = String(t.publication_fin_annee);
  // « Bible de Sacy · 1730 » : le point médian sépare sans commenter, là où « — édition
  // de » alourdissait chaque ligne de la liste.
  return annee ? `${t.nom} · ${annee}` : t.nom;
}

// Le millésime SEUL, sans « Édition de » ni ponctuation : posé sous le nom de la
// traduction, en petites capitales espacées, il se lit pour ce qu'il est. Une date sous
// un titre n'a pas besoin qu'on la présente.
function editionTrad(t: { source_edition?: string | null; publication_fin_annee?: number | null }): string | null {
  let annee: string | null = null;
  if (t.source_edition) {
    const millesimes = t.source_edition.match(/\d{4}/g);
    if (millesimes?.length) annee = millesimes[millesimes.length - 1];
  }
  if (!annee && t.publication_fin_annee) annee = String(t.publication_fin_annee);
  return annee;
}
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

// Suzanne, Bel et le Cantique des trois enfants sont des additions grecques à Daniel : leur
// texte est servi À L'INTÉRIEUR de Daniel (Dn 3,24-90 / 13 / 14), et non comme livres séparés.
// Le canon leur donne un code (SUS/BEL/S3Y) mais ils n'ont aucun verset propre ; les laisser
// dans le sommaire y créait trois entrées vides, doublant Daniel. On les retire de la seule
// liste de navigation — Daniel, lui, garde ces passages. (À distinguer des autres livres
// deutéro/apocryphes encore vides — Esther grec, Hénoch… — qui sont de vraies œuvres à charger.)
const LIVRES_FONDUS_DANS_DANIEL = new Set(["SUS", "BEL", "S3Y"]);

// Un surnuméraire regroupé : le même verset hors ossature, tel que plusieurs éditions le
// portent au même numéro d'origine. `par` associe chaque traduction à sa version du verset ;
// `ancre` est le dernier créneau du canon rencontré, qui fixe la place de la ligne.
type Surnum = { cle: string; livre: string; ch: number; v: number; ancre: string | null; par: Map<string, V2Row> };

// Certaines éditions portent un enrichissement typographique dans le texte : l'italique
// <i>…</i> (Sacy 1730 : mots ajoutés par le traducteur, absents de la Vulgate) et le gras
// <b>…</b>. On le rend en vrais éléments React — jamais via dangerouslySetInnerHTML.

function texteEnrichi(t: string | null) {
  if (!t) return null;
  if (!t.includes("<i>") && !t.includes("<b>")) return t;
  return t.split(/(<i>[\s\S]*?<\/i>|<b>[\s\S]*?<\/b>)/g).filter(Boolean).map((bout, i) =>
    bout.startsWith("<i>")
      ? <i key={i}>{bout.slice(3, -4)}</i>
      : bout.startsWith("<b>")
      ? <b key={i}>{bout.slice(3, -4)}</b>
      : <span key={i}>{bout}</span>
  );
}

// Enrichit le texte APRÈS avoir posé les tirets conditionnels, mais seulement sur le grec
// (colonne dont `lang === "grc"`). Les tirets sont invisibles ailleurs qu'aux coupes.
function texteCesure(t: string | null, lang?: string) {
  return texteEnrichi(t && lang === "grc" ? cesurerGrec(t) : t);
}

const VERT = "#3d6b4f";
// L'en-tête du tableau ne doit PAS reprendre le vert de la NavBar : collés l'un sous l'autre,
// deux aplats identiques se lisaient comme un seul bandeau, et on ne voyait plus où commençait
// le tableau. Un vert nettement plus sombre garde la parenté sans la confusion.
const VERT_ENTETE = "#2b4536";
const VERT_ENTETE_BAS = "#35563f";   // la ligne des traductions, un demi-ton plus clair
const ROUGE = "#b3261e";
const ROUGE_FOND = "#fbeceb";
// Rose : les cas qui RÉSISTENT (statut « resiste » dans points_sensibles). Examinés,
// correction tentée ou pesée, non résolue — souvent parce que le contrôle de contenu
// a refusé le déplacement que le comptage suggérait. À distinguer du rouge, qui
// signale un point à vérifier : ici, on a déjà cherché et l'on a buté.
const ROSE_FOND = "#fdeaf4";
// Zébrage : un vert franc mais tenu, assez présent pour guider l'œil d'une colonne à
// l'autre sur une ligne, assez pâle pour ne pas concurrencer les fonds signalétiques
// (rouge, rose, violet) qui, eux, veulent dire quelque chose.
const VERT_ZEBRE = "#e4efe6";
const VERT_ZEBRE_CLAIR = "#f7fbf7";
const SURNUM = "#5a4b9c";       // versets propres à la Septante (hors ossature canonique)
const SURNUM_FOND = "#f0eef9";
const NB_SLOTS = 4;   // valeur de repli au premier rendu (avant mesure de l'écran)
const CLE_SLOTS = "polyglotte-slots";   // choix des traductions, mémorisé d'une visite à l'autre
// Nombre de colonnes de traduction ADAPTATIF : calculé d'après la largeur réelle
// du tableau (une colonne lisible ≈ MIN_COL_PX), plafonné à MAX_SLOTS sur grand
// écran, plancher MIN_SLOTS. Voir l'effet ResizeObserver plus bas.
const MIN_COL_PX = 250;
const MAX_SLOTS = 5;
const MIN_SLOTS = 2;
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

  // Les points de statut « resiste » forment leur propre catégorie : examinés, dont la
  // correction a été tentée ou pesée sans aboutir. On les recense à part pour les
  // teindre autrement — le rouge dit « à vérifier », le rose dit « on a buté ici ».
  const chapR = new Set<string>(), versR = new Set<string>();
  for (const p of points.filter(x => x.statut === "resiste")) {
    const ref = (p.reference ?? "").trim();
    let dernierLivre = p.livre && /^[1-4]?[A-Z]{2,3}$/.test(p.livre) ? p.livre : "";
    for (let tok of ref.split(/[\/,]/)) {
      tok = tok.trim(); if (!tok) continue;
      const m = tok.match(/^(?:([1-4]?[A-Z]{2,3})\s+)?(\d+)(?:\s*[:.]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
      if (!m) continue;
      const l = m[1] || dernierLivre; if (!l) continue; dernierLivre = l;
      const c = Number(m[2]);
      if (m[3]) { const v1 = Number(m[3]), v2 = m[4] ? Number(m[4]) : v1; for (let v = v1; v <= v2; v++) versR.add(`${l}|${c}|${v}`); }
      else chapR.add(`${l}|${c}`);
    }
  }
  const resiste = (l: string, c: number, v: number) => chapR.has(`${l}|${c}`) || versR.has(`${l}|${c}|${v}`);
  return { estSensible, resiste, libelle };
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

// ── Petite fenêtre d'édition d'un verset (administrateur) ─────────────────────────────
// Ouverte par le crayon qui paraît au survol d'une cellule. Une barre d'outils insère les
// marques que le corpus admet dans le texte biblique : l'italique se porte en <i>…</i>
// (Sacy : mots ajoutés par le traducteur, absents de la Vulgate), plus les espaces
// insécables et les guillemets. Le droit réel est revérifié côté serveur (charte §17).
function ModaleEditionVerset({ reference, valeurInitiale, statut, onEnregistrer, onFermer }: {
  reference: string; valeurInitiale: string; statut: "idle" | "envoi" | "ok" | "erreur";
  onEnregistrer: (valeur: string) => void; onFermer: () => void;
}) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const ta = useRef<HTMLTextAreaElement>(null);
  const outil: React.CSSProperties = { fontSize: '0.6875rem', padding: "4px 9px", borderRadius: 4, border: "1px solid #d6d0c4", background: "#fff", color: "#2a2520", cursor: "pointer", fontFamily: "inherit", lineHeight: 1 };
  const entourer = (avant: string, apres: string = avant) => {
    const el = ta.current; if (!el) return;
    const d = el.selectionStart, f = el.selectionEnd, sel = valeur.slice(d, f) || "texte";
    setValeur(valeur.slice(0, d) + avant + sel + apres + valeur.slice(f));
    setTimeout(() => { el.focus(); el.setSelectionRange(d + avant.length, d + avant.length + sel.length); }, 0);
  };
  const inserer = (t: string) => {
    const el = ta.current; if (!el) return;
    const d = el.selectionStart, f = el.selectionEnd;
    setValeur(valeur.slice(0, d) + t + valeur.slice(f));
    setTimeout(() => { el.focus(); el.setSelectionRange(d + t.length, d + t.length); }, 0);
  };
  return (
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(30,25,20,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 9, padding: "18px 20px", width: 520, maxWidth: "100%", boxShadow: "0 12px 36px rgba(40,30,15,0.24)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
          <p style={{ margin: 0, fontSize: '0.78125rem', fontWeight: 600, color: VERT }}>Modifier — {reference}</p>
          <button onClick={onFermer} style={{ border: "none", background: "none", cursor: "pointer", fontSize: '0.9375rem', color: "#b0a89e", lineHeight: 1, padding: 0 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => entourer("<b>", "</b>")} title="Gras" style={{ ...outil, fontWeight: 700 }}>G</button>
          <button onClick={() => entourer("<i>", "</i>")} title="Italique — mots ajoutés par le traducteur" style={{ ...outil, fontStyle: "italic" }}>I</button>
          <span style={{ width: 1, alignSelf: "stretch", background: "#e4dfd8" }} />
          <button onClick={() => inserer(" ")} title="Espace insécable" style={outil}>Esp. inséc.</button>
          <button onClick={() => inserer(" ")} title="Espace fine insécable" style={outil}>Esp. fine</button>
          <button onClick={() => entourer("« ", " »")} title="Guillemets français" style={outil}>« »</button>
          <button onClick={() => entourer("“", "”")} title="Guillemets anglais (citation imbriquée)" style={outil}>“”</button>
        </div>
        <textarea ref={ta} autoFocus value={valeur} onChange={e => setValeur(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onFermer(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onEnregistrer(valeur); }}
          rows={5}
          style={{ width: "100%", boxSizing: "border-box", fontSize: '0.84375rem', lineHeight: 1.5, fontFamily: "var(--font-source-serif), Georgia, serif", padding: "9px 11px", border: "1px solid #d6d0c4", borderRadius: 5, background: "#faf8f4", color: "#2a2520", outline: "none", resize: "vertical" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: '0.65625rem', color: "#b0a89e", marginRight: "auto" }}>⌘/Ctrl+↵ enregistre · Échap ferme</span>
          {statut === "erreur" && <span style={{ fontSize: '0.6875rem', color: ROUGE }}>échec de l’enregistrement</span>}
          <button onClick={onFermer} style={{ padding: "5px 12px", fontSize: '0.71875rem', borderRadius: 4, border: "1px solid #d6cfc2", background: "#fff", color: "#8a8378", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={() => onEnregistrer(valeur)} disabled={statut === "envoi"}
            style={{ padding: "5px 15px", fontSize: '0.71875rem', borderRadius: 4, border: "none", background: VERT, color: "#fff", cursor: statut === "envoi" ? "default" : "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            {statut === "envoi" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Petites actions de la colonne N° (lecteur) : citer, signaler ──────────────────────
// Mêmes symboles que les pages Bible et Œuvre : le signet ajoute le verset à « mes
// citations », le fanion ouvre un signalement. Discrets, révélés au survol de la ligne.
const ACT_BTN: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 0, width: 14, height: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: '0.625rem', lineHeight: 1, transition: "color .15s" };
function IconeSignet({ rempli }: { rempli?: boolean }) {
  return (
    <svg width="10" height="11" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill={rempli ? "currentColor" : "none"} />
    </svg>
  );
}

// Bouton « citer » à bascule : ajoute le verset à « mes citations » s'il n'y est pas,
// l'en retire s'il y est déjà (signet plein = enregistré). Réservé aux comptes connectés.
function BoutonCiterVerset({ userId, saved, cle, refLivre, refAbr, chapitre, verset, texte, traductionLabel, onSaved, onRemoved }: {
  userId: string | null; saved: string | null; cle: string; refLivre: string; refAbr: string; chapitre: number; verset: number;
  texte: string; traductionLabel: string; onSaved: (cle: string, id: string) => void; onRemoved: (cle: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [survol, setSurvol] = useState(false);
  if (!userId) return null;
  const basculer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    if (saved) {
      await supabase.from("prelevements").delete().eq("id", saved);
      onRemoved(cle);
    } else {
      const { data, error } = await supabase.from("prelevements").insert({
        user_id: userId, type: "biblique",
        ref_livre: refLivre, ref_livre_abr: refAbr,
        ref_chapitre: chapitre, ref_verset: verset,
        texte: texteSansEnrichissement(texte), traduction: traductionLabel,
      }).select("id").single();
      if (!error && data) onSaved(cle, data.id);
    }
    setBusy(false);
  };
  // Enregistré : signet plein (vert) ; au survol, il devient une croix pour signifier
  // « cliquer = retirer de la liste ».
  const montrerCroix = !!saved && survol && !busy;
  return (
    <button onClick={basculer} title={saved ? "Retirer de mes citations" : "Ajouter à mes citations"} className="poly-act"
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      style={{ ...ACT_BTN, color: montrerCroix ? "#b5502f" : saved ? VERT : "#b7ad9a", opacity: saved ? 1 : undefined }}
      aria-label={saved ? "Retirer de mes citations" : "Ajouter à mes citations"}>
      {busy ? "…" : montrerCroix ? "✕" : <IconeSignet rempli={!!saved} />}
    </button>
  );
}

function BoutonSignalerVerset({ refLisible, texte }: { refLisible: string; texte?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const envoyer = async (message: string, importance?: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/signalements", {
      method: "POST", headers,
      body: JSON.stringify({ reference: refLisible, message, importance, url_source: typeof window !== "undefined" ? window.location.href : null }),
    });
    if (!res.ok) throw new Error("échec du signalement");
  };
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true); }} title="Signaler une erreur" className="poly-act"
        style={{ ...ACT_BTN, color: "#b7ad9a" }} aria-label="Signaler">⚑</button>
      {ouvert && <ModalSignalement titre={refLisible} texteObjet={texte || undefined} avecNiveauImportance onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  );
}

export default function PolyglottePage() {
  const [livres, setLivres] = useState<Livre[]>([]);
  // trad_id → code du livre → nom qu'il porte dans cette édition. Seuls les écarts au canon.
  const [livresEd, setLivresEd] = useState<Record<string, Record<string, { nom: string; abrege: string }>>>({});
  const [trads, setTrads] = useState<Trad[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [onglet, setOnglet] = useState<Onglet | null>(null);   // la page s'ouvre vide : on choisit un ensemble
  const [slots, setSlots] = useState<string[]>([]);
  // Nombre de colonnes tenant à l'écran (mesuré), et conteneur du tableau observé.
  const [maxSlots, setMaxSlots] = useState(NB_SLOTS);
  const refTable = useRef<HTMLDivElement>(null);
  // Mémorise le choix des colonnes dès qu'il est renseigné (jamais l'état initial vide).
  useEffect(() => {
    if (slots.length >= MIN_SLOTS && slots.some(Boolean)) {
      try { window.localStorage.setItem(CLE_SLOTS, JSON.stringify(slots)); } catch { /* stockage indisponible */ }
    }
  }, [slots]);
  // Largeur adaptative : combien de colonnes de traduction tiennent, d'après la
  // largeur RÉELLE du tableau (recalculé au redimensionnement de la fenêtre).
  useEffect(() => {
    const el = refTable.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const calc = () => {
      const dispo = el.clientWidth - 36 - 46;   // paddings latéraux + colonne de référence (46px)
      const n = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, Math.floor(dispo / MIN_COL_PX)));
      setMaxSlots(n);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Ajuste le nombre de slots à la largeur : préserve les traductions déjà choisies,
  // complète par des slots vides, ou retire les colonnes qui ne tiennent plus.
  useEffect(() => {
    if (slots.length !== maxSlots) {
      setSlots(prev => Array.from({ length: maxSlots }, (_, i) => prev[i] ?? ""));
    }
  }, [maxSlots, slots.length]);
  const [canon, setCanon] = useState<CanonRow[]>([]);
  const [v2, setV2] = useState<V2Row[]>([]);
  const [sensiblesOnly, setSensiblesOnly] = useState(false);
  const [surnumOnly, setSurnumOnly] = useState(false);
  const [livreChoisi, setLivreChoisi] = useState<string | null>(null);  // un seul livre à la fois
  // Par défaut on n'affiche QU'UN chapitre (l'affichage du livre entier est trop lourd) :
  // `chapitreChoisi` = le chapitre montré ; `null` = livre entier (option explicite au survol).
  const [chapitreChoisi, setChapitreChoisi] = useState<number | null>(1);
  // Verset ciblé par la barre de recherche du volet (« Gn 1 1 ») : on y défile et on le
  // surligne brièvement, à la manière de la page Bible.
  const [versetCible, setVersetCible] = useState<{ ch: number; v: number } | null>(null);
  const [toutAfficher, setToutAfficher] = useState(false);              // …sauf demande explicite
  // Édition en place (admin). L'affordance dépend du client, mais l'autorisation réelle
  // est revérifiée côté serveur par /api/admin/verset-modifier (charte §17).
  // `estAdminReel` = les droits ; `estAdmin` = ce qu'on montre. Un admin qui bascule
  // en « mode utilisateur standard » doit voir la page comme un lecteur : les réglages
  // de relecture et les crayons disparaissent, ses droits ne changent pas.
  const [estAdminReel, setEstAdmin] = useState(false);
  const { modeUtilisateurStandard } = useAffichageAdmin();
  const estAdmin = estAdminReel && !modeUtilisateurStandard;
  const [userId, setUserId] = useState<string | null>(null);   // pour « mes citations »
  // Versets déjà dans « mes citations » : clé « ABR|ch|v » → id du prélèvement (pour retirer).
  const [prelevs, setPrelevs] = useState<Map<string, string>>(new Map());
  const marquerCite = useCallback((cle: string, id: string) => setPrelevs(m => new Map(m).set(cle, id)), []);
  const retirerCite = useCallback((cle: string) => setPrelevs(m => { const n = new Map(m); n.delete(cle); return n; }), []);
  // Verset en cours d'édition dans la petite fenêtre (ouverte par le crayon de survol).
  const [cibleEdition, setCibleEdition] = useState<{ id: string; texte: string; reference: string } | null>(null);
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
    setChapitreChoisi(1);   // on ouvre sur le premier chapitre, pas le livre entier
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
    supabase.from("livres").select("code, nom_fr, ordre").order("ordre").then(({ data }) => setLivres((data ?? []).filter(l => !LIVRES_FONDUS_DANS_DANIEL.has(l.code))));
    // Désignation des livres propre à chaque édition, quand elle diffère du canon : la
    // Sacy de 1730 compte quatre livres des Rois là où le canon en compte deux de Samuel
    // et deux des Rois. Seuls les écarts sont enregistrés (voir scripts/livres-editions.mjs).
    // Passe par une route serveur : la table `parametres` est protégée par RLS et le client
    // public n'y voit rien — elle contient aussi la charte éditoriale, qui doit le rester.
    fetch("/api/livres-editions").then(r => r.json()).then(setLivresEd).catch(() => setLivresEd({}));
    supabase.from("points_sensibles").select("livre, reference, type, description, statut, notes").then(({ data }) => setPoints(data ?? []));
    (async () => {
      const { data: tr } = await supabase.from("traductions").select("trad_id, nom, ordre, source_edition, publication_fin_annee, langue").order("ordre");
      const migres: Trad[] = [];
      for (const t of tr ?? []) {
        const { count } = await supabase.from("versets_v2").select("trad_id", { count: "exact", head: true }).eq("trad_id", t.trad_id);
        if ((count ?? 0) > 0) migres.push({ trad_id: t.trad_id, nom: t.nom, ordre: t.ordre, label: libelleTrad(t), edition: editionTrad(t), lang: codeLangue((t as { langue?: string | null }).langue) });
      }
      setTrads(migres);
      // Choix des colonnes : celui que l'utilisateur a laissé la dernière fois (localStorage),
      // sinon par défaut les quatre premières traductions distinctes. On ne retient d'un choix
      // sauvegardé que les traductions encore disponibles.
      const dispo = new Set(migres.map(m => m.trad_id));
      let init: string[] | null = null;
      try {
        const brut = typeof window !== "undefined" ? window.localStorage.getItem(CLE_SLOTS) : null;
        const parse = brut ? JSON.parse(brut) : null;
        if (Array.isArray(parse) && parse.some((x: string) => dispo.has(x))) {
          init = parse.map((x: string) => (dispo.has(x) ? x : ""));
        }
      } catch { /* localStorage indisponible ou corrompu : on retombe sur le défaut */ }
      setSlots(init ?? Array.from({ length: NB_SLOTS }, (_, i) => migres[i]?.trad_id ?? ""));
    })();
    // l'utilisateur connecté est-il admin ? (affichage seulement — le serveur revérifie)
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id ?? null;
      setUserId(uid);
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
      setEnregistre("ok"); setCibleEdition(null);
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
    const codes = livresAffiches.map(l => l.code);
    // AFFICHAGE PLUS RAPIDE : dans la vue par défaut (un seul chapitre d'un seul livre), on ne
    // charge QUE ce chapitre — quelques dizaines de lignes au lieu du livre entier. Les
    // identifiants du canon ont la forme « LIVRE.chapitre.verset », d'où le filtre `like` sur
    // `canon_id`. Les modes qui ont besoin de tout le livre (livre entier, tout afficher,
    // lignes problématiques, surnuméraires) désactivent ce filtre. Les surnuméraires (sans
    // créneau du canon) ne paraissent donc qu'en vue « Livre entier » — ce sont des cas rares.
    const monoLivre = livresAffiches.length === 1;
    const chScope = (!toutAfficher && !sensiblesOnly && !surnumOnly && monoLivre && chapitreChoisi != null) ? chapitreChoisi : null;
    const [c, vv] = await Promise.all([
      fetchPaged<CanonRow>("versets_canon", "id, livre, ch_canon, v_canon, est_suscription",
        q => { const x = q.in("livre", codes); return chScope != null ? x.eq("ch_canon", chScope) : x; }),
      fetchPaged<V2Row>("versets_v2", "id, canon_id, livre, trad_id, ch_orig, v_orig, v_orig_suffixe, texte, notes",
        q => { const x = q.in("livre", codes).in("trad_id", tradIds); return chScope != null ? x.like("canon_id", `${codes[0]}.${chScope}.%`) : x; }),
    ]);
    c.sort((a, b) => (ordreDe.get(a.livre)! - ordreDe.get(b.livre)!) || (a.ch_canon - b.ch_canon) || (a.v_canon - b.v_canon));
    setCanon(c); setV2(vv);
  }, [livresAffiches, slots, ordreDe, chapitreChoisi, toutAfficher, sensiblesOnly, surnumOnly]);
  useEffect(() => { charger(); }, [charger]);

  // Charge les citations déjà enregistrées par l'utilisateur pour le(s) livre(s) affiché(s),
  // afin que le signet apparaisse plein sur les versets favoris et qu'un clic les retire.
  useEffect(() => {
    if (!userId || !livresAffiches.length) { setPrelevs(new Map()); return; }
    const abrs = livresAffiches.map(l => ABREV_FR[l.code] ?? l.code);
    supabase.from("prelevements").select("id, ref_livre_abr, ref_chapitre, ref_verset")
      .eq("user_id", userId).eq("type", "biblique").in("ref_livre_abr", abrs)
      .then(({ data }) => {
        const m = new Map<string, string>();
        for (const p of data ?? []) m.set(`${p.ref_livre_abr}|${p.ref_chapitre}|${p.ref_verset}`, p.id);
        setPrelevs(m);
      });
  }, [userId, livresAffiches]);

  // Verset ciblé (barre de recherche du volet) : une fois le chapitre chargé, on y défile
  // et l'on efface le surlignage après un instant. Dépend de `canon` pour attendre le rendu.
  useEffect(() => {
    if (!versetCible || !livreChoisi) return;
    const id = `poly-${livreChoisi}-${versetCible.ch}-${versetCible.v}`;
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const t2 = setTimeout(() => setVersetCible(null), 2600);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [versetCible, livreChoisi, canon]);

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

  // Une colonne par SLOT (toujours NB_SLOTS) : un slot vidé (« — aucune — ») garde sa
  // place, colonne vide, au lieu de disparaître. `colonnes` = seulement les slots pourvus
  // d'une traduction, pour les calculs qui n'ont de sens que sur du texte réel.
  const slotCols = slots.map((id, i) => ({ slot: i, trad: trads.find(t => t.trad_id === id) ?? null }));
  const colonnes = slotCols.map(s => s.trad).filter((t): t is Trad => !!t);
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
  // Une seule colonne par traduction : la référence d'origine n'a plus de colonne à elle,
  // elle est passée EN LETTRINE dans le bloc de texte, que le texte vient habiller. Tout
  // ce qu'occupait la colonne étroite revient donc au texte.
  const tmpl = `46px ${slotCols.map(() => "minmax(0, 1fr)").join(" ")}`;
  const HAUT_ENTETE = 43;   // titre et date de l'édition, sur deux lignes
  const HAUT_TITRE  = 25;   // hauteur du bandeau portant le nom du livre
  const HAUT_NAV    = 10;   // blanc entre la NavBar et le haut du tableau
  // Sommet du corps du tableau : sous la navbar, le blanc de séparation, la barre de
  // titre et la ligne des traductions. C'est là que viennent se poser les bandeaux de
  // nom de livre quand plusieurs livres se suivent.
  // HAUTEUR_NAVBAR est une chaîne rem ; on compose en calc() CSS (pas d'addition
  // numérique). Les hauteurs de sous-bandeaux restent en px.
  const SOMMET_CORPS = `calc(${HAUTEUR_NAVBAR} + ${HAUT_NAV + HAUT_TITRE + HAUT_ENTETE}px)`;

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
        /* Citer / signaler : empilés verticalement sous le numéro canonique, nus (aucun
           fond) — ils ne se révèlent qu'au survol de la ligne. */
        /* Légèrement desserrés ENTRE EUX (petit écart vertical), et décollés du numéro
           canonique : c'est la marge haute qui les en sépare. */
        .poly-actstack {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          width: -moz-fit-content; width: fit-content; margin: 6px auto 0;
          line-height: 0;
        }
        .poly-act { opacity: 0; transition: opacity .12s, color .15s; }
        .poly-row:hover .poly-act { opacity: .85; }
        .poly-act:hover { opacity: 1 !important; color: #8a6a52; }
        /* Le menu natif reste posé sur toute la surface, mais son choix est composé en
           deux lignes : titre en sérif, date plus discrète, sans ponctuation parasite. */
        .poly-trad-pick:hover { background: rgba(255,255,255,0.06); }
        .poly-trad-pick:focus-within { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.45); }
        /* La référence d'origine en LETTRINE : un petit bloc flottant, posé au début du
           verset, que le texte vient habiller comme une initiale ornée. Le filet à droite
           la tient à distance sans l'enfermer dans un cadre. */
        /* Texte justifié, serré, et césuré généreusement : sans césure, la justification
           d'une colonne étroite creuse des lézardes. hyphenate-limit-chars autorise des
           fragments courts, faute de quoi le navigateur renonce à couper. La langue de la
           cellule (attribut lang) décide du dictionnaire — voir codeLangue(). */
        .poly-texte-cell {
          min-width: 0;
          padding: 5px 10px 6px;
          text-align: justify;
          text-align-last: left;
          hyphens: auto; -webkit-hyphens: auto;
          hyphenate-limit-chars: 5 2 2;
          word-spacing: -0.06em;
          letter-spacing: -0.01em;
          line-height: 1.26;
        }
        .poly-texte-cell::after { content: ""; display: block; clear: both; }
        /* Aucune marge ni rembourrage VERTICAL, et pas de taille propre : la lettrine
           garde la taille de police de la ligne, si bien que la hauteur de ses éléments
           s'exprime en em de la ligne — voir .poly-lettrine-item. */
        .poly-lettrine {
          float: left;
          display: flex; flex-direction: column; align-items: flex-end;
          margin: 0 8px 0 0; padding: 0 7px 0 0;
          border-right: 1px solid rgba(61,107,79,0.22);
          font-family: var(--font-source-sans), Arial, sans-serif;
          font-weight: 400; letter-spacing: 0.03em;
          font-variant-numeric: tabular-nums;
          color: #6f8f7b; text-align: right;
        }
        /* Le numéro est petit, mais son étui fait EXACTEMENT une ligne de texte (1.26em,
           l'interligne de la cellule) : le flottant ne repousse donc qu'une seule ligne,
           et deux versets partageant un créneau en repoussent deux. */
        .poly-lettrine-ref { display: block; white-space: nowrap; font-size: 8.5px; line-height: 1; }
        /* Le chapitre s'efface derrière le verset : les deux sont là, mais l'œil qui
           parcourt la colonne accroche le numéro qui change. */
        .poly-lettrine-ch { font-weight: 400; color: #a9bcb0; }
        .poly-lettrine-item { position: relative; display: flex; align-items: center; justify-content: flex-end; height: 1.26em; }
        /* Le crayon SE POSE SUR le numéro de référence d'origine : au survol de la cellule,
           il recouvre le numéro (fond opaque = celui de la ligne, passé en style inline, donc
           accordé au zébrage alterné) et le remplace. Hors survol, il ne réserve aucune place. */
        .poly-edit {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: flex-end;
          opacity: 0; pointer-events: none;
          border-radius: 2px; padding: 0 1px;
        }
        .poly-texte-cell:hover .poly-edit,
        .poly-edit:focus-visible { opacity: 1; pointer-events: auto; }
      `}</style>

      <div className="poly-mobile" style={{ maxWidth: '32.5rem', margin: "0 auto", padding: "48px 22px", fontFamily: "var(--font-source-sans), Arial, sans-serif", textAlign: "center", color: "#5b544c" }}>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.375rem', color: VERT, margin: "0 0 14px" }}>Polyglotte</h1>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
          Cette page compare plusieurs traductions côte à côte : elle demande un écran large.
          <br /><br />
          <strong>Ouvrez-la depuis un ordinateur ou une tablette.</strong>
        </p>
      </div>

      {/* Le MÊME volet que la page Bible — pas un cousin qui lui ressemble. Un seul composant
          pour les deux pages, donc une seule navigation à maintenir et à apprendre. */}
      <div className="poly-outil">
        <div style={{ display: "flex", alignItems: "flex-start", minHeight: "100vh" }}>
        {/* `top: 0` collait le volet au bord du viewport, c'est-à-dire DERRIÈRE la
            navbar fixe : sa barre de recherche disparaissait sous elle dès qu'on
            descendait. Le volet se cale donc sous la navbar, et n'occupe que la
            hauteur restante. */}
        <div style={{ position: "sticky", top: HAUTEUR_NAVBAR, height: HAUTEUR_SOUS_NAVBAR, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {/* Titre de la page, en tête du volet de gauche. */}
          <div style={{ flexShrink: 0, background: "#faf8f4", borderRight: "1px solid #d6d0c4", borderBottom: "1px solid #d6d0c4", padding: "12px 14px 11px" }}>
            <h1 style={{ margin: 0, fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', fontWeight: 600, color: VERT, letterSpacing: "0.01em", lineHeight: 1.2 }}>Bible polyglotte</h1>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <NavLivres
              livres={livresNav}
              livreActif={livreChoisi ?? ""}
              chapitreActif={chapitreChoisi ?? 0}
              traductionIndex={0}
              setTraductionIndex={() => {}}
              traductions={[]}
              onChoisirLivre={choisirLivre}
              onChoisirChapitre={(code, ch) => { if (code !== livreChoisi) choisirLivre(code); setChapitreChoisi(ch); setToutAfficher(false); setVersetCible(null); }}
              onChoisirLivreEntier={(code) => { if (code !== livreChoisi) choisirLivre(code); setChapitreChoisi(null); setToutAfficher(false); setVersetCible(null); }}
              onChoisirVerset={(code, ch, v) => { if (code !== livreChoisi) choisirLivre(code); setChapitreChoisi(ch); setToutAfficher(false); setVersetCible({ ch, v }); }}
              entierActif={chapitreChoisi === null && !toutAfficher}
              titre="Livres à comparer"
            />
          </div>
        </div>

      <div ref={refTable} style={{ flex: 1, minWidth: 0, padding: "12px 18px 60px", fontFamily: "var(--font-source-sans), Arial, sans-serif", color: "#2a2620" }}>
        {/* Aucun livre choisi : la page reste vide et l'explique */}
        {!onglet && (
          <div style={{ margin: "60px auto", maxWidth: '35rem', display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* L'image porte un large blanc (dégradé) sous le dessin : on remonte l'invite en
                marge négative pour qu'elle se pose sous LE LIVRE, non sous le cadre de l'image. */}
            <img src="/ornements/livre_pol.png" alt="" aria-hidden="true"
              style={{ width: "min(230px, 55%)", height: "auto", opacity: 0.9, mixBlendMode: "multiply", marginBottom: 0 }} />
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontStyle: "italic", color: "#9a958d", letterSpacing: "0.02em", margin: "-42px 0 0" }}>Ouvrez un livre</p>
          </div>
        )}

        {onglet && (
          <>

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
                  <div style={{ gridColumn: "2 / -1", padding: "3px 12px", textAlign: "center", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.90625rem', letterSpacing: "0.01em" }}>
                    {toutAfficher
                      ? LIBELLE_ONGLET[onglet]
                      : `${livres.find(l => l.code === livreChoisi)?.nom_fr ?? LIBELLE_ONGLET[onglet]}${chapitreChoisi != null ? ` · Chapitre ${chapitreChoisi}` : ""}`}
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
                            // Les trois réglages s'excluent : activer l'un désactive les deux
                            // autres (plus de cumul « tout afficher » + « surnuméraires »…).
                            if (cle === "tout") { setToutAfficher(!actif); if (!actif) { setSensiblesOnly(false); setSurnumOnly(false); } }
                            else if (cle === "sensibles") { setSensiblesOnly(!actif); if (!actif) { setSurnumOnly(false); setToutAfficher(false); } }
                            else { setSurnumOnly(!actif); if (!actif) { setSensiblesOnly(false); setToutAfficher(false); } }
                          }}
                          title={libelle}
                          style={{ padding: "2px 9px", fontSize: '0.65625rem', fontWeight: 500, cursor: "pointer", borderRadius: 999, fontFamily: "var(--font-source-sans), Arial, sans-serif",
                            border: `1px solid ${actif ? teinte : "rgba(255,255,255,0.30)"}`,
                            background: actif ? teinte : "transparent",
                            color: actif ? "#22301f" : "rgba(255,255,255,0.72)", transition: "all .15s", whiteSpace: "nowrap" }}>
                          {libelle}
                        </button>
                      ))}
                    </span>
                  )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: tmpl, background: VERT_ENTETE_BAS, color: "#fff", fontSize: '0.75rem', minHeight: HAUT_ENTETE }}>
                <div />
                {/* Un en-tête par colonne de traduction, exactement : la numérotation
                    d'origine ayant rejoint le texte en lettrine, il n'y a plus de seconde
                    piste à couvrir. Mise en forme allégée — ni soulignement ni gras, le nom
                    se pose sur le bandeau sans le charger. */}
                {slotCols.map((sc, k) => {
                  const i = sc.slot;
                  return (
                    // Une seule colonne par traduction depuis que la référence d'origine est
                    // passée en lettrine : le « span 2 » d'avant faisait déborder chaque
                    // en-tête sur sa voisine, et les quatre retombaient à la ligne en escalier.
                    <div key={k} style={{ borderLeft: "1px solid rgba(255,255,255,0.14)", padding: "0 4px", display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0 }}>
                      {/* Le nom est un menu déroulant : soulignement pointillé + chevron pour
                          qu'on voie qu'il se clique. Les traductions déjà affichées ailleurs
                          sont grisées et non sélectionnables. Le libellé porte l'année d'édition. */}
                      <span className="poly-trad-pick" title="Cliquer pour changer de traduction"
                        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minWidth: 0, padding: "4px 18px 4px 6px", borderRadius: 4, transition: "background .15s, box-shadow .15s" }}>
                        <span aria-hidden style={{ minWidth: 0, textAlign: "center", lineHeight: 1.06 }}>
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.78125rem', color: "rgba(255,255,255,0.96)" }}>
                            {sc.trad?.nom ?? "Aucune traduction"}
                          </span>
                          {/* Le millésime seul, en petites capitales espacées, sous le nom.
                              Sans filet de séparation : le simple retrait vertical suffit à
                              distinguer les deux lignes. */}
                          {sc.trad?.edition && (
                            <span style={{ display: "block", marginTop: 6, fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: '0.53125rem', fontWeight: 600, letterSpacing: "0.18em", textIndent: "0.18em", color: "rgba(255,255,255,0.62)" }}>
                              {sc.trad.edition}
                            </span>
                          )}
                        </span>
                        <select value={slots[i] ?? ""} aria-label={`Traduction ${k + 1}`}
                          onChange={e => setSlots(s => { const n = [...s]; n[i] = e.target.value; return n; })}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}>
                          <option value="" style={{ color: "#2a2620" }}>— aucune —</option>
                          {trads.map(t => {
                            const deja = t.trad_id !== slots[i] && slots.includes(t.trad_id);
                            return <option key={t.trad_id} value={t.trad_id} disabled={deja} style={{ color: deja ? "#b0aaa0" : "#2a2620" }}>{t.label}{deja ? " (déjà affichée)" : ""}</option>;
                          })}
                        </select>
                        {/* Chevron repris de la Polyglotte de recherche : plus fin et mieux
                            dessiné que le « ▾ » unicode. */}
                        <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.72)" }}>
                          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>

            {/* Corps : un bloc par livre, rendu paresseux (content-visibility) */}
            <div style={{ border: "1px solid #e4ded3", borderTop: "none", borderRadius: "0 0 6px 6px", background: "#fff" }}>
              {colonnes.length === 0 && <div style={{ padding: 20, color: "#a49b8c" }}>Choisir au moins une traduction dans l’en-tête ci-dessus.</div>}
        {/* On NE démonte PAS le corps pendant un rechargement : changer de traduction ne
            fait que remplacer le texte des cellules, la structure (lignes du canon) reste
            en place — la position de lecture ne bouge donc pas et la transition est fluide. */}
        {colonnes.length > 0 && livresAffiches.map(l => {
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
              <div key={cle} style={{ display: "grid", gridTemplateColumns: tmpl, background: SURNUM_FOND, borderTop: "1px solid #e3e0f2", fontSize: '0.8125rem' }}>
                {/* « ✦ » plutôt que « ＋ » : le plus disait « on a ajouté quelque chose », ce qui
                    est faux et un peu comptable. L'étoile marque un verset qui existe hors de
                    l'ossature, sans porter de jugement sur sa légitimité. */}
                <div title={titre} style={{ padding: "5px 6px", whiteSpace: "nowrap", fontWeight: 700, fontSize: '0.71875rem', color: SURNUM, borderRight: `2px solid ${SURNUM}` }}>✦</div>
                {slotCols.map((sc, i) => {
                  const r = sc.trad ? g.par.get(sc.trad.trad_id) : undefined;
                  return (
                    <div key={i} className="poly-texte-cell" lang={sc.trad?.lang}
                      style={{ borderLeft: "1px solid #e3e0f2", color: r ? "#3a3566" : "#cdc9e0" }}>
                      {/* Même lettrine que les versets canoniques, au violet des surnuméraires :
                          la référence d'origine est ici la seule qui existe. */}
                      {r && (
                        <span className="poly-lettrine" style={{ color: SURNUM, borderRightColor: "rgba(90,75,156,0.22)" }}>
                          <span className="poly-lettrine-item">
                            <span className="poly-lettrine-ref">
                              <span className="poly-lettrine-ch" style={{ color: "#9d93c4" }}>{r.ch_orig},</span> {r.v_orig}
                            </span>
                          </span>
                        </span>
                      )}
                      {!sc.trad ? "" : r ? texteCesure(r.texte, sc.trad.lang) : "—"}
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
                <h2 style={{ margin: 0, padding: "8px 12px 8px 70px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', color: VERT, background: "#eef2ee", borderTop: "1px solid #dfe6df", borderBottom: "1px solid #dfe6df", position: "sticky", top: SOMMET_CORPS, zIndex: 3, textAlign: "center" }}>
                  {l.nom_fr} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: SURNUM }}>· {srs.length} surnuméraire{srs.length > 1 ? "s" : ""}</span>
                {titresEdition(l.code).map(({ trad, ed }) => (
                  <span key={trad} style={{ display: "block", fontSize: '0.71875rem', fontWeight: 400, fontStyle: "italic", color: "#8a8378", marginTop: 2 }}>
                    {trad} : {ed.nom}
                  </span>
                ))}
                </h2>
                {srs.map((sr, i) => ligneSurnum(sr, `so-${l.code}-${i}`))}
              </section>
            );
          }

          const rows0 = parLivre.get(l.code) ?? [];
          // Filtre chapitre : par défaut on ne montre qu'un chapitre (le livre entier est trop
          // lourd). `chapitreChoisi === null` OU « tout afficher » lèvent le filtre.
          const chFiltre = (!toutAfficher && !sensiblesOnly && chapitreChoisi != null) ? chapitreChoisi : null;
          const rowsCh = chFiltre != null ? rows0.filter(r => r.ch_canon === chFiltre) : rows0;
          const rows = sensiblesOnly ? rowsCh.filter(r => sens.estSensible(l.code, r.ch_canon, r.v_canon)) : rowsCh;
          // Les surnuméraires de tête de livre ne s'affichent qu'au chapitre 1 (ou en livre entier).
          const debut = (sensiblesOnly || (chFiltre != null && chFiltre !== 1)) ? [] : (surnumStart.get(l.code) ?? []);
          if (!rows.length && !debut.length) return null;
          const hauteur = (rows.length + (sensiblesOnly ? 0 : surnumCount.get(l.code) ?? 0)) * 34 + 40;

          return (
            <section key={l.code} style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${hauteur}px` } as React.CSSProperties}>
              {/* Le nom du livre ne s'écrit ici QUE si plusieurs livres se suivent : quand un
                  seul est ouvert, la barre de titre collante le porte déjà, et le répéter juste
                  en dessous le donnait à lire deux fois. Les désignations propres aux éditions,
                  elles, restent dans tous les cas — l'en-tête ne les porte pas. */}
              {(toutAfficher || titresEdition(l.code).length > 0) && (
                <h2 style={{ margin: 0, padding: "8px 12px 8px 70px", fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', color: VERT, background: "#eef2ee", borderTop: "1px solid #dfe6df", borderBottom: "1px solid #dfe6df", position: "sticky", top: SOMMET_CORPS, zIndex: 3, textAlign: "center" }}>
                  {toutAfficher && l.nom_fr}
                  {titresEdition(l.code).map(({ trad, ed }) => (
                    <span key={trad} style={{ display: "block", fontSize: '0.71875rem', fontWeight: 400, fontStyle: "italic", color: "#8a8378", marginTop: 2 }}>
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
                // Le rose prime sur le rouge : un cas qui a résisté à la correction est une
                // information plus précise qu'un point simplement à vérifier.
                const resiste = estAdmin && sens.resiste(l.code, r.ch_canon, r.v_canon);
                const fond = resiste ? ROSE_FOND : signaler ? ROUGE_FOND : ligneVide ? "#e8ece8" : r.est_suscription ? "#e3eee6" : (idx % 2 ? VERT_ZEBRE : VERT_ZEBRE_CLAIR);
                const apres = sensiblesOnly ? [] : (surnumApres.get(r.id) ?? []);
                // Pour « mes citations » : le texte de la première traduction affichée qui
                // porte ce verset (la colonne de gauche fait foi), avec son nom d'édition.
                const abr = ABREV_FR[l.code] ?? l.code;
                const refLisible = `${abr} ${r.ch_canon}, ${r.v_canon}`;
                const cleCite = `${abr}|${r.ch_canon}|${r.v_canon}`;
                let citeInfo: { texte: string; label: string } | null = null;
                for (const t of colonnes) { const cc = (cellule.get(`${r.id}|${t.trad_id}`) ?? [])[0]; if (cc?.texte) { citeInfo = { texte: cc.texte, label: t.nom }; break; } }
                return (
                  <Fragment key={r.id}>
                    <div className="poly-row" id={`poly-${l.code}-${r.ch_canon}-${r.v_canon}`}
                      style={{ display: "grid", gridTemplateColumns: tmpl, background: (versetCible && versetCible.ch === r.ch_canon && versetCible.v === r.v_canon) ? "#fff3c4" : fond, borderTop: "1px solid #dfe8e0", fontSize: '0.8125rem', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + ${HAUT_NAV + HAUT_TITRE + HAUT_ENTETE + 8}px)`, transition: "background .4s" }}>
                      <div title={signaler ? desc : undefined} style={{ padding: "5px 4px", textAlign: "center", fontWeight: 700, fontSize: '0.71875rem', lineHeight: 1.15, color: signaler ? ROUGE : ligneVide ? "#aeb4ae" : VERT, borderRight: signaler ? `2px solid ${ROUGE}` : "1px solid #dfe8e0" }}>
                        <div style={{ whiteSpace: "nowrap" }}>{r.ch_canon}, {r.v_canon}{signaler ? " ⚠" : ""}</div>
                        {/* Citer / signaler : empilés verticalement sous le numéro, dans un petit
                            cartouche arrondi qui n'apparaît qu'au survol de la ligne. */}
                        {!ligneVide && (
                          <div className="poly-actstack" onClick={e => e.stopPropagation()}>
                            {citeInfo && <BoutonCiterVerset userId={userId} saved={prelevs.get(cleCite) ?? null} cle={cleCite} refLivre={l.nom_fr} refAbr={abr} chapitre={r.ch_canon} verset={r.v_canon} texte={citeInfo.texte} traductionLabel={citeInfo.label} onSaved={marquerCite} onRemoved={retirerCite} />}
                            <BoutonSignalerVerset refLisible={refLisible} texte={citeInfo?.texte} />
                          </div>
                        )}
                      </div>
                      {slotCols.map((sc, i) => {
                        if (!sc.trad) return <div key={i} style={{ borderLeft: "1px solid #dfe8e0" }} />;
                        const t = sc.trad;
                        const cs = cellule.get(`${r.id}|${t.trad_id}`) ?? [];
                        return (
                          <div key={i} className="poly-texte-cell" lang={t.lang}
                            style={{ borderLeft: "1px solid #dfe8e0", color: signaler ? "#7a1d16" : "#2a302b" }}>
                            {/* La lettrine : référence(s) d'origine et crayon, en bloc flottant que
                                le texte habille. Plusieurs versets de l'édition peuvent partager un
                                créneau du canon — leurs numéros s'écrivent alors l'un sous l'autre,
                                en tête du texte réuni. */}
                            {cs.length > 0 && (
                              <span className="poly-lettrine">
                                {cs.map((c, k) => (
                                  <span key={k} className="poly-lettrine-item">
                                    <span className="poly-lettrine-ref" title={`${c.ch_orig}, ${c.v_orig}${c.v_orig_suffixe ?? ""}`}>
                                      {/* Chapitre ET verset, toujours : la référence d'origine ne se
                                          lit qu'entière. Le chapitre est simplement composé plus clair
                                          pour que le verset, lui, se détache. */}
                                      <span className="poly-lettrine-ch">{c.ch_orig},</span> {c.v_orig}{c.v_orig_suffixe ?? ""}
                                      {/* Une intervention d'alignement laisse toujours sa trace dans
                                          `notes` : le lecteur voit QU'il y a eu intervention, et le
                                          survol lui dit LAQUELLE. Rien n'est corrigé en silence. */}
                                      {c.notes ? <span title={c.notes} style={{ marginLeft: 2, color: "#7a6fae", cursor: "help" }}>✎</span> : null}
                                    </span>
                                    {estAdmin && (
                                      <button title="Modifier ce verset" aria-label="Modifier ce verset" className="poly-edit"
                                        onClick={() => { setCibleEdition({ id: c.id, texte: c.texte ?? "", reference: `${l.nom_fr} ${c.ch_orig}, ${c.v_orig}` }); setEnregistre("idle"); }}
                                        style={{ border: "none", cursor: "pointer", color: "#7a8f80", fontSize: '0.65625rem', lineHeight: 1, background: fond, transition: "color .15s" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = VERT; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#7a8f80"; }}>
                                        ✎
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </span>
                            )}
                            {cs.length === 0 ? (
                              deuterocanonique(r.id)
                                ? <span title={`Ce passage nous est parvenu en grec, non en hébreu. Les Bibles catholique et orthodoxe le reçoivent ; la Bible protestante et la Bible hébraïque ne le comptent pas parmi les livres canoniques. La case est donc vide pour cette traduction, et non par oubli.`}
                                        style={{ color: "#9a8fb5", fontStyle: "italic", fontSize: '0.75rem', cursor: "help" }}>
                                    Absent dans cette traduction
                                  </span>
                                : <span style={{ color: "#d3ccbf" }}>—</span>
                            ) : cs.map((c, k) => (
                              <span key={k}>{k > 0 ? " " : ""}{texteCesure(c.texte, t.lang)}</span>
                            ))}
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

          </>
        )}
      </div>
        </div>
      </div>

      {cibleEdition && (
        <ModaleEditionVerset
          reference={cibleEdition.reference}
          valeurInitiale={cibleEdition.texte}
          statut={enregistre}
          onEnregistrer={(valeur) => enregistrerVerset(cibleEdition.id, valeur)}
          onFermer={() => { setCibleEdition(null); setEnregistre("idle"); }}
        />
      )}
    </div>
  );
}
