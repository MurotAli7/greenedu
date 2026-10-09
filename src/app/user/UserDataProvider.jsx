"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { useCachedApi } from "@/lib/api/useCached";

const UserDataContext = createContext(null);

export function UserDataProvider({ children }) {
  const supabase = useMemo(() => createClient(), []);

  /* =========================================================
     USER
     ========================================================= */

  const [user, setUser] = useState(null);

  /* =========================================================
     PROFILE
     ========================================================= */

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /* =========================================================
     NOTIFICATIONS
     ========================================================= */

  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  /* =========================================================
     DASHBOARD - BO'LAKLAB YUKLASH
     
     Endi eski:
     
       /api/user/dashboard

     o'rniga:

       /api/user/dashboard/stats
       /api/user/dashboard/courses
       /api/user/dashboard/library
       /api/user/dashboard/badges

     ishlatiladi.

     Barcha 4 ta request parallel boshlanadi.
     ========================================================= */

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
    mutate: mutateStats,
  } = useCachedApi("/api/user/dashboard/stats");

  const {
    data: coursesData,
    loading: coursesLoading,
    error: coursesError,
    refresh: refreshCourses,
    mutate: mutateCourses,
  } = useCachedApi("/api/user/dashboard/courses");

  const {
    data: libraryData,
    loading: libraryLoading,
    error: libraryError,
    refresh: refreshLibrary,
    mutate: mutateLibrary,
  } = useCachedApi("/api/user/dashboard/library");

  const {
    data: badgesData,
    loading: badgesLoading,
    error: badgesError,
    refresh: refreshBadges,
    mutate: mutateBadges,
  } = useCachedApi("/api/user/dashboard/badges");

  /* =========================================================
     DASHBOARD MA'LUMOTLARI
     ========================================================= */

  /*
   * stats API:
   *
   * {
   *   firstName,
   *   avatarUrl,
   *   stats
   * }
   */

  const dashboardStats = statsData?.stats || null;

  /*
   * courses API:
   *
   * {
   *   courses: [...]
   * }
   */

  const enrolledCourses = coursesData?.courses || [];

  /*
   * library API:
   *
   * {
   *   courses: [...]
   * }
   */

  const libraryCourses = libraryData?.courses || [];

  /*
   * badges API:
   *
   * {
   *   badges: [...]
   * }
   */

  const badges = badgesData?.badges || [];

  /* =========================================================
     PROFILE'DAN FALLBACK
     ========================================================= */

  const firstName =
    statsData?.firstName ||
    profile?.full_name?.trim()?.split(/\s+/)?.[0] ||
    "";

  const avatarUrl =
    statsData?.avatarUrl ||
    profile?.avatar_url ||
    "";

  /* =========================================================
     DASHBOARD OBJECT
     
     Eski componentlar "dashboard"dan foydalanayotgan bo'lsa,
     ularni buzmaslik uchun barcha bo'laklarni bitta obyektga
     birlashtirib beramiz.

     Muhim:
     Bu obyekt barcha request tugashini kutmaydi.
     Qaysi ma'lumot kelgan bo'lsa, o'sha darhol mavjud bo'ladi.
     ========================================================= */

  const dashboard = useMemo(
    () => ({
      firstName,
      avatarUrl,
      stats: dashboardStats,
      enrolled: enrolledCourses,
      library: libraryCourses,
      badges,
    }),
    [
      firstName,
      avatarUrl,
      dashboardStats,
      enrolledCourses,
      libraryCourses,
      badges,
    ]
  );

  /* =========================================================
     DASHBOARD LOADING
     
     Faqat stats hali kelmagan bo'lsa asosiy dashboard loading
     hisoblanadi.

     Shuning uchun:
     
       stats keladi
          ↓
       page ochiladi
          ↓
       courses/library/badges hali kelayotgan bo'lishi mumkin
          ↓
       ular kelganida UI avtomatik yangilanadi

     Bu biz xohlagan "chunk loading".
     ========================================================= */

  const dashboardLoading =
    !dashboardStats && statsLoading;

  /* =========================================================
     DASHBOARD ERROR
     
     Stats xatosi asosiy error sifatida olinadi.
     Agar stats yaxshi bo'lsa, boshqa bo'laklardan biridagi
     xato ham context orqali ko'rinadi.
     ========================================================= */

  const dashboardError =
    statsError ||
    coursesError ||
    libraryError ||
    badgesError ||
    "";

  /* =========================================================
     USER + PROFILE + UNREAD
     
     Birinchi bosqichda userni aniqlaymiz.
     Profile va unread parallel yuklanadi.
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadUserData() {
      try {
        setProfileLoading(true);

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            "User olishda xatolik:",
            userError
          );

          return;
        }

        if (!currentUser) {
          if (!cancelled) {
            setUser(null);
            setProfile(null);
            setUnread(0);
          }

          return;
        }

        if (cancelled) return;

        setUser(currentUser);

        /*
         * Profile va unread bir vaqtda.
         */

        const [profileResult, unreadResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", currentUser.id)
              .maybeSingle(),

            supabase
              .from("notifications")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("user_id", currentUser.id)
              .eq("read", false),
          ]);

        if (cancelled) return;

        if (profileResult.error) {
          console.error(
            "Profile olishda xatolik:",
            profileResult.error
          );
        } else {
          setProfile(profileResult.data || null);
        }

        if (unreadResult.error) {
          console.error(
            "Unread notifications olishda xatolik:",
            unreadResult.error
          );
        } else {
          setUnread(unreadResult.count || 0);
        }
      } catch (error) {
        console.error(
          "UserDataProvider xatoligi:",
          error
        );
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /* =========================================================
     BACKGROUND PRELOAD
     
     Provider render bo'lishi bilan useCachedApi yuqoridagi
     4 ta endpointni boshlaydi.

     Demak:

       Provider
          ↓
       ┌───────────────┐
       │               │
       ↓               ↓
     stats          courses
       ↓               ↓
      cache           cache

       library       badges
          ↓             ↓
         cache         cache

     Har biri mustaqil.
     ========================================================= */

  useEffect(() => {
    if (!user?.id) return;

    /*
     * Hozircha bu effect maxsus fetch qilmaydi.
     *
     * useCachedApi requestlarni o'zi boshqaradi.
     *
     * Keyingi bosqichda shu joydan boshqa sahifalar:
     *
     * - notifications
     * - course details
     * - settings
     *
     * uchun ham background preload qo'shish mumkin.
     */
  }, [user?.id]);

  /* =========================================================
     DASHBOARD REFRESH
     
     Barcha dashboard qismlarini parallel refresh qiladi.
     
     Bu:
     
       refreshDashboard()
     
     chaqirilganda 4 ta endpointni bir vaqtda yangilaydi.
     ========================================================= */

  const refreshDashboard = useCallback(async () => {
    const results = await Promise.allSettled([
      refreshStats(),
      refreshCourses(),
      refreshLibrary(),
      refreshBadges(),
    ]);

    return results;
  }, [
    refreshStats,
    refreshCourses,
    refreshLibrary,
    refreshBadges,
  ]);

  /* =========================================================
     DASHBOARD MUTATE
     
     Boshqa componentlar serverga qayta fetch qilmasdan
     lokal cache/state ni yangilashi mumkin.
     
     updater:
     
       {
         stats: ...
       }

     yoki:

       {
         courses: ...
       }

     kabi ishlatiladi.
     ========================================================= */

  const updateDashboard = useCallback(
    (updater) => {
      if (!updater) return;

      /*
       * Eski API bilan ishlagan componentlar uchun
       * umumiy dashboard updater.

       * Funksiya ko'rinishidagi updater bo'lsa,
       * mavjud dashboard obyektidan yangi qiymat olamiz.
       */

      if (typeof updater === "function") {
        const currentDashboard = {
          firstName,
          avatarUrl,
          stats: dashboardStats,
          enrolled: enrolledCourses,
          library: libraryCourses,
          badges,
        };

        const next = updater(currentDashboard);

        if (!next) return;

        if (
          Object.prototype.hasOwnProperty.call(
            next,
            "stats"
          )
        ) {
          mutateStats((current) => ({
            ...(current || {}),
            stats: next.stats,
            firstName:
              next.firstName ??
              current?.firstName ??
              firstName,
            avatarUrl:
              next.avatarUrl ??
              current?.avatarUrl ??
              avatarUrl,
          }));
        }

        if (
          Object.prototype.hasOwnProperty.call(
            next,
            "enrolled"
          )
        ) {
          mutateCourses({
            courses: next.enrolled || [],
          });
        }

        if (
          Object.prototype.hasOwnProperty.call(
            next,
            "library"
          )
        ) {
          mutateLibrary({
            courses: next.library || [],
          });
        }

        if (
          Object.prototype.hasOwnProperty.call(
            next,
            "badges"
          )
        ) {
          mutateBadges({
            badges: next.badges || [],
          });
        }

        return;
      }

      /*
       * Oddiy object updater.
       */

      if (
        Object.prototype.hasOwnProperty.call(
          updater,
          "stats"
        )
      ) {
        mutateStats((current) => ({
          ...(current || {}),
          stats: updater.stats,
        }));
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updater,
          "enrolled"
        )
      ) {
        mutateCourses({
          courses: updater.enrolled || [],
        });
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updater,
          "library"
        )
      ) {
        mutateLibrary({
          courses: updater.library || [],
        });
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updater,
          "badges"
        )
      ) {
        mutateBadges({
          badges: updater.badges || [],
        });
      }
    },
    [
      firstName,
      avatarUrl,
      dashboardStats,
      enrolledCourses,
      libraryCourses,
      badges,
      mutateStats,
      mutateCourses,
      mutateLibrary,
      mutateBadges,
    ]
  );

  /* =========================================================
     NOTIFICATIONS
     
     Faqat kerak bo'lganda yuklanadi.
     ========================================================= */

  const loadNotifications = useCallback(
    async (force = false) => {
      if (!user?.id) return;

      if (
        notificationsLoaded &&
        !force
      ) {
        return;
      }

      if (notificationsLoading) {
        return;
      }

      try {
        setNotificationsLoading(true);

        const { data, error } =
          await supabase
            .from("notifications")
            .select(
              "id, title, body, type, read, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(100);

        if (error) {
          console.error(
            "Notifications olishda xatolik:",
            error
          );

          return;
        }

        setNotifications(data || []);
        setNotificationsLoaded(true);

        /*
         * Aniq unread count.
         */

        const unreadCount = (data || []).filter(
          (item) => !item.read
        ).length;

        setUnread(unreadCount);
      } catch (error) {
        console.error(
          "Notifications yuklash xatoligi:",
          error
        );
      } finally {
        setNotificationsLoading(false);
      }
    },
    [
      user?.id,
      notificationsLoaded,
      notificationsLoading,
      supabase,
    ]
  );

  /* =========================================================
     BIRTA NOTIFICATIONNI READ QILISH
     
     Optimistic UI.
     ========================================================= */

  const markOneRead = useCallback(
    async (notificationId) => {
      if (!notificationId || !user?.id) {
        return;
      }

      const target = notifications.find(
        (item) =>
          item.id === notificationId
      );

      if (!target || target.read) {
        return;
      }

      /*
       * UI darhol o'zgaradi.
       */

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );

      setUnread((current) =>
        Math.max(0, current - 1)
      );

      try {
        const { error } =
          await supabase
            .from("notifications")
            .update({
              read: true,
            })
            .eq("id", notificationId)
            .eq("user_id", user.id);

        if (error) {
          console.error(
            "Notification read qilishda xatolik:",
            error
          );

          /*
           * Xatolik bo'lsa rollback.
           */

          setNotifications((current) =>
            current.map((item) =>
              item.id === notificationId
                ? {
                    ...item,
                    read: false,
                  }
                : item
            )
          );

          setUnread((current) => current + 1);
        }
      } catch (error) {
        console.error(error);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  read: false,
                }
              : item
          )
        );

        setUnread((current) => current + 1);
      }
    },
    [
      notifications,
      supabase,
      user?.id,
    ]
  );

  /* =========================================================
     HAMMASINI READ QILISH
     ========================================================= */

  const markAllRead = useCallback(
    async () => {
      if (!user?.id) return;

      const hadUnread = notifications.some(
        (item) => !item.read
      );

      if (!hadUnread) {
        setUnread(0);
        return;
      }

      /*
       * Optimistic UI.
       */

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
        }))
      );

      setUnread(0);

      try {
        const { error } =
          await supabase
            .from("notifications")
            .update({
              read: true,
            })
            .eq("user_id", user.id)
            .eq("read", false);

        if (error) {
          console.error(
            "Barcha notificationlarni read qilishda xatolik:",
            error
          );

          await loadNotifications(true);
        }
      } catch (error) {
        console.error(error);

        await loadNotifications(true);
      }
    },
    [
      notifications,
      supabase,
      user?.id,
      loadNotifications,
    ]
  );

  /* =========================================================
     PROFILE YANGILASH
     ========================================================= */

  const updateProfile = useCallback(
    (patch) => {
      setProfile((current) => ({
        ...(current || {}),
        ...patch,
      }));
    },
    []
  );

  /* =========================================================
     ALOHIDA DASHBOARD REFRESH'LAR
     
     Agar keyinchalik faqat bitta bo'lakni yangilash kerak
     bo'lsa, boshqa requestlarni qayta yubormaymiz.
     ========================================================= */

  const refreshDashboardStats = useCallback(
    () => refreshStats(),
    [refreshStats]
  );

  const refreshDashboardCourses = useCallback(
    () => refreshCourses(),
    [refreshCourses]
  );

  const refreshDashboardLibrary = useCallback(
    () => refreshLibrary(),
    [refreshLibrary]
  );

  const refreshDashboardBadges = useCallback(
    () => refreshBadges(),
    [refreshBadges]
  );

  /* =========================================================
     CONTEXT VALUE
     ========================================================= */

  const value = useMemo(
    () => ({
      /* =====================================================
         USER
         ===================================================== */

      user,

      /* =====================================================
         PROFILE
         ===================================================== */

      profile,
      profileLoading,

      /* =====================================================
         DASHBOARD
         ===================================================== */

      dashboard,

      /*
       * Asosiy loading:
       * stats hali kelmagan bo'lsa true.
       *
       * Courses/library/badges kelishini kutmaydi.
       */

      dashboardLoading,

      dashboardError,

      /*
       * Dashboard qismlari
       */

      dashboardStats,

      enrolledCourses,

      libraryCourses,

      badges,

      firstName,

      avatarUrl,

      /*
       * Barcha dashboardni parallel refresh qilish
       */

      refreshDashboard,

      /*
       * Dashboardning alohida qismlarini refresh qilish
       */

      refreshDashboardStats,

      refreshDashboardCourses,

      refreshDashboardLibrary,

      refreshDashboardBadges,

      /*
       * Lokal dashboard update
       */

      updateDashboard,

      /* =====================================================
         INDIVIDUAL LOADING STATES
         
         Componentlar xohlasa qaysi qism hali yuklanayotganini
         alohida bilishi mumkin.
         ===================================================== */

      statsLoading,

      coursesLoading,

      libraryLoading,

      badgesLoading,

      /* =====================================================
         INDIVIDUAL ERRORS
         ===================================================== */

      statsError,

      coursesError,

      libraryError,

      badgesError,

      /* =====================================================
         NOTIFICATIONS
         ===================================================== */

      unread,

      notifications,

      notificationsLoaded,

      notificationsLoading,

      loadNotifications,

      markOneRead,

      markAllRead,

      /* =====================================================
         PROFILE UPDATE
         ===================================================== */

      updateProfile,
    }),
    [
      user,

      profile,
      profileLoading,

      dashboard,

      dashboardLoading,
      dashboardError,

      dashboardStats,
      enrolledCourses,
      libraryCourses,
      badges,

      firstName,
      avatarUrl,

      refreshDashboard,

      refreshDashboardStats,
      refreshDashboardCourses,
      refreshDashboardLibrary,
      refreshDashboardBadges,

      updateDashboard,

      statsLoading,
      coursesLoading,
      libraryLoading,
      badgesLoading,

      statsError,
      coursesError,
      libraryError,
      badgesError,

      unread,
      notifications,
      notificationsLoaded,
      notificationsLoading,

      loadNotifications,
      markOneRead,
      markAllRead,

      updateProfile,
    ]
  );

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

/* =========================================================
   HOOK
   ========================================================= */

export function useUserData() {
  const context = useContext(UserDataContext);

  if (!context) {
    throw new Error(
      "useUserData UserDataProvider ichida ishlatilishi kerak."
    );
  }

  return context;
}