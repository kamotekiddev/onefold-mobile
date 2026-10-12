import type { ProgressionSuggestion, WorkoutEntry } from "../../types/domain"
export function suggestProgression(entry: WorkoutEntry): ProgressionSuggestion {
  const { prescription: p } = entry
  const sets = entry.sets.filter((set) => set.kind === "prescribed")
  const reps = sets[0]?.plannedReps ?? p.repMin
  const weight = sets[0]?.plannedWeight
  const base: ProgressionSuggestion = {
    entryId: entry.id,
    prescriptionRevision: p.prescriptionRevision,
    reps,
    weight,
    reason: "Keep your current targets.",
    advanced: false,
  }
  if (p.progressionMode === "manual")
    return {
      ...base,
      reason: "Manual progression: adjust targets when you are ready.",
    }
  if (
    sets.length !== p.setCount ||
    sets.some((set) => set.status !== "completed" || set.actualReps === null)
  )
    return {
      ...base,
      reason: "Complete every prescribed set before progressing.",
    }
  const loadMet = sets.every(
    (set) =>
      entry.exercise.trackingType === "bodyweight" ||
      (set.actualWeight !== null &&
        set.actualWeight + 1e-8 >= (set.plannedWeight ?? 0))
  )
  if (!loadMet)
    return {
      ...base,
      reason: "Meet the prescribed load on every set before progressing.",
    }
  if (p.progressionMode === "weight") {
    if (sets.every((set) => (set.actualReps ?? 0) >= p.repMax))
      return {
        ...base,
        reps: p.repMin,
        weight: (weight ?? 0) + (p.weightIncrement ?? 0),
        advanced: true,
        reason: `All ${sets.length} sets reached ${p.repMax} reps. Increase the load.`,
      }
    return {
      ...base,
      reason: `Reach ${p.repMax} reps on all ${sets.length} prescribed sets to increase weight.`,
    }
  }
  if (reps >= p.repMax)
    return {
      ...base,
      reason: "Rep cap reached. Consider a manual adjustment to your routine.",
    }
  if (sets.every((set) => (set.actualReps ?? 0) >= set.plannedReps))
    return {
      ...base,
      reps: Math.min(p.repMax, reps + (p.repIncrement ?? 1)),
      advanced: true,
      reason: `All ${sets.length} sets met their rep target.${Math.min(p.repMax, reps + (p.repIncrement ?? 1)) === p.repMax ? " Next target is the rep cap; then adjust manually." : ""}`,
    }
  return {
    ...base,
    reason: "Meet the current rep target on every prescribed set.",
  }
}
