/**
 * The one place the browser talks to the server.
 *
 * Every component depends on this rather than on `fetch`, so base URLs,
 * headers, and error handling change in one file. The goal is not
 * sophistication, it is that there is exactly one abstraction to replace.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** the server's own explanation, in the user's vocabulary */
    readonly reasons: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const type = res.headers.get("content-type") ?? "";
  const body = type.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    const reasons =
      typeof body === "object" && body && Array.isArray((body as { reasons?: unknown }).reasons)
        ? ((body as { reasons: string[] }).reasons)
        : [];
    throw new ApiError(message, res.status, reasons);
  }

  return body as T;
}

export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  apiFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** PUT, for the one request that asks the server to mint something. */
export const apiPut = <T = unknown>(path: string, body?: unknown) =>
  apiFetch<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
