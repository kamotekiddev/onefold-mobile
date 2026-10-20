import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MutationObserver,
  onlineManager,
  QueryObserver,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { createQueryClient } from "@/lib/query-client"
import { createServices } from "@/lib/domain/mock-services"
import { makeSeed } from "@/lib/domain/seed"
import type { AppData, Routine } from "@/types/domain"
import {
  createRoutineMutationOptions,
  routineKeys,
  routinesQueryOptions,
} from "./queries"

function fixture() {
  let data = makeSeed(1000)
  data.routineCache = { source: "backend", fetchedAt: Date.now() - 600_000 }
  let failWrites = false
  const store = {
    read: async () => structuredClone(data),
    async mutate<T>(fn: (draft: AppData) => T) {
      if (failWrites) throw new Error("disk full")
      const draft = structuredClone(data)
      const result = fn(draft)
      data = draft
      return structuredClone(result)
    },
  }
  return {
    store,
    snapshot: () => structuredClone(data),
    failWrites: () => {
      failWrites = true
    },
  }
}

test("hydration keeps the original fetch timestamp and refresh failure keeps saved content", async (t) => {
  const f = fixture()
  const client = createQueryClient()
  t.after(() => client.clear())
  const services = createServices(f.store, {
    request: async () => {
      throw new ApiError("http", "denied", 403)
    },
  })
  const options = routinesQueryOptions(services, f.snapshot())
  const observer = new QueryObserver(client, options)
  assert.equal(
    observer.getCurrentResult().dataUpdatedAt,
    f.snapshot().routineCache?.fetchedAt
  )
  await assert.rejects(client.fetchQuery(options), /denied/)
  assert.deepEqual(client.getQueryData(routineKeys.all), f.snapshot().routines)
  assert.equal(client.getQueryState(routineKeys.all)?.status, "error")
  assert.equal(
    client.getQueryState(routineKeys.all)?.dataUpdatedAt,
    f.snapshot().routineCache?.fetchedAt
  )
})

test("offline restart exposes saved routines and can start a local workout with no remote request", async (t) => {
  const f = fixture()
  const client = createQueryClient()
  onlineManager.setOnline(false)
  t.after(() => {
    onlineManager.setOnline(true)
    client.clear()
  })
  let requests = 0
  const services = createServices(f.store, {
    request: async () => {
      requests++
      throw new Error("offline")
    },
  })
  const observer = new QueryObserver(
    client,
    routinesQueryOptions(services, f.snapshot())
  )
  const unsubscribe = observer.subscribe(() => undefined)
  t.after(unsubscribe)
  assert.equal(observer.getCurrentResult().fetchStatus, "paused")
  const routines = observer.getCurrentResult().data!
  const workout = await services.workouts.start(routines[0].id)
  assert.equal(workout.routineName, routines[0].name)
  assert.ok(workout.entries.length)
  assert.equal(requests, 0)
})

test("storage failure rejects a refresh and preserves both query content and durable data", async (t) => {
  const f = fixture()
  const client = createQueryClient()
  t.after(() => client.clear())
  const before = f.snapshot()
  const services = createServices(f.store, { request: async () => [] })
  const options = routinesQueryOptions(services, before)
  f.failWrites()
  await assert.rejects(client.fetchQuery(options), /disk full/)
  assert.deepEqual(f.snapshot(), before)
  assert.deepEqual(client.getQueryData(routineKeys.all), before.routines)
})

test("successful creation publishes the durable snapshot and invalidates the collection", async (t) => {
  const f = fixture()
  const client = createQueryClient()
  t.after(() => client.clear())
  const services = createServices(f.store, { delayMs: 0 })
  const input = {
    name: "Another routine",
    entries: f.snapshot().routines[0].entries,
  }
  client.setQueryData(routineKeys.all, f.snapshot().routines)
  const observer = new MutationObserver(
    client,
    createRoutineMutationOptions(client, services, f.store)
  )
  const saved = await observer.mutate(input)
  assert.ok(
    client
      .getQueryData<Routine[]>(routineKeys.all)
      ?.some((routine) => routine.id === saved.id)
  )
  assert.equal(client.getQueryState(routineKeys.all)?.isInvalidated, true)
  assert.ok(f.snapshot().routines.some((routine) => routine.id === saved.id))
})

test("a saved empty collection is success while offline without a snapshot remains pending", async (t) => {
  const f = fixture()
  const client = createQueryClient()
  onlineManager.setOnline(false)
  t.after(() => {
    onlineManager.setOnline(true)
    client.clear()
  })
  const services = createServices(f.store, { request: async () => [] })
  const savedEmpty = { ...f.snapshot(), routines: [] }
  const options = routinesQueryOptions(services, savedEmpty)
  const saved = new QueryObserver(client, options)
  assert.equal(saved.getCurrentResult().status, "success")
  assert.deepEqual(saved.getCurrentResult().data, [])
  const uncachedClient = createQueryClient()
  t.after(() => uncachedClient.clear())
  const missing = new QueryObserver(
    uncachedClient,
    routinesQueryOptions(services, null)
  )
  const unsubscribe = missing.subscribe(() => undefined)
  t.after(unsubscribe)
  assert.equal(missing.getCurrentResult().status, "pending")
  assert.equal(missing.getCurrentResult().fetchStatus, "paused")
  assert.equal(missing.getCurrentResult().data, undefined)
})
