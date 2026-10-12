import type { WeightUnit, Workout } from "@/types/domain"

export const displayWeight = (
    kg: number | null | undefined,
    unit: WeightUnit
) =>
    kg == null
        ? "—"
        : String(Number((kg * (unit === "lb" ? 2.2046226218 : 1)).toFixed(2)))
export const inputWeight = (value: string, unit: WeightUnit) =>
    Number(value) / (unit === "lb" ? 2.2046226218 : 1)
export const elapsed = (seconds: number) =>
    `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, "0")}`
export const workoutCounts = (workout: Workout) => {
    const sets = workout.entries.flatMap((entry) => entry.sets)
    return {
        planned: sets.filter((set) => set.kind === "prescribed").length,
        completed: sets.filter(
            (set) => set.kind === "prescribed" && set.status === "completed"
        ).length,
        extra: sets.filter(
            (set) => set.kind === "extra" && set.status === "completed"
        ).length,
    }
}
export const errorText = (error: unknown) =>
    error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
