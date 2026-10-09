"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { UserDataProvider, useUserData } from "./UserDataProvider";

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

/*
 * =========================================================
 * USER LAYOUT
 * =========================================================
 *
 * UserDataProvider umumiy user ma'lumotlarini saqlaydi.
 *
 * Profile, unread va boshqa umumiy ma'lumotlar
 * har bir sahifada qayta fetch qilinmaydi.
 */

export default function UserLayout({ children }) {
  return (
    <UserDataProvider>
      <UserLayoutContent>{children}</UserLayoutContent>
    </UserDataProvider>
  );
}

/*
 * =========================================================
 * USER LAYOUT CONTENT
 * =========================================================
 */

function UserLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  /*
   * Provider'dan umumiy ma'lumotlarni olamiz.
   *
   * Bu ma'lumotlar UserDataProvider ichida yuklanadi.
   * Route o'zgarganda qayta fetch qilinmaydi.
   */

  const {
    user,
    profile,
    profileLoading,
    unread,
  } = useUserData();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * =========================================================
   * AUTH REDIRECT
   * =========================================================
   */

  useEffect(() => {
    if (profileLoading) return;

    if (!user) {
      router.replace("/login");
    }
  }, [user, profileLoading, router]);

  /*
   * =========================================================
   * MOBILE SIDEBAR
   * =========================================================
   */

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  /*
   * =========================================================
   * ESCAPE BILAN SIDEBAR YOPISH
   * =========================================================
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
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  /*
   * =========================================================
   * MOBILE SCROLL LOCK
   * =========================================================
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
   * =========================================================
   * ROUTE O'ZGARGANDA SIDEBARNI YOPISH
   * =========================================================
   */

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout xatoligi:", error);
      setLoggingOut(false);
    }
  };

  /*
   * =========================================================
   * PROFILE DATA
   * =========================================================
   */

  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Foydalanuvchi";

  const avatarUrl = profile?.avatar_url || "";

  const firstName =
    fullName?.trim()?.split(/\s+/)[0] || "Do'stim";

  const avatarLetter =
    fullName?.trim()?.charAt(0)?.toUpperCase() || "G";

  /*
   * =========================================================
   * INITIAL LOADING
   * =========================================================
   *
   * Faqat birinchi user/profile yuklanishida ishlaydi.
   *
   * Route almashganda bu layout qayta yaratilmaydi.
   */

  const initialLoading = profileLoading && !user;

  /*
   * =========================================================
   * AUTH CHECK
   * =========================================================
   */

  if (initialLoading) {
    return (
      <div className="shell">
        <div className="shell-main">
          <main
            id="main-content"
            className="shell-content"
            tabIndex={-1}
          >
            <div
              style={{
                minHeight: "40vh",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span>Yuklanmoqda...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /*
   * User yo'q bo'lsa redirect kutilmoqda.
   */

  if (!user) {
    return null;
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="shell">

      {/* =====================================================
          MOBILE OVERLAY
          ===================================================== */}

      <button
        type="button"
        className={`sidebar-overlay ${
          sidebarOpen ? "is-open" : ""
        }`}
        onClick={closeSidebar}
        aria-label="Menyuni yopish"
        tabIndex={sidebarOpen ? 0 : -1}
      />

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        id="greenedu-user-sidebar"
        className={`sidebar ${
          sidebarOpen ? "is-open" : ""
        }`}
        aria-label="Foydalanuvchi menyusi"
      >

        {/* ===================================================
            BRAND
            =================================================== */}

        <Link
          href="/user"
          className="sidebar-brand"
          onClick={closeSidebar}
          aria-label="GreenEdu o'quvchi sahifasi"
        >
          <span
            className="brand-mark"
            aria-hidden="true"
          >
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

        {/* ===================================================
            NAVIGATION
            =================================================== */}

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
        </nav>

        {/* ===================================================
            USER PROFILE
            =================================================== */}

        <div className="sidebar-footer">

          <Link
            href="/user/settings"
            className="sidebar-user"
            onClick={closeSidebar}
            aria-label="Profil sozlamalarini ochish"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
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
                {profileLoading
                  ? "Yuklanmoqda..."
                  : fullName || "Foydalanuvchi"}
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

      {/* =====================================================
          MAIN
          ===================================================== */}

      <div className="shell-main">

        {/* ===================================================
            TOPBAR
            =================================================== */}

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

        {/* ===================================================
            PAGE CONTENT
            =================================================== */}

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