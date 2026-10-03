/** A failed API call, carrying the HTTP status and the server's message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Calls the backend with an optional JSON body and returns the JSON reply (undefined for 204).
 * A 401 outside the auth endpoints means the session ended, so the user is sent back to sign in.
 */
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 && !path.startsWith("/api/auth/")) window.location.replace("/");
  if (!response.ok) {
    const { detail } = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof detail === "string" ? detail : `Request failed: ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
