"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import Script from "next/script";

import { CheckIcon, DownloadIcon } from "@/components/Icons";
import { SkeletonPageHead, SkeletonLessons } from "@/components/Skeleton";

import { apiFetch } from "@/lib/api/client";
import { useCachedApi, invalidateCache } from "@/lib/api/useCached";
import { TEST_RESULT_MESSAGE } from "@/lib/constants";

export default function CoursePage({ params }) {
  const { id } = use(params);

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [done, setDone] = useState(new Set());

  const [openLesson, setOpenLesson] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [testMsg, setTestMsg] = useState(null);

  const hasModel = lessons.some((lesson) => lesson.model_url);

  /*
   * Kurs ma'lumotlarini cache orqali olamiz.
   * Sahifaga qaytilganda mavjud ma'lumot tezda ko'rinadi,
   * yangilanish esa fonda davom etadi.
   */
  const {
    data: courseData,
    loading,
    mutate,
  } = useCachedApi(`/api/user/course?id=${id}`);

  useEffect(() => {
    if (!courseData) return;

    setCourse(courseData.course);
    setLessons(courseData.lessons || []);
    setEnrolled(Boolean(courseData.enrolled));
    setDone(new Set(courseData.doneLessonIds || []));
  }, [courseData]);

  /*
   * Darsni tugatish
   */
  const handleComplete = useCallback(
    async (lesson) => {
      if (busy) return;

      setBusy(true);
      setError("");

      try {
        const json = await apiFetch("/api/user/complete-lesson", {
          method: "POST",
          body: {
            lessonId: lesson.id,
          },
        });

        setDone((prev) => new Set([...prev, lesson.id]));

        mutate((prev) =>
          prev && !prev.doneLessonIds.includes(lesson.id)
            ? {
                ...prev,
                doneLessonIds: [
                  ...prev.doneLessonIds,
                  lesson.id,
                ],
              }
            : prev
        );

        invalidateCache("/api/user/dashboard");

        if (!json.already) {
          setReward({
            xp: json.xpEarned,
            leveledUp: json.leveledUp,
            newLevel: json.newLevel,
            badges: json.newBadges || [],
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
   * Testdan postMessage orqali natija qabul qilish
   */
  useEffect(() => {
    const onMessage = async (event) => {
      const payload = event.data;

      if (
        !payload ||
        payload.type !== TEST_RESULT_MESSAGE ||
        !openLesson
      ) {
        return;
      }

      const lesson = lessons.find(
        (item) => item.id === openLesson
      );

      if (!lesson || !lesson.test_url) return;

      /*
       * Xavfsizlik:
       * test natijasi faqat aynan test joylashgan
       * origin'dan kelgan bo'lsa qabul qilinadi.
       */
      let expectedOrigin;

      try {
        expectedOrigin = new URL(lesson.test_url).origin;
      } catch {
        return;
      }

      if (event.origin !== expectedOrigin) return;

      try {
        const result = await apiFetch(
          "/api/user/test-result",
          {
            method: "POST",
            body: {
              lessonId: lesson.id,
              score: payload.score,
              total: payload.total,
            },
          }
        );

        setTestMsg({
          lessonId: lesson.id,
          text: `Test natijangiz saqlandi: ${payload.score}/${payload.total} (${result.percent}%)`,
        });

        /*
         * Test topshirilgach dars avtomatik tugatiladi.
         */
        if (!done.has(lesson.id)) {
          await handleComplete(lesson);
        }
      } catch (err) {
        setTestMsg({
          lessonId: lesson.id,
          text:
            err?.message ||
            "Test natijasini saqlashda xatolik yuz berdi.",
        });
      }
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [
    openLesson,
    lessons,
    done,
    handleComplete,
  ]);

  /*
   * Kursga yozilish
   */
  const handleEnroll = async () => {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await apiFetch("/api/user/enroll", {
        method: "POST",
        body: {
          courseId: id,
        },
      });

      setEnrolled(true);

      mutate((prev) =>
        prev
          ? {
              ...prev,
              enrolled: true,
            }
          : prev
      );

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
   * Loading
   */
  if (loading) {
    return (
      <div className="course-page">
        <SkeletonPageHead />
        <SkeletonLessons />
      </div>
    );
  }

  /*
   * Kurs topilmasa
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

  const doneCount = lessons.filter((lesson) =>
    done.has(lesson.id)
  ).length;

  const pct = lessons.length
    ? Math.round(
        (doneCount / lessons.length) * 100
      )
    : 0;

  const remaining = Math.max(
    lessons.length - doneCount,
    0
  );

  return (
    <>
      {/*
        model-viewer faqat kursda GLB/3D model mavjud bo'lsa yuklanadi.
      */}
      {hasModel && (
        <Script
          type="module"
          src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
          strategy="afterInteractive"
        />
      )}

      <main className="course-page">

        {/* =====================================================
            BREADCRUMB
        ===================================================== */}

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

        {/* =====================================================
            COURSE HERO
        ===================================================== */}

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

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div
            className="course-alert course-alert-error"
            role="alert"
          >
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {/* =====================================================
            REWARD
        ===================================================== */}

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
                  🎉 Yangi daraja:
                  {" "}
                  {reward.newLevel}
                </p>
              )}

              {reward.badges?.length > 0 && (
                <p>
                  🏆 Yangi nishon:
                  {" "}
                  {reward.badges
                    .map((badge) => badge.name)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            PROGRESS
        ===================================================== */}

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
                {doneCount} / {lessons.length}
                {" "}
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

        {/* =====================================================
            LESSONS
        ===================================================== */}

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

          {/* EMPTY */}

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

                const isOpen =
                  openLesson === lesson.id;

                const hasContent = Boolean(
                  lesson.content ||
                  lesson.embed_url ||
                  lesson.model_url ||
                  lesson.test_url
                );

                return (
                  <article
                    key={lesson.id}
                    className={`lesson-card ${
                      isDone
                        ? "lesson-card-done"
                        : ""
                    } ${
                      isOpen
                        ? "lesson-card-open"
                        : ""
                    }`}
                  >

                    {/* ================================
                        LESSON HEADER
                    ================================= */}

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

                      {/* ACTION */}

                      <div className="lesson-card-action">

                        {enrolled &&
                          (hasContent ? (
                            <button
                              type="button"
                              className={
                                isDone
                                  ? "btn btn-ghost btn-sm"
                                  : "btn btn-primary btn-sm"
                              }
                              onClick={() => {
                                setReward(null);
                                setTestMsg(null);

                                setOpenLesson(
                                  isOpen
                                    ? null
                                    : lesson.id
                                );
                              }}
                            >
                              {isOpen
                                ? "Yopish"
                                : isDone
                                ? "Qayta ko‘rish"
                                : "Boshlash"}
                            </button>
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
                          ))}

                      </div>

                    </div>

                    {/* ================================
                        LESSON CONTENT
                    ================================= */}

                    {enrolled && isOpen && (
                      <div className="lesson-inline-content">

                        {/* MA'RUZA */}

                        {lesson.content && (
                          <section className="lesson-inline-block">

                            <div className="lesson-inline-heading">
                              <span>📖</span>

                              <h4>
                                Ma’ruza matni
                              </h4>
                            </div>

                            <div className="lesson-text">
                              {lesson.content}
                            </div>

                          </section>
                        )}

                        {/* 3D MODEL */}

                        {lesson.model_url && (
                          <section className="lesson-inline-block">

                            <div className="lesson-inline-heading">
                              <span>🧊</span>

                              <h4>
                                3D model
                              </h4>
                            </div>

                            <div className="model-viewer-container">

                              <model-viewer
                                src={lesson.model_url}
                                camera-controls
                                auto-rotate
                                ar
                                ar-modes="webxr scene-viewer quick-look"
                                shadow-intensity="1"
                                exposure="1"
                                style={{
                                  width: "100%",
                                  height: 480,
                                  background:
                                    "#eef4ee",
                                  borderRadius: 16,
                                }}
                              />

                            </div>

                            <p className="viewer-help">
                              Modelni barmoq yoki
                              sichqoncha bilan
                              aylantiring. Telefoningiz
                              AR'ni qo‘llab-quvvatlasa,
                              modelni haqiqiy muhitda
                              ko‘rishingiz mumkin.
                            </p>

                          </section>
                        )}

                        {/* EMBED / VR */}

                        {lesson.embed_url && (
                          <section className="lesson-inline-block">

                            <div className="lesson-inline-heading">

                              <span>
                                {lesson.lesson_type ===
                                "vr"
                                  ? "🥽"
                                  : "🔍"}
                              </span>

                              <h4>
                                {lesson.lesson_type ===
                                "vr"
                                  ? "VR muhit"
                                  : "Interaktiv modul"}
                              </h4>

                            </div>

                            <div className="interactive-viewer">

                              <iframe
                                title={
                                  lesson.title
                                }
                                src={
                                  lesson.embed_url
                                }
                                allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope; camera; microphone"
                                allowFullScreen
                                loading="lazy"
                              />

                            </div>

                            {lesson.lesson_type ===
                              "vr" && (
                              <p className="viewer-help">
                                VR ko‘zoynakda ko‘rish
                                uchun modulni to‘liq
                                ekranga oching va VR
                                rejimini tanlang.
                              </p>
                            )}

                          </section>
                        )}

                        {/* TEST */}

                        {lesson.test_url && (
                          <section className="lesson-inline-block">

                            <div className="lesson-test-heading">

                              <div className="lesson-inline-heading">
                                <span>✏️</span>

                                <h4>
                                  Mavzu bo‘yicha test
                                </h4>
                              </div>

                              <a
                                href={
                                  lesson.test_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                              >
                                <DownloadIcon />
                                Yuklab olish
                              </a>

                            </div>

                            <div className="test-viewer">

                              <iframe
                                title={`${lesson.title} — test`}
                                src={
                                  lesson.test_url
                                }
                                loading="lazy"
                              />

                            </div>

                            {testMsg?.lessonId ===
                              lesson.id && (
                              <p
                                className="form-ok lesson-test-message"
                                role="status"
                              >
                                {testMsg.text}
                              </p>
                            )}

                          </section>
                        )}

                        {/* COMPLETE */}

                        <div className="lesson-complete-bar">

                          {!isDone ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-lg"
                                onClick={() =>
                                  handleComplete(
                                    lesson
                                  )
                                }
                                disabled={busy}
                              >
                                {busy
                                  ? "Saqlanmoqda..."
                                  : "✓ Darsni tugatdim"}
                              </button>

                              {lesson.test_url && (
                                <p>
                                  Testni topshirsangiz,
                                  dars avtomatik
                                  tugatilgan deb
                                  belgilanadi.
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="lesson-complete-success">
                              ✓ Bu dars tugatilgan
                            </div>
                          )}

                        </div>

                      </div>
                    )}

                  </article>
                );
              })}

            </div>
          )}

          {/* NOT ENROLLED */}

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
    </>
  );
}