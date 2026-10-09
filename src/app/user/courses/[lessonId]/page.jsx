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

  const courseUrl = useMemo(
    () =>
      `/api/user/course?id=${encodeURIComponent(id)}`,
    [id]
  );

  const {
    data: courseData,
    loading,
    error: courseError,
    refresh,
    mutate,
  } = useCachedApi(courseUrl);

  const [lesson, setLesson] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [done, setDone] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [testMessage, setTestMessage] = useState("");

  const [reward, setReward] = useState(null);

  /*
   * Visual fullscreen:
   *
   * Bu browser Fullscreen API ishlamagan holatda ham
   * viewer'ni butun ekran maydoniga chiqaradi.
   */
  const [visualFullscreen, setVisualFullscreen] =
    useState(false);

  const [browserFullscreen, setBrowserFullscreen] =
    useState(false);

  const [cameraStatus, setCameraStatus] =
    useState("");

  const [isEmbedded, setIsEmbedded] =
    useState(false);

  /*
   * MUHIM:
   * model viewer va iframe uchun alohida ref.
   */
  const modelViewerRef = useRef(null);
  const embedViewerRef = useRef(null);

  const fullscreenTargetRef = useRef(null);

  /*
   * ---------------------------------------------------------
   * COURSE DATA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!courseData) return;

    const nextLessons = Array.isArray(
      courseData.lessons
    )
      ? courseData.lessons
      : [];

    setLessons(nextLessons);

    setEnrolled(
      Boolean(
        courseData.enrolled ??
          courseData.is_enrolled ??
          false
      )
    );

    const currentLesson = nextLessons.find(
      (item) =>
        String(item.id) === String(lessonId)
    );

    setLesson(currentLesson || null);

    const completed =
      Array.isArray(courseData.completed_lessons)
        ? courseData.completed_lessons
        : Array.isArray(courseData.done)
        ? courseData.done
        : [];

    setDone(
      completed.some(
        (item) =>
          String(
            typeof item === "object"
              ? item.id
              : item
          ) === String(lessonId)
      )
    );
  }, [courseData, lessonId]);

  /*
   * ---------------------------------------------------------
   * PREVIOUS / NEXT LESSON
   * ---------------------------------------------------------
   */

  const currentIndex = useMemo(() => {
    return lessons.findIndex(
      (item) =>
        String(item.id) === String(lessonId)
    );
  }, [lessons, lessonId]);

  const previousLesson =
    currentIndex > 0
      ? lessons[currentIndex - 1]
      : null;

  const nextLesson =
    currentIndex >= 0 &&
    currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;

  /*
   * ---------------------------------------------------------
   * EMBEDDED PAGE DETECTION
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      setIsEmbedded(
        window.top !== window.self
      );
    } catch {
      setIsEmbedded(true);
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * BROWSER FULLSCREEN CHANGE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active =
        document.fullscreenElement;

      setBrowserFullscreen(Boolean(active));

      /*
       * Browser fullscreen'dan chiqilganda
       * visual fullscreen ham yopiladi.
       */
      if (!active) {
        setVisualFullscreen(false);
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

  /*
   * ---------------------------------------------------------
   * BODY SCROLL LOCK
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!visualFullscreen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [visualFullscreen]);

  /*
   * ---------------------------------------------------------
   * ESC KEY
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (visualFullscreen) {
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
  }, [visualFullscreen]);

  /*
   * ---------------------------------------------------------
   * FULLSCREEN
   * ---------------------------------------------------------
   */

  const openFullscreen = useCallback(
    async (target) => {
      if (!target) return;

      fullscreenTargetRef.current = target;

      /*
       * 1. Avval visual fullscreen.
       *
       * Bu requestFullscreen ishlamasa ham
       * viewer'ni to'liq ekran qiladi.
       */
      setVisualFullscreen(true);

      /*
       * 2. Keyin browser fullscreenni sinab ko'ramiz.
       */
      try {
        if (
          document.fullscreenEnabled &&
          !document.fullscreenElement &&
          typeof target.requestFullscreen ===
            "function"
        ) {
          await target.requestFullscreen({
            navigationUI: "hide",
          });
        }
      } catch (err) {
        console.warn(
          "Browser fullscreen ishlamadi:",
          err
        );

        /*
         * Xato bo'lsa ham visual fullscreen
         * ishlashda davom etadi.
         */
      }
    },
    []
  );

  const closeFullscreen = useCallback(
    async () => {
      setVisualFullscreen(false);

      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn(
          "Fullscreen'dan chiqishda xato:",
          err
        );
      }

      fullscreenTargetRef.current = null;
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * CAMERA PERMISSION
   * ---------------------------------------------------------
   *
   * Eslatma:
   * Bu GreenEdu sahifasining kamerasi.
   * Cross-origin iframe ichidagi Sketchfab/Assemblr
   * kamerasi provider tomonidan boshqariladi.
   */

  const requestCamera = useCallback(
    async () => {
      setCameraStatus("");

      if (typeof window === "undefined") {
        return;
      }

      if (!window.isSecureContext) {
        setCameraStatus(
          "Kamera faqat HTTPS yoki localhost orqali ishlaydi."
        );

        return;
      }

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices
          .getUserMedia !== "function"
      ) {
        setCameraStatus(
          "Brauzer kameradan foydalanishni qo‘llab-quvvatlamaydi."
        );

        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: false,
            }
          );

        stream
          .getTracks()
          .forEach((track) => track.stop());

        setCameraStatus(
          "Kamera uchun ruxsat berildi."
        );
      } catch (err) {
        console.error(
          "Camera permission error:",
          err
        );

        if (err?.name === "NotAllowedError") {
          setCameraStatus(
            "Kamera ruxsati berilmadi. Brauzer sozlamalaridan kamera uchun ruxsat bering."
          );
        } else if (
          err?.name === "NotFoundError"
        ) {
          setCameraStatus(
            "Kamera qurilmasi topilmadi."
          );
        } else {
          setCameraStatus(
            "Kamerani ishga tushirib bo‘lmadi."
          );
        }
      }
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * STANDALONE OPEN
   * ---------------------------------------------------------
   */

  const openStandalone = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.open(
      window.location.href,
      "_blank",
      "noopener,noreferrer"
    );
  }, []);

  /*
   * ---------------------------------------------------------
   * COMPLETE LESSON
   * ---------------------------------------------------------
   */

  const handleComplete = useCallback(async () => {
    if (!lesson || busy || done) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await apiFetch(
        "/api/user/complete-lesson",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            courseId: id,
          }),
        }
      );

      setDone(true);

      /*
       * Local course cache'ni yangilaymiz.
       */
      mutate((previous) => {
        if (!previous) return previous;

        const oldCompleted =
          Array.isArray(
            previous.completed_lessons
          )
            ? previous.completed_lessons
            : [];

        const exists = oldCompleted.some(
          (item) =>
            String(
              typeof item === "object"
                ? item.id
                : item
            ) === String(lesson.id)
        );

        if (exists) {
          return previous;
        }

        return {
          ...previous,
          completed_lessons: [
            ...oldCompleted,
            lesson.id,
          ],
        };
      });

      /*
       * Dashboard cache ham eskirmasin.
       */
      invalidateCache(
        "/api/user/dashboard"
      );

      setReward(
        result?.reward ??
          result?.points ??
          null
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Darsni yakunlashda xatolik yuz berdi."
      );
    } finally {
      setBusy(false);
    }
  }, [
    lesson,
    busy,
    done,
    id,
    mutate,
  ]);

  /*
   * ---------------------------------------------------------
   * TEST RESULT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!lesson?.test_url) {
      return;
    }

    const handleMessage = async (event) => {
      if (
        event.data?.type !==
        TEST_RESULT_MESSAGE
      ) {
        return;
      }

      let testOrigin = "";

      try {
        testOrigin = new URL(
          lesson.test_url
        ).origin;
      } catch {
        return;
      }

      if (event.origin !== testOrigin) {
        return;
      }

      const payload =
        event.data?.payload ?? event.data;

      setTestMessage(
        payload?.message ||
          "Test natijasi qabul qilindi."
      );

      try {
        await apiFetch(
          "/api/user/test-result",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              lessonId: lesson.id,
              courseId: id,
              result: payload,
            }),
          }
        );

        /*
         * Test muvaffaqiyatli bo'lsa,
         * lessonni avtomatik yakunlash.
         */
        if (
          payload?.passed === true ||
          payload?.success === true
        ) {
          await handleComplete();
        }
      } catch (err) {
        console.error(
          "Test result error:",
          err
        );
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
    id,
    handleComplete,
  ]);

  /*
   * ---------------------------------------------------------
   * RETRY
   * ---------------------------------------------------------
   */

  const retry = useCallback(() => {
    setError("");

    refresh();
  }, [refresh]);

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading && !lesson) {
    return (
      <div className="min-h-screen bg-white">
        <SkeletonPageHead />
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (courseError && !courseData) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">
            !
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Ma’lumotni yuklab bo‘lmadi
          </h1>

          <p className="mt-3 text-gray-600">
            {courseError}
          </p>

          <button
            type="button"
            onClick={retry}
            className="mt-6 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            Qayta urinish
          </button>
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * LESSON NOT FOUND
   * ---------------------------------------------------------
   */

  if (!lesson) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Dars topilmadi
          </h1>

          <p className="mt-3 text-gray-600">
            Ushbu dars mavjud emas yoki o‘chirib
            tashlangan.
          </p>

          <Link
            href={`/user/course/${id}`}
            className="mt-6 inline-flex rounded-xl bg-green-600 px-5 py-3 font-semibold text-white"
          >
            Kursga qaytish
          </Link>
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * CONTENT FLAGS
   * ---------------------------------------------------------
   */

  const hasModel = Boolean(
    lesson.model_url
  );

  const hasEmbed = Boolean(
    lesson.embed_url
  );

  const hasTest = Boolean(
    lesson.test_url
  );

  const hasContent = Boolean(
    lesson.content ||
      hasModel ||
      hasEmbed ||
      hasTest
  );

  /*
   * ---------------------------------------------------------
   * FULLSCREEN CLASSES
   * ---------------------------------------------------------
   */

  const viewerFullscreenClass =
    visualFullscreen
      ? "fixed inset-0 z-[99999] h-[100dvh] w-screen bg-black"
      : "relative w-full overflow-hidden rounded-2xl bg-black";

  return (
    <>
      <Script
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        type="module"
      />

      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* ------------------------------------------------ */}
          {/* BACK */}
          {/* ------------------------------------------------ */}

          <div className="mb-5">
            <Link
              href={`/user/course/${id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-600"
            >
              ← Kursga qaytish
            </Link>
          </div>

          {/* ------------------------------------------------ */}
          {/* HEADER */}
          {/* ------------------------------------------------ */}

          <section className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {lesson.order != null && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Dars {lesson.order}
                </span>
              )}

              {done && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  ✓ Yakunlangan
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {lesson.title ||
                `Dars ${lesson.order ?? ""}`}
            </h1>

            {lesson.description && (
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                {lesson.description}
              </p>
            )}
          </section>

          {/* ------------------------------------------------ */}
          {/* EMBED WARNING */}
          {/* ------------------------------------------------ */}

          {isEmbedded && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-amber-900">
                    AR/VR uchun alohida oynada oching
                  </p>

                  <p className="mt-1 text-sm text-amber-800">
                    Kamera va WebXR ruxsatlari
                    brauzer tomonidan alohida boshqariladi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openStandalone}
                  className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Alohida oynada ochish
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------ */}
          {/* CONTENT */}
          {/* ------------------------------------------------ */}

          {hasContent ? (
            <div className="space-y-6">
              {/* ------------------------------------------ */}
              {/* TEXT */}
              {/* ------------------------------------------ */}

              {lesson.content && (
                <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                  <div
                    className="prose prose-gray max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: lesson.content,
                    }}
                  />
                </article>
              )}

              {/* ------------------------------------------ */}
              {/* MODEL VIEWER */}
              {/* ------------------------------------------ */}

              {hasModel && (
                <section>
                  <div
                    className={
                      visualFullscreen &&
                      fullscreenTargetRef.current ===
                        modelViewerRef.current
                        ? viewerFullscreenClass
                        : "relative w-full overflow-hidden rounded-2xl bg-black"
                    }
                    ref={modelViewerRef}
                  >
                    <model-viewer
                      src={lesson.model_url}
                      alt={
                        lesson.title ||
                        "3D model"
                      }
                      camera-controls
                      touch-action="pan-y"
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      shadow-intensity="1"
                      exposure="1"
                      loading="eager"
                      style={{
                        width: "100%",
                        height:
                          visualFullscreen &&
                          fullscreenTargetRef.current ===
                            modelViewerRef.current
                            ? "100dvh"
                            : "500px",
                        background:
                          "#050505",
                      }}
                    />

                    <div className="absolute right-3 top-3 z-10 flex gap-2">
                      {!(
                        visualFullscreen &&
                        fullscreenTargetRef.current ===
                          modelViewerRef.current
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            openFullscreen(
                              modelViewerRef.current
                            )
                          }
                          className="rounded-xl bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/90"
                        >
                          ⛶ To‘liq ekran
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={closeFullscreen}
                          className="rounded-xl bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/90"
                        >
                          ✕ Yopish
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={requestCamera}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      📷 Kameraga ruxsat
                    </button>

                    {cameraStatus && (
                      <span className="flex items-center rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
                        {cameraStatus}
                      </span>
                    )}
                  </div>
                </section>
              )}

              {/* ------------------------------------------ */}
              {/* EXTERNAL EMBED */}
              {/* ------------------------------------------ */}

              {hasEmbed && (
                <section>
                  <div
                    ref={embedViewerRef}
                    className={
                      visualFullscreen &&
                      fullscreenTargetRef.current ===
                        embedViewerRef.current
                        ? viewerFullscreenClass
                        : "relative w-full overflow-hidden rounded-2xl bg-black"
                    }
                  >
                    <iframe
                      src={lesson.embed_url}
                      title={
                        lesson.title ||
                        "AR/VR kontent"
                      }
                      className="block w-full border-0"
                      style={{
                        height:
                          visualFullscreen &&
                          fullscreenTargetRef.current ===
                            embedViewerRef.current
                            ? "100dvh"
                            : "600px",
                      }}
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
                      referrerPolicy="strict-origin-when-cross-origin"
                    />

                    <div className="absolute right-3 top-3 z-20 flex gap-2">
                      {!(
                        visualFullscreen &&
                        fullscreenTargetRef.current ===
                          embedViewerRef.current
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            openFullscreen(
                              embedViewerRef.current
                            )
                          }
                          className="rounded-xl bg-black/75 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-black"
                        >
                          ⛶ To‘liq ekran
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={closeFullscreen}
                          className="rounded-xl bg-black/75 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-black"
                        >
                          ✕ Yopish
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                    <strong>AR/VR:</strong>{" "}
                    Agar provider ichida VR yoki AR
                    tugmasi mavjud bo‘lsa, undan
                    foydalaning.
                  </div>
                </section>
              )}

              {/* ------------------------------------------ */}
              {/* TEST */}
              {/* ------------------------------------------ */}

              {hasTest && (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <h2 className="font-bold text-gray-900">
                      Test
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Darsni mustahkamlash uchun
                      testni bajaring.
                    </p>
                  </div>

                  <iframe
                    src={lesson.test_url}
                    title="Dars testi"
                    className="block min-h-[650px] w-full border-0"
                    allow="
                      autoplay *;
                      fullscreen *;
                      camera *;
                      microphone *;
                    "
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />

                  {testMessage && (
                    <div className="border-t border-gray-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
                      {testMessage}
                    </div>
                  )}
                </section>
              )}

              {/* ------------------------------------------ */}
              {/* DOWNLOAD */}
              {/* ------------------------------------------ */}

              {lesson.file_url && (
                <a
                  href={lesson.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <DownloadIcon />
                  Materialni yuklab olish
                </a>
              )}

              {/* ------------------------------------------ */}
              {/* COMPLETE */}
              {/* ------------------------------------------ */}

              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {reward != null && (
                  <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                    🎉 Dars yakunlandi!
                    {typeof reward ===
                      "number"
                      ? ` +${reward} ball`
                      : ""}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      Dars holati
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {done
                        ? "Bu darsni muvaffaqiyatli yakunlagansiz."
                        : "Materialni o‘rganib bo‘lgach, darsni yakunlang."}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={done || busy}
                    onClick={handleComplete}
                    className={[
                      "rounded-xl px-5 py-3 text-sm font-bold transition",
                      done
                        ? "cursor-default bg-green-100 text-green-700"
                        : "bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60",
                    ].join(" ")}
                  >
                    {busy
                      ? "Saqlanmoqda..."
                      : done
                      ? "✓ Yakunlangan"
                      : "Darsni yakunlash"}
                  </button>
                </div>
              </section>

              {/* ------------------------------------------ */}
              {/* NAVIGATION */}
              {/* ------------------------------------------ */}

              <div className="grid gap-3 sm:grid-cols-2">
                {previousLesson ? (
                  <Link
                    href={`/user/course/${id}/lesson/${previousLesson.id}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 hover:border-green-300 hover:bg-green-50"
                  >
                    <span className="text-xs font-semibold text-gray-500">
                      ← Oldingi dars
                    </span>

                    <span className="mt-1 block font-semibold text-gray-900">
                      {previousLesson.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}

                {nextLesson ? (
                  <Link
                    href={`/user/course/${id}/lesson/${nextLesson.id}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-green-300 hover:bg-green-50 sm:text-right"
                  >
                    <span className="text-xs font-semibold text-gray-500">
                      Keyingi dars →
                    </span>

                    <span className="mt-1 block font-semibold text-gray-900">
                      {nextLesson.title}
                    </span>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                Bu darsda hozircha material yo‘q
              </h2>

              <p className="mt-2 text-gray-500">
                Keyinroq qayta tekshirib ko‘ring.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}