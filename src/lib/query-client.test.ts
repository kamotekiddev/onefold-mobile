import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MutationObserver,
  onlineManager,
  QueryObserver,
  focusManager,
} from "@tanstack/react-query"

import { ApiError } from "./api-client"
import {
  createQueryClient,
  clearAccountQueries,
  requireOnline,
} from "./query-client"

const tick = () => new Promise<void>((resolve) => setImmediate(resolve))

test("reads share requests and retry transient failures at most twice", async (t) => {
  const client = createQueryClient()
  t.after(() => client.clear())
  let requests = 0
  const options = {
    queryKey: ["shared"],
    retryDelay: 0,
    queryFn: async () => {
      requests++
      await tick()
      if (requests < 3) throw new ApiError("network", "offline")
      return ["saved"]
    },
  }
  assert.deepEqual(
    await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]),
    [["saved"], ["saved"]]
  )
  assert.equal(requests, 3)
  requests = 0
  await assert.rejects(
    client.fetchQuery({
      ...options,
      queryKey: ["fails"],
      queryFn: async () => {
        requests++
        throw new ApiError("http", "unavailable", 503)
      },
    })
  )
  assert.equal(requests, 3)
})

test("cancellation, validation, authorization and refresh failures never retry", async (t) => {
  const client = createQueryClient()
  t.after(() => client.clear())
  for (const error of [
    new ApiError("cancelled", "cancelled"),
    new ApiError("http", "unauthorized", 401),
    new ApiError("http", "invalid", 400),
    new ApiError("invalid-response", "bad response"),
    new ApiError("session", "refresh failed"),
    new Error("storage failed"),
  ]) {
    let calls = 0
    await assert.rejects(
      client.fetchQuery({
        queryKey: [error.message],
        retryDelay: 0,
        queryFn: async () => {
          calls++
          throw error
        },
      })
    )
    assert.equal(calls, 1)
  }
})

test("clearing an outgoing account aborts requests and cannot populate the next account", async (t) => {
  const first = createQueryClient()
  const next = createQueryClient()
  t.after(() => {
    first.clear()
    next.clear()
  })
  let signal: AbortSignal | undefined
  let finish!: (value: string[]) => void
  const task = first.fetchQuery({
    queryKey: ["routines"],
    queryFn: (context) => {
      signal = context.signal
      return new Promise<string[]>((resolve) => {
        finish = resolve
      })
    },
  })
  const rejected = assert.rejects(task)
  clearAccountQueries(first)
  await rejected
  assert.equal(signal?.aborted, true)
  finish(["previous account"])
  await tick()
  assert.equal(first.getQueryCache().getAll().length, 0)
  assert.equal(next.getQueryData(["routines"]), undefined)
})

test("offline mutations reject immediately and never replay on reconnect", async (t) => {
  const client = createQueryClient()
  client.mount()
  t.after(() => {
    onlineManager.setOnline(true)
    client.unmount()
    client.clear()
  })
  onlineManager.setOnline(false)
  let posts = 0
  const observer = new MutationObserver(client, {
    mutationFn: async () => {
      requireOnline()
      posts++
    },
  })
  await assert.rejects(observer.mutate(), /Connect to the internet/)
  assert.equal(observer.getCurrentResult().isPaused, false)
  onlineManager.setOnline(true)
  await tick()
  assert.equal(posts, 0)
})

test("stale observed reads refresh on foreground and reconnect", async (t) => {
  const client = createQueryClient()
  client.mount()
  let calls = 0
  const observer = new QueryObserver(client, {
    queryKey: ["lifecycle"],
    staleTime: 0,
    queryFn: async () => ++calls,
  })
  const unsubscribe = observer.subscribe(() => undefined)
  t.after(() => {
    unsubscribe()
    client.unmount()
    client.clear()
    focusManager.setFocused(undefined)
    onlineManager.setOnline(true)
  })
  await tick()
  assert.equal(calls, 1)
  focusManager.setFocused(false)
  focusManager.setFocused(true)
  await tick()
  assert.equal(calls, 2)
  onlineManager.setOnline(false)
  onlineManager.setOnline(true)
  await tick()
  assert.equal(calls, 3)
})
