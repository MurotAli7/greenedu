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

import {
  prefetchApi,
  useCachedApi,
  invalidateCache,
} from "@/lib/api/useCached";

import { apiFetch } from "@/lib/api/client";


// ============================================================
// PAGE
// ============================================================

export default function CoursePage({
  params,
}) {
  const { id } = use(params);

  // ==========================================================
  // STATE
  // ==========================================================

  const [course, setCourse] =
    useState(null);

  const [lessons, setLessons] =
    useState([]);

  const [enrolled, setEnrolled] =
    useState(false);

  const [done, setDone] =
    useState(new Set());

  const [openLesson, setOpenLesson] =
    useState(null);

  const [lessonDetails, setLessonDetails] =
    useState(
      () => new Map()
    );

  const [lessonLoading, setLessonLoading] =
    useState(
      () => new Set()
    );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [reward, setReward] =
    useState(null);

  const [testMessage, setTestMessage] =
    useState(null);

  const [fullscreenLesson, setFullscreenLesson] =
    useState(null);

  const fullscreenRef =
    useRef(null);


  // ==========================================================
  // URL'LAR
  // ==========================================================

  const courseUrl =
    `/api/user/course?id=${encodeURIComponent(
      id
    )}`;

  const lessonsUrl =
    `/api/user/course/lessons?id=${encodeURIComponent(
      id
    )}`;


  // ==========================================================
  // COURSE
  // ==========================================================

  const {
    data: courseData,
    loading: courseLoading,
    error: courseError,
    mutate: mutateCourse,
  } = useCachedApi(
    courseUrl
  );


  // ==========================================================
  // LESSONS
  // ==========================================================

  const {
    data: lessonsData,
    loading: lessonsLoading,
    error: lessonsError,
    mutate: mutateLessons,
  } = useCachedApi(
    lessonsUrl
  );


  // ==========================================================
  // COURSE DATA
  // ==========================================================

  useEffect(() => {
    if (!courseData) {
      return;
    }

    setCourse(
      courseData.course ||
        null
    );

    setEnrolled(
      Boolean(
        courseData.enrolled
      )
    );
  }, [
    courseData,
  ]);


  // ==========================================================
  // LESSON DATA
  // ==========================================================

  useEffect(() => {
    if (!lessonsData) {
      return;
    }

    setLessons(
      Array.isArray(
        lessonsData.lessons
      )
        ? lessonsData.lessons
        : []
    );

    setDone(
      new Set(
        Array.isArray(
          lessonsData.doneLessonIds
        )
          ? lessonsData.doneLessonIds
          : []
      )
    );
  }, [
    lessonsData,
  ]);


  // ==========================================================
  // ERROR
  // ==========================================================

  useEffect(() => {
    if (
      courseError ||
      lessonsError
    ) {
      setError(
        courseError ||
          lessonsError
      );
    }
  }, [
    courseError,
    lessonsError,
  ]);


  // ==========================================================
  // LESSON URL
  // ==========================================================

  const lessonUrl =
    useCallback(
      (lessonId) =>
        `/api/user/course/lesson?courseId=${encodeURIComponent(
          id
        )}&lessonId=${encodeURIComponent(
          lessonId
        )}`,
      [id]
    );


  // ==========================================================
  // SAVE LESSON DETAIL
  // ==========================================================

  const saveLessonDetail =
    useCallback(
      (
        lessonId,
        data
      ) => {
        if (
          !data?.lesson
        ) {
          return;
        }

        setLessonDetails(
          (previous) => {
            const next =
              new Map(
                previous
              );

            next.set(
              String(
                lessonId
              ),
              data.lesson
            );

            return next;
          }
        );
      },
      []
    );


  // ==========================================================
  // LOAD ONE LESSON
  // ==========================================================

  const loadLessonDetail =
    useCallback(
      async (
        lesson
      ) => {
        if (
          !lesson?.id ||
          !enrolled
        ) {
          return null;
        }

        const key =
          String(
            lesson.id
          );

        const cached =
          lessonDetails.get(
            key
          );

        if (cached) {
          return cached;
        }

        setLessonLoading(
          (previous) => {
            const next =
              new Set(
                previous
              );

            next.add(key);

            return next;
          }
        );

        try {
          const data =
            await prefetchApi(
              lessonUrl(
                lesson.id
              )
            );

          saveLessonDetail(
            lesson.id,
            data
          );

          return (
            data?.lesson ||
            null
          );

        } catch (err) {
          setError(
            err?.message ||
              "Darsni yuklab bo'lmadi."
          );

          return null;

        } finally {
          setLessonLoading(
            (previous) => {
              const next =
                new Set(
                  previous
                );

              next.delete(key);

              return next;
            }
          );
        }
      },
      [
        enrolled,
        lessonDetails,
        lessonUrl,
        saveLessonDetail,
      ]
    );


  // ==========================================================
  // PRELOAD FIRST TWO LESSONS
  // ==========================================================

  useEffect(() => {
    if (
      !enrolled ||
      lessons.length === 0
    ) {
      return;
    }

    const preload =
      () => {
        lessons
          .slice(0, 2)
          .forEach(
            (lesson) => {
              const key =
                String(
                  lesson.id
                );

              if (
                lessonDetails.has(
                  key
                )
              ) {
                return;
              }

              prefetchApi(
                lessonUrl(
                  lesson.id
                )
              )
                .then(
                  (data) => {
                    saveLessonDetail(
                      lesson.id,
                      data
                    );
                  }
                )
                .catch(
                  () => {}
                );
            }
          );
      };


    if (
      typeof window !==
        "undefined" &&
      "requestIdleCallback" in
        window
    ) {
      const handle =
        window.requestIdleCallback(
          preload,
          {
            timeout: 1200,
          }
        );

      return () => {
        window.cancelIdleCallback?.(
          handle
        );
      };
    }


    const handle =
      window.setTimeout(
        preload,
        250
      );

    return () =>
      window.clearTimeout(
        handle
      );

  }, [
    enrolled,
    lessons,
    lessonDetails,
    lessonUrl,
    saveLessonDetail,
  ]);


  // ==========================================================
  // OPEN LESSON
  // ==========================================================

  const handleOpenLesson =
    useCallback(
      async (
        lesson
      ) => {
        if (!lesson?.id) {
          return;
        }

        setError("");
        setReward(null);
        setTestMessage(null);

        const key =
          String(
            lesson.id
          );


        // Agar ochiq bo'lsa yopamiz
        if (
          String(
            openLesson
          ) === key
        ) {
          setOpenLesson(null);
          return;
        }


        // UI darhol ochiladi
        setOpenLesson(
          lesson.id
        );


        // Lekin og'ir content
        // alohida olinadi
        await loadLessonDetail(
          lesson
        );


        // ====================================================
        // KEYINGI 2 TA DARS
        // ====================================================

        const currentIndex =
          lessons.findIndex(
            (item) =>
              String(
                item.id
              ) === key
          );

        if (
          currentIndex < 0
        ) {
          return;
        }


        lessons
          .slice(
            currentIndex + 1,
            currentIndex + 3
          )
          .forEach(
            (nextLesson) => {
              const nextKey =
                String(
                  nextLesson.id
                );

              if (
                lessonDetails.has(
                  nextKey
                )
              ) {
                return;
              }

              prefetchApi(
                lessonUrl(
                  nextLesson.id
                )
              )
                .then(
                  (data) => {
                    saveLessonDetail(
                      nextLesson.id,
                      data
                    );
                  }
                )
                .catch(
                  () => {}
                );
            }
          );

      },
      [
        lessonDetails,
        lessonUrl,
        lessons,
        loadLessonDetail,
        openLesson,
        saveLessonDetail,
      ]
    );


  // ==========================================================
  // ENROLL
  // ==========================================================

  const handleEnroll =
    useCallback(
      async () => {
        if (
          !id ||
          busy
        ) {
          return;
        }

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


          // Course cache
          mutateCourse(
            (previous) => ({
              ...(previous || {}),
              enrolled: true,
            })
          );


          // Lessons qayta yuklansin
          invalidateCache(
            lessonsUrl
          );

          await prefetchApi(
            lessonsUrl,
            {
              force: true,
            }
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
      [
        id,
        busy,
        lessonsUrl,
        mutateCourse,
      ]
    );


  // ==========================================================
  // COMPLETE LESSON
  // ==========================================================

  const handleComplete =
    useCallback(
      async (
        lesson
      ) => {
        if (
          !lesson?.id ||
          busy
        ) {
          return;
        }

        setBusy(true);
        setError("");
        setReward(null);

        try {
          const result =
            await apiFetch(
              "/api/user/complete-lesson",
              {
                method: "POST",
                body: {
                  lessonId:
                    lesson.id,
                },
              }
            );


          // Local progress
          setDone(
            (previous) => {
              const next =
                new Set(
                  previous
                );

              next.add(
                lesson.id
              );

              return next;
            }
          );


          // Lessons cache
          mutateLessons(
            (previous) => {
              if (
                !previous
              ) {
                return previous;
              }

              const ids =
                new Set(
                  previous.doneLessonIds ||
                    []
                );

              ids.add(
                lesson.id
              );

              return {
                ...previous,
                doneLessonIds:
                  Array.from(
                    ids
                  ),
              };
            }
          );


          if (
            result?.reward
          ) {
            setReward(
              result.reward
            );
          }

        } catch (err) {
          setError(
            err?.message ||
              "Darsni tugatishda xatolik yuz berdi."
          );

        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        mutateLessons,
      ]
    );


  // ==========================================================
  // FULLSCREEN
  // ==========================================================

  const openFullscreen =
    useCallback(
      async (
        lessonId
      ) => {
        setFullscreenLesson(
          lessonId
        );

        setTimeout(
          async () => {
            try {
              if (
                fullscreenRef.current
                  ?.requestFullscreen
              ) {
                await fullscreenRef.current
                  .requestFullscreen();
              }
            } catch {}
          },
          50
        );
      },
      []
    );


  const closeFullscreen =
    useCallback(
      async () => {
        try {
          if (
            document.fullscreenElement
          ) {
            await document.exitFullscreen();
          }
        } catch {}

        setFullscreenLesson(
          null
        );
      },
      []
    );


  useEffect(() => {
    const handleFullscreen =
      () => {
        if (
          !document.fullscreenElement
        ) {
          setFullscreenLesson(
            null
          );
        }
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreen
    );

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreen
      );
  }, []);


  // ==========================================================
  // TEST MESSAGE
  // ==========================================================

  useEffect(() => {
    const handleMessage =
      async (event) => {
        if (
          event.data?.type !==
          "TEST_RESULT_MESSAGE"
        ) {
          return;
        }

        try {
          const result =
            await apiFetch(
              "/api/user/test-result",
              {
                method: "POST",
                body: event.data,
              }
            );

          setTestMessage(
            result
          );

        } catch (err) {
          setError(
            err?.message ||
              "Test natijasini saqlab bo'lmadi."
          );
        }
      };

    window.addEventListener(
      "message",
      handleMessage
    );

    return () =>
      window.removeEventListener(
        "message",
        handleMessage
      );
  }, []);


  // ==========================================================
  // PROGRESS
  // ==========================================================

  const doneCount =
    lessons.filter(
      (lesson) =>
        done.has(
          lesson.id
        )
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


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    courseLoading &&
    !course
  ) {
    return (
      <main className="course-page">
        <div className="course-loading">
          Kurs yuklanmoqda...
        </div>
      </main>
    );
  }


  // ==========================================================
  // NOT FOUND
  // ==========================================================

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


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <>
      <Script
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        type="module"
      />

      <main className="course-page">

        {/* ===================================================
            BREADCRUMB
        =================================================== */}

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


        {/* ===================================================
            HERO
        =================================================== */}

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


        {/* ===================================================
            ERROR
        =================================================== */}

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
            PROGRESS
        =================================================== */}

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


        {/* ===================================================
            LESSONS
        =================================================== */}

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


          {/* =================================================
              LESSON LOADING
          ================================================= */}

          {lessonsLoading &&
            lessons.length === 0 && (
              <div className="empty-lessons">
                <div className="empty-lessons-icon">
                  ⏳
                </div>

                <h3>
                  Darslar yuklanmoqda...
                </h3>

                <p>
                  Darslar ro‘yxati
                  tayyorlanmoqda.
                </p>
              </div>
            )}


          {/* =================================================
              EMPTY
          ================================================= */}

          {!lessonsLoading &&
            lessons.length === 0 && (
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
            )}


          {lessons.length > 0 && (
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

                  const detail =
                    lessonDetails.get(
                      String(
                        lesson.id
                      )
                    ) || null;

                  const detailLoading =
                    lessonLoading.has(
                      String(
                        lesson.id
                      )
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

                      {/* =================================
                          HEADER
                      ================================= */}

                      <button
                        type="button"
                        className="lesson-card-main"
                        onClick={() =>
                          enrolled &&
                          handleOpenLesson(
                            lesson
                          )
                        }
                        disabled={
                          !enrolled
                        }
                      >

                        <div
                          className={`lesson-number ${
                            isDone
                              ? "lesson-number-done"
                              : ""
                          }`}
                        >
                          {isDone
                            ? "✓"
                            : String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                        </div>


                        <div className="lesson-info">

                          <h3>
                            {lesson.title}
                          </h3>

                          {lesson.summary && (
                            <p>
                              {lesson.summary}
                            </p>
                          )}

                        </div>


                        <div className="lesson-action">

                          {detailLoading &&
                            isOpen && (
                              <span>
                                ⏳
                              </span>
                            )}

                          {!detailLoading &&
                            isDone && (
                              <span>
                                ✓
                              </span>
                            )}

                          {!detailLoading &&
                            !isDone && (
                              <span>
                                →
                              </span>
                            )}

                        </div>

                      </button>


                      {/* =================================
                          INLINE CONTENT
                      ================================= */}

                      {enrolled &&
                        isOpen && (
                          <div
                            className="lesson-inline-content"
                            ref={
                              fullscreenRef
                            }
                          >

                            {/* LOADING */}

                            {detailLoading &&
                              !detail && (
                                <div className="lesson-inline-block">

                                  <div className="lesson-inline-heading">

                                    <span>
                                      ⏳
                                    </span>

                                    <h4>
                                      Dars yuklanmoqda...
                                    </h4>

                                  </div>

                                  <div className="lesson-text">
                                    Dars materiali
                                    tayyorlanmoqda.
                                    Biroz kuting...
                                  </div>

                                </div>
                              )}


                            {/* CONTENT */}

                            {detail && (
                              <>

                                {detail.content && (
                                  <div className="lesson-inline-block">

                                    <div className="lesson-inline-heading">

                                      <span>
                                        📖
                                      </span>

                                      <h4>
                                        Dars materiali
                                      </h4>

                                    </div>

                                    <div
                                      className="lesson-text"
                                      dangerouslySetInnerHTML={{
                                        __html:
                                          detail.content,
                                      }}
                                    />

                                  </div>
                                )}


                                {/* MODEL */}

                                {detail.model_url && (
                                  <div className="lesson-inline-block">

                                    <div className="lesson-inline-heading">

                                      <span>
                                        🧊
                                      </span>

                                      <h4>
                                        3D model
                                      </h4>

                                    </div>

                                    <model-viewer
                                      src={
                                        detail.model_url
                                      }
                                      camera-controls
                                      auto-rotate
                                      ar
                                      ar-modes="webxr scene-viewer quick-look"
                                      style={{
                                        width:
                                          "100%",
                                        height:
                                          "500px",
                                      }}
                                    />

                                  </div>
                                )}


                                {/* AR / VR */}

                                {detail.embed_url && (
                                  <div className="lesson-inline-block">

                                    <div className="lesson-inline-heading">

                                      <span>
                                        🥽
                                      </span>

                                      <h4>
                                        AR / VR
                                      </h4>

                                    </div>

                                    <div className="lesson-embed-wrapper">

                                      <iframe
                                        src={
                                          detail.embed_url
                                        }
                                        title={
                                          detail.title ||
                                          "AR / VR dars"
                                        }
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
                                        loading="eager"
                                        style={{
                                          width:
                                            "100%",
                                          minHeight:
                                            "600px",
                                          border:
                                            "none",
                                        }}
                                      />

                                    </div>

                                  </div>
                                )}


                                {/* TEST */}

                                {detail.test_url && (
                                  <div className="lesson-inline-block">

                                    <div className="lesson-inline-heading">

                                      <span>
                                        📝
                                      </span>

                                      <h4>
                                        Test
                                      </h4>

                                    </div>

                                    <iframe
                                      src={
                                        detail.test_url
                                      }
                                      title="Test"
                                      allow="
                                        fullscreen *;
                                        camera *;
                                        microphone *;
                                      "
                                      allowFullScreen
                                      loading="eager"
                                      style={{
                                        width:
                                          "100%",
                                        minHeight:
                                          "650px",
                                        border:
                                          "none",
                                      }}
                                    />

                                  </div>
                                )}


                                {/* FULLSCREEN */}

                                {(detail.embed_url ||
                                  detail.model_url) && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      openFullscreen(
                                        lesson.id
                                      )
                                    }
                                  >
                                    ⛶ To‘liq ekran
                                  </button>
                                )}


                                {/* COMPLETE */}

                                {!isDone && (
                                  <div className="lesson-complete-area">

                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() =>
                                        handleComplete(
                                          lesson
                                        )
                                      }
                                      disabled={
                                        busy
                                      }
                                    >
                                      {busy
                                        ? "Saqlanmoqda..."
                                        : "✓ Darsni tugatdim"}
                                    </button>

                                  </div>
                                )}


                                {isDone && (
                                  <div className="lesson-complete-success">
                                    ✓ Bu dars
                                    tugatilgan
                                  </div>
                                )}

                              </>
                            )}

                          </div>
                        )}

                    </article>
                  );
                }
              )}

            </div>
          )}


          {/* =================================================
              NOT ENROLLED
          ================================================= */}

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

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      handleEnroll
                    }
                    disabled={
                      busy
                    }
                  >
                    {busy
                      ? "Yozilmoqda..."
                      : "Kursga yozilish"}
                  </button>

                </div>

              </div>
            )}

        </section>

      </main>
    </>
  );
}