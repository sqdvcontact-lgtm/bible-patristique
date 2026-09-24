"use client";

// « MES CITATIONS » — les passages que le lecteur a retenus, bibliques et patristiques.
//
// ⚠️ La page vivait à /prelevements, seule, avec sa tête et son sol à elle. Elle est
// entrée dans l'espace du lecteur le 7 septembre 2026, à la demande de l'auteur : ce
// qu'on retient est de la même nature que ce qu'on écrit (« Mes annotations ») et se visite
// à la même heure. Le titre, le compte et le sol lui viennent donc du cadre ; ⛔ elle ne
// pose plus de <main> ni de fond, que le cadre porte déjà.

import IconeCopier from '@/app/components/IconeCopier'
import { useEffect, useRef, useState } from "react";
import { cssServi } from '@/app/lib/cssServi'
import { joindreEditeurs } from '@/app/lib/editeursNormalisation'
import { segmentsReferenceEdition, type EditionServie } from '@/app/lib/referenceEditionServie'
import { noticeEnSyntaxe, type GroupeExtrait, type SectionExtraite } from '@/app/lib/extractionCitations'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { useEspace } from "@/app/compte/EspaceCompte";
import { BandeauLecteur, SommaireEspace } from "@/app/compte/piecesEspace";
import { ancresCitations } from "@/app/lib/espaceLecteurNavigation";
import { rendreTexteEnrichi } from "@/app/oeuvre/[id]/texteEnrichi";
import { citationPatristique, citationBiblique, copierCitation, fragmentsReferenceCanoniqueOeuvre, preparerTexteCitation, type CitationRendue, type InfoCitation } from "@/app/lib/citation";
import { COLONNES_IDENTITE_TEXTE, identiteCitee, parametreTexte, type LigneIdentiteTexte } from "@/app/lib/identiteCitee";
import { indexEditeursNavigateur } from "@/app/lib/editeurs";
import { colorMix } from "@/app/lib/couleurs";
import { useSansSurvol } from "@/app/lib/useEstMobile";
import {
  BoutonCitationPreferee, ModaleRemplacerCitation,
} from "@/app/components/CitationPreferee";
import {
  COLONNE_FAVORITE, favoritePourEcriture, lireFavorite,
  type CitationPreferee, type TypeCitation,
} from "@/app/lib/citationsFavorites";
import { PLAFOND_SEGMENTS_ELIDES, numerosDeLEcart, regrouperCitations, texteDuGroupe, type Ecart } from "@/app/lib/regrouperCitations";
import { lieuDuPrelevement, type NiveauxDuLieu } from "@/app/lib/lieuPrelevement";
import { niveauxDuSegment, titreEntrePassages, type NiveauxDuPassage } from "@/app/lib/titresDeDivision";
import { lotsPourClauseIn } from "@/app/lib/paginationSupabase";
import { replier } from "@/app/lib/bibleBibliographieOuvrages";
import { HAUTEUR_NAVBAR } from "@/app/lib/mesures";
import OngletsPage from "@/app/components/OngletsPage";
import { SERIF } from '@/app/lib/polices'
import { rendreEnrichi } from '@/app/lib/enrichissements'

// ⛔ « Les appels de note ne doivent pas paraître dans les citations » : la règle
// était ÉCRITE ICI, et elle ne valait que pour l'affichage — les deux boutons de
// copie, à trois lignes de là, emportaient les marqueurs dans le presse-papiers.
// Elle vit désormais dans `sansAppelsDeNote` (appelsDeNote.ts), que
// `preparerTexteCitation` applique : l'affichage et la copie disent enfin la même
// chose. ⚠️ Celle d'ici ne retirait que le marqueur, laissant 485 espaces doubles.

type TypePrelevement = "biblique" | "patristique";

type Prelevement = {
  id: string; type: TypePrelevement;
  ref_livre?: string; ref_livre_abr?: string;
  ref_chapitre?: number; ref_verset?: number;
  texte: string; traduction?: string;
  /** Le CODE de la traduction prélevée (`prelevements.trad_id`, depuis le 2026-09-23). */
  trad_id?: string | null;
  auteur?: string; titre_oeuvre?: string;
  ref_niv1?: string; ref_niv2?: string;
  id_oeuvre?: string; segment_numero?: number;
  /** Le texte du segment prélevé, retenu à l'écriture depuis août 2026. Une ligne plus
   *  ancienne ne le porte pas. */
  id_texte?: string | null;
  created_at: string;
};

type Traduction = { code: string; label: string; langue?: string | null };

type OeuvreInfo = {
  id_oeuvre: string; id_auteur?: string; sous_titre?: string
  trad_auteur?: string; editeur?: string
  collection?: string; ville?: string; date_publication?: string
  /** Jusqu’où la lecture de l’œuvre compose ses titres : c’est là qu’une citation se coupe
   *  (charte § 38.8.1). */
  niveaux_corps?: number | null
};

type GroupeBiblique = {
  ids: string[]; ref_livre: string; ref_livre_abr: string;
  ref_chapitre: number; verset_debut: number; verset_fin: number;
  textes: string[]; traduction?: string;
  /** Le code de la traduction prélevée : tous les versets d'un groupe la partagent. */
  tradId: string | null;
};

// ⚠️ Le type d'une citation favorite vit dans `app/lib/citationsFavorites.ts`, avec ce
// qu'on en écrit ; la marque et la fenêtre de remplacement, dans
// `app/components/CitationPreferee.tsx`. On en porte UNE PAR CORPUS depuis le
// 14 septembre 2026 : choisir un verset ne touche plus au passage des Pères.

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
    // ⛔ Deux versets ne se réunissent que s'ils viennent de la MÊME traduction : un passage
    // se lit dans une seule langue, telle qu'on l'a prélevée (2026-09-23).
    const memeTrad = last && (last.tradId ?? last.traduction ?? "") === (p.trad_id ?? p.traduction ?? "");
    if (last && memeTrad && last.ref_livre_abr === abr && last.ref_chapitre === ch && last.verset_fin + 1 === v) {
      last.ids.push(p.id); last.verset_fin = v; last.textes.push(p.texte);
    } else {
      groupes.push({ ids: [p.id], ref_livre: p.ref_livre ?? "", ref_livre_abr: abr, ref_chapitre: ch, verset_debut: v, verset_fin: v, textes: [p.texte], traduction: p.traduction, tradId: p.trad_id ?? null });
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
// ⛔ L'identité est celle de l'ÉDITION du passage, silence compris (`identiteCitee`) : lue à
// l'œuvre, un passage du latin des Confessions se citait sous Arnauld d'Andilly, 1649.
function infoPatristique(auteur: string, titre: string, info?: OeuvreInfo, edition?: LigneIdentiteTexte): InfoCitation {
  return {
    auteur, titre, sousTitre: info?.sous_titre,
    ...identiteCitee(info ?? {}, edition, indexEditeursNavigateur()),
  };
}

function citationPatristiqueDepuisInfo(texte: string, auteur: string, titre: string, info?: OeuvreInfo, edition?: LigneIdentiteTexte): CitationRendue {
  return citationPatristique(texte, infoPatristique(auteur, titre, info, edition));
}

// ── L'extraction en document Word ─────────────────────────────────────────────
//
// ⚠️ La page envoie ce qu'elle MONTRE (le verset dans la traduction du menu, les passages
// réunis, leur lieu, la notice de leur édition) : la route ne fait que le mettre en page
// (`app/api/compte/citations/extraction`, `app/lib/docx/documentCitations.ts`).

type EtatCase = "tout" | "partiel" | "rien";

function etatDes(listes: string[][], selection: ReadonlySet<string>): EtatCase {
  const choisies = listes.filter(ids => ids.every(id => selection.has(id))).length;
  return choisies === 0 ? "rien" : choisies === listes.length ? "tout" : "partiel";
}

// ⚠️ L'état « partiel » n'existe qu'en propriété DOM (`indeterminate`), pas en attribut :
// il se pose après le rendu.
function CaseACocher({ etat, onChange, libelle }: { etat: EtatCase; onChange: () => void; libelle: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = etat === "partiel"; }, [etat]);
  return (
    <input ref={ref} type="checkbox" className="prel-case" checked={etat === "tout"}
      onChange={onChange} onClick={e => e.stopPropagation()} aria-label={libelle} />
  );
}

/** Le nom du fichier, lu dans la réponse : la route le compose, la page ne le devine pas. */
function nomDuFichierRecu(entete: string | null): string {
  const utf8 = entete?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) { try { return decodeURIComponent(utf8); } catch { /* repli ci-dessous */ } }
  return entete?.match(/filename="([^"]+)"/i)?.[1] ?? "Mes prélèvements.docx";
}

// ── Micro-composants ──────────────────────────────────────────────────────────

function BoutonCopie({ citation }: { citation: CitationRendue | string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); copierCitation(citation).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); }); }}
      className="prel-action" title="Copier" aria-label="Copier la citation"
      style={{ color: ok ? "var(--cs-vert)" : undefined }}>
      {ok ? "✓" : <IconeCopier size={12} />}
    </button>
  );
}

function BoutonSuppr({ onSuppr }: { onSuppr: () => void }) {
  const [conf, setConf] = useState(false);
  if (conf) return (
    <span className="prel-confirm" onClick={e => e.stopPropagation()}>
      Supprimer&#8239;?&ensp;
      <button onClick={onSuppr} style={{ fontWeight: 600, color: "var(--cs-danger-fonce)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}>Oui</button>
      &ensp;
      <button onClick={() => setConf(false)} style={{ color: "var(--cs-texte-doux)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", padding: 0 }}>Non</button>
    </span>
  );
  // ⚠️ La croix est un TRAIT, comme ses trois voisines : le glyphe « ✕ » dépendait de la
  // police et pesait plus lourd que les icônes qu'il côtoie.
  return (
    <button onClick={e => { e.stopPropagation(); setConf(true); }} className="prel-action" title="Supprimer" aria-label="Supprimer la citation">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true" style={{ display: 'block' }}>
        <path d="M2.5 2.5l6 6M8.5 2.5l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

function BoutonLien({ href }: { href: string }) {
  return (
    <Link href={href} className="prel-action" title="Accéder au passage" aria-label="Accéder au passage" style={{ textDecoration: "none" }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <path d="M2 9L9 2" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/>
        <path d="M4.5 2H9V6.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}

// ⛔ AU TÉLÉPHONE, LES ACTIONS D'UNE CITATION SE REPLIENT DERRIÈRE CE BOUTON (2026-09-22).
// Quatre icônes répétées sous chaque passage faisaient le gros du poids de la page ; le
// bouton les montre d'un toucher, et les range de même. ⚠️ Il n'existe qu'au téléphone :
// la feuille le masque au-delà de 640 px, où les actions viennent au survol.
function BoutonPlus({ ouvert, onBasculer }: { ouvert: boolean; onBasculer: () => void }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onBasculer(); }}
      className="prel-action prel-plus" aria-expanded={ouvert}
      aria-label={ouvert ? "Masquer les actions" : "Afficher les actions"}
      title={ouvert ? "Masquer les actions" : "Actions"}>
      <svg width="13" height="3" viewBox="0 0 13 3" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
        <circle cx="1.5" cy="1.5" r="1.3" /><circle cx="6.5" cy="1.5" r="1.3" /><circle cx="11.5" cy="1.5" r="1.3" />
      </svg>
    </button>
  );
}

// La page d'un document : le geste d'extraction se reconnaît avant de se lire.
function IconeDocument() {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M2 1h4.5L9 3.5V11H2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M6.5 1v2.5H9M3.7 6h3.6M3.7 8.2h3.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function ListeVide({ mention, href, lien }: { mention: string; href: string; lien: string }) {
  return (
    <div className="prel-vide">
      <p>{mention}</p>
      <Link href={href} className="cs-bouton-lien">{lien}</Link>
    </div>
  );
}

// ── Groupe ────────────────────────────────────────────────────────────────────
//
// ⛔ LE LIVRE ET L'AUTEUR PRENNENT LE TITRE DE SECTION DE L'ESPACE — sérif italique vert,
// le rang que « Mes annotations » donne déjà à un livre.
// ⚠️ Plus de repli ni de compte (2026-09-21, « fais au plus simple ») : le sommaire de
// gauche mène à chaque groupe, et un titre qui se replie demandait un chevron, un compte
// et un état pour une liste qu'on parcourt d'un trait.
function GroupeCitations({ ancre, label, caseGroupe, children }: {
  ancre: string; label: React.ReactNode; caseGroupe?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    // ⚠️ Le décalage d'ancre se compose sur HAUTEUR_NAVBAR, jamais en pixels.
    <section id={ancre} className="prel-groupe" style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 1.5rem)` }}>
      <div className="prel-groupe-tete">
        {caseGroupe}
        <h2>{label}</h2>
      </div>
      {children}
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
  // `null` : hors du mode sélection. Sinon, les identifiants des prélèvements retenus pour
  // l'extraction, sur les DEUX corpus à la fois.
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [extraction, setExtraction] = useState<{ enCours: boolean; erreur: string | null }>({ enCours: false, erreur: null });
  // Au téléphone, la citation dont les actions sont dépliées (sa clé), ou aucune.
  const [actionsOuvertes, setActionsOuvertes] = useState<string | null>(null);
  const basculerActions = (cle: string) => setActionsOuvertes(o => (o === cle ? null : cle));
  const [oeuvresInfo, setOeuvresInfo] = useState<Record<string, OeuvreInfo>>({});
  // Les éditions des œuvres citées, pour citer un passage sous la sienne.
  const [editions, setEditions] = useState<Record<string, LigneIdentiteTexte>>({});
  const [traductions, setTraductions] = useState<Traduction[]>([]);
  // ⛔ UNE FAVORITE PAR CORPUS : l'Écriture et les Pères ont chacun leur place, et en
  // choisir une ne touche jamais à l'autre (charte § 34.2).
  const [favorites, setFavorites] = useState<Record<TypeCitation, CitationPreferee | null>>({ biblique: null, patristique: null });
  // Citation qu'on vient de désigner alors qu'une autre du même corpus était déjà portée :
  // elle attend la réponse à « Voulez-vous remplacer votre citation favorite ? ».
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

  // Le code d'une traduction, quand la ligne ne porte que son nom (même lecture que
  // `nomTraduction`) : c'est par lui qu'on retrouve la fiche de son édition.
  const codeTraduction = (val?: string | null): string | null => {
    if (!val) return null;
    if (/^TR\d+$/.test(val)) return val;
    return traductions.find(t => t.label === val || t.label.endsWith(` ${val}`) || t.label.endsWith(` de ${val}`))?.code ?? null;
  };

  // Le titre d'onglet vient du layout (« Mes prélèvements ») ; on ne le réécrit plus
  // ici : un second titre contredirait la métadonnée et le titre de page.

  // L'écriture, sans question : la colonne du corpus, et elle seule. La page change
  // aussitôt, et reprend l'état d'avant si la base refuse.
  // ⛔ Plus de miroir dans le stockage local : il décrivait UNE favorite, et une copie
  // qui peut diverger de la base ne ferait que la contredire. L'ancienne clé s'efface.
  const inscrireFavorite = async (type: TypeCitation, pref: CitationPreferee | null) => {
    const avant = favorites[type];
    setFavorites(f => ({ ...f, [type]: pref }));
    const { error } = await supabase.from("profils")
      .update({ [COLONNE_FAVORITE[type]]: pref ? favoritePourEcriture(pref) : null })
      .eq("id", user.id);
    if (error) {
      console.error("Mes prélèvements : la citation favorite n’a pas été enregistrée.", error);
      setFavorites(f => ({ ...f, [type]: avant }));
    }
  };

  // Le geste, avec ses trois cas, dans le corpus du passage. Reprendre la citation déjà
  // portée la retire ; en désigner une autre quand la place est occupée demande d'abord
  // confirmation, parce que le remplacement défait un choix qui paraît sur la page
  // publique. ⚠️ Une favorite dont le prélèvement a disparu n'occupe plus la place :
  // cette page ne la montre nulle part, et la page publique non plus.
  // ⚠️ Un passage montré peut RÉUNIR la favorite à ses voisins (versets qui se suivent,
  // passages d'une même œuvre) : c'est l'appartenance qui dit qu'on reprend la même, non
  // l'égalité du premier prélèvement, qui change dès qu'un voisin s'ajoute devant.
  const choisirPreferee = (pref: CitationPreferee) => {
    const actuelle = favorites[pref.type];
    const presente = actuelle && prelevements.some(p => p.id === actuelle.id) ? actuelle : null;
    if (presente && (presente.id === pref.id || (pref.ids ?? []).includes(presente.id))) { inscrireFavorite(pref.type, null); return; }
    if (presente) { setRemplacementPropose(pref); return; }
    inscrireFavorite(pref.type, pref);
  };

  useEffect(() => {
    (async () => {
      const uid = user.id;
      // ⚠️ `profils` n'est plus interrogé QUE pour les citations favorites : la traduction
      // par défaut vient du cadre, qui a déjà lu le profil une fois pour toutes.
      const [{ data: rows }, { data: trads }, { data: pref }] = await Promise.all([
        supabase
          .from("prelevements").select("id, type, ref_livre, ref_livre_abr, ref_chapitre, ref_verset, texte, traduction, trad_id, auteur, titre_oeuvre, ref_niv1, ref_niv2, id_oeuvre, segment_numero, id_texte, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx.
        supabase.from("traductions").select("trad_id, nom, langue").eq("est_biblique", true).order("ordre", { ascending: true }),
        supabase.from("profils").select("citation_favorite_biblique, citation_favorite_patristique").eq("id", uid).maybeSingle(),
      ]);
      // La base fait foi : c'est elle que la page publique lit.
      setFavorites({
        biblique: lireFavorite(pref?.citation_favorite_biblique, "biblique"),
        patristique: lireFavorite(pref?.citation_favorite_patristique, "patristique"),
      });
      try { localStorage.removeItem("cs_citation_preferee"); } catch {}
      const prelevsData = rows ?? [];
      setPrelevements(prelevsData);
      // ⛔ PLUS DE MENU DE TRADUCTION (demande de l'auteur, 2026-09-23 : « le prélèvement doit
      // apparaître sous sa forme prélevée telle qu'elle était au clic »). Chaque verset se
      // montre dans le texte ENREGISTRÉ, et la liste des bibles ne sert plus qu'à NOMMER la
      // traduction et la langue de chacun.
      setTraductions((trads ?? []).map(t => ({ code: t.trad_id, label: t.nom, langue: t.langue })));
      setChargement(false);

      const ids = [...new Set(prelevsData.filter(p => p.id_oeuvre).map(p => p.id_oeuvre as string))];
      if (ids.length > 0) {
        const [{ data: od }, { data: textes, error: erreurTextes }] = await Promise.all([
          supabase
            .from("oeuvres")
            .select("id_oeuvre, id_auteur, sous_titre, trad_auteur, editeur, collection, ville, date_publication, niveaux_corps")
            .in("id_oeuvre", ids),
          supabase.from("oeuvre_textes").select(COLONNES_IDENTITE_TEXTE).in("id_oeuvre", ids),
        ]);
        const map: Record<string, OeuvreInfo> = {};
        (od ?? []).forEach(o => { map[o.id_oeuvre] = o; });
        setOeuvresInfo(map);
        // ⚠️ Une panne ne ferme rien : la citation retombe sur l'œuvre, comme avant.
        if (erreurTextes) console.error("[citations] éditions illisibles :", erreurTextes);
        setEditions(Object.fromEntries(((textes ?? []) as unknown as LigneIdentiteTexte[]).map(ligne => [ligne.id_texte, ligne])));
      }
    })();
  }, [user.id]);



  const supprimerIds = async (ids: string[]) => {
    await supabase.from("prelevements").delete().in("id", ids);
    setPrelevements(prev => prev.filter(p => !ids.includes(p.id)));
    for (const type of ["biblique", "patristique"] as const) {
      const actuelle = favorites[type];
      if (actuelle && ids.includes(actuelle.id)) inscrireFavorite(type, null);
    }
    if (remplacementPropose && ids.includes(remplacementPropose.id)) setRemplacementPropose(null);
  };

  // ── RÉUNIR LES PASSAGES D'UNE MÊME ŒUVRE ────────────────────────────────────
  // Même règle que le volet patristique de la page Bible (voir `regrouperCitations`) :
  // les passages qui se suivent se lisent d'un trait, et ceux que sépare une courte
  // élision aussi, l'écart marqué d'un « […] ».
  // ⛔ C'est le TEXTE qui décide d'un regroupement, une œuvre pouvant en porter plusieurs
  // aux numéros qui se recouvrent. Un prélèvement le RETIENT à l'écriture depuis août
  // 2026 (`prelevements.id_texte`), et c'est lui qui parle. Jusqu'au 14 septembre 2026
  // la page l'ignorait et le cherchait en base, où une œuvre à deux textes ne rendait
  // rien : « Du symbole » (un français et un latin) montrait en trois passages ce que
  // la règle réunit en un. ⚠️ Une ligne plus ancienne ne le porte pas : on le retrouve
  // alors en base, et quand l'œuvre en a plusieurs parmi les segments visés, on ne réunit
  // rien pour elle. Mieux vaut deux passages séparés qu'un latin collé à un français.
  // ⚠️ La même lecture rend le LIEU de chaque segment, que la manchette montre
  // (`lieuDuPrelevement`) : le segment fait foi, la copie du prélèvement sert à défaut.
  const [mesuresPatristiques, setMesuresPatristiques] = useState<{
    pret: boolean; textes: Map<string, string>; longueurs: Map<string, number>; lieux: Map<string, NiveauxDuLieu>;
    niveaux: Map<string, NiveauxDuPassage>;
  }>({ pret: false, textes: new Map(), longueurs: new Map(), lieux: new Map(), niveaux: new Map() });
  useEffect(() => {
    const patr = prelevements.filter(x => x.type === "patristique" && x.id_oeuvre && x.segment_numero);
    let annule = false;
    (async () => {
      if (!patr.length) {
        if (!annule) setMesuresPatristiques({ pret: true, textes: new Map(), longueurs: new Map(), lieux: new Map(), niveaux: new Map() });
        return;
      }
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
      const lignes: {
        id_oeuvre: string; id_texte: string; segment_numero: number; segment_texte: string | null;
        ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null;
      }[] = [];
      for (const lot of lotsPourClauseIn([...numeros].map(String))) {
        const { data, error } = await supabase.from("segments")
          .select("id_oeuvre, id_texte, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4")
          .in("id_oeuvre", oeuvresVisees).in("segment_numero", lot.map(Number));
        // ⚠️ Une erreur se LIT : sans elle, l'absence de regroupement passerait pour un
        // parti pris.
        if (error) { console.error("Prélèvements : les élisions n’ont pas pu être mesurées.", error); return; }
        lignes.push(...((data ?? []) as typeof lignes));
      }
      const textesParOeuvre = new Map<string, Set<string>>();
      const mesures = new Map<string, number>();
      const lieux = new Map<string, NiveauxDuLieu>();
      const niveaux = new Map<string, NiveauxDuPassage>();
      for (const r of lignes) {
        const vus = textesParOeuvre.get(r.id_oeuvre) ?? new Set<string>();
        vus.add(r.id_texte);
        textesParOeuvre.set(r.id_oeuvre, vus);
        mesures.set(`${r.id_texte}|${r.segment_numero}`, (r.segment_texte ?? "").length);
        lieux.set(`${r.id_texte}|${r.segment_numero}`, { n1: r.ref_niv1, n2: r.ref_niv2 });
        niveaux.set(`${r.id_texte}|${r.segment_numero}`, niveauxDuSegment(r));
      }
      const uniques = new Map<string, string>();
      for (const [oeuvre, vus] of textesParOeuvre) if (vus.size === 1) uniques.set(oeuvre, [...vus][0]);
      if (!annule) setMesuresPatristiques({ pret: true, textes: uniques, longueurs: mesures, lieux, niveaux });
    })();
    return () => { annule = true; };
  }, [prelevements]);

  const texteDuPrelevement = (x: Prelevement): string | null =>
    x.id_texte || (x.id_oeuvre ? mesuresPatristiques.textes.get(x.id_oeuvre) ?? null : null);
  const cleCitation = (x: Prelevement) => ({
    idOeuvre: x.id_oeuvre ?? "",
    idTexte: texteDuPrelevement(x),
    numero: x.segment_numero ?? 0,
    texte: x.texte,
  });
  const signesElides = (ecart: Ecart) => {
    let total = 0;
    for (const n of numerosDeLEcart(ecart)) {
      const l = mesuresPatristiques.longueurs.get(`${ecart.idTexte}|${n}`);
      if (l === undefined) return null;
      total += l;
    }
    return total;
  };
  // ⛔ Ni d’un trait ni par une élision par-dessus un titre que la lecture de l’œuvre montre
  // (charte § 38.8.1) : on lit les niveaux des deux bouts et de tout l’écart.
  const titreEntre = (ecart: Ecart, precedent: Prelevement) => {
    const chaine: (NiveauxDuPassage | undefined)[] = [];
    for (let n = ecart.de; n <= ecart.a; n++) chaine.push(mesuresPatristiques.niveaux.get(`${ecart.idTexte}|${n}`));
    const info = precedent.id_oeuvre ? oeuvresInfo[precedent.id_oeuvre] : undefined;
    return titreEntrePassages(chaine, info ? info.niveaux_corps ?? null : undefined);
  };
  const lieuPatristique = (x: Prelevement): string => {
    const idTexte = texteDuPrelevement(x);
    const duSegment = idTexte && x.segment_numero ? mesuresPatristiques.lieux.get(`${idTexte}|${x.segment_numero}`) : undefined;
    return lieuDuPrelevement(duSegment, { n1: x.ref_niv1, n2: x.ref_niv2 });
  };

  // ⛔ Le texte montré est celui du PRÉLÈVEMENT, tel qu'au clic : la page ne le relit plus.
  const bibliques = trierBibliques(prelevements.filter(p => p.type === "biblique"));
  const patristiques = trierPatristiques(prelevements.filter(p => p.type === "patristique"));
  const groupesBibliquesBruts = grouper(bibliques, p => p.ref_livre_abr ?? p.ref_livre ?? "");
  const groupesPatristiques = grouper(patristiques, p => `${p.auteur ?? ""}||${p.titre_oeuvre ?? ""}`);


  // ── Ce que la page montre, composé UNE fois ────────────────────────────────
  // La liste et l'extraction lisent les mêmes entrées : le document dit exactement ce que
  // l'écran montre.
  const vueBiblique = groupesBibliquesBruts.map(({ label, items }) => ({
    label,
    nom: NOM_COMPLET[label] ?? items[0]?.ref_livre ?? label,
    entrees: agglomererBibliques(items).map(g => {
      // La traduction prélevée : par son code, et à défaut par le nom qu'elle portait.
      const codeLu = g.tradId ?? codeTraduction(g.traduction);
      const tradLue = nomTraduction(codeLu ?? g.traduction);
      const langue = traductions.find(t => t.code === codeLu)?.langue ?? null;
      return {
        cle: g.ids.join("_"),
        ids: g.ids,
        groupe: g,
        texte: texteGroupe(g),
        ref: refBiblique(g),
        // La traduction du texte MONTRÉ, qui est toujours celle du prélèvement : c'est elle
        // que la favorite garde et que le document cite.
        codeLu,
        tradLue,
        // ⛔ LA PROVENANCE SE DIT TOUJOURS (2026-09-23) : « on doit pouvoir identifier la
        // langue et la traduction du prélèvement ». Le nom de la bible, puis sa langue.
        provenance: tradLue ? [tradLue, langue ? langue.charAt(0).toLowerCase() + langue.slice(1) : null].filter(Boolean).join(" · ") : null,
      };
    }),
  }));

  const vuePatristique = groupesPatristiques.map(({ label, items }) => {
    const [auteur, titre] = label.split("||");
    // ⚠️ Les passages d'une même œuvre qui se suivent, ou que sépare une courte élision, se
    // lisent d'un trait, comme dans le volet de la page Bible (demande de l'auteur,
    // 2026-09-04). Les actions portent alors sur TOUT le groupe.
    const entrees = regrouperCitations(items, cleCitation, signesElides, titreEntre).map(groupe => {
      const p = groupe[0];
      const ids = groupe.map(x => x.id);
      return {
        cle: ids.join("_"),
        ids,
        p,
        texte: texteDuGroupe(groupe, cleCitation),
        lieu: lieuPatristique(p),
        info: p.id_oeuvre ? oeuvresInfo[p.id_oeuvre] : undefined,
        edition: editions[texteDuPrelevement(p) ?? ""],
      };
    });
    return {
      label, auteur, titre, entrees,
      idAuteur: items[0]?.id_oeuvre ? oeuvresInfo[items[0].id_oeuvre]?.id_auteur : undefined,
      // ⛔ La colonne de la manchette ne tombe que lorsque la mesure est faite : tant que
      // les segments ne sont pas relus, un lieu peut encore venir.
      sansManchette: mesuresPatristiques.pret && entrees.every(e => !e.lieu),
    };
  });

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

  const listeActive = onglet === "biblique" ? bibliques : patristiques;

  // ── La sélection pour l'extraction ─────────────────────────────────────────
  const choisi = (ids: string[]) => selection !== null && ids.every(id => selection.has(id));
  // Coche ou décoche un ensemble d'un seul geste : tout, s'il n'était pas tout coché.
  const basculer = (listes: string[][]) => setSelection(prev => {
    if (!prev) return prev;
    const ids = listes.flat();
    const cocher = !ids.every(id => prev.has(id));
    const next = new Set(prev);
    for (const id of ids) { if (cocher) next.add(id); else next.delete(id); }
    return next;
  });
  const entreesDe = (vue: { entrees: { ids: string[] }[] }[]) => vue.flatMap(g => g.entrees.map(e => e.ids));
  const entreesOnglet = entreesDe(onglet === "biblique" ? vueBiblique : vuePatristique);
  const nbVersetsChoisis = entreesDe(vueBiblique).filter(choisi).length;
  const nbPassagesChoisis = entreesDe(vuePatristique).filter(choisi).length;
  const nbChoisis = nbVersetsChoisis + nbPassagesChoisis;
  // ⚠️ On ne compose pas un document avant que la page ait fini de composer ce qu'elle
  // montre : la traduction des versets et la réunion des passages arrivent après la liste.
  const pretPourExtraire = mesuresPatristiques.pret;

  const quitterSelection = () => { setSelection(null); setExtraction({ enCours: false, erreur: null }); };

  const extraire = async () => {
    if (!selection || nbChoisis === 0 || extraction.enCours) return;
    const sections: SectionExtraite[] = [];

    // ⛔ LA RÉFÉRENCE PRÉCISE DE LA BIBLE SE POSE SOUS CHAQUE TITRE DE LIVRE, comme celle
    // d'une œuvre sous son titre. Elle vient de la fiche de son édition (`v_traductions_page`),
    // composée par la même règle que la fiche « À propos de cette traduction »
    // (`segmentsReferenceEdition`). Des versets de deux bibles font deux titres.
    const bibliquesRetenus = vueBiblique.map(g => ({ g, entrees: g.entrees.filter(e => choisi(e.ids)) }))
      .filter(x => x.entrees.length > 0);
    const codesBibles = [...new Set(bibliquesRetenus.flatMap(x => x.entrees.map(e => e.codeLu)).filter((c): c is string => !!c))];
    const referencesBibles = new Map<string, string>();
    if (codesBibles.length > 0) {
      const { data, error } = await supabase.from("v_traductions_page")
        .select("trad_id, titre_edition, sous_titre_edition, mention_edition, lieu_edition, editeur, annee_edition, nombre_tomes, depot_manuscrit, cote_manuscrit")
        .in("trad_id", codesBibles);
      // ⚠️ Une fiche illisible ne ferme pas l'extraction : le livre garde le nom de sa bible.
      if (error) console.error("Mes prélèvements : fiches des bibles illisibles.", error);
      for (const i of (data ?? []) as Record<string, string | number | null>[]) {
        const edition: EditionServie = {
          titreEdition: i.titre_edition as string | null, sousTitreEdition: i.sous_titre_edition as string | null,
          mentionEdition: i.mention_edition as string | null, lieuEdition: i.lieu_edition as string | null,
          editeur: joindreEditeurs(i.editeur as string | null, indexEditeursNavigateur()),
          anneeEdition: i.annee_edition as string | null, nombreTomes: i.nombre_tomes as number | null,
          depotManuscrit: i.depot_manuscrit as string | null, coteManuscrit: i.cote_manuscrit as string | null,
        };
        const reference = noticeEnSyntaxe(segmentsReferenceEdition(edition));
        if (reference) referencesBibles.set(String(i.trad_id), reference);
      }
    }
    const noticeBible = (code: string | null): string => {
      const morceaux = [nomTraduction(code), code ? referencesBibles.get(code)?.replace(/\.\s*$/, "") : null]
        .filter((m): m is string => !!m);
      return morceaux.length ? `${morceaux.join(" : ")}, disponible sur le site Corpus Scriptura.` : "";
    };
    const groupesBibliques: GroupeExtrait[] = [];
    for (const { g, entrees } of bibliquesRetenus) {
      const parBible = new Map<string, typeof entrees>();
      for (const e of entrees) parBible.set(e.codeLu ?? "", [...(parBible.get(e.codeLu ?? "") ?? []), e]);
      for (const [code, lot] of parBible) {
        const notice = noticeBible(code || null);
        groupesBibliques.push({
          titre: g.nom,
          ...(notice ? { notice } : {}),
          citations: lot.map(e => ({ reference: e.ref, texte: preparerTexteCitation(e.texte) })),
        });
      }
    }
    if (groupesBibliques.length > 0) sections.push({ corpus: "biblique", groupes: groupesBibliques });

    const groupesPatristiquesChoisis: GroupeExtrait[] = [];
    for (const g of vuePatristique) {
      const retenues = g.entrees.filter(e => choisi(e.ids));
      if (retenues.length === 0) continue;
      // ⛔ LA RÉFÉRENCE PRÉCISE DE L'ŒUVRE SE POSE SOUS SON TITRE, toujours. Un passage se
      // cite sous SON édition (charte § 5.5.1) : des passages de deux éditions d'une même
      // œuvre font donc deux titres, chacun sous sa notice.
      const parEdition = new Map<string, typeof retenues>();
      for (const e of retenues) {
        const notice = noticeEnSyntaxe(fragmentsReferenceCanoniqueOeuvre(infoPatristique(g.auteur, g.titre, e.info, e.edition)));
        parEdition.set(notice, [...(parEdition.get(notice) ?? []), e]);
      }
      for (const [notice, entrees] of parEdition) {
        groupesPatristiquesChoisis.push({
          titre: g.titre ? `${g.auteur || "Sans auteur"}, *${g.titre}*` : (g.auteur || "Sans auteur"),
          ...(notice ? { notice } : {}),
          citations: entrees.map(e => ({ reference: e.lieu, texte: preparerTexteCitation(e.texte) })),
        });
      }
    }
    if (groupesPatristiquesChoisis.length > 0) {
      sections.push({ corpus: "patristique", groupes: groupesPatristiquesChoisis });
    }

    setExtraction({ enCours: true, erreur: null });
    try {
      const res = await fetch("/api/compte/citations/extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecteur: profil.pseudo ?? "", sections }),
      });
      // ⚠️ Le verrou de session redirige au lieu de refuser : une page de connexion revient
      // alors en 200. On contrôle la redirection et le type avant de croire au document.
      const type = res.headers.get("content-type") ?? "";
      if (res.redirected || !res.ok || !type.includes("wordprocessingml")) {
        let message = "Le document n’a pas pu être composé. Réessayez.";
        if (type.includes("json")) { try { message = (await res.json()).error || message; } catch { /* message par défaut */ } }
        throw new Error(message);
      }
      const blob = await res.blob();
      const adresse = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = adresse;
      lien.download = nomDuFichierRecu(res.headers.get("content-disposition"));
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(adresse), 10_000);
      setExtraction({ enCours: false, erreur: null });
    } catch (e) {
      console.error("Mes prélèvements : l’extraction a échoué.", e);
      setExtraction({ enCours: false, erreur: e instanceof Error ? e.message : "Le document n’a pas pu être composé." });
    }
  };

  const resumeSelection = [
    nbVersetsChoisis ? `${nbVersetsChoisis} verset${nbVersetsChoisis > 1 ? "s" : ""}` : "",
    nbPassagesChoisis ? `${nbPassagesChoisis} passage${nbPassagesChoisis > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(" · ");

  // ⚠️ Le bandeau porte ce que la tête de page disait : le compte des citations.
  const pluriel = prelevements.length > 1 ? "s" : "";
  const reperes = prelevements.length
    ? `${prelevements.length} prélèvement${pluriel}`
    : "Vos prélèvements";

  const rubriqueDuSommaire = onglet === "biblique" ? "Livres" : "Auteurs";

  return (
    <div className="esp-cadre">

      <SommaireEspace page="citations" groupes={ancresCitations(rubriqueDuSommaire, groupesDuSommaire)}
 />

      <div className="esp-page">
      <style>{cssServi(`
        /* Le titre d'un groupe : celui d'une section de l'espace, et le geste de dépli
           avec lui. Le filet qui sépare deux groupes est celui des sections. */
        .prel-groupe + .prel-groupe { margin-top: 28px; padding-top: 22px;
          border-top: 1px solid var(--cs-bord-clair); }
        .prel-groupe-tete { display: flex; align-items: baseline; gap: 10px; padding: 0 0 9px; }
        .prel-groupe-tete h2 { font-family: ${SERIF};
          font-style: italic; font-weight: normal; font-size: 0.84375rem;
          color: var(--cs-vert); margin: 0; }

        /* ⛔ UNE CITATION SE COMPOSE COMME LE VERSET QU'ELLE EST : la référence en
           MANCHETTE, dans sa colonne, le texte au fer à côté d'elle, les actions au bout.
           Elle était en trois lignes empilées — texte, puis référence et provenance en
           9 px gris, sous le seuil de contraste — si bien que ce qui identifie le passage
           était ce qu'on lisait le moins. C'est la composition de « Mes annotations », et les
           deux pages de l'espace montrent le même corpus.

           ⛔ LA RANGÉE DÉBORDE DE SA COLONNE, ET LE TEXTE NE BOUGE PAS (2026-09-14). Le
           cadre de la favorite et le lavis du survol se posaient au ras de la référence :
           la rangée avait 10 px de rembourrage en haut et à droite, et aucun à gauche, si
           bien que le filet doré touchait la première lettre. Elle sort donc de
           la colonne de --prel-debord de chaque côté et rend ce débord en rembourrage :
           le texte garde son fer, le cadre prend l'air. C'est le parti des rangées du
           sommaire de l'espace, qui débordent de sept pixels.
           ⚠️ Le FILET qui sépare deux citations ne suit pas ce débord : il vit dans un
           pseudo-élément ramené à la mesure, sans quoi il dépasserait le titre du groupe. */
        .prel-item {
          --prel-debord: 14px;
          display: grid;
          grid-template-columns: 7rem minmax(0, 1fr) auto;
          gap: 0 16px;
          align-items: start;
          margin: 0 calc(-1 * var(--prel-debord));
          padding: 10px calc(10px + var(--prel-debord)) 11px var(--prel-debord);
          border-radius: 8px;
          position: relative;
          transition: background var(--cs-duree-courte);
        }
        .prel-item:hover { background: rgba(var(--cs-vert-rgb),0.03); }

        /* La manchette NOMME, elle ne mène nulle part : la gouttière d'actions porte déjà
           le chemin vers le passage, et deux façons d'y aller en font une de trop. Sur
           « Mes annotations », qui n'a pas de gouttière, la même manchette est un lien. */
        .prel-ref { font-family: ${SERIF};
          font-size: 0.8125rem; font-weight: 600; line-height: 1.35;
          color: var(--cs-texte-fort); padding-top: 1px; }
        /* ⛔ UNE MANCHETTE VIDE NE GARDE SA COLONNE QUE SI UN VOISIN LA REMPLIT. Elle la
           tient quand un passage du groupe n'a pas de lieu et que ses voisins en ont un :
           le fer du texte ne saute pas d'une ligne à l'autre. Quand AUCUN n'en a, la
           colonne n'aligne rien, et elle retirait sept rem à chaque passage. */
        .prel-item--sans-ref { grid-template-columns: minmax(0, 1fr) auto; }
        .prel-item--sans-ref .prel-ref { display: none; }
        /* ⛔ Le texte cité est du CORPUS : il se compose en sérif, comme le verset de la
           page Bible et comme le lemme de la chaîne. Il était en sans, si bien que deux
           pages voisines rendaient le même texte dans deux polices. */
        .prel-texte { font-family: ${SERIF};
          font-size: 0.875rem; line-height: 1.42; color: var(--cs-texte-fort); margin: 0;
          text-align: left; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word; }
        /* ⚠️ La provenance est une GLOSE, non une rubrique : en petites capitales espacées
           elle appelait l'œil autant que la référence. L'italique dit qu'elle n'est pas du
           texte, le gris qu'elle vient en second.
           ⛔ ELLE PARAÎT SOUS CHAQUE VERSET (2026-09-23) : le texte montré est TOUJOURS celui
           du prélèvement, et elle dit sa traduction puis sa langue (« Vulgate clémentine ·
           latin »). Elle ne paraissait que par exception tant qu'un menu faisait relire les
           versets dans une autre bible. */
        .prel-provenance { font-size: 0.6875rem; font-style: italic;
          color: var(--cs-texte-second); margin: 4px 0 0; }

        /* La gouttière d'actions ne paraissait qu'au survol : hors d'atteinte au
           doigt, et invisible au clavier. Elle vient donc aussi au focus, et
           reste posée en permanence sur un écran tactile (.prel-tactile). */
        .prel-actions { display: flex; gap: 0; align-items: center; flex-shrink: 0; margin-left: 10px; opacity: 0; transition: opacity var(--cs-duree-courte); }
        .prel-item:hover .prel-actions,
        .prel-item:focus-within .prel-actions { opacity: 1; }
        .prel-tactile .prel-actions { opacity: 1; }
        /* ⛔ 24 PIXELS AU MOINS, ET UNE ENCRE QUI SE VOIT (2026-09-14). Les boutons
           faisaient 24 sur 22, sous le plancher de WCAG 2.2, et leur encre
           (--cs-texte-faible) ne rendait que 2,14 sur le papier, pour les 3 qu'une icône
           demande. --cs-texte-gris rend 3,45 sur le papier et 3,20 sur le lavis de la
           favorite. Au doigt, la cible prend la mesure d'une grappe (charte, « LE DOIGT »). */
        .prel-action { background: none; border: none; cursor: pointer; color: var(--cs-texte-gris); padding: 0; line-height: 1; transition: color var(--cs-duree-courte); font-family: inherit; font-size:0.8125rem; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; box-sizing: border-box; text-decoration: none; border-radius: 4px; }
        .prel-tactile .prel-action { width: 2.25rem; height: 2.25rem; }
        .prel-action:hover { color: var(--cs-vert); }
        /* La marque de la citation favorite est d'or, jamais du vert des actions :
           elle ne fait pas la même chose qu'elles. ⚠️ L'or doux ne rendait que 1,77 au
           repos : l'or de la charte en rend 3,67, l'or lisible répond au survol. */
        .prel-marque { color: var(--cs-or); }
        .prel-marque:hover { color: var(--cs-or-lisible); }
        .prel-marque-active { color: var(--cs-or) !important; opacity: 1 !important; }
        .prel-confirm { font-size:0.6875rem; color: var(--cs-texte-gris); display: flex; align-items: center; white-space: nowrap; }

        /* ⛔ LA FAVORITE PREND L'AIR QUE SON CADRE DEMANDE (2026-09-14). Le cadre est un
           filet d'or d'un pixel, posé en ombre intérieure pour ne rien déplacer, et le
           lavis le double. La rangée s'ouvre de quelques pixels en haut et en bas, et se
           détache de ses voisines d'autant : un encadrement collé au texte qu'il désigne
           se lit comme une case, non comme un choix.
           ⚠️ Deux classes au sélecteur : le survol en porte deux lui aussi, et c'est
           l'ordre qui tranche. Plus aucun « !important ».
           ⛔ Sa référence prend l'or LISIBLE : l'or de la charte n'y rendait que 3,37 sur
           le lavis, quand la référence porte seule l'identité du passage (§ 40.11). */
        .prel-item.prel-pref {
          background: ${colorMix('var(--cs-or)', 7)};
          box-shadow: inset 0 0 0 1px ${colorMix('var(--cs-or)', 48)};
          margin-top: 6px; margin-bottom: 6px;
          padding-top: 12px; padding-bottom: 13px;
        }
        .prel-item.prel-pref .prel-ref { color: var(--cs-or-lisible); }
        .prel-item.prel-pref .prel-actions { opacity: 1; }


        /* La barre d'outils : l'extraction au fer à droite. ⛔ Plus de menu de traduction
           (2026-09-23) : chaque verset se montre tel qu'il a été prélevé. */
        .prel-outils { display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-bottom: 16px; min-height: 1.75rem; }
        .prel-outil { display: inline-flex; align-items: center; gap: 6px; background: none;
          border: none; padding: 3px 0; cursor: pointer; font-family: inherit;
          font-size: 0.75rem; color: var(--cs-texte-second); transition: color var(--cs-duree-courte); }
        .prel-outil:hover { color: var(--cs-vert); }

        /* ── Le mode sélection ──
           ⚠️ Les actions se retirent : la rangée entière devient la cible, et la case
           prend la colonne qu'elles laissent, au fer à gauche. */
        .prel-case { accent-color: var(--cs-vert); width: 14px; height: 14px; margin: 0;
          cursor: pointer; flex-shrink: 0; }
        .prel-case-cellule { display: flex; padding-top: 3px; }
        .prel-item.prel-item--selection { grid-template-columns: 1.25rem 7rem minmax(0, 1fr);
          cursor: pointer; }
        .prel-item.prel-item--selection.prel-item--sans-ref { grid-template-columns: 1.25rem minmax(0, 1fr); }
        .prel-item.prel-item--choisi { background: rgba(var(--cs-vert-rgb), 0.06); }
        .prel-groupe-oeuvre { font-style: italic; color: var(--cs-texte-second); }

        /* La barre de l'extraction, collante au pied de la colonne. */
        .prel-barre { position: sticky; bottom: 0; z-index: 5; margin-top: 24px;
          display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px;
          padding: 10px 14px; background: var(--cs-surface);
          border: 1px solid var(--cs-bord-clair); border-radius: 8px;
          box-shadow: var(--cs-ombre-posee-haut); }
        .prel-barre-compte { font-size: 0.8125rem; color: var(--cs-texte); }
        .prel-barre-erreur { font-size: 0.75rem; color: var(--cs-danger-fonce); }
        .prel-barre-gestes { margin-left: auto; display: inline-flex; align-items: center; gap: 16px; }
        .prel-bouton { font-family: inherit; font-size: 0.8125rem; font-weight: 600;
          padding: 6px 14px; border-radius: 4px; border: 1px solid var(--cs-vert-aplat);
          background: var(--cs-vert-aplat); color: var(--cs-sur-aplat); cursor: pointer; }
        .prel-bouton:hover:not(:disabled) { background: var(--cs-vert-aplat-fonce); }
        .prel-bouton:disabled { opacity: var(--cs-opacite-desactive); cursor: default; }

        .prel-onglets { margin-bottom: 14px; }
        .prel-plus { display: none; }

        .prel-vide { text-align: center; padding: 64px 0; }
        .prel-vide p { font-size: 0.875rem; color: var(--cs-texte-second); margin: 0 0 14px; }

        /* ⛔ SUR UN TÉLÉPHONE, LE TEXTE PREND TOUTE LA MESURE (2026-09-14). La référence
           montait au-dessus du texte, mais la gouttière d'actions restait à côté de lui :
           à 375 px de large, ses quatre boutons, sa marge et l'écart de la grille prenaient
           116 px sur 317, plus d'un tiers de la mesure. Les actions montent sur la ligne de
           la référence, et le texte descend sous les deux. Le débord se resserre : la page
           n'a que 24 px de marge. */
        @media (max-width: 640px) {
          .prel-item { --prel-debord: 10px; grid-template-columns: minmax(0, 1fr) auto;
            grid-template-areas: "ref actions" "corps corps"; gap: 2px 10px; }
          .prel-ref { grid-area: ref; padding-top: 0; align-self: center; }
          .prel-corps { grid-area: corps; }
          .prel-actions { grid-area: actions; margin-left: 0; }
          .prel-item.prel-item--selection { grid-template-columns: 1.25rem minmax(0, 1fr);
            grid-template-areas: "case ref" "case corps"; }
          .prel-item.prel-item--selection.prel-item--sans-ref { grid-template-areas: "case corps"; }
          .prel-case-cellule { grid-area: case; }

          /* ⛔ ALLÉGÉE AU TÉLÉPHONE (2026-09-22, « allège la page des citations »). Moins
             de blanc entre les groupes et autour de chaque passage, une référence d'un
             rang plus discrète, et les actions repliées derrière un seul bouton : elles
             se répétaient à chaque citation. La favorite garde sa marque d'or en vue.
             Le bureau ne change pas. */
          .prel-groupe + .prel-groupe { margin-top: 16px; padding-top: 12px; }
          .prel-groupe-tete { padding-bottom: 2px; }
          .prel-item { padding: 6px var(--prel-debord) 8px; }
          .prel-item.prel-pref { margin-top: 4px; margin-bottom: 4px; padding-top: 8px; padding-bottom: 9px; }
          .prel-ref { font-size: 0.75rem; color: var(--cs-texte-second); }
          .prel-texte { font-size: 0.84375rem; line-height: 1.38; }
          .prel-provenance { margin-top: 2px; }
          .prel-actions { opacity: 1; margin: -6px -8px -6px 0; }
          .prel-plus { display: inline-flex; }
          .prel-plus[aria-expanded="true"] { color: var(--cs-vert); }
          .prel-item:not(.prel-item--ouvert) .prel-actions > :not(.prel-plus):not(.prel-marque-active) { display: none; }
          .prel-onglets { margin-bottom: 8px; }
          .prel-onglets .cs-onglet { padding: 6px 4px; }
          .prel-outils { margin-bottom: 8px; min-height: 0; flex-wrap: nowrap; }
          .prel-outil { flex-shrink: 0; }
          .prel-vide { padding: 32px 0; }
          .prel-barre { margin-top: 14px; padding: 8px 10px; }
        }
      `)}</style>

        <BandeauLecteur lecteur={profil} reperes={reperes} />

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
            { cle: "biblique" as TypePrelevement, libelle: `Versets bibliques (${bibliques.length || '∅'})` },
            { cle: "patristique" as TypePrelevement, libelle: `Textes patristiques (${patristiques.length || '∅'})` },
          ]}
          actif={onglet}
          choisir={setOnglet}
          intitule="Corpus des citations"
          className="prel-onglets"
        />

        {/* ── La barre d'outils : l'extraction à droite ──
            ⚠️ Une seule rangée pour les deux : chacune tenait sa ligne, et la page
            descendait de deux rangs avant la première citation. */}
        {listeActive.length > 0 && (
          <div className="prel-outils">
            <span />
            {selection === null ? (
              <button type="button" className="prel-outil" onClick={() => setSelection(new Set())}>
                <IconeDocument />Extraire en Word
              </button>
            ) : (
              <button type="button" className="prel-outil" onClick={() => basculer(entreesOnglet)}>
                {etatDes(entreesOnglet, selection) === "tout" ? "Tout décocher" : "Tout cocher"}
              </button>
            )}
          </div>
        )}

        {/* ── Citations bibliques ── */}
        {onglet === "biblique" && (
          bibliques.length === 0 ? (
            <ListeVide mention="Aucun verset enregistré." href="/?livre=GEN&chapitre=1" lien="Ouvrir la Bible" />
          ) : (
            <div>
              {vueBiblique.map(({ label, nom, entrees }) => (
                <GroupeCitations key={label} ancre={ancreDuGroupe(label)} label={nom}
                  caseGroupe={selection && (
                    <CaseACocher etat={etatDes(entrees.map(e => e.ids), selection)}
                      onChange={() => basculer(entrees.map(e => e.ids))} libelle={`Tout ${nom}`} />
                  )}>
                  {entrees.map(({ cle, ids, groupe: g, texte, ref, codeLu, tradLue, provenance }) => {
                    const estPref = favorites.biblique != null && ids.includes(favorites.biblique.id);
                    const estChoisi = choisi(ids);
                    return (
                      <div key={cle}
                        className={`prel-item${estPref ? " prel-pref" : ""}${sansSurvol ? " prel-tactile" : ""}${selection ? " prel-item--selection" : ""}${estChoisi ? " prel-item--choisi" : ""}${actionsOuvertes === cle ? " prel-item--ouvert" : ""}`}
                        onClick={selection ? () => basculer([ids]) : undefined}>
                        {selection && (
                          <span className="prel-case-cellule">
                            <CaseACocher etat={estChoisi ? "tout" : "rien"} onChange={() => basculer([ids])} libelle={ref} />
                          </span>
                        )}
                        <span className="prel-ref">{ref}</span>
                        <div className="prel-corps">
                          <p className="prel-texte">
                            «&#8201;{rendreTexteEnrichi(preparerTexteCitation(texte))}&#8201;»
                          </p>
                          {provenance && <p className="prel-provenance">{rendreEnrichi(provenance)}</p>}
                        </div>
                        {!selection && (
                          <div className="prel-actions">
                            <BoutonCitationPreferee actif={estPref} onClick={e => { e.stopPropagation(); choisirPreferee({ id: ids[0], ids, texte, type: "biblique", ref, traduction: tradLue ?? undefined }); }} />
                            <BoutonCopie citation={citationBiblique(texte, ref)} />
                            <BoutonLien href={`/?livre=${CODE_PAR_ABREV[g.ref_livre_abr] ?? g.ref_livre_abr}&chapitre=${g.ref_chapitre}&verset=${g.verset_debut}&trad=${codeLu ?? "TR0001"}`} />
                            <BoutonSuppr onSuppr={() => supprimerIds(ids)} />
                            <BoutonPlus ouvert={actionsOuvertes === cle} onBasculer={() => basculerActions(cle)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </GroupeCitations>
              ))}
            </div>
          )
        )}

        {/* ── Citations patristiques ── */}
        {onglet === "patristique" && (
          patristiques.length === 0 ? (
            <ListeVide mention="Aucun passage enregistré." href="/bibliotheque" lien="Ouvrir la bibliothèque" />
          ) : (
            <div>
              {vuePatristique.map(({ label, auteur, titre, idAuteur, entrees, sansManchette }) => (
                <GroupeCitations key={label} ancre={ancreDuGroupe(label)} label={
                  <>
                    {idAuteur ? (
                      <Link href={`/auteur/${idAuteur}`} onClick={e => e.stopPropagation()}
                        style={{ color: "inherit", textDecoration: "none" }}>
                        {auteur}
                      </Link>
                    ) : auteur}
                    {titre && <span className="prel-groupe-oeuvre">, {titre}</span>}
                  </>
                }
                  caseGroupe={selection && (
                    <CaseACocher etat={etatDes(entrees.map(e => e.ids), selection)}
                      onChange={() => basculer(entrees.map(e => e.ids))}
                      libelle={`Tout ${auteur}${titre ? `, ${titre}` : ""}`} />
                  )}>
                  {entrees.map(({ cle, ids, p, texte, lieu, info, edition }) => {
                    const estPref = favorites.patristique != null && ids.includes(favorites.patristique.id);
                    const estChoisi = choisi(ids);
                    return (
                      <div key={cle}
                        className={`prel-item${sansManchette ? " prel-item--sans-ref" : ""}${estPref ? " prel-pref" : ""}${sansSurvol ? " prel-tactile" : ""}${selection ? " prel-item--selection" : ""}${estChoisi ? " prel-item--choisi" : ""}${actionsOuvertes === cle ? " prel-item--ouvert" : ""}`}
                        onClick={selection ? () => basculer([ids]) : undefined}>
                        {selection && (
                          <span className="prel-case-cellule">
                            <CaseACocher etat={estChoisi ? "tout" : "rien"} onChange={() => basculer([ids])}
                              libelle={lieu || `${auteur}, ${titre}`} />
                          </span>
                        )}
                        {/* ⚠️ La manchette tient sa colonne même vide : un passage sans
                            lieu ne doit pas décaler le fer de ses voisins. */}
                        <span className="prel-ref">{lieu}</span>
                        <div className="prel-corps">
                          <p className="prel-texte">
                            «&#8201;{rendreTexteEnrichi(preparerTexteCitation(texte))}&#8201;»
                          </p>
                        </div>
                        {!selection && (
                          <div className="prel-actions">
                            <BoutonCitationPreferee actif={estPref} onClick={e => { e.stopPropagation(); choisirPreferee({ id: p.id, ids, texte, type: "patristique", auteur: p.auteur, titre_oeuvre: p.titre_oeuvre }); }} />
                            <BoutonCopie citation={citationPatristiqueDepuisInfo(texte, auteur, titre, info, edition)} />
                            {p.id_oeuvre && (
                              // ⚠️ `?texte=` rouvre l'édition du passage : sans lui, un passage latin
                              // rouvrait la traduction française, texte par défaut de l'œuvre.
                              <BoutonLien href={`/oeuvre/${p.id_oeuvre}${parametreTexte(edition) ? `?${parametreTexte(edition)}` : ''}${p.segment_numero ? `#s${p.segment_numero}` : ''}`} />
                            )}
                            <BoutonSuppr onSuppr={() => supprimerIds(ids)} />
                            <BoutonPlus ouvert={actionsOuvertes === cle} onBasculer={() => basculerActions(cle)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </GroupeCitations>
              ))}
            </div>
          )
        )}

        {/* ── La barre de l'extraction ──
            ⚠️ Collante au pied de la colonne : la sélection se fait en descendant la
            liste, et le geste qui la conclut doit rester sous la main. */}
        {selection && (
          <div className="prel-barre" role="region" aria-label="Extraction en document Word">
            <span className="prel-barre-compte" aria-live="polite">
              {nbChoisis === 0 ? "Cochez les citations à extraire." : `${resumeSelection} sélectionné${nbChoisis > 1 ? "s" : ""}`}
            </span>
            {extraction.erreur && <span className="prel-barre-erreur" role="alert">{extraction.erreur}</span>}
            <span className="prel-barre-gestes">
              <button type="button" className="cs-bouton-lien" onClick={quitterSelection}>Annuler</button>
              <button type="button" className="prel-bouton" onClick={extraire}
                disabled={nbChoisis === 0 || !pretPourExtraire || extraction.enCours}>
                {extraction.enCours ? "Composition…" : !pretPourExtraire ? "Préparation…" : "Extraire en Word"}
              </button>
            </span>
          </div>
        )}

        </>)}
      </div>

      {/* « Voulez-vous remplacer votre citation favorite ? » — seulement quand la place
          du même corpus est déjà occupée : désigner la première ne demande rien. */}
      {remplacementPropose && favorites[remplacementPropose.type] && (
        <ModaleRemplacerCitation
          actuelle={favorites[remplacementPropose.type]!}
          nouvelle={remplacementPropose}
          onConfirmer={() => { inscrireFavorite(remplacementPropose.type, remplacementPropose); setRemplacementPropose(null); }}
          onAnnuler={() => setRemplacementPropose(null)}
        />
      )}
    </div>
  );
}
