export type ApiErrorKind =
  "network" | "timeout" | "cancelled" | "http" | "invalid-response" | "session"

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly fields: Record<string, string> = {}
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (!value || !/^https?:\/\//i.test(value))
    throw new Error("Set EXPO_PUBLIC_API_URL to a reachable API address.")
  return value.replace(/\/+$/, "")
}

function problemFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || !("errors" in value)) return {}
  const entries = (value as { errors: unknown }).errors
  if (!entries || typeof entries !== "object" || Array.isArray(entries))
    return {}
  const fields: Record<string, string> = {}
  for (const [key, messages] of Object.entries(entries)) {
    if (Array.isArray(messages) && typeof messages[0] === "string")
      fields[key.toLowerCase()] = messages[0]
  }
  return fields
}

function problemMessage(value: unknown, status: number, path: string) {
  if (value && typeof value === "object") {
    const detail = (value as { detail?: unknown }).detail
    if (typeof detail === "string" && detail.trim()) return detail
  }
  if (path.startsWith("/api/Auth/sign-")) {
    if (status === 401) return "Invalid email or password."
    if (status === 409) return "Email is already taken."
  }
  if (status === 401)
    return "Your session could not be authorized. Please sign in again."
  if (status === 409) return "This request conflicts with an existing record."
  if (status >= 500) return "Server unavailable. Please try again."
  return "Unable to complete the request. Please try again."
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  expectedStatus?: number
  body?: unknown
  bearer?: string
  signal?: AbortSignal
}

export function createApiClient(
  baseUrl: string,
  transport: typeof fetch = fetch
) {
  const root = baseUrl.replace(/\/+$/, "")
  return {
    async request(path: string, options: ApiRequest = {}): Promise<unknown> {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      const onAbort = () => controller.abort()
      options.signal?.addEventListener("abort", onAbort, { once: true })
      if (options.signal?.aborted) controller.abort()
      try {
        throwIfCancelled(options.signal)
        const response = await transport(`${root}${path}`, {
          method: options.method ?? "GET",
          headers: {
            Accept: "application/json",
            ...(options.body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
            ...(options.bearer
              ? { Authorization: `Bearer ${options.bearer}` }
              : {}),
          },
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
          signal: controller.signal,
        })
        const raw = await response.text()
        throwIfCancelled(options.signal)
        let value: unknown = null
        if (raw) {
          try {
            value = JSON.parse(raw) as unknown
          } catch {
            if (response.ok)
              throw new ApiError(
                "invalid-response",
                "Server returned an invalid response."
              )
          }
        }
        if (!response.ok)
          throw new ApiError(
            "http",
            problemMessage(value, response.status, path),
            response.status,
            problemFields(value)
          )
        if (
          options.expectedStatus !== undefined &&
          response.status !== options.expectedStatus
        )
          throw new ApiError(
            "invalid-response",
            "Server returned an unexpected status."
          )
        return value
      } catch (error) {
        if (error instanceof ApiError) throw error
        if (controller.signal.aborted)
          throw new ApiError(
            options.signal?.aborted ? "cancelled" : "timeout",
            options.signal?.aborted
              ? "Request cancelled."
              : "Request timed out. Please retry."
          )
        throw new ApiError(
          "network",
          "Cannot reach the server. Check your connection."
        )
      } finally {
        clearTimeout(timeout)
        options.signal?.removeEventListener("abort", onAbort)
      }
    },
  }
}

export function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new ApiError("cancelled", "Request cancelled.")
}
