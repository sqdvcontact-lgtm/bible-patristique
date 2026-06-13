"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/accueil", label: "Accueil" },
  { href: "/", label: "Bible", exact: true },
  { href: "/bibliotheque", label: "Bibliothèque" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center h-[48px] border-b"
        style={{ background: "#3d6b4f", borderColor: "rgba(255,255,255,0.10)" }}
      >
        <div className="max-w-screen-xl mx-auto w-full px-6 flex items-center gap-8">
          {/* Marque */}
          <Link
            href="/accueil"
            className="flex items-center gap-2 shrink-0"
            style={{ color: "rgba(255,255,255,0.93)", textDecoration: "none" }}
          >
            <span style={{ fontSize: "11px", opacity: 0.6 }}>✦</span>
            <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "0.02em" }}>
              Bible &amp; Tradition
            </span>
          </Link>

          {/* Liens */}
          <nav>
            <ul className="flex items-center gap-1 list-none m-0 p-0">
              {LIENS.map(({ href, label, exact }) => {
                const actif = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{
                        display: "inline-block",
                        padding: "4px 11px",
                        borderRadius: "5px",
                        fontSize: "13px",
                        letterSpacing: "0.01em",
                        textDecoration: "none",
                        color: actif ? "#fff" : "rgba(255,255,255,0.68)",
                        background: actif ? "rgba(255,255,255,0.14)" : "transparent",
                        transition: "color 0.13s, background 0.13s",
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}