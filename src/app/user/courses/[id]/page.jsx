
"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import Script from "next/script";

import {
  CheckIcon,
  DownloadIcon,
} from "@/components/Icons";

import {
  SkeletonPageHead,
  SkeletonLessons,
} from "@/components/Skeleton";

import { apiFetch } from "@/lib/api/client";

import {
  useCachedApi,
  invalidateCache,
  prefetchApi,
} from "@/lib/api/useCached";

import { TEST_RESULT_MESSAGE } from "@/lib/constants";

export default function CoursePage({ params }) {
  const { id } = use(params);

  /* =========================================================
     STATE
  ========================================================= */

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [enrolled, setEnrolled] = useState(false);

  const [done, setDone] = useState(new Set());

  const [openLesson, setOpenLesson] = useState(null);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [reward, setReward] = useState(null);

  const [testMsg, setTestMsg] = useState(null);

  /* =========================================================
     FULLSCREEN
  ========================================================= */

  const [fullscreenLesson, setFullscreenLesson] =
    useState(null);

  const fullscreenRef = useRef(null);

  /* =========================================================
     COURSE API
  ========================================================= */

  const courseUrl = useMemo(
    () =>
      `/api/user/course?id=${encodeURIComponent(id)}`,
    [id]
  );

  const {
    data: courseData,
    loading,
    error: apiError,
    mutate,
    refresh,
  } = useCachedApi(courseUrl);

  /* =========================================================
     COURSE DATA -> STATE

     API javobidan kelgan ma'lumot darhol UI'ga tushadi.
  ========================================================= */

  useEffect(() => {
    if (!courseData) return;

    setCourse(courseData.course || null);

    setLessons(
      Array.isArray(courseData.lessons)
        ? courseData.lessons
        : []
    );

    setEnrolled(
      Boolean(courseData.enrolled)
    );

    setDone(
      new Set(
        Array.isArray(
          courseData.doneLessonIds
        )
          ? courseData.doneLessonIds
          : []
      )
    );
  }, [courseData]);

  /* =========================================================
     ERROR
  ========================================================= */

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  /* =========================================================
     BACKGROUND PRELOAD

     Kurs ochilgandan keyin browser imkoniga qarab
     keyingi API ma'lumotlarini fonda tayyorlaymiz.

     Hozir mavjud API'dan foydalanamiz.
     ========================================================= */

  useEffect(() => {
    if (!id || !courseData) return;

    /*
     * Browser idle holatida cache refresh.
     *
     * Bu sahifani bloklamaydi.
     */
    const run = () => {
      prefetchApi(courseUrl, {
        ttl: 60_000,
      }).catch(() => {});
    };

    if (
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
    ) {
      const callbackId =
        window.requestIdleCallback(run, {
          timeout: 3000,
        });

      return () => {
        window.cancelIdleCallback(callbackId);
      };
    }

    const timer = setTimeout(run, 1200);

    return () => {
      clearTimeout(timer);
    };
  }, [id, courseData, courseUrl]);

  /* =========================================================
     LESSON OPEN

     Endi boshqa page'ga o'tmaydi.
     Shu sahifaning ichida ochiladi.
  ========================================================= */

  const openLessonData = useMemo(() => {
    if (!openLesson) return null;

    return (
      lessons.find(
        (lesson) =>
          String(lesson.id) ===
          String(openLesson)
      ) || null
    );
  }, [lessons, openLesson]);

  const handleOpenLesson = useCallback(
    (lesson) => {
      if (!lesson) return;

      setError("");
      setReward(null);
      setTestMsg(null);

      setOpenLesson((previous) =>
        String(previous) ===
        String(lesson.id)
          ? null
          : lesson.id
      );

      /*
       * Lesson content browser cache'da bo'lsa,
       * darhol ishlatiladi.
       */
    },
    []
  );

  /* =========================================================
     COMPLETE LESSON
  ========================================================= */

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
         * UI darhol yangilanadi.
         */

        setDone((previous) => {
          const next = new Set(previous);

          next.add(lesson.id);

          return next;
        });

        /*
         * Course cache ham yangilanadi.
         */

        mutate((previous) => {
          if (!previous) return previous;

          const currentDone =
            Array.isArray(
              previous.doneLessonIds
            )
              ? previous.doneLessonIds
              : [];

          if (
            currentDone.includes(
              lesson.id
            )
          ) {
            return previous;
          }

          return {
            ...previous,

            doneLessonIds: [
              ...currentDone,
              lesson.id,
            ],
          };
        });

        /*
         * Dashboard cache eskiradi.
         */

        invalidateCache(
          "/api/user/dashboard"
        );

        /*
         * Reward
         */

        if (!json?.already) {
          setReward({
            xp:
              json?.xpEarned || 0,

            leveledUp:
              Boolean(
                json?.leveledUp
              ),

            newLevel:
              json?.newLevel,

            badges:
              json?.newBadges || [],
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

  /* =========================================================
     ENROLL
  ========================================================= */

  const handleEnroll = useCallback(
    async () => {
      if (busy) return;

      setBusy(true);
      setError("");
      setReward(null);

      try {
        await apiFetch(
          "/api/user/enroll",
          {
            method: "POST",
            body: {
              courseId: id,
            },
          }
        );

        setEnrolled(true);

        mutate((previous) =>
          previous
            ? {
                ...previous,
                enrolled: true,
              }
            : previous
        );

        invalidateCache(
          "/api/user/dashboard"
        );
      } catch (err) {
        setError(
          err?.message ||
            "Kursga yozilishda xatolik yuz berdi."
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, id, mutate]
  );

  /* =========================================================
     TEST MESSAGE
  ========================================================= */

  useEffect(() => {
    const onMessage = async (event) => {
      const payload = event.data;

      if (
        !payload ||
        payload.type !==
          TEST_RESULT_MESSAGE ||
        !openLesson
      ) {
        return;
      }

      const lesson = lessons.find(
        (item) =>
          String(item.id) ===
          String(openLesson)
      );

      if (
        !lesson ||
        !lesson.test_url
      ) {
        return;
      }

      /*
       * Xavfsizlik:
       * test faqat o'z originidan kelishi kerak.
       */

      let expectedOrigin;

      try {
        expectedOrigin =
          new URL(
            lesson.test_url
          ).origin;
      } catch {
        return;
      }

      if (
        event.origin !==
        expectedOrigin
      ) {
        return;
      }

      try {
        const result =
          await apiFetch(
            "/api/user/test-result",
            {
              method: "POST",

              body: {
                lessonId:
                  lesson.id,

                score:
                  payload.score,

                total:
                  payload.total,
              },
            }
          );

        setTestMsg({
          lessonId:
            lesson.id,

          text: `Test natijangiz saqlandi: ${payload.score}/${payload.total} (${result.percent}%)`,
        });

        /*
         * Testdan o'tgan bo'lsa,
         * darsni avtomatik tugatamiz.
         */

        if (
          !done.has(lesson.id)
        ) {
          await handleComplete(
            lesson
          );
        }
      } catch (err) {
        setTestMsg({
          lessonId:
            lesson.id,

          text:
            err?.message ||
            "Test natijasini saqlashda xatolik yuz berdi.",
        });
      }
    };

    window.addEventListener(
      "message",
      onMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        onMessage
      );
    };
  }, [
    openLesson,
    lessons,
    done,
    handleComplete,
  ]);

  /* =========================================================
     FULLSCREEN
  ========================================================= */

  const enterFullscreen =
    useCallback(async (lessonId) => {
      setFullscreenLesson(
        lessonId
      );

      /*
       * React render qilishi uchun
       * keyingi frame'da elementni olamiz.
       */

      requestAnimationFrame(
        async () => {
          const element =
            fullscreenRef.current;

          if (!element) return;

          try {
            if (
              document.fullscreenEnabled &&
              !document.fullscreenElement &&
              element.requestFullscreen
            ) {
              await element.requestFullscreen(
                {
                  navigationUI:
                    "hide",
                }
              );
            }
          } catch (err) {
            /*
             * Browser Fullscreen API
             * bloklansa ham CSS fullscreen
             * ishlaydi.
             */
            console.warn(
              "Browser fullscreen ishlamadi:",
              err
            );
          }
        }
      );
    }, []);

  const exitFullscreen =
    useCallback(async () => {
      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn(
          "Fullscreen exit:",
          err
        );
      }

      setFullscreenLesson(
        null
      );
    }, []);

  useEffect(() => {
    const onFullscreenChange =
      () => {
        if (
          !document.fullscreenElement &&
          fullscreenLesson
        ) {
          /*
           * CSS fullscreen emas,
           * faqat browser fullscreen chiqdi.
           */
        }
      };

    document.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
    };
  }, [fullscreenLesson]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        fullscreenLesson
      ) {
        exitFullscreen();
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [
    fullscreenLesson,
    exitFullscreen,
  ]);

  /* =========================================================
     PROGRESS
  ========================================================= */

  const doneCount =
    lessons.filter((lesson) =>
      done.has(lesson.id)
    ).length;

  const pct =
    lessons.length > 0
      ? Math.round(
          (doneCount /
            lessons.length) *
            100
        )
      : 0;

  const remaining = Math.max(
    lessons.length -
      doneCount,
    0
  );

  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading &&
    !course
  ) {
    return (
      <main className="course-page">
        <SkeletonPageHead />

        <SkeletonLessons />
      </main>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!course) {
    return (
      <main className="course-page">
        <section className="course-not-found">
          <div className="course-not-found-icon">
            📚
          </div>

          <h1>
            Kurs topilmadi
          </h1>

          <p>
            Ushbu kurs mavjud emas
            yoki uni ko‘rish
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

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <Script
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        type="module"
      />

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
            HERO
        ===================================================== */}

        <section className="course-hero">

          <div className="course-hero-main">

            <div className="course-label-row">

              <span
                className={`course-type ${
                  course.content_type ===
                  "vr"
                    ? "course-type-vr"
                    : course.content_type ===
                      "ar"
                    ? "course-type-ar"
                    : "course-type-course"
                }`}
              >
                {course.content_type ===
                "course"
                  ? "KURS"
                  : course.content_type ===
                    "ar"
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
                Kursga yoziling va
                darslarni ketma-ket
                o‘rganing.
              </p>

              <button
                type="button"
                className="btn btn-primary btn-lg course-enroll-btn"
                onClick={
                  handleEnroll
                }
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
                  🎉 Yangi daraja:{" "}
                  {reward.newLevel}
                </p>
              )}

              {reward.badges?.length >
                0 && (
                <p>
                  🏆 Yangi nishon:{" "}
                  {reward.badges
                    .map(
                      (badge) =>
                        badge.name
                    )
                    .join(", ")}
                </p>
              )}

            </div>
          </div>
        )}

        {/* =====================================================
            PROGRESS
        ===================================================== */}

        {enrolled &&
          lessons.length > 0 && (
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
                  {doneCount} /{" "}
                  {lessons.length}{" "}
                  dars tugatilgan
                </span>

                {pct === 100 ? (
                  <span className="progress-complete">
                    ✓ Barcha darslar tugatildi
                  </span>
                ) : (
                  <span>
                    Yana {remaining} ta
                    dars qoldi
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
                Darslarni ketma-ket
                o‘rganing va har bir
                yakunlangan mashg‘ulot
                uchun XP oling.
              </p>

            </div>

            {lessons.length > 0 && (
              <div
                className="lessons-count"
                aria-label={`${doneCount} ta dars tugatilgan`}
              >
                {doneCount}/
                {lessons.length}
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
                Hali darslar
                qo‘shilmagan
              </h3>

              <p>
                Ushbu kursga hozircha
                darslar joylashtirilmagan.
              </p>

            </div>
          ) : (

            <div className="lessons-list">

              {lessons.map(
                (lesson, index) => {

                  const isDone =
                    done.has(
                      lesson.id
                    );

                  const isOpen =
                    String(
                      openLesson
                    ) ===
                    String(
                      lesson.id
                    );

                  const hasContent =
                    Boolean(
                      lesson.content ||
                        lesson.embed_url ||
                        lesson.model_url ||
                        lesson.test_url
                    );

                  const isFullscreen =
                    String(
                      fullscreenLesson
                    ) ===
                    String(
                      lesson.id
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

                      {/* =================================================
                          LESSON HEADER
                      ================================================= */}

                      <div className="lesson-card-main">

                        <div
                          className={`lesson-number ${
                            isDone
                              ? "lesson-number-done"
                              : ""
                          }`}
                        >
                          {isDone ? (
                            <CheckIcon
                              size={17}
                            />
                          ) : (
                            String(
                              index + 1
                            ).padStart(
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

                          {enrolled ? (
                            hasContent ? (
                              <button
                                type="button"
                                className={
                                  isDone
                                    ? "btn btn-ghost btn-sm"
                                    : "btn btn-primary btn-sm"
                                }
                                onClick={() =>
                                  handleOpenLesson(
                                    lesson
                                  )
                                }
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
                            )
                          ) : (
                            <span className="lesson-finished">
                              🔒
                            </span>
                          )}

                        </div>

                      </div>

                      {/* =================================================
                          LESSON CONTENT
                      ================================================= */}

                      {enrolled &&
                        isOpen && (
                          <div className="lesson-inline-content">

                            {/* MA'RUZA */}

                            {lesson.content && (
                              <section className="lesson-inline-block">

                                <div className="lesson-inline-heading">

                                  <span>
                                    📖
                                  </span>

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

                                  <span>
                                    🧊
                                  </span>

                                  <h4>
                                    3D model
                                  </h4>

                                </div>

                                <div
                                  className={
                                    isFullscreen
                                      ? "model-viewer-container lesson-viewer-fullscreen"
                                      : "model-viewer-container"
                                  }
                                  ref={
                                    isFullscreen
                                      ? fullscreenRef
                                      : null
                                  }
                                >

                                  <model-viewer
                                    src={
                                      lesson.model_url
                                    }
                                    alt={
                                      lesson.title
                                    }
                                    camera-controls
                                    auto-rotate
                                    ar
                                    ar-modes="webxr scene-viewer quick-look"
                                    shadow-intensity="1"
                                    exposure="1"
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        isFullscreen
                                          ? "100dvh"
                                          : 480,
                                      background:
                                        "#eef4ee",
                                      borderRadius:
                                        16,
                                    }}
                                  />

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm lesson-fullscreen-btn"
                                    onClick={() =>
                                      isFullscreen
                                        ? exitFullscreen()
                                        : enterFullscreen(
                                            lesson.id
                                          )
                                    }
                                  >
                                    {isFullscreen
                                      ? "✕ Yopish"
                                      : "⛶ To‘liq ekran"}
                                  </button>

                                </div>

                                <p className="viewer-help">
                                  Modelni barmoq
                                  yoki sichqoncha
                                  bilan aylantiring.
                                  Telefoningiz AR'ni
                                  qo‘llab-quvvatlasa,
                                  modelni haqiqiy
                                  muhitda ko‘rishingiz
                                  mumkin.
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

                                <div
                                  className={
                                    isFullscreen
                                      ? "interactive-viewer lesson-viewer-fullscreen"
                                      : "interactive-viewer"
                                  }
                                  ref={
                                    isFullscreen
                                      ? fullscreenRef
                                      : null
                                  }
                                >

                                  <iframe
                                    title={
                                      lesson.title
                                    }
                                    src={
                                      lesson.embed_url
                                    }
                                    allow="
                                      autoplay *;
                                      fullscreen *;
                                      xr-spatial-tracking *;
                                      camera *;
                                      microphone *;
                                      accelerometer *;
                                      gyroscope *;
                                      gamepad *;
                                      web-share *
                                    "
                                    allowFullScreen
                                    webkitallowfullscreen="true"
                                    mozallowfullscreen="true"
                                    loading="lazy"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                  />

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm lesson-fullscreen-btn"
                                    onClick={() =>
                                      isFullscreen
                                        ? exitFullscreen()
                                        : enterFullscreen(
                                            lesson.id
                                          )
                                    }
                                  >
                                    {isFullscreen
                                      ? "✕ Yopish"
                                      : "⛶ To‘liq ekran"}
                                  </button>

                                </div>

                                {lesson.lesson_type ===
                                  "vr" && (
                                  <p className="viewer-help">
                                    VR ko‘zoynakda
                                    ko‘rish uchun
                                    modulni to‘liq
                                    ekranga oching va
                                    VR rejimini
                                    tanlang.
                                  </p>
                                )}

                              </section>
                            )}

                            {/* TEST */}

                            {lesson.test_url && (
                              <section className="lesson-inline-block">

                                <div className="lesson-test-heading">

                                  <div className="lesson-inline-heading">

                                    <span>
                                      ✏️
                                    </span>

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
                                    allow="
                                      fullscreen *;
                                      camera *;
                                      microphone *;
                                    "
                                    allowFullScreen
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
                                      Testni
                                      topshirsangiz,
                                      dars avtomatik
                                      tugatilgan deb
                                      belgilanadi.
                                    </p>
                                  )}
                                </>
                              ) : (
                                <div className="lesson-complete-success">
                                  ✓ Bu dars
                                  tugatilgan
                                </div>
                              )}

                            </div>

                          </div>
                        )}

                    </article>
                  );
                }
              )}

            </div>
          )}

          {/* =====================================================
              NOT ENROLLED
          ===================================================== */}

          {!enrolled &&
            lessons.length > 0 && (
              <div className="course-enroll-note">

                <span>🔒</span>

                <div>

                  <strong>
                    Darslarni ochish uchun
                    kursga yoziling
                  </strong>

                  <p>
                    Kursga yozilgandan so‘ng
                    barcha interaktiv darslar,
                    testlar va AR/VR
                    materiallardan foydalanishingiz
                    mumkin.
                  </p>

                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    handleEnroll
                  }
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
