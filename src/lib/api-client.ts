import type { ApiErrorCode } from "./schemas";

export type ApiResponse<T> =
  | { ok: true; status: number; data: T }
  | {
      ok: false;
      status: number;
      code: ApiErrorCode | "network";
      message?: string;
    };

/** fetch wrapper that never throws: network failures become `code: "network"`. */
export async function apiFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data: json as T };
    return {
      ok: false,
      status: res.status,
      code: json?.error?.code ?? "server_error",
      message: json?.error?.message,
    };
  } catch {
    return { ok: false, status: 0, code: "network" };
  }
}
