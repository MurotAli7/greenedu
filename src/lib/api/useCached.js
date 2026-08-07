"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./client";

/**
 * Klient tomonda API keshi (stale-while-revalidate).
 *
 * MUAMMO: har sahifa almashishda ma'lumot noldan yuklanib, skeleton
 * ko'rsatilardi — foydalanuvchiga "butun sahifa yangilanyapti"dek
 * tuyulardi va navigatsiya sekin his qilinardi.
 *
 * YECHIM: javoblar xotirada saqlanadi. Sahifaga qaytganda:
 *   1) keshdagi ma'lumot DARHOL ko'rsatiladi (skeleton yo'q)
 *   2) muddati o'tgan bo'lsa, fonda yangisi olinadi va jimgina almashtiriladi
 *
 * Kesh sahifa to'liq yangilanganda (F5) tozalanadi — bu xavfsiz:
 * hech narsa localStorage'da qolmaydi.
 */

const cache = new Map(); // url -> { data, time }

/** Standart yangilik muddati: 1 daqiqa */
const DEFAULT_TTL = 60_000;

/** Mutatsiyadan keyin keshni tozalash: invalidateCache("/api/user/") */
export function invalidateCache(prefix = "") {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Keshdagi yozuvni qo'lda yangilash (masalan, optimistik o'zgarishda) */
export function updateCache(url, updater) {
  const entry = cache.get(url);
  if (!entry) return;
  const next = typeof updater === "function" ? updater(entry.data) : updater;
  cache.set(url, { data: next, time: entry.time });
}

/**
 * @param {string|null} url — null bo'lsa so'rov yuborilmaydi
 * @param {{ ttl?: number }} options
 * @returns {{ data, loading, error, refresh, mutate }}
 */
export function useCachedApi(url, { ttl = DEFAULT_TTL } = {}) {
  const cached = url ? cache.get(url) : null;

  const [data, setData] = useState(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached && Boolean(url));
  const [error, setError] = useState("");

  const refresh = useCallback(
    async (background = false) => {
      if (!url) return;
      if (!background) setLoading(true);
      try {
        const fresh = await apiFetch(url);
        cache.set(url, { data: fresh, time: Date.now() });
        setData(fresh);
        setError("");
      } catch (err) {
        // Fonda yangilash muvaffaqiyatsiz bo'lsa, eski ma'lumot ko'rinaveradi
        if (!background || !cache.get(url)) setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    if (!url) return;
    const entry = cache.get(url);

    if (entry) {
      // Keshdan darhol ko'rsatamiz
      setData(entry.data);
      setLoading(false);
      setError("");
      // Muddati o'tgan bo'lsa — fonda jimgina yangilaymiz
      if (Date.now() - entry.time > ttl) refresh(true);
    } else {
      setData(null);
      refresh(false);
    }
  }, [url, ttl, refresh]);

  /** Lokal va keshni birga yangilash (mutatsiyadan keyin) */
  const mutate = useCallback(
    (updater) => {
      setData((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater;
        if (url) cache.set(url, { data: next, time: Date.now() });
        return next;
      });
    },
    [url]
  );

  return { data, loading, error, refresh, mutate };
}
