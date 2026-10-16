import assert from "node:assert/strict"
import { test } from "node:test"

import { ApiError, createApiClient } from "../../../lib/api-client"
import { createSessionManager } from "./session"

const token = (id: string, email: string, exp: number) =>
  `x.${Buffer.from(JSON.stringify({ sub: id, email, exp })).toString("base64url")}.x`
const pair = (id = "user-a", exp = 200) => ({
  accessToken: token(id, `${id}@example.com`, exp),
  refreshToken: `refresh-${id}-${exp}`,
})
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  })

function memoryStorage(initial: string | null = null) {
  let value = initial
  let failWrite = false
  let failRemove = false
  return {
    storage: {
      async read() {
        return value
      },
      async write(next: string) {
        if (failWrite) throw new Error("Disk failed")
        value = next
      },
      async remove() {
        if (failRemove) throw new Error("Disk failed")
        value = null
      },
    },
    get: () => value,
    failWrite: () => {
      failWrite = true
    },
    failRemove: () => {
      failRemove = true
    },
  }
}

test("sign-up sends the expected request and persists only a versioned token session", async () => {
  const saved = memoryStorage()
  const calls: { url: string; body: unknown }[] = []
  const transport = (async (
    url: string | URL | Request,
    init?: RequestInit
  ) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) })
    return json(pair(), 201)
  }) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 0
  )
  await manager.restore()
  await manager.signIn(" user-a@example.com ", "Secret  ", true)
  assert.deepEqual(calls, [
    {
      url: "https://api.example/api/Auth/sign-up",
      body: { email: "user-a@example.com", password: "Secret  " },
    },
  ])
  assert.equal(manager.getSnapshot().session?.identity.id, "user-a")
  assert.equal(saved.get()?.includes("Secret  "), false)
  assert.equal(JSON.parse(saved.get()!).version, 1)
})

test("sign-in maps validation and credential errors and rejects malformed responses", async () => {
  const saved = memoryStorage()
  const transport = (async () =>
    json(
      {
        detail: "One or more fields are invalid.",
        errors: { Email: ["Invalid email."] },
      },
      400
    )) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport
  )
  await assert.rejects(
    manager.signIn("bad", "x"),
    (error: unknown) =>
      error instanceof ApiError && error.fields.email === "Invalid email."
  )
  const conflict = createApiClient("https://api.example", (async () =>
    json({ detail: "Email is already taken." }, 409)) as typeof fetch)
  await assert.rejects(
    conflict.request("/api/Auth/sign-up"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 409 &&
      /taken/.test(error.message)
  )
  const invalid = createSessionManager(
    "https://api.example",
    saved.storage,
    (async () =>
      json({ accessToken: "bad", refreshToken: "x" })) as typeof fetch
  )
  await assert.rejects(
    invalid.signIn("a@example.com", "x"),
    (error: unknown) =>
      error instanceof ApiError && error.kind === "invalid-response"
  )
})

test("restores a saved session and shares rotating refresh across concurrent requests", async () => {
  const saved = memoryStorage()
  let refreshes = 0
  let protectedCalls = 0
  const transport = (async (
    url: string | URL | Request,
    init?: RequestInit
  ) => {
    if (String(url).endsWith("/api/Auth/sign-in"))
      return json(pair("user-a", 1))
    if (String(url).endsWith("/api/Auth/refresh")) {
      refreshes++
      return json(pair("user-a", 300))
    }
    protectedCalls++
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      `Bearer ${pair("user-a", 300).accessToken}`
    )
    return json({ ok: true })
  }) as typeof fetch
  const first = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 10_000
  )
  await first.signIn("user-a@example.com", "password")
  const restored = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 10_000
  )
  await restored.restore()
  assert.equal(refreshes, 1)
  assert.equal(restored.getSnapshot().status, "signed-in")
  await Promise.all([restored.request("/one"), restored.request("/two")])
  assert.equal(refreshes, 1)
  assert.equal(protectedCalls, 2)
})

test("concurrent expired requests share refresh; a later 401 refreshes and retries once", async () => {
  const saved = memoryStorage()
  let refreshes = 0
  let protectedCalls = 0
  const transport = (async (
    url: string | URL | Request,
    init?: RequestInit
  ) => {
    if (String(url).endsWith("/api/Auth/sign-in"))
      return json(pair("user-a", 100))
    if (String(url).endsWith("/api/Auth/refresh")) {
      refreshes++
      return json(pair("user-a", 400 + refreshes))
    }
    protectedCalls++
    if (protectedCalls === 1) return json({ detail: "Expired." }, 401)
    assert.match(
      (init?.headers as Record<string, string>).Authorization,
      /^Bearer /
    )
    return json({ ok: true })
  }) as typeof fetch
  let time = 0
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => time
  )
  await manager.signIn("user-a@example.com", "password")
  time = 100_000
  const results = await Promise.all([
    manager.request("/one"),
    manager.request("/two"),
  ])
  assert.deepEqual(results, [{ ok: true }, { ok: true }])
  assert.equal(refreshes, 2)
  assert.equal(protectedCalls, 3)
  assert.equal(
    JSON.parse(saved.get()!).session.tokens.refreshToken,
    "refresh-user-a-402"
  )
})

test("a protected request never retries more than once after repeated 401", async () => {
  const saved = memoryStorage()
  let refreshes = 0
  let protectedCalls = 0
  const transport = (async (url: string | URL | Request) => {
    if (String(url).endsWith("/api/Auth/sign-in"))
      return json(pair("user-a", 300))
    if (String(url).endsWith("/api/Auth/refresh")) {
      refreshes++
      return json(pair("user-a", 400))
    }
    protectedCalls++
    return json({ detail: "Unauthorized" }, 401)
  }) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 0
  )
  await manager.signIn("user-a@example.com", "password")
  await assert.rejects(
    manager.request("/protected"),
    (error: unknown) => error instanceof ApiError && error.status === 401
  )
  assert.equal(refreshes, 1)
  assert.equal(protectedCalls, 2)
})

test("expired saved session stays local on network failure, then reconnects", async () => {
  const saved = memoryStorage()
  let online = false
  let refreshes = 0
  const transport = (async (url: string | URL | Request) => {
    if (String(url).endsWith("/api/Auth/refresh")) {
      refreshes++
      if (!online) throw new TypeError("offline")
      return json(pair("user-a", 300))
    }
    return json(pair("user-a", 1))
  }) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 10_000
  )
  await manager.signIn("user-a@example.com", "password")
  await manager.restore()
  assert.equal(manager.getSnapshot().status, "offline-local")
  assert.equal(saved.get() !== null, true)
  online = true
  await manager.retry(true)
  await manager.retry(true)
  assert.equal(refreshes, 2)
  assert.equal(manager.getSnapshot().status, "signed-in")
})

test("server rejection signs out; failed secure writes and deletion never report success", async () => {
  const saved = memoryStorage()
  const transport = (async (url: string | URL | Request) =>
    String(url).endsWith("/api/Auth/refresh")
      ? json({ detail: "Invalid refresh token." }, 401)
      : json(pair("user-a", 1))) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 10_000
  )
  saved.failWrite()
  await assert.rejects(manager.signIn("user-a@example.com", "password"))
  assert.equal(manager.getSnapshot().session, null)
  const writable = memoryStorage()
  const second = createSessionManager(
    "https://api.example",
    writable.storage,
    transport,
    () => 10_000
  )
  await second.signIn("user-a@example.com", "password")
  writable.failRemove()
  await assert.rejects(second.signOut())
  assert.equal(second.getSnapshot().status, "signed-in")
})

test("a late sign-in response after sign-out cannot restore another session", async () => {
  const saved = memoryStorage()
  let resolve!: (value: Response) => void
  const transport = (async () =>
    new Promise<Response>((done) => {
      resolve = done
    })) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport
  )
  await manager.restore()
  const pending = manager.signIn("user-a@example.com", "password")
  await manager.signOut()
  resolve(json(pair()))
  await pending
  assert.equal(manager.getSnapshot().status, "signed-out")
  assert.equal(saved.get(), null)
})

test("a protected response arriving after sign-out cannot be returned to the old account", async () => {
  const saved = memoryStorage()
  let resolve!: (value: Response) => void
  const transport = (async (url: string | URL | Request) => {
    if (String(url).endsWith("/api/Auth/sign-in")) return json(pair())
    return new Promise<Response>((done) => {
      resolve = done
    })
  }) as typeof fetch
  const manager = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 0
  )
  await manager.signIn("user-a@example.com", "password")
  const pending = manager.request("/protected")
  await manager.signOut()
  resolve(json({ private: true }))
  await assert.rejects(pending, /active account changed/)
})

test("saved sessions cannot cross API environments and rejected refresh clears credentials", async () => {
  const saved = memoryStorage()
  const transport = (async (url: string | URL | Request) =>
    String(url).endsWith("/refresh")
      ? json({ detail: "Invalid refresh token." }, 401)
      : json(pair())) as typeof fetch
  const first = createSessionManager(
    "https://api.example",
    saved.storage,
    transport,
    () => 0
  )
  await first.signIn("user-a@example.com", "password")
  const other = createSessionManager(
    "https://other.example",
    saved.storage,
    transport,
    () => 0
  )
  await other.restore()
  assert.equal(other.getSnapshot().status, "signed-out")
  await assert.rejects(first.retry())
  assert.equal(first.getSnapshot().status, "signed-out")
  assert.equal(saved.get(), null)
})
