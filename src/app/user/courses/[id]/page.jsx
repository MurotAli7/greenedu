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

  // =========================================================
  // STATE
  // =========================================================

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

  const lessonRequestsRef = useRef(new Map());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [testMsg, setTestMsg] = useState(null);

  const [fullscreenLesson, setFullscreenLesson] =
    useState(null);

  const fullscreenRef = useRef(null);

  // =========================================================
  // API URL'LAR
  // =========================================================

  const courseUrl = useMemo(
    () =>
      `/api/user/course?id=${encodeURIComponent(id)}`,
    [id]
  );

  const lessonUrl = useCallback(
    (lessonId) =>
      `/api/user/course/lesson?courseId=${encodeURIComponent(
        id
      )}&lessonId=${encodeURIComponent(lessonId)}`,
    [id]
  );

  const {
    data: courseData,
    loading,
    error: apiError,
    mutate,
  } = useCachedApi(courseUrl);

  // =========================================================
  // KURS MA'LUMOTLARI
  // =========================================================

  useEffect(() => {
    if (!courseData) return;

    setCourse(courseData.course || null);

    setLessons(
      Array.isArray(courseData.lessons)
        ? courseData.lessons
        : []
    );

    setEnrolled(Boolean(courseData.enrolled));

    setDone(
      new Set(
        Array.isArray(courseData.doneLessonIds)
          ? courseData.doneLessonIds
          : []
      )
    );
  }, [courseData]);

  // =========================================================
  // API XATOLARI
  // =========================================================

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  // =========================================================
  // BITTA DARSNING TO'LIQ MA'LUMOTINI YUKLASH
  // =========================================================

  const loadLessonDetail = useCallback(
    async (lesson) => {
      if (!lesson?.id || !enrolled) {
        return null;
      }

      const key = String(lesson.id);

      // Oldin yuklangan bo'lsa, cache'dan olamiz.
      const cached = lessonDetails.get(key);

      if (cached) {
        return cached;
      }

      // Bir dars uchun takroriy so'rov yubormaymiz.
      const inFlight =
        lessonRequestsRef.current.get(key);

      if (inFlight) {
        return inFlight;
      }

      // Agar asosiy API to'liq kontent bergan bo'lsa,
      // qayta API chaqirish shart emas.
      const hasContent = Boolean(
        lesson.content ||
          lesson.embed_url ||
          lesson.model_url ||
          lesson.test_url
      );

      if (hasContent) {
        const detail = { ...lesson };

        setLessonDetails((previous) => {
          const next = new Map(previous);
          next.set(key, detail);
          return next;
        });

        return detail;
      }

      // Yuklanish indikatorini ko'rsatamiz.
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

          const detail =
            response?.lesson || response;

          if (
            !detail ||
            typeof detail !== "object"
          ) {
            throw new Error(
              "Dars ma’lumotlari topilmadi."
            );
          }

          const merged = {
            ...lesson,
            ...detail,
          };

          // Dars tafsilotlarini cache'ga yozamiz.
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
              "Dars ma’lumotlarini yuklab bo‘lmadi."
          );

          return null;
        } finally {
          lessonRequestsRef.current.delete(key);

          setLessonLoading((previous) => {
            const next = new Set(previous);
            next.delete(key);
            return next;
          });
        }
      })();

      lessonRequestsRef.current.set(
        key,
        request
      );

      return request;
    },
    [
      enrolled,
      lessonDetails,
      lessonUrl,
    ]
  );

  // =========================================================
  // KEYINGI DARSLARNI FONDA YUKLASH
  // =========================================================

  const preloadLesson = useCallback(
    (lesson) => {
      if (!lesson?.id) return;

      const key = String(lesson.id);

      if (
        lessonDetails.has(key) ||
        lessonRequestsRef.current.has(key)
      ) {
        return;
      }

      const hasContent = Boolean(
        lesson.content ||
          lesson.embed_url ||
          lesson.model_url ||
          lesson.test_url
      );

      if (hasContent) {
        setLessonDetails((previous) => {
          const next = new Map(previous);
          next.set(key, { ...lesson });
          return next;
        });

        return;
      }

      const request = prefetchApi(
        lessonUrl(lesson.id)
      )
        .then((response) => {
          const detail =
            response?.lesson || response;

          if (
            !detail ||
            typeof detail !== "object"
          ) {
            return;
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
        })
        .catch((err) => {
          console.warn(
            "Lesson preload failed:",
            key,
            err
          );
        });

      lessonRequestsRef.current.set(
        key,
        request
      );

      request.finally(() => {
        lessonRequestsRef.current.delete(key);
      });
    },
    [lessonDetails, lessonUrl]
  );

  // =========================================================
  // BIRINCHI IKKI DARSHI OLDINDAN TAYYORLASH
  // =========================================================

  useEffect(() => {
    if (!enrolled || lessons.length === 0) {
      return;
    }

    const preloadFirstLessons = () => {
      lessons.slice(0, 2).forEach((lesson) => {
        preloadLesson(lesson);
      });
    };

    if (
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
    ) {
      const callbackId =
        window.requestIdleCallback(
          preloadFirstLessons,
          { timeout: 1500 }
        );

      return () => {
        window.cancelIdleCallback(callbackId);
      };
    }

    const timer = window.setTimeout(
      preloadFirstLessons,
      300
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [enrolled, lessons, preloadLesson]);

  // =========================================================
  // DARSNI OCHISH
  // =========================================================

  const handleOpenLesson = useCallback(
    (lesson) => {
      if (!lesson?.id || !enrolled) {
        return;
      }

      const key = String(lesson.id);

      setError("");
      setReward(null);
      setTestMsg(null);

      // Ochiq darsni qayta bossak, yopamiz.
      if (String(openLesson) === key) {
        setOpenLesson(null);
        return;
      }

      // Dars oynasini darhol ochamiz.
      setOpenLesson(lesson.id);

      // To'liq kontentni fonda yuklaymiz.
      if (!lessonDetails.has(key)) {
        void loadLessonDetail(lesson);
      }

      // Keyingi ikkita darsni oldindan yuklaymiz.
      const currentIndex = lessons.findIndex(
        (item) =>
          String(item.id) === key
      );

      if (currentIndex < 0) {
        return;
      }

      lessons
        .slice(currentIndex + 1, currentIndex + 3)
        .forEach((nextLesson) => {
          preloadLesson(nextLesson);
        });
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

  // =========================================================
  // DARSNI TUGATISH
  // =========================================================

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
        const json = await apiFetch(
          "/api/user/complete-lesson",
          {
            method: "POST",
            body: {
              lessonId: lesson.id,
            },
          }
        );

        // Mahalliy progress'ni yangilaymiz.
        setDone((previous) => {
          const next = new Set(previous);
          next.add(lesson.id);
          return next;
        });

        // Cache'dagi progress'ni ham yangilaymiz.
        mutate((previous) => {
          if (!previous) {
            return previous;
          }

          const currentDone = Array.isArray(
            previous.doneLessonIds
          )
            ? previous.doneLessonIds
            : [];

          if (
            currentDone.some(
              (item) =>
                String(item) === String(lesson.id)
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

        // Dashboard statistikasini eskirgan deb belgilaymiz.
        invalidateCache(
          "/api/user/dashboard"
        );

        if (!json?.already) {
          setReward({
            xp: json?.xpEarned || 0,
            leveledUp: Boolean(
              json?.leveledUp
            ),
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
    [busy, done, mutate]
  );

  // =========================================================
  // KURSGA YOZILISH
  // =========================================================

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

  // =========================================================
  // TEST NATIJASINI QABUL QILISH
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

      const baseLesson = lessons.find(
        (item) =>
          String(item.id) ===
          String(openLesson)
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

      if (!lesson?.test_url) {
        return;
      }

      // Test natijasi faqat test manbasidan kelishi kerak.
      let expectedOrigin;

      try {
        expectedOrigin = new URL(
          lesson.test_url,
          window.location.href
        ).origin;
      } catch {
        return;
      }

      if (event.origin !== expectedOrigin) {
        return;
      }

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
    lessonDetails,
    done,
    handleComplete,
  ]);

  // =========================================================
  // TO'LIQ EKRAN
  // =========================================================

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
          console.warn(
            "Browser fullscreen ishlamadi:",
            err
          );
        }
      });
    },
    []
  );

  const exitFullscreen = useCallback(
    async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn(
          "Fullscreen exit:",
          err
        );
      }

      setFullscreenLesson(null);
    },
    []
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenLesson(null);
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
  }, [fullscreenLesson, exitFullscreen]);

  // =========================================================
  // KURS PROGRESS
  // =========================================================

  const doneCount = lessons.filter(
    (lesson) => done.has(lesson.id)
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

  // =========================================================
  // YUKLANISH
  // =========================================================

  if (loading && !course) {
    return (
      <main className="course-page">
        <SkeletonPageHead />
        <SkeletonLessons />
      </main>
    );
  }

  // =========================================================
  // KURS TOPILMADI
  // =========================================================

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

  // =========================================================
  // ASOSIY SAHIFA
  // =========================================================

  return (
    <>
      <Script
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        type="module"
      />

      <main className="course-page">
        {/* BREADCRUMB */}
        <nav
          className="course-breadcrumb"
          aria-label="Navigatsiya"
        >
          <Link href="/user">
            O‘quv sahifam
          </Link>

          <span aria-hidden="true">/</span>

          <span aria-current="page">
            {course.title}
          </span>
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
              <span>
                📚 {lessons.length} ta dars
              </span>

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
              <div className="course-action-icon">
                🌱
              </div>

              <h2>O‘rganishni boshlang</h2>

              <p>
                Kursga yoziling va darslarni ketma-ket
                o‘rganing.
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

        {/* XATOLIK */}
        {error && (
          <div
            className="course-alert course-alert-error"
            role="alert"
          >
            <span>!</span>
            <p>{error}</p>
          </div>
        )}

        {/* MUKOFOT */}
        {reward && (
          <div
            className="course-alert course-alert-success"
            role="status"
          >
            <span className="reward-icon">✓</span>

            <div>
              <strong>
                +{reward.xp} XP qo‘shildi!
              </strong>

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
                {doneCount} / {lessons.length} dars
                tugatilgan
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

        {/* DARSLAR */}
        <section className="lessons-section">
          <div className="lessons-section-head">
            <div>
              <span className="section-kicker">
                KURS DASTURI
              </span>

              <h2>Darslar</h2>

              <p>
                Darslarni ketma-ket o‘rganing va har
                bir yakunlangan mashg‘ulot uchun XP oling.
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

          {lessons.length === 0 ? (
            <div className="empty-lessons">
              <div className="empty-lessons-icon">
                📚
              </div>

              <h3>Hali darslar qo‘shilmagan</h3>

              <p>
                Ushbu kursga hozircha darslar
                joylashtirilmagan.
              </p>
            </div>
          ) : (
            <div className="lessons-list">
              {lessons.map((lesson, index) => {
                const lessonKey = String(lesson.id);
                const lessonType =
                  lesson.lesson_type || "text";

                const isDone = done.has(lesson.id);

                const isOpen =
                  String(openLesson) === lessonKey;

                const detail =
                  lessonDetails.get(lessonKey) || null;

                const activeLesson = detail
                  ? { ...lesson, ...detail }
                  : lesson;

                const detailLoading =
                  lessonLoading.has(lessonKey);

                const hasContent = Boolean(
                  activeLesson.content ||
                    activeLesson.embed_url ||
                    activeLesson.model_url ||
                    activeLesson.test_url
                );

                const isFullscreen =
                  String(fullscreenLesson) === lessonKey;

                return (
                  <article
                    key={lesson.id}
                    className={`lesson-card ${
                      isDone ? "lesson-card-done" : ""
                    } ${
                      isOpen ? "lesson-card-open" : ""
                    }`}
                  >
                    {/* LESSON HEADER */}
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
                          {lessonType !== "text" && (
                            <span
                              className={`lesson-type-pill ${
                                lessonType === "vr"
                                  ? "lesson-type-vr"
                                  : lessonType === "ar"
                                  ? "lesson-type-ar"
                                  : "lesson-type-media"
                              }`}
                            >
                              {lessonType === "vr"
                                ? "🥽 VR"
                                : lessonType === "ar"
                                ? "🧊 AR / 3D"
                                : lessonType.toUpperCase()}
                            </span>
                          )}

                          <span className="lesson-xp">
                            +{lesson.xp_reward || 0} XP
                          </span>

                          {hasContent && (
                            <span className="lesson-content-indicator">
                              Interaktiv dars
                            </span>
                          )}
                        </div>
                      </div>

                      {/* MUHIM: bu tugma hech qachon darsni tugatmaydi */}
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
                              ? "Qayta ko‘rish"
                              : "Boshlash"}
                          </button>
                        ) : (
                          <span className="lesson-finished">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>

                    {/* LESSON CONTENT */}
                    {enrolled && isOpen && (
                      <div className="lesson-inline-content">
                        {detailLoading && !hasContent && (
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

                        {!detailLoading &&
                          !detail &&
                          !hasContent && (
                            <section className="lesson-inline-block">
                              <p className="lesson-text">
                                Dars ma’lumotlarini yuklab
                                bo‘lmadi.
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

                        {!detailLoading &&
                          detail &&
                          !hasContent && (
                            <section className="lesson-inline-block">
                              <p className="lesson-text">
                                Ushbu darsda alohida ma’ruza
                                yoki interaktiv material
                                mavjud emas.
                              </p>
                            </section>
                          )}

                        {/* MA'RUZA */}
                        {activeLesson.content && (
                          <section className="lesson-inline-block">
                            <div className="lesson-inline-heading">
                              <span>📖</span>
                              <h4>Ma’ruza matni</h4>
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
                                src={activeLesson.model_url}
                                alt={
                                  activeLesson.title ||
                                  lesson.title
                                }
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
                                className="btn btn-primary btn-sm lesson-fullscreen-btn"
                                onClick={() =>
                                  isFullscreen
                                    ? exitFullscreen()
                                    : enterFullscreen(lesson.id)
                                }
                              >
                                {isFullscreen
                                  ? "✕ Yopish"
                                  : "⛶ To‘liq ekran"}
                              </button>
                            </div>

                            <p className="viewer-help">
                              Modelni barmoq yoki sichqoncha
                              bilan aylantiring. Telefoningiz
                              AR'ni qo‘llab-quvvatlasa,
                              modelni haqiqiy muhitda
                              ko‘rishingiz mumkin.
                            </p>
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
                                  activeLesson.title ||
                                  lesson.title
                                }
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
                                    : enterFullscreen(lesson.id)
                                }
                              >
                                {isFullscreen
                                  ? "✕ Yopish"
                                  : "⛶ To‘liq ekran"}
                              </button>
                            </div>

                            {activeLesson.lesson_type === "vr" && (
                              <p className="viewer-help">
                                VR ko‘zoynakda ko‘rish uchun
                                modulni to‘liq ekranga oching
                                va VR rejimini tanlang.
                              </p>
                            )}
                          </section>
                        )}

                        {/* TEST */}
                        {activeLesson.test_url && (
                          <section className="lesson-inline-block">
                            <div className="lesson-test-heading">
                              <div className="lesson-inline-heading">
                                <span>✏️</span>
                                <h4>Mavzu bo‘yicha test</h4>
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
                                title={`${
                                  activeLesson.title ||
                                  lesson.title
                                } — test`}
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

                        {/* COMPLETE */}
                        <div className="lesson-complete-bar">
                          {!isDone ? (
                            <>
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

                              {activeLesson.test_url && (
                                <p>
                                  Testni topshirsangiz, dars
                                  avtomatik tugatilgan deb
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

          {/* KURSGA YOZILMAGAN */}
          {!enrolled && lessons.length > 0 && (
            <div className="course-enroll-note">
              <span>🔒</span>

              <div>
                <strong>
                  Darslarni ochish uchun kursga yoziling
                </strong>

                <p>
                  Kursga yozilgandan so‘ng barcha
                  interaktiv darslar, testlar va AR/VR
                  materiallardan foydalanishingiz mumkin.
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