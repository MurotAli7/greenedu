"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";
import {
  LeafIcon,
  BookIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/Icons";

const NAV = [
  { href: "/admin/courses", label: "Kurslar", icon: BookIcon },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeSidebar = () => setOpen(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await apiFetch("/api/admin-auth", { method: "DELETE" });
    } catch {
      // Server logout failed; clear the browser session as a fallback.
      try {
        await createClient().auth.signOut();
      } catch (error) {
        console.error("Admin logout error:", error);
      }
    } finally {
      router.replace("/admin-login");
      router.refresh();
      setLoggingOut(false);
    }
  };

  return (
    <div className="shell admin-shell">
      <button
        type="button"
        className={`sidebar-overlay ${open ? "is-open" : ""}`}
        onClick={closeSidebar}
        aria-label="Menyuni yopish"
        tabIndex={open ? 0 : -1}
      />

      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link href="/admin/courses" className="sidebar-brand" onClick={closeSidebar}>
          <span className="brand-mark"><LeafIcon /></span>
          <span className="admin-brand-copy">
            <span className="brand-name">GreenEdu</span>
            <span className="brand-tag">KONTENT BOSHQARUVI</span>
          </span>
        </Link>

        <div className="admin-nav-label">ASOSIY BO‘LIM</div>
        <nav className="nav nav-main" aria-label="Admin menyusi">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "is-active" : ""}`}
                onClick={closeSidebar}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-icon"><Icon /></span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-note">
          <span className="admin-sidebar-note-mark"><LeafIcon /></span>
          <span>
            <strong>GreenEdu</strong>
            <small>Ta’lim kontentini boshqaring</small>
          </span>
        </div>

        <div className="sidebar-footer">
          <span className="avatar">A</span>
          <span className="sidebar-user-info">
            <span className="sf-name">Administrator</span>
            <span className="sf-role">Kontent boshqaruvi</span>
          </span>
          <button
            type="button"
            className="sf-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Tizimdan chiqish"
            title="Chiqish"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <button
            type="button"
            className="iconbtn menu-btn"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <div className="admin-topbar-copy">
            <span className="topbar-title">Kurslar boshqaruvi</span>
            <span className="admin-topbar-subtitle">GreenEdu administrator paneli</span>
          </div>
          <span className="admin-topbar-pill"><span /> Admin</span>
        </header>

        <main id="main-content" className="shell-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
