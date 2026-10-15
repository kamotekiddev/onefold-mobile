import assert from "node:assert/strict"
import { test } from "node:test"
import type { AppData, Weekday, Workout } from "../../types/domain"
import { createServices } from "./mock-services"
import { makeSeed } from "./seed"
import { suggestProgression } from "./progression"

function fixture() {
  let data = makeSeed(1000)
  let writesFail = false
  let timestamp = 2000
  let queue = Promise.resolve()
  const store = {
    async read() {
      await queue
      return structuredClone(data)
    },
    mutate<T>(fn: (draft: AppData) => T): Promise<T> {
      const result = queue.then(() => {
        const draft = structuredClone(data)
        const value = fn(draft)
        if (writesFail) throw new Error("Disk full")
        data = draft
        return structuredClone(value)
      })
      queue = result.then(
        () => undefined,
        () => undefined
      )
      return result
    },
  }
  return {
    services: createServices(store, { delayMs: 0, now: () => timestamp }),
    state: () => structuredClone(data),
    failWrites: (fail: boolean) => {
      writesFail = fail
    },
    advance: (ms: number) => {
      timestamp += ms
    },
  }
}
async function logAll(
  f: ReturnType<typeof fixture>,
  workout: Workout,
  reps = 12
) {
  for (const entry of workout.entries)
    for (const set of entry.sets)
      await f.services.workouts.updateSet(workout.id, entry.id, set.id, {
        actualReps: reps,
        actualWeight: set.plannedWeight ?? 0,
        status: "completed",
      })
}

test("routine weekly schedule persists through create, update, and duplicate", async () => {
  const f = fixture()
  const routine = f.state().routines[0]
  const mondayAndWednesday = {
    ...routine,
    scheduledDays: [1, 3] as Weekday[],
  }
  const updated = await f.services.routines.update(
    routine.id,
    mondayAndWednesday
  )
  assert.deepEqual(updated.scheduledDays, [1, 3])

  const duplicate = await f.services.routines.duplicate(routine.id)
  assert.deepEqual(duplicate.scheduledDays, [1, 3])

  const movedToFriday = await f.services.routines.update(routine.id, {
    ...updated,
    scheduledDays: [5] as Weekday[],
  })
  assert.deepEqual(movedToFriday.scheduledDays, [5])
  assert.deepEqual(
    (await f.services.routines.getById(duplicate.id)).scheduledDays,
    [1, 3]
  )
})

test("start request is idempotent, another start conflicts, finish applies progression once", async () => {
  const f = fixture()
  const starts = await Promise.all([
    f.services.workouts.start("routine-full-body", {
      requestId: "request-1",
    }),
    f.services.workouts.start("routine-full-body", {
      requestId: "request-1",
    }),
  ])
  assert.equal(starts[0].id, starts[1].id)
  await assert.rejects(f.services.workouts.start("routine-full-body"), {
    code: "ACTIVE_WORKOUT_EXISTS",
  })
  await logAll(f, starts[0])
  const done = await Promise.all([
    f.services.workouts.complete(starts[0].id),
    f.services.workouts.complete(starts[0].id),
  ])
  assert.deepEqual(done[0], done[1])
  assert.equal((await f.services.workouts.listHistory()).length, 1)
  assert.equal(f.state().futureTargets[0].weight, 42.5)
  assert.equal(
    (
      await f.services.workouts.start("routine-full-body", {
        requestId: "request-1",
      })
    ).id,
    starts[0].id
  )
  const next = await f.services.workouts.start("routine-full-body")
  assert.equal(next.entries[0].sets[0].plannedWeight, 42.5)
  assert.equal(next.entries[0].sets[0].plannedReps, 8)
})

test("completion never assumes planned values; timer is persisted and undo clears it", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  const entry = workout.entries[0]
  const set = entry.sets[0]
  await assert.rejects(
    f.services.workouts.updateSet(workout.id, entry.id, set.id, {
      status: "completed",
    }),
    { code: "VALIDATION" }
  )
  await assert.rejects(
    f.services.workouts.updateSet(workout.id, entry.id, set.id, {
      actualReps: 10,
      status: "completed",
    }),
    { code: "VALIDATION" }
  )
  const saved = await f.services.workouts.updateSet(
    workout.id,
    entry.id,
    set.id,
    {
      actualReps: 10,
      actualWeight: 40,
      repsInput: "10",
      weightInput: "40",
      status: "completed",
    }
  )
  assert.equal(saved.restTimer?.endsAt, 92000)
  f.advance(100000)
  assert.equal(
    (await f.services.workouts.getActive())?.restTimer?.endsAt,
    92000
  )
  await f.services.workouts.updateSet(workout.id, entry.id, set.id, {
    status: "pending",
  })
  assert.equal((await f.services.workouts.getActive())?.restTimer, null)
})

test("rest expires automatically without clearing a timer that was extended", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  const entry = workout.entries[0]
  const set = entry.sets[0]
  const saved = await f.services.workouts.updateSet(
    workout.id,
    entry.id,
    set.id,
    { actualReps: 10, actualWeight: 40, status: "completed" }
  )
  assert.equal(saved.restTimer?.endsAt, 92000)

  await f.services.workouts.updateTimer(workout.id, { type: "expire" })
  assert.equal(
    (await f.services.workouts.getActive())?.restTimer?.endsAt,
    92000
  )

  await f.services.workouts.updateTimer(workout.id, {
    type: "adjust",
    seconds: 15,
  })
  f.advance(90000)
  await f.services.workouts.updateTimer(workout.id, { type: "expire" })
  assert.equal(
    (await f.services.workouts.getActive())?.restTimer?.endsAt,
    107000
  )

  f.advance(15000)
  await f.services.workouts.updateTimer(workout.id, { type: "expire" })
  assert.equal((await f.services.workouts.getActive())?.restTimer, null)
})

test("finishing the final set does not start a rest timer", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  await logAll(f, workout)
  assert.equal((await f.services.workouts.getActive())?.restTimer, null)
})

test("prescription revision prevents older snapshot from changing future targets and history survives delete", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  const routine = await f.services.routines.getById("routine-full-body")
  routine.entries[0].startingWeight = 80
  await assert.rejects(f.services.routines.update(routine.id, routine), {
    code: "TARGET_RESET_REQUIRED",
  })
  await f.services.routines.update(routine.id, routine, {
    confirmTargetReset: true,
  })
  await logAll(f, workout)
  await f.services.workouts.complete(workout.id)
  assert.equal(
    f
      .state()
      .futureTargets.some((target) => target.entryId === routine.entries[0].id),
    false
  )
  await f.services.routines.delete(routine.id)
  const history = await f.services.workouts.getById(workout.id)
  assert.equal(history.entries[0].prescription.startingWeight, 40)
  assert.equal(history.entries[0].sets[0].plannedWeight, 40)
})

test("failed durable writes do not publish successful mutation", async () => {
  const f = fixture()
  const before = f.state()
  f.failWrites(true)
  await assert.rejects(
    f.services.workouts.start("routine-full-body"),
    /Disk full/
  )
  assert.deepEqual(f.state(), before)
  f.failWrites(false)
  const workout = await f.services.workouts.start("routine-full-body")
  await logAll(f, workout)
  f.failWrites(true)
  await assert.rejects(f.services.workouts.complete(workout.id), /Disk full/)
  assert.equal(f.state().workouts[0].status, "inProgress")
  assert.equal(f.state().futureTargets.length, 0)
})

test("every set, including extras, must be completed before finishing", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  await assert.rejects(f.services.workouts.complete(workout.id), {
    code: "VALIDATION",
  })
  await logAll(f, workout)
  let current = await f.services.workouts.addSet(
    workout.id,
    workout.entries[0].id
  )
  assert.equal(suggestProgression(current.entries[0]).advanced, true)
  await assert.rejects(f.services.workouts.complete(workout.id), {
    code: "VALIDATION",
  })
  await assert.rejects(
    f.services.workouts.updateSet(
      workout.id,
      workout.entries[0].id,
      workout.entries[0].sets[0].id,
      { status: "skipped" }
    ),
    { code: "VALIDATION" }
  )
  current = await f.services.workouts.updateSet(
    workout.id,
    workout.entries[0].id,
    workout.entries[0].sets[0].id,
    { status: "pending" }
  )
  assert.equal(suggestProgression(current.entries[0]).advanced, false)
  await assert.rejects(f.services.workouts.complete(workout.id), {
    code: "VALIDATION",
  })
  const firstSet = workout.entries[0].sets[0]
  const extraSet = current.entries[0].sets.at(-1)
  assert.ok(extraSet)
  await f.services.workouts.updateSet(
    workout.id,
    workout.entries[0].id,
    firstSet.id,
    {
      actualReps: 12,
      actualWeight: firstSet.plannedWeight ?? 0,
      status: "completed",
    }
  )
  await f.services.workouts.updateSet(
    workout.id,
    workout.entries[0].id,
    extraSet.id,
    {
      actualReps: 12,
      actualWeight: extraSet.plannedWeight ?? 0,
      status: "completed",
    }
  )
  const completed = await f.services.workouts.complete(workout.id)
  assert.equal(completed.status, "completed")
  assert.equal(f.state().futureTargets.length, workout.entries.length)
})

test("rep progression respects load and cap; manual keeps current target", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  await logAll(f, workout, 10)
  const entry = (await f.services.workouts.getById(workout.id)).entries[0]
  entry.prescription.progressionMode = "reps"
  entry.prescription.repIncrement = 5
  assert.equal(suggestProgression(entry).reps, 12)
  entry.sets.forEach((set) => {
    set.plannedReps = 12
    set.actualReps = 12
  })
  assert.match(suggestProgression(entry).reason, /cap/)
  entry.sets[0].actualWeight = 0
  assert.equal(suggestProgression(entry).advanced, false)
  entry.prescription.progressionMode = "manual"
  assert.equal(suggestProgression(entry).reps, 12)
  assert.equal(suggestProgression(entry).weight, 40)
})

test("auth never persists password; signout preserves data; reset retains demo identity", async () => {
  const f = fixture()
  await f.services.auth.signIn(" Demo@example.com ", "secret-never-store")
  await f.services.workouts.start("routine-full-body")
  assert.equal(JSON.stringify(f.state()).includes("secret-never-store"), false)
  await f.services.auth.signOut()
  assert.equal(f.state().workouts.length, 1)
  await f.services.auth.register("again@example.com", "new-password")
  await f.services.demo.reset()
  assert.equal(f.state().session?.email, "again@example.com")
  assert.equal(f.state().workouts.length, 0)
})

test("unit switches preserve canonical values; search and mock error support deterministic retry", async () => {
  const f = fixture()
  const workout = await f.services.workouts.start("routine-full-body")
  const entry = workout.entries[0]
  const set = entry.sets[0]
  await f.services.workouts.updateSet(workout.id, entry.id, set.id, {
    actualWeight: 42.123,
    weightInput: "42.123",
  })
  await f.services.preferences.setWeightUnit("lb")
  await f.services.preferences.setWeightUnit("kg")
  assert.equal(f.state().workouts[0].entries[0].sets[0].actualWeight, 42.123)
  assert.equal(f.state().workouts[0].entries[0].sets[0].plannedWeight, 40)
  f.services.demo.failNext("exercises.search")
  await assert.rejects(f.services.exercises.search(), { code: "SIMULATED" })
  assert.equal((await f.services.exercises.search()).length >= 20, true)
  assert.deepEqual(
    await f.services.exercises.search({ search: "not an exercise" }),
    []
  )
})
