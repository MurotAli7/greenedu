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

const UserDataContext = createContext(null);

export function UserDataProvider({ children }) {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState(null);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [unread, setUnread] = useState(0);

  const [notifications, setNotifications] = useState([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  /*
   * =========================================================
   * USER + PROFILE + UNREAD
   * Bir marta yuklanadi.
   * =========================================================
   */
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
         * Profile va unread bir vaqtda yuklanadi.
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
        console.error("UserDataProvider xatoligi:", error);
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

  /*
   * =========================================================
   * NOTIFICATIONS
   *
   * Faqat Notifications sahifasi ochilganda yuklanadi.
   * Bir marta yuklangandan keyin qayta fetch qilmaydi.
   * =========================================================
   */
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
          .select("id, title, body, type, read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
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
         * Notificationlar yuklanganda unread count ham
         * aniq qilib olinadi.
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

  /*
   * =========================================================
   * BIRTA NOTIFICATIONNI READ QILISH
   *
   * Avval UI o'zgaradi.
   * Keyin Supabase update qilinadi.
   * =========================================================
   */
  const markOneRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;

      const target = notifications.find(
        (item) => item.id === notificationId
      );

      if (!target || target.read) {
        return;
      }

      /*
       * Optimistic update
       */
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read: true }
            : item
        )
      );

      setUnread((current) => Math.max(0, current - 1));

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
           * Xatolik bo'lsa UI ni qaytaramiz.
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

  /*
   * =========================================================
   * HAMMASINI READ QILISH
   * =========================================================
   */
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
     * Optimistic UI
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

        /*
         * Xatolik bo'lsa qayta yuklaymiz.
         */
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

  /*
   * =========================================================
   * PROFILE YANGILASH
   *
   * Settings sahifasidan foydalanadi.
   * =========================================================
   */
  const updateProfile = useCallback((patch) => {
    setProfile((current) => ({
      ...(current || {}),
      ...patch,
    }));
  }, []);

  /*
   * =========================================================
   * CONTEXT VALUE
   * =========================================================
   */
  const value = useMemo(
    () => ({
      user,

      profile,
      profileLoading,

      unread,

      notifications,
      notificationsLoaded,
      notificationsLoading,

      loadNotifications,
      markOneRead,
      markAllRead,

      updateProfile,
    }),
    [
      user,
      profile,
      profileLoading,
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

/*
 * =========================================================
 * HOOK
 * =========================================================
 */
export function useUserData() {
  const context = useContext(UserDataContext);

  if (!context) {
    throw new Error(
      "useUserData UserDataProvider ichida ishlatilishi kerak."
    );
  }

  return context;
}