"use client";

import { useCallback, useEffect, useState } from "react";
import { useCachedApi } from "@/lib/api/useCached";
import { ACTION_CHIPS, ACTION_LABELS, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { DownloadIcon } from "@/components/Icons";
import { SkeletonPageHead, SkeletonStats } from "@/components/Skeleton";

const PERIODS = [7, 14, 30, 90];

/** Foizga qarab rang beradi */
function percentChip(percent) {
  if (percent === null || percent === undefined) return "chip-gray";
  if (percent >= 80) return "chip-green";
  if (percent >= 60) return "chip-amber";
  return "chip-red";
}

/** Massivni CSV faylga aylantirib yuklab beradi (Excel uchun BOM bilan) */
function downloadCsv(rows, fileName) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminStatisticsPage() {
  const [days, setDays] = useState(30);

  // Kesh: davr tanlovi bo'yicha alohida kalit — qaytganda darhol ko'rinadi,
  // fonda yangilanadi. Abort/race muammolari ham hookda hal qilingan.
  const {
    data: activity,
    loading: activityLoading,
    error: activityError,
  } = useCachedApi(`/api/admin/activity?days=${days}`);
  const { data: results, error: resultsError } = useCachedApi("/api/admin/results");

  const loading = activityLoading;
  const error = activityError || resultsError;

  const exportActivity = useCallback(() => {
    if (!activity) return;
    downloadCsv(
      [
        ["Sana", "Harakatlar soni"],
        ...activity.daily.map((d) => [d.date, d.count]),
      ],
      `greenedu-kunlik-faollik-${days}kun.csv`
    );
  }, [activity, days]);

  const exportStudents = useCallback(() => {
    if (!results) return;
    downloadCsv(
      [
        [
          "O'quvchi", "Daraja", "XP", "Jami ball", "Tugatilgan darslar",
          "Seriya (kun)", "Oxirgi faollik", "Testlar soni",
          "O'rtacha natija (%)", "Eng yaxshi natija (%)",
        ],
        ...results.perStudent.map((s) => [
          s.name, s.level, s.xp, s.totalPoints, s.completedLessons,
          s.streak, s.lastActive || "-", s.tests,
          s.avgPercent ?? "-", s.bestPercent ?? "-",
        ]),
      ],
      "greenedu-oquvchilar-natijalari.csv"
    );
  }, [results]);

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }

  // Ma'lumot hali yo'q (birinchi yuklanish yoki bekor qilingan so'rov)
  if (!activity) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonStats />
        <div className="card" style={{ padding: 20 }}>
          <div className="sk" style={{ height: 150 }} />
        </div>
      </>
    );
  }

  const { summary, daily, perCourse, recentEvents, range, setupRequired } = activity;
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));
  const labelStep = daily.length > 20 ? Math.ceil(daily.length / 10) : 1;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Faollik statistikasi</h1>
          <p className="page-sub">
            Pedagogik tajriba uchun ma'lumotlar: {range.from} — {range.to}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="visually-hidden" htmlFor="period">
            Davrni tanlash
          </label>
          <select
            id="period"
            className="filter-select"
            style={{ padding: "9px 16px" }}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                So'nggi {p} kun
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost" onClick={exportActivity}>
            <DownloadIcon aria-hidden="true" /> Faollik CSV
          </button>
        </div>
      </header>

      {/* --- Umumiy ko'rsatkichlar --- */}
      {setupRequired && (
        <p className="form-error" role="alert" style={{ marginBottom: 16 }}>
          Faollik jurnali jadvali (<code>activity_log</code>) bazada topilmadi.
          Supabase → SQL Editor'da <strong>supabase/update-v2.3.sql</strong> faylini
          ishga tushiring, so'ng <code>NOTIFY pgrst, &apos;reload schema&apos;;</code>
          buyrug'ini bajaring. Shu paytgacha kunlik faollik bo'sh ko'rinadi.
        </p>
      )}

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="visually-hidden">
          Umumiy ko'rsatkichlar
        </h2>
        <div className="stats-grid">
          <article className="card statcard">
            <p className="val">{summary.totalEvents}</p>
            <p className="lbl">jami harakat ({days} kun)</p>
          </article>
          <article className="card statcard">
            <p className="val">{summary.activeUsers}</p>
            <p className="lbl">faol o'quvchi</p>
          </article>
          <article className="card statcard">
            <p className="val">{summary.byAction.lesson_complete}</p>
            <p className="lbl">tugatilgan dars</p>
          </article>
          <article className="card statcard">
            <p className="val">{summary.byAction.arvr_view}</p>
            <p className="lbl">AR/VR ko'rish</p>
          </article>
          <article className="card statcard">
            <p className="val">{summary.avgActiveDays ?? 0}</p>
            <p className="lbl">o'rtacha faol kun</p>
          </article>
        </div>
      </section>

      {/* --- Kunlik grafik --- */}
      <section className="card card-pad" style={{ marginBottom: 18 }} aria-labelledby="daily-heading">
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, flexWrap: "wrap", marginBottom: 14,
          }}
        >
          <h2 id="daily-heading" className="panel-title">Kunlik faollik</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(summary.byAction).map(([action, count]) => (
              <span key={action} className={`chip ${ACTION_CHIPS[action] || "chip-gray"}`}>
                {ACTION_LABELS[action] || action}: {count}
              </span>
            ))}
          </div>
        </div>

        {summary.totalEvents === 0 ? (
          <p className="state-note" style={{ padding: "18px 0" }}>
            Bu davrda faollik qayd etilmagan. O'quvchilar saytga kirgach yoki dars
            tugatgach, grafik shu yerda paydo bo'ladi.
          </p>
        ) : (
          <>
            <div className="barchart">
              {daily.map((d) => (
                <div
                  key={d.date}
                  className="bar"
                  style={{ height: `${Math.round((d.count / maxDaily) * 100)}%` }}
                  title={`${d.date}: ${d.count} ta harakat`}
                >
                  {d.count > 0 && <span>{d.count}</span>}
                </div>
              ))}
            </div>
            <div className="barchart-x" aria-hidden="true">
              {daily.map((d, index) => (
                <span key={d.date}>{index % labelStep === 0 ? d.date.slice(5) : ""}</span>
              ))}
            </div>
            {/* Grafik ma'lumoti ekran o'quvchilar uchun matn ko'rinishida */}
            <p className="visually-hidden">
              {daily.map((d) => `${d.date}: ${d.count} harakat`).join(". ")}
            </p>
          </>
        )}
      </section>

      {/* --- O'QUVCHILAR NATIJALARI (har doim ko'rinadi) --- */}
      <section aria-labelledby="students-heading" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 12, flexWrap: "wrap", margin: "26px 0 14px",
          }}
        >
          <div>
            <h2 id="students-heading" className="panel-title">O'quvchilar natijalari</h2>
            <p className="page-sub" style={{ fontSize: 13, margin: "4px 0 0" }}>
              {results
                ? `${results.totalStudents} o'quvchi · ${results.totalResults} ta test topshirilgan` +
                  (results.overallAvgPercent !== null
                    ? ` · umumiy o'rtacha ${results.overallAvgPercent}%`
                    : "")
                : "Yuklanmoqda..."}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={exportStudents}
            disabled={!results || results.perStudent.length === 0}
          >
            <DownloadIcon aria-hidden="true" /> Natijalar CSV
          </button>
        </div>

        <div className="card tablewrap">
          <table className="table">
            <caption className="visually-hidden">
              O'quvchilarning darslar, XP va test natijalari bo'yicha solishtirmasi
            </caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: 46 }}>#</th>
                <th scope="col">O'quvchi</th>
                <th scope="col">Darslar</th>
                <th scope="col">Daraja</th>
                <th scope="col">Ball</th>
                <th scope="col">Seriya</th>
                <th scope="col">Testlar</th>
                <th scope="col">O'rtacha</th>
              </tr>
            </thead>
            <tbody>
              {!results && (
                <tr>
                  <td colSpan={8} className="empty">Yuklanmoqda...</td>
                </tr>
              )}
              {results && results.perStudent.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Hozircha ro'yxatdan o'tgan o'quvchi yo'q.
                  </td>
                </tr>
              )}
              {results?.perStudent.map((student, index) => (
                <tr key={student.id}>
                  <td>
                    <span className="rank-num">{index + 1}</span>
                  </td>
                  <th scope="row" style={{ fontWeight: 400 }}>
                    <div className="cell-user">
                      <span className="avatar" aria-hidden="true">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="cell-name">{student.name}</div>
                        {student.lastActive && (
                          <div className="cell-sub">Oxirgi faollik: {student.lastActive}</div>
                        )}
                      </div>
                    </div>
                  </th>
                  <td>{student.completedLessons}</td>
                  <td>{student.level}</td>
                  <td>{student.totalPoints}</td>
                  <td>{student.streak} kun</td>
                  <td>{student.tests}</td>
                  <td>
                    {student.avgPercent === null ? (
                      <span className="chip chip-gray">—</span>
                    ) : (
                      <span className={`chip ${percentChip(student.avgPercent)}`}>
                        {student.avgPercent}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Kurslar va so'nggi harakatlar --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        <section className="card" aria-labelledby="courses-heading">
          <div style={{ padding: "16px 18px 4px" }}>
            <h2 id="courses-heading" className="panel-title">Kurslar kesimida</h2>
          </div>
          <div className="tablewrap">
            <table className="table">
              <caption className="visually-hidden">Kurslar bo'yicha faollik</caption>
              <thead>
                <tr>
                  <th scope="col">Kurs</th>
                  <th scope="col" style={{ textAlign: "right" }}>Harakatlar</th>
                </tr>
              </thead>
              <tbody>
                {perCourse.length === 0 && (
                  <tr><td colSpan={2} className="empty">Ma'lumot yo'q.</td></tr>
                )}
                {perCourse.map((course) => (
                  <tr key={course.id}>
                    <th scope="row" style={{ fontWeight: 400 }}>
                      <div className="cell-name">{course.title}</div>
                      <div className="cell-sub">
                        {CONTENT_TYPE_LABELS[course.contentType] || course.contentType}
                      </div>
                    </th>
                    <td style={{ textAlign: "right" }}>
                      <span className="chip chip-green">{course.events}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" aria-labelledby="recent-heading">
          <div style={{ padding: "16px 18px 4px" }}>
            <h2 id="recent-heading" className="panel-title">So'nggi harakatlar</h2>
          </div>
          <div className="tablewrap" style={{ maxHeight: 420, overflowY: "auto" }}>
            <table className="table">
              <caption className="visually-hidden">Oxirgi 50 ta harakat</caption>
              <tbody>
                {recentEvents.length === 0 && (
                  <tr><td className="empty">Hozircha harakat yo'q.</td></tr>
                )}
                {recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <div className="cell-name">{event.userName}</div>
                      <div className="cell-sub">
                        {event.courseTitle !== "-" ? event.courseTitle : ""}
                        {event.lessonTitle !== "-" ? ` · ${event.lessonTitle}` : ""}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`chip ${ACTION_CHIPS[event.action] || "chip-gray"}`}>
                        {ACTION_LABELS[event.action] || event.action}
                      </span>
                      <div className="cell-sub" style={{ marginTop: 4 }}>
                        <time dateTime={event.createdAt}>
                          {new Date(event.createdAt).toLocaleString("uz-UZ", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* --- Darslar bo'yicha o'zlashtirish (test bo'lsa) --- */}
      {results && results.perLesson.length > 0 && (
        <section className="card" style={{ marginTop: 16 }} aria-labelledby="lessons-heading">
          <div style={{ padding: "16px 18px 4px" }}>
            <h2 id="lessons-heading" className="panel-title">Darslar bo'yicha o'zlashtirish</h2>
            <p className="page-sub" style={{ fontSize: 13, margin: "4px 0 0" }}>
              Eng past natijali dars birinchi — bu mavzuni qayta tushuntirish kerak.
            </p>
          </div>
          <div className="tablewrap">
            <table className="table">
              <caption className="visually-hidden">Darslar bo'yicha o'rtacha test natijalari</caption>
              <thead>
                <tr>
                  <th scope="col">Dars</th>
                  <th scope="col">Urinishlar</th>
                  <th scope="col" style={{ textAlign: "right" }}>O'rtacha</th>
                </tr>
              </thead>
              <tbody>
                {results.perLesson.map((lesson) => (
                  <tr key={lesson.id}>
                    <th scope="row" className="cell-name" style={{ fontWeight: 600 }}>
                      {lesson.title}
                    </th>
                    <td>{lesson.attempts}</td>
                    <td style={{ textAlign: "right" }}>
                      <div
                        className="progress progress-sun"
                        style={{ width: 90, display: "inline-block", verticalAlign: "middle", marginRight: 8 }}
                        role="img"
                        aria-label={`O'rtacha ${lesson.avgPercent} foiz`}
                      >
                        <i style={{ width: `${Math.min(100, lesson.avgPercent)}%` }} />
                      </div>
                      {lesson.avgPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
