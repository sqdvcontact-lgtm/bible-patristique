"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

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

type OeuvreInfo = {
  id_oeuvre: string; sous_titre?: string
  trad_auteur?: string; editeur?: string
  collection?: string; ville?: string; date_publication?: string
};

type GroupeBiblique = {
  ids: string[]; ref_livre: string; ref_livre_abr: string;
  ref_chapitre: number; verset_debut: number; verset_fin: number;
  textes: string[]; traduction?: string;
};

const ABREV_ORDRE: Record<string, number> = {
  Gn:1,Ex:2,Lv:3,Nb:4,Dt:5,Jos:6,Jg:7,Rt:8,"1S":9,"2S":10,"1R":11,"2R":12,
  "1Ch":13,"2Ch":14,Esd:15,Né:16,Est:17,Jb:18,Ps:19,Pr:20,Qo:21,Ct:22,
  Is:23,Jr:24,Lm:25,Ez:26,Dn:27,Os:28,Jl:29,Am:30,Ab:31,Jon:32,Mi:33,
  Na:34,Ha:35,So:36,Ag:37,Za:38,Ml:39,Mt:40,Mc:41,Lc:42,Jn:43,Ac:44,
  Rm:45,"1Co":46,"2Co":47,Ga:48,Ep:49,Ph:50,Col:51,"1Th":52,"2Th":53,
  "1Tm":54,"2Tm":55,Tt:56,Phm:57,He:58,Jc:59,"1P":60,"2P":61,
  "1Jn":62,"2Jn":63,"3Jn":64,Jude:65,Ap:66,
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
  const base = `${g.ref_livre_abr} ${g.ref_chapitre},${g.verset_debut}`;
  return g.verset_debut === g.verset_fin ? base : `${base}-${g.verset_fin}`;
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
  if (info?.sous_titre) titreComplet += '. ' + info.sous_titre + '.';
  else if (titre) titreComplet += '.';
  if (titreComplet) parts.push(titreComplet);
  if (info?.trad_auteur) parts.push('trad. ' + info.trad_auteur);
  if (info?.editeur) parts.push(info.editeur);
  if (info?.collection) parts.push(info.collection);
  if (info?.ville) parts.push(info.ville);
  if (info?.date_publication) parts.push(info.date_publication);
  const ref = parts.join(', ');
  return ref + (ref ? ' : ' : '') + '« ' + texte + ' » — disponible sur labibledesperes.com';
}

function BoutonCopie({ texte }: { texte: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(texte).then(() => { setOk(true); setTimeout(() => setOk(false), 1400); }); }}
      title="Copier"
      style={{ background:"none", border:"none", cursor:"pointer", fontSize:"14px", color: ok ? "#3d6b4f" : "#c0b8b0", padding:"1px 4px" }}>
      {ok ? "✓" : "⧉"}
    </button>
  );
}

function BoutonSuppr({ ids, onSuppr }: { ids: string[]; onSuppr: () => void }) {
  const [conf, setConf] = useState(false);
  if (conf) return (
    <span style={{ fontSize:"11px", color:"#9a2a2a", display:"flex", alignItems:"center", gap:"4px" }}>
      Supprimer ?
      <button onClick={onSuppr} style={{ background:"none", border:"none", cursor:"pointer", color:"#9a2a2a", fontSize:"11px", fontWeight:600 }}>Oui</button>
      <button onClick={() => setConf(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9a958d", fontSize:"11px" }}>Non</button>
    </span>
  );
  return (
    <button onClick={() => setConf(true)} title="Supprimer" style={{ background:"none", border:"none", cursor:"pointer", fontSize:"13px", color:"#3d6b4f", padding:"1px 4px" }}>✕</button>
  );
}

// ── Groupe repliable ──────────────────────────────────────────────────────────
function GroupeRepliable({ label, count, ouvert, onToggle, children }: {
  label: React.ReactNode; count: number; ouvert: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{ display:"flex", alignItems:"center", gap:"8px", background:"none", border:"none", cursor:"pointer", padding:"0 0 8px", width:"100%" }}
      >
        <span style={{ fontSize:"10.5px", fontWeight:700, letterSpacing:"0.10em", color:"#6a7b6e" }}>
          {label}
        </span>
        <span style={{ fontSize:"10px", color:"#b0a89e", background:"#eeebe4", padding:"1px 6px", borderRadius:"10px" }}>{count}</span>
        <span style={{ fontSize:"9px", color:"#b0a89e", marginLeft:"auto", transition:"transform 0.18s", display:"inline-block", transform: ouvert ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {ouvert && children}
    </div>
  );
}

export default function PrelevementsPage() {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [prelevements, setPrelevements] = useState<Prelevement[]>([]);
  const [onglet, setOnglet] = useState<TypePrelevement>("biblique");
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  const [oeuvresInfo, setOeuvresInfo] = useState<Record<string, OeuvreInfo>>({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push("/compte"); return; }
      const { data: rows } = await supabase
        .from("prelevements").select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });
      const prelevsData = rows ?? [];
      setPrelevements(prelevsData);
      setChargement(false);

      // Charger les métadonnées des oeuvres pour la citation complète
      const ids = [...new Set(prelevsData.filter(p => p.id_oeuvre).map(p => p.id_oeuvre as string))];
      if (ids.length > 0) {
        const { data: od } = await supabase
          .from("oeuvres")
          .select("id_oeuvre, sous_titre, trad_auteur, editeur, collection, ville, date_publication")
          .in("id_oeuvre", ids);
        const map: Record<string, OeuvreInfo> = {};
        (od ?? []).forEach(o => { map[o.id_oeuvre] = o; });
        setOeuvresInfo(map);
      }
    });
  }, [router]);

  const supprimerIds = async (ids: string[]) => {
    await supabase.from("prelevements").delete().in("id", ids);
    setPrelevements(prev => prev.filter(p => !ids.includes(p.id)));
  };

  const bibliques = trierBibliques(prelevements.filter(p => p.type === "biblique"));
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

  // Déployer tous par défaut au changement d'onglet
  useEffect(() => {
    setGroupesOuverts(new Set(tousLesGroupes));
  }, [onglet, prelevements]);

  if (chargement) return (
    <main style={{ minHeight:"calc(100vh - 48px)", background:"#f7f4ef", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ fontSize:"13px", color:"#9a958d", fontStyle:"italic" }}>Chargement…</p>
    </main>
  );

  return (
    <main style={{ background:"#f7f4ef", minHeight:"calc(100vh - 48px)" }}>
      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"40px 24px 80px" }}>

        <div style={{ marginBottom:"32px" }}>
          <h1 style={{ fontFamily:"Georgia, 'Times New Roman', serif", fontSize:"26px", fontWeight:"normal", color:"#2a3d30", margin:"0 0 6px" }}>
            Mes citations
          </h1>
          <p style={{ fontSize:"12.5px", color:"#9a958d", margin:0 }}>
            {prelevements.length} citation{prelevements.length > 1 ? "s" : ""} enregistrée{prelevements.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Onglets */}
        <div style={{ display:"flex", borderBottom:"1px solid #d6d0c4", marginBottom:"20px" }}>
          {(["biblique","patristique"] as TypePrelevement[]).map(t => (
            <button key={t} onClick={() => setOnglet(t)}
              style={{ padding:"9px 18px", fontSize:"12.5px", fontWeight: onglet===t ? 600 : 400, color: onglet===t ? "#3d6b4f" : "#9a958d", background:"transparent", border:"none", borderBottom: onglet===t ? "2px solid #3d6b4f" : "2px solid transparent", cursor:"pointer", letterSpacing:"0.01em", transition:"color 0.12s" }}>
              {t === "biblique" ? "Citations bibliques" : "Citations patristiques"}
              <span style={{ marginLeft:"6px", fontSize:"10.5px", background: onglet===t ? "rgba(61,107,79,0.10)" : "#eeebe4", color: onglet===t ? "#3d6b4f" : "#9a958d", padding:"1px 6px", borderRadius:"10px" }}>
                {t === "biblique" ? bibliques.length : patristiques.length}
              </span>
            </button>
          ))}
        </div>

        {/* Boutons tout déployer / rétracter */}
        {((onglet === "biblique" && bibliques.length > 0) || (onglet === "patristique" && patristiques.length > 0)) && (
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", marginBottom:"16px" }}>
            <button onClick={toutDeployer}
              style={{ fontSize:"11px", color:"#6a7b6e", background:"none", border:"1px solid #d6d0c4", borderRadius:"4px", padding:"3px 10px", cursor:"pointer" }}>
              Tout déployer
            </button>
            <button onClick={toutRetracter}
              style={{ fontSize:"11px", color:"#6a7b6e", background:"none", border:"1px solid #d6d0c4", borderRadius:"4px", padding:"3px 10px", cursor:"pointer" }}>
              Tout rétracter
            </button>
          </div>
        )}

        {/* ── Citations bibliques ── */}
        {onglet === "biblique" && (
          bibliques.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <p style={{ fontSize:"13px", color:"#9a958d", fontStyle:"italic", marginBottom:"16px" }}>
                Aucun verset enregistré. Cliquez sur ⊕ à côté d'un verset dans la Bible.
              </p>
              <Link href="/" style={{ fontSize:"12.5px", color:"#3d6b4f", textDecoration:"none", borderBottom:"1px solid #3d6b4f" }}>Ouvrir la Bible →</Link>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
              {groupesBibliquesBruts.map(({ label, items }) => {
                const agglomeres = agglomererBibliques(items);
                const ouvert = groupesOuverts.has(label);
                return (
                  <GroupeRepliable key={label} label={<span style={{ textTransform:"uppercase" }}>{items[0].ref_livre ?? label}</span>} count={agglomeres.length} ouvert={ouvert} onToggle={() => toggleGroupe(label)}>
                    <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"4px" }}>
                      {agglomeres.map((g, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", padding:"8px 10px", borderRadius:"5px", background:"#faf8f4", border:"1px solid #ede9e2" }}>
                          <span style={{ fontSize:"10.5px", fontWeight:600, color:"#3d6b4f", flexShrink:0, marginTop:"2px", minWidth:"60px" }}>
                            {refBiblique(g)}
                          </span>
                          <p style={{ fontSize:"12.5px", lineHeight:"1.55", color:"#1e1a16", margin:0, flex:1 }}>
                            {texteGroupe(g)}
                          </p>
                          <div style={{ display:"flex", gap:"2px", flexShrink:0, marginTop:"1px" }}>
                            <BoutonCopie texte={`« ${texteGroupe(g)} » (${refBiblique(g)})`} />
                            <BoutonSuppr ids={g.ids} onSuppr={() => supprimerIds(g.ids)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </GroupeRepliable>
                );
              })}
            </div>
          )
        )}

        {/* ── Citations patristiques ── */}
        {onglet === "patristique" && (
          patristiques.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <p style={{ fontSize:"13px", color:"#9a958d", fontStyle:"italic", marginBottom:"16px" }}>
                Aucun segment enregistré. Cliquez sur ⊕ à côté d'un passage dans une œuvre.
              </p>
              <Link href="/bibliotheque" style={{ fontSize:"12.5px", color:"#3d6b4f", textDecoration:"none", borderBottom:"1px solid #3d6b4f" }}>Ouvrir la bibliothèque →</Link>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
              {groupesPatristiques.map(({ label, items }) => {
                const [auteur, titre] = label.split("||");
                const ouvert = groupesOuverts.has(label);
                return (
                  <GroupeRepliable key={label} label={
                    <>
                      <span style={{ textTransform:"uppercase" }}>{auteur}</span>
                      {titre && <span style={{ textTransform:"none", fontStyle:"italic", fontWeight:400 }}>, {titre}</span>}
                    </>
                  } count={items.length} ouvert={ouvert} onToggle={() => toggleGroupe(label)}>
                    <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"4px" }}>
                      {items.map(p => {
                        return (
                          <div key={p.id} style={{ display:"flex", alignItems:"flex-start", gap:"10px", padding:"8px 10px", borderRadius:"5px", background:"#faf8f4", border:"1px solid #ede9e2" }}>
                            <p style={{ fontSize:"12.5px", lineHeight:"1.55", color:"#1e1a16", margin:0, flex:1 }}>{p.texte}</p>
                            <div style={{ display:"flex", gap:"2px", flexShrink:0, marginTop:"1px", alignItems:"center" }}>
                              <BoutonCopie texte={construireCitationPatristique(p.texte, auteur, titre, p.id_oeuvre ? oeuvresInfo[p.id_oeuvre] : undefined)} />
                              <BoutonSuppr ids={[p.id]} onSuppr={() => supprimerIds([p.id])} />
                              {p.id_oeuvre && (
                                <Link href={`/oeuvre/${p.id_oeuvre}${p.segment_numero ? `#s${p.segment_numero}` : ''}`} target="_blank" rel="noopener noreferrer"
                                  title="Accéder à ce passage dans l'œuvre"
                                  style={{ fontSize:"12px", color:"#c8c0b4", textDecoration:"none", padding:"1px 4px" }}>
                                  ↗
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
