"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

const LIENS: { href: string; label: string; exact?: boolean; discret?: boolean }[] = [
  { href: "/accueil", label: "Accueil" },
  { href: "/", label: "Bible", exact: true },
  { href: "/bibliotheque", label: "Bibliothèque" },
  { href: "/traductions", label: "Traductions" },
  { href: "/admin", label: "Admin", discret: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ? { email: data.session.user.email ?? '' } : null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ? { email: session.user.email ?? '' } : null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    setMenuOuvert(false);
    router.push("/accueil");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center h-[48px] border-b"
        style={{ background: "#3d6b4f", borderColor: "rgba(255,255,255,0.10)" }}>
        <div className="max-w-screen-xl mx-auto w-full px-6 flex items-center gap-8">

          <Link href="/accueil" className="flex items-center gap-2 shrink-0"
            style={{ color: "rgba(255,255,255,0.93)", textDecoration: "none" }}>
            <span style={{ fontSize: "11px", opacity: 0.6 }}>✦</span>
            <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "0.02em" }}>Bible &amp; Tradition</span>
          </Link>

          <nav className="flex-1">
            <ul className="flex items-center gap-1 list-none m-0 p-0">
              {LIENS.map(({ href, label, exact, discret }) => {
                const actif = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link href={href} style={{
                      display: "inline-block", padding: "4px 11px", borderRadius: "5px",
                      fontSize: "13px", letterSpacing: "0.01em", textDecoration: "none",
                      color: actif ? "#fff" : discret ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.68)",
                      background: actif ? "rgba(255,255,255,0.14)" : "transparent",
                      transition: "color 0.13s, background 0.13s",
                    }}>{label}</Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div style={{ marginLeft: "auto", position: "relative", flexShrink: 0 }}>
            {user ? (
              <>
                <button onClick={() => setMenuOuvert(!menuOuvert)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "6px", padding: "4px 10px 4px 8px", cursor: "pointer", color: "rgba(255,255,255,0.92)", fontSize: "12.5px" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 13c0-3 2.5-4.5 5.5-4.5S12.5 10 12.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
                  <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email.split("@")[0]}</span>
                  <span style={{ fontSize: "9px", opacity: 0.6 }}>▼</span>
                </button>
                {menuOuvert && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "#fff", border: "1px solid #d6d0c4", borderRadius: "8px", boxShadow: "0 6px 24px rgba(0,0,0,0.10)", minWidth: "180px", zIndex: 100, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #ede9e2" }}>
                      <p style={{ fontSize: "10.5px", color: "#9a958d", margin: 0 }}>Connecté en tant que</p>
                      <p style={{ fontSize: "11.5px", color: "#2a3d30", fontWeight: 500, margin: "2px 0 0", wordBreak: "break-all" }}>{user.email}</p>
                    </div>
                    <Link href="/prelevements" onClick={() => setMenuOuvert(false)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", fontSize: "12.5px", color: "#2a3d30", textDecoration: "none", borderBottom: "1px solid #ede9e2" }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="10" height="9" rx="1.5" stroke="#3d6b4f" strokeWidth="1.1" fill="none"/><line x1="4" y1="5.5" x2="9" y2="5.5" stroke="#3d6b4f" strokeWidth="1"/><line x1="4" y1="7.5" x2="7.5" y2="7.5" stroke="#3d6b4f" strokeWidth="1"/></svg>
                      Mes prélèvements
                    </Link>
                    <button onClick={seDeconnecter} style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: "12.5px", color: "#9a2a2a", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M5 6.5h6M9 4.5l2 2-2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 2H2.5A1 1 0 0 0 1.5 3v7a1 1 0 0 0 1 1H7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                      Se déconnecter
                    </button>
                  </div>
                )}
                {menuOuvert && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setMenuOuvert(false)} />}
              </>
            ) : (
              <Link href="/compte" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 11px", borderRadius: "5px", fontSize: "12.5px", color: "rgba(255,255,255,0.75)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.20)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="4.5" r="2.3" stroke="currentColor" strokeWidth="1.1" fill="none"/><path d="M1 11c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none"/></svg>
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}