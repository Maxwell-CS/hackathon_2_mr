import type { ApiErrorBody } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!BASE_URL) {
  // Surface a clear configuration error rather than firing requests at "undefined".
  console.error(
    "VITE_API_BASE_URL is not set. Create a .env file with VITE_API_BASE_URL=<backend>/api/v1",
  );
}

const TOKEN_STORAGE_KEY = "tropelcare.token";

/** Normalised, typed error thrown by every API call. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.message || fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error ?? "UNKNOWN_ERROR";
    this.body = body;
  }

  /** True when the failure is a discarded/aborted request, not a real error. */
  static isAbort(err: unknown): boolean {
    return err instanceof DOMException && err.name === "AbortError";
  }
}

// --- Token storage (survives reload for session restoration) ----------------

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

// Optional hook invoked on any 401 so the auth layer can force a logout.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export interface RequestOptions {
  method?: string;
  /** Query params; undefined / empty-string values are omitted. */
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  /** Set false for public endpoints (login). Defaults to true. */
  auth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", query, body, signal, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = tokenStore.get();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = (await response.json()) as ApiErrorBody;
    } catch {
      parsed = null;
    }
    throw new ApiError(
      response.status,
      parsed,
      `Request failed with status ${response.status}`,
    );
  }

  // 204 No Content guard.
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
