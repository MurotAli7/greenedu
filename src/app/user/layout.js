"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LeafIcon, DashboardIcon, BellIcon, SettingsIcon, LogoutIcon, MenuIcon, CloseIcon,
} from "@/components/Icons";

const NAV = [
  { href: "/user", label: "O'quv sahifam", icon: DashboardIcon, exact: true },
  { href: "/user/notifications", label: "Bildirishnomalar", icon: BellIcon, showCount: true },
  { href: "/user/settings", label: "Sozlamalar", icon: SettingsIcon },
];

export default function UserLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeSidebar = () => setOpen(false);
  const [profile, setProfile] = useState({ fullName: "", avatarUrl: "" });
  const [unread, setUnread] = useState(0);

  // Bitta effekt, bitta getUser: profil va o'qilmagan xabarlar soni
  // parallel olinadi (avval 2 ta alohida effekt 2 marta getUser chaqirardi)
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [profileRes, unreadRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
      ]);

      if (cancelled) return;
      setFullName(profileRes.data?.full_name || user.email || "Foydalanuvchi");
      setAvatarUrl(profileRes.data?.avatar_url || "");
      setUnread(unreadRes.count || 0);
    })();

    const onRead = (e) => setUnread(e.detail?.unread ?? 0);
    window.addEventListener("greenedu:notifications-read", onRead);
    return () => {
      cancelled = true;
      window.removeEventListener("greenedu:notifications-read", onRead);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const firstName = (profile.fullName || "").trim().split(/\s+/)[0] || "Do'stim";

  return (
    <div className="shell">
      <div
        className={`sidebar-overlay ${open ? "is-open" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link href="/user" className="sidebar-brand">
          <span className="brand-mark"><LeafIcon /></span>
          <span>
            <span className="brand-name">GreenEdu</span><br />
            <span className="brand-tag">O'quvchi</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Asosiy menyu">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
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
                {item.showCount && unread > 0 && <span className="nav-count">{unread}</span>}
              </Link>
            );
          })}
          <button
            type="button"
            className="nav-link"
            onClick={handleLogout}
            style={{ background: "none", border: 0, cursor: "pointer", width: "100%", textAlign: "left", font: "inherit", marginTop: "auto" }}
          >
            <LogoutIcon />
            <span>Chiqish</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl} alt=""
              className="avatar"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span className="avatar">{(profile.fullName || "?").charAt(0).toUpperCase()}</span>
          )}
          <span>
            <span className="sf-name">{profile.fullName}</span><br />
            <span className="sf-role">O'quvchi</span>
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
          <span className="topbar-title">Salom, {firstName}! 🌱</span>
        </header>
        <main id="main-content" className="shell-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
