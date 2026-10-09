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

  const viewerRef = useRef(null);

  /*
   * Kurs ma'lumotlarini cache orqali olamiz.
   *
   * Kurs sahifasidan darsga o'tilganda qayta API
   * so'rovi yuborilmaydi, agar ma'lumot cache'da bo'lsa.
   */
  const {
    data: courseData,
    loading: courseLoading,
    mutate,
  } = useCachedApi(`/api/user/course?id=${id}`);

  /*
   * Kurs ma'lumotlari kelganda kerakli darsni topamiz.
   */
  useEffect(() => {
    setLoading(courseLoading);

    if (!courseData) return;

    const nextLessons = courseData.lessons || [];

    const selectedLesson = nextLessons.find(
      (item) =>
        String(item.id) === String(lessonId)
    );

    setCourse(courseData.course || null);
    setLessons(nextLessons);
    setLesson(selectedLesson || null);

    setEnrolled(Boolean(courseData.enrolled));

    setDone(
      new Set(courseData.doneLessonIds || [])
    );

    setLoading(false);
  }, [courseData, courseLoading, lessonId]);

  /*
   * Darsni tugatish
   */
  const handleComplete = useCallback(
    async () => {
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

        setDone(
          (previous) =>
            new Set([
              ...previous,
              lesson.id,
            ])
        );

        mutate((previous) => {
          if (
            !previous ||
            previous.doneLessonIds?.includes(
              lesson.id
            )
          ) {
            return previous;
          }

          return {
            ...previous,
            doneLessonIds: [
              ...(previous.doneLessonIds || []),
              lesson.id,
            ],
          };
        });

        /*
         * Dashboard cache'larini yangilash.
         */
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
    },
    [lesson, busy, mutate]
  );

  /*
   * Test natijasini qabul qilish.
   */
  useEffect(() => {
    const handleMessage = async (event) => {
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

      /*
       * Xavfsizlik:
       * faqat test joylashgan origin'dan kelgan
       * xabarni qabul qilamiz.
       */
      if (
        event.origin !== expectedOrigin
      ) {
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
          text:
            `Test natijangiz saqlandi: ` +
            `${payload.score}/${payload.total} ` +
            `(${result.percent}%)`,
        });

        /*
         * Test topshirilsa dars avtomatik tugaydi.
         */
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
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, [
    lesson,
    done,
    handleComplete,
  ]);

  /*
   * FULLSCREEN
   */
  const enterFullscreen = useCallback(
    async () => {
      const element = viewerRef.current;

      if (!element) {
        setCameraMessage(
          "To‘liq ekran elementi topilmadi."
        );
        return;
      }

      try {
        if (!document.fullscreenElement) {
          await element.requestFullscreen({
            navigationUI: "hide",
          });
        }
      } catch (err) {
        console.error(
          "Fullscreen xatosi:",
          err
        );

        setCameraMessage(
          "To‘liq ekran rejimini ochib bo‘lmadi."
        );
      }
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
        console.error(
          "Fullscreen xatosi:",
          err
        );
      }
    },
    []
  );

  /*
   * Browser fullscreen holatini kuzatamiz.
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement)
      );
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

  /*
   * Kamera ruxsatini so'rash.
   *
   * Muhim:
   * JavaScript kameraga avtomatik ruxsat bera olmaydi.
   * Faqat browser permission oynasini chiqarishi mumkin.
   */
  const requestCameraPermission =
    useCallback(async () => {
      setCameraMessage("");

      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraMessage(
          "Bu qurilmada kamera API qo‘llab-quvvatlanmaydi."
        );

        return false;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal: "environment",
                },
              },
              audio: false,
            }
          );

        /*
         * Faqat permission tekshirdik.
         * Kamera oqimini ushlab turmaymiz.
         */
        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        return true;
      } catch (err) {
        console.error(
          "Kamera ruxsati:",
          err
        );

        setCameraMessage(
          "AR ishlashi uchun brauzerda kameraga ruxsat bering."
        );

        return false;
      }
    }, []);

  /*
   * Loading
   */
  if (loading) {
    return (
      <main className="course-page lesson-page">
        <SkeletonPageHead />
      </main>
    );
  }

  /*
   * Dars topilmasa
   */
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

  /*
   * Kursga yozilmagan bo'lsa
   */
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

  /*
   * Oldingi / keyingi dars
   */
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

  const hasModel =
    Boolean(lesson.model_url);

  /*
   * AR / VR / PhET mavjudligini aniqlaymiz.
   */
  const isVR =
    lesson.lesson_type === "vr";

  const isAR =
    lesson.lesson_type === "ar";

  const hasEmbed =
    Boolean(lesson.embed_url);

  const hasTest =
    Boolean(lesson.test_url);

  return (
    <>
      {hasModel && (
        <Script
          type="module"
          src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
          strategy="afterInteractive"
        />
      )}

      <main className="course-page lesson-page">

        {/* =====================================================
            BREADCRUMB
        ===================================================== */}

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


        {/* =====================================================
            LESSON HEADER
        ===================================================== */}

        <section className="course-hero">

          <div className="course-hero-main">

            <div className="course-label-row">

              <span
                className={`course-type ${
                  isVR
                    ? "course-type-vr"
                    : isAR
                    ? "course-type-ar"
                    : "course-type-course"
                }`}
              >
                {isVR
                  ? "VR DARS"
                  : isAR
                  ? "AR / 3D DARS"
                  : "DARS"}
              </span>

              {course.category && (
                <span className="course-category">
                  {course.category}
                </span>
              )}

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
                📚 {selectedIndex + 1} /
                {" "}
                {lessons.length} dars
              </span>

              <span>
                ⚡ +{lesson.xp_reward} XP
              </span>

              {isDone && (
                <span className="course-enrolled-meta">
                  ✓ Tugatilgan
                </span>
              )}

            </div>

          </div>

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
            LESSON NAVIGATION
        ===================================================== */}

        <section className="lesson-navigation">

          <div>

            {previousLesson ? (
              <Link
                href={
                  `/user/course/${id}` +
                  `/lesson/${previousLesson.id}`
                }
                className="btn btn-ghost"
              >
                ← Oldingi dars
              </Link>
            ) : (
              <span />
            )}

          </div>


          <div className="lesson-navigation-center">
            <span>
              Dars {selectedIndex + 1}
              {" / "}
              {lessons.length}
            </span>
          </div>


          <div>

            {nextLesson ? (
              <Link
                href={
                  `/user/course/${id}` +
                  `/lesson/${nextLesson.id}`
                }
                className="btn btn-primary"
              >
                Keyingi dars →
              </Link>
            ) : (
              <span />
            )}

          </div>

        </section>


        {/* =====================================================
            ASOSIY DARSLIK
        ===================================================== */}

        <section className="lesson-page-content">


          {/* ===================================================
              NAZARIYA
          =================================================== */}

          {lesson.content && (
            <section className="lesson-inline-block">

              <div className="lesson-inline-heading">

                <span>📖</span>

                <h2>
                  Nazariya
                </h2>

              </div>


              <div className="lesson-text">
                {lesson.content}
              </div>

            </section>
          )}


          {/* ===================================================
              PHET / INTERAKTIV MODUL
          =================================================== */}

          {hasEmbed && (
            <section
              className="lesson-inline-block"
              ref={
                viewerRef
              }
            >

              <div className="lesson-inline-heading">

                <span>
                  {isVR
                    ? "🥽"
                    : "🎮"}
                </span>

                <div>

                  <h2>
                    {isVR
                      ? "VR tajriba"
                      : "Interaktiv simulyatsiya"}
                  </h2>

                  <p>
                    Ushbu darsga tegishli
                    interaktiv material
                  </p>

                </div>

              </div>


              {/* Viewer controls */}

              <div className="lesson-viewer-toolbar">

                {!isFullscreen ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      enterFullscreen
                    }
                  >
                    ⛶ To‘liq ekran
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      exitFullscreen
                    }
                  >
                    ✕ To‘liq ekrandan chiqish
                  </button>
                )}

              </div>


              <div
                className={
                  `interactive-viewer ${
                    isFullscreen
                      ? "interactive-viewer-fullscreen"
                      : ""
                  }`
                }
              >

                <iframe
                  title={
                    lesson.title
                  }

                  src={
                    lesson.embed_url
                  }

                  allow={
                    "autoplay; " +
                    "fullscreen; " +
                    "xr-spatial-tracking; " +
                    "accelerometer; " +
                    "gyroscope; " +
                    "camera; " +
                    "microphone"
                  }

                  allowFullScreen

                  loading="lazy"

                  style={{
                    width: "100%",
                    height:
                      isFullscreen
                        ? "100vh"
                        : "650px",
                    border: "0",
                  }}
                />

              </div>


              {cameraMessage && (
                <div
                  className="course-alert course-alert-error"
                  role="alert"
                >
                  <span>📷</span>
                  <p>
                    {cameraMessage}
                  </p>
                </div>
              )}


              {/* AR camera permission */}

              {isAR && (
                <div className="lesson-ar-actions">

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      requestCameraPermission
                    }
                  >
                    📷 Kamerani tekshirish
                  </button>

                  <p className="viewer-help">
                    AR ishlashi uchun
                    brauzer kameraga ruxsat
                    so‘rashi mumkin.
                  </p>

                </div>
              )}


              {isVR && (
                <p className="viewer-help">
                  🥽 VR ko‘zoynakda ko‘rish
                  uchun avval to‘liq ekran
                  rejimini oching va
                  simulyatsiya ichidagi
                  VR rejimini tanlang.
                </p>
              )}

            </section>
          )}


          {/* ===================================================
              3D MODEL / AR
          =================================================== */}

          {hasModel && (
            <section className="lesson-inline-block">

              <div className="lesson-inline-heading">

                <span>🧊</span>

                <div>

                  <h2>
                    3D model va AR
                  </h2>

                  <p>
                    Modelni aylantiring va
                    AR rejimida ko‘ring.
                  </p>

                </div>

              </div>


              <div
                className="model-viewer-container"
                ref={viewerRef}
              >

                <model-viewer
                  src={
                    lesson.model_url
                  }

                  camera-controls

                  auto-rotate

                  ar

                  ar-modes={
                    "webxr scene-viewer quick-look"
                  }

                  shadow-intensity="1"

                  exposure="1"

                  style={{
                    width: "100%",
                    height: "480px",
                    background:
                      "#eef4ee",
                    borderRadius: "16px",
                  }}
                />

              </div>


              <p className="viewer-help">
                Modelni barmoq yoki
                sichqoncha bilan aylantiring.
                Telefoningiz AR'ni
                qo‘llab-quvvatlasa,
                modelni haqiqiy muhitda
                ko‘rishingiz mumkin.
              </p>

            </section>
          )}


          {/* ===================================================
              TEST
          =================================================== */}

          {hasTest && (
            <section className="lesson-inline-block">

              <div className="lesson-test-heading">

                <div className="lesson-inline-heading">

                  <span>✏️</span>

                  <h2>
                    Mavzu bo‘yicha test
                  </h2>

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
                  title={
                    `${lesson.title} — test`
                  }

                  src={
                    lesson.test_url
                  }

                  loading="lazy"

                  style={{
                    width: "100%",
                    minHeight:
                      "600px",
                    border: "0",
                  }}
                />

              </div>


              {testMsg && (
                <p
                  className="form-ok lesson-test-message"
                  role="status"
                >
                  {testMsg.text}
                </p>
              )}

            </section>
          )}


          {/* ===================================================
              DARSNI TUGATISH
          =================================================== */}

          <section className="lesson-complete-bar">

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

          </section>


          {/* ===================================================
              OLDINGI / KEYINGI
          =================================================== */}

          <div className="lesson-bottom-navigation">

            {previousLesson ? (
              <Link
                href={
                  `/user/course/${id}` +
                  `/lesson/${previousLesson.id}`
                }
                className="btn btn-ghost"
              >
                ← {previousLesson.title}
              </Link>
            ) : (
              <span />
            )}


            {nextLesson ? (
              <Link
                href={
                  `/user/course/${id}` +
                  `/lesson/${nextLesson.id}`
                }
                className="btn btn-primary"
              >
                {nextLesson.title} →
              </Link>
            ) : (
              <Link
                href={`/user/course/${id}`}
                className="btn btn-primary"
              >
                Kursni yakunlash →
              </Link>
            )}

          </div>

        </section>

      </main>
    </>
  );
}