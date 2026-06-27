"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";

const LIENS_PRIMAIRES: { href: string; label: string; exact?: boolean }[] = [
  { href: "/?livre=GEN&chapitre=1", label: "Bible", exact: true },
  { href: "/bibliotheque", label: "Patristique" },
  { href: "/essais", label: "Publications" },
];
const LIENS_SECONDAIRES: { href: string; label: string }[] = [
  { href: "/traductions", label: "Aller plus loin" },
];

// ── Données statiques pour la recherche rapide ───────────────────────────────
const LIVRES_RECHERCHE: { code: string; nom: string }[] = [
  { code: 'GEN', nom: 'Genèse' }, { code: 'EXO', nom: 'Exode' }, { code: 'LEV', nom: 'Lévitique' },
  { code: 'NUM', nom: 'Nombres' }, { code: 'DEU', nom: 'Deutéronome' }, { code: 'JOS', nom: 'Josué' },
  { code: 'JDG', nom: 'Juges' }, { code: 'RUT', nom: 'Ruth' }, { code: '1SA', nom: '1 Samuel' },
  { code: '2SA', nom: '2 Samuel' }, { code: '1KI', nom: '1 Rois' }, { code: '2KI', nom: '2 Rois' },
  { code: '1CH', nom: '1 Chroniques' }, { code: '2CH', nom: '2 Chroniques' }, { code: 'EZR', nom: 'Esdras' },
  { code: 'NEH', nom: 'Néhémie' }, { code: 'EST', nom: 'Esther' }, { code: 'JOB', nom: 'Job' },
  { code: 'PSA', nom: 'Psaumes' }, { code: 'PRO', nom: 'Proverbes' }, { code: 'ECC', nom: 'Ecclésiaste' },
  { code: 'SNG', nom: 'Cantique des cantiques' }, { code: 'ISA', nom: 'Isaïe' }, { code: 'JER', nom: 'Jérémie' },
  { code: 'LAM', nom: 'Lamentations' }, { code: 'EZK', nom: 'Ézéchiel' }, { code: 'DAN', nom: 'Daniel' },
  { code: 'HOS', nom: 'Osée' }, { code: 'JOL', nom: 'Joël' }, { code: 'AMO', nom: 'Amos' },
  { code: 'OBA', nom: 'Abdias' }, { code: 'JON', nom: 'Jonas' }, { code: 'MIC', nom: 'Michée' },
  { code: 'NAM', nom: 'Nahum' }, { code: 'HAB', nom: 'Habacuc' }, { code: 'ZEP', nom: 'Sophonie' },
  { code: 'HAG', nom: 'Aggée' }, { code: 'ZEC', nom: 'Zacharie' }, { code: 'MAL', nom: 'Malachie' },
  { code: 'MAT', nom: 'Matthieu' }, { code: 'MRK', nom: 'Marc' }, { code: 'LUK', nom: 'Luc' },
  { code: 'JHN', nom: 'Jean' }, { code: 'ACT', nom: 'Actes' }, { code: 'ROM', nom: 'Romains' },
  { code: '1CO', nom: '1 Corinthiens' }, { code: '2CO', nom: '2 Corinthiens' }, { code: 'GAL', nom: 'Galates' },
  { code: 'EPH', nom: 'Éphésiens' }, { code: 'PHP', nom: 'Philippiens' }, { code: 'COL', nom: 'Colossiens' },
  { code: '1TH', nom: '1 Thessaloniciens' }, { code: '2TH', nom: '2 Thessaloniciens' }, { code: '1TI', nom: '1 Timothée' },
  { code: '2TI', nom: '2 Timothée' }, { code: 'TIT', nom: 'Tite' }, { code: 'PHM', nom: 'Philémon' },
  { code: 'HEB', nom: 'Hébreux' }, { code: 'JAS', nom: 'Jacques' }, { code: '1PE', nom: '1 Pierre' },
  { code: '2PE', nom: '2 Pierre' }, { code: '1JN', nom: '1 Jean' }, { code: '2JN', nom: '2 Jean' },
  { code: '3JN', nom: '3 Jean' }, { code: 'JUD', nom: 'Jude' }, { code: 'REV', nom: 'Apocalypse' },
];
const TRADUCTIONS_RECHERCHE: { code: string; nom: string }[] = [
  { code: 'TR0001', nom: 'Bible de Sacy' }, { code: 'TR0002', nom: 'Bible Segond' },
  { code: 'TR0003', nom: 'Bible Crampon' }, { code: 'TR0004', nom: 'Vulgate' },
];
function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

function IconCoeur() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [estAdmin, setEstAdmin] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [mobileOuvert, setMobileOuvert] = useState(false);
  const [nbNotifications, setNbNotifications] = useState(0);
  const [nbActionsAdmin, setNbActionsAdmin] = useState(0);
  const [toastNotification, setToastNotification] = useState<{ titre: string; message: string } | null>(null);
  const { modeUtilisateurStandard, setModeUtilisateurStandard } = useAffichageAdmin();
  const estAdminEmail = !!(user && user.email && user.email.trim().toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase());
  const estAdminAffiche = (estAdmin || estAdminEmail) && !modeUtilisateurStandard;

  // ── Recherche rapide (remplace l'ancien lien « Recherche ») ──────────────────
  const [requeteRapide, setRequeteRapide] = useState("");
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [auteursTrouves, setAuteursTrouves] = useState<{ id_auteur: string; nom: string }[]>([]);
  const [essaisTrouves, setEssaisTrouves] = useState<{ id: number; titre: string }[]>([]);

  useEffect(() => {
    const q = requeteRapide.trim();
    if (!q) { setAuteursTrouves([]); setEssaisTrouves([]); return; }
    const t = setTimeout(() => {
      supabase.from('auteurs').select('id_auteur, nom').ilike('nom', `%${q}%`).limit(5)
        .then(({ data }) => setAuteursTrouves(data ?? []));
      supabase.from('essais').select('id, titre').eq('statut', 'publie')
        .or(`titre.ilike.%${q}%,resume.ilike.%${q}%`).limit(5)
        .then(({ data }) => setEssaisTrouves(data ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [requeteRapide]);

  const qNorm = sansAccents(requeteRapide.trim());
  const livresTrouves = qNorm ? LIVRES_RECHERCHE.filter(l => sansAccents(l.nom).includes(qNorm)).slice(0, 5) : [];
  const traductionsTrouvees = qNorm ? TRADUCTIONS_RECHERCHE.filter(t => sansAccents(t.nom).includes(qNorm)) : [];
  const aucunResultat = qNorm.length > 0 && auteursTrouves.length === 0 && livresTrouves.length === 0 && traductionsTrouvees.length === 0 && essaisTrouves.length === 0;

  const fermerRechercheRapide = () => { setRechercheOuverte(false); setRequeteRapide(""); setMobileOuvert(false); };
  const validerRechercheRapide = () => {
    if (!requeteRapide.trim()) return;
    router.push(`/recherche?q=${encodeURIComponent(requeteRapide.trim())}&mode=prefixe`);
    fermerRechercheRapide();
  };

  useEffect(() => {
    const chargerProfil = (uid: string) =>
      supabase.from('profils').select('pseudo, est_admin').eq('id', uid).maybeSingle().then(({ data }) => {
        setPseudo(data?.pseudo ?? null);
        setEstAdmin(data?.est_admin ?? false);
      });
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
      if (u) chargerProfil(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null);
      if (session?.user) chargerProfil(session.user.id);
      else { setPseudo(null); setEstAdmin(false); setNbNotifications(0); setNbActionsAdmin(0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) { setNbNotifications(0); return }
    const cleArchives = `notifications_archivees:${user.id}`
    const cleConnues = `notifications_connues:${user.id}`

    const lireSet = (cle: string) => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(cle) ?? '[]')) }
      catch { return new Set<string>() }
    }

    const chargerNotifications = async (avecToast: boolean) => {
      const [essais, commentaires, signalements] = await Promise.all([
        supabase.from('essais').select('id, titre, note_admin, updated_at').eq('user_id', user.id).not('note_admin', 'is', null),
        supabase.from('commentaires').select('id, texte, message_admin, message_admin_at').eq('user_id', user.id).not('message_admin', 'is', null),
        supabase.from('signalements').select('id, message, message_admin, message_admin_at').eq('user_id', user.id).not('message_admin', 'is', null),
      ])
      const toutes = [
        ...((essais.data ?? []) as any[]).map(e => ({ key: `essai:${e.id}:${e.updated_at ?? ''}`, titre: 'Proposition de texte', message: e.note_admin || e.titre || '' })),
        ...((commentaires.data ?? []) as any[]).map(c => ({ key: `commentaire:${c.id}:${c.message_admin_at ?? ''}`, titre: 'Commentaire', message: c.message_admin || c.texte || '' })),
        ...((signalements.data ?? []) as any[]).map(s => ({ key: `signalement:${s.id}:${s.message_admin_at ?? ''}`, titre: 'Signalement', message: s.message_admin || s.message || '' })),
      ]
      const archives = lireSet(cleArchives)
      const connues = lireSet(cleConnues)
      const actives = toutes.filter(n => !archives.has(n.key))
      const nouvelles = actives.filter(n => !connues.has(n.key))
      setNbNotifications(actives.length)
      if (avecToast && nouvelles.length > 0 && connues.size > 0) {
        const n = nouvelles[0]
        setToastNotification({ titre: n.titre, message: String(n.message).slice(0, 120) })
        window.setTimeout(() => setToastNotification(null), 5200)
      }
      localStorage.setItem(cleConnues, JSON.stringify(toutes.map(n => n.key)))
    }

    void chargerNotifications(false)
    const interval = window.setInterval(() => void chargerNotifications(true), 45000)
    const onArchivees = () => void chargerNotifications(false)
    window.addEventListener('notifications-archivees', onArchivees)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('notifications-archivees', onArchivees)
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !(estAdmin || estAdminEmail)) { setNbActionsAdmin(0); return }
    Promise.all([
      supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false'),
      supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
      supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true),
      supabase.from('essais').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'a_reviser']),
    ]).then(resultats => setNbActionsAdmin(resultats.reduce((total, r) => total + (r.count ?? 0), 0)))
  }, [user?.id, estAdmin, estAdminEmail]);

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    setMenuOuvert(false);
    router.push("/accueil");
  };

  const styleLien = (href: string, exact: boolean | undefined, primaire: boolean) => {
    const chemin = href.split("?")[0] || "/";
    const actif = exact ? pathname === chemin : pathname.startsWith(chemin);
    return {
      display: "inline-block", padding: "4px 11px", borderRadius: "5px",
      fontSize: "13px", letterSpacing: "0.01em", textDecoration: "none",
      fontWeight: primaire ? 600 : 400,
      color: actif ? "#fff" : primaire ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.60)",
      background: actif ? "rgba(255,255,255,0.14)" : "transparent",
      transition: "color 0.13s, background 0.13s",
    } as const;
  };

  const styleLienDiscret = (href: string) => ({
    ...styleLien(href, undefined, false),
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 9px",
    fontSize: "12.5px",
  } as const);

  // ── Bloc recherche rapide, réutilisé en version desktop et mobile ────────────
  const blocRecherche = (mobile: boolean) => (
    <div style={{ position: "relative", width: mobile ? "100%" : undefined }}>
      <style>{`.recherche-rapide-input::placeholder { color: rgba(255,255,255,0.45); }`}</style>
      <input
        type="text"
        value={requeteRapide}
        onChange={e => setRequeteRapide(e.target.value)}
        onFocus={() => setRechercheOuverte(true)}
        onKeyDown={e => { if (e.key === 'Enter') validerRechercheRapide() }}
        placeholder="Rechercher…"
        className="recherche-rapide-input"
        style={{ width: mobile ? "100%" : "150px", fontSize: "12px", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", color: "#fff", outline: "none", boxSizing: "border-box" }}
      />
      {rechercheOuverte && qNorm && (
        <div style={{ position: mobile ? "static" : "absolute", marginTop: mobile ? "8px" : 0, top: "calc(100% + 8px)", left: 0, width: mobile ? "100%" : "300px", background: "#fff", border: "1px solid #d6d0c4", borderRadius: "9px", boxShadow: mobile ? "none" : "0 12px 36px rgba(0,0,0,0.16)", zIndex: 100, overflow: "hidden", maxHeight: "440px", overflowY: "auto" }}>
          {aucunResultat ? (
            <p style={{ fontSize: "12px", color: "#9a958d", fontStyle: "italic", textAlign: "center", padding: "18px 12px", margin: 0 }}>Aucun résultat — Entrée pour une recherche complète.</p>
          ) : (
            <>
              {auteursTrouves.length > 0 && (
                <div style={{ padding: "10px 0 6px" }}>
                  <p style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.10em", color: "#9a958d", textTransform: "uppercase", margin: "0 14px 4px" }}>Auteurs</p>
                  {auteursTrouves.map(a => (
                    <Link key={a.id_auteur} href={`/bibliotheque?q=${encodeURIComponent(a.nom)}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "7px 14px", fontSize: "13px", color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(61,107,79,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {a.nom}
                    </Link>
                  ))}
                </div>
              )}
              {essaisTrouves.length > 0 && (
                <div style={{ padding: "8px 0 6px", borderTop: auteursTrouves.length > 0 ? "1px solid #ede9e2" : "none" }}>
                  <p style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.10em", color: "#9a958d", textTransform: "uppercase", margin: "4px 14px 4px" }}>Essais et méditations</p>
                  {essaisTrouves.map(e => (
                    <Link key={e.id} href={`/essais/${e.id}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "7px 14px", fontSize: "13px", color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(61,107,79,0.06)")}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                      {e.titre}
                    </Link>
                  ))}
                </div>
              )}
              {livresTrouves.length > 0 && (
                <div style={{ padding: "8px 0 6px", borderTop: auteursTrouves.length > 0 ? "1px solid #ede9e2" : "none" }}>
                  <p style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.10em", color: "#9a958d", textTransform: "uppercase", margin: "4px 14px 4px" }}>Livres bibliques</p>
                  {livresTrouves.map(l => (
                    <Link key={l.code} href={`/?livre=${l.code}&chapitre=1`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "7px 14px", fontSize: "13px", color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(61,107,79,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {l.nom}
                    </Link>
                  ))}
                </div>
              )}
              {traductionsTrouvees.length > 0 && (
                <div style={{ padding: "8px 0 10px", borderTop: (auteursTrouves.length > 0 || livresTrouves.length > 0) ? "1px solid #ede9e2" : "none" }}>
                  <p style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.10em", color: "#9a958d", textTransform: "uppercase", margin: "4px 14px 4px" }}>Traductions</p>
                  {traductionsTrouvees.map(t => (
                    <Link key={t.code} href={`/traductions#${t.code}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "7px 14px", fontSize: "13px", color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(61,107,79,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {t.nom}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {rechercheOuverte && !mobile && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setRechercheOuverte(false)} />}
    </div>
  );

  // ── Interrupteur admin / utilisateur standard — visible directement dans la barre ─
  const toggleAdmin = (mobile: boolean) => (estAdmin || estAdminEmail) && (
    <div style={mobile
      ? { display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", fontSize: "13px", color: "rgba(255,255,255,0.85)" }
      : { display: "flex", alignItems: "center", gap: "7px", fontSize: "11.5px", color: "rgba(255,255,255,0.75)" }}>
      <button type="button" role="switch" aria-checked={modeUtilisateurStandard}
        onClick={() => setModeUtilisateurStandard(!modeUtilisateurStandard)}
        title="Affichage seulement — vos droits réels ne changent pas"
        style={{
          width: "30px", height: "17px", borderRadius: "999px", border: modeUtilisateurStandard ? "1px solid #7fb08e" : "1px solid rgba(255,255,255,0.72)", cursor: "pointer", padding: 0, flexShrink: 0,
          background: modeUtilisateurStandard ? "#3d6b4f" : "#f7f4ef",
          boxShadow: modeUtilisateurStandard ? "0 0 0 1px rgba(61,107,79,0.35)" : "0 0 0 1px rgba(0,0,0,0.18)",
          position: "relative", transition: "background 0.15s, border-color 0.15s",
        }}>
        <span style={{ position: "absolute", top: "2px", left: modeUtilisateurStandard ? "14px" : "2px", width: "11px", height: "11px", borderRadius: "50%", background: modeUtilisateurStandard ? "#fff" : "#3d6b4f", transition: "left 0.15s, background 0.15s" }} />
      </button>
      <span>Mode admin</span>
    </div>
  );

  // ── Bloc compte, réutilisé en version desktop et mobile ──────────────────────
  const blocCompte = (mobile: boolean) => user ? (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", gap: mobile ? "2px" : "6px", width: mobile ? "100%" : undefined }}>
      {!mobile && (
        <button onClick={() => setMenuOuvert(!menuOuvert)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "6px", padding: "4px 10px 4px 8px", cursor: "pointer", color: "rgba(255,255,255,0.92)", fontSize: "12.5px" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 13c0-3 2.5-4.5 5.5-4.5S12.5 10 12.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
          <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pseudo ?? user.email.split("@")[0]}</span>
          <span style={{ fontSize: "9px", opacity: 0.6 }}>▼</span>
        </button>
      )}
      <div style={mobile ? { display: "flex", flexDirection: "column", gap: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "8px", overflow: "hidden" } : { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #d6d0c4", borderRadius: "8px", boxShadow: "0 6px 24px rgba(0,0,0,0.10)", minWidth: "190px", zIndex: 3100, overflow: "hidden", display: menuOuvert ? "block" : "none" }}>
        {!mobile && (
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #ede9e2" }}>
            <p style={{ fontSize: "10.5px", color: "#9a958d", margin: 0 }}>Connecté en tant que</p>
            <p style={{ fontSize: "11.5px", color: "#2a3d30", fontWeight: 500, margin: "2px 0 0", wordBreak: "break-all" }}>{pseudo ?? user.email}</p>
          </div>
        )}
        {[
          { href: "/compte", label: "Mon compte", badge: 0 },
          { href: "/notifications", label: "Notifications", badge: nbNotifications },
          ...(estAdminAffiche ? [{ href: "/admin", label: "Administration", badge: 0 }] : []),
        ].map(item => (
          <Link key={item.href} href={item.href} onClick={() => { setMenuOuvert(false); setMobileOuvert(false) }}
            style={mobile
              ? { display: "block", padding: "10px 12px", fontSize: "13px", color: "rgba(255,255,255,0.85)", textDecoration: "none" }
              : { display: "block", padding: "10px 14px", fontSize: "12.5px", color: "#2a3d30", textDecoration: "none", borderBottom: "1px solid #ede9e2" }}>
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ marginLeft: '8px', fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 700 }}>{item.badge}</span>
            )}
          </Link>
        ))}
        <button onClick={seDeconnecter}
          style={mobile
            ? { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", fontSize: "13px", color: "#e8a0a0", background: "none", border: "none", cursor: "pointer" }
            : { width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12.5px", color: "#9a2a2a", background: "none", border: "none", cursor: "pointer" }}>
          Se déconnecter
        </button>
      </div>
      {!mobile && menuOuvert && <div style={{ position: "fixed", inset: 0, zIndex: 3090 }} onClick={() => setMenuOuvert(false)} />}
    </div>
  ) : (
    <Link href="/compte" onClick={() => setMobileOuvert(false)} style={mobile
      ? { display: "block", textAlign: "center", padding: "9px 12px", borderRadius: "6px", fontSize: "13px", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }
      : { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 11px", borderRadius: "5px", fontSize: "12.5px", color: "rgba(255,255,255,0.75)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.20)" }}>
      Se connecter
    </Link>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 border-b"
        style={{ background: "#3d6b4f", borderColor: "rgba(255,255,255,0.10)", zIndex: 3000 }}>
        <div className="max-w-screen-xl mx-auto w-full px-6 flex items-center gap-6" style={{ height: "48px" }}>

          <Link href="/accueil" className="flex items-center gap-2 shrink-0"
            style={{ color: "rgba(255,255,255,0.93)", textDecoration: "none" }}>
            <span style={{ fontSize: "11px", opacity: 0.6 }}>✦</span>
            <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "0.02em" }}>Corpus Scriptura</span>
            <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.30)", borderRadius: "3px", padding: "1px 5px", textTransform: "uppercase" }}>bêta</span>
          </Link>

          {/* ── Navigation desktop ──────────────────────────────────────────── */}
          <nav className="hidden md:flex flex-1 items-center gap-1">
            {LIENS_PRIMAIRES.map(({ href, label, exact }) => (
              <Link key={href} href={href} style={styleLien(href, exact, true)}>{label}</Link>
            ))}
            <span style={{ width: "1px", height: "18px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.24), transparent)", margin: "0 5px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "1px", flexShrink: 0 }}>
              {LIENS_SECONDAIRES.map(({ href, label }) => (
                <Link key={href} href={href} style={styleLienDiscret(href)}>{label}</Link>
              ))}
              {user && (
                <Link href="/prelevements" style={styleLienDiscret("/prelevements")}>Mes citations</Link>
              )}
              <Link href="/soutenir" style={styleLienDiscret("/soutenir")}>
                <IconCoeur /> Soutenir le projet
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "8px", paddingLeft: "12px", borderLeft: "1px solid rgba(255,255,255,0.30)", boxShadow: "inset 1px 0 0 rgba(0,0,0,0.08)" }}>
              {blocRecherche(false)}
            </div>
          </nav>

          {/* ── Compte desktop ──────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-2" style={{ marginLeft: "auto", flexShrink: 0 }}>
            {toggleAdmin(false)}
            <div style={{ position: "relative" }}>
              {blocCompte(false)}
            </div>
          </div>

          {/* ── Bouton hamburger mobile ─────────────────────────────────────── */}
          <button onClick={() => setMobileOuvert(!mobileOuvert)} className="md:hidden"
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", padding: "6px", cursor: "pointer" }}
            aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {mobileOuvert ? (
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              ) : (
                <><line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>
              )}
            </svg>
          </button>
        </div>

        {/* ── Panneau mobile déplié ───────────────────────────────────────────── */}
        {mobileOuvert && (
          <div className="md:hidden" style={{ background: "#345c43", borderTop: "1px solid rgba(255,255,255,0.10)", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {[...LIENS_PRIMAIRES, ...LIENS_SECONDAIRES].map(({ href, label }) => {
                const chemin = href.split("?")[0] || "/";
                const actif = pathname === chemin || (chemin !== "/" && pathname.startsWith(chemin));
                return (
                  <Link key={href} href={href} onClick={() => setMobileOuvert(false)}
                    style={{ padding: "9px 10px", borderRadius: "6px", fontSize: "14px", color: "#fff", textDecoration: "none", background: actif ? "rgba(255,255,255,0.12)" : "transparent" }}>
                    {label}
                  </Link>
                );
              })}
            </div>
            {blocRecherche(true)}
            {user && (
              <Link href="/prelevements" onClick={() => setMobileOuvert(false)}
                style={{ padding: "9px 10px", borderRadius: "6px", fontSize: "14px", color: "#fff", textDecoration: "none", background: pathname.startsWith("/prelevements") ? "rgba(255,255,255,0.12)" : "transparent" }}>
                Mes citations
              </Link>
            )}
            <Link href="/soutenir" onClick={() => setMobileOuvert(false)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 10px", borderRadius: "6px", fontSize: "14px", color: "#fff", textDecoration: "none" }}>
              <IconCoeur /> Soutenir le projet
            </Link>
            {toggleAdmin(true)}
            {blocCompte(true)}
          </div>
        )}
        {toastNotification && (
          <Link href="/notifications" onClick={() => setToastNotification(null)}
            style={{ position: "fixed", top: "62px", right: "18px", width: "280px", background: "#fff", border: "1px solid #d6d0c4", borderLeft: "3px solid #3d6b4f", borderRadius: "8px", boxShadow: "0 12px 34px rgba(0,0,0,0.16)", padding: "11px 13px", zIndex: 4000, textDecoration: "none" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3d6b4f", margin: "0 0 4px" }}>Nouvelle notification</p>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#1e2e24", margin: "0 0 4px" }}>{toastNotification.titre}</p>
            <p style={{ fontSize: "11.5px", color: "#6b6560", lineHeight: 1.35, margin: 0 }}>{toastNotification.message}</p>
          </Link>
        )}
      </header>
    </>
  );
}
