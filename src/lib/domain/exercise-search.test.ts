import assert from "node:assert/strict"
import { test } from "node:test"

import { ApiError, createApiClient } from "../api-client"
import type { AuthenticatedRequest, DataStore } from "../services"
import type { AppData } from "../../types/domain"
import { createServices } from "./mock-services"
import { makeSeed } from "./seed"
import {
  createExerciseSearcher,
  normalizeExerciseSearch,
  parseExerciseSearchPage,
} from "./exercise-search"

const id = "11111111-1111-1111-1111-111111111111"
const anotherId = "22222222-2222-2222-2222-222222222222"
const page = (items = [{ id, name: "Push-up" }]) => ({
  items,
  page: 1,
  pageSize: 20,
  totalCount: items.length,
})
const known = {
  id,
  name: "Old name",
  trackingType: "bodyweight" as const,
  primaryMuscleGroup: "Chest",
  equipment: "None",
}

function fixture(request: AuthenticatedRequest) {
  let data = makeSeed(1, { includeDefaultRoutine: false })
  let revision = 0
  let failWrite = false
  const store: DataStore = {
    async read() {
      return structuredClone(data)
    },
    async mutate(fn) {
      const draft = structuredClone(data)
      const result = fn(draft)
      if (failWrite) throw new Error("Storage failed")
      data = draft
      return structuredClone(result)
    },
  }
  return {
    store,
    search: createExerciseSearcher(store, request, () => revision),
    snapshot: () => structuredClone(data),
    reset: () => {
      revision++
      data = makeSeed(1, { includeDefaultRoutine: false })
    },
    failWrites: () => {
      failWrite = true
    },
  }
}

test("exercise search encodes names, forwards cancellation, and persists known metadata before success", async () => {
  const signal = new AbortController().signal
  const f = fixture(async (path, options) => {
    assert.equal(
      path,
      "/api/workout/Exercise/search?Name=press%20%26%20%25_%20%E2%9C%93&Page=1&PageSize=20"
    )
    assert.equal(options?.signal, signal)
    assert.equal(options.expectedStatus, 200)
    return page([
      { id, name: "Renamed press" },
      { id: anotherId, name: "New press" },
    ])
  })
  await f.store.mutate((data) => {
    data.exercises = [known]
  })
  const result = await f.search({ name: "  press & %_ ✓  " }, { signal })
  assert.deepEqual(result.items[0], { ...known, name: "Renamed press" })
  assert.equal(result.items[1].trackingType, "weighted")
  assert.equal(result.items[1].equipment, "Unknown")
  assert.deepEqual(f.snapshot().exercises, result.items)
})

test("search validates inputs and responses and accepts integer strings", () => {
  for (const name of ["", " \t ", "x".repeat(256)])
    assert.throws(() => normalizeExerciseSearch({ name }), {
      code: "VALIDATION",
    })
  for (const input of [
    { page: 0 },
    { page: 1.2 },
    { pageSize: 101 },
    { pageSize: 0 },
    { page: 2147483648, pageSize: 1 },
    { page: 2147483647 },
  ])
    assert.throws(() => normalizeExerciseSearch({ name: "press", ...input }), {
      code: "VALIDATION",
    })
  assert.equal(
    normalizeExerciseSearch({
      name: "x".repeat(255),
      page: 2147483647,
      pageSize: 1,
    }).page,
    2147483647
  )
  assert.deepEqual(
    parseExerciseSearchPage(
      { ...page(), page: "1", pageSize: "20", totalCount: "1" },
      { name: "up" }
    ),
    parseExerciseSearchPage(page(), { name: "up" })
  )
  for (const raw of [
    null,
    [],
    {},
    { ...page(), page: 2 },
    { ...page(), pageSize: 100 },
    { ...page(), totalCount: -1 },
    { ...page(), totalCount: "1.0" },
    { ...page(), totalCount: 0 },
    page([{ id: "invalid", name: "press" }]),
    page([{ id, name: " " }]),
  ])
    assert.throws(() => parseExerciseSearchPage(raw, { name: "press" }), {
      code: "INVALID_RESPONSE",
    })
})

test("failed writes and malformed responses do not publish a successful search or erase catalog entries", async () => {
  const f = fixture(async () => page())
  await f.store.mutate((data) => {
    data.exercises = [known]
  })
  f.failWrites()
  await assert.rejects(f.search({ name: "up" }), /Storage failed/)
  assert.deepEqual(f.snapshot().exercises, [known])
  const malformed = fixture(async () => ({}))
  await assert.rejects(malformed.search({ name: "up" }), {
    code: "INVALID_RESPONSE",
  })
  assert.deepEqual(malformed.snapshot().exercises, [])
})

test("cancelled and reset-era responses cannot persist; concurrent creation keeps its metadata", async () => {
  let finish!: (value: unknown) => void
  const f = fixture(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const controller = new AbortController()
  const cancelled = f.search({ name: "up" }, { signal: controller.signal })
  controller.abort()
  finish(page())
  await assert.rejects(cancelled, { kind: "cancelled" })
  assert.deepEqual(f.snapshot().exercises, [])
  const reset = f.search({ name: "up" })
  f.reset()
  finish(page())
  await assert.rejects(reset, { kind: "cancelled" })
  assert.deepEqual(f.snapshot().exercises, [])
  const creating = f.search({ name: "up" })
  await f.store.mutate((data) => {
    data.exercises.push(known)
  })
  finish(page())
  assert.equal((await creating).items[0].trackingType, "bodyweight")
  assert.equal(f.snapshot().exercises.length, 1)
})

test("queued writes check cancellation again before changing the snapshot", async () => {
  let mutate!: () => void
  let committed = false
  const controller = new AbortController()
  const store: DataStore = {
    async read(): Promise<AppData> {
      return makeSeed(1)
    },
    mutate(fn) {
      return new Promise((resolve, reject) => {
        mutate = () => {
          try {
            const result = fn(makeSeed(1))
            committed = true
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }
      })
    },
  }
  const search = createExerciseSearcher(
    store,
    async () => page(),
    () => 0
  )
  const task = search({ name: "up" }, { signal: controller.signal })
  await new Promise<void>((resolve) => setImmediate(resolve))
  controller.abort()
  mutate()
  await assert.rejects(task, { kind: "cancelled" })
  assert.equal(committed, false)
})

test("local/demo paginated search preserves local search and getById behavior", async () => {
  const f = fixture(async () => page())
  const services = createServices(f.store, { delayMs: 0 })
  await services.demo.reset()
  const all = await services.exercises.search({ search: "press" })
  const result = await services.exercises.searchPage({
    name: "press",
    page: 2,
    pageSize: 1,
  })
  assert.equal(result.totalCount, all.length)
  assert.deepEqual(result.items, all.slice(1, 2))
  assert.deepEqual(await services.exercises.getById(all[0].id), all[0])
})

test("backend service exposes discovered records to the routine builder and reset fences outstanding reads", async () => {
  const f = fixture(async () => page())
  let finish!: (value: unknown) => void
  let delayed = false
  const services = createServices(f.store, {
    delayMs: 0,
    request: async () =>
      delayed
        ? new Promise((resolve) => {
            finish = resolve
          })
        : page(),
  })
  const result = await services.exercises.searchPage({ name: "up" })
  assert.deepEqual(await services.exercises.getById(id), result.items[0])
  assert.deepEqual(
    await services.exercises.search({ search: "up" }),
    result.items
  )
  delayed = true
  const task = services.exercises.searchPage({ name: "up", page: 2 })
  await services.demo.reset()
  finish({ ...page(), page: 2 })
  await assert.rejects(task, { kind: "cancelled" })
  assert.deepEqual(f.snapshot().exercises, [])
})

test(
  "real HTTP exercise search against the contract simulation",
  { skip: !process.env.EXERCISE_SEARCH_SIMULATION_URL },
  async () => {
    const api = createApiClient(process.env.EXERCISE_SEARCH_SIMULATION_URL!)
    const f = fixture((path, options) =>
      api.request(path, { ...options, bearer: "simulation-session" })
    )
    const first = await f.search({ name: " press " })
    const second = await f.search({ name: "press", page: 2 })
    assert.equal(first.items.length, 20)
    assert.equal(second.items.length, 3)
    assert.equal(first.totalCount, 23)
    assert.equal(f.snapshot().exercises.length, 23)
    await assert.rejects(
      api.request("/api/workout/Exercise/search?Name=press"),
      (error: unknown) => error instanceof ApiError && error.status === 401
    )
    await assert.rejects(
      api.request("/api/workout/Exercise/search?Name=%20", {
        bearer: "simulation-session",
      }),
      (error: unknown) => error instanceof ApiError && error.status === 400
    )
  }
)
