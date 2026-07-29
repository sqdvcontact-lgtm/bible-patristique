"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin";
import { chargerNotificationsUtilisateur, cleArchivesNotifications, cleNotificationsConnues, lireSetLocalStorage } from "@/app/lib/notificationsClient";
import { LIVRES } from "@/app/lib/bible";
import { estOeuvrePubliee } from "@/app/lib/oeuvresPublication";
import ModaleMessagerie from "@/app/components/ModaleMessagerie";

// Bible et Polyglotte sont deux entrées dans le même texte : l'une le donne à lire,
// l'autre à comparer. Elles vont donc ensemble, accolées en un seul bloc, plutôt
// que dispersées de part et d'autre de la barre — et la Polyglotte cesse d'être un
// lien discret, puisqu'elle pèse autant que la lecture suivie.
const LIENS_LECTURE: { href: string; label: string; exact?: boolean }[] = [
  { href: "/?livre=GEN&chapitre=1", label: "Bible", exact: true },
  { href: "/polyglotte", label: "Polyglotte" },
];
const LIENS_PRIMAIRES: { href: string; label: string; exact?: boolean; discret?: boolean }[] = [
  { href: "/bibliotheque", label: "Patristique" },
  { href: "/essais", label: "Publications" },
  { href: "/traductions", label: "Aller plus loin", discret: true },
];
const LIENS_SECONDAIRES: { href: string; label: string }[] = [];

// Couleurs de domaine pour la recherche rapide : chaque catégorie de résultats est
// rattachée à un grand domaine par une couleur FORTE (filet gauche + libellé + fond
// léger) — Bible (bleu), Patristique (vert), Publications (ocre). Les sous-ensembles
// d'un même domaine partagent la couleur et se distinguent plus légèrement (libellé
// + fins séparateurs).
const DOMAINE = {
  bible:        { base: "#3a5a8c", fond: "rgba(58,90,140,0.12)",  survol: "rgba(58,90,140,0.22)" },
  patristique:  { base: "#3d6b4f", fond: "rgba(61,107,79,0.12)",  survol: "rgba(61,107,79,0.20)" },
  publications: { base: "#9a6a2e", fond: "rgba(154,106,46,0.13)", survol: "rgba(154,106,46,0.22)" },
} as const;

// ── Données statiques pour la recherche rapide ───────────────────────────────
const LIVRES_RECHERCHE = LIVRES.map(({ code, nom }) => ({ code, nom }));
const TRADUCTIONS_RECHERCHE: { code: string; nom: string }[] = [
  { code: 'TR0001', nom: 'Bible de Sacy' }, { code: 'TR0002', nom: 'Bible Segond' },
  { code: 'TR0003', nom: 'Bible Crampon' }, { code: 'TR0004', nom: 'Vulgate' },
];
function sansAccents(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }

function normaliserExtrait(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function surlignerMatch(texte: string, query: string): React.ReactNode {
  if (!query) return texte
  const tN = normaliserExtrait(texte)
  const qN = normaliserExtrait(query)
  const idx = tN.indexOf(qN)
  if (idx < 0) return texte
  return (
    <>
      {texte.slice(0, idx)}
      <strong style={{ color: '#1f5c33', fontWeight: 700, background: 'rgba(61,107,79,0.14)', borderRadius: '2px', padding: '0 1px' }}>{texte.slice(idx, idx + query.length)}</strong>
      {texte.slice(idx + query.length)}
    </>
  )
}

function extraireEtSurligner(texte: string, q: string, longueur = 110): React.ReactNode {
  const texteN = normaliserExtrait(texte)
  const qN = normaliserExtrait(q)
  const idx = texteN.indexOf(qN)
  const debut = idx < 0 ? 0 : Math.max(0, idx - 40)
  const fin = idx < 0 ? Math.min(texte.length, longueur) : Math.min(texte.length, idx + q.length + 70)
  const prefix = debut > 0
  const suffix = fin < texte.length
  const extrait = texte.slice(debut, fin)
  const extractN = normaliserExtrait(extrait)
  const mIdx = extractN.indexOf(qN)
  if (mIdx < 0) return <>{prefix ? '\u2026' : ''}{extrait}{suffix ? '\u2026' : ''}</>
  return (
    <>
      {prefix ? '\u2026' : ''}{extrait.slice(0, mIdx)}<strong style={{ color: '#1f5c33', fontWeight: 700, background: 'rgba(61,107,79,0.14)', borderRadius: '2px', padding: '0 1px' }}>{extrait.slice(mIdx, mIdx + q.length)}</strong>{extrait.slice(mIdx + q.length)}{suffix ? '\u2026' : ''}
    </>
  )
}


function IconCoeur() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

function IconParchemin() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '19px',
        height: '25px',
        background: 'currentColor',
        WebkitMask: 'url("/icons/parchemin-message-silhouette.png") center / contain no-repeat',
        mask: 'url("/icons/parchemin-message-silhouette.png") center / contain no-repeat',
      }}
    />
  )
}

function IconAngeTrompette() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '28px',
        height: '27px',
        background: 'currentColor',
        WebkitMask: 'url("/icons/ange-trompette-silhouette.png") center / contain no-repeat',
        mask: 'url("/icons/ange-trompette-silhouette.png") center / contain no-repeat',
      }}
    />
  )
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
  const [nbMessages, setNbMessages] = useState(0);
  const [messagerieOuverte, setMessagerieOuverte] = useState(false);
  const [nbActionsAdmin, setNbActionsAdmin] = useState(0);
  const [nbVerifAdmin, setNbVerifAdmin] = useState(0);
  const [toastNotification, setToastNotification] = useState<{ titre: string; message: string } | null>(null);
  const { modeUtilisateurStandard, setModeUtilisateurStandard } = useAffichageAdmin();
  const estAdminEmail = !!(user && user.email && user.email.trim().toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase());
  const estAdminAffiche = (estAdmin || estAdminEmail) && !modeUtilisateurStandard;

  // ── Recherche rapide (remplace l'ancien lien « Recherche ») ──────────────────
  const [requeteRapide, setRequeteRapide] = useState("");
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [auteursTrouves, setAuteursTrouves] = useState<{ id_auteur: string; nom: string }[]>([]);
  const [essaisTrouves, setEssaisTrouves] = useState<{ id: number; titre: string }[]>([]);
  const [oeuvresTrouvees, setOeuvresTrouvees] = useState<{ id_oeuvre: string; titre: string; auteurs: { nom: string } | null; note?: string | null }[]>([]);
  const [segmentsTrouves, setSegmentsTrouves] = useState<{ id: number; segment_texte: string; id_oeuvre: string; auteur_nom: string; oeuvre_titre: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [rechercheRapideLoading, setRechercheRapideLoading] = useState(false);
  const [nbResultatsProgressif, setNbResultatsProgressif] = useState(0);
  const [rechercheTerminee, setRechercheTerminee] = useState(false);
  const [nbTotalReel, setNbTotalReel] = useState(0);

  useEffect(() => {
    const q = requeteRapide.trim();
    if (!q) { setAuteursTrouves([]); setEssaisTrouves([]); setOeuvresTrouvees([]); setSegmentsTrouves([]); setRechercheRapideLoading(false); setNbResultatsProgressif(0); setNbTotalReel(0); setRechercheTerminee(false); return; }
    setRechercheRapideLoading(true);
    setNbResultatsProgressif(0);
    setNbTotalReel(0);
    setRechercheTerminee(false);
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;
      let pending = 4;
      const done = () => {
        if (--pending === 0 && !signal.aborted) {
          setRechercheRapideLoading(false);
          setRechercheTerminee(true);
        }
      };
      // Recherche par PRÉFIXE de MOT, non par sous-chaîne : « Am » trouve « amour » ou
      // « Ambroise » (mot commençant par am), jamais « Samuel » ni « Abraham » (am au
      // milieu). Un mot commence en tête de champ, après une espace, une apostrophe ou un
      // guillemet ouvrant. Les virgules casseraient le parseur `.or()` : on les ôte.
      const qOr = q.replace(/,/g, ' ').trim();
      const prefixeOr = (col: string) =>
        [`${col}.ilike.${qOr}%`, `${col}.ilike.% ${qOr}%`, `${col}.ilike.%'${qOr}%`, `${col}.ilike.%’${qOr}%`, `${col}.ilike.%«${qOr}%`].join(',');

      // Compte RÉEL par source (non plafonné) : c'est la somme affichée. Les aperçus
      // ci-dessous restent bornés, mais le total dit combien il y a vraiment.
      Promise.all([
        supabase.from('auteurs').select('*', { count: 'exact', head: true }).or(prefixeOr('nom')).abortSignal(signal),
        supabase.from('essais').select('*', { count: 'exact', head: true }).eq('statut', 'publie').or([...prefixeOr('titre').split(','), ...prefixeOr('resume').split(',')].join(',')).abortSignal(signal),
        supabase.from('oeuvres').select('*', { count: 'exact', head: true }).or(prefixeOr('titre')).abortSignal(signal),
        supabase.from('segments').select('*', { count: 'exact', head: true }).eq('nature', 'texte').or(prefixeOr('segment_texte')).abortSignal(signal),
      ]).then(res => {
        if (signal.aborted) return;
        const total = res.reduce((s, r) => s + (r.count ?? 0), 0);
        setNbTotalReel(total);
      }).catch(() => {});

      supabase.from('auteurs').select('id_auteur, nom').or(prefixeOr('nom')).limit(4).abortSignal(signal)
        .then(({ data }) => {
          if (!signal.aborted) { setAuteursTrouves(data ?? []); setNbResultatsProgressif(p => p + (data?.length ?? 0)); }
          done();
        });
      supabase.from('essais').select('id, titre').eq('statut', 'publie')
        .or([...prefixeOr('titre').split(','), ...prefixeOr('resume').split(',')].join(',')).limit(4).abortSignal(signal)
        .then(({ data }) => {
          if (!signal.aborted) { setEssaisTrouves(data ?? []); setNbResultatsProgressif(p => p + (data?.length ?? 0)); }
          done();
        });
      supabase.from('oeuvres').select('id_oeuvre, titre, note, auteurs(nom)').or(prefixeOr('titre')).limit(8).abortSignal(signal)
        .then(({ data }) => {
          if (signal.aborted) { done(); return; }
          const filtered = (data ?? []).filter(estOeuvrePubliee).map((o: any) => ({ ...o, auteurs: Array.isArray(o.auteurs) ? (o.auteurs[0] ?? null) : o.auteurs }));
          setOeuvresTrouvees(filtered);
          setNbResultatsProgressif(p => p + filtered.length);
          done();
        });
      supabase.from('segments').select('id, segment_texte, id_oeuvre')
        .or(prefixeOr('segment_texte')).eq('nature', 'texte').limit(5).abortSignal(signal)
        .then(async ({ data }) => {
          if (signal.aborted) { done(); return; }
          const segs = data ?? []
          if (!segs.length) { setSegmentsTrouves([]); done(); return }
          const oeuvreIds = [...new Set(segs.map((s: any) => s.id_oeuvre))]
          const { data: oeuvres } = await supabase.from('oeuvres').select('id_oeuvre, titre, note, auteurs(nom)').in('id_oeuvre', oeuvreIds).abortSignal(signal)
          if (signal.aborted) { done(); return; }
          const oMap: Record<string, { oeuvre_titre: string; auteur_nom: string }> = {}
          for (const o of ((oeuvres ?? []) as any[]).filter(estOeuvrePubliee)) {
            oMap[o.id_oeuvre] = {
              oeuvre_titre: o.titre ?? '',
              auteur_nom: (Array.isArray(o.auteurs) ? o.auteurs[0]?.nom : o.auteurs?.nom) ?? '',
            }
          }
          const filtered = segs.filter((s: any) => oMap[s.id_oeuvre]).map((s: any) => ({ id: s.id, segment_texte: s.segment_texte, id_oeuvre: s.id_oeuvre, ...(oMap[s.id_oeuvre] ?? { oeuvre_titre: '', auteur_nom: '' }) }));
          setSegmentsTrouves(filtered);
          setNbResultatsProgressif(p => p + filtered.length);
          done();
        });
    }, 250);
    return () => { clearTimeout(timer); abortRef.current?.abort(); setRechercheRapideLoading(false); };
  }, [requeteRapide]);

  const qNorm = sansAccents(requeteRapide.trim());
  // Préfixe de MOT (comme le reste de la recherche rapide) : « am » trouve « Amos »,
  // jamais « Samuel » (am au milieu). On teste le début de chaque mot du nom.
  const motCommencePar = (nom: string) => sansAccents(nom).split(/[\s'’-]+/).some(w => w.startsWith(qNorm));
  const livresTrouves = qNorm ? LIVRES_RECHERCHE.filter(l => motCommencePar(l.nom)).slice(0, 5) : [];
  const traductionsTrouvees = qNorm ? TRADUCTIONS_RECHERCHE.filter(t => motCommencePar(t.nom)) : [];
  const aucunResultat = !rechercheRapideLoading && qNorm.length > 0 && auteursTrouves.length === 0 && oeuvresTrouvees.length === 0 && segmentsTrouves.length === 0 && livresTrouves.length === 0 && traductionsTrouvees.length === 0 && essaisTrouves.length === 0;

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
      else { setPseudo(null); setEstAdmin(false); setNbNotifications(0); setNbMessages(0); setNbActionsAdmin(0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) { setNbNotifications(0); return }
    const cleArchives = cleArchivesNotifications(user.id)
    const cleConnues = cleNotificationsConnues(user.id)

    const chargerNotifications = async (avecToast: boolean) => {
      try {
        const toutes = await chargerNotificationsUtilisateur(user.id)
        const archives = lireSetLocalStorage(cleArchives)
        const connues = lireSetLocalStorage(cleConnues)
        const actives = toutes.filter(n => !archives.has(n.key))
        const nouvelles = actives.filter(n => !connues.has(n.key))
        setNbNotifications(actives.length)
        if (avecToast && nouvelles.length > 0 && connues.size > 0) {
          const n = nouvelles[0]
          setToastNotification({ titre: n.titre, message: String(n.message || n.objet).slice(0, 120) })
          window.setTimeout(() => setToastNotification(null), 5200)
        }
        localStorage.setItem(cleConnues, JSON.stringify(toutes.map(n => n.key)))
      } catch {
        // fail silencieux : les notifications sont non-critiques
      }
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
    if (!user?.id) { setNbMessages(0); return }
    const chargerMessages = async () => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      try {
        const res = await fetch('/api/messagerie/nb-non-lus', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) { const d = await res.json(); setNbMessages(d.nb ?? 0) }
      } catch { /* non-critique */ }
    }
    chargerMessages()
    const interval = window.setInterval(chargerMessages, 60000)
    return () => window.clearInterval(interval)
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !(estAdmin || estAdminEmail)) { setNbActionsAdmin(0); return }
    const charger = async () => {
      const [r0, r1, r2, r3, r4] = await Promise.all([
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false'),
        supabase.from('signalements').select('id', { count: 'exact', head: true }).eq('traite', false),
        supabase.from('commentaires').select('id', { count: 'exact', head: true }).eq('demande_validation', true),
        supabase.from('essais').select('id', { count: 'exact', head: true }).in('statut', ['en_attente', 'a_reviser']),
        supabase.rpc('count_verifications_pending'),
      ])
      const moderation = (r0.count ?? 0) + (r1.count ?? 0) + (r2.count ?? 0) + (r3.count ?? 0)
      const verif = (r4.data as number | null) ?? 0
      setNbActionsAdmin(moderation)
      setNbVerifAdmin(verif)
    }
    charger()
    const interval = window.setInterval(charger, 60000)
    const onVisible = () => { if (!document.hidden) charger() }
    const onVerif = (e: Event) => setNbVerifAdmin((e as CustomEvent<number>).detail)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('admin-verif-count', onVerif)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('admin-verif-count', onVerif) }
  }, [user?.id, estAdmin, estAdminEmail]);

  const seDeconnecter = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Continuer même si signOut échoue côté réseau : le token est invalidé localement
    }
    setMenuOuvert(false)
    router.push("/accueil")
  };

  const styleLien = (href: string, exact: boolean | undefined, primaire: boolean) => {
    const chemin = href.split("?")[0] || "/";
    const actif = exact ? pathname === chemin : pathname.startsWith(chemin);
    // Le fond ne s'écrit PAS en ligne : un style en ligne l'emporte sur toute règle
    // de feuille, et `.cs-onglet:hover` n'aurait donc jamais pu s'appliquer. Il passe
    // par deux variables que la classe lit — l'une pour l'état, l'autre pour le survol.
    return {
      display: "inline-block", padding: "0.25rem 0.5rem", borderRadius: "5px",
      fontSize: "0.875rem", letterSpacing: "0.01em", textDecoration: "none", whiteSpace: "nowrap",
      fontWeight: primaire ? 600 : 400,
      color: actif ? "#fff" : primaire ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.60)",
      "--fond": actif ? "rgba(255,255,255,0.14)" : "transparent",
      "--fond-survol": actif ? "rgba(255,255,255,0.19)" : "rgba(255,255,255,0.085)",
    } as React.CSSProperties;
  };

  const styleLienDiscret = (href: string) => ({
    ...styleLien(href, undefined, false),
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 7px",
    fontSize: "0.84rem",
  } as const);

  // ── Bloc recherche rapide, réutilisé en version desktop et mobile ────────────
  const nbLocalStatique = livresTrouves.length + traductionsTrouvees.length;
  // Le total AFFICHÉ est le compte réel des sources en base (non plafonné) + les
  // résultats locaux. Tant que le compte réel n'est pas revenu, on retombe sur la somme
  // des aperçus, pour ne jamais afficher un nombre INFÉRIEUR à ce qu'on montre déjà.
  const nbTotalResultats = Math.max(nbTotalReel, nbResultatsProgressif) + nbLocalStatique;

  const blocRecherche = (mobile: boolean) => (
    <div style={{ position: "relative", width: mobile ? "100%" : undefined }}>
      <style>{`
        .recherche-rapide-input::placeholder { color: rgba(255,255,255,0.45); }
        @keyframes spin-search { to { transform: rotate(360deg); } }
        .spinner-search { animation: spin-search 0.8s linear infinite; }
      `}</style>
      {/* Champ + bouton page de recherche */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input
          type="text"
          value={requeteRapide}
          onChange={e => setRequeteRapide(e.target.value)}
          onFocus={() => setRechercheOuverte(true)}
          onKeyDown={e => { if (e.key === 'Enter') validerRechercheRapide() }}
          placeholder="Rechercher…"
          className="recherche-rapide-input"
          style={{ width: mobile ? "100%" : "128px", fontSize: "0.84rem", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", color: "#fff", outline: "none", boxSizing: "border-box", flex: mobile ? 1 : undefined }}
        />
        {/* Bouton « Nouvelle recherche » : conduit à la page de recherche VIERGE (pas de
            ?q), pour repartir de zéro. Si l'on y est DÉJÀ (l'URL peut être « /recherche »
            sans ?q, la navigation client ne rejouerait alors rien), on force un rechargement
            propre pour vider les résultats précédents. Libellé court pour tenir dans la barre. */}
        <Link href="/recherche" title="Ouvrir une recherche vierge"
          onClick={e => {
            fermerRechercheRapide();
            if (pathname.startsWith("/recherche")) { e.preventDefault(); window.location.assign("/recherche"); }
          }}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px", height: "29px", padding: "0 9px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.82)", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap", fontSize: "0.77rem", fontWeight: 500, letterSpacing: "0.01em", transition: "background 0.13s, color 0.13s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.20)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.82)"; }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Recherche
        </Link>
      </div>

      {rechercheOuverte && qNorm && (
        <div style={{ position: mobile ? "static" : "absolute", marginTop: mobile ? "8px" : 0, top: "calc(100% + 8px)", left: 0, width: mobile ? "100%" : "300px", background: "#fff", border: "1px solid #d6d0c4", borderRadius: "9px", boxShadow: mobile ? "none" : "0 12px 36px rgba(0,0,0,0.16)", zIndex: 100, overflow: "hidden", maxHeight: mobile ? "70vh" : "min(72vh, 640px)", overflowY: "auto" }}>

          {/* Barre de statut : nb résultats + spinner/smiley */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px 5px", borderBottom: "1px solid #ede9e2", background: "#faf8f5" }}>
            <span style={{ fontSize: "0.77rem", color: "#6b6560", fontWeight: 500 }}>
              {rechercheRapideLoading && nbTotalResultats === 0
                ? "Recherche…"
                : nbTotalResultats === 0 && rechercheTerminee
                  ? "Aucun résultat"
                  : <>{nbTotalResultats} <span style={{ color: "#9a958d", fontWeight: 400 }}>résultat{nbTotalResultats > 1 ? 's' : ''}</span></>}
            </span>
            {rechercheRapideLoading ? (
              <svg className="spinner-search" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Chargement">
                <circle cx="7" cy="7" r="5.5" stroke="#d6d0c4" strokeWidth="1.6" fill="none"/>
                <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#3d6b4f" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
              </svg>
            ) : rechercheTerminee ? (
              /* Smiley au trait, épuré comme les autres symboles du site. Son cercle
                 extérieur reprend EXACTEMENT celui du spinner (r 5.5, centre 7,7, même
                 trait) : quand le chargement s'achève, l'anneau devient visage sans que
                 le contour bouge. */
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" aria-label="Recherche terminée">
                <circle cx="7" cy="7" r="5.5" stroke="#3d6b4f" strokeWidth="1.6" fill="none"/>
                <circle cx="5" cy="5.8" r="0.65" fill="#3d6b4f"/>
                <circle cx="9" cy="5.8" r="0.65" fill="#3d6b4f"/>
                <path d="M4.6 8.6a2.6 2.6 0 0 0 4.8 0" stroke="#3d6b4f" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
              </svg>
            ) : null}
          </div>

          {rechercheRapideLoading && auteursTrouves.length === 0 && oeuvresTrouvees.length === 0 && segmentsTrouves.length === 0 && essaisTrouves.length === 0 && livresTrouves.length === 0 && traductionsTrouvees.length === 0 ? (
            <p style={{ fontSize: "0.84rem", color: "#c0b8ae", textAlign: "center", padding: "14px 12px", margin: 0 }}>…</p>
          ) : aucunResultat ? (
            <p style={{ fontSize: "0.84rem", color: "#9a958d", fontStyle: "italic", textAlign: "center", padding: "14px 12px", margin: 0 }}>Aucun résultat — Entrée pour une recherche complète.</p>
          ) : (
            <>
              {auteursTrouves.length > 0 && (
                <div style={{ padding: "8px 0 4px", borderLeft: `3px solid ${DOMAINE.patristique.base}`, background: DOMAINE.patristique.fond }}>
                  <p style={{ fontSize: "0.665rem", fontWeight: 700, letterSpacing: "0.10em", color: DOMAINE.patristique.base, textTransform: "uppercase", margin: "0 14px 3px" }}>Auteurs</p>
                  {auteursTrouves.map(a => (
                    <Link key={a.id_auteur} href={`/auteur/${a.id_auteur}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "5px 14px", fontSize: "0.91rem", lineHeight: 1.3, color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.patristique.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(a.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {oeuvresTrouvees.length > 0 && (
                <div style={{ padding: "6px 0 4px", borderLeft: `3px solid ${DOMAINE.patristique.base}`, background: DOMAINE.patristique.fond, borderTop: auteursTrouves.length > 0 ? "1px solid rgba(61,107,79,0.14)" : "none" }}>
                  <p style={{ fontSize: "0.665rem", fontWeight: 700, letterSpacing: "0.10em", color: DOMAINE.patristique.base, textTransform: "uppercase", margin: "3px 14px 3px" }}>Œuvres patristiques</p>
                  {oeuvresTrouvees.map(o => (
                    <Link key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "5px 14px", fontSize: "0.91rem", lineHeight: 1.3, color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.patristique.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(o.titre, requeteRapide.trim())}
                      {o.auteurs?.nom && <span style={{ fontSize: "0.77rem", color: "#9a958d", marginLeft: "7px" }}>{o.auteurs.nom}</span>}
                    </Link>
                  ))}
                </div>
              )}
              {segmentsTrouves.length > 0 && (
                <div style={{ padding: "6px 0 4px", borderLeft: `3px solid ${DOMAINE.patristique.base}`, background: DOMAINE.patristique.fond, borderTop: (auteursTrouves.length > 0 || oeuvresTrouvees.length > 0) ? "1px solid rgba(61,107,79,0.14)" : "none" }}>
                  <p style={{ fontSize: "0.665rem", fontWeight: 700, letterSpacing: "0.10em", color: DOMAINE.patristique.base, textTransform: "uppercase", margin: "3px 14px 3px" }}>Extraits patristiques</p>
                  {segmentsTrouves.map(s => (
                    <Link key={s.id} href={`/oeuvre/${s.id_oeuvre}?segment=${s.id}#segment-${s.id}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "5px 14px", fontSize: "0.84rem", color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.patristique.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {/* Justifié et borné à TROIS lignes, texte condensé pour épouser la
                          largeur du menu sans creuser de blancs ni déborder. */}
                      <span style={{ fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.32, color: "#3a3530", textAlign: "justify", wordSpacing: "-0.05em", letterSpacing: "-0.012em", hyphens: "auto" }}>{extraireEtSurligner(s.segment_texte, requeteRapide.trim())}</span>
                      <span style={{ fontSize: "0.735rem", color: "#9a958d", marginTop: "2px", display: "block" }}>{s.auteur_nom}{s.auteur_nom && s.oeuvre_titre ? ' · ' : ''}{s.oeuvre_titre}</span>
                    </Link>
                  ))}
                </div>
              )}
              {essaisTrouves.length > 0 && (
                <div style={{ padding: "6px 0 4px", borderLeft: `3px solid ${DOMAINE.publications.base}`, background: DOMAINE.publications.fond, borderTop: (auteursTrouves.length > 0 || oeuvresTrouvees.length > 0 || segmentsTrouves.length > 0) ? "1px solid rgba(154,106,46,0.16)" : "none" }}>
                  <p style={{ fontSize: "0.665rem", fontWeight: 700, letterSpacing: "0.10em", color: DOMAINE.publications.base, textTransform: "uppercase", margin: "3px 14px 3px" }}>Essais et méditations</p>
                  {essaisTrouves.map(e => (
                    <Link key={e.id} href={`/essais/${e.id}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "5px 14px", fontSize: "0.91rem", lineHeight: 1.3, color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = DOMAINE.publications.survol)}
                      onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(e.titre, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {livresTrouves.length > 0 && (
                <div style={{ padding: "6px 0 4px", borderLeft: `3px solid ${DOMAINE.bible.base}`, background: DOMAINE.bible.fond, borderTop: (auteursTrouves.length > 0 || oeuvresTrouvees.length > 0 || segmentsTrouves.length > 0 || essaisTrouves.length > 0) ? "1px solid rgba(58,90,140,0.16)" : "none" }}>
                  <p style={{ fontSize: "0.665rem", fontWeight: 700, letterSpacing: "0.10em", color: DOMAINE.bible.base, textTransform: "uppercase", margin: "3px 14px 3px" }}>Livres bibliques</p>
                  {livresTrouves.map(l => (
                    <Link key={l.code} href={`/?livre=${l.code}&chapitre=1`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "5px 14px", fontSize: "0.91rem", lineHeight: 1.3, color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.bible.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(l.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {traductionsTrouvees.length > 0 && (
                <div style={{ padding: "6px 0 8px", borderLeft: `3px solid ${DOMAINE.bible.base}`, background: DOMAINE.bible.fond, borderTop: (auteursTrouves.length > 0 || livresTrouves.length > 0) ? "1px solid rgba(58,90,140,0.16)" : "none" }}>
                  <p style={{ fontSize: "0.665rem", fontWeight: 700, letterSpacing: "0.10em", color: DOMAINE.bible.base, textTransform: "uppercase", margin: "3px 14px 3px" }}>Traductions</p>
                  {traductionsTrouvees.map(t => (
                    <Link key={t.code} href={`/traductions#${t.code}`} onClick={fermerRechercheRapide}
                      style={{ display: "block", padding: "5px 14px", fontSize: "0.91rem", lineHeight: 1.3, color: "#2a3d30", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = DOMAINE.bible.survol)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      {surlignerMatch(t.nom, requeteRapide.trim())}
                    </Link>
                  ))}
                </div>
              )}
              {(auteursTrouves.length >= 4 || oeuvresTrouvees.length >= 8 || segmentsTrouves.length >= 5 || essaisTrouves.length >= 4) && (
                <div style={{ borderTop: "1px solid #ede9e2", padding: "5px 0" }}>
                  <Link href={`/recherche?q=${encodeURIComponent(requeteRapide.trim())}&mode=prefixe`} onClick={fermerRechercheRapide}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "7px 14px", fontSize: "0.84rem", color: "#3d6b4f", fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(61,107,79,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    Tout voir
                    <span style={{ fontSize: "0.98rem", lineHeight: 1 }}>→</span>
                  </Link>
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
      ? { display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", fontSize: "0.91rem", color: "rgba(255,255,255,0.85)" }
      : { display: "inline-flex", alignItems: "center", gap: "0.3125rem", height: "1.75rem", padding: "0 0.375rem 0 0.125rem", fontSize: "0.77rem", color: "rgba(255,255,255,0.74)", letterSpacing: "0.01em" }}>
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
      <span>Admin</span>
    </div>
  );

  // ── Bloc compte, réutilisé en version desktop et mobile ──────────────────────
  const blocCompte = (mobile: boolean) => user ? (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "center", gap: mobile ? "2px" : "6px", width: mobile ? "100%" : undefined }}>
      {!mobile && (
        <button onClick={() => setMenuOuvert(!menuOuvert)} style={{ display: "flex", alignItems: "center", gap: "0.3125rem", height: "1.875rem", background: "rgba(255,255,255,0.11)", border: "1px solid rgba(255,255,255,0.17)", borderRadius: "6px", padding: "0 0.5rem 0 0.4375rem", cursor: "pointer", color: "rgba(255,255,255,0.92)", fontSize: "0.84rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 13c0-3 2.5-4.5 5.5-4.5S12.5 10 12.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
          <span style={{ maxWidth: "6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pseudo ?? user.email.split("@")[0]}</span>
          <span style={{ fontSize: "0.63rem", opacity: 0.6 }}>▼</span>
        </button>
      )}
      <div style={mobile ? { display: "flex", flexDirection: "column", gap: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "8px", overflow: "hidden" } : { position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #d6d0c4", borderRadius: "8px", boxShadow: "0 6px 24px rgba(0,0,0,0.10)", minWidth: "190px", zIndex: 3100, overflow: "hidden", display: menuOuvert ? "block" : "none" }}>
        {!mobile && (
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #ede9e2" }}>
            <p style={{ fontSize: "0.735rem", color: "#9a958d", margin: 0 }}>Connecté en tant que</p>
            <p style={{ fontSize: "0.805rem", color: "#2a3d30", fontWeight: 500, margin: "2px 0 0", wordBreak: "break-all" }}>{pseudo ?? user.email}</p>
          </div>
        )}
        {[
          { href: "/compte", label: "Mon compte", badge: 0, icone: null },
          ...(pseudo ? [{ href: `/profil/${encodeURIComponent(pseudo)}`, label: "Ma page", badge: 0, icone: null }] : []),
          { href: "/prelevements", label: "Mes citations", badge: 0, icone: null },
          { href: "/progression", label: "Ma progression", badge: 0, icone: null },
          ...(estAdminAffiche ? [{ href: "/admin", label: "Administration", badge: nbActionsAdmin + nbVerifAdmin, icone: "epee" }] : []),
        ].map(item => (
          <Link key={item.href} href={item.href} onClick={() => { setMenuOuvert(false); setMobileOuvert(false) }}
            style={mobile
              ? { display: "flex", alignItems: "center", gap: "7px", padding: "10px 12px", fontSize: "0.91rem", color: "rgba(255,255,255,0.85)", textDecoration: "none" }
              : { display: "flex", alignItems: "center", gap: "7px", padding: "10px 14px", fontSize: "0.875rem", color: "#2a3d30", textDecoration: "none", borderBottom: "1px solid #ede9e2" }}>
            {/* Administration : plus d'icône ; libellé simplement mis en vert (menu desktop). */}
            <span style={item.icone === "epee" && !mobile ? { color: "#3d6b4f", fontWeight: 600 } : undefined}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '0.7rem', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 700 }}>{item.badge}</span>
            )}
          </Link>
        ))}
        <button onClick={seDeconnecter}
          style={mobile
            ? { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", fontSize: "0.91rem", color: "#e8a0a0", background: "none", border: "none", cursor: "pointer" }
            : { width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "0.875rem", color: "#9a2a2a", background: "none", border: "none", cursor: "pointer" }}>
          Se déconnecter
        </button>
      </div>
      {!mobile && menuOuvert && <div style={{ position: "fixed", inset: 0, zIndex: 3090 }} onClick={() => setMenuOuvert(false)} />}
    </div>
  ) : (
    <Link href="/chantier" onClick={() => setMobileOuvert(false)} style={mobile
      ? { display: "block", textAlign: "center", padding: "9px 12px", borderRadius: "6px", fontSize: "0.91rem", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }
      : { display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.6875rem", borderRadius: "5px", fontSize: "0.875rem", color: "rgba(255,255,255,0.75)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.20)" }}>
      Se connecter
    </Link>
  );

  return (
    <>
      {/* `data-cs-navbar` sert de prise à la page d'ouverture, qui se passe de
          barre de navigation : rien à naviguer tant que le site est fermé. */}
      <header data-cs-navbar className="fixed top-0 left-0 right-0 border-b"
        style={{ background: "#3d6b4f", borderColor: "rgba(255,255,255,0.10)", zIndex: 3000 }}>
        <style>{`
          /* Onglets de la barre. Le fond vient des variables posées en ligne par
             styleLien : la classe peut ainsi le reprendre au survol, ce qu'un fond
             écrit en ligne aurait rendu impossible.
             La montée est un peu plus lente que la descente — l'éclaircissement se
             pose doucement sous le curseur, mais la barre s'éteint sans traîner
             quand on la quitte. */
          .cs-onglet {
            background: var(--fond, transparent);
            transition: background 260ms cubic-bezier(.33,.68,.36,1),
                        color 200ms cubic-bezier(.33,.68,.36,1);
          }
          .cs-onglet:hover {
            background: var(--fond-survol, rgba(255,255,255,0.085));
            color: #fff;
            transition-duration: 140ms;
          }
          /* Onglet « Bible » : au repos, un onglet plat comme les autres liens de la barre
             — ni cadre ni fond qui le détachent, et sa largeur épouse son texte, sans
             boîte fixe qui creuse un écart. C'est la face, en flux normal, qui dimensionne
             le bloc ; au survol elle s'efface et laisse paraître SUR PLACE, à la même
             largeur, « Classique » et « Polyglotte » — la barre ne bouge pas. */
          /* overflow:hidden — les surbrillances internes (survol des segments, segment
             actif) sont rognées par le rayon du conteneur : plus de coins carrés qui débordent
             sur les angles arrondis. */
          .cs-bible { position: relative; display: inline-flex; border-radius: 5px; overflow: hidden; transition: background 220ms ease-in-out; }
          .cs-bible:hover, .cs-bible:focus-within { background: rgba(255,255,255,0.085); }
          .cs-bible-face { display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; color: rgba(255,255,255,0.85); font-weight: 600; font-size: 0.78125rem; letter-spacing: 0.01em; text-decoration: none; white-space: nowrap; transition: opacity 220ms ease-in-out; }
          .cs-bible:hover .cs-bible-face, .cs-bible:focus-within .cs-bible-face { opacity: 0; pointer-events: none; }
          .cs-bible-split { position: absolute; inset: 0; display: flex; opacity: 0; pointer-events: none; transition: opacity 220ms ease-in-out; }
          .cs-bible:hover .cs-bible-split, .cs-bible:focus-within .cs-bible-split { opacity: 1; pointer-events: auto; }
          .cs-bible-seg { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 0.375rem; color: rgba(255,255,255,0.82); font-size: 0.75rem; font-weight: 500; text-decoration: none; white-space: nowrap; transition: background 160ms ease, color 160ms ease; }
          .cs-bible-seg:hover { background: rgba(255,255,255,0.13); color: #fff; }
          .cs-bible-seg + .cs-bible-seg { box-shadow: inset 1px 0 0 rgba(255,255,255,0.16); }
          .cs-bible-seg--actif { color: #fff; background: rgba(255,255,255,0.10); }
          @media (prefers-reduced-motion: reduce) {
            .cs-onglet, .cs-bible, .cs-bible-face, .cs-bible-split { transition: none; }
          }
        `}</style>
        {/* Plus de `max-w-screen-xl mx-auto` : la barre bridait sa largeur à 1 280 px et
            se centrait, si bien qu'au-delà elle se serrait — et débordait — alors que
            l'écran offrait la place de part et d'autre. Elle prend maintenant toute la
            largeur, ce qui ramène du même coup le titre contre le bord gauche. */}
        <div className="w-full px-4 flex items-center gap-3" style={{ height: "3.5rem" }}>

          <Link href="/accueil" className="flex items-center gap-1.5 shrink-0"
            style={{ color: "rgba(255,255,255,0.93)", textDecoration: "none" }}>
            <span style={{ fontSize: "0.77rem", opacity: 0.6 }}>✦</span>
            <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.05rem", fontWeight: 600, letterSpacing: "0.01em" }}>Corpus Scriptura</span>
            {/* « bêta » sobre : un petit mot en italique, posé contre le nom, sans cercle
                ni capitales — un simple murmure de version. */}
            <span title="Version bêta" aria-label="Version bêta"
              style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.735rem", fontStyle: "italic", lineHeight: 1, color: "rgba(255,255,255,0.5)", position: "relative", top: "1.5px" }}>bêta</span>
          </Link>

          {/* ── Navigation desktop ──────────────────────────────────────────── */}
          <nav className="hidden lg:flex flex-1 items-center gap-1 min-w-0">
            {/* Bouton « Bible » unique : au survol il se décompose en « Classique »
                (lecture suivie) et « Polyglotte » (comparaison). Un clic direct sur la face
                mène à la lecture classique — utile au tactile, où il n'y a pas de survol. */}
            <div className="cs-bible">
              <Link href="/?livre=GEN&chapitre=1" className="cs-bible-face">
                Les Saintes Écritures
              </Link>
              <div className="cs-bible-split">
                <Link href="/?livre=GEN&chapitre=1" className={`cs-bible-seg${pathname === "/" ? " cs-bible-seg--actif" : ""}`}>Classique</Link>
                <Link href="/polyglotte" className={`cs-bible-seg${pathname.startsWith("/polyglotte") ? " cs-bible-seg--actif" : ""}`}>Polyglotte</Link>
              </div>
            </div>
            {LIENS_PRIMAIRES.map(({ href, label, exact, discret }) => (
              <Link key={href} href={href} className="cs-onglet" style={styleLien(href, exact, !discret)}>{label}</Link>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.25rem", paddingLeft: "0.5rem", minWidth: 0, borderLeft: "1px solid rgba(255,255,255,0.30)", boxShadow: "inset 1px 0 0 rgba(0,0,0,0.08)" }}>
              {blocRecherche(false)}
            </div>
          </nav>

          {/* ── Compte desktop ──────────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center" style={{ marginLeft: "auto", flexShrink: 0, gap: "0.125rem", paddingLeft: "0.25rem" }}>
            {toggleAdmin(false)}
            {(estAdmin || estAdminEmail) && (
              <span aria-hidden="true" style={{ width: "1px", height: "20px", margin: "0 4px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.24), transparent)" }} />
            )}
            <Link href="/soutenir" style={styleLienDiscret("/soutenir")}>
              <IconCoeur /> Soutenir le projet
            </Link>
            {user && (
              <span aria-hidden="true" style={{ width: "1px", height: "20px", margin: "0 2px", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.24), transparent)" }} />
            )}
            {user && (
              <button onClick={() => setMessagerieOuverte(true)} aria-label="Messages" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: 'none', cursor: 'pointer', padding: 0, color: nbMessages > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)', background: nbMessages > 0 ? 'rgba(255,255,255,0.14)' : 'transparent', transition: 'background 0.13s, color 0.13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)' }}
                onMouseLeave={e => { e.currentTarget.style.background = nbMessages > 0 ? 'rgba(255,255,255,0.14)' : 'transparent'; e.currentTarget.style.color = nbMessages > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)' }}>
                <IconParchemin />
                {nbMessages > 0 && (
                  <span style={{ position: 'absolute', top: '-1px', right: '-2px', minWidth: '14px', height: '14px', background: '#c0562a', color: '#fff', borderRadius: '7px', fontSize: '0.63rem', fontWeight: 700, lineHeight: '14px', textAlign: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
                    {nbMessages > 99 ? '99+' : nbMessages}
                  </span>
                )}
              </button>
            )}
            {user && (
              <Link href="/notifications" aria-label="Notifications" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', color: nbNotifications > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)', textDecoration: 'none', background: nbNotifications > 0 ? 'rgba(255,255,255,0.14)' : 'transparent', transition: 'background 0.13s, color 0.13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)' }}
                onMouseLeave={e => { e.currentTarget.style.background = nbNotifications > 0 ? 'rgba(255,255,255,0.14)' : 'transparent'; e.currentTarget.style.color = nbNotifications > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)' }}>
                <IconAngeTrompette />
                {nbNotifications > 0 && (
                  <span style={{ position: 'absolute', top: '-1px', right: '-2px', minWidth: '14px', height: '14px', background: '#c0562a', color: '#fff', borderRadius: '7px', fontSize: '0.63rem', fontWeight: 700, lineHeight: '14px', textAlign: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
                    {nbNotifications > 99 ? '99+' : nbNotifications}
                  </span>
                )}
              </Link>
            )}
            <div style={{ position: "relative", marginLeft: "4px" }}>
              {blocCompte(false)}
            </div>
          </div>

          {/* ── Bouton hamburger mobile ─────────────────────────────────────── */}
          <button onClick={() => setMobileOuvert(!mobileOuvert)} className="lg:hidden"
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
          <div className="lg:hidden" style={{ background: "#345c43", borderTop: "1px solid rgba(255,255,255,0.10)", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {/* Au mobile la liste est verticale : le groupement n'y a pas de sens
                  visuel, mais l'ordre reste le même — Bible et Polyglotte en tête. */}
              {[...LIENS_LECTURE, ...LIENS_PRIMAIRES, ...LIENS_SECONDAIRES].map(({ href, label }) => {
                const chemin = href.split("?")[0] || "/";
                const actif = pathname === chemin || (chemin !== "/" && pathname.startsWith(chemin));
                return (
                  <Link key={href} href={href} onClick={() => setMobileOuvert(false)}
                    style={{ padding: "9px 10px", borderRadius: "6px", fontSize: "0.98rem", color: "#fff", textDecoration: "none", background: actif ? "rgba(255,255,255,0.12)" : "transparent" }}>
                    {label}
                  </Link>
                );
              })}
            </div>
            {blocRecherche(true)}
            <Link href="/soutenir" onClick={() => setMobileOuvert(false)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 10px", borderRadius: "6px", fontSize: "0.98rem", color: "#fff", textDecoration: "none" }}>
              <IconCoeur /> Soutenir le projet
            </Link>
            {toggleAdmin(true)}
            {blocCompte(true)}
          </div>
        )}
        {toastNotification && (
          <Link href="/notifications" onClick={() => setToastNotification(null)}
            style={{ position: "fixed", top: "calc(3.5rem + 0.75rem)", right: "18px", width: "17.5rem", background: "#fff", border: "1px solid #d6d0c4", borderLeft: "3px solid #3d6b4f", borderRadius: "8px", boxShadow: "0 12px 34px rgba(0,0,0,0.16)", padding: "11px 13px", zIndex: 4000, textDecoration: "none" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#3d6b4f", margin: "0 0 4px" }}>Nouvelle notification</p>
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "0.98rem", color: "#1e2e24", margin: "0 0 4px" }}>{toastNotification.titre}</p>
            <p style={{ fontSize: "0.805rem", color: "#6b6560", lineHeight: 1.35, margin: 0 }}>{toastNotification.message}</p>
          </Link>
        )}
      </header>
      {/* Messagerie EN FENÊTRE (plus une page) : ouverte depuis l'icône parchemin. */}
      <ModaleMessagerie ouvert={messagerieOuverte} onClose={() => { setMessagerieOuverte(false); }} />
    </>
  );
}
