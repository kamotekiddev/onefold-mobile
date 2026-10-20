import { isBackendId } from "@/lib/domain/validation"
import type { Exercise, ExerciseQuery } from "@/types/domain"

export function filterExercises(
  exercises: Exercise[],
  query: ExerciseQuery,
  remote: boolean
) {
  const search = query.search?.trim().toLowerCase()
  return exercises.filter(
    (exercise) =>
      (!remote || isBackendId(exercise.id)) &&
      (!search || exercise.name.toLowerCase().includes(search)) &&
      (!query.muscleGroup ||
        exercise.primaryMuscleGroup === query.muscleGroup) &&
      (!query.equipment || exercise.equipment === query.equipment)
  )
}
