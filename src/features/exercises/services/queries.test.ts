import assert from "node:assert/strict"
import { test } from "node:test"
import {
  InfiniteQueryObserver,
  MutationObserver,
  onlineManager,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { createQueryClient, clearAccountQueries } from "@/lib/query-client"
import type { Services } from "@/lib/services"
import { createServices } from "@/lib/services"
import { makeSeed } from "@/lib/domain/seed"
import type { AppData, ExerciseSearchPage } from "@/types/domain"
import {
  createExerciseMutationOptions,
  exerciseKeys,
  exerciseSearchQueryOptions,
} from "./queries"
import { exerciseSearchState, flattenExercisePages } from "./search-state"

const tick = () => new Promise<void>((resolve) => setImmediate(resolve))
const exercise = (index: number) => ({
  id: `10000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
  name: `Press ${index}`,
  trackingType: "weighted" as const,
  primaryMuscleGroup: "General",
  equipment: "Unknown",
})
const page = (page = 1, count = 1): ExerciseSearchPage => ({
  items: Array.from({ length: count }, (_, index) =>
    exercise(index + (page - 1) * 20)
  ),
  page,
  pageSize: 20,
  totalCount: 23,
})

function servicesWithSearch(searchPage: Services["exercises"]["searchPage"]) {
  let data = makeSeed(1, { includeDefaultRoutine: false })
  const services = createServices(
    {
      async read() {
        return structuredClone(data)
      },
      async mutate<T>(fn: (draft: AppData) => T) {
        const draft = structuredClone(data)
        const result = fn(draft)
        data = draft
        return structuredClone(result)
      },
    },
    { delayMs: 0 }
  )
  services.exercises.searchPage = searchPage
  return services
}

test("search query shares requests and appends pages until the server total is reached", async (t) => {
  const client = createQueryClient()
  t.after(() => client.clear())
  const requested: number[] = []
  const services = servicesWithSearch(async (input) => {
    requested.push(input.page ?? 1)
    await tick()
    return page(input.page, input.page === 1 ? 20 : 3)
  })
  const options = exerciseSearchQueryOptions(services, " press ")
  await Promise.all([
    client.fetchInfiniteQuery(options),
    client.fetchInfiniteQuery(exerciseSearchQueryOptions(services, "press")),
  ])
  assert.deepEqual(requested, [1])
  const observer = new InfiniteQueryObserver(client, options)
  const unsubscribe = observer.subscribe(() => undefined)
  t.after(unsubscribe)
  assert.equal(observer.getCurrentResult().hasNextPage, true)
  await observer.fetchNextPage()
  assert.deepEqual(requested, [1, 2])
  assert.equal(observer.getCurrentResult().hasNextPage, false)
  assert.equal(
    flattenExercisePages(observer.getCurrentResult().data!.pages).length,
    23
  )
  assert.equal(
    exerciseSearchQueryOptions(services, "squat").queryKey[1],
    "squat"
  )
})

test("pagination errors preserve previously loaded results and can retry the same page", async (t) => {
  const client = createQueryClient()
  t.after(() => client.clear())
  let fail = true
  const services = servicesWithSearch(async (input) => {
    if (input.page === 2 && fail) throw new Error("Storage failed")
    return page(input.page, input.page === 1 ? 20 : 3)
  })
  const observer = new InfiniteQueryObserver(
    client,
    exerciseSearchQueryOptions(services, "press")
  )
  const unsubscribe = observer.subscribe(() => undefined)
  t.after(unsubscribe)
  await observer.refetch()
  await observer.fetchNextPage()
  assert.equal(observer.getCurrentResult().isFetchNextPageError, true)
  assert.equal(observer.getCurrentResult().data!.pages[0].items.length, 20)
  fail = false
  await observer.fetchNextPage()
  assert.equal(observer.getCurrentResult().data!.pages.length, 2)
})

test("query cancellation forwards AbortSignal and discarded accounts do not share search caches", async (t) => {
  const client = createQueryClient()
  const next = createQueryClient()
  t.after(() => {
    client.clear()
    next.clear()
  })
  let finish!: (value: ExerciseSearchPage) => void
  let signal: AbortSignal | undefined
  const services = servicesWithSearch((_input, options) => {
    signal = options?.signal
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const task = client.fetchInfiniteQuery(
    exerciseSearchQueryOptions(services, "press")
  )
  const rejected = assert.rejects(task)
  clearAccountQueries(client)
  await rejected
  assert.equal(signal?.aborted, true)
  finish(page())
  await tick()
  assert.equal(next.getQueryData(exerciseKeys.search("press")), undefined)
  assert.equal(client.getQueryCache().getAll().length, 0)
})

test("exercise creation invalidates cached searches and offline creation never queues", async (t) => {
  const client = createQueryClient()
  t.after(() => {
    client.clear()
    onlineManager.setOnline(true)
  })
  const services = servicesWithSearch(async () => page())
  await client.fetchInfiniteQuery(exerciseSearchQueryOptions(services, "press"))
  const mutation = new MutationObserver(
    client,
    createExerciseMutationOptions(services, client)
  )
  await mutation.mutate({ name: "New press", trackingType: "bodyweight" })
  assert.equal(
    client.getQueryState(exerciseKeys.search("press"))!.isInvalidated,
    true
  )
  onlineManager.setOnline(false)
  let creates = 0
  services.exercises.create = async () => {
    creates++
    return exercise(1)
  }
  await assert.rejects(
    mutation.mutate({ name: "Another press", trackingType: "weighted" }),
    /Connect to the internet/
  )
  assert.equal(mutation.getCurrentResult().isPaused, false)
  onlineManager.setOnline(true)
  await tick()
  assert.equal(creates, 0)
})

test("search retries transient failures but not validation or persistence failures", async (t) => {
  const client = createQueryClient()
  t.after(() => client.clear())
  let calls = 0
  const services = servicesWithSearch(async () => {
    calls++
    throw new ApiError("http", "Unavailable", 503)
  })
  await assert.rejects(
    client.fetchInfiniteQuery({
      ...exerciseSearchQueryOptions(services, "press"),
      retryDelay: 0,
    })
  )
  assert.equal(calls, 3)
  calls = 0
  services.exercises.searchPage = async () => {
    calls++
    throw new Error("Storage failed")
  }
  await assert.rejects(
    client.fetchInfiniteQuery(exerciseSearchQueryOptions(services, "squat"))
  )
  assert.equal(calls, 1)
})

test("picker distinguishes pending input, success, offline fallback, errors, and confirmed empty results", () => {
  const input = {
    remote: true,
    name: "press",
    debouncedName: "press",
    online: true,
    fetching: false,
    error: null,
    local: [exercise(1)],
  }
  const empty = { ...page(), items: [], totalCount: 0 }
  assert.equal(
    exerciseSearchState({ ...input, pages: [empty] }).canCreate,
    true
  )
  const debounce = exerciseSearchState({
    ...input,
    name: "squat",
    pages: [empty],
  })
  assert.equal(debounce.loading, true)
  assert.equal(debounce.canCreate, false)
  assert.deepEqual(debounce.items, [])
  const offline = exerciseSearchState({
    ...input,
    online: false,
    pages: [empty],
  })
  assert.deepEqual(offline.items, input.local)
  assert.equal(offline.offline, true)
  assert.equal(offline.canCreate, false)
  assert.equal(
    exerciseSearchState({ ...input, online: false, local: [] }).canCreate,
    false
  )
  const failed = exerciseSearchState({
    ...input,
    pages: [empty],
    error: new Error("Unavailable"),
  })
  assert.equal(failed.canCreate, false)
  assert.ok(failed.error)
  assert.equal(
    exerciseSearchState({ ...input, pages: [empty], fetching: true }).canCreate,
    false
  )
  assert.equal(
    exerciseSearchState({ ...input, name: " ", local: [] }).canCreate,
    true
  )
  assert.equal(
    exerciseSearchState({ ...input, name: "x".repeat(256) }).invalid,
    true
  )
  assert.equal(
    exerciseSearchState({ ...input, name: "x".repeat(256) }).canCreate,
    false
  )
  assert.equal(
    exerciseSearchState({ ...input, pages: [page()] }).totalCount,
    23
  )
  assert.equal(flattenExercisePages([page(), page()]).length, 1)
})
