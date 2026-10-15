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

test("resume opens the first exercise and set still pending", () => {
  const entries = [
    entry(["completed", "skipped"]),
    entry(["completed", "pending"]),
    entry(["pending"]),
  ]
  assert.equal(nextUnfinishedExerciseIndex(entries), 1)
  assert.equal(nextUnfinishedSetIndex(entries[1].sets), 1)
})

test("completing or skipping a set selects the next pending set", () => {
  const sets = entry(["completed", "skipped", "pending"]).sets
  assert.equal(nextUnfinishedSetIndex(sets, 0), 2)
  assert.equal(nextUnfinishedSetIndex(sets, 1), 2)
  assert.equal(nextUnfinishedSetIndex(sets, 2), 2)
})

test("completing or skipping the last set advances past finished exercises", () => {
  const entries = [entry(["completed"]), entry(["skipped"]), entry(["pending"])]
  assert.equal(nextUnfinishedExerciseIndex(entries, 0), 2)
  assert.equal(nextUnfinishedExerciseIndex(entries, 1), 2)
})

test("a pending extra set keeps its exercise in progress", () => {
  const entries = [entry(["completed"], ["pending"]), entry(["skipped"])]
  assert.equal(hasUnfinishedSets(entries[0]), true)
  assert.equal(nextUnfinishedSetIndex(entries[0].sets), 1)
  assert.equal(nextUnfinishedExerciseIndex(entries), 0)
})

test("finished sets return no pending set", () => {
  assert.equal(nextUnfinishedSetIndex(entry(["completed", "skipped"]).sets), -1)
})

test("unfinished earlier exercise remains reachable when the later one ends", () => {
  const entries = [entry(["pending"]), entry(["completed"]), entry(["skipped"])]
  assert.equal(nextUnfinishedExerciseIndex(entries, 2), 0)
})
