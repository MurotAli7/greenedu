
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

  // STATE
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [done, setDone] = useState(new Set());
  const [openLesson, setOpenLesson] = useState(null);

  const [lessonDetails, setLessonDetails] = useState(
    () => new Map()
  );

  const [lessonLoading, setLessonLoading] = useState(
    () => new Set()
  );

  const requestsRef = useRef(new Map());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [testMsg, setTestMsg] = useState(null);

  const [fullscreenLesson, setFullscreenLesson] =
    useState(null);

  const fullscreenRef = useRef(null);

  // API URL'LAR
  const courseUrl = useMemo(
    () =>
      `/api/user/course?id=${encodeURIComponent(id)}`,
    [id]
  );

  const lessonsUrl = useMemo(
    () =>
      `/api/user/course/lessons?id=${encodeURIComponent(id)}`,
    [id]
  );

  const lessonUrl = useCallback(
    (lessonId) =>
      `/api/user/course/lesson?courseId=${encodeURIComponent(
        id
      )}&lessonId=${encodeURIComponent(lessonId)}`,
    [id]
  );

  // KURS API
  const {
    data: courseData,
    loading: courseLoading,
    error: courseError,
    mutate: mutateCourse,
  } = useCachedApi(courseUrl);

  // DARSLAR API
  const {
    data: lessonsData,
    loading: lessonsLoading,
    error: lessonsError,
    mutate: mutateLessons,
  } = useCachedApi(lessonsUrl);

  // KURS MA'LUMOTLARI
  useEffect(() => {
    if (!courseData) return;

    setCourse(courseData.course || null);
    setEnrolled(Boolean(courseData.enrolled));
  }, [courseData]);

  // DARSLAR VA PROGRESS
  useEffect(() => {
    if (!lessonsData) return;

    setLessons(
      Array.isArray(lessonsData.lessons)
        ? lessonsData.lessons
        : []
    );

    setDone(
      new Set(
        Array.isArray(lessonsData.doneLessonIds)
          ? lessonsData.doneLessonIds
          : []
      )
    );

    if (typeof lessonsData.enrolled === "boolean") {
      setEnrolled(lessonsData.enrolled);
    }
  }, [lessonsData]);

  // API XATOLARI
  useEffect(() => {
    if (courseError || lessonsError) {
      setError(
        courseError ||
          lessonsError ||
          "Ma'lumotlarni yuklab bo'lmadi."
      );
    }
  }, [courseError, lessonsError]);

  // BIR DARSNING TO'LIQ MA'LUMOTINI YUKLASH
  const loadLessonDetail = useCallback(
    async (lesson) => {
      if (!lesson?.id || !enrolled) {
        return null;
      }

      const key = String(lesson.id);

      const cached = lessonDetails.get(key);

      if (cached) {
        return cached;
      }

      // Oldindan boshlangan preload so'rovi bo'lsa,
      // shu so'rovning natijasidan foydalanamiz.
      const existingRequest = requestsRef.current.get(key);

      if (existingRequest) {
        setLessonLoading((previous) => {
          const next = new Set(previous);
          next.add(key);
          return next;
        });

        try {
          return await existingRequest;
        } finally {
          setLessonLoading((previous) => {
            const next = new Set(previous);
            next.delete(key);
            return next;
          });
        }
      }

      setLessonLoading((previous) => {
        const next = new Set(previous);
        next.add(key);
        return next;
      });

      const request = (async () => {
        try {
          const response = await apiFetch(
            lessonUrl(lesson.id)
          );

          const detail = response?.lesson || response;

          if (
            !detail ||
            typeof detail !== "object"
          ) {
            throw new Error(
              "Dars ma'lumotlari topilmadi."
            );
          }

          const merged = {
            ...lesson,
            ...detail,
          };

          setLessonDetails((previous) => {
            const next = new Map(previous);
            next.set(key, merged);
            return next;
          });

          setError("");
          return merged;
        } catch (err) {
          console.error(
            "LESSON DETAIL ERROR:",
            err
          );

          setError(
            err?.message ||
              "Dars ma'lumotlarini yuklab bo'lmadi."
          );

          return null;
        } finally {
          requestsRef.current.delete(key);

          setLessonLoading((previous) => {
            const next = new Set(previous);
            next.delete(key);
            return next;
          });
        }
      })();

      requestsRef.current.set(key, request);

      return request;
    },
    [
      enrolled,
      lessonDetails,
      lessonUrl,
    ]
  );

  // KEYINGI DARSLARNI FONDA PRELOAD QILISH
  const preloadLesson = useCallback(
    (lesson) => {
      if (!lesson?.id) return;

      const key = String(lesson.id);

      if (
        lessonDetails.has(key) ||
        requestsRef.current.has(key)
      ) {
        return;
      }

      const request = prefetchApi(
        lessonUrl(lesson.id)
      )
        .then((response) => {
          const detail = response?.lesson || response;

          if (
            !detail ||
            typeof detail !== "object"
          ) {
            return null;
          }

          const merged = {
            ...lesson,
            ...detail,
          };

          setLessonDetails((previous) => {
            const next = new Map(previous);
            next.set(key, merged);
            return next;
          });

          return merged;
        })
        .catch((err) => {
          console.warn(
            "Lesson preload failed:",
            key,
            err
          );

          return null;
        })
        .finally(() => {
          requestsRef.current.delete(key);
        });

      requestsRef.current.set(key, request);
    },
    [lessonDetails, lessonUrl]
  );

  // BIRINCHI IKKITA DARSNI FONDA YUKLASH
  useEffect(() => {
    if (!enrolled || lessons.length === 0) {
      return;
    }

    const run = () => {
      lessons.slice(0, 2).forEach(preloadLesson);
    };

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(run, {
        timeout: 1500,
      });

      return () => {
        window.cancelIdleCallback(handle);
      };
    }

    const timer = window.setTimeout(run, 300);

    return () => window.clearTimeout(timer);
  }, [enrolled, lessons, preloadLesson]);

  // DARSNI OCHISH / YOPISH
  const handleOpenLesson = useCallback(
    (lesson) => {
      if (!lesson?.id || !enrolled) return;

      const key = String(lesson.id);

      setError("");
      setReward(null);
      setTestMsg(null);

      if (String(openLesson) === key) {
        setOpenLesson(null);
        return;
      }

      // UI avval ochiladi, material fonda yuklanadi.
      setOpenLesson(lesson.id);

      if (!lessonDetails.has(key)) {
        void loadLessonDetail(lesson);
      }

      const index = lessons.findIndex(
        (item) => String(item.id) === key
      );

      if (index >= 0) {
        lessons
          .slice(index + 1, index + 3)
          .forEach(preloadLesson);
      }
    },
    [
      enrolled,
      openLesson,
      lessonDetails,
      lessons,
      loadLessonDetail,
      preloadLesson,
    ]
  );

  // DARSNI TUGATISH
  const handleComplete = useCallback(
    async (lesson) => {
      if (
        !lesson?.id ||
        busy ||
        done.has(lesson.id)
      ) {
        return;
      }

      setBusy(true);
      setError("");
      setReward(null);

      try {
        const result = await apiFetch(
          "/api/user/complete-lesson",
          {
            method: "POST",
            body: {
              lessonId: lesson.id,
            },
          }
        );

        setDone((previous) => {
          const next = new Set(previous);
          next.add(lesson.id);
          return next;
        });

        mutateLessons((previous) => {
          if (!previous) return previous;

          const ids = new Set(
            previous.doneLessonIds || []
          );

          ids.add(lesson.id);

          return {
            ...previous,
            doneLessonIds: Array.from(ids),
          };
        });

        invalidateCache("/api/user/dashboard");

        if (!result?.already) {
          setReward({
            xp: result?.xpEarned || 0,
            leveledUp: Boolean(result?.leveledUp),
            newLevel: result?.newLevel,
            badges: result?.newBadges || [],
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
    [busy, done, mutateLessons]
  );

  // KURSGA YOZILISH
  const handleEnroll = useCallback(
    async () => {
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

        setEnrolled(true);

        mutateCourse((previous) =>
          previous
            ? {
                ...previous,
                enrolled: true,
              }
            : previous
        );

        mutateLessons((previous) =>
          previous
            ? {
                ...previous,
                enrolled: true,
              }
            : previous
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
    },
    [
      busy,
      id,
      mutateCourse,
      mutateLessons,
    ]
  );

  // TEST NATIJASI
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

      const baseLesson = lessons.find(
        (item) =>
          String(item.id) === String(openLesson)
      );

      const lesson = baseLesson
        ? {
            ...baseLesson,
            ...(
              lessonDetails.get(
                String(openLesson)
              ) || {}
            ),
          }
        : null;

      if (!lesson?.test_url) return;

      let expectedOrigin;

      try {
        expectedOrigin = new URL(
          lesson.test_url,
          window.location.href
        ).origin;
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
          text: `Test natijasi saqlandi: ${payload.score}/${payload.total} (${result?.percent ?? 0}%)`,
        });

        if (!done.has(lesson.id)) {
          await handleComplete(lesson);
        }
      } catch (err) {
        setTestMsg({
          lessonId: lesson.id,
          text:
            err?.message ||
            "Test natijasini saqlab bo'lmadi.",
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
    lessonDetails,
    done,
    handleComplete,
  ]);

  // FULLSCREEN
  const enterFullscreen = useCallback(
    async (lessonId) => {
      setFullscreenLesson(lessonId);

      requestAnimationFrame(async () => {
        const element = fullscreenRef.current;

        if (!element) return;

        try {
          if (
            document.fullscreenEnabled &&
            !document.fullscreenElement &&
            element.requestFullscreen
          ) {
            await element.requestFullscreen({
              navigationUI: "hide",
            });
          }
        } catch (err) {
          console.warn("Fullscreen xatosi:", err);
        }
      });
    },
    []
  );

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen exit:", err);
    }

    setFullscreenLesson(null);
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenLesson(null);
      }
    };

    document.addEventListener("fullscreenchange", onChange);

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        onChange
      );
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        fullscreenLesson
      ) {
        exitFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenLesson, exitFullscreen]);

  // PROGRESS
  const doneCount = lessons.filter((lesson) =>
    done.has(lesson.id)
  ).length;

  const pct =
    lessons.length > 0
      ? Math.round((doneCount / lessons.length) * 100)
      : 0;

  const remaining = Math.max(
    lessons.length - doneCount,
    0
  );

  // LOADING
  if (courseLoading && !course) {
    return (
      <main className="course-page">
        <SkeletonPageHead />
        <SkeletonLessons />
      </main>
    );
  }

  // NOT FOUND
  if (!course) {
    return (
      <main className="course-page">
        <section className="course-not-found">
          <div className="course-not-found-icon">
            📚
          </div>

          <h1>Kurs topilmadi</h1>

          <p>
            Ushbu kurs mavjud emas yoki uni ko'rish
            imkoniyati yo'q.
          </p>

          <Link href="/user" className="btn btn-primary">
            O'quv sahifamga qaytish
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        type="module"
      />

      <main className="course-page">
        <nav
          className="course-breadcrumb"
          aria-label="Navigatsiya"
        >
          <Link href="/user">O'quv sahifam</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{course.title}</span>
        </nav>

        {/* HERO */}
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
              <span>📚 {lessons.length} ta dars</span>
              <span>⚡ XP mukofotlari</span>

              {enrolled && (
                <span className="course-enrolled-meta">
                  ✓ Kursga yozilgansiz
                </span>
              )}
            </div>
          </div>

          {!enrolled && (
            <div className="course-hero-action">
              <div className="course-action-icon">🌱</div>

              <h2>O'rganishni boshlang</h2>

              <p>
                Kursga yoziling va darslarni ketma-ket
                o'rganing.
              </p>

              <button
                type="button"
                className="btn btn-primary btn-lg course-enroll-btn"
                onClick={handleEnroll}
                disabled={busy}
              >
                {busy ? "Yozilmoqda..." : "Kursni boshlash →"}
              </button>
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <div
            className="course-alert course-alert-error"
            role="alert"
          >
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {/* REWARD */}
        {reward && (
          <div
            className="course-alert course-alert-success"
            role="status"
          >
            <span className="reward-icon">✓</span>

            <div>
              <strong>+{reward.xp} XP qo'shildi!</strong>

              {reward.leveledUp && (
                <p>
                  🎉 Yangi daraja: {reward.newLevel}
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

        {/* PROGRESS */}
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
                    : "O'qishni davom ettiring"}
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
            >
              <span style={{ width: `${pct}%` }} />
            </div>

            <div className="course-progress-bottom">
              <span>
                {doneCount} / {lessons.length} dars tugatilgan
              </span>

              {pct === 100 ? (
                <span className="progress-complete">
                  ✓ Barcha darslar tugatildi
                </span>
              ) : (
                <span>Yana {remaining} ta dars qoldi</span>
              )}
            </div>
          </section>
        )}

        {/* LESSONS */}
        <section className="lessons-section">
          <div className="lessons-section-head">
            <div>
              <span className="section-kicker">
                KURS DASTURI
              </span>

              <h2>Darslar</h2>

              <p>
                Darslarni ketma-ket o'rganing va
                yakunlangan mashg'ulotlar uchun XP oling.
              </p>
            </div>

            {lessons.length > 0 && (
              <div className="lessons-count">
                {doneCount}/{lessons.length}
              </div>
            )}
          </div>

          {lessonsLoading && lessons.length === 0 ? (
            <div className="empty-lessons">
              <div className="empty-lessons-icon">⏳</div>
              <h3>Darslar yuklanmoqda...</h3>
              <p>Darslar ro'yxati tayyorlanmoqda.</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="empty-lessons">
              <div className="empty-lessons-icon">📚</div>
              <h3>Hali darslar qo'shilmagan</h3>
              <p>
                Ushbu kursga hozircha darslar
                joylashtirilmagan.
              </p>
            </div>
          ) : (
            <div className="lessons-list">
              {lessons.map((lesson, index) => {
                const key = String(lesson.id);
                const detail = lessonDetails.get(key) || null;

                const activeLesson = detail
                  ? { ...lesson, ...detail }
                  : lesson;

                const isDone = done.has(lesson.id);

                const isOpen =
                  String(openLesson) === key;

                const detailLoading =
                  lessonLoading.has(key);

                const isFullscreen =
                  String(fullscreenLesson) === key;

                return (
                  <article
                    key={lesson.id}
                    className={`lesson-card ${
                      isDone ? "lesson-card-done" : ""
                    } ${
                      isOpen ? "lesson-card-open" : ""
                    }`}
                  >
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
                          String(index + 1).padStart(2, "0")
                        )}
                      </div>

                      <div className="lesson-card-info">
                        <div className="lesson-card-title-row">
                          <h3>{lesson.title}</h3>

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
                          {lesson.lesson_type !== "text" && (
                            <span
                              className={`lesson-type-pill ${
                                lesson.lesson_type === "vr"
                                  ? "lesson-type-vr"
                                  : lesson.lesson_type === "ar"
                                  ? "lesson-type-ar"
                                  : "lesson-type-media"
                              }`}
                            >
                              {lesson.lesson_type === "vr"
                                ? "🥽 VR"
                                : lesson.lesson_type === "ar"
                                ? "🧊 AR / 3D"
                                : String(
                                    lesson.lesson_type || ""
                                  ).toUpperCase()}
                            </span>
                          )}

                          <span className="lesson-xp">
                            +{lesson.xp_reward || 0} XP
                          </span>
                        </div>
                      </div>

                      <div className="lesson-card-action">
                        {enrolled ? (
                          <button
                            type="button"
                            className={
                              isDone
                                ? "btn btn-ghost btn-sm"
                                : "btn btn-primary btn-sm"
                            }
                            onClick={() =>
                              handleOpenLesson(lesson)
                            }
                          >
                            {isOpen
                              ? "Yopish"
                              : isDone
                              ? "Qayta ko'rish"
                              : "Boshlash"}
                          </button>
                        ) : (
                          <span className="lesson-finished">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>

                    {/* INLINE LESSON */}
                    {enrolled && isOpen && (
                      <div
                        className="lesson-inline-content"
                        ref={fullscreenRef}
                      >
                        {detailLoading && !detail && (
                          <section
                            className="lesson-inline-block"
                            aria-live="polite"
                          >
                            <div className="lesson-inline-heading">
                              <span>⏳</span>
                              <h4>Dars yuklanmoqda...</h4>
                            </div>

                            <p className="lesson-text">
                              Dars materiali tayyorlanmoqda.
                              Biroz kuting.
                            </p>
                          </section>
                        )}

                        {!detailLoading && !detail && (
                          <section className="lesson-inline-block">
                            <p className="lesson-text">
                              Dars ma'lumotlarini yuklab
                              bo'lmadi.
                            </p>

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                loadLessonDetail(lesson)
                              }
                            >
                              Qayta yuklash
                            </button>
                          </section>
                        )}

                        {detail && (
                          <>
                            {/* MA'RUZA */}
                            {activeLesson.content && (
                              <section className="lesson-inline-block">
                                <div className="lesson-inline-heading">
                                  <span>📖</span>
                                  <h4>Ma'ruza matni</h4>
                                </div>

                                <div className="lesson-text">
                                  {activeLesson.content}
                                </div>
                              </section>
                            )}

                            {/* 3D MODEL */}
                            {activeLesson.model_url && (
                              <section className="lesson-inline-block">
                                <div className="lesson-inline-heading">
                                  <span>🧊</span>
                                  <h4>3D model</h4>
                                </div>

                                <model-viewer
                                  src={activeLesson.model_url}
                                  alt={activeLesson.title}
                                  camera-controls
                                  auto-rotate
                                  ar
                                  ar-modes="webxr scene-viewer quick-look"
                                  shadow-intensity="1"
                                  exposure="1"
                                  style={{
                                    width: "100%",
                                    height: isFullscreen
                                      ? "100dvh"
                                      : 480,
                                    background: "#eef4ee",
                                    borderRadius: 16,
                                  }}
                                />

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() =>
                                    isFullscreen
                                      ? exitFullscreen()
                                      : enterFullscreen(lesson.id)
                                  }
                                >
                                  {isFullscreen
                                    ? "✕ Yopish"
                                    : "⛶ To'liq ekran"}
                                </button>
                              </section>
                            )}

                            {/* AR / VR */}
                            {activeLesson.embed_url && (
                              <section className="lesson-inline-block">
                                <div className="lesson-inline-heading">
                                  <span>
                                    {activeLesson.lesson_type === "vr"
                                      ? "🥽"
                                      : "🔍"}
                                  </span>

                                  <h4>
                                    {activeLesson.lesson_type === "vr"
                                      ? "VR muhit"
                                      : "Interaktiv modul"}
                                  </h4>
                                </div>

                                <iframe
                                  title={activeLesson.title}
                                  src={activeLesson.embed_url}
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
                                  loading="lazy"
                                  referrerPolicy="strict-origin-when-cross-origin"
                                  style={{
                                    width: "100%",
                                    minHeight: 600,
                                    border: "none",
                                  }}
                                />

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() =>
                                    isFullscreen
                                      ? exitFullscreen()
                                      : enterFullscreen(lesson.id)
                                  }
                                >
                                  {isFullscreen
                                    ? "✕ Yopish"
                                    : "⛶ To'liq ekran"}
                                </button>
                              </section>
                            )}

                            {/* TEST */}
                            {activeLesson.test_url && (
                              <section className="lesson-inline-block">
                                <div className="lesson-test-heading">
                                  <div className="lesson-inline-heading">
                                    <span>✏️</span>
                                    <h4>Mavzu bo'yicha test</h4>
                                  </div>

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

                                <div className="test-viewer">
                                  <iframe
                                    title={`${activeLesson.title} — test`}
                                    src={activeLesson.test_url}
                                    loading="lazy"
                                    allow="
                                      fullscreen *;
                                      camera *;
                                      microphone *;
                                    "
                                    allowFullScreen
                                  />
                                </div>

                                {testMsg?.lessonId === lesson.id && (
                                  <p
                                    className="form-ok lesson-test-message"
                                    role="status"
                                  >
                                    {testMsg.text}
                                  </p>
                                )}
                              </section>
                            )}

                            {/* DARSNI YAKUNLASH */}
                            <div className="lesson-complete-bar">
                              {!isDone ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-lg"
                                  onClick={() =>
                                    handleComplete(lesson)
                                  }
                                  disabled={busy}
                                >
                                  {busy
                                    ? "Saqlanmoqda..."
                                    : "✓ Darsni tugatdim"}
                                </button>
                              ) : (
                                <div className="lesson-complete-success">
                                  ✓ Bu dars tugatilgan
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {!enrolled && lessons.length > 0 && (
            <div className="course-enroll-note">
              <span>🔒</span>

              <div>
                <strong>
                  Darslarni ochish uchun kursga yoziling
                </strong>

                <p>
                  Kursga yozilgach, darslar va
                  interaktiv materiallardan foydalanasiz.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEnroll}
                disabled={busy}
              >
                {busy ? "Yozilmoqda..." : "Kursga yozilish"}
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
