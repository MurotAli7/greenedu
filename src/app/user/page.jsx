"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { xpToNextLevel } from "@/lib/gamify";
import { FlameIcon, TrophyIcon, CheckIcon, ArrowRightIcon, LeafIcon } from "@/components/Icons";
import { SkeletonStats, SkeletonCourses, SkeletonPageHead } from "@/components/Skeleton";
import { useCachedApi } from "@/lib/api/useCached";


/* Kunlik yashil qadam — o'quvchini amaliy harakatga chorlaydi */
const GREEN_TIPS = [
  "Bugun bitta plastik idishni qayta ishlashga topshiring.",
  "Sinfda chiqindilarni ajratib tashlash uchun quti tayyorlang.",
  "Kraningizni behuda oqizmang — kuniga 20 litr suv tejaladi.",
  "Maktab hovlisidagi bir daraxtni kuzatuvga oling: bargi, po'stlog'i, qushlari.",
  "Xonangizdan chiqqanda chiroqni o'chirishni odat qiling.",
  "Nonushtaga matoli sumka bilan boring — bitta paket kamayadi.",
  "Atrofingizdagi bir tur o'simlikni suratga olib, nomini aniqlang.",
  "Bugun qisqa masofaga piyoda yuring — havoga bir oz kamroq gaz chiqadi.",
  "Uyda bitta ko'chat o'tqazing va unga ism qo'ying.",
  "Daftaringizning ikkala tomonidan foydalaning — bu ham daraxt tejaydi.",
  "Qushlar uchun deraza oldiga bir hovuch don qo'ying.",
  "Eski kitoblaringizni kutubxonaga yoki do'stingizga bering.",
  "Bugun bir do'stingizga ekotizim nima ekanini tushuntiring.",
  "Ovqatni tashlamang — ortganini ertaga isitib yeng.",
  "Telefon quvvatlangach zaryadlagichni rozetkadan uzing.",
];

export default function UserHomePage() {
  // Kesh bilan: sahifaga qaytganda ma'lumot DARHOL ko'rinadi (skeleton yo'q),
  // yangilanish fonda ketadi. "Har safar butun sahifa yangilanyapti"
  // muammosining yechimi shu.
  const { data, loading, error } = useCachedApi("/api/user/dashboard");

  // Motivatsion maslahat — har kirganda almashadi
  const [tip, setTip] = useState("");
  useEffect(() => {
    if (data) setTip(GREEN_TIPS[Math.floor(Math.random() * GREEN_TIPS.length)]);
  }, [data]);

  const stats = data?.stats;
  const enrolled = data?.enrolled || [];
  const library = data?.library || [];
  const badges = data?.badges || [];
  const firstName = data?.firstName || "";

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error} — sahifani yangilab ko'ring yoki qaytadan tizimga kiring.
      </p>
    );
  }

  // Yuklanmoqda yoki ma'lumot hali kelmagan — hech qachon bo'sh holatda
  // render qilmaymiz (aks holda stats.level xatosi chiqadi)
  if (loading || !stats) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonStats />
        <div className="sk sk-line" style={{ width: 180, height: 18, marginBottom: 14 }} />
        <SkeletonCourses />
      </>
    );
  }

  const need = xpToNextLevel(stats.level);
  const xpPct = Math.min(100, Math.round((stats.xp / need) * 100));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">
            {firstName ? `Salom, ${firstName}!` : "O'quv sahifam"}
          </h1>
          <p className="page-sub">
            {stats.streak_days > 1
              ? `${stats.streak_days} kundan beri to'xtamayapsiz — zo'r!`
              : "Bugun ham bir dars — tabiat uchun bir qadam."}
          </p>
        </div>
      </header>

      {/* Gamifikatsiya paneli */}
      <div className="stats-grid">
        <div className="card statcard">
          <span className="ic ic-green"><TrophyIcon /></span>
          <p className="val">{stats.level}-daraja</p>
          <p className="lbl">{stats.xp} / {need} XP keyingi darajagacha</p>
          <div className="progress" style={{ marginTop: 10 }}>
            <i style={{ width: `${xpPct}%` }} />
          </div>
        </div>
        <div className="card statcard">
          <span className="ic ic-sun"><FlameIcon /></span>
          <p className="val">{stats.streak_days}</p>
          <p className="lbl">kun izchillik</p>
        </div>
        <div className="card statcard">
          <span className="ic ic-sky"><CheckIcon size={17} /></span>
          <p className="val">{stats.completed_lessons}</p>
          <p className="lbl">tugatilgan dars</p>
        </div>
        <div className="card statcard">
          <span className="ic ic-violet"><TrophyIcon /></span>
          <p className="val">{stats.total_points}</p>
          <p className="lbl">jami ball</p>
        </div>
      </div>

      {/* Kunlik yashil qadam */}
      <div
        className="card card-pad viewfinder viewfinder-sm"
        style={{ marginBottom: 26, display: "flex", gap: 14, alignItems: "flex-start" }}
      >
        <span className="vf-b" aria-hidden="true" />
        <span
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "var(--moss)", color: "var(--leaf-deep)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <LeafIcon size={20} />
        </span>
        <div>
          <h2 style={{ fontSize: 15, marginBottom: 4 }}>Bugungi yashil qadam</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
            {tip || GREEN_TIPS[0]}
          </p>
        </div>
      </div>

      {/* Davom etayotgan kurslar */}
      {enrolled.length > 0 && (
        <section style={{ marginBottom: 30 }} aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="panel-title" style={{ marginBottom: 14 }}>Davom eting</h2>
          <div className="course-grid">
            {enrolled.map((c) => (
              <CourseCard key={c.id} course={c} showProgress />
            ))}
          </div>
        </section>
      )}

      {/* Kutubxona */}
      <section style={{ marginBottom: 30 }}>
        <h2 className="panel-title" style={{ marginBottom: 14 }}>
          {enrolled.length ? "Yangi kurslarni kashf qiling" : "Kurslar kutubxonasi"}
        </h2>
        {library.length === 0 && enrolled.length === 0 ? (
          <p className="state-note card">Hozircha faol kurslar yo'q — tez orada qo'shiladi.</p>
        ) : library.length === 0 ? (
          <p className="state-note card">Barcha mavjud kurslarga yozilgansiz — ajoyib!</p>
        ) : (
          <div className="course-grid">
            {library.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* Nishonlar */}
      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="panel-title" style={{ marginBottom: 14 }}>Nishonlarim</h2>
        <div className="badge-grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge-card ${b.unlocked ? "" : "locked"}`}>
              <span className="bic"><TrophyIcon /></span>
              <h4>{b.name}</h4>
              <p>{b.hint}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function CourseCard({ course, showProgress = false }) {
  const pct = course.totalLessons
    ? Math.round((course.doneLessons / course.totalLessons) * 100)
    : 0;
  const isArvr = course.content_type === "ar" || course.content_type === "vr";

  return (
    <div className={`card course-card ${isArvr ? "viewfinder viewfinder-sm" : ""} ${course.content_type === "vr" ? "viewfinder-sky" : course.content_type === "ar" ? "viewfinder-sun" : ""}`}>
      {isArvr && <span className="vf-b" aria-hidden="true" />}
      <div className={`course-thumb thumb-${course.content_type}`}>
        <span className="thumb-tag">
          {course.content_type === "course" ? "KURS" : course.content_type.toUpperCase()}
        </span>
        <CourseGlyph type={course.content_type} />
      </div>
      <div className="course-body">
        <h3 className="course-title">{course.title}</h3>
        <p className="course-desc">{course.description}</p>
        {showProgress && (
          <>
            <div className="progress">
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="course-meta">
              <span>{course.doneLessons}/{course.totalLessons} dars</span>
              <span>{pct}%</span>
            </div>
          </>
        )}
        <div className="course-meta">
          <span>{course.category || "Umumiy"}</span>
          <Link href={`/user/courses/${course.id}`} className="btn btn-ghost btn-sm">
            {showProgress ? "Davom etish" : "Ko'rish"} <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CourseGlyph({ type }) {
  if (type === "vr") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.9">
        <rect x="2" y="7" width="20" height="11" rx="4" />
        <circle cx="8" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "ar") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.9">
        <path d="M12 2 21 7v10l-9 5-9-5V7l9-5z" />
        <path d="M3 7l9 5 9-5M12 12v9" />
      </svg>
    );
  }
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.9">
      <path d="M4 5c3 0 6 1 8 3 2-2 5-3 8-3v13c-3 0-6 1-8 3-2-2-5-3-8-3V5z" />
    </svg>
  );
}
