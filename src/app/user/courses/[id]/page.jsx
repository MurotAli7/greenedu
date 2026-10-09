"use client";

import {
  useEffect,
  useState,
  use,
  useCallback,
  useRef,
} from "react";

import Link from "next/link";
import Script from "next/script";

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

  /* ============================================================
     COURSE
  ============================================================ */

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [enrolled, setEnrolled] = useState(false);

  const [done, setDone] = useState(new Set());

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [reward, setReward] = useState(null);

  /* ============================================================
     INLINE LESSON

     Endi alohida lesson page yo'q.
     Lesson shu sahifaning ichida ochiladi.
  ============================================================ */

  const [openLesson, setOpenLesson] = useState(null);

  /* ============================================================
     TEST
  ============================================================ */

  const [testMessage, setTestMessage] = useState(null);

  /* ============================================================
     FULLSCREEN
  ============================================================ */

  const [fullscreenLesson, setFullscreenLesson] =
    useState(null);

  const fullscreenRef = useRef(null);

  /* ============================================================
     COURSE DATA
  ============================================================ */

  const courseUrl =
    `/api/user/course?id=${encodeURIComponent(id)}`;

  const {
    data: courseData,
    loading,
    error: apiError,
    mutate,
  } = useCachedApi(courseUrl);

  /* ============================================================
     COURSE DATA -> STATE
  ============================================================ */

  useEffect(() => {
    if (!courseData) return;

    setCourse(
      courseData.course || null
    );

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

  /* ============================================================
     API ERROR
  ============================================================ */

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  /* ============================================================
     LESSON OPEN / CLOSE
  ============================================================ */

  const handleOpenLesson = useCallback(
    (lesson) => {
      if (!lesson?.id) return;

      setError("");
      setReward(null);
      setTestMessage(null);

      setOpenLesson((previous) => {
        if (
          String(previous) ===
          String(lesson.id)
        ) {
          return null;
        }

        return lesson.id;
      });
    },
    []
  );

  /* ============================================================
     LESSON COMPLETE
  ============================================================ */

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

        /* ------------------------------------------------------
           LOCAL STATE DARHOL YANGILANADI
        ------------------------------------------------------ */

        setDone((previous) => {
          const next = new Set(previous);

          next.add(lesson.id);

          return next;
        });

        /* ------------------------------------------------------
           COURSE CACHE YANGILANADI
        ------------------------------------------------------ */

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

        /* ------------------------------------------------------
           DASHBOARD CACHE ESKIRADI
        ------------------------------------------------------ */

        invalidateCache(
          "/api/user/dashboard"
        );

        /* ------------------------------------------------------
           REWARD
        ------------------------------------------------------ */

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

  /* ============================================================
     ENROLL
  ============================================================ */

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

        /* ------------------------------------------------------
           UI DARHOL YANGILANADI
        ------------------------------------------------------ */

        setEnrolled(true);

        /* ------------------------------------------------------
           CACHE YANGILANADI
        ------------------------------------------------------ */

        mutate((previous) => {
          if (!previous) return previous;

          return {
            ...previous,
            enrolled: true,
          };
        });

        /* ------------------------------------------------------
           DASHBOARD CACHE
        ------------------------------------------------------ */

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

  /* ============================================================
     TEST RESULT MESSAGE

     Test iframe'dan natija yuborsa,
     shu yerda qabul qilamiz.
  ============================================================ */

  useEffect(() => {
    const handleMessage = async (event) => {
      const data = event.data;

      if (!data) return;

      if (
        data.type !==
        "TEST_RESULT_MESSAGE"
      ) {
        return;
      }

      if (!openLesson) return;

      const lesson =
        lessons.find(
          (item) =>
            String(item.id) ===
            String(openLesson)
        );

      if (!lesson) return;

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
                  data.score,

                total:
                  data.total,
              },
            }
          );

        setTestMessage({
          lessonId:
            lesson.id,

          text:
            `Test natijasi saqlandi: ${data.score}/${data.total} (${result?.percent ?? 0}%)`,
        });

        /* ------------------------------------------------------
           TESTDAN O'TGAN BO'LSA DARSLARNI YAKUNLASH
        ------------------------------------------------------ */

        if (
          !done.has(
            lesson.id
          )
        ) {
          await handleComplete(
            lesson
          );
        }
      } catch (err) {
        setTestMessage({
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
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, [
    openLesson,
    lessons,
    done,
    handleComplete,
  ]);

  /* ============================================================
     FULLSCREEN
  ============================================================ */

  const openFullscreen =
    useCallback((lessonId) => {
      setFullscreenLesson(
        lessonId
      );

      requestAnimationFrame(
        async () => {
          const element =
            fullscreenRef.current;

          if (!element) return;

          try {
            if (
              document.fullscreenEnabled &&
              element.requestFullscreen
            ) {
              await element.requestFullscreen();
            }
          } catch (err) {
            console.warn(
              "Fullscreen ishlamadi:",
              err
            );
          }
        }
      );
    }, []);

  const closeFullscreen =
    useCallback(async () => {
      try {
        if (
          document.fullscreenElement &&
          document.exitFullscreen
        ) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn(
          "Fullscreen yopilmadi:",
          err
        );
      }

      setFullscreenLesson(
        null
      );
    }, []);

  /* ============================================================
     ESC -> FULLSCREEN EXIT
  ============================================================ */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        fullscreenLesson
      ) {
        closeFullscreen();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    fullscreenLesson,
    closeFullscreen,
  ]);

  /* ============================================================
     PROGRESS
  ============================================================ */

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

  const remaining =
    Math.max(
      lessons.length -
        doneCount,
      0
    );

  /* ============================================================
     LOADING
  ============================================================ */

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

  /* ============================================================
     NOT FOUND
  ============================================================ */

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

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <>
      {/* ========================================================
          MODEL-VIEWER
      ======================================================== */}

      <Script
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        type="module"
      />

      <main className="course-page">

        {/* ======================================================
            BREADCRUMB
        ====================================================== */}

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

        {/* ======================================================
            COURSE HERO
        ====================================================== */}

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

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            className="course-alert course-alert-error"
            role="alert"
          >
            <span>!</span>

            <p>
              {error}
            </p>
          </div>
        )}

        {/* ======================================================
            REWARD
        ====================================================== */}

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

        {/* ======================================================
            PROGRESS
        ====================================================== */}

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
                    width:
                      `${pct}%`,
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

        {/* ======================================================
            LESSONS
        ====================================================== */}

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

          {/* ====================================================
              EMPTY
          ==================================================== */}

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

                      {/* ==========================================
                          LESSON HEADER
                      ========================================== */}

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
                                  : (
                                      lesson.lesson_type ||
                                      "media"
                                    ).toUpperCase()}
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

                        {/* =========================================
                            ACTION
                        ========================================= */}

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

                      {/* ==================================================
                          INLINE LESSON CONTENT

                          MUHIM:
                          Bu yerda boshqa URL'ga o'tilmaydi.
                          Lesson shu page ichida ochiladi.
                      ================================================== */}

                      {enrolled &&
                        isOpen && (
                          <div className="lesson-inline-content">

                            {/* =========================================
                                TEXT
                            ========================================= */}

                            {lesson.content && (
                              <section className="lesson-inline-block">

                                <div className="lesson-inline-heading">

                                  <span>
                                    📖
                                  </span>

                                  <h4>
                                    Dars materiali
                                  </h4>

                                </div>

                                <div className="lesson-text">
                                  {lesson.content}
                                </div>

                              </section>
                            )}

                            {/* =========================================
                                3D / AR MODEL
                            ========================================= */}

                            {lesson.model_url && (
                              <section className="lesson-inline-block">

                                <div className="lesson-inline-heading">

                                  <span>
                                    🧊
                                  </span>

                                  <h4>
                                    3D / AR model
                                  </h4>

                                </div>

                                <div
                                  ref={
                                    isFullscreen
                                      ? fullscreenRef
                                      : null
                                  }
                                  className={
                                    isFullscreen
                                      ? "model-viewer-container lesson-viewer-fullscreen"
                                      : "model-viewer-container"
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
                                    camera-orbit="0deg 75deg 2.5m"
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        isFullscreen
                                          ? "100dvh"
                                          : "500px",
                                      background:
                                        "#eef4ee",
                                      borderRadius:
                                        "16px",
                                    }}
                                  />

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm lesson-fullscreen-btn"
                                    onClick={() =>
                                      isFullscreen
                                        ? closeFullscreen()
                                        : openFullscreen(
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
                                  Modelni sichqoncha
                                  yoki barmoq bilan
                                  aylantiring.
                                  AR tugmasi orqali
                                  modelni haqiqiy
                                  muhitda ko‘rishingiz
                                  mumkin.
                                </p>

                              </section>
                            )}

                            {/* =========================================
                                EMBED / VR / CAMERA / AR
                            ========================================= */}

                            {lesson.embed_url && (
                              <section className="lesson-inline-block">

                                <div className="lesson-inline-heading">

                                  <span>
                                    {lesson.lesson_type ===
                                    "vr"
                                      ? "🥽"
                                      : "🔬"}
                                  </span>

                                  <h4>
                                    {lesson.lesson_type ===
                                    "vr"
                                      ? "VR / interaktiv muhit"
                                      : "Interaktiv modul"}
                                  </h4>

                                </div>

                                <div
                                  ref={
                                    isFullscreen
                                      ? fullscreenRef
                                      : null
                                  }
                                  className={
                                    isFullscreen
                                      ? "interactive-viewer lesson-viewer-fullscreen"
                                      : "interactive-viewer"
                                  }
                                  style={{
                                    position:
                                      "relative",
                                    width:
                                      "100%",
                                    overflow:
                                      "hidden",
                                    borderRadius:
                                      "16px",
                                    background:
                                      "#111",
                                  }}
                                >

                                  <iframe
                                    title={
                                      lesson.title
                                    }
                                    src={
                                      lesson.embed_url
                                    }

                                    /*
                                     * MUHIM:
                                     * Kamera, mikrofon,
                                     * WebXR va sensorlar
                                     * uchun ruxsat.
                                     */

                                    allow="
                                      autoplay *;
                                      fullscreen *;
                                      camera *;
                                      microphone *;
                                      xr-spatial-tracking *;
                                      accelerometer *;
                                      gyroscope *;
                                      gamepad *;
                                      web-share *
                                    "

                                    allowFullScreen

                                    webkitallowfullscreen="true"

                                    mozallowfullscreen="true"

                                    loading="eager"

                                    referrerPolicy="strict-origin-when-cross-origin"

                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        isFullscreen
                                          ? "100dvh"
                                          : "650px",
                                      border:
                                        "0",
                                      display:
                                        "block",
                                      background:
                                        "#111",
                                    }}
                                  />

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm lesson-fullscreen-btn"
                                    onClick={() =>
                                      isFullscreen
                                        ? closeFullscreen()
                                        : openFullscreen(
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
                                  {lesson.lesson_type ===
                                  "vr"
                                    ? "VR uchun WebXR qo‘llab-quvvatlaydigan qurilma va brauzer kerak. Meta Quest kabi VR qurilmalarida Quest Browser orqali ochish tavsiya etiladi."
                                    : "Kamera yoki AR funksiyasi ishlashi uchun brauzerda kamera ruxsatini bering."
                                  }
                                </p>

                              </section>
                            )}

                            {/* =========================================
                                TEST
                            ========================================= */}

                            {lesson.test_url && (
                              <section className="lesson-inline-block">

                                <div className="lesson-inline-heading">

                                  <span>
                                    ✏️
                                  </span>

                                  <h4>
                                    Mavzu bo‘yicha test
                                  </h4>

                                </div>

                                <div className="test-viewer">

                                  <iframe
                                    title={`${lesson.title} — test`}
                                    src={
                                      lesson.test_url
                                    }

                                    allow="
                                      fullscreen *;
                                      camera *;
                                      microphone *
                                    "

                                    allowFullScreen

                                    loading="eager"

                                    referrerPolicy="strict-origin-when-cross-origin"

                                    style={{
                                      width:
                                        "100%",
                                      minHeight:
                                        "600px",
                                      border:
                                        "0",
                                      borderRadius:
                                        "16px",
                                      display:
                                        "block",
                                    }}
                                  />

                                </div>

                                {testMessage?.lessonId ===
                                  lesson.id && (
                                  <p
                                    className="form-ok lesson-test-message"
                                    role="status"
                                  >
                                    {
                                      testMessage.text
                                    }
                                  </p>
                                )}

                              </section>
                            )}

                            {/* =========================================
                                COMPLETE BUTTON
                            ========================================= */}

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
                                      topshirgandan
                                      so‘ng natija
                                      avtomatik
                                      saqlanadi.
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

          {/* ======================================================
              NOT ENROLLED
          ====================================================== */}

          {!enrolled &&
            lessons.length > 0 && (
              <div className="course-enroll-note">

                <span>
                  🔒
                </span>

                <div>

                  <strong>
                    Darslarni ochish uchun
                    kursga yoziling
                  </strong>

                  <p>
                    Kursga yozilgandan
                    so‘ng barcha
                    interaktiv darslar,
                    testlar va AR/VR
                    materiallardan
                    foydalanishingiz
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