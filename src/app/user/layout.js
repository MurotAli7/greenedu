"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import {
  LeafIcon,
  DashboardIcon,
  BellIcon,
  SettingsIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/Icons";

const NAV = [
  {
    href: "/user",
    label: "O'quv sahifam",
    icon: DashboardIcon,
    exact: true,
  },
  {
    href: "/user/notifications",
    label: "Bildirishnomalar",
    icon: BellIcon,
    showCount: true,
  },
  {
    href: "/user/settings",
    label: "Sozlamalar",
    icon: SettingsIcon,
  },
];

export default function UserLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    avatarUrl: "",
  });

  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  /*
   * Profil + notification count
   * Bitta getUser va ikkala query parallel ishlaydi.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setLoading(false);
          router.replace("/login");
          return;
        }

        const [profileRes, unreadRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single(),

          supabase
            .from("notifications")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("user_id", user.id)
            .eq("read", false),
        ]);

        if (cancelled) return;

        setProfile({
          fullName:
            profileRes.data?.full_name ||
            user.user_metadata?.full_name ||
            user.email ||
            "Foydalanuvchi",

          avatarUrl: profileRes.data?.avatar_url || "",
        });

        setUnread(unreadRes.count || 0);
      } catch {
        if (!cancelled) {
          setProfile({
            fullName: "Foydalanuvchi",
            avatarUrl: "",
          });

          setUnread(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  /*
   * Notification sahifasidan keladigan event.
   */
  useEffect(() => {
    const onRead = (event) => {
      const nextUnread = event.detail?.unread;

      if (typeof nextUnread === "number") {
        setUnread(nextUnread);
      }
    };

    window.addEventListener(
      "greenedu:notifications-read",
      onRead
    );

    return () => {
      window.removeEventListener(
        "greenedu:notifications-read",
        onRead
      );
    };
  }, []);

  /*
   * Profile sahifasidan keladigan update event.
   */
  useEffect(() => {
    const onProfileUpdate = (event) => {
      const detail = event.detail || {};

      setProfile((prev) => ({
        fullName:
          detail.fullName !== undefined
            ? detail.fullName
            : prev.fullName,

        avatarUrl:
          detail.avatarUrl !== undefined
            ? detail.avatarUrl
            : prev.avatarUrl,
      }));
    };

    window.addEventListener(
      "greenedu:profile-updated",
      onProfileUpdate
    );

    return () => {
      window.removeEventListener(
        "greenedu:profile-updated",
        onProfileUpdate
      );
    };
  }, []);

  /*
   * Mobile sidebar:
   * Escape bilan yopish.
   */
  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [sidebarOpen]);

  /*
   * Sidebar ochilganda mobile'da
   * asosiy sahifani scroll qilishni bloklaymiz.
   */
  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  /*
   * Mobile'da route o'zgarganda sidebar yopiladi.
   */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const firstName =
    profile.fullName
      ?.trim()
      .split(/\s+/)[0] || "Do'stim";

  const avatarLetter =
    profile.fullName?.trim()?.charAt(0)?.toUpperCase() || "G";

  return (
    <div className="shell">
      {/* Mobile overlay */}
      <button
        type="button"
        className={`sidebar-overlay ${
          sidebarOpen ? "is-open" : ""
        }`}
        onClick={closeSidebar}
        aria-label="Menyuni yopish"
        tabIndex={sidebarOpen ? 0 : -1}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "is-open" : ""
        }`}
        aria-label="Foydalanuvchi menyusi"
      >
        {/* Brand */}
        <Link
          href="/user"
          className="sidebar-brand"
          onClick={closeSidebar}
          aria-label="GreenEdu o'quvchi sahifasi"
        >
          <span className="brand-mark" aria-hidden="true">
            <LeafIcon />
          </span>

          <span className="brand-copy">
            <span className="brand-name">
              GreenEdu
            </span>

            <span className="brand-tag">
              O'quvchi
            </span>
          </span>
        </Link>

        {/* Navigation */}
        <nav
          className="nav"
          aria-label="Asosiy menyu"
        >
          <div className="nav-main">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${
                    active ? "is-active" : ""
                  }`}
                  onClick={closeSidebar}
                  aria-current={
                    active ? "page" : undefined
                  }
                >
                  <span
                    className="nav-icon"
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>

                  <span className="nav-label">
                    {item.label}
                  </span>

                  {item.showCount && unread > 0 && (
                    <span
                      className="nav-count"
                      aria-label={`${unread} ta o'qilmagan bildirishnoma`}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <button
            type="button"
            className="nav-link nav-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label={
              loggingOut
                ? "Hisobdan chiqilmoqda"
                : "Hisobdan chiqish"
            }
          >
           
          </button>
        </nav>

        {/* User profile */}
        <div className="sidebar-footer">
          <Link
            href="/user/settings"
            className="sidebar-user"
            onClick={closeSidebar}
            aria-label="Profil sozlamalarini ochish"
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="avatar sidebar-avatar"
                width="40"
                height="40"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span
                className="avatar sidebar-avatar"
                aria-hidden="true"
              >
                {avatarLetter}
              </span>
            )}

            <span className="sidebar-user-info">
              <span className="sf-name">
                {loading
                  ? "Yuklanmoqda..."
                  : profile.fullName || "Foydalanuvchi"}
              </span>

              <span className="sf-role">
                O'quvchi
              </span>
            </span>
          </Link>

          <button
            type="button"
            className="sf-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Hisobdan chiqish"
          >
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="shell-main">
        <header className="topbar">
          <button
            type="button"
            className="iconbtn menu-btn"
            onClick={toggleSidebar}
            aria-label={
              sidebarOpen
                ? "Menyuni yopish"
                : "Menyuni ochish"
            }
            aria-expanded={sidebarOpen}
            aria-controls="greenedu-user-sidebar"
          >
            {sidebarOpen ? (
              <CloseIcon />
            ) : (
              <MenuIcon />
            )}
          </button>

          <div className="topbar-greeting">
            <span className="topbar-title">
              Salom, {firstName}!
            </span>

            <span
              className="topbar-leaf"
              aria-hidden="true"
            >
              🌱
            </span>
          </div>
        </header>

        <main
          id="main-content"
          className="shell-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}