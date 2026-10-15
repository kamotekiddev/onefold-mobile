import type { WorkoutEntry, WorkoutSet } from "@/types/domain"

export function nextUnfinishedSetIndex(sets: WorkoutSet[], afterIndex = -1) {
  const next = sets.findIndex(
    (set, index) => index > afterIndex && set.status !== "completed"
  )
  if (next !== -1) return next

  return sets.findIndex(
    (set, index) => index <= afterIndex && set.status !== "completed"
  )
}

export function hasUnfinishedSets(entry: WorkoutEntry) {
  return nextUnfinishedSetIndex(entry.sets) !== -1
}

/** The entries length is the completion step after the final exercise. */
export function nextUnfinishedExerciseIndex(
  entries: WorkoutEntry[],
  afterIndex = -1
) {
  const next = entries.findIndex(
    (entry, index) => index > afterIndex && hasUnfinishedSets(entry)
  )
  if (next !== -1) return next

  const earlier = entries.findIndex((entry, index) =>
    index <= afterIndex ? hasUnfinishedSets(entry) : false
  )
  return earlier === -1 ? entries.length : earlier
}
