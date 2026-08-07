"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { UsersIcon, BookIcon, VrIcon, CheckIcon } from "@/components/Icons";
import { SkeletonPageHead, SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { useCachedApi } from "@/lib/api/useCached";

export default function AdminDashboardPage() {
  // Kesh: bo'limlar orasida yurganda qayta yuklanmaydi
  const { data, error } = useCachedApi("/api/admin/stats");

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!data) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonStats />
        <SkeletonTable rows={5} cols={3} />
      </>
    );
  }

  const { stats, recentUsers, topCourses } = data;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Boshqaruv paneli</h1>
          <p className="page-sub">Platformaning umumiy holati.</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="card statcard">
          <span className="ic ic-green"><UsersIcon /></span>
          <p className="val">{stats.totalUsers}</p>
          <p className="lbl">jami foydalanuvchi</p>
        </div>
        <div className="card statcard">
          <span className="ic ic-sun"><BookIcon /></span>
          <p className="val">{stats.activeCourses}</p>
          <p className="lbl">faol kurs</p>
        </div>
        <div className="card statcard">
          <span className="ic ic-sky"><VrIcon /></span>
          <p className="val">{stats.arvrContent}</p>
          <p className="lbl">AR/VR kontent</p>
        </div>
        <div className="card statcard">
          <span className="ic ic-violet"><CheckIcon size={17} /></span>
          <p className="val">{stats.completedLessons}</p>
          <p className="lbl">tugatilgan dars (jami)</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div className="card">
          <div style={{ padding: "16px 18px 4px" }}>
            <h2 className="panel-title">So'nggi foydalanuvchilar</h2>
          </div>
          <div className="tablewrap">
            <table className="table">
              <tbody>
                {recentUsers.length === 0 && (
                  <tr><td className="empty">Hozircha foydalanuvchi yo'q.</td></tr>
                )}
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cell-user">
                        <span className="avatar">
                          {(u.fullName || u.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="cell-name">{u.fullName || "Ismsiz"}</div>
                          <div className="cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--ink-faint)", fontSize: 12.5 }}>
                      {timeAgo(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "6px 18px 16px" }}>
            <Link href="/admin/users" className="btn btn-ghost btn-sm">Barchasini ko'rish</Link>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: "16px 18px 4px" }}>
            <h2 className="panel-title">Eng ko'p yozilgan kurslar</h2>
          </div>
          <div className="tablewrap">
            <table className="table">
              <tbody>
                {topCourses.length === 0 && (
                  <tr><td className="empty">Hozircha kurs yo'q.</td></tr>
                )}
                {topCourses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="cell-name">{c.title}</div>
                      <div className="cell-sub">
                        {c.contentType === "course" ? "Kurs" : c.contentType.toUpperCase()}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="chip chip-green">{c.students} o'quvchi</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "6px 18px 16px" }}>
            <Link href="/admin/courses" className="btn btn-ghost btn-sm">Kurslarni boshqarish</Link>
          </div>
        </div>
      </div>
    </>
  );
}
