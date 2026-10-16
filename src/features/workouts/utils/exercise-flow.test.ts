import assert from "node:assert/strict"
import { test } from "node:test"

import type { WorkoutEntry, WorkoutSet } from "@/types/domain"

import {
  hasUnfinishedSets,
  nextUnfinishedExerciseIndex,
  nextUnfinishedSetIndex,
} from "./exercise-flow"

function entry(
  statuses: WorkoutSet["status"][],
  extra: WorkoutSet["status"][] = []
) {
  return {
    sets: [
      ...statuses.map((status) => ({ kind: "prescribed", status })),
      ...extra.map((status) => ({ kind: "extra", status })),
    ],
  } as WorkoutEntry
}

test("resume opens the first exercise and set still unfinished", () => {
  const entries = [
    entry(["completed", "completed"]),
    entry(["completed", "pending"]),
    entry(["pending"]),
  ]
  assert.equal(nextUnfinishedExerciseIndex(entries), 1)
  assert.equal(nextUnfinishedSetIndex(entries[1].sets), 1)
})

test("exercise progression waits for every set and ends at the completion step", () => {
  const entries = [entry(["pending", "pending"]), entry(["pending"])]
  assert.equal(nextUnfinishedExerciseIndex(entries), 0)

  entries[0].sets[0].status = "completed"
  assert.equal(nextUnfinishedExerciseIndex(entries), 0)

  entries[0].sets[1].status = "completed"
  assert.equal(nextUnfinishedExerciseIndex(entries), 1)

  entries[1].sets[0].status = "completed"
  assert.equal(nextUnfinishedExerciseIndex(entries), entries.length)
})

test("the next unfinished set includes legacy skipped sets", () => {
  const sets = entry(["completed", "skipped", "pending"]).sets
  assert.equal(nextUnfinishedSetIndex(sets, 0), 1)
  assert.equal(nextUnfinishedSetIndex(sets, 1), 2)
  assert.equal(nextUnfinishedSetIndex(sets, 2), 1)
})

test("finished exercises advance but skipped sets must be completed", () => {
  const entries = [entry(["completed"]), entry(["skipped"]), entry(["pending"])]
  assert.equal(nextUnfinishedExerciseIndex(entries, 0), 1)
  assert.equal(nextUnfinishedExerciseIndex(entries, 1), 2)
})

test("a pending extra set keeps its exercise in progress", () => {
  const entries = [entry(["completed"], ["pending"]), entry(["skipped"])]
  assert.equal(hasUnfinishedSets(entries[0]), true)
  assert.equal(nextUnfinishedSetIndex(entries[0].sets), 1)
  assert.equal(nextUnfinishedExerciseIndex(entries), 0)
})

test("finished sets return no unfinished set", () => {
  assert.equal(
    nextUnfinishedSetIndex(entry(["completed", "completed"]).sets),
    -1
  )
})

test("unfinished earlier exercise remains reachable when the later one ends", () => {
  const entries = [
    entry(["pending"]),
    entry(["completed"]),
    entry(["completed"]),
  ]
  assert.equal(nextUnfinishedExerciseIndex(entries, 2), 0)
})
