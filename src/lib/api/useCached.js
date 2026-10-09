"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./client";

/**
 * ============================================================
 * GLOBAL API CACHE
 * ============================================================
 *
 * Har bir URL uchun:
 *
 * cache:
 *   url -> {
 *     data,
 *     time
 *   }
 *
 * inflight:
 *   url -> Promise
 *
 * inflight orqali bir xil URL'ga bir vaqtning o'zida
 * bir nechta request ketishining oldini olamiz.
 */

const cache = new Map();
const inflight = new Map();

/**
 * Standart cache TTL:
 * 1 daqiqa
 */
export const DEFAULT_TTL = 60_000;

/**
 * ============================================================
 * CACHE HELPERS
 * ============================================================
 */

/**
 * Cache'da URL mavjudmi?
 */
export function isCached(url) {
  if (!url) return false;
  return cache.has(url);
}

/**
 * Cache'dagi ma'lumotni olish.
 */
export function getCached(url) {
  if (!url) return null;
  return cache.get(url)?.data ?? null;
}

/**
 * Cache'ni tozalash.
 *
 * Misol:
 *
 * invalidateCache("/api/user/dashboard");
 *
 * yoki:
 *
 * invalidateCache("/api/user/");
 *
 * yoki:
 *
 * invalidateCache();
 *
 * oxirgisi butun cache'ni tozalaydi.
 */
export function invalidateCache(prefix = "") {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Cache'dagi ma'lumotni optimistik yangilash.
 *
 * Misol:
 *
 * updateCache("/api/user/dashboard/stats", (old) => ({
 *   ...old,
 *   stats: {
 *     ...old.stats,
 *     xp: old.stats.xp + 10
 *   }
 * }));
 */
export function updateCache(url, updater) {
  if (!url) return;

  const entry = cache.get(url);

  /**
   * Agar cache hali mavjud bo'lmasa,
   * hech narsa qilmaymiz.
   */
  if (!entry) return;

  const next =
    typeof updater === "function"
      ? updater(entry.data)
      : updater;

  cache.set(url, {
    data: next,
    time: Date.now(),
  });
}

/**
 * ============================================================
 * INTERNAL FETCH
 * ============================================================
 *
 * Eng muhim qism.
 *
 * Agar bir xil URL uchun request allaqachon ketayotgan bo'lsa:
 *
 * request #1
 * request #2
 * request #3
 *
 * uchalasi ham bitta Promise'dan foydalanadi.
 *
 * Natijada serverga faqat BITTA request ketadi.
 */
async function fetchAndCache(url) {
  if (!url) return null;

  /**
   * Shu URL uchun request allaqachon ketayotgan bo'lsa,
   * o'sha request'ni qaytaramiz.
   */
  if (inflight.has(url)) {
    return inflight.get(url);
  }

  const request = apiFetch(url)
    .then((fresh) => {
      cache.set(url, {
        data: fresh,
        time: Date.now(),
      });

      return fresh;
    })
    .finally(() => {
      /**
       * Request tugagach inflight'dan olib tashlaymiz.
       */
      inflight.delete(url);
    });

  inflight.set(url, request);

  return request;
}

/**
 * ============================================================
 * PREFETCH
 * ============================================================
 *
 * Foydalanuvchi sahifaga hali kirmagan bo'lsa ham
 * API ma'lumotini oldindan yuklash mumkin.
 *
 * Misol:
 *
 * prefetchApi("/api/user/notifications");
 *
 * Keyin foydalanuvchi notifications sahifasiga kirganda
 * ma'lumot cache'dan darhol chiqadi.
 */
export async function prefetchApi(
  url,
  { ttl = DEFAULT_TTL, force = false } = {}
) {
  if (!url) return null;

  const entry = cache.get(url);

  /**
   * Cache yangi bo'lsa, qayta request yubormaymiz.
   */
  if (
    entry &&
    !force &&
    Date.now() - entry.time <= ttl
  ) {
    return entry.data;
  }

  /**
   * Eski cache bo'lsa ham request yuboramiz.
   *
   * Shu paytda eski ma'lumot cache'da qoladi.
   */
  return fetchAndCache(url);
}

/**
 *
 * Bir nechta API'ni birdan preload qilish.
 *
 * Misol:
 *
 * preloadApis([
 *   "/api/user/dashboard/stats",
 *   "/api/user/dashboard/courses",
 *   "/api/user/dashboard/library",
 *   "/api/user/dashboard/badges"
 * ]);
 *
 * Barchasi parallel ishlaydi.
 */
export async function preloadApis(
  urls = [],
  options = {}
) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }

  return Promise.allSettled(
    urls.map((url) => prefetchApi(url, options))
  );
}

/**
 * ============================================================
 * REACT HOOK
 * ============================================================
 *
 * @param {string|null} url
 * @param {{ ttl?: number, enabled?: boolean }} options
 *
 * returns:
 *
 * {
 *   data,
 *   loading,
 *   error,
 *   refresh,
 *   mutate
 * }
 */
export function useCachedApi(
  url,
  {
    ttl = DEFAULT_TTL,
    enabled = true,
  } = {}
) {
  /**
   * Boshlang'ich cache.
   *
   * Agar data oldindan preload qilingan bo'lsa,
   * komponent ochilishi bilan data tayyor bo'ladi.
   */
  const cached = url && enabled
    ? cache.get(url)
    : null;

  const [data, setData] = useState(
    cached?.data ?? null
  );

  const [loading, setLoading] = useState(
    !cached && Boolean(url && enabled)
  );

  const [error, setError] = useState("");

  /**
   * ========================================================
   * REFRESH
   * ========================================================
   */
  const refresh = useCallback(
    async (background = false) => {
      if (!url || !enabled) return null;

      /**
       * Foreground request bo'lsa loading ko'rsatamiz.
       *
       * Background request bo'lsa:
       *
       * eski data ekranda qoladi.
       */
      if (!background) {
        setLoading(true);
      }

      try {
        const fresh = await fetchAndCache(url);

        /**
         * Komponent hali mounted bo'lsa,
         * React state yangilanadi.
         */
        setData(fresh);
        setError("");

        return fresh;
      } catch (err) {
        /**
         * Background refresh xato bo'lsa,
         * eski data saqlanib qoladi.
         */
        if (!background || !cache.get(url)) {
          setError(
            err?.message ||
              "Ma'lumotni yuklashda xatolik yuz berdi."
          );
        }

        return null;
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [url, enabled]
  );

  /**
   * ========================================================
   * INITIAL LOAD + CACHE CHECK
   * ========================================================
   */
  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    const entry = cache.get(url);

    /**
     * CACHE BOR
     */
    if (entry) {
      /**
       * Data'ni darhol ko'rsatamiz.
       */
      setData(entry.data);
      setLoading(false);
      setError("");

      /**
       * Cache eskirgan bo'lsa:
       *
       * UI eski data bilan ishlashda davom etadi.
       *
       * Fonda yangi data olinadi.
       */
      if (Date.now() - entry.time > ttl) {
        refresh(true);
      }

      return;
    }

    /**
     * CACHE YO'Q
     *
     * Birinchi marta yuklaymiz.
     */
    setData(null);
    setLoading(true);

    refresh(false);
  }, [
    url,
    ttl,
    enabled,
    refresh,
  ]);

  /**
   * ========================================================
   * MUTATE
   * ========================================================
   *
   * Local state + global cache birgalikda yangilanadi.
   */
  const mutate = useCallback(
    (updater) => {
      setData((previous) => {
        const next =
          typeof updater === "function"
            ? updater(previous)
            : updater;

        if (url) {
          cache.set(url, {
            data: next,
            time: Date.now(),
          });
        }

        return next;
      });
    },
    [url]
  );

  return {
    data,
    loading,
    error,
    refresh,
    mutate,
  };
}