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
     DASHBOARD
     
     Dashboard ma'lumotlari markaziy cache orqali olinadi.
     
     Muhim:
     - cache bo'lsa darhol ko'rinadi
     - eski cache bo'lsa fonda yangilanadi
     - boshqa sahifalar ham shu ma'lumotdan foydalanishi mumkin
     ========================================================= */

  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard,
    mutate: mutateDashboard,
  } = useCachedApi("/api/user/dashboard");

  /*
   * Dashboard ichidagi qismlarni alohida chiqaramiz.
   *
   * Keyingi bosqichda API ni ham shu qismlarga ajratamiz:
   * stats
   * enrolled
   * library
   * badges
   */

  const dashboardStats = dashboard?.stats || null;
  const enrolledCourses = dashboard?.enrolled || [];
  const libraryCourses = dashboard?.library || [];
  const badges = dashboard?.badges || [];

  const firstName =
    dashboard?.firstName ||
    profile?.full_name?.trim()?.split(/\s+/)?.[0] ||
    "";

  const avatarUrl =
    dashboard?.avatarUrl ||
    profile?.avatar_url ||
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
          console.error("User olishda xatolik:", userError);
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
        const [profileResult, unreadResult] = await Promise.all([
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
     
     UserDataProvider mavjud bo'lgan paytdan dashboard
     cache'ga tushishni boshlaydi.
     
     Bu degani:
     
     /user
        ↓
     Provider ishga tushadi
        ↓
     dashboard fetch
        ↓
     cache
        ↓
     page undan foydalanadi
     
     Keyingi bosqichda shu yerga:
     - kurslar
     - notifications
     - course details
     - settings
     
     preload qo'shamiz.
     ========================================================= */

  useEffect(() => {
    if (!user?.id) return;

    /*
     * dashboard useCachedApi tomonidan avtomatik fetch qilinadi.
     *
     * Bu effect hozircha faqat arxitektura uchun.
     * Keyingi bosqichda background preload manager shu yerda ishlaydi.
     */
  }, [user?.id]);

  /* =========================================================
     NOTIFICATIONS
     
     Faqat kerak bo'lganda yuklanadi.
     ========================================================= */

  const loadNotifications = useCallback(
    async (force = false) => {
      if (!user?.id) return;

      if (notificationsLoaded && !force) {
        return;
      }

      if (notificationsLoading) {
        return;
      }

      try {
        setNotificationsLoading(true);

        const { data, error } = await supabase
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
      if (!notificationId || !user?.id) return;

      const target = notifications.find(
        (item) => item.id === notificationId
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
            ? { ...item, read: true }
            : item
        )
      );

      setUnread((current) =>
        Math.max(0, current - 1)
      );

      try {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
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
                ? { ...item, read: false }
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
              ? { ...item, read: false }
              : item
          )
        );

        setUnread((current) => current + 1);
      }
    },
    [notifications, supabase, user?.id]
  );

  /* =========================================================
     HAMMASINI READ QILISH
     ========================================================= */

  const markAllRead = useCallback(async () => {
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
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
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
  }, [
    notifications,
    supabase,
    user?.id,
    loadNotifications,
  ]);

  /* =========================================================
     PROFILE YANGILASH
     ========================================================= */

  const updateProfile = useCallback((patch) => {
    setProfile((current) => ({
      ...(current || {}),
      ...patch,
    }));
  }, []);

  /* =========================================================
     DASHBOARD YANGILASH HELPERS
     
     Boshqa componentlar dashboardni qayta fetch qilmasdan
     lokal cache/state ni yangilashi mumkin.
     ========================================================= */

  const updateDashboard = useCallback(
    (updater) => {
      mutateDashboard(updater);
    },
    [mutateDashboard]
  );

  /*
   * Dashboardni qo'lda yangilash.
   */
  const reloadDashboard = useCallback(() => {
    return refreshDashboard();
  }, [refreshDashboard]);

  /* =========================================================
     CONTEXT VALUE
     ========================================================= */

  const value = useMemo(
    () => ({
      /* USER */
      user,

      /* PROFILE */
      profile,
      profileLoading,

      /* DASHBOARD */
      dashboard,
      dashboardLoading,
      dashboardError,

      dashboardStats,
      enrolledCourses,
      libraryCourses,
      badges,

      firstName,
      avatarUrl,

      refreshDashboard: reloadDashboard,
      updateDashboard,

      /* NOTIFICATIONS */
      unread,
      notifications,
      notificationsLoaded,
      notificationsLoading,

      loadNotifications,
      markOneRead,
      markAllRead,

      /* PROFILE UPDATE */
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

      reloadDashboard,
      updateDashboard,

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