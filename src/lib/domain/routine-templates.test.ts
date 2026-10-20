import assert from "node:assert/strict"
import { test } from "node:test"

import type { AppData } from "../../types/domain"
import { makeSeed } from "./seed"
import { createRemoteRoutineLoader } from "./routine-templates"

function fixture() {
  let data = makeSeed(1000)
  let now = 1000
  let requests = 0
  const store = {
    async read() {
      return structuredClone(data)
    },
    async mutate<T>(fn: (value: AppData) => T) {
      const draft = structuredClone(data)
      const result = fn(draft)
      data = draft
      return structuredClone(result)
    },
  }
  const request = async (path: string) => {
    requests += 1
    if (path === "/api/workout/Template")
      return [
        {
          id: "template-1",
          name: "Push day",
          scheduledDays: ["Monday", "5"],
        },
      ]
    assert.equal(path, "/api/workout/Template/template-1")
    return {
      id: "template-1",
      name: "Push day",
      restInMinutes: 2,
      scheduledDays: [1, 5],
      workoutExercises: [
        {
          id: "template-exercise-1",
          exerciseId: "exercise-1",
          exerciseName: "Bench press",
          sets: 3,
          reps: 8,
          restInSeconds: 120,
          sortIndex: 0,
          weightUnit: "Pounds",
          weightIncrement: 10,
        },
      ],
    }
  }
  return {
    store,
    request,
    loader: createRemoteRoutineLoader(store, request, () => now),
    requests: () => requests,
    advance: (ms: number) => {
      now += ms
    },
    data: () => structuredClone(data),
  }
}

test("fetches and normalizes templates into routines", async () => {
  const f = fixture()
  const routines = await f.loader.list()
  const routine = routines[0]
  const entry = routine.entries[0]

  assert.equal(routine.name, "Push day")
  assert.deepEqual(routine.scheduledDays, [1, 5])
  assert.equal(entry.setCount, 3)
  assert.equal(entry.repMin, 8)
  assert.equal(entry.repMax, 8)
  assert.equal(entry.restSeconds, 120)
  assert.equal(entry.progressionMode, "weight")
  assert.ok(Math.abs((entry.weightIncrement ?? 0) - 4.5359237) < 0.000001)
  assert.equal(f.data().routineCache?.fetchedAt, 1000)
  assert.equal(f.data().exercises[0].trackingType, "weighted")
  assert.equal(f.requests(), 2)
})

test("always fetches so query invalidation controls freshness", async () => {
  const f = fixture()
  await f.loader.list()
  f.advance(1)
  await f.loader.list()
  assert.equal(f.requests(), 4)
})

test("reports refresh failures without discarding the durable snapshot", async () => {
  const f = fixture()
  await f.loader.list()
  f.advance(1)
  const failingLoader = createRemoteRoutineLoader(
    f.store,
    async () => {
      throw new Error("offline")
    },
    () => 1001
  )
  await assert.rejects(failingLoader.list(), /offline/)
  assert.equal(f.data().routines[0].name, "Push day")
  assert.equal(f.requests(), 2)
})

test("rejects malformed template payloads when no cache exists", async () => {
  const f = fixture()
  const loader = createRemoteRoutineLoader(
    f.store,
    async () => ({ unexpected: true }),
    () => 1000
  )
  await assert.rejects(loader.list(), { code: "INVALID_RESPONSE" })
})

test("detail fanout is bounded and caller cancellation never replaces saved data", async () => {
  const f = fixture()
  await f.loader.list()
  const before = f.data()
  let active = 0
  let maximum = 0
  let detailCalls = 0
  const controller = new AbortController()
  const loader = createRemoteRoutineLoader(f.store, async (path, options) => {
    assert.equal(options?.signal, controller.signal)
    if (path === "/api/workout/Template")
      return Array.from({ length: 12 }, (_, id) => ({ id: String(id) }))
    active++
    detailCalls++
    maximum = Math.max(maximum, active)
    await new Promise<void>((resolve) => setImmediate(resolve))
    if (detailCalls >= 4) controller.abort()
    active--
    return { name: path, workoutExercises: [] }
  })
  await assert.rejects(loader.list({ signal: controller.signal }), {
    kind: "cancelled",
  })
  assert.equal(maximum, 4)
  assert.equal(detailCalls, 4)
  assert.deepEqual(f.data(), before)
})
