"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
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

  // Ochilgan lesson
  const [openLesson, setOpenLesson] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [testMsg, setTestMsg] = useState(null);

  // Lesson Viewer fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef(null);

  const hasModel = lessons.some((l) => l.model_url);

  // =========================================================
  // COURSE API
  // =========================================================

  const {
    data: courseData,
    loading,
    mutate,
  } = useCachedApi(`/api/user/course?id=${id}`);

  useEffect(() => {
    if (!courseData) return;

    setCourse(courseData.course);
    setLessons(courseData.lessons);
    setEnrolled(courseData.enrolled);
    setDone(new Set(courseData.doneLessonIds));
  }, [courseData]);

  // =========================================================
  // COMPLETE LESSON
  // =========================================================

  const handleComplete = useCallback(
    async (lesson) => {
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
                doneLessonIds: [...prev.doneLessonIds, lesson.id],
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
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [mutate]
  );

  // =========================================================
  // FULLSCREEN
  // =========================================================

  const enterFullscreen = async () => {
    const element = fullscreenRef.current;

    if (!element) {
      console.warn("Fullscreen elementi topilmadi");
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen xatosi:", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen'dan chiqishda xatolik:", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  // =========================================================
  // TEST NATIJASI
  // =========================================================

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

      // XAVFSIZLIK
      let expectedOrigin;

      try {
        expectedOrigin = new URL(lesson.test_url).origin;
      } catch {
        return;
      }

      if (event.origin !== expectedOrigin) return;

      try {
        const result = await apiFetch("/api/user/test-result", {
          method: "POST",
          body: {
            lessonId: lesson.id,
            score: payload.score,
            total: payload.total,
          },
        });

        setTestMsg({
          lessonId: lesson.id,
          text: `Test natijangiz saqlandi: ${payload.score}/${payload.total} (${result.percent}%)`,
        });

        // Test topshirilgach dars avtomatik tugatiladi
        if (!done.has(lesson.id)) {
          await handleComplete(lesson);
        }
      } catch (err) {
        setTestMsg({
          lessonId: lesson.id,
          text: err.message,
        });
      }
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [openLesson, lessons, done, handleComplete]);

  // =========================================================
  // KURSGA YOZILISH
  // =========================================================

  const handleEnroll = async () => {
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
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // =========================================================
  // LESSON OPEN / CLOSE
  // =========================================================

  const openLessonViewer = (lessonId) => {
    setOpenLesson(lessonId);
    setTestMsg(null);
    setError("");
  };

  const closeLessonViewer = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error(err);
      }
    }

    setIsFullscreen(false);
    setOpenLesson(null);
    setTestMsg(null);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonLessons />
      </>
    );
  }

  if (!course) {
    return (
      <p className="state-note card">
        Kurs topilmadi.{" "}
        <Link href="/user">O&apos;quv sahifamga qaytish</Link>
      </p>
    );
  }

  const doneCount = lessons.filter((l) =>
    done.has(l.id)
  ).length;

  const pct = lessons.length
    ? Math.round((doneCount / lessons.length) * 100)
    : 0;

  const activeLesson = lessons.find(
    (lesson) => lesson.id === openLesson
  );

  return (
    <>
      {/* =====================================================
          3D MODEL VIEWER
      ===================================================== */}

      {hasModel && (
        <Script
          type="module"
          src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
          strategy="afterInteractive"
        />
      )}

      {/* =====================================================
          PAGE
      ===================================================== */}

      <div className="course-page">

        {/* Back */}

        <p style={{ marginBottom: 14 }}>
          <Link
            href="/user"
            style={{
              color: "var(--ink-soft)",
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            ← O&apos;quv sahifam
          </Link>
        </p>

        {/* ===================================================
            COURSE HEADER
        =================================================== */}

        <header className="page-head">
          <div>
            <span
              className={`chip ${
                course.content_type === "vr"
                  ? "chip-sky"
                  : course.content_type === "ar"
                  ? "chip-amber"
                  : "chip-green"
              }`}
            >
              {course.content_type === "course"
                ? "Kurs"
                : course.content_type.toUpperCase()}
              {course.category
                ? ` · ${course.category}`
                : ""}
            </span>

            <h1
              className="page-title"
              style={{ marginTop: 10 }}
            >
              {course.title}
            </h1>

            <p className="page-sub">
              {course.description}
            </p>
          </div>

          {!enrolled && (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleEnroll}
              disabled={busy}
            >
              {busy
                ? "Yozilmoqda..."
                : "Kursga yozilish"}
            </button>
          )}
        </header>

        {/* ===================================================
            PROGRESS
        =================================================== */}

        {enrolled && lessons.length > 0 && (
          <div
            className="card card-pad"
            style={{ marginBottom: 18 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13.5,
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                Kurs jarayoni
              </span>

              <span
                style={{
                  color: "var(--ink-soft)",
                }}
              >
                {doneCount}/{lessons.length} dars · {pct}%
              </span>
            </div>

            <div className="progress">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <p
            className="form-error"
            role="alert"
            style={{ marginBottom: 14 }}
          >
            {error}
          </p>
        )}

        {/* ===================================================
            REWARD
        =================================================== */}

        {reward && (
          <div
            className="form-ok"
            role="status"
            style={{ marginBottom: 14 }}
          >
            +{reward.xp} XP qo&apos;shildi!

            {reward.leveledUp &&
              ` 🎉 Yangi daraja: ${reward.newLevel}!`}

            {reward.badges.length > 0 &&
              ` Yangi nishon: ${reward.badges
                .map((b) => b.name)
                .join(", ")}.`}
          </div>
        )}

        {/* ===================================================
            LESSON LIST
        =================================================== */}

        <div className="card">
          {lessons.length === 0 && (
            <p className="state-note">
              Bu kursga hali darslar qo&apos;shilmagan.
            </p>
          )}

          {lessons.map((lesson, i) => {
            const isDone = done.has(lesson.id);

            const hasContent = Boolean(
              lesson.content ||
                lesson.embed_url ||
                lesson.model_url ||
                lesson.test_url
            );

            return (
              <div
                key={lesson.id}
                className="lesson-row"
              >
                {/* Check */}

                <span
                  className={`lesson-check ${
                    isDone ? "done" : ""
                  }`}
                >
                  <CheckIcon size={14} />
                </span>

                {/* Information */}

                <div className="lesson-info">
                  <div className="lesson-title">
                    {i + 1}. {lesson.title}
                  </div>

                  {lesson.summary && (
                    <div className="lesson-sum">
                      {lesson.summary}
                    </div>
                  )}
                </div>

                {/* Type */}

                {lesson.lesson_type !== "text" && (
                  <span
                    className={`chip ${
                      lesson.lesson_type === "vr"
                        ? "chip-sky"
                        : "chip-amber"
                    }`}
                  >
                    {lesson.lesson_type.toUpperCase()}
                  </span>
                )}

                {/* XP */}

                <span className="xp-pill">
                  +{lesson.xp_reward} XP
                </span>

                {/* Button */}

                {enrolled &&
                  (hasContent ? (
                    <button
                      type="button"
                      className={
                        isDone
                          ? "btn btn-ghost btn-sm"
                          : "btn btn-primary btn-sm"
                      }
                      onClick={() =>
                        openLessonViewer(lesson.id)
                      }
                    >
                      {isDone
                        ? "Qayta ko'rish"
                        : "Boshlash"}
                    </button>
                  ) : isDone ? (
                    <span className="chip chip-green">
                      Tugatilgan
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        handleComplete(lesson)
                      }
                      disabled={busy}
                    >
                      Tugatdim
                    </button>
                  ))}
              </div>
            );
          })}
        </div>

        {/* ===================================================
            NOT ENROLLED
        =================================================== */}

        {!enrolled && lessons.length > 0 && (
          <p className="state-note">
            Darslarni ochish uchun avval kursga yoziling.
          </p>
        )}
      </div>

      {/* =====================================================
          LESSON VIEWER
      ===================================================== */}

      {enrolled && activeLesson && (
        <div
          className="lesson-viewer-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={fullscreenRef}
            className={`lesson-viewer ${
              isFullscreen
                ? "lesson-viewer-fullscreen"
                : ""
            }`}
          >

            {/* =================================================
                VIEWER HEADER
            ================================================= */}

            <div className="lesson-viewer-header">

              <div className="lesson-viewer-title">
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    marginBottom: 3,
                  }}
                >
                  {activeLesson.lesson_type === "vr"
                    ? "🥽 VR dars"
                    : activeLesson.model_url
                    ? "🧊 AR / 3D dars"
                    : "📚 Dars"}
                </div>

                <h2>
                  {activeLesson.title}
                </h2>
              </div>

              <div
                className="lesson-viewer-actions"
              >

                {!isFullscreen && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={enterFullscreen}
                  >
                    ⛶ To&apos;liq ekran
                  </button>
                )}

                {isFullscreen && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm viewer-exit-btn"
                    onClick={exitFullscreen}
                  >
                    ✕ To&apos;liq ekrandan chiqish
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeLessonViewer}
                >
                  ✕ Yopish
                </button>

              </div>
            </div>

            {/* =================================================
                VIEWER CONTENT
            ================================================= */}

            <div className="lesson-viewer-content">

              {/* =================================================
                  1. LECTURE
              ================================================= */}

              {activeLesson.content && (
                <section className="lesson-viewer-section">
                  <div className="card card-pad lesson-content-card">
                    <h3>
                      📖 Ma&apos;ruza matni
                    </h3>

                    <div className="lesson-text">
                      {activeLesson.content}
                    </div>
                  </div>
                </section>
              )}

              {/* =================================================
                  2. 3D / AR
              ================================================= */}

              {activeLesson.model_url && (
                <section className="lesson-viewer-section">

                  <h3>
                    🧊 3D / AR model
                  </h3>

                  <div className="model-viewer-container">

                    <model-viewer
                      src={activeLesson.model_url}
                      camera-controls
                      auto-rotate
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      shadow-intensity="1"
                      exposure="1"
                      style={{
                        width: "100%",
                        height: isFullscreen
                          ? "min(70vh, 700px)"
                          : 480,
                        background: "#eef4ee",
                        borderRadius: 12,
                      }}
                    />

                  </div>

                  <p className="viewer-help">
                    Modelni barmoq yoki sichqoncha bilan
                    aylantiring. Telefoningiz AR'ni qo&apos;llab-quvvatlasa,
                    <b> AR </b>
                    tugmasi orqali modelni haqiqiy muhitda
                    ko&apos;rishingiz mumkin.
                  </p>

                </section>
              )}

              {/* =================================================
                  3. VR / INTERACTIVE
              ================================================= */}

              {activeLesson.embed_url && (
                <section className="lesson-viewer-section">

                  <div className="viewer-section-title">
                    <h3>
                      {activeLesson.lesson_type === "vr"
                        ? "🥽 VR muhit"
                        : "🔍 Interaktiv modul"}
                    </h3>
                  </div>

                  <div className="interactive-viewer">

                    <iframe
                      title={activeLesson.title}
                      src={activeLesson.embed_url}
                      allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope; camera; microphone"
                      allowFullScreen
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: isFullscreen
                          ? "calc(100vh - 150px)"
                          : 600,
                        minHeight: 400,
                        border: 0,
                        display: "block",
                        background: "#000",
                      }}
                    />

                  </div>

                  <p className="viewer-help">
                    VR yoki interaktiv modulning o&apos;z
                    boshqaruv tugmalari bo&apos;lishi mumkin.
                    Qurilmangiz va modul qo&apos;llab-quvvatlasa,
                    VR rejimidan foydalanishingiz mumkin.
                  </p>

                </section>
              )}

              {/* =================================================
                  4. HTML TEST
              ================================================= */}

              {activeLesson.test_url && (
                <section className="lesson-viewer-section">

                  <div className="viewer-section-title">

                    <h3>
                      ✏️ Mavzu bo&apos;yicha test
                    </h3>

                    <a
                      href={activeLesson.test_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      <DownloadIcon />
                      Yuklab olish
                    </a>

                  </div>

                  <div
                    className="test-viewer"
                  >
                    <iframe
                      title={`${activeLesson.title} — test`}
                      src={activeLesson.test_url}
                      loading="lazy"
                    />
                  </div>

                  {testMsg?.lessonId ===
                    activeLesson.id && (
                    <p
                      className="form-ok"
                      style={{ marginTop: 10 }}
                    >
                      {testMsg.text}
                    </p>
                  )}

                </section>
              )}

              {/* =================================================
                  5. COMPLETE
              ================================================= */}

              {!done.has(activeLesson.id) && (
                <section className="lesson-complete-section">

                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() =>
                      handleComplete(activeLesson)
                    }
                    disabled={busy}
                  >
                    {busy
                      ? "Saqlanmoqda..."
                      : "✅ Darsni tugatdim"}
                  </button>

                  {activeLesson.test_url && (
                    <p className="viewer-help">
                      Testni yechsangiz, dars avtomatik
                      tugatilgan deb belgilanadi.
                    </p>
                  )}

                </section>
              )}

              {done.has(activeLesson.id) && (
                <section className="lesson-complete-section">

                  <div className="form-ok">
                    ✅ Bu dars tugatilgan.
                  </div>

                </section>
              )}

            </div>

            {/* =================================================
                VIEWER FOOTER
            ================================================= */}

            <div className="lesson-viewer-footer">

              <button
                type="button"
                className="btn btn-ghost"
                disabled={
                  lessons.findIndex(
                    (l) => l.id === activeLesson.id
                  ) <= 0
                }
                onClick={() => {
                  const index =
                    lessons.findIndex(
                      (l) =>
                        l.id === activeLesson.id
                    );

                  if (index > 0) {
                    openLessonViewer(
                      lessons[index - 1].id
                    );
                  }
                }}
              >
                ← Oldingi dars
              </button>

              <span>
                {lessons.findIndex(
                  (l) => l.id === activeLesson.id
                ) + 1}
                {" / "}
                {lessons.length}
              </span>

              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  lessons.findIndex(
                    (l) => l.id === activeLesson.id
                  ) >=
                  lessons.length - 1
                }
                onClick={() => {
                  const index =
                    lessons.findIndex(
                      (l) =>
                        l.id === activeLesson.id
                    );

                  if (
                    index <
                    lessons.length - 1
                  ) {
                    openLessonViewer(
                      lessons[index + 1].id
                    );
                  }
                }}
              >
                Keyingi dars →
              </button>

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEWER CSS
      ===================================================== */}

      <style jsx>{`
        .lesson-viewer-overlay {
          position: fixed;
          inset: 0;
          z-index: 9990;
          background: rgba(0, 0, 0, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .lesson-viewer {
          width: min(1200px, 100%);
          height: min(92vh, 900px);
          background: var(--paper, #fff);
          color: var(--ink, #111);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
        }

        .lesson-viewer:fullscreen {
          width: 100vw;
          height: 100vh;
          max-width: none;
          max-height: none;
          border-radius: 0;
          background: var(--paper, #fff);
        }

        .lesson-viewer-fullscreen {
          border-radius: 0;
        }

        .lesson-viewer-header {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: var(--paper, #fff);
        }

        .lesson-viewer-title {
          min-width: 0;
        }

        .lesson-viewer-title h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.3;
        }

        .lesson-viewer-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .lesson-viewer-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .lesson-viewer-section {
          width: 100%;
        }

        .lesson-viewer-section h3 {
          margin: 0 0 12px;
          font-size: 16px;
        }

        .lesson-content-card {
          background: var(--paper, #fff);
        }

        .lesson-content-card h3 {
          margin-top: 0;
        }

        .lesson-text {
          font-size: 15px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .model-viewer-container {
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          background: #eef4ee;
        }

        .interactive-viewer {
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          background: #000;
        }

        .test-viewer {
          width: 100%;
          height: 520px;
          overflow: hidden;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .test-viewer iframe {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }

        .viewer-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .viewer-section-title h3 {
          margin: 0;
        }

        .viewer-help {
          margin: 8px 0 0;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--ink-soft);
        }

        .lesson-complete-section {
          padding: 18px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.025);
          border: 1px solid rgba(0, 0, 0, 0.07);
        }

        .lesson-viewer-footer {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 20px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          background: var(--paper, #fff);
        }

        .lesson-viewer-footer > span {
          font-size: 13px;
          color: var(--ink-soft);
          white-space: nowrap;
        }

        .viewer-exit-btn {
          border-color: rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 768px) {
          .lesson-viewer-overlay {
            padding: 0;
          }

          .lesson-viewer {
            width: 100%;
            height: 100%;
            border-radius: 0;
          }

          .lesson-viewer-header {
            padding: 12px 14px;
            gap: 10px;
          }

          .lesson-viewer-title h2 {
            font-size: 17px;
          }

          .lesson-viewer-actions {
            gap: 5px;
          }

          .lesson-viewer-actions .btn {
            font-size: 12px;
            padding: 7px 9px;
          }

          .lesson-viewer-content {
            padding: 16px;
            gap: 18px;
          }

          .lesson-viewer-footer {
            padding: 10px 14px;
          }

          .lesson-viewer-footer .btn {
            font-size: 12px;
            padding: 7px 9px;
          }

          .interactive-viewer iframe {
            height: 55vh !important;
            min-height: 350px !important;
          }

          .test-viewer {
            height: 65vh;
            min-height: 400px;
          }

          .model-viewer-container model-viewer {
            height: 55vh !important;
            min-height: 350px;
          }
        }

        @media (max-width: 480px) {
          .lesson-viewer-header {
            align-items: flex-start;
          }

          .lesson-viewer-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .lesson-viewer-actions .btn {
            width: 100%;
          }

          .lesson-viewer-footer {
            gap: 6px;
          }

          .lesson-viewer-footer .btn {
            flex: 1;
          }

          .lesson-viewer-footer > span {
            font-size: 11px;
          }
        }
      `}</style>
    </>
  );
}