import { makeBackend, type HealthTrackerBackend } from "./types";

/** Base URL for the API. Empty string means same-origin (server serves SPA). */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  ""
);

/** Raised when the API responds with a non-2xx status. */
export class HttpBackendError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "HttpBackendError";
  }
}

async function call<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/${command}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(args ?? {}),
  });

  const text = await res.text();

  if (!res.ok) {
    let message = text || `Request failed (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = parsed.error ?? parsed.message ?? message;
    } catch {
      // non-JSON error body; keep raw text
    }
    throw new HttpBackendError(message, res.status);
  }

  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/**
 * Web backend. Commands map to `POST /api/<command>` with a JSON body of the
 * argument object. Cookies are included for session auth.
 */
export const httpBackend: HealthTrackerBackend = makeBackend(call);
