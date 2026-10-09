"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { apiFetch } from "./client";


// ============================================================
// GLOBAL CACHE
// ============================================================

const cache = new Map();


// ============================================================
// INFLIGHT REQUESTS
// Bir URL uchun bir vaqtda faqat bitta request
// ============================================================

const inflight = new Map();


export const DEFAULT_TTL = 60_000;


// ============================================================
// CACHE BORLIGINI TEKSHIRISH
// ============================================================

export function isCached(url) {
  if (!url) {
    return false;
  }

  return cache.has(url);
}


// ============================================================
// CACHE'DAN MA'LUMOT OLISH
// ============================================================

export function getCached(url) {
  if (!url) {
    return null;
  }

  return (
    cache.get(url)?.data ?? null
  );
}


// ============================================================
// CACHE TOZALASH
// ============================================================

export function invalidateCache(
  prefix = ""
) {
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


// ============================================================
// CACHE'NI YANGILASH
// ============================================================

export function updateCache(
  url,
  updater
) {
  if (!url) {
    return;
  }

  const entry = cache.get(url);

  if (!entry) {
    return;
  }

  const next =
    typeof updater === "function"
      ? updater(entry.data)
      : updater;

  cache.set(url, {
    data: next,
    time: Date.now(),
  });
}


// ============================================================
// SERVERDAN OLISH VA CACHE'GA YOZISH
// ============================================================

async function fetchAndCache(url) {
  if (!url) {
    return null;
  }

  // Shu URL allaqachon yuklanayotgan bo'lsa,
  // yangi request yubormaymiz.
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
      inflight.delete(url);
    });

  inflight.set(
    url,
    request
  );

  return request;
}


// ============================================================
// PREFETCH
// ============================================================

export async function prefetchApi(
  url,
  {
    ttl = DEFAULT_TTL,
    force = false,
  } = {}
) {
  if (!url) {
    return null;
  }

  const entry =
    cache.get(url);

  if (
    entry &&
    !force &&
    Date.now() - entry.time <= ttl
  ) {
    return entry.data;
  }

  return fetchAndCache(url);
}


// ============================================================
// BIR NECHTA API'NI PARALLEL PRELOAD
// ============================================================

export async function preloadApis(
  urls = [],
  options = {}
) {
  if (
    !Array.isArray(urls) ||
    urls.length === 0
  ) {
    return [];
  }

  return Promise.allSettled(
    urls.map((url) =>
      prefetchApi(
        url,
        options
      )
    )
  );
}


// ============================================================
// REACT HOOK
// ============================================================

export function useCachedApi(
  url,
  {
    ttl = DEFAULT_TTL,
    enabled = true,
  } = {}
) {
  const cached =
    url && enabled
      ? cache.get(url)
      : null;


  const [data, setData] =
    useState(
      cached?.data ?? null
    );


  const [loading, setLoading] =
    useState(
      !cached &&
        Boolean(
          url && enabled
        )
    );


  const [error, setError] =
    useState("");


  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh =
    useCallback(
      async (
        background = false
      ) => {
        if (
          !url ||
          !enabled
        ) {
          return null;
        }

        if (!background) {
          setLoading(true);
        }

        try {
          const fresh =
            await fetchAndCache(
              url
            );

          setData(fresh);
          setError("");

          return fresh;

        } catch (err) {
          if (
            !background ||
            !cache.get(url)
          ) {
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
      [
        url,
        enabled,
      ]
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (
      !url ||
      !enabled
    ) {
      setLoading(false);
      return;
    }

    const entry =
      cache.get(url);

    if (entry) {
      setData(
        entry.data
      );

      setLoading(false);
      setError("");

      // TTL o'tgan bo'lsa,
      // background refresh.
      if (
        Date.now() -
          entry.time >
          ttl
      ) {
        refresh(true);
      }

      return;
    }

    setData(null);
    setLoading(true);

    refresh(false);

  }, [
    url,
    ttl,
    enabled,
    refresh,
  ]);


  // ==========================================================
  // MUTATE
  // ==========================================================

  const mutate =
    useCallback(
      (updater) => {
        setData(
          (previous) => {
            const next =
              typeof updater ===
              "function"
                ? updater(
                    previous
                  )
                : updater;

            if (url) {
              cache.set(
                url,
                {
                  data: next,
                  time: Date.now(),
                }
              );
            }

            return next;
          }
        );
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