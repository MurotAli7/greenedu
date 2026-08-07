/**
 * Klient tomonda API bilan ishlash uchun yagona yordamchi.
 * Avval har bir sahifa o'zicha fetch + json + xato ushlashni takrorlardi.
 */

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * JSON so'rov yuboradi va xatolarni bir xil ko'rinishda qaytaradi.
 * @param {string} url
 * @param {{ method?: string, body?: any, signal?: AbortSignal }} options
 */
export async function apiFetch(url, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Server bilan bog'lanib bo'lmadi. Internetni tekshiring.", 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Bo'sh javob ham bo'lishi mumkin
  }

  if (!response.ok) {
    throw new ApiError(data?.error || "Amalni bajarib bo'lmadi.", response.status);
  }
  return data;
}
