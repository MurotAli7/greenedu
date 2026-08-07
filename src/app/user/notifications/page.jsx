"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import { TrophyIcon, BellIcon } from "@/components/Icons";
import { SkeletonPageHead, SkeletonTable } from "@/components/Skeleton";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("all"); // all | unread

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, type, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const markAllRead = async () => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("notifications").update({ read: true })
      .eq("user_id", userId).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    window.dispatchEvent(
      new CustomEvent("greenedu:notifications-read", { detail: { unread: 0 } })
    );
  };

  const markOneRead = async (id) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(
        new CustomEvent("greenedu:notifications-read", {
          detail: { unread: next.filter((n) => !n.read).length },
        })
      );
      return next;
    });
  };

  const unreadCount = items.filter((n) => !n.read).length;
  const shown = tab === "unread" ? items.filter((n) => !n.read) : items;

  if (loading) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonTable rows={4} cols={3} />
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Bildirishnomalar</h1>
          <p className="page-sub">
            {unreadCount > 0 ? `${unreadCount} ta o'qilmagan xabar bor.` : "Hammasi o'qilgan."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-ghost" onClick={markAllRead}>
            Hammasini o'qilgan deb belgilash
          </button>
        )}
      </div>

      <div className="filterbar">
        <button
          type="button"
          className={`chip chip-click ${tab === "all" ? "chip-green" : "chip-gray"}`}
          onClick={() => setTab("all")}
        >
          Hammasi ({items.length})
        </button>
        <button
          type="button"
          className={`chip chip-click ${tab === "unread" ? "chip-green" : "chip-gray"}`}
          onClick={() => setTab("unread")}
        >
          O'qilmagan ({unreadCount})
        </button>
      </div>

      <div className="card">
        {shown.length === 0 && (
          <p className="state-note">
            {tab === "unread" ? "O'qilmagan xabar yo'q." : "Hozircha bildirishnoma yo'q — darslarni tugatib, birinchi nishoningizni oling!"}
          </p>
        )}
        {shown.map((n) => (
          <div
            key={n.id}
            className={`notif-row ${n.read ? "read" : "unread"}`}
            onClick={() => !n.read && markOneRead(n.id)}
            style={{ cursor: n.read ? "default" : "pointer" }}
          >
            <span className="notif-dot" aria-hidden="true" />
            <span style={{ color: n.type === "badge" ? "var(--sun)" : "var(--leaf)", marginTop: 2 }}>
              {n.type === "badge" ? <TrophyIcon size={17} /> : <BellIcon />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{n.title}</div>
              {n.body && (
                <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>{n.body}</div>
              )}
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>
                {timeAgo(n.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
