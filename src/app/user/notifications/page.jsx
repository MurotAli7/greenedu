"use client";

import { useEffect, useMemo, useState } from "react";

import { useUserData } from "../UserDataProvider";

import { timeAgo } from "@/lib/format";

import {
  TrophyIcon,
  BellIcon,
  CheckIcon,
} from "@/components/Icons";

import {
  SkeletonPageHead,
  SkeletonTable,
} from "@/components/Skeleton";

export default function NotificationsPage() {
  const {
    user,
    notifications,
    notificationsLoaded,
    notificationsLoading,
    loadNotifications,
    markOneRead,
    markAllRead,
  } = useUserData();

  const [tab, setTab] = useState("all");

  /*
   * Notifications faqat bir marta yuklanadi.
   *
   * UserDataProvider layout ichida turgani uchun:
   *
   * /user
   * /user/notifications
   * /user/settings
   *
   * orasida provider qayta yaratilmaydi.
   */
  useEffect(() => {
    if (!user?.id) return;

    if (notificationsLoaded) return;

    if (notificationsLoading) return;

    loadNotifications();
  }, [
    user?.id,
    notificationsLoaded,
    notificationsLoading,
    loadNotifications,
  ]);

  const items = notifications || [];

  const loading =
    notificationsLoading && !notificationsLoaded;

  /*
   * O'qilmagan xabarlar soni
   */
  const unreadCount = useMemo(() => {
    return items.filter(
      (notification) => !notification.read
    ).length;
  }, [items]);

  /*
   * Tab bo'yicha ko'rsatiladigan xabarlar
   */
  const shown = useMemo(() => {
    if (tab === "unread") {
      return items.filter(
        (notification) => !notification.read
      );
    }

    return items;
  }, [items, tab]);

  /*
   * Birinchi yuklanish paytidagi skeleton
   */
  if (loading) {
    return (
      <>
        <SkeletonPageHead />

        <SkeletonTable
          rows={4}
          cols={3}
        />
      </>
    );
  }

  return (
    <main className="notifications-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="notifications-header">

        <div className="notifications-heading">

          <div className="notifications-heading-icon">
            <BellIcon size={22} />
          </div>

          <div>
            <span className="section-kicker">
              GREENEDU
            </span>

            <h1 className="page-title">
              Bildirishnomalar
            </h1>

            <p className="page-sub">
              {unreadCount > 0
                ? `${unreadCount} ta o‘qilmagan xabar bor.`
                : "Barcha xabarlaringiz ko‘rib chiqilgan."}
            </p>
          </div>

        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-ghost notifications-mark-all"
            onClick={markAllRead}
          >
            <CheckIcon size={16} />

            <span>
              Hammasini o‘qilgan deb belgilash
            </span>
          </button>
        )}

      </header>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="notifications-summary">

        <div className="notifications-summary-item">

          <span className="notifications-summary-icon">
            🔔
          </span>

          <div>
            <strong>
              {items.length}
            </strong>

            <span>
              Jami xabar
            </span>
          </div>

        </div>

        <div className="notifications-summary-divider" />

        <div className="notifications-summary-item">

          <span className="notifications-summary-icon unread-icon">
            ●
          </span>

          <div>
            <strong>
              {unreadCount}
            </strong>

            <span>
              O‘qilmagan
            </span>
          </div>

        </div>

        <div className="notifications-summary-divider" />

        <div className="notifications-summary-item">

          <span className="notifications-summary-icon">
            ✓
          </span>

          <div>
            <strong>
              {items.length - unreadCount}
            </strong>

            <span>
              O‘qilgan
            </span>
          </div>

        </div>

      </section>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="notifications-toolbar">

        <div className="notifications-tabs">

          <button
            type="button"
            className={`notifications-tab ${
              tab === "all"
                ? "notifications-tab-active"
                : ""
            }`}
            onClick={() => setTab("all")}
            aria-pressed={tab === "all"}
          >
            <span>
              Hammasi
            </span>

            <strong>
              {items.length}
            </strong>
          </button>

          <button
            type="button"
            className={`notifications-tab ${
              tab === "unread"
                ? "notifications-tab-active"
                : ""
            }`}
            onClick={() => setTab("unread")}
            aria-pressed={tab === "unread"}
          >
            <span>
              O‘qilmagan
            </span>

            <strong>
              {unreadCount}
            </strong>
          </button>

        </div>

        {shown.length > 0 && (
          <span className="notifications-result-count">
            {shown.length} ta xabar
          </span>
        )}

      </div>

      {/* =====================================================
          NOTIFICATIONS LIST
      ===================================================== */}

      <section
        className="notifications-card"
        aria-label="Bildirishnomalar ro‘yxati"
      >

        {shown.length === 0 ? (

          <div className="notifications-empty">

            <div className="notifications-empty-icon">
              {tab === "unread"
                ? "✓"
                : "🔔"}
            </div>

            <h2>
              {tab === "unread"
                ? "Hammasi o‘qilgan"
                : "Hozircha bildirishnoma yo‘q"}
            </h2>

            <p>
              {tab === "unread"
                ? "Sizda o‘qilmagan xabarlar qolmagan. Ajoyib!"
                : "Darslarni o‘rganishda davom eting. Yangi yutuq yoki muhim xabar paydo bo‘lsa, shu yerda ko‘rasiz."}
            </p>

          </div>

        ) : (

          <div className="notifications-list">

            {shown.map((notification) => {

              const isBadge =
                notification.type === "badge";

              const isUnread =
                !notification.read;

              return (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    isUnread
                      ? "notification-item-unread"
                      : "notification-item-read"
                  }`}
                  onClick={() => {
                    if (isUnread) {
                      markOneRead(
                        notification.id
                      );
                    }
                  }}
                  role={
                    isUnread
                      ? "button"
                      : undefined
                  }
                  tabIndex={
                    isUnread
                      ? 0
                      : undefined
                  }
                  onKeyDown={(event) => {
                    if (
                      isUnread &&
                      (
                        event.key === "Enter" ||
                        event.key === " "
                      )
                    ) {
                      event.preventDefault();

                      markOneRead(
                        notification.id
                      );
                    }
                  }}
                >

                  {/* unread indicator */}

                  <div
                    className={`notification-status ${
                      isUnread
                        ? "notification-status-unread"
                        : ""
                    }`}
                    aria-hidden="true"
                  />

                  {/* icon */}

                  <div
                    className={`notification-icon ${
                      isBadge
                        ? "notification-icon-badge"
                        : "notification-icon-default"
                    }`}
                  >
                    {isBadge ? (
                      <TrophyIcon size={19} />
                    ) : (
                      <BellIcon size={19} />
                    )}
                  </div>

                  {/* content */}

                  <div className="notification-content">

                    <div className="notification-top">

                      <h2>
                        {notification.title}
                      </h2>

                      {isUnread && (
                        <span className="notification-new">
                          Yangi
                        </span>
                      )}

                    </div>

                    {notification.body && (
                      <p>
                        {notification.body}
                      </p>
                    )}

                    <time
                      dateTime={
                        notification.created_at
                      }
                    >
                      {timeAgo(
                        notification.created_at
                      )}
                    </time>

                  </div>

                  {/* action */}

                  {isUnread && (
                    <div className="notification-read-hint">
                      O‘qilgan deb belgilash
                    </div>
                  )}

                </article>
              );
            })}

          </div>
        )}

      </section>

    </main>
  );
}