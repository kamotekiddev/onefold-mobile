import type { AppData, Exercise, RoutineEntry } from "../../types/domain"
const catalog: [string, string, string, Exercise["trackingType"]][] = [
  ["Barbell squat", "Legs", "Barbell", "weighted"],
  ["Bench press", "Chest", "Barbell", "weighted"],
  ["Deadlift", "Back", "Barbell", "weighted"],
  ["Overhead press", "Shoulders", "Barbell", "weighted"],
  ["Barbell row", "Back", "Barbell", "weighted"],
  ["Romanian deadlift", "Legs", "Barbell", "weighted"],
  ["Dumbbell curl", "Arms", "Dumbbells", "weighted"],
  ["Dumbbell shoulder press", "Shoulders", "Dumbbells", "weighted"],
  ["Lateral raise", "Shoulders", "Dumbbells", "weighted"],
  ["Dumbbell lunge", "Legs", "Dumbbells", "weighted"],
  ["Incline dumbbell press", "Chest", "Dumbbells", "weighted"],
  ["Goblet squat", "Legs", "Dumbbells", "weighted"],
  ["Lat pulldown", "Back", "Cable", "weighted"],
  ["Cable row", "Back", "Cable", "weighted"],
  ["Triceps pushdown", "Arms", "Cable", "weighted"],
  ["Face pull", "Shoulders", "Cable", "weighted"],
  ["Leg press", "Legs", "Machine", "weighted"],
  ["Leg curl", "Legs", "Machine", "weighted"],
  ["Push-up", "Chest", "None", "bodyweight"],
  ["Bodyweight squat", "Legs", "None", "bodyweight"],
  ["Crunch", "Core", "None", "bodyweight"],
  ["Hanging knee raise", "Core", "Pull-up bar", "bodyweight"],
  ["Pull-up", "Back", "Pull-up bar", "bodyweightAddedWeight"],
  ["Dip", "Chest", "Parallel bars", "bodyweightAddedWeight"],
]
export const exercises: Exercise[] = catalog.map(
  ([name, primaryMuscleGroup, equipment, trackingType], index) => ({
    id: `exercise-${index + 1}`,
    name,
    primaryMuscleGroup,
    equipment,
    trackingType,
  })
)
export function makeSeed(
  now = Date.now(),
  options: { includeDefaultRoutine?: boolean } = {}
): AppData {
  const entry = (
    id: string,
    exerciseId: string,
    order: number,
    startingWeight: number
  ): RoutineEntry => ({
    id,
    exerciseId,
    order,
    setCount: 3,
    repMin: 8,
    repMax: 12,
    startingWeight,
    restSeconds: 90,
    progressionMode: "weight",
    weightIncrement: 2.5,
    prescriptionRevision: 1,
  })
  return {
    schemaVersion: 3,
    exercises,
    routines:
      options.includeDefaultRoutine === false
        ? []
        : [
            {
              id: "routine-full-body",
              name: "Full body foundations",
              entries: [
                entry("entry-squat", "exercise-1", 0, 40),
                entry("entry-bench", "exercise-2", 1, 30),
                entry("entry-row", "exercise-5", 2, 30),
              ],
              scheduledDays: [],
              createdAt: now,
              updatedAt: now,
            },
          ],
    routineCache: null,
    workouts: [],
    futureTargets: [],
    preferences: { weightUnit: "kg" },
  }
}
