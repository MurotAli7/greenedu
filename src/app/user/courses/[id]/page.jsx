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
  const [openLesson, setOpenLesson] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [testMsg, setTestMsg] = useState(null);

  // Full Screen
  const [fullscreenLesson, setFullscreenLesson] = useState(null);
  const fullscreenRef = useRef(null);

  const hasModel = lessons.some((l) => l.model_url);

  // Kesh bilan bitta API so'rovi
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

  // =========================
  // FULL SCREEN
  // =========================

  const enterFullscreen = async (lessonId) => {
    const element = fullscreenRef.current;

    if (!element) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }

      setFullscreenLesson(lessonId);
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
      console.error("Fullscreendan chiqishda xatolik:", err);
    }

    setFullscreenLesson(null);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenLesson(null);
      }
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

  // =========================
  // TEST NATIJASI
  // =========================

  useEffect(() => {
    const onMessage = async (event) => {
      const payload = event.data;

      if (!payload || payload.type !== TEST_RESULT_MESSAGE || !openLesson) {
        return;
      }

      const lesson = lessons.find((item) => item.id === openLesson);

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

  // =========================
  // KURSGA YOZILISH
  // =========================

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

  // =========================
  // LOADING
  // =========================

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

  const doneCount = lessons.filter((l) => done.has(l.id)).length;

  const pct = lessons.length
    ? Math.round((doneCount / lessons.length) * 100)
    : 0;

  return (
    <>
      {/* 3D model viewer */}
      {hasModel && (
        <Script
          type="module"
          src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
          strategy="afterInteractive"
        />
      )}

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

      {/* Course header */}
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
            {course.category ? ` · ${course.category}` : ""}
          </span>

          <h1 className="page-title" style={{ marginTop: 10 }}>
            {course.title}
          </h1>

          <p className="page-sub">{course.description}</p>
        </div>

        {!enrolled && (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleEnroll}
            disabled={busy}
          >
            {busy ? "Yozilmoqda..." : "Kursga yozilish"}
          </button>
        )}
      </header>

      {/* Progress */}
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

            <span style={{ color: "var(--ink-soft)" }}>
              {doneCount}/{lessons.length} dars · {pct}%
            </span>
          </div>

          <div className="progress">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="form-error"
          role="alert"
          style={{ marginBottom: 14 }}
        >
          {error}
        </p>
      )}

      {/* Reward */}
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

      {/* Lessons */}
      <div className="card">
        {lessons.length === 0 && (
          <p className="state-note">
            Bu kursga hali darslar qo&apos;shilmagan.
          </p>
        )}

        {lessons.map((lesson, i) => {
          const isDone = done.has(lesson.id);
          const isOpen = openLesson === lesson.id;
          const isFullscreen =
            fullscreenLesson === lesson.id;

          const hasContent = Boolean(
            lesson.content ||
              lesson.embed_url ||
              lesson.model_url ||
              lesson.test_url
          );

          return (
            <div key={lesson.id}>
              {/* Lesson row */}
              <div className="lesson-row">
                <span
                  className={`lesson-check ${
                    isDone ? "done" : ""
                  }`}
                >
                  <CheckIcon size={14} />
                </span>

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

                <span className="xp-pill">
                  +{lesson.xp_reward} XP
                </span>

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
                        setOpenLesson(
                          isOpen ? null : lesson.id
                        )
                      }
                    >
                      {isOpen
                        ? "Yopish"
                        : isDone
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

              {/* Lesson content */}
              {enrolled && isOpen && (
                <div
                  style={{
                    padding: "0 18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {/* 1. Lecture */}
                  {lesson.content && (
                    <div
                      className="card card-pad"
                      style={{
                        background: "var(--paper)",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 15,
                          marginBottom: 10,
                        }}
                      >
                        📖 Maruza matni
                      </h3>

                      <div
                        style={{
                          fontSize: 14.5,
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {lesson.content}
                      </div>
                    </div>
                  )}

                  {/* 2. 3D MODEL */}
                  {lesson.model_url && (
                    <div>
                      <h3
                        style={{
                          fontSize: 15,
                          marginBottom: 10,
                        }}
                      >
                        🧊 3D model
                      </h3>

                      <div
                        className="viewfinder viewfinder-sm viewfinder-sun"
                        style={{
                          borderRadius: 10,
                        }}
                      >
                        <span
                          className="vf-b"
                          aria-hidden="true"
                        />

                        <model-viewer
                          src={lesson.model_url}
                          camera-controls
                          auto-rotate
                          ar
                          ar-modes="webxr scene-viewer quick-look"
                          style={{
                            width: "100%",
                            height: 380,
                            background: "#eef4ee",
                            borderRadius: 10,
                          }}
                        />
                      </div>

                      <p
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink-soft)",
                          marginTop: 8,
                        }}
                      >
                        Modelni barmoq/sichqoncha bilan
                        aylantiring. Telefonda &quot;AR&quot;
                        tugmasi orqali modelni xonangizda
                        ko&apos;ring.
                      </p>
                    </div>
                  )}

                  {/* 3. INTERACTIVE / VR MODULE */}
                  {lesson.embed_url && (
                    <div>
                      {/* Title + fullscreen button */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 15,
                            margin: 0,
                          }}
                        >
                          {lesson.lesson_type === "vr"
                            ? "🥽 VR muhit"
                            : "🔍 Interaktiv modul"}
                        </h3>

                        {!isFullscreen && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              enterFullscreen(lesson.id)
                            }
                          >
                            ⛶ To&apos;liq ekran
                          </button>
                        )}
                      </div>

                      {/* Interactive module */}
                      <div
                        ref={
                          isFullscreen
                            ? fullscreenRef
                            : null
                        }
                        className="viewfinder viewfinder-sm embed-wrap"
                        style={{
                          position: "relative",
                          background: "#000",
                          borderRadius: isFullscreen
                            ? 0
                            : undefined,
                          width: "100%",
                          height: isFullscreen
                            ? "100%"
                            : undefined,
                        }}
                      >
                        <span
                          className="vf-b"
                          aria-hidden="true"
                        />

                        <iframe
                          title={lesson.title}
                          src={lesson.embed_url}
                          allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                          allowFullScreen
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            minHeight: isFullscreen
                              ? "100%"
                              : 460,
                            border: 0,
                            display: "block",
                          }}
                        />

                        {/* Fullscreen exit button */}
                        {isFullscreen && (
                          <button
                            type="button"
                            onClick={exitFullscreen}
                            style={{
                              position: "absolute",
                              top: 14,
                              right: 14,
                              zIndex: 9999,
                              padding: "9px 14px",
                              border: "none",
                              borderRadius: 8,
                              background:
                                "rgba(0,0,0,0.75)",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            ✕ Chiqish
                          </button>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink-soft)",
                          marginTop: 8,
                        }}
                      >
                        Modulni to&apos;liq ekran rejimida
                        ko&apos;rish uchun &quot;To&apos;liq
                        ekran&quot; tugmasini bosing. Fullscreen
                        rejimidan chiqish uchun ESC tugmasini
                        ham bosishingiz mumkin.
                      </p>
                    </div>
                  )}

                  {/* 4. HTML TEST */}
                  {lesson.test_url && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          marginBottom: 10,
                          gap: 10,
                        }}
                      >
                        <h3 style={{ fontSize: 15 }}>
                          ✏️ Mavzu bo&apos;yicha test
                        </h3>

                        <a
                          href={lesson.test_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                        >
                          <DownloadIcon /> Yuklab olish
                        </a>
                      </div>

                      <div
                        className="embed-wrap"
                        style={{
                          aspectRatio: "auto",
                          height: 460,
                        }}
                      >
                        <iframe
                          title={`${lesson.title} — test`}
                          src={lesson.test_url}
                          loading="lazy"
                        />
                      </div>

                      {testMsg?.lessonId ===
                        lesson.id && (
                        <p
                          className="form-ok"
                          style={{ marginTop: 10 }}
                        >
                          {testMsg.text}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Complete lesson */}
                  {!isDone && (
                    <div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          handleComplete(lesson)
                        }
                        disabled={busy}
                      >
                        {busy
                          ? "Saqlanmoqda..."
                          : "✅ Darsni tugatdim"}
                      </button>

                      {lesson.test_url && (
                        <p
                          style={{
                            fontSize: 12.5,
                            color: "var(--ink-soft)",
                            marginTop: 8,
                          }}
                        >
                          Testni yechsangiz, dars
                          avtomatik tugatilgan deb
                          belgilanadi.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Not enrolled */}
      {!enrolled && lessons.length > 0 && (
        <p className="state-note">
          Darslarni ochish uchun avval kursga yoziling.
        </p>
      )}
    </>
  );
}