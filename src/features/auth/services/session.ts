import {
  ApiError,
  createApiClient,
  throwIfCancelled,
  type ApiRequest,
} from "@/lib/api-client"

export interface Identity {
  id: string
  email: string
}
export interface TokenPair {
  accessToken: string
  refreshToken: string
}
export interface Session {
  identity: Identity
  tokens: TokenPair
  expiresAt: number
}
export type AuthSnapshot =
  | {
      status: "loading" | "signed-out" | "storage-error" | "unsupported"
      session: null
      error: string | null
    }
  | {
      status: "signed-in" | "offline-local"
      session: Session
      error: string | null
    }

export interface SessionStorage {
  read(): Promise<string | null>
  write(value: string): Promise<void>
  remove(): Promise<void>
}

function decodeBase64Url(value: string) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  let bytes = ""
  let buffer = 0
  let bits = 0
  for (const char of normalized.replace(/=+$/, "")) {
    const index = alphabet.indexOf(char)
    if (index < 0) throw new Error("Invalid token encoding.")
    buffer = (buffer << 6) | index
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes += `%${((buffer >> bits) & 255).toString(16).padStart(2, "0")}`
    }
  }
  return decodeURIComponent(bytes)
}

export function sessionFromTokens(value: unknown): Session {
  if (!value || typeof value !== "object")
    throw new ApiError(
      "invalid-response",
      "Server returned invalid credentials."
    )
  const tokens = value as Partial<TokenPair>
  if (
    typeof tokens.accessToken !== "string" ||
    !tokens.accessToken ||
    typeof tokens.refreshToken !== "string" ||
    !tokens.refreshToken
  )
    throw new ApiError(
      "invalid-response",
      "Server returned invalid credentials."
    )
  try {
    const parts = tokens.accessToken.split(".")
    if (parts.length !== 3) throw new Error("Invalid token.")
    const claims: unknown = JSON.parse(decodeBase64Url(parts[1]))
    if (!claims || typeof claims !== "object")
      throw new Error("Invalid claims.")
    const jwt = claims as { sub?: unknown; email?: unknown; exp?: unknown }
    if (
      typeof jwt.sub !== "string" ||
      !jwt.sub ||
      typeof jwt.email !== "string" ||
      !jwt.email ||
      typeof jwt.exp !== "number" ||
      !Number.isFinite(jwt.exp)
    )
      throw new Error("Invalid claims.")
    return {
      identity: { id: jwt.sub, email: jwt.email },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      expiresAt: jwt.exp * 1000,
    }
  } catch {
    throw new ApiError(
      "invalid-response",
      "Server returned an invalid access token."
    )
  }
}

function parseSaved(raw: string, environment: string): Session | null {
  const value: unknown = JSON.parse(raw)
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("session" in value)
  )
    throw new Error("Saved session format is unsupported.")
  if (!("environment" in value) || value.environment !== environment)
    return null
  const saved = value.session as { tokens?: unknown; identity?: unknown }
  const session = sessionFromTokens(saved?.tokens)
  if (
    !saved.identity ||
    typeof saved.identity !== "object" ||
    (saved.identity as Identity).id !== session.identity.id ||
    (saved.identity as Identity).email !== session.identity.email
  )
    throw new Error("Saved session identity does not match its token.")
  return session
}

export function createSessionManager(
  baseUrl: string,
  storage: SessionStorage,
  transport: typeof fetch = fetch,
  now: () => number = Date.now
) {
  const api = createApiClient(baseUrl, transport)
  const listeners = new Set<() => void>()
  let snapshot: AuthSnapshot = { status: "loading", session: null, error: null }
  let revision = 0
  let accountGeneration = 0
  let refreshTask: Promise<void> | null = null
  let lastAutomaticRetry: number | null = null
  let storageQueue: Promise<unknown> = Promise.resolve()
  const emit = (next: AuthSnapshot) => {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  const current = () => snapshot.session
  const persist = (session: Session, expected: number) => {
    const task = storageQueue.then(async () => {
      if (revision === expected)
        await storage.write(
          JSON.stringify({ version: 1, environment: baseUrl, session })
        )
    })
    storageQueue = task.catch(() => undefined)
    return task
  }
  const removeSaved = () => {
    const task = storageQueue.then(() => storage.remove())
    storageQueue = task.catch(() => undefined)
    return task
  }
  const transient = (error: unknown) =>
    error instanceof ApiError &&
    (error.kind === "network" ||
      error.kind === "timeout" ||
      (error.kind === "http" && (error.status ?? 0) >= 500))
  async function rejectSession() {
    const expected = revision
    try {
      await removeSaved()
      if (revision === expected) {
        revision++
        accountGeneration++
        emit({
          status: "signed-out",
          session: null,
          error: "Session expired. Please sign in again.",
        })
      }
    } catch {
      if (revision === expected && current())
        emit({
          status: "offline-local",
          session: current()!,
          error:
            "Session expired, but saved credentials could not be cleared. Retry sign out.",
        })
    }
  }
  async function refresh() {
    if (refreshTask) return refreshTask
    const prior = current()
    if (!prior) throw new Error("Sign in to continue.")
    const expected = revision
    refreshTask = (async () => {
      try {
        const payload = await api.request("/api/Auth/refresh", {
          method: "POST",
          expectedStatus: 200,
          body: { refreshToken: prior.tokens.refreshToken },
        })
        const next = sessionFromTokens(payload)
        if (
          next.identity.id !== prior.identity.id ||
          next.identity.email !== prior.identity.email
        )
          throw new ApiError(
            "invalid-response",
            "Refresh returned a different account."
          )
        if (revision !== expected) return
        await persist(next, expected)
        if (revision === expected) {
          revision++
          emit({ status: "signed-in", session: next, error: null })
        }
      } catch (error) {
        if (revision !== expected) return
        if (
          error instanceof ApiError &&
          error.kind === "http" &&
          error.status === 401
        ) {
          await rejectSession()
        } else if (transient(error)) {
          emit({
            status: "offline-local",
            session: prior,
            error:
              error instanceof Error ? error.message : "Unable to reconnect.",
          })
        } else {
          emit({
            status: "offline-local",
            session: prior,
            error:
              "Could not save or validate the refreshed session. Retry or sign out.",
          })
        }
        throw error
      }
    })().finally(() => {
      refreshTask = null
    })
    return refreshTask
  }
  async function refreshForRequest(signal?: AbortSignal) {
    throwIfCancelled(signal)
    try {
      await refresh()
    } catch (error) {
      throwIfCancelled(signal)
      // Session owns refresh recovery; a query must not retry the refresh flow.
      throw new ApiError(
        "session",
        error instanceof Error
          ? error.message
          : "Unable to refresh your session."
      )
    }
    throwIfCancelled(signal)
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async restore() {
      const expected = revision
      try {
        const raw = await storage.read()
        if (revision !== expected) return
        if (!raw) {
          emit({ status: "signed-out", session: null, error: null })
          return
        }
        const session = parseSaved(raw, baseUrl)
        if (!session) {
          emit({ status: "signed-out", session: null, error: null })
          return
        }
        emit({ status: "signed-in", session, error: null })
        if (session.expiresAt <= now() + 60_000)
          await refresh().catch(() => undefined)
      } catch (error) {
        if (revision === expected)
          emit({
            status: "storage-error",
            session: null,
            error:
              error instanceof Error
                ? error.message
                : "Could not restore your session.",
          })
      }
    },
    async signIn(email: string, password: string, register = false) {
      const expected = revision
      const payload = await api.request(
        register ? "/api/Auth/sign-up" : "/api/Auth/sign-in",
        {
          method: "POST",
          expectedStatus: register ? 201 : 200,
          body: { email: email.trim(), password },
        }
      )
      const session = sessionFromTokens(payload)
      if (revision !== expected) return
      try {
        await persist(session, expected)
      } catch {
        throw new Error("Could not save your session securely. Please retry.")
      }
      if (revision === expected) {
        revision++
        accountGeneration++
        emit({ status: "signed-in", session, error: null })
      }
    },
    async signOut() {
      const expected = ++revision
      accountGeneration++
      try {
        await removeSaved()
      } catch {
        throw new Error(
          "Could not clear your saved session. Please retry sign out."
        )
      }
      if (revision === expected)
        emit({ status: "signed-out", session: null, error: null })
    },
    async retry(automatic = false) {
      if (!current()) return
      if (
        automatic &&
        snapshot.status === "signed-in" &&
        current()!.expiresAt > now() + 60_000
      )
        return
      if (
        automatic &&
        lastAutomaticRetry !== null &&
        now() - lastAutomaticRetry < 30_000
      )
        return
      if (automatic) lastAutomaticRetry = now()
      await refresh()
    },
    bindRequest(): (path: string, options?: ApiRequest) => Promise<unknown> {
      const generation = accountGeneration
      return (path, options) => {
        if (accountGeneration !== generation)
          return Promise.reject(new Error("The active account changed."))
        return this.request(path, options)
      }
    },
    async request(path: string, options: ApiRequest = {}) {
      throwIfCancelled(options.signal)
      let session = current()
      if (!session) throw new Error("Sign in to continue.")
      const generation = accountGeneration
      const identity = session.identity.id
      if (session.expiresAt <= now() + 60_000)
        await refreshForRequest(options.signal)
      session = current()
      if (!session) throw new Error("Session expired. Please sign in again.")
      if (accountGeneration !== generation || session.identity.id !== identity)
        throw new Error("The active account changed.")
      const sentToken = session.tokens.accessToken
      try {
        const result = await api.request(path, {
          ...options,
          bearer: sentToken,
        })
        if (
          accountGeneration !== generation ||
          current()?.identity.id !== identity
        )
          throw new Error("The active account changed.")
        return result
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
        if (accountGeneration !== generation)
          throw new Error("The active account changed.")
        throwIfCancelled(options.signal)
        if (current()?.tokens.accessToken === sentToken)
          await refreshForRequest(options.signal)
        session = current()
        if (!session) throw new Error("Session expired. Please sign in again.")
        if (
          accountGeneration !== generation ||
          session.identity.id !== identity
        )
          throw new Error("The active account changed.")
        const result = await api.request(path, {
          ...options,
          bearer: session.tokens.accessToken,
        })
        if (
          accountGeneration !== generation ||
          current()?.identity.id !== identity
        )
          throw new Error("The active account changed.")
        return result
      }
    },
  }
}
