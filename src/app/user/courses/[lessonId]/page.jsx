"use client";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Script from "next/script";

import { DownloadIcon } from "@/components/Icons";
import { SkeletonPageHead } from "@/components/Skeleton";
import { apiFetch } from "@/lib/api/client";
import {
  invalidateCache,
  useCachedApi,
} from "@/lib/api/useCached";
import { TEST_RESULT_MESSAGE } from "@/lib/constants";

export default function LessonPage({ params }) {
  const { id, lessonId } = use(params);

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------

  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [enrolled, setEnrolled] = useState(false);
  const [done, setDone] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [reward, setReward] = useState(null);
  const [testMsg, setTestMsg] = useState(null);

  const [cameraMessage, setCameraMessage] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);

  // ---------------------------------------------------------
  // SEPARATE REFS
  // ---------------------------------------------------------

  const modelViewerRef = useRef(null);
  const embedViewerRef = useRef(null);

  // ---------------------------------------------------------
  // COURSE CACHE
  // ---------------------------------------------------------

  const {
    data: courseData,
    loading: courseLoading,
    mutate,
  } = useCachedApi(
    `/api/user/course?id=${encodeURIComponent(id)}`
  );

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  useEffect(() => {
    setLoading(courseLoading);
  }, [courseLoading]);

  // ---------------------------------------------------------
  // EMBEDDED PAGE DETECTION
  // ---------------------------------------------------------

  useEffect(() => {
    try {
      setIsEmbedded(window.top !== window.self);
    } catch {
      setIsEmbedded(true);
    }
  }, []);

  // ---------------------------------------------------------
  // COURSE DATA
  // ---------------------------------------------------------

  useEffect(() => {
    if (!courseData) return;

    const nextLessons = Array.isArray(courseData.lessons)
      ? courseData.lessons
      : [];

    const selected = nextLessons.find(
      (item) =>
        String(item.id) === String(lessonId)
    );

    setCourse(courseData.course || null);
    setLessons(nextLessons);
    setLesson(selected || null);

    setEnrolled(Boolean(courseData.enrolled));

    setDone(
      new Set(
        Array.isArray(courseData.doneLessonIds)
          ? courseData.doneLessonIds
          : []
      )
    );

    setLoading(false);
  }, [courseData, lessonId]);

  // ---------------------------------------------------------
  // OPEN CURRENT PAGE IN STANDALONE WINDOW
  // ---------------------------------------------------------

  const openStandalone = useCallback(() => {
    try {
      const newWindow = window.open(
        window.location.href,
        "_blank",
        "noopener,noreferrer"
      );

      if (!newWindow) {
        setCameraMessage(
          "Brauzer yangi oynani blokladi. Brauzer sozlamalaridan popup oynalarga ruxsat bering."
        );
      }
    } catch (err) {
      console.error(
        "Standalone window error:",
        err
      );

      setCameraMessage(
        "Sahifani alohida oynada ochib bo‘lmadi."
      );
    }
  }, []);

  // ---------------------------------------------------------
  // COMPLETE LESSON
  // ---------------------------------------------------------

  const handleComplete = useCallback(async () => {
    if (!lesson || busy) return;

    setBusy(true);
    setError("");

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

      setDone((prev) => {
        const next = new Set(prev);
        next.add(lesson.id);
        return next;
      });

      mutate((prev) => {
        if (!prev) return prev;

        const previousDone =
          Array.isArray(prev.doneLessonIds)
            ? prev.doneLessonIds
            : [];

        if (
          previousDone.some(
            (item) =>
              String(item) === String(lesson.id)
          )
        ) {
          return prev;
        }

        return {
          ...prev,
          doneLessonIds: [
            ...previousDone,
            lesson.id,
          ],
        };
      });

      // Dashboard cache invalidation
      invalidateCache(
        "/api/user/dashboard"
      );

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
  }, [lesson, busy, mutate]);

  // ---------------------------------------------------------
  // TEST RESULT MESSAGE
  // ---------------------------------------------------------

  useEffect(() => {
    const onMessage = async (event) => {
      const payload = event.data;

      if (
        !payload ||
        payload.type !== TEST_RESULT_MESSAGE ||
        !lesson ||
        !lesson.test_url
      ) {
        return;
      }

      let expectedOrigin;

      try {
        expectedOrigin = new URL(
          lesson.test_url
        ).origin;
      } catch {
        return;
      }

      // Security check
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
          await handleComplete();
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
    lesson,
    done,
    handleComplete,
  ]);

  // ---------------------------------------------------------
  // FULLSCREEN
  // ---------------------------------------------------------

  const enterFullscreen = useCallback(
    async (targetRef) => {
      const element = targetRef?.current;

      if (!element) {
        setCameraMessage(
          "To‘liq ekran elementi topilmadi."
        );
        return;
      }

      if (
        !document.fullscreenEnabled
      ) {
        setCameraMessage(
          "Bu brauzer to‘liq ekran rejimini qo‘llab-quvvatlamaydi."
        );
        return;
      }

      try {
        await element.requestFullscreen({
          navigationUI: "hide",
        });

        setCameraMessage("");
      } catch (err) {
        console.error(
          "Fullscreen error:",
          err
        );

        setCameraMessage(
          "To‘liq ekran ochilmadi. Agar sahifa boshqa sayt ichida ochilgan bo‘lsa, uni alohida oynada oching."
        );
      }
    },
    []
  );

  const exitFullscreen =
    useCallback(async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.error(
          "Exit fullscreen error:",
          err
        );
      }
    }, []);

  // ---------------------------------------------------------
  // FULLSCREEN EVENT
  // ---------------------------------------------------------

  useEffect(() => {
    const onFullscreenChange =
      () => {
        setIsFullscreen(
          Boolean(
            document.fullscreenElement
          )
        );
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

  // ---------------------------------------------------------
  // ESCAPE / FULLSCREEN CLEANUP
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document
          .exitFullscreen()
          .catch(() => {});
      }
    };
  }, []);

  // ---------------------------------------------------------
  // CAMERA PERMISSION
  // ---------------------------------------------------------

  const requestCameraPermission =
    useCallback(async () => {
      setCameraMessage("");

      // If GreenEdu itself is inside another iframe
      if (
        window.top !== window.self
      ) {
        setCameraMessage(
          "AR/VR ishlashi uchun ushbu darsni alohida oynada oching."
        );

        return false;
      }

      // HTTPS check
      if (!window.isSecureContext) {
        setCameraMessage(
          "Kamera va AR ishlashi uchun sayt HTTPS orqali ochilishi kerak."
        );

        return false;
      }

      // Browser support
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        setCameraMessage(
          "Bu brauzer kamera API'sini qo‘llab-quvvatlamaydi."
        );

        return false;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal:
                    "environment",
                },
              },
              audio: false,
            }
          );

        // Permission olindi.
        // Kamerani ushlab turmaymiz.
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        setCameraMessage(
          "✓ Kameraga ruxsat berildi. Endi AR tugmasidan foydalanishingiz mumkin."
        );

        return true;
      } catch (err) {
        console.error(
          "Camera permission error:",
          err
        );

        if (
          err?.name ===
          "NotAllowedError"
        ) {
          setCameraMessage(
            "Kameraga ruxsat berilmadi. Brauzer sozlamalaridan ushbu sayt uchun kameraga ruxsat bering."
          );
        } else if (
          err?.name ===
          "NotFoundError"
        ) {
          setCameraMessage(
            "Qurilmada kamera topilmadi."
          );
        } else if (
          err?.name ===
          "NotReadableError"
        ) {
          setCameraMessage(
            "Kamera boshqa dastur tomonidan ishlatilmoqda."
          );
        } else {
          setCameraMessage(
            "Kameradan foydalanib bo‘lmadi. Brauzer ruxsatlarini tekshiring."
          );
        }

        return false;
      }
    }, []);

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <main className="course-page lesson-page">
        <SkeletonPageHead />
      </main>
    );
  }

  // ---------------------------------------------------------
  // NOT FOUND
  // ---------------------------------------------------------

  if (!course || !lesson) {
    return (
      <main className="course-page">
        <section className="course-not-found">
          <div className="course-not-found-icon">
            📚
          </div>

          <h1>Dars topilmadi</h1>

          <p>
            Ushbu dars mavjud emas yoki
            o‘chirilgan.
          </p>

          <Link
            href={`/user/course/${id}`}
            className="btn btn-primary"
          >
            Kursga qaytish
          </Link>
        </section>
      </main>
    );
  }

  // ---------------------------------------------------------
  // NOT ENROLLED
  // ---------------------------------------------------------

  if (!enrolled) {
    return (
      <main className="course-page">
        <section className="course-not-found">
          <div className="course-not-found-icon">
            🔒
          </div>

          <h1>Dars yopiq</h1>

          <p>
            Darslarni ko‘rish uchun avval
            kursga yoziling.
          </p>

          <Link
            href={`/user/course/${id}`}
            className="btn btn-primary"
          >
            Kursga qaytish
          </Link>
        </section>
      </main>
    );
  }

  // ---------------------------------------------------------
  // LESSON NAVIGATION
  // ---------------------------------------------------------

  const selectedIndex =
    lessons.findIndex(
      (item) =>
        String(item.id) ===
        String(lesson.id)
    );

  const previousLesson =
    selectedIndex > 0
      ? lessons[selectedIndex - 1]
      : null;

  const nextLesson =
    selectedIndex >= 0 &&
    selectedIndex <
      lessons.length - 1
      ? lessons[selectedIndex + 1]
      : null;

  const isDone = done.has(
    lesson.id
  );

  const hasModel = Boolean(
    lesson.model_url
  );

  const hasEmbed = Boolean(
    lesson.embed_url
  );

  const hasTest = Boolean(
    lesson.test_url
  );

  return (
    <>
      {/* =====================================================
          MODEL VIEWER
      ===================================================== */}

      {hasModel && (
        <Script
          type="module"
          src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
          strategy="afterInteractive"
        />
      )}

      <main className="course-page lesson-page">

        {/* ===================================================
            BREADCRUMB
        =================================================== */}

        <nav
          className="course-breadcrumb"
          aria-label="Navigatsiya"
        >
          <Link
            href={`/user/course/${id}`}
          >
            ← Kursga qaytish
          </Link>

          <span aria-hidden="true">
            /
          </span>

          <span aria-current="page">
            {lesson.title}
          </span>
        </nav>

        {/* ===================================================
            EMBED WARNING
        =================================================== */}

        {isEmbedded && (
          <div
            className="course-alert course-alert-warning"
            role="alert"
          >
            <span>📷</span>

            <div>
              <strong>
                AR/VR uchun alohida oyna kerak
              </strong>

              <p>
                Kamera, AR, VR va to‘liq
                ekran funksiyalari sahifa
                boshqa sayt ichida ochilganda
                cheklanishi mumkin.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  openStandalone
                }
              >
                ↗ Alohida oynada ochish
              </button>
            </div>
          </div>
        )}

        {/* ===================================================
            HERO
        =================================================== */}

        <section className="course-hero">
          <div className="course-hero-main">

            <div className="course-label-row">

              <span
                className={`course-type ${
                  lesson.lesson_type ===
                  "vr"
                    ? "course-type-vr"
                    : lesson.lesson_type ===
                      "ar"
                    ? "course-type-ar"
                    : "course-type-course"
                }`}
              >
                {lesson.lesson_type ===
                "vr"
                  ? "VR DARS"
                  : lesson.lesson_type ===
                    "ar"
                  ? "AR / 3D DARS"
                  : "DARS"}
              </span>

              <span className="course-category">
                {selectedIndex + 1} /{" "}
                {lessons.length}
              </span>

            </div>

            <h1 className="course-hero-title">
              {lesson.title}
            </h1>

            {lesson.summary && (
              <p className="course-hero-description">
                {lesson.summary}
              </p>
            )}

            <div className="course-hero-meta">
              <span>
                ⚡ +{lesson.xp_reward} XP
              </span>

              {isDone && (
                <span className="course-enrolled-meta">
                  ✓ Dars tugatilgan
                </span>
              )}
            </div>

          </div>
        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div
            className="course-alert course-alert-error"
            role="alert"
          >
            <span>!</span>

            <p>{error}</p>
          </div>
        )}

        {/* ===================================================
            REWARD
        =================================================== */}

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

        {/* ===================================================
            LESSON CONTENT
        =================================================== */}

        <section className="lesson-inline-content lesson-standalone-content">

          {/* =================================================
              TEXT
          ================================================= */}

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

          {/* =================================================
              MODEL VIEWER / AR
          ================================================= */}

          {hasModel && (
            <section className="lesson-inline-block">

              <div className="lesson-inline-heading">
                <span>🧊</span>

                <h4>
                  3D model va AR
                </h4>
              </div>

              <div
                ref={modelViewerRef}
                className={`model-viewer-container ${
                  isFullscreen
                    ? "is-fullscreen"
                    : ""
                }`}
                style={
                  isFullscreen
                    ? {
                        position:
                          "fixed",
                        inset: 0,
                        zIndex: 99999,
                        width: "100vw",
                        height: "100vh",
                        background:
                          "#eef4ee",
                      }
                    : undefined
                }
              >

                <model-viewer
                  src={lesson.model_url}
                  camera-controls
                  auto-rotate
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  shadow-intensity="1"
                  exposure="1"
                  crossorigin="anonymous"
                  style={{
                    width: "100%",
                    height:
                      isFullscreen
                        ? "100vh"
                        : 480,
                    background:
                      "#eef4ee",
                    borderRadius:
                      isFullscreen
                        ? 0
                        : 16,
                  }}
                />

                <div className="lesson-viewer-actions">

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      requestCameraPermission
                    }
                  >
                    📷 AR uchun kameraga
                    ruxsat
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      isFullscreen
                        ? exitFullscreen()
                        : enterFullscreen(
                            modelViewerRef
                          )
                    }
                  >
                    {isFullscreen
                      ? "✕ To‘liq ekrandan chiqish"
                      : "⛶ To‘liq ekran"}
                  </button>

                </div>
              </div>

              {cameraMessage && (
                <p
                  className="viewer-help"
                  role="status"
                >
                  {cameraMessage}
                </p>
              )}

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

          {/* =================================================
              VR / EMBED
          ================================================= */}

          {hasEmbed && (
            <section className="lesson-inline-block">

              <div className="lesson-inline-heading">

                <span>
                  {lesson.lesson_type ===
                  "vr"
                    ? "🥽"
                    : "🎮"}
                </span>

                <h4>
                  {lesson.lesson_type ===
                  "vr"
                    ? "VR muhit"
                    : "Interaktiv simulyatsiya"}
                </h4>

              </div>

              <div
                ref={embedViewerRef}
                className={`interactive-viewer ${
                  isFullscreen &&
                  !hasModel
                    ? "is-fullscreen"
                    : ""
                }`}
                style={
                  isFullscreen &&
                  !hasModel
                    ? {
                        position:
                          "fixed",
                        inset: 0,
                        zIndex: 99999,
                        width: "100vw",
                        height: "100vh",
                        background:
                          "#fff",
                      }
                    : undefined
                }
              >

                <iframe
                  title={lesson.title}
                  src={lesson.embed_url}
                  allow="
                    autoplay;
                    fullscreen *;
                    xr-spatial-tracking *;
                    camera *;
                    microphone *;
                    accelerometer;
                    gyroscope;
                    gamepad;
                    web-share
                  "
                  allowFullScreen
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{
                    width: "100%",
                    height:
                      isFullscreen
                        ? "100vh"
                        : 600,
                    border: 0,
                  }}
                />

                <div className="lesson-viewer-actions">

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      isFullscreen
                        ? exitFullscreen()
                        : enterFullscreen(
                            embedViewerRef
                          )
                    }
                  >
                    {isFullscreen
                      ? "✕ To‘liq ekrandan chiqish"
                      : "⛶ To‘liq ekran"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      openStandalone
                    }
                  >
                    ↗ Alohida oynada
                  </button>

                </div>

              </div>

              {lesson.lesson_type ===
                "vr" && (
                <p className="viewer-help">
                  VR ko‘zoynakda ko‘rish
                  uchun avval interaktiv
                  muhitni oching, keyin
                  VR qurilmangizdagi VR
                  rejimini tanlang.
                </p>
              )}

            </section>
          )}

          {/* =================================================
              CAMERA HELP
          ================================================= */}

          {(hasModel || hasEmbed) &&
            cameraMessage && (
              <div
                className="course-alert course-alert-warning"
                role="status"
              >
                <span>📷</span>

                <div>
                  <p>
                    {cameraMessage}
                  </p>

                  {isEmbedded && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={
                        openStandalone
                      }
                    >
                      ↗ Alohida oynada
                      ochish
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* =================================================
              TEST
          ================================================= */}

          {hasTest && (
            <section className="lesson-inline-block">

              <div className="lesson-test-heading">

                <div className="lesson-inline-heading">
                  <span>✏️</span>

                  <h4>
                    Mavzu bo‘yicha test
                  </h4>
                </div>

                <a
                  href={lesson.test_url}
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
                  src={lesson.test_url}
                  loading="eager"
                  allow="fullscreen"
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

          {/* =================================================
              COMPLETE
          ================================================= */}

          <div className="lesson-complete-bar">

            {!isDone ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={
                    handleComplete
                  }
                  disabled={busy}
                >
                  {busy
                    ? "Saqlanmoqda..."
                    : "✓ Darsni tugatdim"}
                </button>

                {hasTest && (
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

        </section>

        {/* ===================================================
            LESSON NAVIGATION
        =================================================== */}

        <div
          className="lesson-navigation"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 16,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >

          {previousLesson ? (
            <Link
              href={`/user/course/${id}/lesson/${previousLesson.id}`}
              className="btn btn-ghost"
              prefetch
            >
              ← Oldingi dars
            </Link>
          ) : (
            <span />
          )}

          {nextLesson ? (
            <Link
              href={`/user/course/${id}/lesson/${nextLesson.id}`}
              className="btn btn-primary"
              prefetch
            >
              Keyingi dars →
            </Link>
          ) : (
            <Link
              href={`/user/course/${id}`}
              className="btn btn-primary"
              prefetch
            >
              Kursga qaytish →
            </Link>
          )}

        </div>

      </main>
    </>
  );
}