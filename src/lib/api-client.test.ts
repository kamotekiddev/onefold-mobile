import assert from "node:assert/strict"
import { test } from "node:test"

import { ApiError, createApiClient } from "./api-client"

test("requests time out after 15 seconds and normalize transport cancellation", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const transport = ((_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      const abort = () => reject(new Error("aborted"))
      if (init?.signal?.aborted) abort()
      else init?.signal?.addEventListener("abort", abort, { once: true })
    })) as typeof fetch
  const client = createApiClient("https://api.example", transport)
  const timed = assert.rejects(
    client.request("/test"),
    (error: unknown) => error instanceof ApiError && error.kind === "timeout"
  )
  t.mock.timers.tick(15_000)
  await timed
  const cancelled = new AbortController()
  cancelled.abort()
  await assert.rejects(
    client.request("/test", { signal: cancelled.signal }),
    /cancelled/
  )
})

test("malformed successful responses and empty unauthorized bodies are normalized", async () => {
  const malformed = createApiClient(
    "https://api.example",
    (async () => new Response("not JSON")) as typeof fetch
  )
  await assert.rejects(
    malformed.request("/test"),
    (error: unknown) =>
      error instanceof ApiError && error.kind === "invalid-response"
  )
  const unauthorized = createApiClient(
    "https://api.example",
    (async () => new Response(null, { status: 401 })) as typeof fetch
  )
  await assert.rejects(
    unauthorized.request("/test"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 401 &&
      /email or password/.test(error.message)
  )
})
