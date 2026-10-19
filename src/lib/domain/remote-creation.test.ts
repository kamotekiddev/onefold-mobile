import assert from "node:assert/strict"
import { test } from "node:test"

import type { ApiRequest } from "../api-client"
import type { AppData, RoutineInput } from "../../types/domain"
import { createServices } from "./mock-services"
import { makeSeed } from "./seed"
import { ROUTINE_CACHE_TTL_MS } from "./routine-templates"

const exerciseId = "11111111-1111-1111-1111-111111111111"
const templateId = "22222222-2222-2222-2222-222222222222"
const entryId = "33333333-3333-3333-3333-333333333333"

function fixture() {
  let data = makeSeed(1000, { includeDefaultRoutine: false })
  const calls: { path: string; options?: ApiRequest }[] = []
  let created = false
  let fail = false
  let failDetail = false
  const detail = {
    id: templateId,
    name: "First routine",
    restInMinutes: 2,
    scheduledDays: ["Monday"],
    workoutExercises: [
      {
        id: entryId,
        exerciseId,
        exerciseName: "Push-up",
        sets: 3,
        reps: 8,
        sortIndex: 0,
      },
    ],
  }
  const store = {
    async read() {
      return structuredClone(data)
    },
    async mutate<T>(fn: (draft: AppData) => T) {
      const draft = structuredClone(data)
      const result = fn(draft)
      data = draft
      return structuredClone(result)
    },
  }
  const services = createServices(store, {
    delayMs: 0,
    now: () => 1000,
    request: async (path, options) => {
      calls.push({ path, options })
      if (fail) throw new Error("Cannot reach server")
      if (path === "/api/workout/Exercise" && options?.method === "POST")
        return { exerciseId }
      if (path === "/api/workout/Template" && options?.method === "POST") {
        created = true
        return { templateId }
      }
      if (path === "/api/workout/Template") return created ? [detail] : []
      if (path === `/api/workout/Template/${templateId}`) {
        if (failDetail) throw new Error("Cannot reach server")
        return detail
      }
      throw new Error(`Unexpected request: ${path}`)
    },
  })
  const input: RoutineInput = {
    name: " First routine ",
    scheduledDays: [1],
    entries: [
      {
        id: "draft-entry",
        exerciseId,
        order: 0,
        setCount: 3,
        repMin: 8,
        repMax: 8,
        restSeconds: 90,
        progressionMode: "manual",
        prescriptionRevision: 1,
      },
    ],
  }
  return {
    services,
    input,
    calls,
    data: () => structuredClone(data),
    fail: () => {
      fail = true
    },
    failDetail: (value: boolean) => {
      failDetail = value
    },
  }
}

test("an empty account can create an exercise and routine on the backend, then reload them despite a fresh empty cache", async () => {
  const f = fixture()
  assert.deepEqual(await f.services.routines.list(), [])
  assert.deepEqual(await f.services.exercises.search(), [])
  const exercise = await f.services.exercises.create({
    name: " Push-up ",
    trackingType: "bodyweight",
  })
  assert.equal(exercise.id, exerciseId)
  assert.deepEqual(f.calls.at(-1)?.options?.body, {
    name: "Push-up",
    type: "Bodyweight",
    description: null,
  })
  const saved = await f.services.routines.create(f.input)
  assert.equal(saved.id, templateId)
  assert.equal(saved.entries[0].id, entryId)
  assert.deepEqual(
    f.calls.find(
      (call) =>
        call.path === "/api/workout/Template" && call.options?.method === "POST"
    )?.options?.body,
    {
      name: "First routine",
      description: null,
      restInMinutes: 2,
      scheduledDays: [1],
      exercises: [
        {
          exerciseId,
          targetSet: 3,
          targetReps: 8,
          restInSeconds: 90,
          sortIndex: 0,
          weightUnit: null,
          weightIncrement: null,
        },
      ],
    }
  )
  assert.equal(f.data().routineCache?.fetchedAt, 1000 - ROUTINE_CACHE_TTL_MS)
  assert.equal((await f.services.routines.list())[0].id, templateId)
  assert.equal(
    (await f.services.exercises.search())[0].trackingType,
    "bodyweight"
  )
})

test("failed backend routine creation does not create a local-only routine or invalidate the previous cache", async () => {
  const f = fixture()
  await f.services.routines.list()
  await f.services.exercises.create({
    name: "Push-up",
    trackingType: "bodyweight",
  })
  const cache = f.data().routineCache
  f.fail()
  await assert.rejects(
    f.services.routines.create(f.input),
    /Cannot reach server/
  )
  assert.deepEqual(f.data().routines, [])
  assert.deepEqual(f.data().routineCache, cache)
})

test("retry after a successful POST and failed detail request loads the same routine without creating it twice", async () => {
  const f = fixture()
  await f.services.exercises.create({
    name: "Push-up",
    trackingType: "bodyweight",
  })
  f.failDetail(true)
  await assert.rejects(f.services.routines.create(f.input), {
    code: "SAVED_NOT_LOADED",
  })
  f.failDetail(false)
  const saved = await f.services.routines.create(f.input)
  assert.equal(saved.id, templateId)
  assert.equal(
    f.calls.filter(
      (call) =>
        call.path === "/api/workout/Template" && call.options?.method === "POST"
    ).length,
    1
  )
})

test("unsupported prescriptions fail before making a template write", async () => {
  const f = fixture()
  await f.services.exercises.create({
    name: "Push-up",
    trackingType: "bodyweight",
  })
  await assert.rejects(
    f.services.routines.create({
      ...f.input,
      entries: [{ ...f.input.entries[0], repMax: 12 }],
    }),
    /one target rep count/
  )
  assert.equal(
    f.calls.some(
      (call) =>
        call.path === "/api/workout/Template" && call.options?.method === "POST"
    ),
    false
  )
})

test("refresh keeps a newly created unused exercise and failed exercise creation does not add one", async () => {
  const f = fixture()
  await f.services.exercises.create({
    name: "Push-up",
    trackingType: "bodyweight",
  })
  await f.services.routines.list()
  assert.equal((await f.services.exercises.search())[0].id, exerciseId)
  f.fail()
  await assert.rejects(
    f.services.exercises.create({ name: "Squat", trackingType: "weighted" }),
    /Cannot reach server/
  )
  assert.equal(f.data().exercises.length, 1)
})
