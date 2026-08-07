"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";
import {
  LeafIcon, DashboardIcon, UsersIcon, BookIcon, VrIcon, ChartIcon,
  LogoutIcon, MenuIcon, CloseIcon,
} from "@/components/Icons";

const NAV = [
  { href: "/admin/dashboard", label: "Boshqaruv paneli", icon: DashboardIcon },
  { href: "/admin/users", label: "Foydalanuvchilar", icon: UsersIcon },
  { href: "/admin/courses", label: "Kurslar", icon: BookIcon },
  { href: "/admin/ar-vr-content", label: "AR/VR kontent", icon: VrIcon },
  { href: "/admin/statistics", label: "Faollik statistikasi", icon: ChartIcon },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeSidebar = () => setOpen(false);
  const [adminName, setAdminName] = useState("Administrator");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).single();
      if (p?.full_name) setAdminName(p.full_name);
    })();
  }, []);

  const handleLogout = async () => {
    await apiFetch("/api/admin-auth", { method: "DELETE" }).catch(() => {});
    try {
      await createClient().auth.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="shell">
      <div
        className={`sidebar-overlay ${open ? "is-open" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link href="/admin/dashboard" className="sidebar-brand">
          <span className="brand-mark"><LeafIcon /></span>
          <span>
            <span className="brand-name">GreenEdu</span><br />
            <span className="brand-tag">Admin</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Asosiy menyu">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href} href={item.href}
                className={`nav-link ${active ? "is-active" : ""}`}
                onClick={closeSidebar}
                aria-current={active ? "page" : undefined}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{adminName.charAt(0).toUpperCase()}</span>
          <span>
            <span className="sf-name">{adminName}</span><br />
            <span className="sf-role">Boshqaruv</span>
          </span>
          <button type="button" className="sf-logout" onClick={handleLogout} aria-label="Chiqish">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <button
            type="button" className="iconbtn menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <span className="topbar-title">Salom, {adminName.split(" ")[0]}!</span>
        </header>
        <main id="main-content" className="shell-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
