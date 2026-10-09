"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";

import { CheckIcon } from "@/components/Icons";
import {
  SkeletonPageHead,
  SkeletonLessons,
} from "@/components/Skeleton";

import { apiFetch } from "@/lib/api/client";
import {
  useCachedApi,
  invalidateCache,
} from "@/lib/api/useCached";

export default function CoursePage({ params }) {
  const { id } = use(params);

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [done, setDone] = useState(new Set());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);

  /*
   * ============================================================
   * COURSE DATA
   * ============================================================
   *
   * Kurs ma'lumotlari global cache orqali olinadi.
   *
   * Sahifaga qaytilganda:
   * 1. Avval cache'dagi ma'lumot ko'rinadi.
   * 2. Kerak bo'lsa ma'lumot fonda yangilanadi.
   * 3. Sahifa to'liq qayta yuklanmaydi.
   */

  const {
    data: courseData,
    loading,
    error: apiError,
    mutate,
  } = useCachedApi(
    `/api/user/course?id=${id}`
  );

  /*
   * API ma'lumotlarini local state'ga joylashtiramiz.
   */

  useEffect(() => {
    if (!courseData) return;

    setCourse(courseData.course || null);
    setLessons(courseData.lessons || []);
    setEnrolled(Boolean(courseData.enrolled));

    setDone(
      new Set(courseData.doneLessonIds || [])
    );
  }, [courseData]);

  /*
   * API errorini ko'rsatish
   */

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  /*
   * ============================================================
   * LESSON COMPLETE
   * ============================================================
   */

  const handleComplete = useCallback(
    async (lesson) => {
      if (!lesson?.id || busy) return;

      setBusy(true);
      setError("");
      setReward(null);

      try {
        const json = await apiFetch(
          "/api/user/complete-lesson",
          {
            method: "POST",
            body: {
              lessonId: lesson.id,
            },
          }
        );

        /*
         * Local state darhol yangilanadi.
         * Sahifani refresh qilish shart emas.
         */

        setDone((prev) => {
          const next = new Set(prev);
          next.add(lesson.id);
          return next;
        });

        /*
         * Cache ham yangilanadi.
         */

        mutate((prev) => {
          if (!prev) return prev;

          const currentDone =
            Array.isArray(prev.doneLessonIds)
              ? prev.doneLessonIds
              : [];

          if (currentDone.includes(lesson.id)) {
            return prev;
          }

          return {
            ...prev,
            doneLessonIds: [
              ...currentDone,
              lesson.id,
            ],
          };
        });

        /*
         * Dashboard cache'ni eskirtiramiz.
         * Keyingi dashboard kirishida yangilanadi.
         */

        invalidateCache("/api/user/dashboard");

        /*
         * Mukofot
         */

        if (!json?.already) {
          setReward({
            xp: json?.xpEarned || 0,
            leveledUp: Boolean(json?.leveledUp),
            newLevel: json?.newLevel,
            badges: json?.newBadges || [],
          });
        }
      } catch (err) {
        setError(
          err?.message ||
            "Darsni yakunlashda xatolik yuz berdi."
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, mutate]
  );

  /*
   * ============================================================
   * ENROLL
   * ============================================================
   */

  const handleEnroll = async () => {
    if (busy) return;

    setBusy(true);
    setError("");
    setReward(null);

    try {
      await apiFetch("/api/user/enroll", {
        method: "POST",
        body: {
          courseId: id,
        },
      });

      /*
       * UI darhol o'zgaradi.
       */

      setEnrolled(true);

      /*
       * Cache'dagi enrolled qiymatini ham yangilaymiz.
       */

      mutate((prev) =>
        prev
          ? {
              ...prev,
              enrolled: true,
            }
          : prev
      );

      /*
       * Dashboard ma'lumotlarini eskirtiramiz.
       */

      invalidateCache("/api/user/dashboard");
    } catch (err) {
      setError(
        err?.message ||
          "Kursga yozilishda xatolik yuz berdi."
      );
    } finally {
      setBusy(false);
    }
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading && !course) {
    return (
      <main className="course-page">
        <SkeletonPageHead />
        <SkeletonLessons />
      </main>
    );
  }

  /*
   * ============================================================
   * COURSE NOT FOUND
   * ============================================================
   */

  if (!course) {
    return (
      <main className="course-page">
        <section className="course-not-found">
          <div className="course-not-found-icon">
            📚
          </div>

          <h1>Kurs topilmadi</h1>

          <p>
            Ushbu kurs mavjud emas yoki uni ko‘rish
            imkoniyati yo‘q.
          </p>

          <Link
            href="/user"
            className="btn btn-primary"
          >
            O‘quv sahifamga qaytish
          </Link>
        </section>
      </main>
    );
  }

  /*
   * ============================================================
   * PROGRESS
   * ============================================================
   */

  const doneCount = lessons.filter((lesson) =>
    done.has(lesson.id)
  ).length;

  const pct =
    lessons.length > 0
      ? Math.round(
          (doneCount / lessons.length) * 100
        )
      : 0;

  const remaining = Math.max(
    lessons.length - doneCount,
    0
  );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="course-page">

      {/* ========================================================
          BREADCRUMB
      ======================================================== */}

      <nav
        className="course-breadcrumb"
        aria-label="Navigatsiya"
      >
        <Link href="/user">
          O‘quv sahifam
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span aria-current="page">
          {course.title}
        </span>
      </nav>

      {/* ========================================================
          COURSE HERO
      ======================================================== */}

      <section className="course-hero">

        <div className="course-hero-main">

          <div className="course-label-row">

            <span
              className={`course-type ${
                course.content_type === "vr"
                  ? "course-type-vr"
                  : course.content_type === "ar"
                    ? "course-type-ar"
                    : "course-type-course"
              }`}
            >
              {course.content_type === "course"
                ? "KURS"
                : course.content_type === "ar"
                  ? "AR / 3D"
                  : "VR"}
            </span>

            {course.category && (
              <span className="course-category">
                {course.category}
              </span>
            )}

          </div>

          <h1 className="course-hero-title">
            {course.title}
          </h1>

          {course.description && (
            <p className="course-hero-description">
              {course.description}
            </p>
          )}

          <div className="course-hero-meta">

            <span>
              📚 {lessons.length} ta dars
            </span>

            <span>
              ⚡ XP mukofotlari
            </span>

            {enrolled && (
              <span className="course-enrolled-meta">
                ✓ Kursga yozilgansiz
              </span>
            )}

          </div>

        </div>

        {/* ======================================================
            ENROLL CARD
        ====================================================== */}

        {!enrolled && (
          <div className="course-hero-action">

            <div className="course-action-icon">
              🌱
            </div>

            <h2>
              O‘rganishni boshlang
            </h2>

            <p>
              Kursga yoziling va darslarni
              ketma-ket o‘rganing.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-lg course-enroll-btn"
              onClick={handleEnroll}
              disabled={busy}
            >
              {busy
                ? "Yozilmoqda..."
                : "Kursni boshlash →"}
            </button>

          </div>
        )}

      </section>

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div
          className="course-alert course-alert-error"
          role="alert"
        >
          <span>!</span>

          <p>{error}</p>
        </div>
      )}

      {/* ========================================================
          REWARD
      ======================================================== */}

      {reward && (
        <div
          className="course-alert course-alert-success"
          role="status"
        >
          <span className="reward-icon">
            ✓
          </span>

          <div>

            <strong>
              +{reward.xp} XP qo‘shildi!
            </strong>

            {reward.leveledUp && (
              <p>
                🎉 Yangi daraja:{" "}
                {reward.newLevel}
              </p>
            )}

            {reward.badges?.length > 0 && (
              <p>
                🏆 Yangi nishon:{" "}
                {reward.badges
                  .map((badge) => badge.name)
                  .join(", ")}
              </p>
            )}

          </div>
        </div>
      )}

      {/* ========================================================
          PROGRESS
      ======================================================== */}

      {enrolled && lessons.length > 0 && (
        <section
          className="course-progress-card"
          aria-label="Kursdagi jarayon"
        >

          <div className="course-progress-top">

            <div>

              <span className="section-kicker">
                KURS JARAYONI
              </span>

              <h2>
                {pct === 100
                  ? "Kurs yakunlandi!"
                  : "O‘qishni davom ettiring"}
              </h2>

            </div>

            <strong className="course-progress-percent">
              {pct}%
            </strong>

          </div>

          <div
            className="course-progress-bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Kursning ${pct} foizi tugatilgan`}
          >
            <span
              style={{
                width: `${pct}%`,
              }}
            />
          </div>

          <div className="course-progress-bottom">

            <span>
              {doneCount} / {lessons.length}{" "}
              dars tugatilgan
            </span>

            {pct === 100 ? (
              <span className="progress-complete">
                ✓ Barcha darslar tugatildi
              </span>
            ) : (
              <span>
                Yana {remaining} ta dars qoldi
              </span>
            )}

          </div>

        </section>
      )}

      {/* ========================================================
          LESSONS
      ======================================================== */}

      <section className="lessons-section">

        <div className="lessons-section-head">

          <div>

            <span className="section-kicker">
              KURS DASTURI
            </span>

            <h2>
              Darslar
            </h2>

            <p>
              Darslarni ketma-ket o‘rganing va
              har bir yakunlangan mashg‘ulot
              uchun XP oling.
            </p>

          </div>

          {lessons.length > 0 && (
            <div
              className="lessons-count"
              aria-label={`${doneCount} ta dars tugatilgan`}
            >
              {doneCount}/{lessons.length}
            </div>
          )}

        </div>

        {/* ======================================================
            EMPTY
        ====================================================== */}

        {lessons.length === 0 ? (
          <div className="empty-lessons">

            <div className="empty-lessons-icon">
              📚
            </div>

            <h3>
              Hali darslar qo‘shilmagan
            </h3>

            <p>
              Ushbu kursga hozircha darslar
              joylashtirilmagan.
            </p>

          </div>
        ) : (

          <div className="lessons-list">

            {lessons.map((lesson, index) => {

              const isDone = done.has(
                lesson.id
              );

              const hasContent = Boolean(
                lesson.content ||
                lesson.embed_url ||
                lesson.model_url ||
                lesson.test_url
              );

              /*
               * Dars alohida sahifada ochiladi.
               *
               * Link ishlatilgani uchun Next.js
               * sahifani client-side navigation qiladi.
               *
               * Ya'ni butun sayt refresh bo'lmaydi.
               */

              const lessonHref =
                `/user/course/${id}/lesson/${lesson.id}`;

              return (
                <article
                  key={lesson.id}
                  className={`lesson-card ${
                    isDone
                      ? "lesson-card-done"
                      : ""
                  }`}
                >

                  {/* ==================================================
                      LESSON HEADER
                  ================================================== */}

                  <div className="lesson-card-main">

                    <div
                      className={`lesson-number ${
                        isDone
                          ? "lesson-number-done"
                          : ""
                      }`}
                    >
                      {isDone ? (
                        <CheckIcon size={17} />
                      ) : (
                        String(index + 1).padStart(
                          2,
                          "0"
                        )
                      )}
                    </div>

                    <div className="lesson-card-info">

                      <div className="lesson-card-title-row">

                        <h3>
                          {lesson.title}
                        </h3>

                        {isDone && (
                          <span className="lesson-done-label">
                            Tugatilgan
                          </span>
                        )}

                      </div>

                      {lesson.summary && (
                        <p className="lesson-card-summary">
                          {lesson.summary}
                        </p>
                      )}

                      <div className="lesson-card-meta">

                        {lesson.lesson_type !==
                          "text" && (
                          <span
                            className={`lesson-type-pill ${
                              lesson.lesson_type ===
                              "vr"
                                ? "lesson-type-vr"
                                : lesson.lesson_type ===
                                    "ar"
                                  ? "lesson-type-ar"
                                  : "lesson-type-media"
                            }`}
                          >
                            {lesson.lesson_type ===
                            "vr"
                              ? "🥽 VR"
                              : lesson.lesson_type ===
                                  "ar"
                                ? "🧊 AR / 3D"
                                : lesson.lesson_type.toUpperCase()}
                          </span>
                        )}

                        <span className="lesson-xp">
                          +{lesson.xp_reward} XP
                        </span>

                        {hasContent && (
                          <span className="lesson-content-indicator">
                            Interaktiv dars
                          </span>
                        )}

                      </div>

                    </div>

                    {/* ==================================================
                        ACTION
                    ================================================== */}

                    <div className="lesson-card-action">

                      {enrolled ? (
                        <Link
                          href={lessonHref}
                          prefetch={true}
                          className={
                            isDone
                              ? "btn btn-ghost btn-sm"
                              : "btn btn-primary btn-sm"
                          }
                        >
                          {isDone
                            ? "Qayta ko‘rish"
                            : "Boshlash"}
                        </Link>
                      ) : isDone ? (
                        <span className="lesson-finished">
                          ✓ Tugatilgan
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            handleComplete(
                              lesson
                            )
                          }
                          disabled={busy}
                        >
                          {busy
                            ? "Saqlanmoqda..."
                            : "Tugatdim"}
                        </button>
                      )}

                    </div>

                  </div>

                </article>
              );
            })}

          </div>
        )}

        {/* ========================================================
            NOT ENROLLED
        ======================================================== */}

        {!enrolled && lessons.length > 0 && (
          <div className="course-enroll-note">

            <span>🔒</span>

            <div>

              <strong>
                Darslarni ochish uchun kursga yoziling
              </strong>

              <p>
                Kursga yozilgandan so‘ng barcha
                interaktiv darslar, testlar va
                AR/VR materiallardan foydalanishingiz
                mumkin.
              </p>

            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleEnroll}
              disabled={busy}
            >
              {busy
                ? "Yozilmoqda..."
                : "Kursga yozilish"}
            </button>

          </div>
        )}

      </section>

    </main>
  );
}