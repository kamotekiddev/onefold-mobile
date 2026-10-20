import assert from "node:assert/strict"
import { test } from "node:test"
import { filterExercises } from "./catalog"

const catalog = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Bench press",
    equipment: "Barbell",
    primaryMuscleGroup: "Chest",
    trackingType: "weighted" as const,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Push-up",
    equipment: "None",
    primaryMuscleGroup: "Chest",
    trackingType: "bodyweight" as const,
  },
  {
    id: "legacy-id",
    name: "Legacy press",
    equipment: "Barbell",
    primaryMuscleGroup: "Chest",
    trackingType: "weighted" as const,
  },
]
test("local exercise filtering normalizes search and excludes legacy IDs for remote accounts", () => {
  assert.deepEqual(
    filterExercises(
      catalog,
      { search: "  PRESS ", muscleGroup: "Chest", equipment: "Barbell" },
      true
    ),
    [catalog[0]]
  )
  assert.equal(filterExercises(catalog, {}, false).length, 3)
  assert.deepEqual(filterExercises(catalog, { search: "squat" }, true), [])
})
